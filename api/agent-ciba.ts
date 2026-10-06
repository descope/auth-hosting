import { projectRegex } from '../src/shared/projectRegex';

const CIBA_GRANT_TYPE = 'urn:openid:params:grant-type:ciba';
const DEFAULT_BASE_URL = 'https://api.descope.com';
const FETCH_TIMEOUT_MS = 5000;
const DEFAULT_INTERVAL_SEC = 5;
const AGENT_NAME_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const MAX_AUTH_REQ_ID_LENGTH = 1000;
const LOCAL_HOSTNAMES = ['localhost', '127.0.0.1', '[::1]'];

// The backend deletes the CIBA request after a denial, an expiry or an approver
// email mismatch, so a later poll gets invalid_grant. All of these are terminal.
const POLL_STATUS_BY_ERROR = new Map([
	['authorization_pending', 'pending'],
	['slow_down', 'slow_down'],
	['access_denied', 'denied'],
	['expired_token', 'expired'],
	['invalid_grant', 'expired']
]);

type AgentConfig = { clientId: string; clientSecret: string; scope?: string };

type ApiRequest = { method?: string; body?: unknown };

type ApiResponse = {
	status: (code: number) => ApiResponse;
	setHeader: (name: string, value: string) => void;
	json: (body: unknown) => void;
};

type DescopeResult = { ok: boolean; body: Record<string, unknown> };

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const hasOwn = (obj: object, key: string) =>
	Object.prototype.hasOwnProperty.call(obj, key);

const nonEmptyString = (value: unknown): value is string =>
	typeof value === 'string' && value.length > 0;

const isAllowedCallbackUrl = (value: unknown): value is string => {
	if (!nonEmptyString(value)) return false;
	try {
		const url = new URL(value);
		if (url.protocol === 'https:') return true;
		return url.protocol === 'http:' && LOCAL_HOSTNAMES.includes(url.hostname);
	} catch {
		return false;
	}
};

const isAgentConfig = (value: unknown): value is AgentConfig =>
	isRecord(value) &&
	nonEmptyString(value.clientId) &&
	nonEmptyString(value.clientSecret) &&
	(value.scope === undefined || typeof value.scope === 'string');

const misconfigured = () => new Error('AGENT_CIBA_CONFIG is invalid');

// Returns undefined when the project or agent is not configured, and throws
// when AGENT_CIBA_CONFIG itself is broken.
const findAgent = (projectId: string, agentName: string) => {
	let config: unknown;
	try {
		config = JSON.parse(process.env.AGENT_CIBA_CONFIG ?? '');
	} catch {
		throw misconfigured();
	}
	if (!isRecord(config)) throw misconfigured();
	if (!hasOwn(config, projectId)) return undefined;

	const project = config[projectId];
	if (!isRecord(project)) throw misconfigured();
	const { callbackUrl, agents } = project;
	if (!isAllowedCallbackUrl(callbackUrl) || !isRecord(agents)) {
		throw misconfigured();
	}
	if (!hasOwn(agents, agentName)) return undefined;

	const agent = agents[agentName];
	if (!isAgentConfig(agent)) throw misconfigured();
	return { agent, callbackUrl };
};

const descopeBaseUrl = () =>
	(process.env.DESCOPE_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');

const postForm = async (
	path: string,
	form: Record<string, string>
): Promise<DescopeResult> => {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
	try {
		const response = await fetch(`${descopeBaseUrl()}${path}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Accept: 'application/json'
			},
			body: new URLSearchParams(form).toString(),
			signal: controller.signal
		});
		const body: unknown = await response.json().catch(() => undefined);
		return { ok: response.ok, body: isRecord(body) ? body : {} };
	} finally {
		clearTimeout(timeoutId);
	}
};

const clientAuth = (agent: AgentConfig) => ({
	client_id: agent.clientId,
	client_secret: agent.clientSecret
});

const sendJson = (res: ApiResponse, status: number, body: unknown) => {
	res.status(status).json(body);
};

const start = async (
	res: ApiResponse,
	agent: AgentConfig,
	rawEmail: unknown
) => {
	// ciba-finish compares the approver's stored (lower-case) email to
	// login_hint exactly, so normalize before sending it.
	const email =
		typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
	if (email.length > MAX_EMAIL_LENGTH || !EMAIL_REGEX.test(email)) {
		sendJson(res, 400, { error: 'invalid_email' });
		return;
	}

	const form: Record<string, string> = {
		...clientAuth(agent),
		login_hint: email
	};
	if (agent.scope) form.scope = agent.scope;

	const { ok, body } = await postForm('/oauth2/v1/apps/bc-authorize', form);
	if (!ok || !nonEmptyString(body.auth_req_id)) {
		sendJson(res, 502, { error: 'ciba_start_failed' });
		return;
	}
	sendJson(res, 200, {
		authReqId: body.auth_req_id,
		interval:
			typeof body.interval === 'number' && body.interval > 0
				? body.interval
				: DEFAULT_INTERVAL_SEC,
		expiresIn: typeof body.expires_in === 'number' ? body.expires_in : 0
	});
};

const poll = async (
	res: ApiResponse,
	agent: AgentConfig,
	callbackUrl: string,
	authReqId: unknown
) => {
	if (!nonEmptyString(authReqId) || authReqId.length > MAX_AUTH_REQ_ID_LENGTH) {
		sendJson(res, 400, { error: 'invalid_request' });
		return;
	}

	const { ok, body } = await postForm('/oauth2/v1/apps/token', {
		...clientAuth(agent),
		grant_type: CIBA_GRANT_TYPE,
		auth_req_id: authReqId
	});
	if (ok && nonEmptyString(body.access_token)) {
		sendJson(res, 200, {
			status: 'approved',
			accessToken: body.access_token,
			callbackUrl
		});
		return;
	}
	const status =
		typeof body.error === 'string'
			? POLL_STATUS_BY_ERROR.get(body.error)
			: undefined;
	if (!status) {
		sendJson(res, 502, { error: 'ciba_poll_failed' });
		return;
	}
	sendJson(res, 200, { status });
};

const readBody = (req: ApiRequest) => {
	try {
		return isRecord(req.body) ? req.body : undefined;
	} catch {
		// Vercel's lazy body parser throws on malformed JSON
		return undefined;
	}
};

const handler = async (req: ApiRequest, res: ApiResponse) => {
	res.setHeader('Cache-Control', 'no-store');
	if (req.method !== 'POST') {
		res.setHeader('Allow', 'POST');
		sendJson(res, 405, { error: 'method_not_allowed' });
		return;
	}

	const body = readBody(req);
	const projectId = body?.projectId;
	const agentName = body?.agent;
	if (
		typeof projectId !== 'string' ||
		!projectRegex.test(projectId) ||
		typeof agentName !== 'string' ||
		!AGENT_NAME_REGEX.test(agentName)
	) {
		sendJson(res, 400, { error: 'invalid_request' });
		return;
	}

	let target: ReturnType<typeof findAgent>;
	try {
		target = findAgent(projectId, agentName);
	} catch {
		sendJson(res, 500, { error: 'misconfigured' });
		return;
	}
	if (!target) {
		sendJson(res, 404, { error: 'unknown_agent' });
		return;
	}

	try {
		if (body?.action === 'start') {
			await start(res, target.agent, body.email);
		} else if (body?.action === 'poll') {
			await poll(res, target.agent, target.callbackUrl, body.authReqId);
		} else {
			sendJson(res, 400, { error: 'invalid_action' });
		}
	} catch {
		sendJson(res, 502, { error: 'descope_unreachable' });
	}
};

export default handler;
