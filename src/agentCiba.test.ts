import handler from '../api/agent-ciba';

type FakeResponse = {
	statusCode?: number;
	body?: unknown;
	headers: Record<string, string>;
	status: (code: number) => FakeResponse;
	setHeader: (name: string, value: string) => void;
	json: (body: unknown) => void;
};

const mockFetch = jest.fn() as jest.Mock & typeof fetch;
const originalFetch = global.fetch;

const projectId = 'P2Sn0gttY5sY4Zu6WDGAAEJ4VTrv';
const callbackUrl = 'https://shop.example.com/agent/callback';
const clientSecret = 'test-grok-client-secret';
const validConfig = {
	[projectId]: {
		callbackUrl,
		agents: {
			grok: { clientId: 'test-grok-client-id', clientSecret, scope: 'email' }
		}
	}
};

const fakeResponse = (): FakeResponse => {
	const res: FakeResponse = {
		headers: {},
		status: (code) => {
			res.statusCode = code;
			return res;
		},
		setHeader: (name, value) => {
			res.headers[name] = value;
		},
		json: (body) => {
			res.body = body;
		}
	};
	return res;
};

const call = async (body: unknown, method = 'POST') => {
	const res = fakeResponse();
	await handler({ method, body }, res);
	return res;
};

const descopeReplies = (status: number, body: unknown) => {
	mockFetch.mockResolvedValueOnce({
		ok: status >= 200 && status < 300,
		status,
		json: async () => body
	});
};

const sentRequest = () => {
	const [url, init] = mockFetch.mock.calls[0];
	return { url, form: Object.fromEntries(new URLSearchParams(init.body)) };
};

const startBody = (overrides: Record<string, unknown> = {}) => ({
	action: 'start',
	projectId,
	agent: 'grok',
	email: 'alice@example.com',
	...overrides
});

const pollBody = (overrides: Record<string, unknown> = {}) => ({
	action: 'poll',
	projectId,
	agent: 'grok',
	authReqId: 'test-auth-req-id',
	...overrides
});

describe('agent-ciba function', () => {
	const savedEnv = { ...process.env };

	beforeAll(() => {
		global.fetch = mockFetch;
	});

	afterAll(() => {
		global.fetch = originalFetch;
	});

	beforeEach(() => {
		process.env.AGENT_CIBA_CONFIG = JSON.stringify(validConfig);
		process.env.DESCOPE_BASE_URL = 'https://agent.auth.example.com/';
	});

	afterEach(() => {
		process.env = { ...savedEnv };
	});

	it('rejects non-POST methods', async () => {
		const res = await call(undefined, 'GET');

		expect(res.statusCode).toBe(405);
		expect(res.headers.Allow).toBe('POST');
		expect(res.headers['Cache-Control']).toBe('no-store');
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it.each([
		['a missing body', undefined],
		['an invalid project id', startBody({ projectId: 'Pnope' })],
		['an invalid agent name', startBody({ agent: 'grok bot' })],
		['a non-string agent', startBody({ agent: ['grok'] })]
	])('returns 400 for %s', async (_, body) => {
		const res = await call(body);

		expect(res.statusCode).toBe(400);
		expect(res.body).toEqual({ error: 'invalid_request' });
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it('returns 400 when reading the body throws', async () => {
		const res = fakeResponse();
		const req = {
			method: 'POST',
			get body(): unknown {
				throw new Error('Invalid JSON');
			}
		};

		await handler(req, res);

		expect(res.statusCode).toBe(400);
	});

	it.each([
		['an unconfigured project', 'P2Sn0gttY5sY4Zu6WDGAAEJ4VTrX', 'grok'],
		['an unconfigured agent', projectId, 'claude'],
		['an inherited property name', projectId, 'constructor'],
		['a prototype key', projectId, '__proto__']
	])('returns 404 for %s', async (_, project, agent) => {
		const res = await call(startBody({ projectId: project, agent }));

		expect(res.statusCode).toBe(404);
		expect(res.body).toEqual({ error: 'unknown_agent' });
	});

	it.each([
		['missing config', undefined],
		['config that is not JSON', '{nope'],
		['config that is not an object', '[]'],
		['a project that is not an object', JSON.stringify({ [projectId]: 'x' })],
		[
			'a non-https callback URL',
			JSON.stringify({
				[projectId]: { ...validConfig[projectId], callbackUrl: 'http://shop' }
			})
		],
		[
			'a callback URL that does not parse',
			JSON.stringify({
				[projectId]: { ...validConfig[projectId], callbackUrl: 'not a url' }
			})
		],
		[
			'agents that are not an object',
			JSON.stringify({ [projectId]: { callbackUrl, agents: [] } })
		],
		[
			'an agent without a secret',
			JSON.stringify({
				[projectId]: { callbackUrl, agents: { grok: { clientId: 'x' } } }
			})
		]
	])('returns 500 for %s', async (_, config) => {
		if (config === undefined) {
			delete process.env.AGENT_CIBA_CONFIG;
		} else {
			process.env.AGENT_CIBA_CONFIG = config;
		}

		const res = await call(startBody());

		expect(res.statusCode).toBe(500);
		expect(res.body).toEqual({ error: 'misconfigured' });
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it('returns 400 for an unknown action', async () => {
		const res = await call(startBody({ action: 'collect' }));

		expect(res.statusCode).toBe(400);
		expect(res.body).toEqual({ error: 'invalid_action' });
	});

	describe('start', () => {
		it('sends bc-authorize with the agent credentials and normalized email', async () => {
			descopeReplies(200, {
				auth_req_id: 'test-auth-req-id',
				interval: 5,
				expires_in: 300
			});

			const res = await call(startBody({ email: '  Alice@Example.COM ' }));

			expect(sentRequest()).toEqual({
				url: 'https://agent.auth.example.com/oauth2/v1/apps/bc-authorize',
				form: {
					client_id: 'test-grok-client-id',
					client_secret: clientSecret,
					login_hint: 'alice@example.com',
					scope: 'email'
				}
			});
			expect(mockFetch.mock.calls[0][1].headers['Content-Type']).toBe(
				'application/x-www-form-urlencoded'
			);
			expect(res.statusCode).toBe(200);
			expect(res.body).toEqual({
				authReqId: 'test-auth-req-id',
				interval: 5,
				expiresIn: 300
			});
		});

		it('uses the default Descope URL, omits an empty scope and defaults the interval', async () => {
			delete process.env.DESCOPE_BASE_URL;
			process.env.AGENT_CIBA_CONFIG = JSON.stringify({
				[projectId]: {
					callbackUrl: 'http://localhost:3000/agent/callback',
					agents: { grok: { clientId: 'test-id', clientSecret } }
				}
			});
			descopeReplies(200, { auth_req_id: 'test-auth-req-id' });

			const res = await call(startBody());

			const { url, form } = sentRequest();
			expect(url).toBe('https://api.descope.com/oauth2/v1/apps/bc-authorize');
			expect(form).not.toHaveProperty('scope');
			expect(res.body).toEqual({
				authReqId: 'test-auth-req-id',
				interval: 5,
				expiresIn: 0
			});
		});

		it.each(['', 'alice', 'alice@example', `${'a'.repeat(250)}@example.com`])(
			'returns 400 for invalid email %j',
			async (email) => {
				const res = await call(startBody({ email }));

				expect(res.statusCode).toBe(400);
				expect(res.body).toEqual({ error: 'invalid_email' });
				expect(mockFetch).not.toHaveBeenCalled();
			}
		);

		it('hides Descope error details', async () => {
			descopeReplies(400, {
				errorCode: 'E000000',
				errorDescription: 'internal detail'
			});

			const res = await call(startBody());

			expect(res.statusCode).toBe(502);
			expect(res.body).toEqual({ error: 'ciba_start_failed' });
		});

		it('handles a non-JSON Descope response', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => {
					throw new SyntaxError('Unexpected token');
				}
			});

			const res = await call(startBody());

			expect(res.statusCode).toBe(502);
			expect(res.body).toEqual({ error: 'ciba_start_failed' });
		});

		it('returns 502 when Descope is unreachable', async () => {
			mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'));

			const res = await call(startBody());

			expect(res.statusCode).toBe(502);
			expect(res.body).toEqual({ error: 'descope_unreachable' });
		});
	});

	describe('poll', () => {
		it('returns the access token and configured callback URL on approval', async () => {
			descopeReplies(200, {
				access_token: 'test-access-token',
				token_type: 'Bearer',
				refresh_token: 'test-refresh-token'
			});

			const res = await call(pollBody());

			expect(sentRequest()).toEqual({
				url: 'https://agent.auth.example.com/oauth2/v1/apps/token',
				form: {
					client_id: 'test-grok-client-id',
					client_secret: clientSecret,
					grant_type: 'urn:openid:params:grant-type:ciba',
					auth_req_id: 'test-auth-req-id'
				}
			});
			expect(res.statusCode).toBe(200);
			expect(res.body).toEqual({
				status: 'approved',
				accessToken: 'test-access-token',
				callbackUrl
			});
			expect(res.headers['Cache-Control']).toBe('no-store');
		});

		it.each([
			['authorization_pending', 'pending'],
			['slow_down', 'slow_down'],
			['access_denied', 'denied'],
			['expired_token', 'expired'],
			['invalid_grant', 'expired']
		])('maps %s to %s', async (error, status) => {
			descopeReplies(400, { error, description: 'detail' });

			const res = await call(pollBody());

			expect(res.statusCode).toBe(200);
			expect(res.body).toEqual({ status });
		});

		it.each([
			['an unknown OAuth error', 400, { error: 'invalid_client' }],
			['a Descope error body', 401, { errorCode: 'E011003' }],
			['an OK response without a token', 200, {}]
		])('returns 502 for %s', async (_, status, body) => {
			descopeReplies(status, body);

			const res = await call(pollBody());

			expect(res.statusCode).toBe(502);
			expect(res.body).toEqual({ error: 'ciba_poll_failed' });
		});

		it.each([
			['missing', undefined],
			['empty', ''],
			['too long', 'x'.repeat(1001)]
		])('returns 400 when authReqId is %s', async (_, authReqId) => {
			const res = await call(pollBody({ authReqId }));

			expect(res.statusCode).toBe(400);
			expect(res.body).toEqual({ error: 'invalid_request' });
			expect(mockFetch).not.toHaveBeenCalled();
		});
	});
});
