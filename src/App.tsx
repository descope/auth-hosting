import './App.css';
import React from 'react';
import { AuthProvider, Descope } from '@descope/react-sdk';
import clsx from 'clsx';
import Welcome from './components/Welcome';
import Done from './components/Done';

const projectRegex = /^P[a-zA-Z0-9]{27}$/;
const ssoAppRegex = /^[a-zA-Z0-9\-_]{1,30}$/;

const isFaviconUrlSecure = (url: string, originalFaviconUrl: string) => {
	try {
		const parsedUrl = new URL(url);
		const parsedOriginalUrl = new URL(originalFaviconUrl);
		return (
			parsedUrl.protocol === 'https:' &&
			parsedUrl.hostname === parsedOriginalUrl.hostname
		);
	} catch (error) {
		return false;
	}
};

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

	const urlParams = React.useMemo(
		() => new URLSearchParams(window.location.search),
		[]
	);

	const flowId =
		urlParams.get('flow') || process.env.DESCOPE_FLOW_ID || 'sign-up-or-in';

	const debug =
		urlParams.get('debug') === 'true' ||
		process.env.DESCOPE_FLOW_DEBUG === 'true';

	const done = urlParams.get('done') || false;

	const tenantId = urlParams.get('tenant') || process.env.DESCOPE_TENANT_ID;

	const backgroundColor = urlParams.get('bg') || process.env.DESCOPE_BG_COLOR;

	const faviconUrl = process.env.REACT_APP_FAVICON_URL || '';

	let ssoAppId = urlParams.get('sso_app_id') || '';
	ssoAppId = ssoAppRegex.exec(ssoAppId)?.[0] || '';

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

	React.useEffect(() => {
		const updateFavicon = async () => {
			if (faviconUrl && ssoAppId && projectId) {
				let favicon = faviconUrl;
				// projectId and ssoAppId have been sanitized already
				favicon = favicon.replace('{projectId}', projectId);
				favicon = favicon.replace('{ssoAppId}', ssoAppId);

				const validateFaviconUrl = (url: string) =>
					new Promise((resolve) => {
						const img = new Image();
						img.onload = () => resolve(true);
						img.onerror = () => resolve(false);
						img.src = url;
					});

				if (isFaviconUrlSecure(favicon, faviconUrl)) {
					const isValid = await validateFaviconUrl(favicon);
					if (isValid) {
						let link = document.querySelector(
							"link[rel~='icon']"
						) as HTMLLinkElement;
						if (!link) {
							link = document.createElement('link');
							link.rel = 'icon';
							document.getElementsByTagName('head')[0].appendChild(link);
						}
						link.href = favicon;
					}
				}
			}
		};

		updateFavicon();
	}, [faviconUrl, projectId, ssoAppId]);

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
