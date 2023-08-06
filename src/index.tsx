import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const contentBaseUrl = process.env.REACT_APP_CONTENT_BASE_URL;
if (contentBaseUrl) {
	localStorage.setItem('base.content.url', contentBaseUrl);
}

const root = ReactDOM.createRoot(
	document.getElementById('root') as HTMLElement
);
root.render(
	<React.StrictMode>
		<App />
	</React.StrictMode>
);
