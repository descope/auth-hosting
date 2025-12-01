import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { env } from './env';
import Error from './Error';
import { ensureUrlHasOrigin } from './utils/url';

const contentBaseUrl = ensureUrlHasOrigin(env.REACT_APP_CONTENT_BASE_URL);

if (contentBaseUrl) {
	localStorage.setItem('base.content.url', contentBaseUrl);
}

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
