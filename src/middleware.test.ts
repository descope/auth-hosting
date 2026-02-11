import { next } from '@vercel/functions';
import middleware from '../middleware';

jest.mock('@vercel/functions', () => ({
	next: jest.fn(),
}));

const mockedNext = next as jest.MockedFunction<typeof next>;
const mockFetch = jest.fn();
global.fetch = mockFetch;

function fakeRequest(url: string): Request {
	return { url } as unknown as Request;
}

describe('middleware', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('when no project ID is in the URL', () => {
		it('adds X-Frame-Options for root path', async () => {
			await middleware(fakeRequest('https://example.com/'));
			expect(mockFetch).not.toHaveBeenCalled();
			expect(mockedNext).toHaveBeenCalledWith({
				headers: { 'X-Frame-Options': 'SAMEORIGIN' },
			});
		});

		it('adds X-Frame-Options for non-project path segments', async () => {
			await middleware(fakeRequest('https://example.com/login/error'));
			expect(mockFetch).not.toHaveBeenCalled();
			expect(mockedNext).toHaveBeenCalledWith({
				headers: { 'X-Frame-Options': 'SAMEORIGIN' },
			});
		});

		it('adds X-Frame-Options for invalid project ID format', async () => {
			await middleware(
				fakeRequest('https://example.com/login/notAProjectId'),
			);
			expect(mockFetch).not.toHaveBeenCalled();
			expect(mockedNext).toHaveBeenCalledWith({
				headers: { 'X-Frame-Options': 'SAMEORIGIN' },
			});
		});

		it('adds X-Frame-Options for project ID with wrong length', async () => {
			// P + 26 chars (too short)
			const shortId = `P${'a'.repeat(26)}`;
			await middleware(
				fakeRequest(`https://example.com/login/${shortId}`),
			);
			expect(mockFetch).not.toHaveBeenCalled();
			expect(mockedNext).toHaveBeenCalledWith({
				headers: { 'X-Frame-Options': 'SAMEORIGIN' },
			});
		});
	});

	describe('when a valid project ID is in the URL', () => {
		const projectId28 = `P${'a'.repeat(27)}`;
		const projectId32 = `P${'b'.repeat(31)}`;

		it('omits X-Frame-Options when embedding is allowed (28-char ID)', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ allowAuthHostingIframeEmbedding: true }),
			});
			await middleware(
				fakeRequest(`https://example.com/login/${projectId28}`),
			);
			expect(mockFetch).toHaveBeenCalledWith(
				`https://example.com/.well-known/project-configuration/${projectId28}`,
			);
			expect(mockedNext).toHaveBeenCalledWith();
		});

		it('omits X-Frame-Options when embedding is allowed (32-char ID)', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ allowAuthHostingIframeEmbedding: true }),
			});
			await middleware(
				fakeRequest(`https://example.com/login/${projectId32}`),
			);
			expect(mockFetch).toHaveBeenCalledWith(
				`https://example.com/.well-known/project-configuration/${projectId32}`,
			);
			expect(mockedNext).toHaveBeenCalledWith();
		});

		it('adds X-Frame-Options when allowAuthHostingIframeEmbedding is false', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ allowAuthHostingIframeEmbedding: false }),
			});
			await middleware(
				fakeRequest(`https://example.com/login/${projectId28}`),
			);
			expect(mockedNext).toHaveBeenCalledWith({
				headers: { 'X-Frame-Options': 'SAMEORIGIN' },
			});
		});

		it('adds X-Frame-Options when allowAuthHostingIframeEmbedding is missing', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({}),
			});
			await middleware(
				fakeRequest(`https://example.com/login/${projectId28}`),
			);
			expect(mockedNext).toHaveBeenCalledWith({
				headers: { 'X-Frame-Options': 'SAMEORIGIN' },
			});
		});

		it('adds X-Frame-Options when config fetch response is not ok', async () => {
			mockFetch.mockResolvedValueOnce({ ok: false });
			await middleware(
				fakeRequest(`https://example.com/login/${projectId28}`),
			);
			expect(mockedNext).toHaveBeenCalledWith({
				headers: { 'X-Frame-Options': 'SAMEORIGIN' },
			});
		});

		it('adds X-Frame-Options when config fetch throws', async () => {
			mockFetch.mockRejectedValueOnce(new Error('Network error'));
			await middleware(
				fakeRequest(`https://example.com/login/${projectId28}`),
			);
			expect(mockedNext).toHaveBeenCalledWith({
				headers: { 'X-Frame-Options': 'SAMEORIGIN' },
			});
		});
	});

	describe('config base URL resolution', () => {
		const projectId = `P${'a'.repeat(27)}`;

		it('uses api.descope.com for .vercel.app hostnames', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ allowAuthHostingIframeEmbedding: true }),
			});
			await middleware(
				fakeRequest(
					`https://my-app.vercel.app/login/${projectId}`,
				),
			);
			expect(mockFetch).toHaveBeenCalledWith(
				`https://api.descope.com/.well-known/project-configuration/${projectId}`,
			);
		});

		it('uses api.descope.com for nested .vercel.app subdomains', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ allowAuthHostingIframeEmbedding: true }),
			});
			await middleware(
				fakeRequest(
					`https://branch.my-app.vercel.app/login/${projectId}`,
				),
			);
			expect(mockFetch).toHaveBeenCalledWith(
				`https://api.descope.com/.well-known/project-configuration/${projectId}`,
			);
		});

		it('uses request origin for custom domain', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ allowAuthHostingIframeEmbedding: true }),
			});
			await middleware(
				fakeRequest(
					`https://auth.example.com/login/${projectId}`,
				),
			);
			expect(mockFetch).toHaveBeenCalledWith(
				`https://auth.example.com/.well-known/project-configuration/${projectId}`,
			);
		});
	});
});
