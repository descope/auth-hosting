import './App.css';
import React, { useState } from 'react';
import { AuthProvider, Descope } from '@descope/react-sdk';
import Welcome from './components/Welcome';

const projectRegex = /^P[a-zA-Z0-9]{27}$/;

const App = () => {
	const [error, setError] = useState(false);

	const baseUrl = process.env.REACT_APP_DESCOPE_BASE_URL || '';

	let projectId = '';

	// first, take project id from env
	const envProjectId = process.env.DESCOPE_PROJECT_ID;
	if (envProjectId && projectRegex.test(envProjectId)) {
		projectId = envProjectId;
	}

	// If exists in URI we will take it from the URI
	const pathnameProjectId = window.location.pathname?.split('/').at(-1) || '';
	if (pathnameProjectId) {
		if (projectRegex.test(pathnameProjectId)) {
			projectId = pathnameProjectId;
		} else {
			console.log(`Invalid Project ID: ${pathnameProjectId}`); // eslint-disable-line
		}
	}

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
					<Welcome />
				)}
			</div>
		</AuthProvider>
	);
};

export default App;
