import { randomInt } from 'crypto';

const DEFAULT_BASE_URL = 'https://api.descope.com';
const FETCH_TIMEOUT_MS = 10000;
const APPS_CACHE_MS = 60 * 1000;
const SECRET_CACHE_MS = 5 * 60 * 1000;
const CIBA_GRANT_TYPE = 'urn:openid:params:grant-type:ciba';
const COOKIE_NAME = 'agent_approval';
const FUNCTION_PATH = '/api/agent-approval';
const ROUTE_REGEX = /^\/approve\/([A-Za-z0-9]+)(\/wait)?\/?$/;
const REF_REGEX = /^[A-Za-z0-9_-]{16,128}$/;
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
};

type AgentApp = {
	id: string;
	name: string;
	clientId: string;
	cibaEnabled: boolean;
	loginPageURL: string;
	approvedCallbackUrls: string[];
	scope: string;
};

type Context = { pid: string; key: string; host: string; secure: boolean };

type Fields = (name: string) => string | undefined;

type ApprovalRequest = {
	clientId: string;
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

type GateResult =
	{ app: AgentApp; returnTo: string } | { status: number; message: string };

const appsCache = new Map<string, { expiresAt: number; apps: AgentApp[] }>();
const secretCache = new Map<string, { expiresAt: number; secret: string }>();

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

// Undefined for an unknown project; throws when the env var itself is broken.
const managementKey = (pid: string) => {
	const misconfigured = new Error('AGENT_APPROVAL_MANAGEMENT_KEYS is invalid');
	let keys: unknown;
	try {
		keys = JSON.parse(process.env.AGENT_APPROVAL_MANAGEMENT_KEYS ?? '');
	} catch {
		throw misconfigured;
	}
	if (!isRecord(keys)) throw misconfigured;
	if (!hasOwn(keys, pid)) return undefined;
	const key = keys[pid];
	if (!nonEmptyString(key)) throw misconfigured;
	return key;
};

// Fixed fields only: bodies and error messages can carry secrets or the login ID
const logFailure = (message: string, details: Record<string, unknown>) => {
	// eslint-disable-next-line no-console
	console.error(message, JSON.stringify(details));
};

const stringField = (value: unknown) =>
	typeof value === 'string' ? value : undefined;

const callDescope = async (
	path: string,
	init: RequestInit
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
			body: isRecord(body) ? body : {}
		};
		const error = stringField(result.body.error);
		if (!result.ok && !(error && POLLING_ERRORS.includes(error))) {
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

const managementHeaders = (ctx: Context) => ({
	Authorization: `Bearer ${ctx.pid}:${ctx.key}`,
	Accept: 'application/json'
});

const stringList = (value: unknown, field?: string) => {
	if (!Array.isArray(value)) return [];
	return value
		.map((item: unknown) => {
			if (!field) return item;
			return isRecord(item) ? item[field] : undefined;
		})
		.filter(nonEmptyString);
};

const toAgentApp = (raw: unknown): AgentApp | undefined => {
	if (!isRecord(raw) || !nonEmptyString(raw.id)) return undefined;
	if (!nonEmptyString(raw.clientId)) return undefined;
	const ciba = isRecord(raw.cibaSettings) ? raw.cibaSettings : {};
	const scopes = stringList(raw.permissionsScopes, 'name').concat(
		stringList(raw.scopeClaimMapping, 'scope')
	);
	return {
		id: raw.id,
		name: typeof raw.name === 'string' ? raw.name : '',
		clientId: raw.clientId,
		cibaEnabled: ciba.enabled === true,
		loginPageURL:
			typeof ciba.loginPageURL === 'string' ? ciba.loginPageURL : '',
		approvedCallbackUrls: stringList(raw.approvedCallbackUrls),
		scope: Array.from(new Set(scopes)).join(' ')
	};
};

const loadApps = async (ctx: Context) => {
	const cached = appsCache.get(ctx.pid);
	if (cached && cached.expiresAt > Date.now()) return cached.apps;

	const { ok, body } = await callDescope('/v2/mgmt/thirdparty/apps/load', {
		method: 'POST',
		headers: {
			...managementHeaders(ctx),
			'Content-Type': 'application/json'
		},
		body: '{}'
	});
	if (!ok || !Array.isArray(body.apps)) {
		throw new Error('Failed to load third party apps');
	}
	const apps = body.apps
		.map(toAgentApp)
		.filter((app): app is AgentApp => app !== undefined);
	appsCache.set(ctx.pid, { expiresAt: Date.now() + APPS_CACHE_MS, apps });
	return apps;
};

const loadSecret = async (ctx: Context, appId: string) => {
	const cacheKey = `${ctx.pid}:${appId}`;
	const cached = secretCache.get(cacheKey);
	if (cached && cached.expiresAt > Date.now()) return cached.secret;

	const { ok, body } = await callDescope(
		`/v1/mgmt/thirdparty/app/secret?id=${encodeURIComponent(appId)}`,
		{ method: 'GET', headers: managementHeaders(ctx) }
	);
	if (!ok || !nonEmptyString(body.cleartext)) {
		throw new Error('Failed to load the app secret');
	}
	secretCache.set(cacheKey, {
		expiresAt: Date.now() + SECRET_CACHE_MS,
		secret: body.cleartext
	});
	return body.cleartext;
};

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

const urlHost = (value: string) => {
	try {
		return new URL(value).host;
	} catch {
		return undefined;
	}
};

const gate = async (
	ctx: Context,
	clientId: string,
	returnTo: string
): Promise<GateResult> => {
	const apps = await loadApps(ctx);
	const app = apps.find((candidate) => candidate.clientId === clientId);
	const loginHost = app && urlHost(app.loginPageURL);
	if (!app || !app.cibaEnabled || !loginHost || loginHost !== ctx.host) {
		return { status: 400, message: 'Unknown agent' };
	}
	const target = httpUrl(returnTo);
	const allowed = app.approvedCallbackUrls.some(
		(url) => httpUrl(url) === target
	);
	if (!target || !allowed) {
		return { status: 400, message: 'This return URL is not allowed' };
	}
	return { app, returnTo: target };
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

const readApprovalRequest = (fields: Fields): ApprovalRequest | undefined => {
	const clientId = fields('client_id');
	const ref = fields('ref');
	const returnTo = fields('return_to');
	if (!nonEmptyString(clientId) || !nonEmptyString(returnTo)) {
		return undefined;
	}
	if (ref === undefined || !REF_REGEX.test(ref)) return undefined;
	return { clientId, ref, returnTo, summary: fields('summary') ?? '' };
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

const send = (res: ApiResponse, status: number, html: string) => {
	res.statusCode = status;
	res.setHeader('Content-Type', 'text/html; charset=utf-8');
	res.setHeader('Cache-Control', 'no-store');
	res.setHeader('Referrer-Policy', 'no-referrer');
	res.setHeader('X-Content-Type-Options', 'nosniff');
	res.setHeader('X-Frame-Options', 'DENY');
	res.end(html);
};

const sendError = (res: ApiResponse, status: number, message: string) =>
	send(res, status, layout(message, `<h1>${escapeHtml(message)}</h1>`));

const hiddenInput = (name: string, value: string) =>
	`<input type="hidden" name="${name}" value="${escapeHtml(value)}">`;

const startPage = (ctx: Context, app: AgentApp, request: ApprovalRequest) =>
	layout(
		'Approve an agent action',
		[
			'<h1>Approve an agent action</h1>',
			`<p><strong>${escapeHtml(app.name || 'An AI agent')}</strong>`,
			` wants to: ${escapeHtml(request.summary)}</p>`,
			`<form method="post" action="/approve/${escapeHtml(ctx.pid)}">`,
			hiddenInput('client_id', request.clientId),
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
	if (!('app' in result)) {
		sendError(res, result.status, result.message);
		return;
	}
	send(res, 200, startPage(ctx, result.app, request));
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
	if (!('app' in result)) {
		sendError(res, result.status, result.message);
		return;
	}

	const { app, returnTo } = result;
	const clientSecret = await loadSecret(ctx, app.id);
	const code = String(randomInt(1000, 10000));
	const form: Record<string, string> = {
		client_id: app.clientId,
		client_secret: clientSecret,
		login_hint: loginId,
		binding_message: buildBindingMessage(request.summary, code)
	};
	if (app.scope) form.scope = app.scope;

	const started = await postForm('/oauth2/v1/apps/bc-authorize', form);
	const authReqId = started.body.auth_req_id;
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
		clientId: app.clientId,
		ref: request.ref,
		returnTo,
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
	if (!('app' in result)) {
		sendError(res, result.status, result.message);
		return;
	}

	const { app, returnTo } = result;
	const { ok, status, body } = await postForm('/oauth2/v1/apps/token', {
		grant_type: CIBA_GRANT_TYPE,
		client_id: app.clientId,
		client_secret: await loadSecret(ctx, app.id),
		auth_req_id: pending.authReqId
	});
	if (ok && nonEmptyString(body.access_token)) {
		clearPendingCookie(res, ctx);
		send(res, 200, handbackPage(returnTo, pending.ref, body.access_token));
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
	const match = ROUTE_REGEX.exec(path);
	if (!match) return undefined;
	return { pid: match[1], wait: Boolean(match[2]), query: url.searchParams };
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
	let key: string | undefined;
	try {
		key = managementKey(route.pid);
	} catch {
		sendError(res, 500, 'This service is not configured');
		return;
	}
	if (!key) {
		sendError(res, 404, 'Not found');
		return;
	}

	const ctx: Context = {
		pid: route.pid,
		key,
		host: headerValue(req, 'host').toLowerCase(),
		secure: isHttps(req)
	};
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
