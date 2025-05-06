/**
 * Ensures a URL has an origin by prepending the current window's origin if needed
 * @param url The URL to process
 * @returns A URL with origin or empty string if input is undefined
 */
export const ensureUrlHasOrigin = (url?: string): string => {
	if (!url) {
		return '';
	}

	return url.startsWith('/') ? `${window.location.origin}${url}` : url;
};
