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

	it('defaults the spinner color when loading_color is not a color', () => {
		expect(getLoadingSpinnerColor('http://example.com/bg.png')).toBe(
			DEFAULT_LOADING_COLOR
		);
		expect(getLoadingSpinnerColor('https://example.com/bg.png')).toBe(
			DEFAULT_LOADING_COLOR
		);
	});

	it('defaults the overlay color when bg is an http image URL', () => {
		expect(getLoadingOverlayColor('http://example.com/bg.png')).toBe(
			DEFAULT_LOADING_OVERLAY_COLOR
		);
	});

	it('honours CSS.supports when the browser provides it', () => {
		const globalWithCss = global as unknown as { CSS?: unknown };
		const original = globalWithCss.CSS;
		globalWithCss.CSS = {
			supports: (property: string, value: string) =>
				property === 'color' && ['#ff0000', 'red'].includes(value)
		};

		try {
			expect(getLoadingSpinnerColor('red')).toBe('red');
			expect(getLoadingSpinnerColor('notacolor')).toBe(DEFAULT_LOADING_COLOR);
			expect(getLoadingOverlayColor('notacolor')).toBe(
				DEFAULT_LOADING_OVERLAY_COLOR
			);
		} finally {
			globalWithCss.CSS = original;
		}
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
