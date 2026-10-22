import { getBasePath, getOriginWithBasePath } from './basePath';

describe('getBasePath', () => {
	it('returns an empty prefix when the app is mounted at the root', () => {
		expect(getBasePath('/login/P2abc')).toBe('');
	});

	it('returns the prefix when the app is mounted under /auth', () => {
		expect(getBasePath('/auth/login/P2abc')).toBe('/auth');
	});

	it('returns a nested prefix', () => {
		expect(getBasePath('/foo/bar/login/P2abc')).toBe('/foo/bar');
	});

	it('handles a trailing slash and a missing project id', () => {
		expect(getBasePath('/auth/login/')).toBe('/auth');
		expect(getBasePath('/auth/login')).toBe('/auth');
		expect(getBasePath('/login')).toBe('');
	});

	it('returns an empty prefix when there is no login segment', () => {
		expect(getBasePath('/')).toBe('');
		expect(getBasePath('/auth/other/P2abc')).toBe('');
	});

	it('reads window.location.pathname by default', () => {
		window.history.pushState({}, '', '/auth/login/P2abc');
		expect(getBasePath()).toBe('/auth');
		expect(getOriginWithBasePath()).toBe(`${window.location.origin}/auth`);
		window.history.pushState({}, '', '/');
	});
});
