import { next } from '@vercel/functions';

// Duplicated in src/App.tsx — keep both in sync if the format changes
const projectRegex = /^P([a-zA-Z0-9]{27}|[a-zA-Z0-9]{31})$/;
const DEFAULT_BASE_URL = 'https://api.descope.com';
const FETCH_TIMEOUT_MS = 2000;

const getConfigBaseUrl = (url: URL): string => {
	// When accessing the Vercel deployment directly (e.g. for testing),
	// the .well-known endpoint doesn't exist on the Vercel origin.
	// Fall back to the production API for the configuration check.
	if (url.hostname.endsWith('.vercel.app')) {
		return DEFAULT_BASE_URL;
	}
	return url.origin;
};

const middleware = async (request: Request) => {
	const url = new URL(request.url);

	// Extract the project ID from the URL path (last segment)
	const pathSegments = url.pathname.split('/').filter(Boolean);
	const lastSegment = pathSegments[pathSegments.length - 1] || '';
	const projectId = projectRegex.exec(lastSegment)?.[0];

	// If we have a project ID, check if iframe embedding is allowed
	if (projectId) {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
		try {
			const baseUrl = getConfigBaseUrl(url);
			const configUrl = `${baseUrl}/.well-known/project-configuration/${projectId}`;
			const response = await fetch(configUrl, {
				signal: controller.signal,
				cache: 'force-cache'
			});
			if (response.ok) {
				const config = await response.json();
				if (config.allowAuthHostingIframeEmbedding === true) {
					// Project explicitly allows iframe embedding — omit X-Frame-Options
					return next();
				}
			}
		} catch {
			// On error or timeout, fall through to add the header (secure default)
		} finally {
			clearTimeout(timeoutId);
		}
	}

	// Default: add X-Frame-Options to prevent clickjacking
	return next({
		headers: {
			'X-Frame-Options': 'SAMEORIGIN'
		}
	});
};

export default middleware;

export const config = {
	matcher: [
		'/((?!.*\\.(?:js|css|map|ico|svg|png|jpg|jpeg|gif|webp|woff2?|ttf|eot)$).*)'
	]
};
