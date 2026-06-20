import { useDescope } from '@descope/react-sdk';
import React, { PropsWithChildren, useEffect, useState } from 'react';
import ErrorScreen from '../Error';

// FlowNotApprovedDomain error code returned by the orchestration service when a
// flow runs from a domain that is not approved for the project.
const FLOW_NOT_APPROVED_DOMAIN_CODE = '8202';

// Probe the flow API before rendering the flow. The orchestration service
// validates the request domain before loading any execution, so throwaway
// identifiers are enough to detect an unapproved domain without side effects.
const FlowGate: React.FC<PropsWithChildren> = ({ children }) => {
	const sdk = useDescope();
	const [blocked, setBlocked] = useState(false);

	useEffect(() => {
		let active = true;
		Promise.resolve()
			.then(() => sdk.flow.next('probe', 'probe', 'probe'))
			.then((resp) => {
				if (
					active &&
					resp?.error?.errorCode === FLOW_NOT_APPROVED_DOMAIN_CODE
				) {
					setBlocked(true);
				}
			})
			.catch(() => {
				// Fail open: the backend still enforces the domain check.
			});
		return () => {
			active = false;
		};
	}, [sdk]);

	if (blocked) {
		return <ErrorScreen />;
	}

	return children as React.ReactElement;
};

export default FlowGate;
