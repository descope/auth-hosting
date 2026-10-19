// Set on every request this app's flow makes, so the backend can tell a flow running inside the
// auth hosting app from one running in a customer's own application. A project that turned the
// hosted pages off is refused on this header alone; nothing about the URL is inspected.
export const AUTH_HOSTING_HEADER = 'x-descope-auth-hosting';
