import { AuthProvider, Descope } from '@descope/react-sdk';
import { FlowJWTResponse } from '@descope/web-component';
import clsx from 'clsx';
import React, { useEffect, useMemo, useCallback, CSSProperties } from 'react';
import './App.css';
import Done from './components/Done';
import Welcome from './components/Welcome';
import useOidcMfa from './hooks/useOidcMfa';
import { env } from './env';
import { logger } from './utils/logger';

const projectRegex = /^P([a-zA-Z0-9]{27}|[a-zA-Z0-9]{31})$/;
const ssoAppRegex = /^[a-zA-Z0-9\-_]{1,30}$/;

const isFaviconUrlSecure = (url: string) => {
	try {
		const parsedUrl = new URL(url);
		const isSecure = parsedUrl.protocol === 'https:';
		logger.log('Favicon URL security check:', {
			url,
			protocol: parsedUrl.protocol,
			hostname: parsedUrl.hostname,
			isSecure
		});
		return isSecure;
	} catch (error) {
		logger.error('Error checking favicon URL security:', error);
		return false;
	}
};

/// Parse the width & height options allowing amounts like "50%" or "800px"
const getSizingValue = ({
	urlParams,
	key,
	envVar
}: {
	urlParams: URLSearchParams;
	key: string;
	envVar: string;
}) => {
	const value = urlParams.get(key) ?? env[envVar];
	if (value === undefined) return undefined;

	const [match, amount, unit] = /^(\d+)(px|%)$/.exec(value ?? '') ?? [];

	if (!match) {
		// eslint-disable-next-line no-console
		console.error(`'${key}' is set to invalid value ${JSON.stringify(value)}`);
		return undefined;
	}

	const unitMapping: Record<string, string> = {
		px: 'px',
		'%': key === 'width' ? 'dvw' : 'dvh'
	};

	return parseInt(amount, 10) + unitMapping[unit];
};

const getClientParams = (urlParams: URLSearchParams) => {
	// Build an array of [key,value] pairs and filter those starting with the prefix.
	const clientParams: { [key: string]: string } = {};
	Array.from(urlParams.entries()).forEach(([key, value]) => {
		if (key.startsWith('client.')) {
			clientParams[key.replace('client.', '')] = value;
		}
	});
	return Object.keys(clientParams).length > 0 ? clientParams : undefined;
};

const getFaviconUrl = async (url: string, defaultFaviconUrl: string) => {
	logger.log('Attempting to fetch favicon from:', url);
	try {
		const response = await fetch(url);
		logger.log('Favicon fetch response:', response.status, response.ok);
		if (response.ok) {
			return new URL(url).href;
		}
	} catch (error) {
		logger.error('Error fetching favicon:', error);
	}
	logger.log('Falling back to default favicon:', defaultFaviconUrl);
	return new URL(defaultFaviconUrl).href;
};

const App = () => {
	let baseUrl = env.REACT_APP_DESCOPE_BASE_URL;
	const defaultFaviconUrl =
		env.REACT_APP_DEFAULT_FAVICON_URL || env.DEFAULT_FAVICON_URL || '';
	const faviconUrlTemplate =
		env.REACT_APP_FAVICON_URL_TEMPLATE || env.REACT_APP_FAVICON_URL || '';

	// Force origin base URL
	if (env.REACT_APP_USE_ORIGIN_BASE_URL === 'true')
		baseUrl = window.location.origin;

	let projectId = '';

	// first, take project id from env
	const envProjectId = projectRegex.exec(env.DESCOPE_PROJECT_ID ?? '')?.[0];

	// If exists in URI use it, otherwise use env
	const pathnameProjectId = projectRegex.exec(
		window.location.pathname?.split('/').pop() || ''
	)?.[0];
	projectId = pathnameProjectId ?? envProjectId ?? '';

	useOidcMfa();

	const urlParams = useMemo(
		() => new URLSearchParams(window.location.search),
		[]
	);

	let ssoAppId = urlParams.get('sso_app_id') || '';
	ssoAppId = ssoAppRegex.exec(ssoAppId)?.[0] || '';

	// Memoize updateFavicon with useCallback
	const updateFavicon = useCallback(async () => {
		logger.log('Starting favicon update with:', {
			defaultFaviconUrl,
			ssoAppId,
			projectId,
			faviconUrlTemplate
		});

		if (!defaultFaviconUrl) {
			logger.log('Missing defaultFaviconUrl skipping favicon update');
			return;
		}

		const faviconUrl = faviconUrlTemplate
			.replace('{projectId}', projectId)
			.replace('{ssoAppId}', ssoAppId);

		logger.log('Generated faviconUrl:', faviconUrl);

		if (!isFaviconUrlSecure(faviconUrl)) {
			logger.log('URL is not secure, using default favicon');
			return;
		}

		logger.log('URL is secure, fetching favicon...');

		// If ssoAppId is not provided, fallback to using the default favicon URL.
		let existingFaviconUrl = defaultFaviconUrl;
		if (ssoAppId) {
			logger.log('Checking custom favicon for ssoAppId:', ssoAppId);
			existingFaviconUrl = await getFaviconUrl(faviconUrl, defaultFaviconUrl);
		}

		let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
		if (!link) {
			logger.log('Creating new favicon link element');
			link = document.createElement('link');
			link.rel = 'icon';
			document.getElementsByTagName('head')[0].appendChild(link);
		}
		link.href = existingFaviconUrl;

		logger.log('Favicon updated to:', existingFaviconUrl);
	}, [projectId, ssoAppId, faviconUrlTemplate, defaultFaviconUrl]);

	// Run immediately and also when dependencies change
	useEffect(() => {
		updateFavicon();
	}, [updateFavicon]);

	const styleId = urlParams.get('style') || env.DESCOPE_STYLE_ID;

	const flowId =
		urlParams.get('flow') || env.DESCOPE_FLOW_ID || 'sign-up-or-in';

	const debug =
		urlParams.get('debug') === 'true' || env.DESCOPE_FLOW_DEBUG === 'true';

	const done = urlParams.get('done') || false;

	const locale = urlParams.get('locale') || env.DESCOPE_LOCALE;

	const tenantId = urlParams.get('tenant') || env.DESCOPE_TENANT_ID;

	const background =
		urlParams.get('bg') || env.DESCOPE_BG || env.DESCOPE_BG_COLOR;

	const storeLastAuthUser =
		urlParams.get('store_last_auth_user') === 'false' ||
		env.DESCOPE_STORE_LAST_AUTH_USER === 'false'
			? false
			: undefined;

	const persistTokens =
		urlParams.get('persist_tokens') === 'false' ||
		env.DESCOPE_PERSIST_TOKENS === 'false'
			? false
			: undefined;

	const theme = (urlParams.get('theme') ||
		env.DESCOPE_FLOW_THEME) as React.ComponentProps<typeof Descope>['theme'];

	const form = { userCode: urlParams.get('user_code') || '' };

	const bodyCss = useMemo(() => {
		const css: CSSProperties = {};
		try {
			if (!background?.startsWith('https://')) {
				if (background?.startsWith('http://')) {
					// eslint-disable-next-line no-console
					console.error(`background must be a https:// URL`);
				}
				throw new Error();
			}
			const url = new URL(background ?? '');
			// We want url("https://whatever.invalid") with any quotes escaped correctly
			// so JSON.stringify is a convenient option.
			css.backgroundImage = `url(${JSON.stringify(url.toString())})`;
			css.backgroundSize = 'cover';
			logger.log('Using background url', url);
		} catch (err) {
			logger.log('Using background as color', background);
			css.backgroundColor = background;
		}

		return css;
	}, [background]);

	const { containerCss, containerClasses } = useMemo(() => {
		const isWideContainer =
			urlParams.get('wide') === 'true' ||
			flowId === 'saml-config' ||
			flowId === 'sso-config';

		const shadow = urlParams.get('shadow') !== 'false';

		const width = getSizingValue({
			urlParams,
			key: 'width',
			envVar: 'REACT_APP_FLOW_WIDTH'
		});
		const height = getSizingValue({
			urlParams,
			key: 'height',
			envVar: 'REACT_APP_FLOW_HEIGHT'
		});
		const hasWidthHeight = width !== undefined || height !== undefined;

		const classes = clsx({
			'descope-base-container': shadow,
			'descope-wide-container': !hasWidthHeight && isWideContainer,
			'descope-login-container': !hasWidthHeight && !isWideContainer
		});

		// See: https://web.dev/blog/viewport-units
		// This is sensitive to mobile
		const css: CSSProperties = {
			width: width !== undefined ? `min(${width}, 100dvw)` : undefined,
			minHeight: height !== undefined ? `min(${height}, 100dvh)` : undefined
		};

		return { containerCss: css, containerClasses: classes };
	}, [urlParams, flowId]);

	const client = useMemo(() => getClientParams(urlParams), [urlParams]);

	const flowProps = {
		flowId,
		debug,
		locale,
		tenant: tenantId,
		theme,
		styleId,
		form,
		client,
		onSuccess: (e: CustomEvent<FlowJWTResponse>) => {
			if (flowId === 'saml-config' || flowId === 'sso-config') {
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
				return;
			}
			if (e?.detail?.flowOutput?.onSuccessRedirectUrl) {
				// make sure to validate the URL in the flow against approved domains
				window?.location.assign(e?.detail?.flowOutput?.onSuccessRedirectUrl);
			}
		},
		...((flowId === 'saml-config' || flowId === 'sso-config') && {
			autoFocus: false
		})
	};

	return (
		<AuthProvider
			projectId={projectId}
			baseUrl={baseUrl}
			storeLastAuthenticatedUser={storeLastAuthUser}
			persistTokens={persistTokens}
		>
			<div className="app" style={bodyCss} data-testid="app">
				{!done && projectId && flowId && (
					<div
						className={containerClasses}
						style={containerCss}
						data-testid="descope-component"
					>
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
