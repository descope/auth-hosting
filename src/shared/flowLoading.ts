const DEFAULT_LOADING_COLOR = '#0082b5';
const DEFAULT_LOADING_OVERLAY_COLOR = '#ffffff';
const DEFAULT_LOADING_TIMEOUT_MS = 15000;

const isBackgroundImageUrl = (value: string | undefined) =>
	Boolean(value?.startsWith('https://'));

const getLoadingSpinnerColor = (loadingColor: string | undefined) => {
	if (loadingColor && !isBackgroundImageUrl(loadingColor)) {
		return loadingColor;
	}

	return DEFAULT_LOADING_COLOR;
};

const getLoadingOverlayColor = (background: string | undefined) => {
	if (background && !isBackgroundImageUrl(background)) {
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
