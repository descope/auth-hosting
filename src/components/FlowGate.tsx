import React, { PropsWithChildren, useEffect, useState } from 'react';
import ErrorScreen from '../Error';
import NotFound from './NotFound';

type FlowGateProps = PropsWithChildren<{
	baseUrl: string | undefined;
	projectId: string;
}>;

type GateState = 'open' | 'blocked' | 'disabled';

// Blocks the flow from rendering for two independent reasons:
//
//   - the orchestration service reports the current domain is not approved, and
//   - the project turned the Descope-hosted flow pages off entirely.
//
// The second is read from the project's public configuration rather than from the
// domain check, because the domain check only refuses once the backend's block flag
// is on, while a project that ticked the setting expects the page gone right away.
// On Vercel the middleware already refuses the document, but the Caddy-served and
// custom-domain copies of this app have no middleware, so the check has to live here.
//
// Both fail open on any error, so a transient failure never locks users out of a
// working login page; the backend still enforces the domain check on its own.
const FlowGate: React.FC<FlowGateProps> = ({
	baseUrl,
	projectId,
	children
}) => {
	const [state, setState] = useState<GateState>('open');

	useEffect(() => {
		if (!baseUrl || !projectId) {
			return undefined;
		}
		let active = true;
		const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');

		fetch(`${normalizedBaseUrl}/v1/flow/validate-domain`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${projectId}`,
				'x-descope-project-id': projectId
			}
		})
			.then((res) => (res.ok ? res.json() : undefined))
			.then((body) => {
				if (active && body && body.success !== true) {
					// The two requests race, and the not-found screen is the more specific
					// answer, so it is never overwritten by the generic domain error.
					// The two requests race, and the not-found screen is the more specific
					// answer, so it is never overwritten by the generic domain error.
					setState((prev) => (prev === 'disabled' ? prev : 'blocked'));
				}
			})
			.catch(() => {
				// Fail open: the backend still enforces the check.
			});

		fetch(`${normalizedBaseUrl}/.well-known/project-configuration/${projectId}`)
			.then((res) => (res.ok ? res.json() : undefined))
			.then((config) => {
				// Only an explicit true disables the page: a project that predates the
				// field, or a response we could not read, keeps serving.
				if (active && config && config.disableAuthHosting === true) {
					setState('disabled');
				}
			})
			.catch(() => {
				// Fail open, as above.
			});

		return () => {
			active = false;
		};
	}, [baseUrl, projectId]);

	if (state === 'disabled') {
		return <NotFound />;
	}

	if (state === 'blocked') {
		return <ErrorScreen />;
	}

	return children as React.ReactElement;
};

export default FlowGate;
