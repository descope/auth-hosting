const STORAGE_KEY = 'oidc_session_params';

// Only exclude params that are transient app states and must not be replayed.
// Everything else (including state_id, oidc_error_redirect_uri, dynamic_val,
// and any future Descope OIDC params) is preserved so the SDK can fully
// restore the OIDC session after a mid-flow page refresh.
const PARAMS_BLOCKLIST = new Set(['done']);

type StoredParams = Record<string, string>;

const readParamsToStore = (urlParams: URLSearchParams): StoredParams => {
	const result: StoredParams = {};
	urlParams.forEach((value, key) => {
		if (!PARAMS_BLOCKLIST.has(key)) result[key] = value;
	});
	return result;
};

/**
 * Call once before React renders (e.g. in index.tsx).
 *
 * - If sso_app_id is present in the URL: persist all relevant params to
 *   sessionStorage so a mid-flow refresh can recover them.
 * - If sso_app_id is absent: attempt to restore persisted params into the URL
 *   via replaceState so the React tree sees the full OIDC context from the
 *   very first render.
 */
export const initOidcSession = (): void => {
	const urlParams = new URLSearchParams(window.location.search);

	if (urlParams.has('sso_app_id')) {
		// Fresh OIDC context arrived — save it, overwriting any stale session.
		try {
			sessionStorage.setItem(
				STORAGE_KEY,
				JSON.stringify(readParamsToStore(urlParams))
			);
		} catch {
			// sessionStorage unavailable; proceed without persistence.
		}
		return;
	}

	// No OIDC context in the current URL — try to recover from sessionStorage.
	try {
		const raw = sessionStorage.getItem(STORAGE_KEY);
		if (!raw) return;

		const stored = JSON.parse(raw) as StoredParams;
		let changed = false;
		Object.entries(stored).forEach(([key, value]) => {
			if (!urlParams.has(key)) {
				urlParams.set(key, value);
				changed = true;
			}
		});

		if (changed) {
			window.history.replaceState(
				{},
				'',
				`${window.location.pathname}?${urlParams.toString()}`
			);
		}
	} catch {
		// Malformed storage entry — leave URL as-is.
	}
};

/**
 * Call when the OIDC flow completes successfully so stale params don't
 * persist into unrelated page visits within the same browser tab.
 */
export const clearOidcSession = (): void => {
	try {
		sessionStorage.removeItem(STORAGE_KEY);
	} catch {
		// ignore
	}
};
