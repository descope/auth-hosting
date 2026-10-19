import { logger } from './logger';

/**
 * Support for being opened as a popup by a Descope widget.
 *
 * A passkey belongs to the domain that created it, so a customer with apps on
 * several domains runs the widget's flows in a popup on their shared auth
 * domain - this page - where the passkey is bound once and works from all of
 * them.
 *
 * Everything here is inert unless the widget asked for it. auth-hosting is one
 * deployment serving every customer's custom domain, so a normal hosted login
 * must behave exactly as it did before, and `widgetOpenerOrigin()` is empty
 * without the window name the widget stamps.
 */

const WIDGET_POPUP_NAME_PREFIX = 'descope-widget-flow';
const WIDGET_FLOW_DONE = 'widget-flow-done';
const WIDGET_FLOW_UNAUTHENTICATED = 'widget-flow-unauthenticated';

/**
 * Backend codes meaning "no usable session on this domain". The widget turns
 * this into its existing `logout` event so the app can re-authenticate, which
 * signs the user in here too. We deliberately do not treat every error this
 * way - anything else is a real error and must surface as one.
 */
const NO_SESSION_ERROR_CODES = ['E064002', 'E064003'];

const isNoSessionError = (detail: { errorCode?: string } | undefined) =>
	!!detail?.errorCode && NO_SESSION_ERROR_CODES.includes(detail.errorCode);

/**
 * The origin the widget stamped on `window.name` when it opened us, or '' when
 * this is not a widget popup. Self-declared by the opener, which is acceptable
 * because the only thing ever sent back is "finished" - never a token. The app
 * re-establishes its own session with its own refresh token.
 */
const widgetOpenerOrigin = (): string => {
	const [prefix, origin] = (window.name || '').split('|');
	return prefix === WIDGET_POPUP_NAME_PREFIX && origin ? origin : '';
};

const postToOpener = (action: string, openerOrigin: string) => {
	try {
		window.opener?.postMessage({ action }, openerOrigin);
	} catch (e) {
		// COOP can sever window.opener. The widget also polls for the window
		// closing, so closing is still the right move.
		logger.error('Could not reach the widget that opened this window', e);
	}
	try {
		window.close();
	} catch (e) {
		logger.error('Could not close the widget popup', e);
	}
};

/**
 * Tell the widget the flow finished. Returns true when this window was a widget
 * popup and has been dealt with, so the caller should stop.
 *
 * Only the popup itself can reach the app - it is the window holding the
 * opener. A flow that finishes somewhere else, such as the tab an emailed link
 * opens, cannot report from there; the widget finds out instead when the user
 * returns to the app, which it watches for.
 */
const reportWidgetFlowFinished = (): boolean => {
	const openerOrigin = widgetOpenerOrigin();
	if (!openerOrigin) return false;
	postToOpener(WIDGET_FLOW_DONE, openerOrigin);
	return true;
};

/**
 * Tell the widget we do not know who the user is, so it can hand back to the
 * app. The popup never signs anyone in: it cannot choose how (it runs the
 * customer's own sign-in flow, which may send a link and strand the user in
 * another tab), and login belongs to the app, whose OIDC redirect re-establishes
 * the session here as well.
 */
const reportWidgetFlowUnauthenticated = (): boolean => {
	const openerOrigin = widgetOpenerOrigin();
	if (!openerOrigin) return false;
	postToOpener(WIDGET_FLOW_UNAUTHENTICATED, openerOrigin);
	return true;
};

/**
 * `form.<key>=value` becomes `{ key: value }`, mirroring `getClientParams`.
 *
 * Load-bearing for the user profile widget: removing one specific passkey
 * passes `form: { externalId, credentialId }`, and without this the flow has no
 * way to know which passkey to remove.
 */
const getFormParams = (urlParams: URLSearchParams) => {
	const formParams: { [key: string]: string } = {};
	Array.from(urlParams.entries()).forEach(([key, value]) => {
		if (key.startsWith('form.')) {
			formParams[key.replace('form.', '')] = value;
		}
	});
	return formParams;
};

export {
	WIDGET_POPUP_NAME_PREFIX,
	WIDGET_FLOW_DONE,
	WIDGET_FLOW_UNAUTHENTICATED,
	isNoSessionError,
	widgetOpenerOrigin,
	reportWidgetFlowFinished,
	reportWidgetFlowUnauthenticated,
	getFormParams
};
