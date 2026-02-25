import { next } from '@vercel/functions';
import middleware, { config } from '../middleware';

jest.mock('@vercel/functions', () => ({
	next: jest.fn()
}));

const mockedNext = next as jest.MockedFunction<typeof next>;
const mockFetch = jest.fn() as jest.Mock & typeof fetch;
const originalFetch = global.fetch;

beforeAll(() => {
	global.fetch = mockFetch;
});

afterAll(() => {
	global.fetch = originalFetch;
});

const fakeRequest = (url: string): Request => ({ url }) as unknown as Request;

const expectHeaders = (expectedHeaders: Record<string, string>) => {
	expect(mockedNext).toHaveBeenCalledWith({
		headers: expectedHeaders
	});
};

const expectXFrameOptions = () => {
	expectHeaders({
		'x-descope-middleware': 'noProject',
		'X-Frame-Options': 'SAMEORIGIN'
	});
};

const expectFetchCalledWith = (configUrl: string) => {
	expect(mockFetch).toHaveBeenCalledWith(
		configUrl,
		expect.objectContaining({ signal: expect.any(AbortSignal) })
	);
};

describe('middleware', () => {
	const originalEnv = process.env.MIDDLEWARE_DESCOPE_BASE_URL;

	beforeEach(() => {
		jest.clearAllMocks();
	});

	afterEach(() => {
		jest.useRealTimers();
		if (originalEnv !== undefined) {
			process.env.MIDDLEWARE_DESCOPE_BASE_URL = originalEnv;
		} else {
			delete process.env.MIDDLEWARE_DESCOPE_BASE_URL;
		}
	});

	describe('when no project ID is in the URL', () => {
		beforeEach(() => {
			process.env.MIDDLEWARE_DESCOPE_BASE_URL = 'https://api.descope.com';
		});

		it('adds X-Frame-Options for root path', async () => {
			await middleware(fakeRequest('https://example.com/'));
			expect(mockFetch).not.toHaveBeenCalled();
			expectXFrameOptions();
		});

		it('adds X-Frame-Options for non-project path segments', async () => {
			await middleware(fakeRequest('https://example.com/login/error'));
			expect(mockFetch).not.toHaveBeenCalled();
			expectXFrameOptions();
		});

		it('adds X-Frame-Options for invalid project ID format', async () => {
			await middleware(fakeRequest('https://example.com/login/notAProjectId'));
			expect(mockFetch).not.toHaveBeenCalled();
			expectXFrameOptions();
		});

		it('adds X-Frame-Options for project ID with wrong length', async () => {
			// P + 26 chars (too short)
			const shortId = `P${'a'.repeat(26)}`;
			await middleware(fakeRequest(`https://example.com/login/${shortId}`));
			expect(mockFetch).not.toHaveBeenCalled();
			expectXFrameOptions();
		});
	});

	describe('when a valid project ID is in the URL', () => {
		const projectId28 = `P${'a'.repeat(27)}`;
		const projectId32 = `P${'b'.repeat(31)}`;
		const baseUrl = 'https://api.descope.com';

		beforeEach(() => {
			process.env.MIDDLEWARE_DESCOPE_BASE_URL = baseUrl;
		});

		it('omits X-Frame-Options when embedding is allowed (28-char ID)', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ allowAuthHostingIframeEmbedding: true })
			});
			await middleware(fakeRequest(`https://example.com/login/${projectId28}`));
			expectFetchCalledWith(
				`${baseUrl}/.well-known/project-configuration/${projectId28}`
			);
			expectHeaders({ 'x-descope-middleware': 'iframeEnabled' });
		});

		it('omits X-Frame-Options when embedding is allowed (32-char ID)', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ allowAuthHostingIframeEmbedding: true })
			});
			await middleware(fakeRequest(`https://example.com/login/${projectId32}`));
			expectFetchCalledWith(
				`${baseUrl}/.well-known/project-configuration/${projectId32}`
			);
			expectHeaders({ 'x-descope-middleware': 'iframeEnabled' });
		});

		it('adds X-Frame-Options when allowAuthHostingIframeEmbedding is false', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ allowAuthHostingIframeEmbedding: false })
			});
			await middleware(fakeRequest(`https://example.com/login/${projectId28}`));
			expectHeaders({
				'x-descope-middleware': 'iframeDisabled',
				'X-Frame-Options': 'SAMEORIGIN'
			});
		});

		it('adds X-Frame-Options when allowAuthHostingIframeEmbedding is missing', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({})
			});
			await middleware(fakeRequest(`https://example.com/login/${projectId28}`));
			expectHeaders({
				'x-descope-middleware': 'iframeDisabled',
				'X-Frame-Options': 'SAMEORIGIN'
			});
		});

		it('adds X-Frame-Options when config fetch response is not ok', async () => {
			mockFetch.mockResolvedValueOnce({ ok: false });
			await middleware(fakeRequest(`https://example.com/login/${projectId28}`));
			expectHeaders({
				'x-descope-middleware': 'failed',
				'X-Frame-Options': 'SAMEORIGIN'
			});
		});

		it('adds X-Frame-Options when config fetch throws', async () => {
			mockFetch.mockRejectedValueOnce(new Error('Network error'));
			await middleware(fakeRequest(`https://example.com/login/${projectId28}`));
			expectHeaders({
				'x-descope-middleware': 'failed',
				'X-Frame-Options': 'SAMEORIGIN'
			});
		});

		it('adds X-Frame-Options when config fetch times out', async () => {
			jest.useFakeTimers();
			mockFetch.mockImplementationOnce(
				(_url: string, options: { signal: AbortSignal }) =>
					new Promise((_resolve, reject) => {
						options.signal.addEventListener('abort', () => {
							reject(new Error('The operation was aborted.'));
						});
					})
			);
			const promise = middleware(
				fakeRequest(`https://example.com/login/${projectId28}`)
			);
			jest.advanceTimersByTime(2000);
			await promise;
			expectHeaders({
				'x-descope-middleware': 'failed',
				'X-Frame-Options': 'SAMEORIGIN'
			});
		});
	});

	describe('env var configuration', () => {
		const projectId = `P${'a'.repeat(27)}`;

		it('returns misconfigured when MIDDLEWARE_DESCOPE_BASE_URL is not set with project ID', async () => {
			delete process.env.MIDDLEWARE_DESCOPE_BASE_URL;
			await middleware(fakeRequest(`https://example.com/login/${projectId}`));
			expect(mockFetch).not.toHaveBeenCalled();
			expectHeaders({
				'x-descope-middleware': 'misconfigured',
				'X-Frame-Options': 'SAMEORIGIN'
			});
		});

		it('returns misconfigured when MIDDLEWARE_DESCOPE_BASE_URL is not set without project ID', async () => {
			delete process.env.MIDDLEWARE_DESCOPE_BASE_URL;
			await middleware(fakeRequest('https://example.com/login/'));
			expect(mockFetch).not.toHaveBeenCalled();
			expectHeaders({
				'x-descope-middleware': 'misconfigured',
				'X-Frame-Options': 'SAMEORIGIN'
			});
		});

		it('uses MIDDLEWARE_DESCOPE_BASE_URL when set', async () => {
			process.env.MIDDLEWARE_DESCOPE_BASE_URL = 'https://api.descope.com';
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ allowAuthHostingIframeEmbedding: true })
			});
			await middleware(
				fakeRequest(`https://123456789.preview.descope.org/login/${projectId}`)
			);
			expectFetchCalledWith(
				`https://api.descope.com/.well-known/project-configuration/${projectId}`
			);
			expectHeaders({ 'x-descope-middleware': 'iframeEnabled' });
		});

		it('works with custom base URL', async () => {
			process.env.MIDDLEWARE_DESCOPE_BASE_URL =
				'https://custom.api.example.com';
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ allowAuthHostingIframeEmbedding: false })
			});
			await middleware(
				fakeRequest(`https://auth.example.com/login/${projectId}`)
			);
			expectFetchCalledWith(
				`https://custom.api.example.com/.well-known/project-configuration/${projectId}`
			);
			expectHeaders({
				'x-descope-middleware': 'iframeDisabled',
				'X-Frame-Options': 'SAMEORIGIN'
			});
		});

		it('handles trailing slash in base URL', async () => {
			process.env.MIDDLEWARE_DESCOPE_BASE_URL = 'https://api.descope.com/';
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ allowAuthHostingIframeEmbedding: true })
			});
			await middleware(fakeRequest(`https://example.com/login/${projectId}`));
			expectFetchCalledWith(
				`https://api.descope.com/.well-known/project-configuration/${projectId}`
			);
			expectHeaders({ 'x-descope-middleware': 'iframeEnabled' });
		});

		it('handles multiple trailing slashes in base URL', async () => {
			process.env.MIDDLEWARE_DESCOPE_BASE_URL = 'https://api.descope.com///';
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ allowAuthHostingIframeEmbedding: false })
			});
			await middleware(fakeRequest(`https://example.com/login/${projectId}`));
			expectFetchCalledWith(
				`https://api.descope.com/.well-known/project-configuration/${projectId}`
			);
			expectHeaders({
				'x-descope-middleware': 'iframeDisabled',
				'X-Frame-Options': 'SAMEORIGIN'
			});
		});
	});

	describe('matcher config', () => {
		it('exports a matcher that excludes static file extensions', () => {
			expect(config.matcher).toBeDefined();
			expect(config.matcher.length).toBeGreaterThan(0);

			// eslint-disable-next-line security/detect-non-literal-regexp
			const pattern = new RegExp(config.matcher[0]);
			// Should match document routes
			const projectId = `P${'a'.repeat(27)}`;
			expect(pattern.test(`/login/${projectId}`)).toBe(true);
			expect(pattern.test('/')).toBe(true);

			// Should not match static assets
			expect(pattern.test('/static/main.js')).toBe(false);
			expect(pattern.test('/static/style.css')).toBe(false);
			expect(pattern.test('/favicon.ico')).toBe(false);
			expect(pattern.test('/logo.svg')).toBe(false);
			expect(pattern.test('/image.png')).toBe(false);
		});
	});
});
