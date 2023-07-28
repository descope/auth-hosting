import './App.css';
import React, { useState } from 'react';
import { AuthProvider, Descope } from '@descope/react-sdk';
import Welcome from './components/Welcome';

const projectRegex = /^P[a-zA-Z0-9]{27}$/;

const App = () => {
	const [error, setError] = useState(false);

	const baseUrl =
		process.env.REACT_APP_DESCOPE_BASE_URL || window.location.origin;

	let projectId = '';

	// first, take project id from env
	const envProjectId = projectRegex.exec(
		process.env.DESCOPE_PROJECT_ID ?? ''
	)?.[0];

	// If exists in URI we will take it from the URI and save it in local storage
	const pathnameProjectId = window.location.pathname?.split('/').at(-1) || '';
	if (pathnameProjectId && projectRegex.test(pathnameProjectId)) {
		projectId = pathnameProjectId;
		window.localStorage.setItem('descope-project-id', projectId);
		window.location.pathname = window.location.pathname.replace(projectId, '');
	}

	projectId =
		window.localStorage.getItem('descope-project-id') ?? envProjectId ?? '';

	const urlParams = new URLSearchParams(window.location.search);

	const flowId =
		urlParams.get('flow') || process.env.DESCOPE_FLOW_ID || 'sign-up-or-in';

	const debug =
		urlParams.get('debug') === 'true' ||
		process.env.DESCOPE_FLOW_DEBUG === 'true';

	return (
		<AuthProvider projectId={projectId} baseUrl={baseUrl}>
			<div className="app">
				{projectId && flowId && !error ? (
					<div className="descope-container" data-testid="descope-component">
						<Descope
							flowId={flowId}
							debug={debug}
							onError={() => setError(true)}
						/>
					</div>
				) : (
					<Welcome baseUrl={baseUrl} />
				)}
			</div>
		</AuthProvider>
	);
};

export default App;
