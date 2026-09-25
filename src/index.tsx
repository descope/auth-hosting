import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { env } from './env';
import Error from './Error';
import { initOidcSession } from './utils/oidcSession';

const contentBaseUrl = env.REACT_APP_CONTENT_BASE_URL?.startsWith('/')
	? window.location.origin + env.REACT_APP_CONTENT_BASE_URL
	: env.REACT_APP_CONTENT_BASE_URL;

if (contentBaseUrl) {
	localStorage.setItem('base.content.url', contentBaseUrl);
}

// Restore OIDC session params into the URL before React renders so that
// App.tsx's useMemo sees the full context even after a mid-flow page refresh.
initOidcSession();

const root = ReactDOM.createRoot(
	document.getElementById('root') as HTMLElement
);

const routerSwitch = (page: string) => {
	switch (page) {
		case '/login/saml-error':
		case '/login/error':
			return <Error />;
		default:
			return <App />;
	}
};

root.render(
	<React.StrictMode>{routerSwitch(window.location.pathname)}</React.StrictMode>
);
