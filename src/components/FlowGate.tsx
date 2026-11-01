import React, { PropsWithChildren, useEffect, useState } from 'react';
import ErrorScreen from '../Error';
import { AUTH_HOSTING_HEADER } from '../shared/authHostingHeader';
import {
	claimedWidgetOpenerOrigin,
	confirmWidgetOpener,
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
// When this window is a widget popup there is a second question to answer, and
// it takes two separate checks that each cover the other's blind spot:
//
//   is the opener allowed?  -> openerApproved, the project's trusted domains
//   is it really there?     -> confirmWidgetOpener, the postMessage handshake
//
// Trusted domains alone lets a hostile page claim the customer's real app
// origin; the handshake alone lets it claim its own. Both must pass.
//
// The flow is held back until they do, because a flow that finished first would
// report to an opener we had not checked. Reporting fails closed - an opener we
// cannot vouch for is told nothing, and this page behaves like an ordinary
// hosted login.
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
		const openerOrigin = claimedWidgetOpenerOrigin();

		const settleOpener = (approved: boolean, reason?: string) => {
			if (!active) return;
			if (!approved && openerOrigin && reason) {
				// A configuration mistake looks exactly like an attack from here,
				// so say what to fix rather than going quiet. Same reason App.tsx
				// reports a bad ?width= straight to the console: logger is silent
				// outside development, and this has to be visible in production.
				// eslint-disable-next-line no-console
				console.error(reason);
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
		if (openerOrigin) {
			url.searchParams.set('openerOrigin', openerOrigin);
		}

		// Started now, not after the request: it is two postMessage calls inside
		// the browser, so running it alongside costs nothing.
		const handshake = openerOrigin
			? confirmWidgetOpener()
			: Promise.resolve(false);

		fetch(url.toString(), {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${projectId}`,
				'x-descope-project-id': projectId,
				// The same header the flow sends, so this asks the question the flow will be
				// asked: may the auth hosting app run this project's flow?
				[AUTH_HOSTING_HEADER]: '1'
			}
		})
			.then((res) => (res.ok ? res.json() : undefined))
			.then(async (body) => {
				if (active && body && body.success !== true) {
					setBlocked(true);
				}
				const trusted = body?.openerApproved === true;
				const real = await handshake;
				settleOpener(
					trusted && real,
					trusted
						? `The page that opened this one claims to be ${openerOrigin} but never answered the handshake, so the flow will not report back to it. An older widget version, or a page pretending to be that origin.`
						: `The page that opened this one, ${openerOrigin}, is not covered by this project's Trusted Domains, so the flow will not report back to it. Add that domain under Trusted Domains in the Descope console.`
				);
			})
			.catch(() => {
				// Rendering fails open: the backend still enforces the check.
				// Reporting fails closed: saying nothing is always safe.
				settleOpener(
					false,
					`Could not check the page that opened this one (${openerOrigin}), so the flow will not report back to it.`
				);
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
