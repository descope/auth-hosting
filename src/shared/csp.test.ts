// Covers the enforcing half of the policy: the nonce mkCsp adds, and the HTML
// config/cspPlugin.js bakes for containerised FedRAMP builds. The report-only
// half is covered by middleware.test.ts.

import { mkCsp } from './csp';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
	injectCsp,
	CADDY_NONCE_PLACEHOLDER
} = require('../../config/cspPlugin');

const TEMPLATE =
	'<!doctype html><html><head><title>Auth</title></head><body></body></html>';

const metaContent = (html: string): string =>
	html.match(
		/<meta http-equiv="Content-Security-Policy" content="([^]*?)">/
	)?.[1] ?? '';

// Source expressions must be compared as whole tokens: 'https:' is a substring
// of every https:// origin already in the policy.
const sourcesOf = (csp: string, directive: string): string[] =>
	csp
		.split('; ')
		.find((d) => d.startsWith(`${directive} `))
		?.split(' ')
		.slice(1) ?? [];

describe('mkCsp nonce', () => {
	it('adds the nonce to the directives that need one, and only those', () => {
		const csp = mkCsp({}, { nonce: 'n0' });

		expect(sourcesOf(csp, 'script-src')).toContain("'nonce-n0'");
		expect(sourcesOf(csp, 'style-src')).toContain("'nonce-n0'");
		expect(sourcesOf(csp, 'img-src')).not.toContain("'nonce-n0'");
		expect(sourcesOf(csp, 'connect-src')).not.toContain("'nonce-n0'");
	});

	it('omits the nonce entirely when none is given', () => {
		// The report-only paths cannot inject one, so the policy must be valid
		// without it rather than carrying an empty 'nonce-'.
		expect(mkCsp({})).not.toContain('nonce-');
	});

	it('names the origins whose scripts this app injects itself', () => {
		// The web component nonces the scripts it injects; these two are added by
		// this app and by bot detection, so a nonce never reaches them.
		const csp = mkCsp({}, { nonce: 'n0' });

		expect(sourcesOf(csp, 'script-src')).toContain(
			'https://accounts.google.com'
		);
		expect(sourcesOf(csp, 'script-src')).toContain('https://fpnpmcdn.net');
		expect(sourcesOf(csp, 'frame-src')).toContain(
			'https://accounts.google.com'
		);
	});
});

describe('injectCsp', () => {
	it('adds the policy and the nonce bootstrap to the head', () => {
		const html = injectCsp(TEMPLATE, 'n0', {});

		expect(metaContent(html)).toBeTruthy();
		expect(html).toContain(
			`<script nonce="n0">window.DESCOPE_NONCE = 'n0';</script>`
		);
		// The original head content survives.
		expect(html).toContain('<title>Auth</title>');
	});

	it('leaves out the directive a meta element cannot carry', () => {
		// Browsers ignore frame-ancestors in a meta tag and log a warning for it.
		expect(metaContent(injectCsp(TEMPLATE, 'n0', {}))).not.toContain(
			'frame-ancestors'
		);
		expect(mkCsp({})).toContain("frame-ancestors 'self'");
	});

	it('has no way to run an un-nonced inline script or style', () => {
		const csp = metaContent(injectCsp(TEMPLATE, 'n0', {}));

		['script-src', 'style-src'].forEach((directive) => {
			const sources = sourcesOf(csp, directive);
			expect(sources).not.toContain("'unsafe-inline'");
			expect(sources).not.toContain("'unsafe-eval'");
			expect(sources).not.toContain('*');
			expect(sources).toContain("'nonce-n0'");
		});
		expect(csp).toContain("object-src 'none'");
		expect(csp).toContain("base-uri 'self'");
	});

	it('keeps the Caddy placeholder verbatim', () => {
		// Caddy substitutes this server-side before the browser parses the
		// document, so the inner quotes never reach an HTML parser. Escaping it
		// would leave every visitor with the same literal nonce.
		const html = injectCsp(TEMPLATE, CADDY_NONCE_PLACEHOLDER, {});

		expect(html).toContain(`'nonce-${CADDY_NONCE_PLACEHOLDER}'`);
		expect(html).toContain(`<script nonce="${CADDY_NONCE_PLACEHOLDER}">`);
	});
});
