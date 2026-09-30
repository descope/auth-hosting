import { next } from '@vercel/functions';
import { projectRegex } from './src/shared/projectRegex';

const FETCH_TIMEOUT_MS = 2000;

const middleware = async (request: Request) => {
	const url = new URL(request.url);

	// Check base URL environment variable is set
	const baseUrl = process.env.MIDDLEWARE_DESCOPE_BASE_URL;
	if (!baseUrl) {
		return next({
			headers: {
				'x-descope-middleware': 'misconfigured',
				'X-Frame-Options': 'SAMEORIGIN'
			}
		});
	}

	// Remove trailing slash from base URL if present
	const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');

	// Extract the project ID from the URL path (last segment)
	const pathSegments = url.pathname.split('/').filter(Boolean);
	const lastSegment = pathSegments[pathSegments.length - 1] || '';
	const projectId = projectRegex.exec(lastSegment)?.[0];
	if (!projectId) {
		return next({
			headers: {
				'x-descope-middleware': 'noProject',
				'X-Frame-Options': 'SAMEORIGIN'
			}
		});
	}

	// Try to fetch project configuration with timeout
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
	try {
		const configUrl = `${normalizedBaseUrl}/.well-known/project-configuration/${projectId}`;
		const response = await fetch(configUrl, {
			signal: controller.signal
		});
		if (response.ok) {
			const projectConfig = await response.json();
			if (projectConfig.disableAuthHosting === true) {
				// Never serve the document, so the flow bundle never loads. The response
				// carries no body, no project details and no reason header, and answers 404
				// rather than 403 so it does not confirm that anything is here to refuse.
				// It is not indistinguishable from an unknown project -- that one still gets
				// the app with a 200, and the well-known endpoint publishes the flag to
				// anyone who asks -- but nothing about this response volunteers the reason.
				return new Response(null, {
					status: 404,
					headers: { 'X-Frame-Options': 'SAMEORIGIN' }
				});
			}
			if (projectConfig.allowAuthHostingIframeEmbedding === true) {
				// Project explicitly allows iframe embedding — omit X-Frame-Options
				return next({
					headers: {
						'x-descope-middleware': 'iframeEnabled'
					}
				});
			}
			// allowAuthHostingIframeEmbedding is false or missing
			return next({
				headers: {
					'x-descope-middleware': 'iframeDisabled',
					'X-Frame-Options': 'SAMEORIGIN'
				}
			});
		}
		// Response not ok, treat as failed
		return next({
			headers: {
				'x-descope-middleware': 'failed',
				'X-Frame-Options': 'SAMEORIGIN'
			}
		});
	} catch {
		// On error or timeout, return failed status
		return next({
			headers: {
				'x-descope-middleware': 'failed',
				'X-Frame-Options': 'SAMEORIGIN'
			}
		});
	} finally {
		clearTimeout(timeoutId);
	}
};

export default middleware;

// Vercel reads this config to decide which routes invoke the middleware.
// Skip static assets so we only run (and fetch project config) on document routes.
export const config = {
	matcher: [
		'/((?!.*\\.(?:js|css|map|ico|svg|png|jpg|jpeg|gif|webp|woff2?|ttf|eot)$).*)'
	]
};
