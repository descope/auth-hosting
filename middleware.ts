import { next } from '@vercel/functions';
import { projectRegex } from './src/shared/projectRegex';

const FETCH_TIMEOUT_MS = 2000;

const STATIC_EXT =
	/\.(?:js|css|map|ico|svg|png|jpg|jpeg|gif|webp|woff2?|ttf|eot)$/;

const NO_CACHE_HEADERS: Record<string, string> = {
	'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
	'CDN-Cache-Control': 'no-store',
	'Vercel-CDN-Cache-Control': 'no-store'
};

const getConfigBaseUrl = (url: URL): string => {
	if (url.hostname.endsWith('.preview.descope.org')) {
		return 'https://api.descope.org';
	}
	return url.origin;
};

const middleware = async (request: Request) => {
	const url = new URL(request.url);

	if (STATIC_EXT.test(url.pathname)) {
		return next({ headers: NO_CACHE_HEADERS });
	}

	const pathSegments = url.pathname.split('/').filter(Boolean);
	const lastSegment = pathSegments[pathSegments.length - 1] || '';
	const projectId = projectRegex.exec(lastSegment)?.[0];

	if (projectId) {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
		try {
			const baseUrl = getConfigBaseUrl(url);
			const configUrl = `${baseUrl}/.well-known/project-configuration/${projectId}`;
			const response = await fetch(configUrl, {
				signal: controller.signal,
				cache: 'no-store'
			});
			if (response.ok) {
				const projectConfig = await response.json();
				if (projectConfig.allowAuthHostingIframeEmbedding === true) {
					return next({ headers: NO_CACHE_HEADERS });
				}
			}
		} catch {
			// On error or timeout, fall through to add the header (secure default)
		} finally {
			clearTimeout(timeoutId);
		}
	}

	return next({
		headers: {
			...NO_CACHE_HEADERS,
			'X-Frame-Options': 'SAMEORIGIN'
		}
	});
};

export default middleware;
