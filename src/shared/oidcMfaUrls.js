// The only origins this app is allowed to POST the OIDC MFA form to.
//
// Shared with the Content-Security-Policy: useOidcMfa checks a redirect URL
// against this list before submitting, and form-action has to permit the same
// origins or the browser blocks the submit the check just approved.
//
// CommonJS rather than TypeScript because config/cspPlugin.js require()s the
// policy module at build time, and a webpack config cannot import TypeScript.
const APPROVED_OIDC_MFA_URLS = [
	'https://login.microsoftonline.com',
	'https://login.microsoftonline.us',
	'https://login.partner.microsoftonline.cn'
];

module.exports = { APPROVED_OIDC_MFA_URLS };
