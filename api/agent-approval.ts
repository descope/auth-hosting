import {
	createHash,
	createPrivateKey,
	createPublicKey,
	KeyObject,
	randomBytes,
	randomInt,
	sign
} from 'crypto';

const DEFAULT_BASE_URL = 'https://api.descope.com';
const FETCH_TIMEOUT_MS = 10000;
const VERDICT_CACHE_MS = 60 * 1000;
const MAX_CACHED_VERDICTS = 1000;
const ASSERTION_TTL_SEC = 60;
const CIBA_GRANT_TYPE = 'urn:openid:params:grant-type:ciba';
const CLIENT_ASSERTION_TYPE =
	'urn:ietf:params:oauth:client-assertion-type:jwt-bearer';
// RFC 7636 appendix B; the check never redeems a code, so the verifier is moot
const CALLBACK_CHECK_CODE_CHALLENGE =
	'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';
// RFC 2606 reserves .invalid, so no approved callback URL list names it
const OPEN_CHECK_URL_PREFIX = 'https://agent-approval.invalid/';
// Rate limits and timeouts say nothing about the redirect URI
const RETRYABLE_STATUSES = [408, 429];
const UNKNOWN_CLIENT_ERROR_CODE = 'E063308';
const INVALID_CLIENT_ERROR_CODE = 'E066009';
// Descope appends error to whatever redirect it sends, even the unvalidated
// redirect_uri, and to the fragment when it cannot parse that URL
const ERROR_PARAM_REGEX = /[?&#]error=/;
const COOKIE_NAME = 'agent_approval';
const FUNCTION_PATH = '/api/agent-approval';
const JWKS_PATH = '/approve/jwks.json';
const ROUTE_REGEX = /^\/approve\/(P[A-Za-z0-9]{20,40})(\/wait)?\/?$/;
const REF_REGEX = /^[A-Za-z0-9_-]{16,128}$/;
const SCOPE_TOKEN_REGEX = /^[\x21\x23-\x5B\x5D-\x7E]+$/;
const MAX_SCOPE_TOKENS = 10;
const MAX_SCOPE_LENGTH = 300;
// Descope's bc-authorize limit
const MAX_RESOURCE_LENGTH = 1000;
const CODE_REGEX = /^\d{4}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const MAX_AUTH_REQ_ID_LENGTH = 1000;
const DEFAULT_INTERVAL_SEC = 5;
const DEFAULT_EXPIRES_IN_SEC = 300;
const SLOW_DOWN_STEP_SEC = 5;
const MAX_BINDING_MESSAGE_LENGTH = 256;
const MAX_ORDER_PARAM_LENGTH = 4096;
const MAX_ORDER_ITEMS = 10;
const MAX_ITEM_QTY = 99;
const MAX_ITEM_NAME_LENGTH = 80;
// Descope's limit on serialized authorization_details
const MAX_AUTHORIZATION_DETAILS_BYTES = 4096;
const CURRENCY_REGEX = /^[A-Z]{3}$/;
const TOTAL_WHOLE_REGEX = /^(?:0|[1-9]\d{0,11})$/;
const DIGITS_REGEX = /^\d+$/;
// Letters, digits, single spaces and plain punctuation. No ; (it separates the items in the
// summary) and no markup characters: the name reaches the customer's email.
const ITEM_NAME_REGEX = /^[A-Za-z0-9 ,.&'()+/#%:!?-]+$/;
const URL_LIKE_REGEX = /:\/\/|www\./i;
const POLLING_ERRORS = ['authorization_pending', 'slow_down'];

type ApiRequest = {
	method?: string;
	url?: string;
	headers: Record<string, string | string[] | undefined>;
	body?: unknown;
};

type ApiResponse = {
	statusCode: number;
	setHeader: (name: string, value: string) => void;
	end: (body?: string) => void;
};

type DescopeResult = {
	ok: boolean;
	status: number;
	body: Record<string, unknown>;
	location: string;
};

type PublicJwk = { kty: string; crv: string; x: string; y: string };

type SigningKey = { privateKey: KeyObject; jwk: PublicJwk; kid: string };

type Context = { pid: string; signingKey: SigningKey; secure: boolean };

// undefined: absent; null: repeated or not a string
type Fields = (name: string) => string | null | undefined;

type OrderItem = { name: string; qty: number };

type Order = { total: string; currency: string; items: OrderItem[] };

type ApprovalRequest = {
	clientId: string;
	scope: string;
	ref: string;
	order: Order;
	summary: string;
	returnTo: string;
	resource?: string;
};

type Pending = {
	authReqId: string;
	code: string;
	clientId: string;
	ref: string;
	returnTo: string;
	interval: number;
	expiresAt: number;
};

type GateResult = { returnTo: string } | { status: number; message: string };

const verdictCache = new Map<
	string,
	{ expiresAt: number; verdict: GateResult }
>();

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const hasOwn = (obj: object, key: string) =>
	Object.prototype.hasOwnProperty.call(obj, key);

const nonEmptyString = (value: unknown): value is string =>
	typeof value === 'string' && value.length > 0;

const positiveInt = (value: unknown, fallback: number) =>
	typeof value === 'number' && Number.isInteger(value) && value > 0
		? value
		: fallback;

const escapeHtml = (value: string) =>
	value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');

const bindingSuffix = (code: string) =>
	`. Approve only if you asked for this. Code: ${code}`;

// The code is always 4 digits, so every summary fits the binding message
const MAX_SUMMARY_LENGTH =
	MAX_BINDING_MESSAGE_LENGTH - bindingSuffix('0000').length;

const buildBindingMessage = (summary: string, code: string) =>
	`${summary}${bindingSuffix(code)}`;

// From the string, never through a float: "185000.00" -> "185,000.00"
const formatTotal = ({ total, currency }: Order) => {
	const [whole, fraction] = total.split('.');
	const grouped = BigInt(whole).toLocaleString('en-US');
	return `${currency} ${fraction === undefined ? grouped : `${grouped}.${fraction}`}`;
};

// A fixed format from the validated fields. Whole items only: when the list does not fit,
// it ends with "+N more". The caps on items, names and totals make the first item always fit.
const orderSummary = (order: Order) => {
	const lines = order.items.map(({ name, qty }) => `${qty}x ${name}`);
	const textFor = (shown: number) => {
		const more = shown < lines.length ? ` +${lines.length - shown} more` : '';
		return `Order ${lines.slice(0, shown).join('; ')}${more}. Total ${formatTotal(order)}`;
	};
	let shown = lines.length;
	while (shown > 1 && textFor(shown).length > MAX_SUMMARY_LENGTH) shown -= 1;
	return textFor(shown);
};

// RFC 9396, one object; Descope copies it onto the access token unchanged
const authorizationDetails = (ref: string, { total, currency, items }: Order) =>
	JSON.stringify([
		{
			type: 'order',
			ref,
			total,
			currency,
			items: items.map(({ name, qty }) => ({ name, qty }))
		}
	]);

const descopeBaseUrl = () =>
	(process.env.DESCOPE_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');

const loadSigningKey = (): SigningKey | undefined => {
	let privateKey: KeyObject;
	try {
		privateKey = createPrivateKey(process.env.AGENT_APPROVAL_SIGNING_KEY ?? '');
	} catch {
		return undefined;
	}
	if (
		privateKey.asymmetricKeyType !== 'ec' ||
		privateKey.asymmetricKeyDetails?.namedCurve !== 'prime256v1'
	) {
		return undefined;
	}
	const { crv, x, y } = createPublicKey(privateKey).export({
		format: 'jwk'
	}) as PublicJwk;
	// RFC 7638: the required members in lexicographic order
	const kid = createHash('sha256')
		.update(JSON.stringify({ crv, kty: 'EC', x, y }))
		.digest('base64url');
	return { privateKey, jwk: { kty: 'EC', crv, x, y }, kid };
};

const base64urlJson = (value: object) =>
	Buffer.from(JSON.stringify(value)).toString('base64url');

const clientAssertion = (ctx: Context, clientId: string) => {
	const iat = Math.floor(Date.now() / 1000);
	const header = { alg: 'ES256', typ: 'JWT', kid: ctx.signingKey.kid };
	const claims = {
		iss: clientId,
		sub: clientId,
		aud: `${descopeBaseUrl()}/oauth2/v1/apps/${ctx.pid}/token`,
		jti: randomBytes(16).toString('base64url'),
		iat,
		exp: iat + ASSERTION_TTL_SEC
	};
	const input = `${base64urlJson(header)}.${base64urlJson(claims)}`;
	const signature = sign('sha256', Buffer.from(input), {
		key: ctx.signingKey.privateKey,
		dsaEncoding: 'ieee-p1363'
	});
	return `${input}.${signature.toString('base64url')}`;
};

const clientAuth = (ctx: Context, clientId: string) => ({
	client_id: clientId,
	client_assertion_type: CLIENT_ASSERTION_TYPE,
	client_assertion: clientAssertion(ctx, clientId)
});

// Fixed fields only: bodies and error messages can carry secrets or the login ID
const logFailure = (message: string, details: Record<string, unknown>) => {
	// eslint-disable-next-line no-console
	console.error(message, JSON.stringify(details));
};

const stringField = (value: unknown) =>
	typeof value === 'string' ? value : undefined;

const isRejection = (status: number) =>
	status >= 400 && status < 500 && !RETRYABLE_STATUSES.includes(status);

const callDescope = async (
	path: string,
	init: RequestInit,
	expectRejection = false
): Promise<DescopeResult> => {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
	try {
		const response = await fetch(`${descopeBaseUrl()}${path}`, {
			...init,
			signal: controller.signal
		});
		const body: unknown = await response.json().catch(() => undefined);
		const result = {
			ok: response.ok,
			status: response.status,
			body: isRecord(body) ? body : {},
			location: response.headers.get('location') ?? ''
		};
		const error = stringField(result.body.error);
		if (
			result.status >= 400 &&
			!(expectRejection && isRejection(result.status)) &&
			!(error && POLLING_ERRORS.includes(error))
		) {
			logFailure('Descope call failed', {
				method: init.method,
				path: path.split('?')[0],
				status: result.status,
				errorCode: stringField(result.body.errorCode),
				error
			});
		}
		return result;
	} finally {
		clearTimeout(timeoutId);
	}
};

const postForm = (path: string, form: Record<string, string>) =>
	callDescope(path, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Accept: 'application/json'
		},
		body: new URLSearchParams(form).toString()
	});

const httpUrl = (value: string) => {
	try {
		const url = new URL(value);
		return url.protocol === 'https:' || url.protocol === 'http:'
			? url.href
			: undefined;
	} catch {
		return undefined;
	}
};

const UNKNOWN_AGENT: GateResult = { status: 400, message: 'Unknown agent' };

const RETURN_URL_NOT_ALLOWED: GateResult = {
	status: 400,
	message: 'This return URL is not allowed'
};

const AGENT_NOT_SET_UP: GateResult = {
	status: 400,
	message: 'This agent is not set up for approvals'
};

// Descope's public authorize endpoint checks redirect_uri against the app's
// approved callback URLs and needs no credential
const askAuthorize = async (
	ctx: Context,
	clientId: string,
	redirectUri: string,
	expectRejection = false
): Promise<GateResult> => {
	const path = `/oauth2/v1/apps/${ctx.pid}/authorize`;
	const query = new URLSearchParams({
		response_type: 'code',
		client_id: clientId,
		redirect_uri: redirectUri,
		scope: 'openid',
		state: randomBytes(16).toString('base64url'),
		code_challenge: CALLBACK_CHECK_CODE_CHALLENGE,
		code_challenge_method: 'S256'
	});
	const { status, body, location } = await callDescope(
		`${path}?${query.toString()}`,
		{
			method: 'GET',
			headers: { Accept: 'application/json' },
			redirect: 'manual'
		},
		expectRejection
	);
	if (status >= 300 && status < 400 && location) {
		if (!ERROR_PARAM_REGEX.test(location)) return { returnTo: redirectUri };
		if (location.includes(UNKNOWN_CLIENT_ERROR_CODE)) return UNKNOWN_AGENT;
	}
	if (isRejection(status)) {
		return body.errorCode === UNKNOWN_CLIENT_ERROR_CODE
			? UNKNOWN_AGENT
			: RETURN_URL_NOT_ALLOWED;
	}
	// callDescope logged the failed calls already; the Location can carry anything
	if (status < 400) {
		logFailure('Callback URL check gave no verdict', {
			path,
			status,
			hasLocation: Boolean(location)
		});
	}
	throw new Error('The authorize endpoint gave no verdict');
};

// Descope skips the redirect URI check for an app with no approved callback
// URLs, so a URL that no list names tells such an app apart
const checkCallback = async (
	ctx: Context,
	clientId: string,
	returnTo: string
): Promise<GateResult> => {
	const verdict = await askAuthorize(ctx, clientId, returnTo);
	if (!('returnTo' in verdict)) return verdict;
	const openCheck = await askAuthorize(
		ctx,
		clientId,
		`${OPEN_CHECK_URL_PREFIX}${randomBytes(16).toString('base64url')}`,
		true
	);
	return 'returnTo' in openCheck ? AGENT_NOT_SET_UP : verdict;
};

const gate = async (
	ctx: Context,
	clientId: string,
	returnTo: string
): Promise<GateResult> => {
	const target = httpUrl(returnTo);
	if (!target) return RETURN_URL_NOT_ALLOWED;
	const cacheKey = JSON.stringify([ctx.pid, clientId, target]);
	const cached = verdictCache.get(cacheKey);
	if (cached && cached.expiresAt > Date.now()) return cached.verdict;

	const verdict = await checkCallback(ctx, clientId, target);
	if (verdictCache.size >= MAX_CACHED_VERDICTS) verdictCache.clear();
	verdictCache.set(cacheKey, {
		expiresAt: Date.now() + VERDICT_CACHE_MS,
		verdict
	});
	return verdict;
};

const paramsFields =
	(params: URLSearchParams): Fields =>
	(name) => {
		const values = params.getAll(name);
		if (values.length === 0) return undefined;
		return values.length === 1 ? values[0] : null;
	};

const recordFields =
	(record: Record<string, unknown>): Fields =>
	(name) => {
		if (!hasOwn(record, name)) return undefined;
		const value = record[name];
		return typeof value === 'string' ? value : null;
	};

const bodyFields = (req: ApiRequest): Fields | undefined => {
	try {
		const { body } = req;
		if (typeof body === 'string') {
			return paramsFields(new URLSearchParams(body));
		}
		if (Buffer.isBuffer(body)) {
			return paramsFields(new URLSearchParams(body.toString('utf8')));
		}
		return isRecord(body) ? recordFields(body) : undefined;
	} catch {
		// Vercel's lazy body parser throws on a malformed body
		return undefined;
	}
};

const isValidScope = (scope: string | null | undefined): scope is string => {
	if (!scope || scope.length > MAX_SCOPE_LENGTH) return false;
	const tokens = scope.split(' ');
	return (
		tokens.length <= MAX_SCOPE_TOKENS &&
		tokens.every((token) => SCOPE_TOKEN_REGEX.test(token))
	);
};

// Validated as a URL but kept verbatim: Descope matches it to a Resource URI
const isValidResource = (resource: string | null): resource is string =>
	resource !== null &&
	resource.length <= MAX_RESOURCE_LENGTH &&
	httpUrl(resource) !== undefined;

const hasExactKeys = (record: Record<string, unknown>, keys: string[]) => {
	const own = Object.keys(record);
	return own.length === keys.length && keys.every((key) => hasOwn(record, key));
};

// ISO 4217 as Intl knows it; its minor digits come from the same data (CLDR)
const currencyDigits = (currency: string) => {
	if (
		!CURRENCY_REGEX.test(currency) ||
		!Intl.supportedValuesOf('currency').includes(currency)
	) {
		return undefined;
	}
	return new Intl.NumberFormat('en', {
		style: 'currency',
		currency
	}).resolvedOptions().maximumFractionDigits;
};

const isValidTotal = (total: string, digits: number) => {
	const [whole, fraction, ...rest] = total.split('.');
	if (rest.length > 0 || !TOTAL_WHOLE_REGEX.test(whole)) return false;
	if (digits === 0) return fraction === undefined;
	return (
		fraction !== undefined &&
		fraction.length === digits &&
		DIGITS_REGEX.test(fraction)
	);
};

const isValidItemName = (name: string) =>
	name.length <= MAX_ITEM_NAME_LENGTH &&
	ITEM_NAME_REGEX.test(name) &&
	name === name.trim() &&
	!name.includes('  ') &&
	!URL_LIKE_REGEX.test(name);

const readItem = (value: unknown): OrderItem | undefined => {
	if (!isRecord(value) || !hasExactKeys(value, ['name', 'qty'])) {
		return undefined;
	}
	const { name, qty } = value;
	if (typeof name !== 'string' || !isValidItemName(name)) return undefined;
	if (
		typeof qty !== 'number' ||
		!Number.isInteger(qty) ||
		qty < 1 ||
		qty > MAX_ITEM_QTY
	) {
		return undefined;
	}
	return { name, qty };
};

// The order param is JSON {"total","currency","items":[{"name","qty"}]}, untrusted: exact
// keys, strict types, and a fresh object built from the checked fields
const readOrder = (raw: string | null | undefined): Order | undefined => {
	if (!raw || raw.length > MAX_ORDER_PARAM_LENGTH) return undefined;
	let value: unknown;
	try {
		value = JSON.parse(raw);
	} catch {
		return undefined;
	}
	if (
		!isRecord(value) ||
		!hasExactKeys(value, ['total', 'currency', 'items'])
	) {
		return undefined;
	}
	const { total, currency, items } = value;
	if (typeof currency !== 'string' || typeof total !== 'string') {
		return undefined;
	}
	const digits = currencyDigits(currency);
	if (digits === undefined || !isValidTotal(total, digits)) return undefined;
	if (
		!Array.isArray(items) ||
		items.length === 0 ||
		items.length > MAX_ORDER_ITEMS
	) {
		return undefined;
	}
	const checked = items.map(readItem);
	if (!checked.every((item): item is OrderItem => item !== undefined)) {
		return undefined;
	}
	return { total, currency, items: checked };
};

const readApprovalRequest = (fields: Fields): ApprovalRequest | undefined => {
	const clientId = fields('client_id');
	const scope = fields('scope');
	const ref = fields('ref');
	const returnTo = fields('return_to');
	const resource = fields('resource');
	if (!nonEmptyString(clientId) || !nonEmptyString(returnTo)) {
		return undefined;
	}
	if (!isValidScope(scope)) return undefined;
	if (!ref || !REF_REGEX.test(ref)) return undefined;
	if (resource !== undefined && !isValidResource(resource)) return undefined;
	const order = readOrder(fields('order'));
	if (!order) return undefined;
	// Unreachable under the caps above; kept so a cap change cannot exceed Descope's limit
	if (
		Buffer.byteLength(authorizationDetails(ref, order)) >
		MAX_AUTHORIZATION_DETAILS_BYTES
	) {
		return undefined;
	}
	return {
		clientId,
		scope,
		ref,
		order,
		summary: orderSummary(order),
		returnTo,
		resource
	};
};

const normalizeLoginId = (value: string | null | undefined) => {
	const loginId = (value ?? '').trim().toLowerCase();
	return loginId.length <= MAX_EMAIL_LENGTH && EMAIL_REGEX.test(loginId)
		? loginId
		: undefined;
};

const headerValue = (req: ApiRequest, name: string) => {
	const value = req.headers[name];
	return typeof value === 'string' ? value : '';
};

const isHttps = (req: ApiRequest) =>
	headerValue(req, 'x-forwarded-proto').split(',')[0].trim() === 'https';

const isPending = (value: unknown): value is Pending =>
	isRecord(value) &&
	nonEmptyString(value.authReqId) &&
	value.authReqId.length <= MAX_AUTH_REQ_ID_LENGTH &&
	typeof value.code === 'string' &&
	CODE_REGEX.test(value.code) &&
	nonEmptyString(value.clientId) &&
	typeof value.ref === 'string' &&
	REF_REGEX.test(value.ref) &&
	nonEmptyString(value.returnTo) &&
	positiveInt(value.interval, 0) > 0 &&
	typeof value.expiresAt === 'number';

const readPending = (req: ApiRequest) => {
	const prefix = `${COOKIE_NAME}=`;
	const raw = headerValue(req, 'cookie')
		.split(';')
		.map((part) => part.trim())
		.find((part) => part.startsWith(prefix))
		?.slice(prefix.length);
	if (!raw) return undefined;
	try {
		const value: unknown = JSON.parse(
			Buffer.from(raw, 'base64url').toString('utf8')
		);
		return isPending(value) && value.expiresAt > Date.now() ? value : undefined;
	} catch {
		return undefined;
	}
};

const pendingCookie = (ctx: Context, value: string, maxAge: number) =>
	[
		`${COOKIE_NAME}=${value}`,
		`Path=/approve/${ctx.pid}`,
		`Max-Age=${maxAge}`,
		'HttpOnly',
		'SameSite=Lax'
	]
		.concat(ctx.secure ? ['Secure'] : [])
		.join('; ');

const setPendingCookie = (res: ApiResponse, ctx: Context, pending: Pending) => {
	const maxAge = Math.max(
		1,
		Math.ceil((pending.expiresAt - Date.now()) / 1000)
	);
	const value = Buffer.from(JSON.stringify(pending)).toString('base64url');
	res.setHeader('Set-Cookie', pendingCookie(ctx, value, maxAge));
};

const clearPendingCookie = (res: ApiResponse, ctx: Context) => {
	res.setHeader('Set-Cookie', pendingCookie(ctx, '', 0));
};

// Brand-neutral on purpose: every customer's agents land here. System fonts and
// inline CSS only, so the page loads nothing from a third party.
const STYLES = `
:root {
	--bg: #f4f3ef; --card: #ffffff; --ink: #111113; --muted: #6b6a66;
	--line: rgba(17, 17, 19, 0.09); --well: #f6f5f2; --accent: #111113;
	--on-accent: #ffffff; --ok: #1f7a4d; --warn: #9a3b2e;
	--ring: rgba(17, 17, 19, 0.12); --field: rgba(17, 17, 19, 0.48);
	--edge: rgba(17, 17, 19, 0.09);
	color-scheme: light dark;
}
@media (prefers-color-scheme: dark) {
	:root {
		--bg: #0d0d0e; --card: #161618; --ink: #f2f1ed; --muted: #9b9a95;
		--line: rgba(242, 241, 237, 0.1); --well: #1e1e21; --accent: #f2f1ed;
		--on-accent: #111113; --ok: #4fbf87; --warn: #e07a66;
		--ring: rgba(242, 241, 237, 0.16); --field: rgba(242, 241, 237, 0.45);
		--edge: rgba(242, 241, 237, 0.22);
	}
}
*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
	margin: 0; min-height: 100vh; display: grid; place-items: start center;
	padding: clamp(2.5rem, 16vh, 9rem) 1rem 2.5rem; background: var(--bg); color: var(--ink);
	background-image: radial-gradient(60rem 30rem at 50% -10%, var(--card), transparent 70%);
	font: 400 1rem/1.55 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
		'Helvetica Neue', Arial, sans-serif;
	-webkit-font-smoothing: antialiased;
}
main {
	width: 100%; max-width: 30rem; padding: clamp(1.75rem, 5vw, 2.75rem);
	background: var(--card); border: 1px solid var(--edge); border-radius: 22px;
	box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04), 0 30px 80px -40px rgba(0, 0, 0, 0.35);
	animation: enter 0.6s cubic-bezier(0.2, 0.7, 0.1, 1) both;
}
@keyframes enter { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
.kicker {
	display: flex; align-items: center; gap: 0.6rem; margin: 0 0 1.75rem;
	font-size: 0.72rem; font-weight: 600; letter-spacing: 0.16em;
	text-transform: uppercase; color: var(--muted);
}
.kicker svg { width: 1.15rem; height: 1.15rem; flex: none; }
.progress {
	display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem;
	margin: 0 0 2rem; padding: 0; list-style: none; counter-reset: step;
	font-size: 0.72rem; color: var(--muted);
}
.progress li { counter-increment: step; padding-top: 0.7rem; border-top: 2px solid var(--line); text-wrap: balance; }
.progress li::before { content: counter(step) '. '; }
.progress .done { border-top-color: var(--ok); }
.progress .now { border-top-color: var(--accent); color: var(--ink); }
h1 { margin: 0 0 1rem; font-size: clamp(1.6rem, 5vw, 1.95rem); line-height: 1.15; font-weight: 650; letter-spacing: -0.025em; text-wrap: balance; }
p { margin: 0 0 1rem; }
.request p {
	margin: 0 0 1.75rem; padding: 1.1rem 1.25rem; background: var(--well);
	border: 1px solid var(--line); border-radius: 14px; font-size: 1.02rem;
	text-wrap: pretty;
}
form { margin: 0; }
label {
	display: inline-block; margin-bottom: 0.45rem; font-size: 0.78rem;
	font-weight: 600; letter-spacing: 0.02em; color: var(--muted);
}
input[type='email'] {
	width: 100%; height: 3.25rem; margin: 0; padding: 0 1rem;
	border: 1px solid var(--field); border-radius: 12px; background: var(--card);
	font: inherit; font-size: 1.05rem; color: inherit;
	transition: border-color 0.2s, box-shadow 0.2s;
}
input[type='email']:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 4px var(--ring); }
button {
	width: 100%; height: 3.25rem; margin-top: 0.5rem; border: 0; border-radius: 12px;
	background: var(--accent); color: var(--on-accent); cursor: pointer;
	font: inherit; font-weight: 600; letter-spacing: 0.01em;
	transition: transform 0.15s, opacity 0.2s;
}
button:hover { opacity: 0.88; }
button:active { transform: scale(0.99); }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
.fine { margin: 1.4rem 0 0; font-size: 0.85rem; color: var(--muted); }
.status { display: flex; align-items: center; gap: 0.65rem; color: var(--muted); }
.status::before {
	content: ''; width: 0.55rem; height: 0.55rem; border-radius: 50%; flex: none;
	background: var(--ok); box-shadow: 0 0 0 0 var(--ok); animation: beacon 1.8s ease-out infinite;
}
@keyframes beacon { 70% { box-shadow: 0 0 0 0.6rem transparent; } 100% { box-shadow: 0 0 0 0 transparent; } }
.code {
	margin: 1.75rem 0 1.25rem; padding: 1.5rem 1rem 1.6rem; text-align: center;
	background: var(--well); border: 1px solid var(--line); border-radius: 16px;
	font-size: 0.72rem; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted);
}
.code strong {
	display: block; margin-top: 0.6rem; padding-left: 0.32em; color: var(--ink);
	font-size: clamp(3.25rem, 15vw, 4.5rem); line-height: 1; font-weight: 650;
	letter-spacing: 0.32em; font-variant-numeric: tabular-nums;
}
.track { height: 3px; margin: 0 0 1.4rem; overflow: hidden; border-radius: 3px; background: var(--line); }
.track::after {
	content: ''; display: block; width: 35%; height: 100%; border-radius: 3px; background: var(--accent);
	animation: sweep 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}
@keyframes sweep { from { transform: translateX(-100%); } to { transform: translateX(300%); } }
a { color: inherit; text-underline-offset: 3px; }
.again { margin: 0; font-size: 0.85rem; }
.mark { display: grid; place-items: center; width: 3rem; height: 3rem; margin-bottom: 1.4rem; border-radius: 50%; }
.mark svg { width: 1.5rem; height: 1.5rem; }
.mark.ok { background: color-mix(in srgb, var(--ok) 14%, transparent); color: var(--ok); }
.mark.warn { background: color-mix(in srgb, var(--warn) 14%, transparent); color: var(--warn); }
@media (prefers-reduced-motion: reduce) {
	*, *::before, *::after { animation: none !important; transition: none !important; }
}
`;

const ICONS = {
	shield:
		'<path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z"/><path d="M9 12l2 2 4-4"/>',
	check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
	alert:
		'<path d="M12 8v5"/><path d="M12 16.5v.5"/><circle cx="12" cy="12" r="9"/>'
};

const icon = (name: keyof typeof ICONS) =>
	'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"' +
	` stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

const KICKER = `<div class="kicker">${icon('shield')}Agent approval</div>`;

const STEPS = ['Request', 'Customer approves', 'Back to the agent'];

const stepClass = (index: number, current: number) => {
	if (index < current) return ' class="done"';
	return index === current ? ' class="now" aria-current="step"' : '';
};

const progress = (current: number) =>
	`<ol class="progress">${STEPS.map(
		(label, index) => `<li${stepClass(index, current)}>${label}</li>`
	).join('')}</ol>`;

const layout = (title: string, content: string, head = '') =>
	[
		'<!doctype html>',
		'<html lang="en"><head><meta charset="utf-8">',
		'<meta name="viewport" content="width=device-width, initial-scale=1">',
		'<meta name="color-scheme" content="light dark">',
		head,
		`<title>${escapeHtml(title)}</title>`,
		`<style>${STYLES}</style>`,
		`</head><body><main>${content}</main></body></html>`
	].join('');

const respond = (
	res: ApiResponse,
	status: number,
	contentType: string,
	cacheControl: string,
	body: string
) => {
	res.statusCode = status;
	res.setHeader('Content-Type', contentType);
	res.setHeader('Cache-Control', cacheControl);
	res.setHeader('Referrer-Policy', 'no-referrer');
	res.setHeader('X-Content-Type-Options', 'nosniff');
	res.setHeader('X-Frame-Options', 'DENY');
	res.end(body);
};

const send = (res: ApiResponse, status: number, html: string) =>
	respond(res, status, 'text/html; charset=utf-8', 'no-store', html);

const sendJwks = (res: ApiResponse, { jwk, kid }: SigningKey) =>
	respond(
		res,
		200,
		'application/json',
		'public, max-age=300',
		JSON.stringify({ keys: [{ ...jwk, kid, alg: 'ES256', use: 'sig' }] })
	);

const sendError = (res: ApiResponse, status: number, message: string) =>
	send(
		res,
		status,
		layout(
			message,
			[
				KICKER,
				`<div class="mark warn">${icon('alert')}</div>`,
				`<h1>${escapeHtml(message)}</h1>`
			].join('')
		)
	);

const hiddenInput = (name: string, value: string) =>
	`<input type="hidden" name="${name}" value="${escapeHtml(value)}">`;

const startPage = (ctx: Context, request: ApprovalRequest) =>
	layout(
		'Approve an agent action',
		[
			KICKER,
			progress(0),
			'<h1>Approve an agent action</h1>',
			'<div class="request">',
			`<p>An AI agent wants to: ${escapeHtml(request.summary)}</p>`,
			'</div>',
			`<form method="post" action="/approve/${escapeHtml(ctx.pid)}">`,
			hiddenInput('client_id', request.clientId),
			hiddenInput('scope', request.scope),
			hiddenInput('ref', request.ref),
			hiddenInput('order', JSON.stringify(request.order)),
			hiddenInput('return_to', request.returnTo),
			...(request.resource === undefined
				? []
				: [hiddenInput('resource', request.resource)]),
			'<p><label for="login_id">Customer email</label><br>',
			'<input id="login_id" name="login_id" type="email" required',
			' autocomplete="email"></p>',
			'<button type="submit">Send approval request</button>',
			'</form>',
			'<p class="fine">The customer gets an email to approve this request.',
			' Nothing happens until they do.</p>'
		].join('')
	);

const waitingPage = (ctx: Context, pending: Pending) => {
	const waitUrl = `/approve/${escapeHtml(ctx.pid)}/wait`;
	return layout(
		'Waiting for approval',
		[
			KICKER,
			progress(1),
			'<h1>Waiting for approval</h1>',
			'<p class="status">Waiting for the customer to approve.</p>',
			'<p class="code">Approval code: <strong id="approval-code">',
			`${escapeHtml(pending.code)}</strong></p>`,
			'<div class="track"></div>',
			'<p>The customer sees the same code in the approval email.</p>',
			`<p class="again"><a href="${waitUrl}">Check again</a></p>`
		].join(''),
		`<meta http-equiv="refresh" content="${pending.interval}">`
	);
};

const handbackPage = (returnTo: string, ref: string, token: string) =>
	layout(
		'Approved',
		[
			KICKER,
			progress(2),
			`<div class="mark ok">${icon('check')}</div>`,
			'<h1>Approved</h1>',
			'<p>The customer approved. Handing the approval back to the agent.</p>',
			`<form id="handback" method="post" action="${escapeHtml(returnTo)}">`,
			hiddenInput('token', token),
			hiddenInput('ref', ref),
			'<button type="submit">Continue</button>',
			'</form>',
			"<script>document.getElementById('handback').submit();</script>"
		].join('')
	);

const showStart = async (
	res: ApiResponse,
	ctx: Context,
	query: URLSearchParams
) => {
	const request = readApprovalRequest(paramsFields(query));
	if (!request) {
		sendError(res, 400, 'Invalid approval request');
		return;
	}
	const result = await gate(ctx, request.clientId, request.returnTo);
	if (!('returnTo' in result)) {
		sendError(res, result.status, result.message);
		return;
	}
	send(res, 200, startPage(ctx, request));
};

const startApproval = async (
	req: ApiRequest,
	res: ApiResponse,
	ctx: Context
) => {
	const fields = bodyFields(req);
	const request = fields && readApprovalRequest(fields);
	if (!fields || !request) {
		sendError(res, 400, 'Invalid approval request');
		return;
	}
	const loginId = normalizeLoginId(fields('login_id'));
	if (!loginId) {
		sendError(res, 400, 'Enter a valid email address');
		return;
	}
	const result = await gate(ctx, request.clientId, request.returnTo);
	if (!('returnTo' in result)) {
		sendError(res, result.status, result.message);
		return;
	}

	const code = String(randomInt(1000, 10000));
	const started = await postForm('/oauth2/v1/apps/bc-authorize', {
		...clientAuth(ctx, request.clientId),
		login_hint: loginId,
		scope: request.scope,
		binding_message: buildBindingMessage(request.summary, code),
		authorization_details: authorizationDetails(request.ref, request.order),
		...(request.resource === undefined ? {} : { resource: request.resource })
	});
	const authReqId = started.body.auth_req_id;
	if (
		!started.ok &&
		(started.body.error === 'invalid_client' ||
			started.body.errorCode === INVALID_CLIENT_ERROR_CODE)
	) {
		sendError(res, 400, 'This agent is not set up for approvals');
		return;
	}
	if (
		!started.ok ||
		!nonEmptyString(authReqId) ||
		authReqId.length > MAX_AUTH_REQ_ID_LENGTH
	) {
		sendError(res, 502, 'Could not send the approval request');
		return;
	}

	const expiresIn = positiveInt(
		started.body.expires_in,
		DEFAULT_EXPIRES_IN_SEC
	);
	setPendingCookie(res, ctx, {
		authReqId,
		code,
		clientId: request.clientId,
		ref: request.ref,
		returnTo: result.returnTo,
		interval: positiveInt(started.body.interval, DEFAULT_INTERVAL_SEC),
		expiresAt: Date.now() + expiresIn * 1000
	});
	res.setHeader('Location', `/approve/${ctx.pid}/wait`);
	send(res, 303, '');
};

const waitForApproval = async (
	req: ApiRequest,
	res: ApiResponse,
	ctx: Context
) => {
	const pending = readPending(req);
	if (!pending) {
		sendError(res, 400, 'No pending approval');
		return;
	}
	const result = await gate(ctx, pending.clientId, pending.returnTo);
	if (!('returnTo' in result)) {
		sendError(res, result.status, result.message);
		return;
	}

	const { ok, status, body } = await postForm('/oauth2/v1/apps/token', {
		grant_type: CIBA_GRANT_TYPE,
		...clientAuth(ctx, pending.clientId),
		auth_req_id: pending.authReqId
	});
	if (ok && nonEmptyString(body.access_token)) {
		clearPendingCookie(res, ctx);
		send(
			res,
			200,
			handbackPage(result.returnTo, pending.ref, body.access_token)
		);
		return;
	}
	// A gateway failure is not an answer; keep the approval the customer may still give
	if (status >= 500) throw new Error('The token endpoint is unavailable');
	if (body.error === 'authorization_pending') {
		send(res, 200, waitingPage(ctx, pending));
		return;
	}
	if (body.error === 'slow_down') {
		const slower = {
			...pending,
			interval: pending.interval + SLOW_DOWN_STEP_SEC
		};
		setPendingCookie(res, ctx, slower);
		send(res, 200, waitingPage(ctx, slower));
		return;
	}
	clearPendingCookie(res, ctx);
	sendError(res, 400, 'The approval was denied or has expired');
};

const parseRoute = (rawUrl: string | undefined) => {
	let url: URL;
	try {
		url = new URL(rawUrl ?? '/', 'http://localhost');
	} catch {
		return undefined;
	}
	// Vercel may show the rewritten URL (see vercel.json) or the original one
	const path =
		url.pathname === FUNCTION_PATH
			? (url.searchParams.get('path') ?? '')
			: url.pathname;
	if (path === JWKS_PATH) {
		return { jwks: true, pid: '', wait: false, query: url.searchParams };
	}
	const match = ROUTE_REGEX.exec(path);
	if (!match) return undefined;
	return {
		jwks: false,
		pid: match[1],
		wait: Boolean(match[2]),
		query: url.searchParams
	};
};

const methodNotAllowed = (res: ApiResponse, allow: string) => {
	res.setHeader('Allow', allow);
	sendError(res, 405, 'Method not allowed');
};

const handler = async (req: ApiRequest, res: ApiResponse) => {
	const route = parseRoute(req.url);
	if (!route) {
		sendError(res, 404, 'Not found');
		return;
	}
	const signingKey = loadSigningKey();
	if (!signingKey) {
		sendError(res, 500, 'This service is not configured');
		return;
	}
	if (route.jwks) {
		if (req.method === 'GET') {
			sendJwks(res, signingKey);
		} else {
			methodNotAllowed(res, 'GET');
		}
		return;
	}

	const ctx: Context = { pid: route.pid, signingKey, secure: isHttps(req) };
	try {
		if (route.wait && req.method === 'GET') {
			await waitForApproval(req, res, ctx);
		} else if (route.wait) {
			methodNotAllowed(res, 'GET');
		} else if (req.method === 'GET') {
			await showStart(res, ctx, route.query);
		} else if (req.method === 'POST') {
			await startApproval(req, res, ctx);
		} else {
			methodNotAllowed(res, 'GET, POST');
		}
	} catch (error) {
		const cause =
			error instanceof Error && isRecord(error.cause) ? error.cause : {};
		logFailure('Agent approval request failed', {
			method: req.method,
			wait: route.wait,
			error: error instanceof Error ? error.name : typeof error,
			code: stringField(cause.code)
		});
		const starting = !route.wait && req.method === 'POST';
		sendError(
			res,
			502,
			starting
				? 'Could not send the approval request'
				: 'Could not reach Descope. Try again.'
		);
	}
};

export { buildBindingMessage, orderSummary };

export default handler;
