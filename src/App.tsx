import { AuthProvider, Descope } from '@descope/react-sdk';
import clsx from 'clsx';
import React, { useEffect, useMemo } from 'react';
import './App.css';
import Done from './components/Done';
import Welcome from './components/Welcome';
import useOidcMfa from './hooks/useOidcMfa';
import { env } from './env';

const projectRegex = /^P([a-zA-Z0-9]{27}|[a-zA-Z0-9]{31})$/;
const ssoAppRegex = /^[a-zA-Z0-9\-_]{1,30}$/;
const defaultFaviconUrl = env.REACT_APP_FAVICON_URL || '';

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

const getExistingFaviconUrl = async (url: string) => {
	try {
		const response = await fetch(url);
		if (response.ok) {
			return url;
		}
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error(error);
	}
	return defaultFaviconUrl;
};

const App = () => {
	let baseUrl = env.REACT_APP_DESCOPE_BASE_URL;

	// Force origin base URL
	if (env.REACT_APP_USE_ORIGIN_BASE_URL === 'true')
		baseUrl = window.location.origin;

	let projectId = '';

	// first, take project id from env
	const envProjectId = projectRegex.exec(env.DESCOPE_PROJECT_ID ?? '')?.[0];

	// If exists in URI use it, otherwise use env
	const pathnameProjectId = projectRegex.exec(
		window.location.pathname?.split('/').at(-1) || ''
	)?.[0];
	projectId = pathnameProjectId ?? envProjectId ?? '';

	useOidcMfa();

	const urlParams = useMemo(
		() => new URLSearchParams(window.location.search),
		[]
	);

	const baseFunctionsUrl = env.REACT_APP_BASE_FUNCTIONS_URL || '';

	let ssoAppId = urlParams.get('sso_app_id') || '';
	ssoAppId = ssoAppRegex.exec(ssoAppId)?.[0] || '';

	useEffect(() => {
		const updateFavicon = async () => {
			if (defaultFaviconUrl && ssoAppId && projectId) {
				let favicon = defaultFaviconUrl;
				// projectId and ssoAppId have been sanitized already
				favicon = favicon.replace('{projectId}', projectId);
				favicon = favicon.replace('{ssoAppId}', ssoAppId);

				if (isFaviconUrlSecure(favicon, defaultFaviconUrl)) {
					const existingFaviconUrl = await getExistingFaviconUrl(favicon);
					if (existingFaviconUrl) {
						let link = document.querySelector(
							"link[rel~='icon']"
						) as HTMLLinkElement;
						if (!link) {
							link = document.createElement('link');
							link.rel = 'icon';
							document.getElementsByTagName('head')[0].appendChild(link);
						}
						link.href = existingFaviconUrl;
					}
				}
			}
		};

		updateFavicon();
	}, [baseFunctionsUrl, projectId, ssoAppId]);

	const styleId = urlParams.get('style') || env.DESCOPE_STYLE_ID;

	const flowId =
		urlParams.get('flow') || env.DESCOPE_FLOW_ID || 'sign-up-or-in';

	const debug =
		urlParams.get('debug') === 'true' || env.DESCOPE_FLOW_DEBUG === 'true';

	const done = urlParams.get('done') || false;

	const locale = urlParams.get('locale') || env.DESCOPE_LOCALE;

	const tenantId = urlParams.get('tenant') || env.DESCOPE_TENANT_ID;

	const backgroundColor = urlParams.get('bg') || env.DESCOPE_BG_COLOR;

	const theme = (urlParams.get('theme') ||
		env.DESCOPE_FLOW_THEME) as React.ComponentProps<typeof Descope>['theme'];

	const isWideContainer =
		urlParams.get('wide') === 'true' ||
		flowId === 'saml-config' ||
		flowId === 'sso-config';

	const shadow = urlParams.get('shadow') !== 'false';

	const containerClasses = clsx({
		'descope-base-container': shadow,
		'descope-wide-container': isWideContainer,
		'descope-login-container': !isWideContainer
	});

	const flowProps = {
		flowId,
		debug,
		locale,
		tenant: tenantId,
		theme,
		styleId,
		...((flowId === 'saml-config' || flowId === 'sso-config') && {
			autoFocus: false,
			onSuccess: () => {
				let search = window?.location.search;
				if (search) {
					search = `${search}&done=true`;
				} else {
					search = `?done=true`;
				}
				// build the new URL
				const newUrl = new URL(window?.location.origin);
				newUrl.pathname = window?.location.pathname;
				newUrl.search = search;
				window?.location.assign(newUrl.toString());
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
