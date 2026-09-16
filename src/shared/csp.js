// The Content-Security-Policy, in one definition for both delivery paths.
//
// Two dispositions, decided per deployment:
//
//   Report-Only (default, everywhere) — the browser evaluates the policy and
//   reports violations but blocks nothing. This app renders tenant-authored
//   flows through @descope/web-component and takes an arbitrary image URL via
//   the `bg` param, so its legitimate surface is not knowable from this
//   repository alone. It has to be measured before it can be enforced.
//
//   Enforcing (ADD_CSP=true, containerised FedRAMP images only) — delivered as
//   a <meta http-equiv> tag baked into index.html by config/cspPlugin.js, with
//   the nonce left as a Caddy placeholder substituted per request. A private
//   deployment serves a known set of flows, so the surface is bounded there in
//   a way it is not for the shared deployments.
//
// Report-Only cannot travel in a meta tag - the spec forbids it and browsers
// ignore it - so the two dispositions necessarily use different transports:
// enforcing via meta, report-only via the Caddy header or Vercel middleware.
//
// CommonJS because config/cspPlugin.js require()s this at build time and a
// webpack config cannot import TypeScript. tsconfig has allowJs, so middleware
// and the app import it unchanged.

const { APPROVED_OIDC_MFA_URLS } = require('./oidcMfaUrls');

// The backend and content origins differ per environment and are read at
// runtime, so they are resolved from env rather than hardcoded.
const RUNTIME_ORIGIN_ENV_VARS = [
	'REACT_APP_DESCOPE_BASE_URL',
	'REACT_APP_CONTENT_BASE_URL'
];

const originOf = (value) => {
	if (!value) {
		return null;
	}
	try {
		return new URL(value).origin;
	} catch {
		// A malformed env var must not take down every response — the directive
		// keeps whatever origins did parse.
		return null;
	}
};

/**
 * Caddy template expressions that resolve an env var to a bare origin at
 * request time. The containerised policy is baked into index.html at build
 * time, when the backend and content origins are not known - one image serves
 * every environment - so they cannot be read from process.env there the way
 * the header paths do.
 *
 * Normalized to scheme/host/port because both values carry paths in real
 * deployments (REACT_APP_CONTENT_BASE_URL is a .../pages URL), and a CSP source
 * bearing a path matches only that exact path. Written with urlParse rather
 * than a capture group because $1 inside a Dockerfile ENV would be eaten by
 * Docker's own expansion. An unset var contributes nothing rather than a
 * malformed "://" source.
 */
const caddyOriginOf = (name) =>
	`{{if env "${name}"}}{{(urlParse (env "${name}")).scheme}}://{{(urlParse (env "${name}")).host}}{{end}}`;

const RUNTIME_ORIGIN_PLACEHOLDERS = RUNTIME_ORIGIN_ENV_VARS.map(caddyOriginOf);

/**
 * @param {Record<string, string | undefined>} [env]
 * @param {{ allowEmbedding?: boolean, nonce?: string, caddyRuntimeOrigins?: boolean }} [options]
 *   allowEmbedding mirrors the X-Frame-Options decision the middleware makes
 *   from the project's allowAuthHostingIframeEmbedding setting; a project that
 *   opted into embedding must not then be blocked by frame-ancestors.
 *   nonce, when given, is what makes script-src and style-src enforceable:
 *   @descope/web-component reads window.DESCOPE_NONCE and puts it on both the
 *   CDN script it injects and the style elements it creates, and a nonce
 *   admits an element whatever its origin.
 *   caddyRuntimeOrigins leaves the runtime origins as Caddy placeholders
 *   instead of resolving them from env, for the policy baked at build time.
 * @returns {string}
 */
const mkCsp = (
	env = process.env,
	{ allowEmbedding = false, nonce, caddyRuntimeOrigins = false } = {}
) => {
	const nonceSource = nonce ? [`'nonce-${nonce}'`] : [];

	const directives = {
		'default-src': ["'self'"],
		'script-src': [
			"'self'",
			...nonceSource,
			// @descope/web-component nonces the bundle it injects, but that
			// bundle then lazy-loads ~20 chunks through webpack's runtime, which
			// creates script elements without one. Naming the origins is what
			// console-app does; the alternative is __webpack_nonce__ inside the
			// published package. First CDN, then its two fallbacks.
			'https://descopecdn.com',
			'https://static.descope.com',
			'https://cdn.jsdelivr.net',
			// Injected by this app rather than by the web component, so it never
			// carries the nonce and needs its origin named. Only reached by flows
			// with a Google step.
			'https://accounts.google.com',
			// Bot detection loads its agent from here.
			'https://fpnpmcdn.net'
		],
		'style-src': ["'self'", ...nonceSource, 'https://fonts.googleapis.com'],
		// Kept to explicit origins rather than a scheme wildcard: this policy is
		// enforced only on FedRAMP, where the tenant set is known and bounded,
		// so the usual argument for opening it up - unknowable tenant logos -
		// does not apply. An image URL is a one-way GET, but it is still an
		// exfiltration channel.
		//
		// Stock flow templates currently pull a background from
		// images.ctfassets.net, and that is blocked here on purpose: a private
		// deployment must not fetch from a third-party CDN. The fix belongs in
		// the flow template, not in this directive - do not add the origin to
		// make the console quiet.
		'img-src': ["'self'", 'data:', 'https://imgs.descope.com'],
		// descopecdn.com because @descope/web-components-ui ships its fonts
		// alongside the bundle, so they come from wherever the bundle did.
		'font-src': [
			"'self'",
			'data:',
			'https://fonts.gstatic.com',
			'https://descopecdn.com'
		],
		'connect-src': ["'self'", 'https://fpnpmcdn.net'],
		'media-src': ["'self'"],
		'object-src': ["'none'"],
		// Google One Tap renders in an iframe.
		'frame-src': ["'self'", 'https://accounts.google.com'],
		'worker-src': ["'self'", 'blob:'],
		'manifest-src': ["'self'"],
		// useOidcMfa POSTs a form to one of these origins after checking the
		// redirect URL against the same list. Without them here the browser
		// blocks the submit that check just approved.
		'form-action': ["'self'", ...APPROVED_OIDC_MFA_URLS],
		'base-uri': ["'self'"]
	};

	// Resolved from env on the header paths, where the policy is built per
	// request; left as Caddy placeholders on the baked path, where they are not
	// known yet. Without this the containerised policy blocks every API and
	// config fetch and no flow loads at all.
	const runtimeOrigins = caddyRuntimeOrigins
		? RUNTIME_ORIGIN_PLACEHOLDERS
		: RUNTIME_ORIGIN_ENV_VARS.map((name) => originOf(env[name])).filter(
				Boolean
			);

	runtimeOrigins.forEach((origin) => {
		directives['connect-src'].push(origin);
		directives['img-src'].push(origin);
		directives['style-src'].push(origin);
		directives['font-src'].push(origin);
	});

	if (!allowEmbedding) {
		directives['frame-ancestors'] = ["'self'"];
	}

	return Object.entries(directives)
		.map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
		.join('; ');
};

// Delivered as a header, so report-only. The enforcing policy travels in the
// meta tag instead (config/cspPlugin.js).
//
// No report-uri or report-to: violations are read from the browser console
// during manual measurement. Add an endpoint here if that ever needs to be
// collected from real traffic rather than driven by hand.
const CSP_HEADER_NAME = 'Content-Security-Policy-Report-Only';

// Only the policy. X-Content-Type-Options and Referrer-Policy are static, so
// they are served from vercel.json on this path and from the Caddyfile on the
// other: the middleware matcher skips static assets to avoid a project-config
// fetch per bundle, which would leave every .js and .css without them.
// X-Frame-Options stays with the caller, which decides it per project.
const cspHeaders = (options = {}, env = process.env) => ({
	[CSP_HEADER_NAME]: mkCsp(env, options)
});

module.exports = {
	mkCsp,
	cspHeaders,
	CSP_HEADER_NAME
};
