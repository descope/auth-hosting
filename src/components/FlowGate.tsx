import React, { PropsWithChildren, useEffect, useState } from 'react';
import ErrorScreen from '../Error';
import {
	claimedWidgetOpenerOrigin,
	setWidgetOpenerApproved
} from '../utils/widgetPopup';

type FlowGateProps = PropsWithChildren<{
	baseUrl: string | undefined;
	projectId: string;
}>;

// Blocks the flow from rendering when the orchestration service reports the
// current domain is not approved. The endpoint always returns HTTP 200 with
// { success, openerApproved }; we fail open on any error so a transient failure
// never blocks.
//
// The same call answers a second question when this window is a widget popup:
// whoever opened us wrote their own origin into window.name, so we ask whether
// the project's trusted domains cover it. We hold the flow back until that
// answer arrives, because a flow that finishes first would report to an origin
// we had not checked. Reporting fails closed - an unapproved or unknown opener
// is told nothing, and this page behaves like an ordinary hosted login.
const FlowGate: React.FC<FlowGateProps> = ({
	baseUrl,
	projectId,
	children
}) => {
	const [blocked, setBlocked] = useState(false);
	const [waitingForOpener, setWaitingForOpener] = useState(() =>
		Boolean(claimedWidgetOpenerOrigin())
	);

	useEffect(() => {
		let active = true;
		const settleOpener = (approved: boolean) => {
			if (!active) return;
			if (!approved && claimedWidgetOpenerOrigin()) {
				// A configuration mistake looks exactly like an attack from here,
				// so say which domain to add rather than going quiet. Same reason
				// App.tsx reports a bad ?width= straight to the console: logger is
				// silent outside development, and this has to be visible in
				// production.
				// eslint-disable-next-line no-console
				console.error(
					`The page that opened this one, ${claimedWidgetOpenerOrigin()}, is not covered by this project's Trusted Domains, so the flow will not report back to it. Add that domain under Trusted Domains in the Descope console.`
				);
			}
			setWidgetOpenerApproved(approved);
			setWaitingForOpener(false);
		};

		if (!baseUrl || !projectId) {
			settleOpener(false);
			return undefined;
		}

		const url = new URL(
			`${baseUrl.replace(/\/+$/, '')}/v1/flow/validate-domain`
		);
		const openerOrigin = claimedWidgetOpenerOrigin();
		if (openerOrigin) {
			url.searchParams.set('openerOrigin', openerOrigin);
		}

		fetch(url.toString(), {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${projectId}`,
				'x-descope-project-id': projectId
			}
		})
			.then((res) => (res.ok ? res.json() : undefined))
			.then((body) => {
				if (active && body && body.success !== true) {
					setBlocked(true);
				}
				settleOpener(body?.openerApproved === true);
			})
			.catch(() => {
				// Rendering fails open: the backend still enforces the check.
				// Reporting fails closed: saying nothing is always safe.
				settleOpener(false);
			});
		return () => {
			active = false;
		};
	}, [baseUrl, projectId]);

	if (blocked) {
		return <ErrorScreen />;
	}

	if (waitingForOpener) {
		return null;
	}

	return children as React.ReactElement;
};

export default FlowGate;
