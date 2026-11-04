import fs from 'fs';
import path from 'path';

// The inline <script> in public/index.html paints the bg color before the
// bundle loads, see normalizeBackgroundParam in App.tsx for the React side.
const html = fs.readFileSync(
	path.join(__dirname, '..', 'public', 'index.html'),
	'utf8'
);
const inlineScript =
	new DOMParser()
		.parseFromString(html, 'text/html')
		.querySelector('script:not([src])')?.textContent ?? '';

const paintBg = (search: string, env?: Record<string, string>) => {
	Object.defineProperty(window, 'location', {
		value: { ...window.location, search },
		writable: true
	});
	window.env = env;
	document.documentElement.style.backgroundColor = '';
	// eslint-disable-next-line no-new-func, @typescript-eslint/no-implied-eval
	new Function(inlineScript)();
	return document.documentElement.style.backgroundColor;
};

describe('index.html inline bg script', () => {
	it('paints the bg color before the bundle loads', () => {
		expect(inlineScript).toContain('backgroundColor');
		expect(paintBg('?bg=000000')).toBe('rgb(0, 0, 0)');
		expect(paintBg('?bg=%23ff00ff')).toBe('rgb(255, 0, 255)');
		expect(paintBg('?bg=red')).toBe('red');
		expect(paintBg('', { DESCOPE_BG: 'blue' })).toBe('blue');
		// image URLs are left to React
		expect(paintBg('?bg=https://example.com/bg.png')).toBe('');
		expect(paintBg('')).toBe('');
	});
});
