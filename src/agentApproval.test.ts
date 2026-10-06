/**
 * @jest-environment node
 */
import crypto from 'crypto';
import vercelConfig from '../vercel.json';
import { buildBindingMessage } from '../api/agent-approval';

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

type Reply = { status: number; body: unknown };

type Endpoint = 'apps' | 'secret' | 'bcAuthorize' | 'token';

const pid = 'P2Sn0gttY5sY4Zu6WDGAAEJ4VTrv';
const host = 'approve.example.com';
const managementKey = 'test-management-key';
const appId = 'TPA2Sn0gttY5sY4Zu6WDGAAEJ4VTrv';
const clientId = 'test-grok-client-id';
const clientSecret = 'test-grok-client-secret';
const returnTo = 'https://shop.example.com/descope/agent-callback';
const ref = 'test_ref-0123456789abcdefghijklmnopqrstuv';
const summary = 'Order 2x Trail Runner at Acme Shop. Total $129.00';
const loginId = 'alice@example.com';
const accessToken = 'test-access-token';

const mockFetch = jest.fn() as jest.Mock & typeof fetch;
const originalFetch = global.fetch;

let handler: Handler;
let replies: Record<Endpoint, Reply>;
let consoleError: jest.SpyInstance;

const agentApp = (overrides: Record<string, unknown> = {}) => ({
	id: appId,
	name: 'Grok <Agent>',
	clientId,
	approvedCallbackUrls: [returnTo],
	permissionsScopes: [{ name: 'orders:write' }, { name: 'email' }],
	scopeClaimMapping: [{ scope: 'email' }, { scope: 'profile' }],
	cibaSettings: {
		enabled: true,
		loginPageURL: `https://${host}/approve/${pid}`
	},
	...overrides
});

const endpointOf = (url: string): Endpoint | undefined => {
	if (url.endsWith('/v2/mgmt/thirdparty/apps/load')) return 'apps';
	if (url.includes('/v1/mgmt/thirdparty/app/secret?')) return 'secret';
	if (url.endsWith('/oauth2/v1/apps/bc-authorize')) return 'bcAuthorize';
	if (url.endsWith('/oauth2/v1/apps/token')) return 'token';
	return undefined;
};

const callsTo = (endpoint: Endpoint) =>
	mockFetch.mock.calls.filter(([url]) => endpointOf(String(url)) === endpoint);

const sentForm = (endpoint: Endpoint, index = 0) =>
	Object.fromEntries(new URLSearchParams(callsTo(endpoint)[index][1].body));

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

const call = async ({ headers, ...req }: FakeRequest) => {
	const res = fakeResponse();
	await handler({ method: 'GET', ...req, headers: { host, ...headers } }, res);
	return res;
};

const startQuery = (overrides: Record<string, string> = {}) =>
	new URLSearchParams({
		client_id: clientId,
		ref,
		summary,
		return_to: returnTo,
		...overrides
	}).toString();

const getStart = (overrides: Record<string, string> = {}) =>
	call({ url: `/approve/${pid}?${startQuery(overrides)}` });

const startBody = (overrides: Record<string, unknown> = {}) => ({
	client_id: clientId,
	ref,
	summary,
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

const expectNoSecretRequest = () => {
	expect(callsTo('secret')).toHaveLength(0);
	expect(callsTo('bcAuthorize')).toHaveLength(0);
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
		process.env.AGENT_APPROVAL_MANAGEMENT_KEYS = JSON.stringify({
			[pid]: managementKey
		});
		process.env.DESCOPE_BASE_URL = 'https://descope.example.com/';
		replies = {
			apps: { status: 200, body: { apps: [agentApp()], total: 1 } },
			secret: { status: 200, body: { cleartext: clientSecret } },
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
			const { status, body } = replies[endpoint];
			return {
				ok: status >= 200 && status < 300,
				status,
				json: async () => body
			};
		});
	});

	afterEach(() => {
		jest.useRealTimers();
		jest.restoreAllMocks();
		process.env = { ...savedEnv };
	});

	describe('routing', () => {
		it.each(['P2Sn0gttY5sY4Zu6WDGAAEJ4VTrX', 'constructor', 'toString'])(
			'returns 404 for the unknown project %s',
			async (unknownPid) => {
				const res = await call({
					url: `/approve/${unknownPid}?${startQuery()}`
				});

				expect(res.statusCode).toBe(404);
				expectSecurityHeaders(res);
				expect(mockFetch).not.toHaveBeenCalled();
			}
		);

		it.each([
			'/',
			'/approve',
			`/approve/${pid}/other`,
			`/approve/__proto__`,
			'/api/agent-approval',
			'/api/agent-approval?path=/login',
			'//['
		])('returns 404 for %s', async (url) => {
			const res = await call({ url });

			expect(res.statusCode).toBe(404);
			expect(mockFetch).not.toHaveBeenCalled();
		});

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

		it.each([
			['missing', undefined],
			['not JSON', '{nope'],
			['not an object', '[]'],
			['a non-string key', JSON.stringify({ [pid]: 42 })]
		])('returns 500 when the keys env var is %s', async (_, value) => {
			if (value === undefined) {
				delete process.env.AGENT_APPROVAL_MANAGEMENT_KEYS;
			} else {
				process.env.AGENT_APPROVAL_MANAGEMENT_KEYS = value;
			}

			const res = await getStart();

			expect(res.statusCode).toBe(500);
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
	});

	describe('gate', () => {
		it('loads the apps with the project management key', async () => {
			await getStart();

			const [[url, init]] = callsTo('apps');
			expect(url).toBe(
				'https://descope.example.com/v2/mgmt/thirdparty/apps/load'
			);
			expect(init.method).toBe('POST');
			expect(init.body).toBe('{}');
			expect(init.headers.Authorization).toBe(`Bearer ${pid}:${managementKey}`);
		});

		it.each([
			['the client ID is not found', agentApp({ clientId: 'other-client' })],
			[
				'CIBA is disabled',
				agentApp({
					cibaSettings: {
						enabled: false,
						loginPageURL: `https://${host}/approve/${pid}`
					}
				})
			],
			['CIBA settings are missing', agentApp({ cibaSettings: undefined })],
			[
				'the login page host differs',
				agentApp({
					cibaSettings: {
						enabled: true,
						loginPageURL: `https://other.example.com/approve/${pid}`
					}
				})
			],
			[
				'the login page port differs',
				agentApp({
					cibaSettings: {
						enabled: true,
						loginPageURL: `https://${host}:8443/approve/${pid}`
					}
				})
			],
			[
				'the login page URL does not parse',
				agentApp({ cibaSettings: { enabled: true, loginPageURL: 'nope' } })
			]
		])('rejects before any secret request when %s', async (_, app) => {
			replies.apps = { status: 200, body: { apps: [app] } };

			const res = await postStart();

			expect(res.statusCode).toBe(400);
			expect(res.body).toContain('Unknown agent');
			expect(res.headers['Set-Cookie']).toBeUndefined();
			expectNoSecretRequest();
		});

		it('gates the start page too', async () => {
			const res = await getStart({ client_id: 'other-client' });

			expect(res.statusCode).toBe(400);
			expect(res.body).toContain('Unknown agent');
			expect(res.body).not.toContain('<form');
		});

		it('rejects a request without a Host header', async () => {
			const res = fakeResponse();

			await handler(
				{
					method: 'POST',
					url: `/approve/${pid}`,
					headers: {},
					body: startBody()
				},
				res
			);

			expect(res.statusCode).toBe(400);
			expectNoSecretRequest();
		});

		it('compares the Host header case-insensitively', async () => {
			const res = await call({
				url: `/approve/${pid}?${startQuery()}`,
				headers: { host: 'Approve.Example.COM' }
			});

			expect(res.statusCode).toBe(200);
		});

		it.each([
			['a URL not in approvedCallbackUrls', 'https://evil.example.com/cb'],
			['a URL that does not parse', 'not a url']
		])('returns 400 for %s', async (_, value) => {
			const res = await postStart({ return_to: value });

			expect(res.statusCode).toBe(400);
			expect(res.body).toContain('This return URL is not allowed');
			expectNoSecretRequest();
		});

		it('rejects a non-http return URL even when it is approved', async () => {
			const scriptUrl = ['javascript', 'alert(1)'].join(':');
			replies.apps = {
				status: 200,
				body: { apps: [agentApp({ approvedCallbackUrls: [scriptUrl] })] }
			};

			const res = await postStart({ return_to: scriptUrl });

			expect(res.statusCode).toBe(400);
			expectNoSecretRequest();
		});

		it('matches return URLs after normalizing both sides', async () => {
			replies.apps = {
				status: 200,
				body: {
					apps: [
						agentApp({
							approvedCallbackUrls: [
								'HTTPS://Shop.Example.com:443/descope/agent-callback'
							]
						})
					]
				}
			};

			const res = await getStart();

			expect(res.statusCode).toBe(200);
		});

		it.each([
			['an error status', { status: 401, body: { errorCode: 'E011003' } }],
			['a body without apps', { status: 200, body: {} }]
		])('returns 502 and does not cache %s', async (_, reply) => {
			replies.apps = reply;

			const res = await getStart();
			replies.apps = { status: 200, body: { apps: [agentApp()] } };
			const retry = await getStart();

			expect(res.statusCode).toBe(502);
			expectSecurityHeaders(res);
			expect(retry.statusCode).toBe(200);
			expect(callsTo('apps')).toHaveLength(2);
		});

		it('caches the apps for 60 seconds per project', async () => {
			jest.useFakeTimers();

			await getStart();
			await getStart();
			jest.advanceTimersByTime(60001);
			await getStart();

			expect(callsTo('apps')).toHaveLength(2);
		});

		describe('with two projects', () => {
			const otherPid = 'P3Sn0gttY5sY4Zu6WDGAAEJ4VTrv';
			const otherKey = 'test-other-management-key';
			const otherClientId = 'test-other-client-id';
			const otherSecret = 'test-other-client-secret';

			beforeEach(() => {
				process.env.AGENT_APPROVAL_MANAGEMENT_KEYS = JSON.stringify({
					[pid]: managementKey,
					[otherPid]: otherKey
				});
				const implementation = mockFetch.getMockImplementation();
				mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
					const headers = (init.headers ?? {}) as Record<string, string>;
					if (headers.Authorization !== `Bearer ${otherPid}:${otherKey}`) {
						return implementation?.(url, init);
					}
					const body =
						endpointOf(url) === 'apps'
							? { apps: [agentApp({ clientId: otherClientId })] }
							: { cleartext: otherSecret };
					return { ok: true, status: 200, json: async () => body };
				});
			});

			it('loads and caches the apps per project', async () => {
				const first = await getStart();
				const crossed = await call({
					url: `/approve/${otherPid}?${startQuery()}`
				});
				const own = await call({
					url: `/approve/${otherPid}?${startQuery({ client_id: otherClientId })}`
				});

				expect(first.statusCode).toBe(200);
				expect(crossed.statusCode).toBe(400);
				expect(crossed.body).toContain('Unknown agent');
				expect(own.statusCode).toBe(200);
				expect(
					callsTo('apps').map(([, init]) => init.headers.Authorization)
				).toEqual([
					`Bearer ${pid}:${managementKey}`,
					`Bearer ${otherPid}:${otherKey}`
				]);
			});

			it('caches the app secret per project', async () => {
				await postStart();
				const res = await call({
					method: 'POST',
					url: `/approve/${otherPid}`,
					body: startBody({ client_id: otherClientId })
				});

				expect(res.statusCode).toBe(303);
				expect(callsTo('secret')).toHaveLength(2);
				expect(sentForm('bcAuthorize', 0).client_secret).toBe(clientSecret);
				expect(sentForm('bcAuthorize', 1).client_secret).toBe(otherSecret);
			});
		});
	});

	describe('start page', () => {
		it('renders the approval form with every value escaped', async () => {
			const res = await getStart({ summary: '<script>alert(1)</script>' });

			expect(res.statusCode).toBe(200);
			expectSecurityHeaders(res);
			expect(res.body).toContain('<h1>Approve an agent action</h1>');
			expect(res.body).toContain(
				'<strong>Grok &lt;Agent&gt;</strong> wants to: &lt;script&gt;alert(1)&lt;/script&gt;'
			);
			expect(res.body).not.toContain('<script>alert');
			expect(res.body).toContain(
				`<form method="post" action="/approve/${pid}">`
			);
			expect(res.body).toContain(
				`<input type="hidden" name="client_id" value="${clientId}">`
			);
			expect(res.body).toContain(
				`<input type="hidden" name="ref" value="${ref}">`
			);
			expect(res.body).toContain(
				'<input type="hidden" name="summary" value="&lt;script&gt;alert(1)&lt;/script&gt;">'
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
			expectNoSecretRequest();
		});

		it.each([
			[
				'double quotes',
				'" onfocus="alert(1)" x="',
				'&quot; onfocus=&quot;alert(1)&quot; x=&quot;'
			],
			[
				'apostrophes',
				"' onfocus='alert(1)' x='",
				'&#39; onfocus=&#39;alert(1)&#39; x=&#39;'
			]
		])('escapes %s in the summary attribute', async (_, value, escaped) => {
			const res = await getStart({ summary: value });

			expect(res.statusCode).toBe(200);
			expect(res.body).toContain(
				`<input type="hidden" name="summary" value="${escaped}">`
			);
			expect(res.body).toContain(`wants to: ${escaped}</p>`);
		});

		it.each([
			['a missing ref', { ref: '' }],
			['a short ref', { ref: 'a'.repeat(15) }],
			['a long ref', { ref: 'a'.repeat(129) }],
			['a ref with bad characters', { ref: `${'a'.repeat(20)}.=` }],
			['a missing client ID', { client_id: '' }],
			['a missing return URL', { return_to: '' }]
		])('returns 400 for %s', async (_, overrides) => {
			const res = await getStart(overrides);

			expect(res.statusCode).toBe(400);
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('returns 400 for a repeated ref', async () => {
			const res = await call({
				url: `/approve/${pid}?${startQuery()}&ref=${ref}`
			});

			expect(res.statusCode).toBe(400);
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

			const [[secretUrl, secretInit]] = callsTo('secret');
			expect(secretUrl).toBe(
				`https://descope.example.com/v1/mgmt/thirdparty/app/secret?id=${appId}`
			);
			expect(secretInit.method).toBe('GET');
			expect(secretInit.headers.Authorization).toBe(
				`Bearer ${pid}:${managementKey}`
			);
			expect(sentForm('bcAuthorize')).toEqual({
				client_id: clientId,
				client_secret: clientSecret,
				login_hint: loginId,
				scope: 'orders:write email profile',
				binding_message: buildBindingMessage(summary, pending.code)
			});
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

		it('omits the scope when the app has none and defaults the timing', async () => {
			replies.apps = {
				status: 200,
				body: {
					apps: [
						agentApp({ permissionsScopes: [], scopeClaimMapping: undefined })
					]
				}
			};
			replies.bcAuthorize = {
				status: 200,
				body: { auth_req_id: 'test-auth-req-id' }
			};

			const res = await postStart();

			expect(sentForm('bcAuthorize')).not.toHaveProperty('scope');
			expect(decodeCookie(res).interval).toBe(5);
			expect(cookieAttributes(res)).toContain('Max-Age=300');
		});

		it.each(['', 'alice', 'alice@example', `${'a'.repeat(250)}@example.com`])(
			'returns 400 for the login ID %j',
			async (value) => {
				const res = await postStart({ login_id: value });

				expect(res.statusCode).toBe(400);
				expectNoSecretRequest();
			}
		);

		it('returns 400 for a bad ref', async () => {
			const res = await postStart({ ref: 'short' });

			expect(res.statusCode).toBe(400);
			expectNoSecretRequest();
		});

		it.each([
			['a raw string', new URLSearchParams(startBody()).toString()],
			['a buffer', Buffer.from(new URLSearchParams(startBody()).toString())]
		])('accepts %s body', async (_, body) => {
			const res = await call({ method: 'POST', url: `/approve/${pid}`, body });

			expect(res.statusCode).toBe(303);
			expect(sentForm('bcAuthorize').login_hint).toBe(loginId);
		});

		it.each([
			['a missing body', undefined],
			['a JSON array', [startBody()]],
			['a repeated field', startBody({ ref: [ref, ref] })]
		])('returns 400 for %s', async (_, body) => {
			const res = await call({ method: 'POST', url: `/approve/${pid}`, body });

			expect(res.statusCode).toBe(400);
			expectNoSecretRequest();
		});

		it('returns 400 when reading the body throws', async () => {
			const res = fakeResponse();
			const req = {
				method: 'POST',
				url: `/approve/${pid}`,
				headers: { host },
				get body(): unknown {
					throw new Error('Invalid body');
				}
			};

			await handler(req, res);

			expect(res.statusCode).toBe(400);
		});

		it.each([
			['an error status', { status: 400, body: { error: 'invalid_request' } }],
			['a reply without auth_req_id', { status: 200, body: {} }],
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
			const implementation = mockFetch.getMockImplementation();
			mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
				if (endpointOf(url) === 'bcAuthorize')
					throw new TypeError('fetch failed');
				return implementation?.(url, init);
			});

			const res = await postStart();

			expect(res.statusCode).toBe(502);
			expect(res.body).toContain('Could not send the approval request');
		});

		it('returns 502 without calling bc-authorize when the secret load fails', async () => {
			replies.secret = { status: 404, body: { errorCode: 'E000000' } };

			const res = await postStart();

			expect(res.statusCode).toBe(502);
			expect(res.body).toContain('Could not send the approval request');
			expect(callsTo('bcAuthorize')).toHaveLength(0);
		});

		it('caches the app secret for 5 minutes', async () => {
			jest.useFakeTimers();

			await postStart();
			await postStart();
			expect(callsTo('secret')).toHaveLength(1);
			expect(callsTo('bcAuthorize')).toHaveLength(2);
			expect(callsTo('apps')).toHaveLength(1);

			jest.advanceTimersByTime(5 * 60 * 1000 + 1);
			await postStart();

			expect(callsTo('secret')).toHaveLength(2);
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
			['client ID', { clientId: 'other-client' }, 'Unknown agent'],
			['return URL', { returnTo: 'https://evil.example.com/cb' }, 'not allowed']
		])('gates the cookie %s again', async (_, overrides, message) => {
			const res = await getWait(pendingCookie(overrides));

			expect(res.statusCode).toBe(400);
			expect(res.body).toContain(message);
			expect(callsTo('secret')).toHaveLength(0);
			expect(callsTo('token')).toHaveLength(0);
		});

		it('shows the waiting page while the approval is pending', async () => {
			const res = await getWait(pendingCookie());

			expect(res.statusCode).toBe(200);
			expectSecurityHeaders(res);
			expect(sentForm('token')).toEqual({
				grant_type: 'urn:openid:params:grant-type:ciba',
				client_id: clientId,
				client_secret: clientSecret,
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
			replies.apps = {
				status: 200,
				body: { apps: [agentApp({ approvedCallbackUrls: [queryUrl] })] }
			};
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
			const implementation = mockFetch.getMockImplementation();
			mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
				if (endpointOf(url) === 'token') throw new TypeError('fetch failed');
				return implementation?.(url, init);
			});

			const res = await getWait(pendingCookie());

			expect(res.statusCode).toBe(502);
			expect(res.headers['Set-Cookie']).toBeUndefined();
		});

		it('keeps the cookie when the token endpoint fails with a 5xx', async () => {
			const implementation = mockFetch.getMockImplementation();
			mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
				if (endpointOf(url) !== 'token') return implementation?.(url, init);
				return {
					ok: false,
					status: 503,
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
			expect(callsTo('secret')).toHaveLength(1);
		});
	});

	describe('logging', () => {
		const logged = (message: string) =>
			consoleError.mock.calls
				.filter(([first]) => first === message)
				.map(([, details]) => JSON.parse(details));

		it('logs a failed Descope call with fixed fields only', async () => {
			replies.apps = {
				status: 401,
				body: { errorCode: 'E011003', errorDescription: 'Invalid key' }
			};

			await getStart();

			expect(logged('Descope call failed')).toEqual([
				{
					method: 'POST',
					path: '/v2/mgmt/thirdparty/apps/load',
					status: 401,
					errorCode: 'E011003'
				}
			]);
			expect(logged('Agent approval request failed')).toEqual([
				{ method: 'GET', wait: false, error: 'Error' }
			]);
		});

		it('logs the secret path without its query', async () => {
			replies.secret = { status: 404, body: { errorCode: 'E000000' } };

			await postStart();

			expect(logged('Descope call failed')).toEqual([
				{
					method: 'GET',
					path: '/v1/mgmt/thirdparty/app/secret',
					status: 404,
					errorCode: 'E000000'
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
			const implementation = mockFetch.getMockImplementation();
			mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
				if (endpointOf(url) !== 'bcAuthorize')
					return implementation?.(url, init);
				throw new TypeError('fetch failed', {
					cause: { code: 'ECONNREFUSED' }
				});
			});

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

		it('never logs keys, secrets, tokens or the login ID', async () => {
			const leaks = [
				managementKey,
				clientSecret,
				accessToken,
				loginId,
				'test-auth-req-id'
			];
			const implementation = mockFetch.getMockImplementation();
			mockFetch.mockImplementationOnce(async () => {
				throw new TypeError(`Invalid header value Bearer ${managementKey}`);
			});
			await getStart();
			mockFetch.mockImplementation(implementation);
			replies.bcAuthorize = {
				status: 400,
				body: {
					error: 'invalid_request',
					error_description: leaks.join(' '),
					errorDescription: leaks.join(' ')
				}
			};
			await postStart();
			replies.token = {
				status: 500,
				body: { error_description: leaks.join(' '), access_token: accessToken }
			};
			await getWait(pendingCookie());

			const output = JSON.stringify(consoleError.mock.calls);
			expect(consoleError).toHaveBeenCalledTimes(4);
			leaks.forEach((leak) => expect(output).not.toContain(leak));
		});
	});

	describe('buildBindingMessage', () => {
		const suffix = '. Approve only if you asked for this. Code: 1234';

		it('appends the warning and the code', () => {
			expect(buildBindingMessage(summary, '1234')).toBe(`${summary}${suffix}`);
		});

		it('keeps a summary that exactly fits 256 characters', () => {
			const fitting = 'a'.repeat(256 - suffix.length);

			expect(buildBindingMessage(fitting, '1234')).toBe(`${fitting}${suffix}`);
		});

		it('truncates a long summary to 256 characters', () => {
			const message = buildBindingMessage(`${'a'.repeat(300)} end`, '1234');

			expect(message).toHaveLength(256);
			expect(message.endsWith(`...${suffix}`)).toBe(true);
		});

		it('drops URL-like substrings', () => {
			expect(
				buildBindingMessage(
					'Buy https://evil.example/x?y=1 now at www.evil.example or HTTP://a.b today',
					'1234'
				)
			).toBe(`Buy now at or today${suffix}`);
		});

		it.each([
			[
				'a zero-width space in the scheme',
				'Pay at http\u200b://evil.example/x now'
			],
			[
				'a soft hyphen in the scheme',
				'Pay at ht\u00adtps://evil.example/x now'
			],
			[
				'a word joiner after the scheme',
				'Pay at https://\u2060evil.example/x now'
			],
			['a zero-width space in www', 'Pay at ww\u200bw.evil.example now'],
			['a soft hyphen after www', 'Pay at www.\u00adevil.example now'],
			[
				'a no-break space after the scheme',
				'Pay at https://\u00a0evil.example now'
			],
			['a space after the scheme', 'Pay at https:// evil.example/x now'],
			['a no-break space after www', 'Pay at www.\u00a0evil.example now']
		])('drops a URL hidden with %s', (_, value) => {
			expect(buildBindingMessage(value, '1234')).toBe(`Pay at now${suffix}`);
		});

		it('keeps printable ASCII only and collapses whitespace', () => {
			expect(
				buildBindingMessage('Café ☕ order\n\tfor\u0000 you ', '1234')
			).toBe(`Caf order for you${suffix}`);
		});

		it.each(['', '   ', 'https://evil.example', '☕☕'])(
			'falls back for the empty summary %j',
			(value) => {
				expect(buildBindingMessage(value, '1234')).toBe(
					`An AI agent wants to act for you${suffix}`
				);
			}
		);
	});
});
