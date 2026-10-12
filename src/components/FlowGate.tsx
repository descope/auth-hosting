import React, { PropsWithChildren, useEffect, useRef, useState } from 'react';
import ErrorScreen from '../Error';

type FlowGateProps = PropsWithChildren<{
	baseUrl: string | undefined;
	projectId: string;
	// Lets the caller drop UI layered over the flow (such as the loading
	// overlay) once the flow is replaced by the error screen.
	onBlockedChange: (blocked: boolean) => void;
}>;

// Blocks the flow from rendering when the orchestration service reports the
// current domain is not approved. The endpoint always returns HTTP 200 with
// { success }; we fail open on any error so a transient failure never blocks.
const FlowGate: React.FC<FlowGateProps> = ({
	baseUrl,
	projectId,
	onBlockedChange,
	children
}) => {
	const [blocked, setBlocked] = useState(false);

	// Held in a ref so an unmemoized callback cannot re-trigger the request.
	const onBlockedChangeRef = useRef(onBlockedChange);
	useEffect(() => {
		onBlockedChangeRef.current = onBlockedChange;
	}, [onBlockedChange]);

	useEffect(() => {
		if (!baseUrl || !projectId) {
			return undefined;
		}
		let active = true;
		fetch(`${baseUrl.replace(/\/+$/, '')}/v1/flow/validate-domain`, {
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
					onBlockedChangeRef.current(true);
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
