// Set on every request this app's flow makes, so the backend can tell a flow running inside the
// auth hosting app from one running in a customer's own application. A project that turned the
// hosted pages off is refused on this header alone; nothing about the URL is inspected.
const AUTH_HOSTING_HEADER = 'x-descope-auth-hosting';

// HeadersInit is a plain object, a [name, value][] or a Headers instance, and this runs as the
// global beforeRequest for every SDK and flow request -- so getting this wrong drops whatever the
// caller set, Authorization included. Reads a Headers instance through its own forEach rather than
// the global constructor, which jsdom does not always provide.
const toRecord = (headers?: HeadersInit): Record<string, string> => {
	if (!headers) {
		return {};
	}
	if (Array.isArray(headers)) {
		return Object.fromEntries(headers);
	}
	if (typeof (headers as Headers).forEach === 'function') {
		const entries: Record<string, string> = {};
		(headers as Headers).forEach((value, name) => {
			entries[name] = value;
		});
		return entries;
	}
	return { ...(headers as Record<string, string>) };
};

// AuthProvider takes no baseHeaders, but it does take hooks, and the Descope component hands the
// global SDK's beforeRequest to the web component -- so this reaches the flow's own requests and
// not just the SDK's auth calls.
const addAuthHostingHeader = <T extends { headers?: HeadersInit }>(
	config: T
): T => ({
	...config,
	headers: { ...toRecord(config.headers), [AUTH_HOSTING_HEADER]: '1' }
});

export { AUTH_HOSTING_HEADER, addAuthHostingHeader };
