import React, { PropsWithChildren, useEffect, useState } from 'react';
import ErrorScreen from '../Error';
import { AUTH_HOSTING_HEADER } from '../shared/authHostingHeader';

type FlowGateProps = PropsWithChildren<{
	baseUrl: string | undefined;
	projectId: string;
}>;

// Blocks the flow from rendering when the orchestration service reports the
// current domain is not approved. The endpoint always returns HTTP 200 with
// { success }; we fail open on any error so a transient failure never blocks.
const FlowGate: React.FC<FlowGateProps> = ({
	baseUrl,
	projectId,
	children
}) => {
	const [blocked, setBlocked] = useState(false);

	useEffect(() => {
		if (!baseUrl || !projectId) {
			return undefined;
		}
		let active = true;
		fetch(`${baseUrl.replace(/\/+$/, '')}/v1/flow/validate-domain`, {
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
			.then((body) => {
				if (active && body && body.success !== true) {
					setBlocked(true);
				}
			})
			.catch(() => {
				// Fail open: the backend still enforces the check.
			});
		return () => {
			active = false;
		};
	}, [baseUrl, projectId]);

	if (blocked) {
		return <ErrorScreen />;
	}

	return children as React.ReactElement;
};

export default FlowGate;
