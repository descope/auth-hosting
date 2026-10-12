const DEFAULT_LOADING_COLOR = '#0082b5';
const DEFAULT_LOADING_OVERLAY_COLOR = '#ffffff';
const DEFAULT_LOADING_TIMEOUT_MS = 15000;

// Covers the color formats documented for bg/loading_color: hex, rgb()/hsl()
// and bare color keywords. Only used where CSS.supports is unavailable (jsdom,
// older browsers); it still rejects the image URLs that actually reach here,
// but cannot tell a real keyword from an arbitrary word.
const CSS_COLOR_PATTERN = /^(#[0-9a-f]{3,8}|(?:rgb|hsl)a?\([^()]*\)|[a-z]+)$/i;

// These values become CSS custom properties. A non-color makes every
// declaration reading them invalid at computed-value time, and the var()
// fallbacks do NOT apply in that case (the property is set, just not to a
// color), so reject it here rather than relying on a fallback that cannot fire.
const isValidCssColor = (value: string) => {
	const trimmed = value.trim();
	if (!trimmed) {
		return false;
	}

	if (typeof CSS !== 'undefined' && typeof CSS?.supports === 'function') {
		return CSS.supports('color', trimmed);
	}

	return CSS_COLOR_PATTERN.test(trimmed);
};

const getLoadingSpinnerColor = (loadingColor: string | undefined) => {
	if (loadingColor && isValidCssColor(loadingColor)) {
		return loadingColor;
	}

	return DEFAULT_LOADING_COLOR;
};

const getLoadingOverlayColor = (background: string | undefined) => {
	if (background && isValidCssColor(background)) {
		return background;
	}

	return DEFAULT_LOADING_OVERLAY_COLOR;
};

const getLoadingTimeoutMs = ({
	urlTimeoutSeconds,
	envTimeoutMs
}: {
	urlTimeoutSeconds: string | null;
	envTimeoutMs: string | undefined;
}) => {
	if (urlTimeoutSeconds) {
		const parsedSeconds = parseInt(urlTimeoutSeconds, 10);
		if (!Number.isNaN(parsedSeconds) && parsedSeconds > 0) {
			return parsedSeconds * 1000;
		}
	}

	if (envTimeoutMs) {
		const parsedMs = parseInt(envTimeoutMs, 10);
		if (!Number.isNaN(parsedMs) && parsedMs > 0) {
			return parsedMs;
		}
	}

	return DEFAULT_LOADING_TIMEOUT_MS;
};

export {
	DEFAULT_LOADING_COLOR,
	DEFAULT_LOADING_OVERLAY_COLOR,
	DEFAULT_LOADING_TIMEOUT_MS,
	getLoadingSpinnerColor,
	getLoadingOverlayColor,
	getLoadingTimeoutMs
};
