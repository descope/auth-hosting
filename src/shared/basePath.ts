import packageJson from '../../package.json';

// The app is built with package.json "homepage" ("login"), so every page URL contains a
// "/login" segment. Anything before that segment is the prefix the app is mounted under,
// e.g. "" for https://host/login/<pid> and "/auth" for https://host/auth/login/<pid>.
export const getBasePath = (
	pathname: string = window.location.pathname
): string => {
	const segments = pathname.split('/');
	const index = segments.indexOf(packageJson.homepage);
	if (index <= 0) return '';
	return segments.slice(0, index).join('/');
};

// Origin plus mount prefix, e.g. https://host or https://host/auth
export const getOriginWithBasePath = (): string =>
	window.location.origin + getBasePath();
