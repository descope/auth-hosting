import './App.css';
import React, { useEffect, useState } from 'react';
import { AuthProvider, Descope } from '@descope-int/react-dynamic-sdk';
import clsx from 'clsx';
import Welcome from './components/Welcome';
import Done from './components/Done';

const projectRegex = /^P([a-zA-Z0-9]{27}|[a-zA-Z0-9]{31})$/;
const ssoAppRegex = /^[a-zA-Z0-9\-_]{1,30}$/;

const getV2Config = (projectId: string, cb: (res: any) => void) => {
	const baseUrl =
		window.localStorage.getItem('base.content.url') ||
		'https://static.descope.com/pages';
	fetch(`${baseUrl}/${projectId}/v2-beta/config.json`).then((res) =>
		cb(res.ok)
	);
};

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

const getExistingFaviconUrl = async (baseUrl: string, url: string) => {
	try {
		const response = await fetch(
			`${baseUrl}/api/favicon?url=${encodeURIComponent(url)}`
		);
		if (response.ok) {
			const data = await response.json();
			return data?.faviconUrl || '';
		}
		return '';
	} catch (error) {
		return '';
	}
};

const App = () => {
	let baseUrl = process.env.REACT_APP_DESCOPE_BASE_URL;

	// Force origin base URL
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

	const [isV2, setIsV2] = useState(null);

	useEffect(() => {
		getV2Config(projectId, (success) => {
			setIsV2(success);
		});
	}, [projectId]);

	const urlParams = React.useMemo(
		() => new URLSearchParams(window.location.search),
		[]
	);

	const baseFunctionsUrl = process.env.REACT_APP_BASE_FUNCTIONS_URL || '';

	const faviconUrl = process.env.REACT_APP_FAVICON_URL || '';

	let ssoAppId = urlParams.get('sso_app_id') || '';
	ssoAppId = ssoAppRegex.exec(ssoAppId)?.[0] || '';

	const [ref, setRef] = useState<Element | null>(null);

	React.useEffect(() => {
		const updateFavicon = async () => {
			if (faviconUrl && ssoAppId && projectId) {
				let favicon = faviconUrl;
				// projectId and ssoAppId have been sanitized already
				favicon = favicon.replace('{projectId}', projectId);
				favicon = favicon.replace('{ssoAppId}', ssoAppId);

				if (isFaviconUrlSecure(favicon, faviconUrl)) {
					const existingFaviconUrl = await getExistingFaviconUrl(
						baseFunctionsUrl,
						favicon
					);
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
	}, [baseFunctionsUrl, faviconUrl, projectId, ssoAppId]);

	// this is a workaround only for the dynamic sdk, should not be used in other places
	useEffect(() => {
		const internalId = setInterval(() => {
			const descopeWcEle = document.querySelector('descope-wc');
			if (descopeWcEle) {
				clearInterval(internalId);
				setRef(descopeWcEle);
			}
		}, 50);
	}, [setRef]);

	const styleId = urlParams.get('style') || process.env.DESCOPE_STYLE_ID;

	useEffect(() => {
		if (!ref) return;
		if (styleId) ref.setAttribute('style-id', styleId);
		else ref.removeAttribute('style-id');
	}, [ref, styleId]);

	if (isV2 === null) {
		return null;
	}

	const flowId =
		urlParams.get('flow') || process.env.DESCOPE_FLOW_ID || 'sign-up-or-in';

	const debug =
		urlParams.get('debug') === 'true' ||
		process.env.DESCOPE_FLOW_DEBUG === 'true';

	const done = urlParams.get('done') || false;

	const locale = urlParams.get('locale') || process.env.DESCOPE_LOCALE;

	const tenantId = urlParams.get('tenant') || process.env.DESCOPE_TENANT_ID;

	const backgroundColor = urlParams.get('bg') || process.env.DESCOPE_BG_COLOR;

	const theme = (urlParams.get('theme') ||
		process.env.DESCOPE_FLOW_THEME) as React.ComponentProps<
		typeof Descope
	>['theme'];

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
				window?.location.assign(
					`${window?.location.origin}/${window?.location.pathname}${search}`
				);
			}
		})
	};

	return (
		<AuthProvider
			projectId={projectId}
			baseUrl={baseUrl}
			sdkVersion={isV2 ? 'v2' : 'v1'}
		>
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
