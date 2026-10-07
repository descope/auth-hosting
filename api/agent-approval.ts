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
const CODE_REGEX = /^\d{4}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const MAX_AUTH_REQ_ID_LENGTH = 1000;
const DEFAULT_INTERVAL_SEC = 5;
const DEFAULT_EXPIRES_IN_SEC = 300;
const SLOW_DOWN_STEP_SEC = 5;
const MAX_BINDING_MESSAGE_LENGTH = 256;
const EMPTY_SUMMARY = 'An AI agent wants to act for you';
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

type Fields = (name: string) => string | undefined;

type ApprovalRequest = {
	clientId: string;
	scope: string;
	ref: string;
	summary: string;
	returnTo: string;
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

const buildBindingMessage = (summary: string, code: string) => {
	const suffix = `. Approve only if you asked for this. Code: ${code}`;
	const cleaned = summary
		.replace(/\s+/g, ' ')
		.replace(/[^\x20-\x7E]/g, '')
		.replace(/https?:\/\/ ?\S*|www\. ?\S*/gi, '')
		.replace(/ {2,}/g, ' ')
		.trim();
	if (!cleaned) return `${EMPTY_SUMMARY}${suffix}`;
	const budget = MAX_BINDING_MESSAGE_LENGTH - suffix.length;
	const text =
		cleaned.length > budget
			? `${cleaned.slice(0, budget - 3).trimEnd()}...`
			: cleaned;
	return `${text}${suffix}`;
};

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
		return values.length === 1 ? values[0] : undefined;
	};

const recordFields =
	(record: Record<string, unknown>): Fields =>
	(name) => {
		const value = hasOwn(record, name) ? record[name] : undefined;
		return typeof value === 'string' ? value : undefined;
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

const isValidScope = (scope: string | undefined): scope is string => {
	if (scope === undefined || scope.length > MAX_SCOPE_LENGTH) return false;
	const tokens = scope.split(' ');
	return (
		tokens.length <= MAX_SCOPE_TOKENS &&
		tokens.every((token) => SCOPE_TOKEN_REGEX.test(token))
	);
};

const readApprovalRequest = (fields: Fields): ApprovalRequest | undefined => {
	const clientId = fields('client_id');
	const scope = fields('scope');
	const ref = fields('ref');
	const returnTo = fields('return_to');
	if (!nonEmptyString(clientId) || !nonEmptyString(returnTo)) {
		return undefined;
	}
	if (!isValidScope(scope)) return undefined;
	if (ref === undefined || !REF_REGEX.test(ref)) return undefined;
	return { clientId, scope, ref, returnTo, summary: fields('summary') ?? '' };
};

const normalizeLoginId = (value: string | undefined) => {
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

const layout = (title: string, content: string, head = '') =>
	[
		'<!doctype html>',
		'<html lang="en"><head><meta charset="utf-8">',
		'<meta name="viewport" content="width=device-width, initial-scale=1">',
		head,
		`<title>${escapeHtml(title)}</title>`,
		'<style>body{font-family:system-ui,sans-serif;max-width:32rem;',
		'margin:3rem auto;padding:0 1rem;line-height:1.5}</style>',
		`</head><body>${content}</body></html>`
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
	send(res, status, layout(message, `<h1>${escapeHtml(message)}</h1>`));

const hiddenInput = (name: string, value: string) =>
	`<input type="hidden" name="${name}" value="${escapeHtml(value)}">`;

const startPage = (ctx: Context, request: ApprovalRequest) =>
	layout(
		'Approve an agent action',
		[
			'<h1>Approve an agent action</h1>',
			`<p>An AI agent wants to: ${escapeHtml(request.summary)}</p>`,
			`<form method="post" action="/approve/${escapeHtml(ctx.pid)}">`,
			hiddenInput('client_id', request.clientId),
			hiddenInput('scope', request.scope),
			hiddenInput('ref', request.ref),
			hiddenInput('summary', request.summary),
			hiddenInput('return_to', request.returnTo),
			'<p><label for="login_id">Customer email</label><br>',
			'<input id="login_id" name="login_id" type="email" required',
			' autocomplete="email"></p>',
			'<button type="submit">Send approval request</button>',
			'</form>'
		].join('')
	);

const waitingPage = (ctx: Context, pending: Pending) => {
	const waitUrl = `/approve/${escapeHtml(ctx.pid)}/wait`;
	return layout(
		'Waiting for approval',
		[
			'<h1>Waiting for approval</h1>',
			'<p>Waiting for the customer to approve.</p>',
			'<p>Approval code: <strong id="approval-code">',
			`${escapeHtml(pending.code)}</strong></p>`,
			'<p>The customer sees the same code in the approval email.</p>',
			`<p><a href="${waitUrl}">Check again</a></p>`
		].join(''),
		`<meta http-equiv="refresh" content="${pending.interval}">`
	);
};

const handbackPage = (returnTo: string, ref: string, token: string) =>
	layout(
		'Approved',
		[
			'<h1>Approved</h1>',
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
		binding_message: buildBindingMessage(request.summary, code)
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

export { buildBindingMessage };

export default handler;
