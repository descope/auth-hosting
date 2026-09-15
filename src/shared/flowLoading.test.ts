import {
	DEFAULT_LOADING_COLOR,
	DEFAULT_LOADING_OVERLAY_COLOR,
	DEFAULT_LOADING_TIMEOUT_MS,
	getLoadingOverlayColor,
	getLoadingSpinnerColor,
	getLoadingTimeoutMs
} from './flowLoading';

describe('flowLoading helpers', () => {
	it('uses loading_color for the spinner when provided', () => {
		expect(getLoadingSpinnerColor('#ff0000')).toBe('#ff0000');
	});

	it('defaults spinner color when loading_color is missing', () => {
		expect(getLoadingSpinnerColor(undefined)).toBe(DEFAULT_LOADING_COLOR);
	});

	it('uses bg for overlay background when bg is a color', () => {
		expect(getLoadingOverlayColor('#111111')).toBe('#111111');
	});

	it('defaults overlay background when bg is missing or an image', () => {
		expect(getLoadingOverlayColor(undefined)).toBe(
			DEFAULT_LOADING_OVERLAY_COLOR
		);
		expect(getLoadingOverlayColor('https://example.com/bg.png')).toBe(
			DEFAULT_LOADING_OVERLAY_COLOR
		);
	});

	it('parses loading_timeout from query params in seconds', () => {
		expect(
			getLoadingTimeoutMs({
				urlTimeoutSeconds: '5',
				envTimeoutMs: undefined
			})
		).toBe(5000);
	});

	it('falls back to env timeout and default timeout', () => {
		expect(
			getLoadingTimeoutMs({
				urlTimeoutSeconds: null,
				envTimeoutMs: '8000'
			})
		).toBe(8000);
		expect(
			getLoadingTimeoutMs({
				urlTimeoutSeconds: null,
				envTimeoutMs: undefined
			})
		).toBe(DEFAULT_LOADING_TIMEOUT_MS);
	});
});
