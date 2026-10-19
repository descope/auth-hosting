// Set on every request this app's flow makes, so the backend can tell a flow running inside the
// auth hosting app from one running in a customer's own application. A project that turned the
// hosted pages off is refused on this header alone; nothing about the URL is inspected.
export const AUTH_HOSTING_HEADER = 'x-descope-auth-hosting';

// AuthProvider takes no baseHeaders, but it does take hooks, and the Descope component hands the
// global SDK's beforeRequest to the web component -- so this reaches the flow's own requests and
// not just the SDK's auth calls.
export const addAuthHostingHeader = <T extends { headers?: HeadersInit }>(
	config: T
): T => ({
	...config,
	headers: {
		...(config.headers as Record<string, string>),
		[AUTH_HOSTING_HEADER]: '1'
	}
});
