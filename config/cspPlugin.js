// Bakes the enforcing Content-Security-Policy into index.html at build time.
//
// Only registered when ADD_CSP is set, which is the FedRAMP image build. Caddy
// is a static file server and cannot build a per-request header, so there the
// policy travels in the document and only the nonce is substituted per request.

const HtmlWebpackPlugin = require('html-webpack-plugin');
const { mkCsp } = require('../src/shared/csp');

// Substituted by Caddy from `vars nonce {http.request.uuid}`. A nonce baked
// into a static file is the same for every visitor, which is worth nothing.
const CADDY_NONCE_PLACEHOLDER = '{{placeholder "http.vars.nonce"}}';

// Ignored in a meta element, and browsers warn about it. The Caddyfile header
// carries it instead.
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

// The bootstrap script is what lets the web component nonce the CDN script and
// the style elements it injects; without it neither is admitted and the flow
// never renders.
//
// Runtime origins stay as Caddy placeholders only when Caddy is serving: on a
// fixed-nonce build nothing would substitute them, and the quotes inside the
// expression would terminate the content attribute and truncate the policy.
const injectCsp = (html, nonce, env = process.env) =>
	html.replace(
		'<head>',
		[
			'<head>',
			`<meta http-equiv="Content-Security-Policy" content="${forMetaTag(
				mkCsp(env, {
					nonce,
					caddyRuntimeOrigins: nonce === CADDY_NONCE_PLACEHOLDER
				})
			)}">`,
			`<script nonce="${nonce}">window.DESCOPE_NONCE = '${nonce}';</script>`
		].join('')
	);

// Fixed nonce for builds served without Caddy: worth less than a per-request
// one, but it keeps the document self-consistent so the app still boots.
const mkBuildNonce = () => require('crypto').randomBytes(32).toString('base64');

// Do not set ADD_CSP on the dev server: CRA's devtool runs every module through
// eval(), and the only way past that is 'unsafe-eval' - which relaxes the
// directive exactly where you are trying to observe it.
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

module.exports = { InjectCspPlugin, injectCsp, CADDY_NONCE_PLACEHOLDER };
