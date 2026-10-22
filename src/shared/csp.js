// The Content-Security-Policy, in one definition for both delivery paths.
//
// Report-Only by default: this app renders tenant-authored flows and takes an
// arbitrary image URL via the `bg` param, so its surface is not knowable here
// and has to be measured before it can be enforced anywhere shared.
//
// Enforcing on FedRAMP (ADD_CSP=true), where the tenant set is bounded. That
// one travels in a meta tag, because Report-Only cannot: the spec forbids it
// there and browsers ignore it.
//
// CommonJS so config/cspPlugin.js can require() it from the webpack config.

const { APPROVED_OIDC_MFA_URLS } = require('./oidcMfaUrls');

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
		// One malformed env var must not cost the directive its other origins.
		return null;
	}
};

// Resolves an env var to a bare origin at request time. Normalized because both
// values carry paths in real deployments, and a CSP source with a path matches
// only that exact path. urlParse rather than a capture group: $1 in a Dockerfile
// ENV is eaten by Docker's own expansion.
const caddyOriginOf = (name) =>
	`{{if env "${name}"}}{{(urlParse (env "${name}")).scheme}}://{{(urlParse (env "${name}")).host}}{{end}}`;

const RUNTIME_ORIGIN_PLACEHOLDERS = RUNTIME_ORIGIN_ENV_VARS.map(caddyOriginOf);

/**
 * @param {Record<string, string | undefined>} [env]
 * @param {{ allowEmbedding?: boolean, nonce?: string, caddyRuntimeOrigins?: boolean }} [options]
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
			// The web component nonces the bundle it injects, but that bundle
			// lazy-loads ~20 chunks through webpack's runtime, which builds script
			// elements without one. Fixing it upstream means __webpack_nonce__ in
			// the published package. CDN, then its two fallbacks.
			'https://descopecdn.com',
			'https://static.descope.com',
			'https://cdn.jsdelivr.net',
			// Injected by this app, so never nonced. Google One Tap.
			'https://accounts.google.com',
			// Bot detection agent.
			'https://fpnpmcdn.net'
		],
		'style-src': ["'self'", ...nonceSource, 'https://fonts.googleapis.com'],
		// No scheme wildcard: enforced only where the tenant set is bounded, so
		// the usual "tenant logos are unknowable" argument does not apply.
		//
		// This blocks the images.ctfassets.net background in stock flow templates,
		// on purpose - a private deployment must not fetch from a third-party CDN.
		// Fix the template, do not add the origin here.
		'img-src': ["'self'", 'data:', 'https://imgs.descope.com'],
		// The web component ships its fonts alongside the bundle.
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
		// useOidcMfa checks a redirect against this list and then POSTs to it;
		// without them the browser blocks the submit that check just approved.
		'form-action': ["'self'", ...APPROVED_OIDC_MFA_URLS],
		'base-uri': ["'self'"]
	};

	// Not known at build time - one image serves every environment - so the baked
	// policy leaves them to Caddy. Without this it blocks every API and config
	// fetch and no flow loads.
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

// No report-uri or report-to: violations are read from the browser console
// during manual measurement.
const CSP_HEADER_NAME = 'Content-Security-Policy-Report-Only';

// Policy only. nosniff and Referrer-Policy come from vercel.json, since the
// middleware matcher skips static assets and would leave them uncovered.
const cspHeaders = (options = {}, env = process.env) => ({
	[CSP_HEADER_NAME]: mkCsp(env, options)
});

module.exports = {
	mkCsp,
	cspHeaders,
	CSP_HEADER_NAME
};
