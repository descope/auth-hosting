import { logger } from './logger';

type ThemeFlavor = 'light' | 'dark';

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

const fetchOk = async (url: string) => {
	try {
		const response = await fetch(url);
		return !!response?.ok;
	} catch (error) {
		logger.error('Error fetching favicon:', error);
		return false;
	}
};

const fetchJson = async (url: string): Promise<unknown> => {
	try {
		const response = await fetch(url);
		if (!response?.ok) return undefined;
		return await response.json();
	} catch (error) {
		logger.error('Error fetching style JSON:', error);
		return undefined;
	}
};

// A flow renders in light or dark. Mirror the web-component: an explicit theme wins,
// otherwise follow the OS preference. Anything else (e.g. "os") resolves the same way.
const resolveThemeFlavor = (theme?: string | null): ThemeFlavor => {
	if (theme === 'light' || theme === 'dark') return theme;
	return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches
		? 'dark'
		: 'light';
};

// The federated-app favicon is stored on the style's logo component, per flavor. It is a
// distinct slot from the admin portal favicon (--descope-favicon-url). The published style
// JSON keeps it either as a CSS variable inside the rendered component host
// (`--descope-fed-apps-favicon-url:url(<dataURI>)`) or as the raw logo key; read both so
// the parse survives either shape.
const faviconForFlavor = (
	style: unknown,
	flavor: ThemeFlavor
): string | undefined => {
	const components = (
		style as Record<string, { components?: Record<string, any> }>
	)?.[flavor]?.components;
	if (!components) return undefined;

	const host = components['descope-logo']?.host;
	const fromHost =
		typeof host === 'string'
			? host
					.match(/--descope-fed-apps-favicon-url:\s*url\(([^)]+)\)/)?.[1]
					?.trim()
					.replace(/^['"]|['"]$/g, '')
			: undefined;
	const fromRaw = components.logo?.['--descope-fed-apps-favicon-url'];

	const favicon = fromHost || fromRaw;
	return typeof favicon === 'string' && favicon.startsWith('data:')
		? favicon
		: undefined;
};

// Falls back to the light flavor when the wanted one has no favicon.
const extractStyleFavicon = (style: unknown, flavor: ThemeFlavor) =>
	faviconForFlavor(style, flavor) ?? faviconForFlavor(style, 'light');

const pick = (href: string, source: string) => {
	logger.log('Favicon source:', source);
	return href;
};

// resolveFaviconUrl picks the favicon a fed-app login shows, in priority order:
//   1. app           - the app's own favicon object. In dark theme its dark variant
//                      (favicon-dark.ico) wins; a light theme never shows the dark one.
//   2. style-json   - the favicon set on the flow style, read per theme flavor
//                      (light/dark) from the published style JSON. Theme-aware, so a
//                      style can carry a different favicon for light and dark.
//   3. default       - the built-in Descope icon
const resolveFaviconUrl = async ({
	perAppUrl,
	projectId,
	styleId,
	themeFlavor,
	faviconUrlTemplate,
	defaultFaviconUrl
}: {
	perAppUrl: string;
	projectId: string;
	styleId: string;
	themeFlavor: ThemeFlavor;
	faviconUrlTemplate: string;
	defaultFaviconUrl: string;
}): Promise<string> => {
	const darkAppUrl = perAppUrl.replace(/favicon\.ico$/, 'favicon-dark.ico');
	if (
		themeFlavor === 'dark' &&
		darkAppUrl !== perAppUrl &&
		(await fetchOk(darkAppUrl))
	) {
		return pick(new URL(darkAppUrl).href, 'app-dark');
	}

	if (await fetchOk(perAppUrl)) {
		return pick(new URL(perAppUrl).href, 'app');
	}

	// A named style carries its own favicon per flavor. The style JSON sits beside the
	// per-app favicon: same base, the app segment replaced by "<styleId>.json".
	if (styleId) {
		const styleUrl = faviconUrlTemplate
			.replace('{projectId}', projectId)
			.replace(
				'{ssoAppId}/assets/favicon.ico',
				`${encodeURIComponent(styleId)}.json`
			);
		if (!styleUrl.includes('{') && isFaviconUrlSecure(styleUrl)) {
			const favicon = extractStyleFavicon(
				await fetchJson(styleUrl),
				themeFlavor
			);
			if (favicon) return pick(favicon, 'style-json');
		}
	}

	return pick(new URL(defaultFaviconUrl).href, 'default');
};

export { isFaviconUrlSecure, resolveThemeFlavor, resolveFaviconUrl };
