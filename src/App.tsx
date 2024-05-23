import './App.css';
import React from 'react';
import { AuthProvider, Descope } from '@descope/react-sdk';
import clsx from 'clsx';
import Welcome from './components/Welcome';
import Done from './components/Done';

const projectRegex = /^P[a-zA-Z0-9]{27}$/;

const App = () => {
	let baseUrl = process.env.REACT_APP_DESCOPE_BASE_URL;

	if (process.env.REACT_APP_USE_ORIGIN_BASE_URL)
		baseUrl = window.location.origin;

	let projectId = '';

	// first, take project id from env
	const envProjectId = projectRegex.exec(
		process.env.DESCOPE_PROJECT_ID ?? ''
	)?.[0];

	// If exists in URI use it, otherwise use env
	const pathnameProjectId = projectRegex.exec(
		window.location.pathname?.split('/').at(-1) || ''
	)?.[0];
	projectId = pathnameProjectId ?? envProjectId ?? '';

	const urlParams = new URLSearchParams(window.location.search);

	const flowId =
		urlParams.get('flow') || process.env.DESCOPE_FLOW_ID || 'sign-up-or-in';

	const debug =
		urlParams.get('debug') === 'true' ||
		process.env.DESCOPE_FLOW_DEBUG === 'true';

	const done = urlParams.get('done') || false;

	const tenantId = urlParams.get('tenant') || process.env.DESCOPE_TENANT_ID;

	const backgroundColor = urlParams.get('bg') || process.env.DESCOPE_BG_COLOR;

	const isWideContainer =
		urlParams.get('wide') === 'true' ||
		flowId === 'saml-config' ||
		flowId === 'sso-config';

	const containerClasses = clsx('descope-base-container', {
		'descope-wide-container': isWideContainer,
		'descope-login-container': !isWideContainer
	});

	const flowProps = {
		flowId,
		debug,
		tenant: tenantId,
		...((flowId === 'saml-config' || flowId === 'sso-config') && {
			autoFocus: false,
			onSuccess: () => {
				let search = window?.location.search;
				if (search) {
					search = `${search}&done=true`;
				} else {
					search = `?done=true`;
				}
				window?.location.assign(
					`${window?.location.origin}/${window?.location.pathname}${search}`
				);
			}
		})
	};

	return (
		<AuthProvider projectId={projectId} baseUrl={baseUrl}>
			<div className="app" style={{ backgroundColor }}>
				{!done && projectId && flowId && (
					<div className={containerClasses} data-testid="descope-component">
						<Descope {...flowProps} />
					</div>
				)}
				{!done && (!projectId || !flowId) && <Welcome />}
				{done && <Done />}
			</div>
		</AuthProvider>
	);
};

export default App;
