import { useEffect } from 'react';

const OIDC_MFA_URL_STATE_PARAM_NAME = 'oidc_mfa_state';
const OIDC_MFA_URL_ID_TOKEN_PARAM_NAME = 'oidc_mfa_id_token';
const OIDC_MFA_URL_REDIRECT_URL_PARAM_NAME = 'oidc_mfa_redirect_url';

const APPROVED_OIDC_MFA_URLS = [
	'https://login.microsoftonline.com',
	'https://login.microsoftonline.us',
	'https://login.partner.microsoftonline.cn'
];

const createAndAppendInputElement = (
	form: HTMLFormElement,
	name: string,
	value: string
): void => {
	const input = document.createElement('input');
	input.type = 'text';
	input.name = name;
	input.value = value;
	input.required = true;
	input.setAttribute('data-testid', name);
	form.appendChild(input);
};

const useOidcMfa = () => {
	useEffect(() => {
		const urlParams = new URLSearchParams(window.location.search);
		const state = urlParams.get(OIDC_MFA_URL_STATE_PARAM_NAME);
		const idToken = urlParams.get(OIDC_MFA_URL_ID_TOKEN_PARAM_NAME);
		const redirectUrl = urlParams.get(OIDC_MFA_URL_REDIRECT_URL_PARAM_NAME);

		if (!state || !idToken || !redirectUrl) {
			return;
		}

		// Remove the parameters from the URL
		urlParams.delete(OIDC_MFA_URL_STATE_PARAM_NAME);
		urlParams.delete(OIDC_MFA_URL_ID_TOKEN_PARAM_NAME);
		urlParams.delete(OIDC_MFA_URL_REDIRECT_URL_PARAM_NAME);
		const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
		window.history.replaceState({}, '', newUrl);

		// Create and submit the form
		const form = document.createElement('form');
		form.action = redirectUrl;
		try {
			const parsedUrl = new URL(redirectUrl);
			if (
				!APPROVED_OIDC_MFA_URLS.some(
					(approvedUrl) => parsedUrl.origin === approvedUrl
				)
			) {
				throw new Error('Unapproved redirect URL');
			}
			form.action = parsedUrl.href;
		} catch (error) {
			return;
		}
		form.method = 'POST';
		form.style.display = 'none';
		form.setAttribute('data-testid', 'oidc-mfa-form');

		createAndAppendInputElement(form, 'state', state);
		createAndAppendInputElement(form, 'id_token', idToken);

		document.body.appendChild(form);
		form.submit();
	}, []);
};

export default useOidcMfa;
