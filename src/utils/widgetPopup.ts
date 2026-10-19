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
const WIDGET_FLOW_HELLO = 'widget-flow-hello';
const WIDGET_FLOW_HELLO_ACK = 'widget-flow-hello-ack';

/**
 * The opener is already listening before it opens this window, so a real answer
 * comes back in single-digit milliseconds. This only has to cover a busy main
 * thread. It is also how long the flow is held back when nobody answers, which
 * is why it is not generous.
 */
const HELLO_TIMEOUT_MS = 1000;

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
 * The origin the opener stamped on `window.name`, or '' when this is not a
 * widget popup.
 *
 * This is a CLAIM, not a fact: anyone can open this page with any window name,
 * so a hostile page can claim to be the customer's app. Only `FlowGate` should
 * read it, to ask the backend whether the project trusts that origin.
 * Everything that reports back goes through `widgetOpenerOrigin` instead.
 */
const claimedWidgetOpenerOrigin = (): string => {
	const [prefix, origin] = (window.name || '').split('|');
	return prefix === WIDGET_POPUP_NAME_PREFIX && origin ? origin : '';
};

/**
 * Starts false and only `FlowGate` sets it, once the backend has confirmed the
 * claimed origin is one of the project's trusted domains. Nothing is reported
 * before then, so a flow that finishes early cannot beat the check.
 *
 * Without this, any page could open us and learn from the message it gets back
 * whether the visitor has a session on the customer's auth domain.
 */
let openerApproved = false;

const setWidgetOpenerApproved = (approved: boolean) => {
	openerApproved = approved;
};

/**
 * The origin we may talk to: the claimed one, but only after it was approved.
 * '' on a normal hosted login and on an opener the project does not trust,
 * which is what makes both report paths inert.
 */
const widgetOpenerOrigin = (): string =>
	openerApproved ? claimedWidgetOpenerOrigin() : '';

/**
 * Only has to be unique per window, not secret: a page at another origin never
 * receives the hello, and cannot fake the origin stamp on its answer. So the
 * weak fallback is fine where crypto.randomUUID is missing.
 */
const newNonce = (): string =>
	window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

/**
 * Asks the opener to prove it really is at the origin it claims.
 *
 * Checking the claim against the project's trusted domains is not enough on its
 * own: a hostile page can claim the customer's real app origin, which IS
 * trusted. The browser then refuses to deliver our postMessage, but closing the
 * window is still visible through `popup.closed`, and whether we close tells the
 * hostile page whether the visitor has a session here.
 *
 * So we post a one-time code TO the claimed origin and wait for it to come back.
 * Only a page actually at that origin can receive it, and `event.origin` is set
 * by the browser, so it cannot be forged on the way back.
 *
 * Resolves false on timeout, which is what an opener that does not speak this
 * protocol looks like. Then nothing is reported and nothing is closed.
 */
const confirmWidgetOpener = (
	timeoutMs: number = HELLO_TIMEOUT_MS
): Promise<boolean> => {
	const claimedOrigin = claimedWidgetOpenerOrigin();
	const { opener } = window;
	if (!claimedOrigin || !opener) return Promise.resolve(false);

	const nonce = newNonce();

	return new Promise<boolean>((resolve) => {
		const listening = new AbortController();
		let timer: ReturnType<typeof setTimeout> | undefined;

		const settle = (confirmed: boolean) => {
			clearTimeout(timer);
			listening.abort();
			resolve(confirmed);
		};

		window.addEventListener(
			'message',
			(event: MessageEvent) => {
				if (event.source !== opener) return;
				// set by the browser, not by the sender - this is the whole proof
				if (event.origin !== claimedOrigin) return;
				if (event.data?.action !== WIDGET_FLOW_HELLO_ACK) return;
				if (event.data?.nonce !== nonce) return;
				settle(true);
			},
			{ signal: listening.signal }
		);
		timer = setTimeout(() => settle(false), timeoutMs);

		try {
			opener.postMessage({ action: WIDGET_FLOW_HELLO, nonce }, claimedOrigin);
		} catch (e) {
			// COOP can sever window.opener between the read above and here
			logger.error('Could not reach the window that opened this one', e);
			settle(false);
		}
	});
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
	WIDGET_FLOW_HELLO,
	WIDGET_FLOW_HELLO_ACK,
	confirmWidgetOpener,
	isNoSessionError,
	claimedWidgetOpenerOrigin,
	setWidgetOpenerApproved,
	widgetOpenerOrigin,
	reportWidgetFlowFinished,
	reportWidgetFlowUnauthenticated,
	getFormParams
};
