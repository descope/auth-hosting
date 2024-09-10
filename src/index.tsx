import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import SamlError from './SamlError';

const contentBaseUrl = process.env.REACT_APP_CONTENT_BASE_URL;
if (contentBaseUrl) {
	localStorage.setItem('base.content.url', contentBaseUrl);
}

const root = ReactDOM.createRoot(
	document.getElementById('root') as HTMLElement
);

const routerSwitch = (page: string) => {
	switch (page) {
		case '/login/saml-error':
			return <SamlError />;
		default:
			return <App />;
	}
};

root.render(
	<React.StrictMode>{routerSwitch(window.location.pathname)}</React.StrictMode>
);
