// Bakes an enforcing Content-Security-Policy into index.html at build time.
//
// Only runs when ADD_CSP is set, which is the FedRAMP image build. Every other
// deployment ships without a meta tag and gets the report-only policy from a
// header instead (the Caddyfile, or middleware.ts on the Vercel path), so this
// file is inert unless a build explicitly asks for it.
//
// Caddy is a static file server and cannot generate a per-request header it
// does not build, so on that path the policy travels in the document and only
// the nonce is substituted per request. mkCsp is shared with the header paths
// deliberately: one policy definition, three delivery mechanisms.

const HtmlWebpackPlugin = require('html-webpack-plugin');
const { mkCsp } = require('../src/shared/csp');

// Caddy substitutes this at request time from `vars nonce {http.request.uuid}`.
// A nonce baked into a static file would be identical for every visitor, which
// is no better than 'unsafe-inline'.
const CADDY_NONCE_PLACEHOLDER = '{{placeholder "http.vars.nonce"}}';

// frame-ancestors is ignored when delivered in a meta element, and browsers log
// a console warning for it. The Caddyfile header carries that directive.
const META_UNSUPPORTED_DIRECTIVES = ['frame-ancestors'];

const forMetaTag = (csp) =>
	csp
		.split('; ')
		.filter(
			(directive) =>
				!META_UNSUPPORTED_DIRECTIVES.some((name) =>
					directive.startsWith(`${name} `)
				)
		)
		.join('; ');

// The bootstrap script publishes the nonce for @descope/web-component, which
// reads window.DESCOPE_NONCE and puts it on the CDN script it injects and on
// every style element it creates. Without it those are refused by script-src
// and style-src, and the flow never renders.
const injectCsp = (html, nonce, env = process.env) =>
	html.replace(
		'<head>',
		[
			'<head>',
			`<meta http-equiv="Content-Security-Policy" content="${forMetaTag(mkCsp(env, { nonce }))}">`,
			`<script nonce="${nonce}">window.DESCOPE_NONCE = '${nonce}';</script>`
		].join('')
	);

// Do not set ADD_CSP on the dev server: CRA's devtool runs every module through
// eval(), which this policy rejects, and the only way past that is
// 'unsafe-eval' — which relaxes the directive exactly where you are trying to
// observe it. Verify against a production build instead.
class InjectCspPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap('InjectCspPlugin', (compilation) => {
			HtmlWebpackPlugin.getHooks(compilation).beforeEmit.tapAsync(
				'InjectCspPlugin',
				(data, cb) => {
					const nonce =
						process.env.INJECT_CADDY_NONCE === 'true'
							? CADDY_NONCE_PLACEHOLDER
							: mkBuildNonce();
					data.html = injectCsp(data.html, nonce);
					cb(null, data);
				}
			);
		});
	}
}

// Only for builds served without Caddy substitution, where a fixed nonce is
// still better than none: it keeps the document self-consistent so the app
// boots, while the policy stays enforcing.
const mkBuildNonce = () => require('crypto').randomBytes(32).toString('base64');

module.exports = { InjectCspPlugin, injectCsp, CADDY_NONCE_PLACEHOLDER };
