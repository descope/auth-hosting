/**
 * @jest-environment node
 */
import crypto from 'crypto';
import vercelConfig from '../vercel.json';
import { buildBindingMessage, orderSummary } from '../api/agent-approval';

type Handler = typeof import('../api/agent-approval').default;

type FakeResponse = {
	statusCode: number;
	headers: Record<string, string>;
	body: string;
	setHeader: (name: string, value: string) => void;
	end: (body?: string) => void;
};

type FakeRequest = {
	method?: string;
	url: string;
	headers?: Record<string, string>;
	body?: unknown;
};

type Reply = { status: number; body: unknown; location?: string };

type Endpoint = 'authorize' | 'openCheck' | 'bcAuthorize' | 'token';

const pid = 'P2Sn0gttY5sY4Zu6WDGAAEJ4VTrv';
const otherPid = 'P3Sn0gttY5sY4Zu6WDGAAEJ4VTrv';
const clientId = 'test-grok-client-id';
const scope = 'orders:write email';
const returnTo = 'https://shop.example.com/descope/agent-callback';
const resource = 'https://shop.example.com';
const ref = 'test_ref-0123456789abcdefghijklmnopqrstuv';
const order = {
	total: '282.00',
	currency: 'USD',
	items: [
		{ name: 'Trail Runner', qty: 2 },
		{ name: 'Merino Socks', qty: 1 }
	]
};
const orderParam = JSON.stringify(order);
const expectedDetails = JSON.stringify([{ type: 'order', ref, ...order }]);
const summary = 'Order 2x Trail Runner; 1x Merino Socks. Total USD 282.00';
const orderWith = (overrides: Record<string, unknown>) =>
	JSON.stringify({ ...order, ...overrides });
const itemsOf = (...items: unknown[]) => orderWith({ items });
const loginId = 'alice@example.com';
const accessToken = 'test-access-token';
const codeChallenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';
const openCheckUrlPrefix = 'https://agent-approval.invalid/';

// Shapes captured from live calls against a local Descope stack (2026-10-07)
const approvedLocation =
	`https://approve.example.com/login/${pid}?flow=inbound-apps-user-consent` +
	`&oidc_error_redirect_uri=${encodeURIComponent(returnTo)}` +
	'&third_party_app_id=TPA2Sn0gttY5sY4Zu6WDGAAEJ4VTrv' +
	'&third_party_app_state_id=s-test-state-id';
const unknownClientLocation =
	'https://descope.example.com/login/error?error=invalid_request%3A+%5BE063308%5D' +
	'+Requested+application+not+found%3A+Third+party+application+not+found' +
	'&error_description=%5BE063308%5D+Requested+application+not+found%3A' +
	'+Third+party+application+not+found';
const notApprovedReply: Reply = {
	status: 401,
	body: {
		errorCode: 'E061004',
		errorDescription: 'Unauthorized request',
		errorMessage:
			'Redirect URL does not match the approved redirect urls for this third party application',
		message:
			'Redirect URL does not match the approved redirect urls for this third party application'
	}
};
const untrustedKeyReply: Reply = {
	status: 400,
	body: {
		errorCode: 'E066009',
		errorDescription: 'invalid_client',
		errorMessage: 'Failed to find trusted issuer (provider) for JWT assertion',
		message: 'Failed to find trusted issuer (provider) for JWT assertion'
	}
};

const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
	namedCurve: 'P-256'
});
const signingPem = privateKey
	.export({ type: 'pkcs8', format: 'pem' })
	.toString();
const publicJwk = publicKey.export({ format: 'jwk' });

const mockFetch = jest.fn() as jest.Mock & typeof fetch;
const originalFetch = global.fetch;

let handler: Handler;
let replies: Record<Endpoint, Reply>;
let consoleError: jest.SpyInstance;

const endpointOf = (url: string): Endpoint | undefined => {
	if (/\/oauth2\/v1\/apps\/P[A-Za-z0-9]+\/authorize\?/.test(url)) {
		const redirectUri = new URL(url).searchParams.get('redirect_uri') ?? '';
		return redirectUri.startsWith(openCheckUrlPrefix)
			? 'openCheck'
			: 'authorize';
	}
	if (url.endsWith('/oauth2/v1/apps/bc-authorize')) return 'bcAuthorize';
	if (url.endsWith('/oauth2/v1/apps/token')) return 'token';
	return undefined;
};

const fakeFetchResponse = ({ status, body, location }: Reply) => ({
	ok: status >= 200 && status < 300,
	status,
	headers: {
		get: (name: string) =>
			name.toLowerCase() === 'location' ? (location ?? null) : null
	},
	json: async () => body
});

const callsTo = (endpoint: Endpoint) =>
	mockFetch.mock.calls.filter(([url]) => endpointOf(String(url)) === endpoint);

const sentForm = (endpoint: Endpoint, index = 0) =>
	Object.fromEntries(new URLSearchParams(callsTo(endpoint)[index][1].body));

const authorizeQuery = (index = 0) =>
	Object.fromEntries(new URL(callsTo('authorize')[index][0]).searchParams);

const decodeAssertion = (assertion: string) => {
	const [header, claims, signature] = assertion.split('.');
	const json = (part: string) =>
		JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
	return {
		header: json(header),
		claims: json(claims),
		signingInput: `${header}.${claims}`,
		signature: Buffer.from(signature, 'base64url')
	};
};

const verifies = (assertion: string, key: crypto.KeyObject = publicKey) => {
	const { signingInput, signature } = decodeAssertion(assertion);
	return crypto.verify(
		'sha256',
		Buffer.from(signingInput),
		{ key, dsaEncoding: 'ieee-p1363' },
		signature
	);
};

const fakeResponse = (): FakeResponse => {
	const res: FakeResponse = {
		statusCode: 200,
		headers: {},
		body: '',
		setHeader: (name, value) => {
			res.headers[name] = value;
		},
		end: (body = '') => {
			res.body = body;
		}
	};
	return res;
};

const call = async ({ headers = {}, ...req }: FakeRequest) => {
	const res = fakeResponse();
	await handler({ method: 'GET', ...req, headers }, res);
	return res;
};

const startQuery = (overrides: Record<string, string> = {}) =>
	new URLSearchParams({
		client_id: clientId,
		scope,
		ref,
		order: orderParam,
		return_to: returnTo,
		...overrides
	}).toString();

const getStart = (overrides: Record<string, string> = {}) =>
	call({ url: `/approve/${pid}?${startQuery(overrides)}` });

const getJwks = () => call({ url: '/approve/jwks.json' });

const resourceOfLength = (length: number) => `${resource}/`.padEnd(length, 'a');

const startBody = (overrides: Record<string, unknown> = {}) => ({
	client_id: clientId,
	scope,
	ref,
	order: orderParam,
	return_to: returnTo,
	login_id: loginId,
	...overrides
});

const postStart = (
	overrides: Record<string, unknown> = {},
	headers: Record<string, string> = {}
) =>
	call({
		method: 'POST',
		url: `/approve/${pid}`,
		headers,
		body: startBody(overrides)
	});

const pendingCookie = (overrides: Record<string, unknown> = {}) => {
	const pending = {
		authReqId: 'test-auth-req-id',
		code: '1234',
		clientId,
		ref,
		returnTo,
		interval: 5,
		expiresAt: Date.now() + 60000,
		...overrides
	};
	const value = Buffer.from(JSON.stringify(pending)).toString('base64url');
	return `agent_approval=${value}`;
};

const getWait = (cookie?: string) =>
	call({ url: `/approve/${pid}/wait`, headers: cookie ? { cookie } : {} });

const cookiePair = (res: FakeResponse) =>
	res.headers['Set-Cookie'].split(';')[0];

const cookieAttributes = (res: FakeResponse) =>
	res.headers['Set-Cookie'].split('; ').slice(1);

const decodeCookie = (res: FakeResponse) =>
	JSON.parse(
		Buffer.from(
			cookiePair(res).slice('agent_approval='.length),
			'base64url'
		).toString('utf8')
	);

const expectSecurityHeaders = (res: FakeResponse) => {
	expect(res.headers).toEqual(
		expect.objectContaining({
			'Content-Type': 'text/html; charset=utf-8',
			'Cache-Control': 'no-store',
			'Referrer-Policy': 'no-referrer',
			'X-Content-Type-Options': 'nosniff',
			'X-Frame-Options': 'DENY'
		})
	);
};

const failFetchFor = (endpoint: Endpoint, error: Error) => {
	const implementation = mockFetch.getMockImplementation();
	mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
		if (endpointOf(url) === endpoint) throw error;
		return implementation?.(url, init);
	});
};

describe('agent-approval function', () => {
	const savedEnv = { ...process.env };

	beforeAll(() => {
		global.fetch = mockFetch;
	});

	afterAll(() => {
		global.fetch = originalFetch;
	});

	beforeEach(async () => {
		jest.resetModules();
		({ default: handler } = await import('../api/agent-approval'));
		process.env.AGENT_APPROVAL_SIGNING_KEY = signingPem;
		process.env.DESCOPE_BASE_URL = 'https://descope.example.com/';
		replies = {
			authorize: { status: 303, body: {}, location: approvedLocation },
			openCheck: notApprovedReply,
			bcAuthorize: {
				status: 200,
				body: { auth_req_id: 'test-auth-req-id', interval: 7, expires_in: 120 }
			},
			token: { status: 400, body: { error: 'authorization_pending' } }
		};
		consoleError = jest
			.spyOn(console, 'error')
			.mockImplementation(() => undefined);
		mockFetch.mockImplementation(async (url: string) => {
			const endpoint = endpointOf(url);
			if (!endpoint) throw new Error(`Unexpected fetch to ${url}`);
			return fakeFetchResponse(replies[endpoint]);
		});
	});

	afterEach(() => {
		jest.useRealTimers();
		jest.restoreAllMocks();
		process.env = { ...savedEnv };
	});

	describe('routing', () => {
		it.each([
			'constructor',
			'toString',
			`P${'a'.repeat(19)}`,
			`P${'a'.repeat(41)}`,
			`p${'a'.repeat(27)}`,
			`P${'a'.repeat(26)}-`
		])('returns 404 for the malformed project ID %s', async (badPid) => {
			const res = await call({ url: `/approve/${badPid}?${startQuery()}` });

			expect(res.statusCode).toBe(404);
			expectSecurityHeaders(res);
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it.each([
			'/',
			'/approve',
			`/approve/${pid}/other`,
			`/approve/__proto__`,
			'/approve/jwks.json/wait',
			'/api/agent-approval',
			'/api/agent-approval?path=/login',
			'//['
		])('returns 404 for %s', async (url) => {
			const res = await call({ url });

			expect(res.statusCode).toBe(404);
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it.each([
			['20', `P${'a'.repeat(20)}`],
			['40', `P${'a'.repeat(40)}`],
			['27', otherPid]
		])(
			'serves any project with %s characters after the P',
			async (_, anyPid) => {
				const res = await call({ url: `/approve/${anyPid}?${startQuery()}` });

				expect(res.statusCode).toBe(200);
				expect(callsTo('authorize')[0][0]).toContain(
					`/oauth2/v1/apps/${anyPid}/authorize?`
				);
			}
		);

		it('serves the start page on the rewritten function URL', async () => {
			const path = encodeURIComponent(`/approve/${pid}`);
			const res = await call({
				url: `/api/agent-approval?path=${path}&${startQuery()}`
			});

			expect(res.statusCode).toBe(200);
			expect(res.body).toContain('Approve an agent action');
		});

		it('serves the wait route on the rewritten function URL', async () => {
			const res = await call({
				url: `/api/agent-approval?path=/approve/${pid}/wait`,
				headers: { cookie: pendingCookie() }
			});

			expect(res.statusCode).toBe(200);
			expect(res.body).toContain('id="approval-code"');
		});

		it('accepts a trailing slash on the original URL', async () => {
			const res = await call({ url: `/approve/${pid}/?${startQuery()}` });

			expect(res.statusCode).toBe(200);
		});

		it.each(['/approve/:pid', '/approve/:pid/wait'])(
			'routes the vercel.json rewrite for %s',
			async (source) => {
				const rewrite = vercelConfig.rewrites.find(
					(candidate) => candidate.source === source
				);
				const destination = (rewrite?.destination ?? '').replace(':pid', pid);

				const res = await call({
					url: `${destination}&${startQuery()}`,
					headers: { cookie: pendingCookie() }
				});

				expect(destination.startsWith('/api/agent-approval?')).toBe(true);
				expect(res.statusCode).toBe(200);
			}
		);

		it('routes the vercel.json rewrite for the key set before /approve/:pid', async () => {
			const sources = vercelConfig.rewrites.map(({ source }) => source);
			const rewrite = vercelConfig.rewrites.find(
				(candidate) => candidate.source === '/approve/jwks.json'
			);

			const res = await call({ url: rewrite?.destination ?? '' });

			expect(sources.indexOf('/approve/jwks.json')).toBeLessThan(
				sources.indexOf('/approve/:pid')
			);
			expect(res.statusCode).toBe(200);
			expect(res.headers['Content-Type']).toBe('application/json');
		});

		it.each([
			['missing', () => undefined],
			['not a PEM', () => 'not a key'],
			[
				'an RSA key',
				() =>
					crypto
						.generateKeyPairSync('rsa', { modulusLength: 1024 })
						.privateKey.export({ type: 'pkcs8', format: 'pem' })
						.toString()
			],
			[
				'a P-384 key',
				() =>
					crypto
						.generateKeyPairSync('ec', { namedCurve: 'P-384' })
						.privateKey.export({ type: 'pkcs8', format: 'pem' })
						.toString()
			],
			[
				'a public key',
				() => publicKey.export({ type: 'spki', format: 'pem' }).toString()
			]
		])('returns 500 when the signing key is %s', async (_, makeKey) => {
			const key = makeKey();
			if (key === undefined) {
				delete process.env.AGENT_APPROVAL_SIGNING_KEY;
			} else {
				process.env.AGENT_APPROVAL_SIGNING_KEY = key;
			}

			const start = await getStart();
			const jwks = await getJwks();

			expect(start.statusCode).toBe(500);
			expect(start.body).toContain('This service is not configured');
			expectSecurityHeaders(start);
			expect(jwks.statusCode).toBe(500);
			expect(jwks.body).toContain('This service is not configured');
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('returns 405 for an unsupported method on the start route', async () => {
			const res = await call({ method: 'PUT', url: `/approve/${pid}` });

			expect(res.statusCode).toBe(405);
			expect(res.headers.Allow).toBe('GET, POST');
			expectSecurityHeaders(res);
		});

		it('returns 405 for a POST to the wait route', async () => {
			const res = await call({ method: 'POST', url: `/approve/${pid}/wait` });

			expect(res.statusCode).toBe(405);
			expect(res.headers.Allow).toBe('GET');
		});

		it('returns 405 for a POST to the key set', async () => {
			const res = await call({ method: 'POST', url: '/approve/jwks.json' });

			expect(res.statusCode).toBe(405);
			expect(res.headers.Allow).toBe('GET');
		});
	});

	describe('key set', () => {
		it('publishes the public key with its RFC 7638 thumbprint as kid', async () => {
			const res = await getJwks();

			const thumbprint = crypto
				.createHash('sha256')
				.update(
					`{"crv":"P-256","kty":"EC","x":"${publicJwk.x}","y":"${publicJwk.y}"}`
				)
				.digest('base64url');
			expect(res.statusCode).toBe(200);
			expect(res.headers).toEqual({
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=300',
				'Referrer-Policy': 'no-referrer',
				'X-Content-Type-Options': 'nosniff',
				'X-Frame-Options': 'DENY'
			});
			expect(JSON.parse(res.body)).toEqual({
				keys: [
					{
						kty: 'EC',
						crv: 'P-256',
						x: publicJwk.x,
						y: publicJwk.y,
						kid: thumbprint,
						alg: 'ES256',
						use: 'sig'
					}
				]
			});
			expect(res.body).not.toContain('"d"');
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('publishes a key that verifies the assertions the service sends', async () => {
			const res = await getJwks();
			await postStart();

			const [jwk] = JSON.parse(res.body).keys;
			const key = crypto.createPublicKey({ key: jwk, format: 'jwk' });
			const assertion = sentForm('bcAuthorize').client_assertion;
			expect(decodeAssertion(assertion).header.kid).toBe(jwk.kid);
			expect(verifies(assertion, key)).toBe(true);
		});
	});

	describe('client assertion', () => {
		it('signs an ES256 assertion for bc-authorize', async () => {
			const before = Math.floor(Date.now() / 1000);

			await postStart();
			const after = Math.floor(Date.now() / 1000);

			const form = sentForm('bcAuthorize');
			expect(form.client_assertion_type).toBe(
				'urn:ietf:params:oauth:client-assertion-type:jwt-bearer'
			);
			const { header, claims, signature } = decodeAssertion(
				form.client_assertion
			);
			const { keys } = JSON.parse((await getJwks()).body);
			expect(header).toEqual({ alg: 'ES256', typ: 'JWT', kid: keys[0].kid });
			expect(claims).toEqual({
				iss: clientId,
				sub: clientId,
				aud: `https://descope.example.com/oauth2/v1/apps/${pid}/token`,
				jti: expect.stringMatching(/^[A-Za-z0-9_-]{22}$/),
				iat: expect.any(Number),
				exp: claims.iat + 60
			});
			expect(claims.iat).toBeGreaterThanOrEqual(before);
			expect(claims.iat).toBeLessThanOrEqual(after);
			expect(signature).toHaveLength(64);
			expect(verifies(form.client_assertion)).toBe(true);
		});

		it('names the project of the request in the audience', async () => {
			await call({
				method: 'POST',
				url: `/approve/${otherPid}`,
				body: startBody()
			});

			const { claims } = decodeAssertion(
				sentForm('bcAuthorize').client_assertion
			);
			expect(claims.aud).toBe(
				`https://descope.example.com/oauth2/v1/apps/${otherPid}/token`
			);
		});

		it('signs a fresh assertion for every token poll', async () => {
			await getWait(pendingCookie());
			await getWait(pendingCookie());

			const assertions = [0, 1].map(
				(index) => sentForm('token', index).client_assertion
			);
			const jtis = assertions.map(
				(assertion) => decodeAssertion(assertion).claims.jti
			);
			expect(jtis[0]).not.toBe(jtis[1]);
			assertions.forEach((assertion) => {
				expect(verifies(assertion)).toBe(true);
				expect(decodeAssertion(assertion).claims.sub).toBe(clientId);
			});
		});

		it('never sends a client secret', async () => {
			await getStart();
			await postStart();
			replies.token = { status: 200, body: { access_token: accessToken } };
			await getWait(pendingCookie());

			expect(callsTo('authorize')).toHaveLength(1);
			expect(callsTo('bcAuthorize')).toHaveLength(1);
			expect(callsTo('token')).toHaveLength(1);
			expect(JSON.stringify(mockFetch.mock.calls)).not.toContain(
				'client_secret'
			);
			mockFetch.mock.calls.forEach(([, init]) => {
				expect(init.headers).not.toHaveProperty('Authorization');
			});
		});
	});

	describe('callback URL check', () => {
		it('asks the public authorize endpoint without a credential', async () => {
			await getStart();

			const [[url, init]] = callsTo('authorize');
			expect(url.split('?')[0]).toBe(
				`https://descope.example.com/oauth2/v1/apps/${pid}/authorize`
			);
			expect(authorizeQuery()).toEqual({
				response_type: 'code',
				client_id: clientId,
				redirect_uri: returnTo,
				scope: 'openid',
				state: expect.stringMatching(/^[A-Za-z0-9_-]{22}$/),
				code_challenge: codeChallenge,
				code_challenge_method: 'S256'
			});
			expect(init).toEqual(
				expect.objectContaining({
					method: 'GET',
					headers: { Accept: 'application/json' },
					redirect: 'manual'
				})
			);
		});

		it('approves a return URL that redirects to the consent flow', async () => {
			const res = await getStart();

			expect(res.statusCode).toBe(200);
			expect(res.body).toContain('<form');
		});

		it('asks again with a return URL no app approves', async () => {
			await getStart();

			const [[url]] = callsTo('openCheck');
			expect(url.split('?')[0]).toBe(
				`https://descope.example.com/oauth2/v1/apps/${pid}/authorize`
			);
			expect(Object.fromEntries(new URL(url).searchParams)).toEqual({
				...authorizeQuery(),
				redirect_uri: expect.stringMatching(
					/^https:\/\/agent-approval\.invalid\/[A-Za-z0-9_-]{22}$/
				),
				state: expect.stringMatching(/^[A-Za-z0-9_-]{22}$/)
			});
		});

		it('rejects and caches an agent app that approves any return URL', async () => {
			replies.openCheck = { status: 303, body: {}, location: approvedLocation };

			const res = await getStart();
			const again = await postStart();

			expect(res.statusCode).toBe(400);
			expect(res.body).toContain('This agent is not set up for approvals');
			expect(res.body).not.toContain('<form');
			expect(again.statusCode).toBe(400);
			expect(callsTo('bcAuthorize')).toHaveLength(0);
			expect(callsTo('authorize')).toHaveLength(1);
			expect(callsTo('openCheck')).toHaveLength(1);
		});

		it('does not hand back to an agent app that approves any return URL', async () => {
			replies.openCheck = { status: 303, body: {}, location: approvedLocation };
			replies.token = { status: 200, body: { access_token: accessToken } };

			const res = await getWait(pendingCookie());

			expect(res.statusCode).toBe(400);
			expect(res.body).not.toContain(accessToken);
			expect(callsTo('token')).toHaveLength(0);
		});

		it.each([
			['a 5xx', { status: 503, body: {} }],
			['a 429', { status: 429, body: {} }],
			['a redirect without a Location', { status: 303, body: {} }]
		])(
			'returns 502 and does not cache %s to the open callback check',
			async (_, reply) => {
				replies.openCheck = reply;

				const res = await getStart();
				replies.openCheck = notApprovedReply;
				const retry = await getStart();

				expect(res.statusCode).toBe(502);
				expect(retry.statusCode).toBe(200);
				expect(callsTo('openCheck')).toHaveLength(2);
			}
		);

		it.each([
			['the captured redirect mismatch', notApprovedReply],
			[
				'another 4xx',
				{ status: 400, body: { errorCode: 'E011002', message: 'Bad request' } }
			]
		])('rejects the return URL on %s', async (_, reply) => {
			replies.authorize = reply;

			const res = await getStart();

			expect(res.statusCode).toBe(400);
			expect(res.body).toContain('This return URL is not allowed');
			expect(res.body).not.toContain('<form');
			expect(callsTo('openCheck')).toHaveLength(0);
		});

		it.each([
			[
				'the captured error redirect',
				{ status: 303, body: {}, location: unknownClientLocation }
			],
			[
				'an error redirect to the unvalidated return URL',
				{
					status: 303,
					body: {},
					location: `${returnTo}?error=invalid_request&error_description=%5BE063308%5D+Requested+application+not+found`
				}
			],
			['a 4xx', { status: 400, body: { errorCode: 'E063308' } }]
		])(
			'answers Unknown agent for an unknown client on %s',
			async (_, reply) => {
				replies.authorize = reply;

				const res = await getStart();

				expect(res.statusCode).toBe(400);
				expect(res.body).toContain('Unknown agent');
				expect(res.body).not.toContain('<form');
			}
		);

		it.each([
			[
				'an error redirect to the unvalidated return URL',
				{
					status: 303,
					body: {},
					location: `${returnTo}?error=invalid_request&state=x`
				}
			],
			[
				'an error hidden in the fragment',
				{
					status: 303,
					body: {},
					location: 'https://evil.example.com/%zz#x?error=invalid_request'
				}
			],
			[
				'an error after another query parameter',
				{
					status: 303,
					body: {},
					location: `${returnTo}?state=x&error=invalid_request`
				}
			],
			[
				'an error in the fragment',
				{
					status: 303,
					body: {},
					location: 'https://approve.example.com/consent#error=invalid_request'
				}
			],
			['a redirect without a Location', { status: 303, body: {} }],
			['a 200', { status: 200, body: {} }],
			['a 408', { status: 408, body: {} }],
			['a 429', { status: 429, body: {} }],
			['a 5xx', { status: 503, body: {} }]
		])('returns 502 and does not cache %s', async (_, reply) => {
			replies.authorize = reply;

			const res = await getStart();
			replies.authorize = {
				status: 303,
				body: {},
				location: approvedLocation
			};
			const retry = await getStart();

			expect(res.statusCode).toBe(502);
			expect(res.body).toContain('Could not reach Descope');
			expectSecurityHeaders(res);
			expect(retry.statusCode).toBe(200);
			expect(callsTo('authorize')).toHaveLength(2);
		});

		it.each([
			['a URL that does not parse', 'not a url'],
			['a non-http URL', ['javascript', 'alert(1)'].join(':')]
		])('rejects %s without asking Descope', async (_, value) => {
			const res = await postStart({ return_to: value });

			expect(res.statusCode).toBe(400);
			expect(res.body).toContain('This return URL is not allowed');
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('checks and stores the normalized return URL', async () => {
			const res = await postStart({
				return_to: 'HTTPS://Shop.Example.com:443/descope/agent-callback'
			});

			expect(authorizeQuery().redirect_uri).toBe(returnTo);
			expect(decodeCookie(res).returnTo).toBe(returnTo);
		});

		it('checks again before bc-authorize', async () => {
			replies.authorize = notApprovedReply;

			const res = await postStart();

			expect(res.statusCode).toBe(400);
			expect(res.headers['Set-Cookie']).toBeUndefined();
			expect(callsTo('bcAuthorize')).toHaveLength(0);
		});

		it('caches the verdict for 60 seconds', async () => {
			jest.useFakeTimers();

			await getStart();
			await getStart();
			jest.advanceTimersByTime(60001);
			await getStart();

			expect(callsTo('authorize')).toHaveLength(2);
		});

		it('caches a rejection too', async () => {
			replies.authorize = notApprovedReply;

			await getStart();
			const res = await getStart();

			expect(res.statusCode).toBe(400);
			expect(callsTo('authorize')).toHaveLength(1);
		});

		it('caches per project, client ID and return URL', async () => {
			await getStart();
			await call({ url: `/approve/${otherPid}?${startQuery()}` });
			await getStart({ client_id: 'other-client' });
			await getStart({ return_to: 'https://shop.example.com/other' });
			await getStart();

			expect(callsTo('authorize')).toHaveLength(4);
		});

		it('starts over when 1000 verdicts are cached', async () => {
			const getFor = (index: number) =>
				getStart({ return_to: `https://shop.example.com/cb/${index}` });

			await Promise.all(
				Array.from({ length: 1000 }, (_, index) => getFor(index))
			);
			await getFor(1000);
			await getFor(0);

			expect(callsTo('authorize')).toHaveLength(1002);
		});
	});

	describe('start page', () => {
		it('renders the approval form with every value escaped', async () => {
			const res = await getStart({
				order: itemsOf({ name: "Socks & Co's", qty: 1 })
			});

			expect(res.statusCode).toBe(200);
			expectSecurityHeaders(res);
			expect(res.body).toContain('<h1>Approve an agent action</h1>');
			expect(res.body).toContain(
				'<p>An AI agent wants to: Order 1x Socks &amp; Co&#39;s. Total USD 282.00</p>'
			);
			expect(res.body).toContain(
				`<form method="post" action="/approve/${pid}">`
			);
			expect(res.body).toContain(
				`<input type="hidden" name="client_id" value="${clientId}">`
			);
			expect(res.body).toContain(
				`<input type="hidden" name="scope" value="${scope}">`
			);
			expect(res.body).toContain(
				`<input type="hidden" name="ref" value="${ref}">`
			);
			expect(res.body).toContain(
				'<input type="hidden" name="order" value="{&quot;total&quot;:&quot;282.00&quot;,' +
					'&quot;currency&quot;:&quot;USD&quot;,&quot;items&quot;:[{&quot;name&quot;:' +
					'&quot;Socks &amp; Co&#39;s&quot;,&quot;qty&quot;:1}]}">'
			);
			expect(res.body).toContain(
				`<input type="hidden" name="return_to" value="${returnTo}">`
			);
			expect(res.body).toContain(
				'<input id="login_id" name="login_id" type="email" required autocomplete="email">'
			);
			expect(res.body).toContain(
				'<button type="submit">Send approval request</button>'
			);
			expect(callsTo('bcAuthorize')).toHaveLength(0);
		});

		it('echoes the order rebuilt from the checked fields, not the raw text', async () => {
			const raw = `{ "items": [ { "qty": 2, "name": "Trail Runner" } ], "currency": "USD", "total": "1.50" }`;

			const res = await getStart({ order: raw });

			expect(res.statusCode).toBe(200);
			expect(res.body).toContain(
				'name="order" value="{&quot;total&quot;:&quot;1.50&quot;,&quot;currency&quot;:' +
					'&quot;USD&quot;,&quot;items&quot;:[{&quot;name&quot;:&quot;Trail Runner&quot;,' +
					'&quot;qty&quot;:2}]}"'
			);
		});

		it('returns 400 for a summary in place of the order', async () => {
			const query = new URLSearchParams(startQuery({ summary }));
			query.delete('order');

			const res = await call({ url: `/approve/${pid}?${query}` });

			expect(res.statusCode).toBe(400);
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('returns 400 for a repeated order', async () => {
			const res = await call({
				url: `/approve/${pid}?${startQuery()}&order=${encodeURIComponent(orderParam)}`
			});

			expect(res.statusCode).toBe(400);
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it.each([
			['an empty order', { order: '' }],
			['an order that is not JSON', { order: '{total:1}' }],
			['an order that is an array', { order: JSON.stringify([order]) }],
			['an order with an extra key', { order: orderWith({ note: 'x' }) }],
			[
				'an order with a type',
				{ order: orderWith({ type: 'payment_initiation' }) }
			],
			[
				'an order without items',
				{ order: JSON.stringify({ total: '1.00', currency: 'USD' }) }
			],
			[
				'an order over 4096 characters',
				{ order: `${orderParam}${' '.repeat(4096)}` }
			],
			['a numeric total', { order: orderWith({ total: 282 }) }],
			['a total with one decimal', { order: orderWith({ total: '282.0' }) }],
			['a total with no decimals', { order: orderWith({ total: '282' }) }],
			[
				'a total with three decimals',
				{ order: orderWith({ total: '282.000' }) }
			],
			['a negative total', { order: orderWith({ total: '-1.00' }) }],
			['a total with a leading zero', { order: orderWith({ total: '01.00' }) }],
			['a total with grouping', { order: orderWith({ total: '1,282.00' }) }],
			[
				'a total with 13 digits',
				{ order: orderWith({ total: '1234567890123.00' }) }
			],
			['a total in exponent form', { order: orderWith({ total: '1e3' }) }],
			[
				'decimals on a currency without minor units',
				{ order: orderWith({ total: '100.00', currency: 'JPY' }) }
			],
			['a lower-case currency', { order: orderWith({ currency: 'usd' }) }],
			['a currency symbol', { order: orderWith({ currency: '$' }) }],
			[
				'a code that is not ISO 4217',
				{ order: orderWith({ currency: 'ABC' }) }
			],
			['a numeric currency', { order: orderWith({ currency: 840 }) }],
			['empty items', { order: itemsOf() }],
			[
				'items as an object',
				{ order: orderWith({ items: { name: 'A', qty: 1 } }) }
			],
			[
				'11 items',
				{
					order: itemsOf(
						...Array.from({ length: 11 }, (_unused, index) => ({
							name: `Item ${index}`,
							qty: 1
						}))
					)
				}
			],
			[
				'an item with an extra key',
				{ order: itemsOf({ name: 'A', qty: 1, price: '1.00' }) }
			],
			['an item without qty', { order: itemsOf({ name: 'A' }) }],
			['a qty of 0', { order: itemsOf({ name: 'A', qty: 0 }) }],
			['a qty of 100', { order: itemsOf({ name: 'A', qty: 100 }) }],
			['a fractional qty', { order: itemsOf({ name: 'A', qty: 1.5 }) }],
			['a qty as a string', { order: itemsOf({ name: 'A', qty: '1' }) }],
			['an empty name', { order: itemsOf({ name: '', qty: 1 }) }],
			['a numeric name', { order: itemsOf({ name: 7, qty: 1 }) }],
			[
				'an 81 character name',
				{ order: itemsOf({ name: 'a'.repeat(81), qty: 1 }) }
			],
			[
				'a name with markup',
				{ order: itemsOf({ name: '<b>Socks</b>', qty: 1 }) }
			],
			[
				'a name with a double quote',
				{ order: itemsOf({ name: 'Socks "x"', qty: 1 }) }
			],
			[
				'a name with a semicolon',
				{ order: itemsOf({ name: 'Socks; Shoes', qty: 1 }) }
			],
			[
				'a name with a leading space',
				{ order: itemsOf({ name: ' Socks', qty: 1 }) }
			],
			[
				'a name with a double space',
				{ order: itemsOf({ name: 'Wool  Socks', qty: 1 }) }
			],
			[
				'a name with a newline',
				{ order: itemsOf({ name: 'Socks\nShoes', qty: 1 }) }
			],
			['a name with non-ASCII', { order: itemsOf({ name: 'Café', qty: 1 }) }],
			[
				'a name with a URL',
				{ order: itemsOf({ name: 'Refund at https://evil.example', qty: 1 }) }
			],
			[
				'a name with www.',
				{ order: itemsOf({ name: 'Visit WWW.evil.example', qty: 1 }) }
			]
		])('returns 400 for %s', async (_, overrides) => {
			const res = await getStart(overrides);

			expect(res.statusCode).toBe(400);
			expect(res.body).toContain('Invalid approval request');
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it.each([
			['a currency without minor units', { total: '15000', currency: 'JPY' }],
			[
				'a currency with three minor digits',
				{ total: '1.250', currency: 'BHD' }
			],
			['a zero total', { total: '0.00' }],
			['a 12 digit total', { total: '999999999999.99' }],
			[
				'10 items',
				{
					items: Array.from({ length: 10 }, (_unused, index) => ({
						name: `Item ${index}`,
						qty: 99
					}))
				}
			],
			[
				'an 80 character name with every allowed character',
				{
					items: [
						{
							name: "Az09 ,.&'()+/#%:!?- ".repeat(4).trimEnd().padEnd(80, 'x'),
							qty: 1
						}
					]
				}
			]
		])('accepts an order with %s', async (_, overrides) => {
			const res = await getStart({ order: orderWith(overrides) });

			expect(res.statusCode).toBe(200);
		});

		it.each([
			['a missing ref', { ref: '' }],
			['a short ref', { ref: 'a'.repeat(15) }],
			['a long ref', { ref: 'a'.repeat(129) }],
			['a ref with bad characters', { ref: `${'a'.repeat(20)}.=` }],
			['a missing client ID', { client_id: '' }],
			['a missing return URL', { return_to: '' }],
			['an empty scope', { scope: '' }],
			['a scope with a double space', { scope: 'orders:write  email' }],
			['a scope with a leading space', { scope: ' email' }],
			['a scope with a trailing space', { scope: 'email ' }],
			['a scope with a double quote', { scope: 'email "x"' }],
			['a scope with a backslash', { scope: 'email a\\b' }],
			['a scope with a tab', { scope: 'email\tprofile' }],
			['a scope with non-ASCII', { scope: 'emaïl' }],
			['11 scope tokens', { scope: 'a b c d e f g h i j k' }],
			['a 301 character scope', { scope: 'a'.repeat(301) }],
			['an empty resource', { resource: '' }],
			['a relative resource', { resource: '/orders' }],
			['a host-only resource', { resource: 'shop.example.com' }],
			['an ftp resource', { resource: 'ftp://shop.example.com/orders' }],
			['a javascript resource', { resource: ['javascript', 'x'].join(':') }],
			['a 1001 character resource', { resource: resourceOfLength(1001) }]
		])('returns 400 for %s', async (_, overrides) => {
			const res = await getStart(overrides);

			expect(res.statusCode).toBe(400);
			expect(res.body).toContain('Invalid approval request');
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it.each([
			['10 scope tokens', 'a b c d e f g h i j'],
			['a 300 character scope', 'a'.repeat(300)],
			['every scope-token character', '!#[]~ openid']
		])('accepts %s', async (_, value) => {
			const res = await getStart({ scope: value });

			expect(res.statusCode).toBe(200);
		});

		it.each(['ref', 'scope'])('returns 400 for a repeated %s', async (name) => {
			const res = await call({
				url: `/approve/${pid}?${startQuery()}&${name}=${encodeURIComponent(
					name === 'ref' ? ref : scope
				)}`
			});

			expect(res.statusCode).toBe(400);
		});

		it('returns 400 for a repeated resource', async () => {
			const res = await call({
				url: `/approve/${pid}?${startQuery({ resource })}&resource=${encodeURIComponent(resource)}`
			});

			expect(res.statusCode).toBe(400);
			expect(res.body).toContain('Invalid approval request');
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('echoes the resource verbatim and escaped after the other fields', async () => {
			const value = `${resource}/api?a=1&b=2`;

			const res = await getStart({ resource: value });

			expect(res.statusCode).toBe(200);
			expect(res.body).toContain(
				`<input type="hidden" name="return_to" value="${returnTo}">` +
					`<input type="hidden" name="resource" value="${resource}/api?a=1&amp;b=2">`
			);
		});

		it('accepts a 1000 character resource', async () => {
			const value = resourceOfLength(1000);

			const res = await getStart({ resource: value });

			expect(res.statusCode).toBe(200);
			expect(res.body).toContain(`name="resource" value="${value}"`);
		});

		it('renders no resource input when none is sent', async () => {
			const res = await getStart();

			expect(res.statusCode).toBe(200);
			expect(res.body).not.toContain('name="resource"');
		});
	});

	describe('start approval', () => {
		it('sends bc-authorize, sets the pending cookie and redirects to wait', async () => {
			const before = Date.now();

			const res = await postStart({ login_id: '  Alice@Example.COM ' });
			const after = Date.now();

			expect(res.statusCode).toBe(303);
			expect(res.headers.Location).toBe(`/approve/${pid}/wait`);
			expectSecurityHeaders(res);

			const pending = decodeCookie(res);
			expect(pending).toEqual({
				authReqId: 'test-auth-req-id',
				code: expect.stringMatching(/^\d{4}$/),
				clientId,
				ref,
				returnTo,
				interval: 7,
				expiresAt: expect.any(Number)
			});
			expect(pending.expiresAt).toBeGreaterThanOrEqual(before + 120000);
			expect(pending.expiresAt).toBeLessThanOrEqual(after + 120000);
			expect(cookieAttributes(res)).toEqual([
				`Path=/approve/${pid}`,
				'Max-Age=120',
				'HttpOnly',
				'SameSite=Lax'
			]);

			const [[url]] = callsTo('bcAuthorize');
			expect(url).toBe(
				'https://descope.example.com/oauth2/v1/apps/bc-authorize'
			);
			expect(sentForm('bcAuthorize')).toEqual({
				client_id: clientId,
				client_assertion_type:
					'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
				client_assertion: expect.any(String),
				login_hint: loginId,
				scope,
				binding_message: buildBindingMessage(summary, pending.code),
				authorization_details: expectedDetails
			});
			expect(sentForm('bcAuthorize').binding_message).toBe(
				`${summary}. Approve only if you asked for this. Code: ${pending.code}`
			);
		});

		it('sends the order as one RFC 9396 object of type order, bound to the ref', async () => {
			await postStart();

			expect(JSON.parse(sentForm('bcAuthorize').authorization_details)).toEqual(
				[
					{
						type: 'order',
						ref,
						total: '282.00',
						currency: 'USD',
						items: [
							{ name: 'Trail Runner', qty: 2 },
							{ name: 'Merino Socks', qty: 1 }
						]
					}
				]
			);
		});

		it.each([
			['a bad order', { order: orderWith({ total: '1' }) }],
			['a non-string order', { order }]
		])('returns 400 for %s before calling Descope', async (_, overrides) => {
			const res = await postStart(overrides);

			expect(res.statusCode).toBe(400);
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('returns 400 for a repeated order in a raw string body', async () => {
			const body = `${new URLSearchParams(startBody())}&order=${encodeURIComponent(orderParam)}`;

			const res = await call({ method: 'POST', url: `/approve/${pid}`, body });

			expect(res.statusCode).toBe(400);
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('forwards the resource to bc-authorize unchanged', async () => {
			const res = await postStart({ resource });

			expect(res.statusCode).toBe(303);
			const pending = decodeCookie(res);
			expect(sentForm('bcAuthorize')).toEqual({
				client_id: clientId,
				client_assertion_type:
					'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
				client_assertion: expect.any(String),
				login_hint: loginId,
				scope,
				binding_message: buildBindingMessage(summary, pending.code),
				authorization_details: expectedDetails,
				resource
			});
			expect(pending).not.toHaveProperty('resource');
		});

		it('sends no resource to bc-authorize when none is given', async () => {
			await postStart();

			expect(sentForm('bcAuthorize')).not.toHaveProperty('resource');
		});

		it('does not send the resource on the token poll', async () => {
			const started = await postStart({ resource });

			await getWait(cookiePair(started));

			expect(sentForm('token')).not.toHaveProperty('resource');
			expect(JSON.stringify(callsTo('token'))).not.toContain(
				encodeURIComponent(resource)
			);
		});

		it.each([
			['https', true],
			['https, http', true],
			['http, https', false]
		])(
			'sets Secure from the first x-forwarded-proto in %j',
			async (proto, secure) => {
				const res = await postStart({}, { 'x-forwarded-proto': proto });

				expect(cookieAttributes(res).includes('Secure')).toBe(secure);
			}
		);

		it('draws a four-digit code from 1000 to 9999', async () => {
			const randomInt = jest.spyOn(crypto, 'randomInt') as jest.SpyInstance;
			randomInt.mockReturnValue(4321);

			const res = await postStart();

			expect(randomInt).toHaveBeenCalledWith(1000, 10000);
			expect(decodeCookie(res).code).toBe('4321');
			expect(sentForm('bcAuthorize').binding_message).toBe(
				buildBindingMessage(summary, '4321')
			);
		});

		it('defaults the timing when bc-authorize omits it', async () => {
			replies.bcAuthorize = {
				status: 200,
				body: { auth_req_id: 'test-auth-req-id' }
			};

			const res = await postStart();

			expect(decodeCookie(res).interval).toBe(5);
			expect(cookieAttributes(res)).toContain('Max-Age=300');
		});

		it.each(['', 'alice', 'alice@example', `${'a'.repeat(250)}@example.com`])(
			'returns 400 for the login ID %j',
			async (value) => {
				const res = await postStart({ login_id: value });

				expect(res.statusCode).toBe(400);
				expect(mockFetch).not.toHaveBeenCalled();
			}
		);

		it.each([
			['a bad ref', { ref: 'short' }],
			['a bad scope', { scope: 'a  b' }],
			['a bad resource', { resource: '/orders' }]
		])('returns 400 for %s', async (_, overrides) => {
			const res = await postStart(overrides);

			expect(res.statusCode).toBe(400);
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it.each([
			['a raw string', new URLSearchParams(startBody()).toString()],
			['a buffer', Buffer.from(new URLSearchParams(startBody()).toString())]
		])('accepts %s body', async (_, body) => {
			const res = await call({ method: 'POST', url: `/approve/${pid}`, body });

			expect(res.statusCode).toBe(303);
			expect(sentForm('bcAuthorize').login_hint).toBe(loginId);
			expect(sentForm('bcAuthorize').scope).toBe(scope);
		});

		it.each([
			['a missing body', undefined],
			['a JSON array', [startBody()]],
			['a repeated field', startBody({ ref: [ref, ref] })],
			['a repeated resource', startBody({ resource: [resource, resource] })],
			['a non-string resource', startBody({ resource: 1 })],
			[
				'a repeated resource in a raw string',
				`${new URLSearchParams(startBody({ resource }))}&resource=${resource}`
			]
		])('returns 400 for %s', async (_, body) => {
			const res = await call({ method: 'POST', url: `/approve/${pid}`, body });

			expect(res.statusCode).toBe(400);
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('returns 400 when reading the body throws', async () => {
			const res = fakeResponse();
			const req = {
				method: 'POST',
				url: `/approve/${pid}`,
				headers: {},
				get body(): unknown {
					throw new Error('Invalid body');
				}
			};

			await handler(req, res);

			expect(res.statusCode).toBe(400);
		});

		it.each([
			['the captured untrusted key answer', untrustedKeyReply],
			[
				'an OAuth invalid_client error',
				{ status: 401, body: { error: 'invalid_client' } }
			]
		])(
			'returns 400 when the agent does not trust the key: %s',
			async (_, reply) => {
				replies.bcAuthorize = reply;

				const res = await postStart();

				expect(res.statusCode).toBe(400);
				expect(res.body).toContain('This agent is not set up for approvals');
				expect(res.headers['Set-Cookie']).toBeUndefined();
			}
		);

		it.each([
			['an error status', { status: 400, body: { error: 'invalid_request' } }],
			['a reply without auth_req_id', { status: 200, body: {} }],
			[
				'an invalid_client code on a success status',
				{ status: 200, body: { errorCode: 'E066009' } }
			],
			[
				'an oversized auth_req_id',
				{ status: 200, body: { auth_req_id: 'x'.repeat(1001) } }
			]
		])('returns 502 for %s', async (_, reply) => {
			replies.bcAuthorize = reply;

			const res = await postStart();

			expect(res.statusCode).toBe(502);
			expect(res.body).toContain('Could not send the approval request');
			expect(res.headers['Set-Cookie']).toBeUndefined();
		});

		it('returns 502 when bc-authorize is unreachable', async () => {
			failFetchFor('bcAuthorize', new TypeError('fetch failed'));

			const res = await postStart();

			expect(res.statusCode).toBe(502);
			expect(res.body).toContain('Could not send the approval request');
		});

		it('aborts a Descope call after 10 seconds', async () => {
			jest.useFakeTimers();
			mockFetch.mockImplementation(
				(_url: string, init: RequestInit) =>
					new Promise((_resolve, reject) => {
						init.signal?.addEventListener('abort', () => {
							reject(new Error('The operation was aborted.'));
						});
					})
			);

			const promise = getStart();
			const { signal } = mockFetch.mock.calls[0][1];
			jest.advanceTimersByTime(9999);
			expect(signal.aborted).toBe(false);
			jest.advanceTimersByTime(1);
			const res = await promise;

			expect(signal.aborted).toBe(true);
			expect(res.statusCode).toBe(502);
		});
	});

	describe('wait', () => {
		it.each([
			['no cookie', undefined],
			['a cookie that is not base64 JSON', 'agent_approval=%%%'],
			['an expired cookie', pendingCookie({ expiresAt: Date.now() - 1 })],
			['a cookie with a bad code', pendingCookie({ code: '12345' })],
			['a cookie with a bad ref', pendingCookie({ ref: 'short' })],
			['a cookie with a zero interval', pendingCookie({ interval: 0 })],
			[
				'a cookie with a long auth_req_id',
				pendingCookie({ authReqId: 'x'.repeat(1001) })
			]
		])('returns 400 for %s', async (_, cookie) => {
			const res = await getWait(cookie);

			expect(res.statusCode).toBe(400);
			expect(res.body).toContain('No pending approval');
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it.each([
			[
				'client ID',
				{ clientId: 'other-client' },
				{ status: 303, body: {}, location: unknownClientLocation },
				'Unknown agent'
			],
			[
				'return URL',
				{ returnTo: 'https://evil.example.com/cb' },
				notApprovedReply,
				'not allowed'
			]
		])('checks the cookie %s again', async (_, overrides, reply, message) => {
			replies.authorize = reply;
			const cookie: Record<string, unknown> = {
				clientId,
				returnTo,
				...overrides
			};

			const res = await getWait(pendingCookie(overrides));

			expect(res.statusCode).toBe(400);
			expect(res.body).toContain(message);
			expect(authorizeQuery()).toEqual(
				expect.objectContaining({
					client_id: cookie.clientId,
					redirect_uri: cookie.returnTo
				})
			);
			expect(callsTo('token')).toHaveLength(0);
		});

		it('shows the waiting page while the approval is pending', async () => {
			const res = await getWait(pendingCookie());

			expect(res.statusCode).toBe(200);
			expectSecurityHeaders(res);
			expect(sentForm('token')).toEqual({
				grant_type: 'urn:openid:params:grant-type:ciba',
				client_id: clientId,
				client_assertion_type:
					'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
				client_assertion: expect.any(String),
				auth_req_id: 'test-auth-req-id'
			});
			expect(res.body).toContain('Waiting for the customer to approve.');
			expect(res.body).toContain('<strong id="approval-code">1234</strong>');
			expect(res.body).toContain('<meta http-equiv="refresh" content="5">');
			expect(res.body).toContain(
				`<a href="/approve/${pid}/wait">Check again</a>`
			);
			expect(res.headers['Set-Cookie']).toBeUndefined();
		});

		it('slows down by 5 seconds and keeps the cookie expiry', async () => {
			replies.token = { status: 400, body: { error: 'slow_down' } };

			const res = await getWait(pendingCookie({ interval: 7 }));

			expect(res.statusCode).toBe(200);
			expect(res.body).toContain('<meta http-equiv="refresh" content="12">');
			expect(decodeCookie(res).interval).toBe(12);
			expect(cookieAttributes(res)).toEqual([
				`Path=/approve/${pid}`,
				'Max-Age=60',
				'HttpOnly',
				'SameSite=Lax'
			]);
		});

		it.each([
			['access_denied', { error: 'access_denied' }],
			['expired_token', { error: 'expired_token' }],
			['invalid_grant', { error: 'invalid_grant' }],
			['invalid_client', { error: 'invalid_client' }],
			['an unknown answer', {}]
		])('clears the cookie and returns 400 for %s', async (_, body) => {
			replies.token = { status: 400, body };

			const res = await getWait(pendingCookie());

			expect(res.statusCode).toBe(400);
			expect(res.body).toContain('denied or has expired');
			expect(res.headers['Set-Cookie']).toBe(
				`agent_approval=; Path=/approve/${pid}; Max-Age=0; HttpOnly; SameSite=Lax`
			);
		});

		it('hands the token back to the return URL on approval', async () => {
			replies.token = {
				status: 200,
				body: { access_token: accessToken, token_type: 'Bearer' }
			};

			const res = await getWait(pendingCookie());

			expect(res.statusCode).toBe(200);
			expectSecurityHeaders(res);
			expect(res.headers['Set-Cookie']).toContain('Max-Age=0');
			expect(res.body).toContain(
				`<form id="handback" method="post" action="${returnTo}">`
			);
			expect(res.body).toContain(
				`<input type="hidden" name="token" value="${accessToken}">`
			);
			expect(res.body).toContain(
				`<input type="hidden" name="ref" value="${ref}">`
			);
			expect(res.body).toContain('<button type="submit">Continue</button>');
			expect(res.body).toContain(
				"<script>document.getElementById('handback').submit();</script>"
			);
		});

		it('escapes the return URL in the hand-back form', async () => {
			const queryUrl = 'https://shop.example.com/cb?a=1&b="2"';
			replies.token = { status: 200, body: { access_token: accessToken } };

			const res = await getWait(
				pendingCookie({ returnTo: new URL(queryUrl).href })
			);

			expect(res.body).toContain(
				'action="https://shop.example.com/cb?a=1&amp;b=%222%22"'
			);
		});

		it('hands back to the normalized return URL', async () => {
			replies.token = { status: 200, body: { access_token: accessToken } };

			const res = await getWait(
				pendingCookie({
					returnTo: 'HTTPS://Shop.Example.com:443/descope/agent-callback'
				})
			);

			expect(res.body).toContain(`action="${returnTo}"`);
		});

		it('keeps the cookie when the token endpoint is unreachable', async () => {
			failFetchFor('token', new TypeError('fetch failed'));

			const res = await getWait(pendingCookie());

			expect(res.statusCode).toBe(502);
			expect(res.headers['Set-Cookie']).toBeUndefined();
		});

		it('keeps the cookie when the token endpoint fails with a 5xx', async () => {
			const implementation = mockFetch.getMockImplementation();
			mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
				if (endpointOf(url) !== 'token') return implementation?.(url, init);
				return {
					...fakeFetchResponse({ status: 503, body: {} }),
					json: async () => {
						throw new SyntaxError('Unexpected token <');
					}
				};
			});

			const res = await getWait(pendingCookie());

			expect(res.statusCode).toBe(502);
			expect(res.body).toContain('Could not reach Descope');
			expect(res.headers['Set-Cookie']).toBeUndefined();
		});

		it.each([
			['other cookies around it', `other=1; ${pendingCookie()}; z=2`],
			[
				'a similarly named cookie before it',
				`xagent_approval=garbage; ${pendingCookie()}`
			]
		])('finds the pending cookie among %s', async (_, cookie) => {
			const res = await getWait(cookie);

			expect(res.statusCode).toBe(200);
			expect(res.body).toContain('<strong id="approval-code">1234</strong>');
		});

		it('polls with the cookie the start route set', async () => {
			const started = await postStart();

			const res = await getWait(cookiePair(started));

			expect(res.statusCode).toBe(200);
			expect(res.body).toContain(
				`<strong id="approval-code">${decodeCookie(started).code}</strong>`
			);
			expect(sentForm('token').auth_req_id).toBe('test-auth-req-id');
		});
	});

	describe('logging', () => {
		const logged = (message: string) =>
			consoleError.mock.calls
				.filter(([first]) => first === message)
				.map(([, details]) => JSON.parse(details));

		it('logs a rejected callback check with fixed fields only', async () => {
			replies.authorize = notApprovedReply;

			await getStart();

			expect(logged('Descope call failed')).toEqual([
				{
					method: 'GET',
					path: `/oauth2/v1/apps/${pid}/authorize`,
					status: 401,
					errorCode: 'E061004'
				}
			]);
			expect(logged('Agent approval request failed')).toEqual([]);
		});

		it('does not log an approved callback check', async () => {
			await getStart();

			expect(consoleError).not.toHaveBeenCalled();
		});

		it.each([
			[
				'an error redirect',
				`${returnTo}?error=server_error&error_description=test-location-detail`,
				true
			],
			['a redirect without a Location', undefined, false]
		])(
			'logs %s from the callback URL check with fixed fields only',
			async (_, location, hasLocation) => {
				replies.authorize = { status: 303, body: {}, location };

				await getStart();

				const output = JSON.stringify(consoleError.mock.calls);
				expect(logged('Callback URL check gave no verdict')).toEqual([
					{ path: `/oauth2/v1/apps/${pid}/authorize`, status: 303, hasLocation }
				]);
				expect(output).not.toContain('server_error');
				expect(output).not.toContain('test-location-detail');
			}
		);

		it('does not log a failed callback check call twice', async () => {
			replies.authorize = { status: 503, body: {} };

			await getStart();

			expect(logged('Descope call failed')).toHaveLength(1);
			expect(logged('Callback URL check gave no verdict')).toEqual([]);
		});

		it('logs an open callback check answer that is not a rejection', async () => {
			replies.openCheck = { status: 429, body: {} };

			await getStart();

			expect(logged('Descope call failed')).toEqual([
				{
					method: 'GET',
					path: `/oauth2/v1/apps/${pid}/authorize`,
					status: 429
				}
			]);
		});

		it('logs a final token answer with its OAuth error', async () => {
			replies.token = { status: 400, body: { error: 'access_denied' } };

			await getWait(pendingCookie());

			expect(logged('Descope call failed')).toEqual([
				{
					method: 'POST',
					path: '/oauth2/v1/apps/token',
					status: 400,
					error: 'access_denied'
				}
			]);
		});

		it.each(['authorization_pending', 'slow_down'])(
			'does not log the polling answer %s',
			async (error) => {
				replies.token = { status: 400, body: { error } };

				const res = await getWait(pendingCookie());

				expect(res.statusCode).toBe(200);
				expect(consoleError).not.toHaveBeenCalled();
			}
		);

		it('logs the error name and cause code of an unreachable call', async () => {
			failFetchFor(
				'bcAuthorize',
				new TypeError('fetch failed', { cause: { code: 'ECONNREFUSED' } })
			);

			const res = await postStart();

			expect(res.statusCode).toBe(502);
			expect(res.body).toContain('Could not send the approval request');
			expect(logged('Agent approval request failed')).toEqual([
				{
					method: 'POST',
					wait: false,
					error: 'TypeError',
					code: 'ECONNREFUSED'
				}
			]);
		});

		it('never logs the signing key, assertions, tokens or the login ID', async () => {
			await postStart();
			const leaks = [
				signingPem,
				sentForm('bcAuthorize').client_assertion,
				accessToken,
				loginId,
				'test-auth-req-id'
			];
			const leakText = leaks.join(' ');
			mockFetch.mockImplementationOnce(async () => {
				throw new TypeError(`Invalid header value ${leakText}`);
			});
			await getStart({ return_to: 'https://shop.example.com/a' });
			replies.authorize = {
				status: 401,
				body: { errorCode: 'E061004', errorDescription: leakText }
			};
			await getStart({ return_to: 'https://shop.example.com/b' });
			replies.bcAuthorize = {
				status: 400,
				body: {
					error: 'invalid_request',
					error_description: leakText,
					errorDescription: leakText
				}
			};
			await postStart();
			replies.token = {
				status: 500,
				body: { error_description: leakText, access_token: accessToken }
			};
			await getWait(pendingCookie());

			const output = JSON.stringify(consoleError.mock.calls);
			expect(consoleError).toHaveBeenCalledTimes(5);
			leaks.forEach((leak) => expect(output).not.toContain(leak));
		});
	});

	describe('orderSummary and buildBindingMessage', () => {
		const suffix = '. Approve only if you asked for this. Code: 1234';
		const item = (index: number, qty = 1) => ({
			name: `Item ${index} ${'n'.repeat(30)}`,
			qty
		});
		const longest = (index: number) => ({
			name: `${index}${'w'.repeat(79)}`,
			qty: 99
		});

		it('lists every item with its quantity, then the total with the currency', () => {
			expect(orderSummary(order)).toBe(summary);
			expect(buildBindingMessage(summary, '1234')).toBe(`${summary}${suffix}`);
		});

		it.each([
			['a currency without minor units', '15000', 'JPY', 'JPY 15,000'],
			['grouping', '185000.00', 'USD', 'USD 185,000.00'],
			[
				'the largest total',
				'999999999999.999',
				'BHD',
				'BHD 999,999,999,999.999'
			],
			['a total under 1000', '45.00', 'USD', 'USD 45.00']
		])(
			'renders the total from the string with %s',
			(_, total, currency, text) => {
				expect(orderSummary({ ...order, total, currency })).toBe(
					`Order 2x Trail Runner; 1x Merino Socks. Total ${text}`
				);
			}
		);

		it('ends the item list with +N more instead of cutting an item', () => {
			const items = Array.from({ length: 10 }, (_unused, index) => item(index));
			const firstFour = [0, 1, 2, 3].map((index) => `1x ${item(index).name}`);

			const text = orderSummary({ ...order, items });

			expect(text).toBe(
				`Order ${firstFour.join('; ')} +6 more. Total USD 282.00`
			);
			expect(buildBindingMessage(text, '1234').length).toBeLessThanOrEqual(256);
			expect(
				`Order ${firstFour.join('; ')}; 1x ${item(4).name} +5 more. Total USD 282.00`
					.length + suffix.length
			).toBeGreaterThan(256);
		});

		it('keeps the first item and counts the rest for the largest order', () => {
			const items = Array.from({ length: 10 }, (_unused, index) =>
				longest(index)
			);

			const text = orderSummary({
				total: '999999999999.999',
				currency: 'BHD',
				items
			});

			expect(text).toBe(
				`Order 99x ${longest(0).name} +9 more. Total BHD 999,999,999,999.999`
			);
			expect(buildBindingMessage(text, '1234').length).toBeLessThanOrEqual(256);
		});

		it.each([
			['keeps both items when they fill 256 characters exactly', 0, false],
			['counts the second item when it is one character over', 1, true]
		])('%s', (_, extra, counted) => {
			const fixed = 'Order 1x A; 1x . Total USD 282.00'.length;
			const name = 'b'.repeat(256 - suffix.length - fixed + extra);
			const items = [
				{ name: 'A', qty: 1 },
				{ name, qty: 1 }
			];

			const message = buildBindingMessage(
				orderSummary({ ...order, items }),
				'1234'
			);

			expect(message).toBe(
				counted
					? `Order 1x A +1 more. Total USD 282.00${suffix}`
					: `Order 1x A; 1x ${name}. Total USD 282.00${suffix}`
			);
			expect(message.length).toBeLessThanOrEqual(256);
		});
	});
});
