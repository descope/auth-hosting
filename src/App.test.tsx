import '@testing-library/jest-dom';
import React, { PropsWithChildren } from 'react';
import {
	render,
	fireEvent,
	screen,
	waitFor,
	renderHook,
	within
} from '@testing-library/react';
import App from './App';
import packageJson from '../package.json';
import useOidcMfa from './hooks/useOidcMfa';
import { env } from './env';

const mockDescope = jest.fn();
const mockAuthProvider = jest.fn();

jest.mock('@descope/react-sdk', () => ({
	...jest.requireActual('@descope/react-sdk'),
	Descope: ({ onSuccess, ...props }: { onSuccess: () => void }) => {
		mockDescope(props);
		return (
			<button data-testid="descope-button" type="button" onClick={onSuccess}>
				Descope
			</button>
		);
	},
	AuthProvider: (props: PropsWithChildren<{ [key: string]: string }>) => {
		const { children } = props;
		mockAuthProvider(props);
		return <div>{children}</div>;
	}
}));

const validProjectId = 'P2Sn0gttY5sY4Zu6WDGAAEJ4VTrv';
const invalidProjectId = 'P2Qbs5l8F1kD1g2inbBktiCDumm';
const baseUrl = 'https://api.descope.test';
const flowId = 'test';
const debug = true;

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('App component', () => {
	beforeAll(() => {
		Object.defineProperty(window, 'location', {
			value: {
				href: 'http://localhost:3000/',
				pathname: '',
				origin: 'http://localhost:3000',
				replace: jest.fn((href: string) => {
					window.location.href = href;
				})
			},
			writable: true
		});
		Object.defineProperty(navigator, 'clipboard', {
			value: {
				writeText: jest.fn()
			}
		});
	});

	beforeEach(() => {
		jest.resetModules();
		env.DESCOPE_PROJECT_ID = '';
		window.location.pathname = '';
		window.localStorage.clear();
	});

	test('displays Welcome component when projectId is missing', async () => {
		window.location.pathname = `/${packageJson.homepage}/${invalidProjectId}`;

		render(<App />);
		expect(await screen.findByTestId('welcome-component')).toBeInTheDocument();
		expect(
			await screen.findByTestId('welcome-copy-component')
		).toBeInTheDocument();
		expect(await screen.findByTestId('welcome-copy-icon')).toBeInTheDocument();
		fireEvent.click(screen.getByTestId('welcome-copy-component'));
		await screen.findByTestId('welcome-copied-icon');
		expect(screen.getByTestId('welcome-component')).toHaveTextContent(
			`/${packageJson.homepage}/`
		);
	});

	test('displays Descope component when projectId is valid and part of the location', async () => {
		window.location.pathname = `/${packageJson.homepage}/${validProjectId}`;
		render(<App />);
		expect(await screen.findByTestId('descope-component')).toBeInTheDocument();
		expect(mockAuthProvider).toHaveBeenCalledWith(
			// baseUrl is undefined by default
			expect.objectContaining({ baseUrl: undefined })
		);
	});

	test('displays welcome component when projectId is invalid and part of the location', async () => {
		window.location.pathname = `/${packageJson.homepage}/${invalidProjectId}`;
		render(<App />);
		expect(await screen.findByTestId('welcome-component')).toBeInTheDocument();
	});

	test('displays Descope component when projectId is valid and as an env var', async () => {
		env.DESCOPE_PROJECT_ID = validProjectId;
		render(<App />);
		expect(await screen.findByTestId('descope-component')).toBeInTheDocument();
	});

	test('displays welcome component when projectId is invalid and as an env var', async () => {
		env.DESCOPE_PROJECT_ID = invalidProjectId;
		render(<App />);
		expect(await screen.findByTestId('welcome-component')).toBeInTheDocument();
	});

	test('displays Descope component when projectId is valid and part of the location and env', async () => {
		env.DESCOPE_PROJECT_ID = validProjectId;
		window.location.pathname = `/${packageJson.homepage}/${validProjectId}`;
		render(<App />);
		expect(await screen.findByTestId('descope-component')).toBeInTheDocument();
	});

	test('that the baseUrl is the same as the origin', async () => {
		env.REACT_APP_USE_ORIGIN_BASE_URL = 'true';
		Object.defineProperty(window.location, 'origin', {
			value: baseUrl
		});
		window.location.pathname = `/${packageJson.homepage}/${validProjectId}`;
		render(<App />);
		await waitFor(() =>
			expect(mockAuthProvider).toHaveBeenCalledWith(
				expect.objectContaining({ baseUrl })
			)
		);
	});

	test('that the flow can be customized with env', async () => {
		env.REACT_APP_DESCOPE_BASE_URL = baseUrl;
		env.DESCOPE_FLOW_ID = flowId;
		env.DESCOPE_FLOW_DEBUG = debug.toString();

		window.location.pathname = `/${packageJson.homepage}/${validProjectId}`;
		render(<App />);
		await waitFor(() =>
			expect(mockAuthProvider).toHaveBeenCalledWith(
				expect.objectContaining({ baseUrl })
			)
		);
		await waitFor(() =>
			expect(mockDescope).toHaveBeenCalledWith(
				expect.objectContaining({ debug, flowId })
			)
		);
	});

	test('that the flow can be customized with search params', async () => {
		window.location.pathname = `/${packageJson.homepage}/${validProjectId}`;
		window.location.search = `?debug=${debug}&flow=${flowId}&user_code=12345&client.k1=v1&client.k2=v2&client.k3=82`;
		render(<App />);
		await waitFor(() =>
			expect(mockDescope).toHaveBeenCalledWith(
				expect.objectContaining({
					debug,
					flowId,
					form: { userCode: '12345' },
					client: { k1: 'v1', k2: 'v2', k3: '82' }
				})
			)
		);
	});

	describe('onSuccess callback', () => {
		beforeEach(() => {
			jest.clearAllMocks();
			env.DESCOPE_PROJECT_ID = 'P123456789012345678901234567';
			env.DESCOPE_FLOW_ID = 'saml-config';
			env.REACT_APP_DESCOPE_BASE_URL = baseUrl;

			// Set the ssoAppId URL parameter
			Object.defineProperty(window, 'location', {
				value: {
					...window.location,
					search: '?sso_app_id=testSsoAppId',
					pathname: '/test',
					assign: jest.fn()
				},
				writable: true
			});
		});

		it('should update the URL with done=true when onSuccess is triggered', async () => {
			render(<App />);

			const descopeButton = screen.getByTestId('descope-button');
			fireEvent.click(descopeButton);

			await waitFor(() => {
				expect(window.location.assign).toHaveBeenCalledWith(
					`${baseUrl}/test?sso_app_id=testSsoAppId&done=true`
				);
			});
		});

		it('should update the URL with done=true when onSuccess is triggered without existing search params', async () => {
			Object.defineProperty(window, 'location', {
				value: {
					...window.location,
					search: '',
					pathname: '/test',
					assign: jest.fn()
				},
				writable: true
			});

			render(<App />);

			const descopeButton = screen.getByTestId('descope-button');
			fireEvent.click(descopeButton);

			await waitFor(() => {
				expect(window.location.assign).toHaveBeenCalledWith(
					`${baseUrl}/test?done=true`
				);
			});
		});
	});

	describe('container sizing options', () => {
		beforeEach(() => {
			jest.clearAllMocks();
			env.REACT_APP_BASE_FUNCTIONS_URL = 'https://example.com';
			env.DESCOPE_PROJECT_ID = 'P1234567890123456789012345678901';
			window.location.pathname = `/${packageJson.homepage}/${validProjectId}`;
			window.location.search = '';
			delete env.REACT_APP_FLOW_WIDTH;
			delete env.REACT_APP_FLOW_HEIGHT;
			env.DESCOPE_FLOW_ID = 'test';

			Object.defineProperty(window, 'location', {
				value: {
					...window.location,
					search: '?sso_app_id=testSsoAppId',
					pathname: '/test'
				},
				writable: true
			});
		});

		it('normal', async () => {
			render(<App />);

			expect(await screen.findByTestId('descope-component')).toHaveClass(
				'descope-base-container',
				'descope-login-container'
			);
		});

		it('without shadow', async () => {
			window.location.search = '?shadow=false';
			render(<App />);

			expect(await screen.findByTestId('descope-component')).toHaveClass(
				'descope-login-container'
			);
		});

		it('wide', async () => {
			window.location.search = '?wide=true';
			render(<App />);

			expect(await screen.findByTestId('descope-component')).toHaveClass(
				'descope-base-container',
				'descope-wide-container'
			);
		});

		it('wide irrelevant if width/height set', async () => {
			env.REACT_APP_FLOW_WIDTH = '100px';
			render(<App />);

			expect(await screen.findByTestId('descope-component')).toHaveClass(
				'descope-base-container'
			);

			expect(await screen.findByTestId('descope-component')).toHaveStyle(
				'width: min(100px, 100dvw);'
			);
		});

		it('width and height set in pixels', async () => {
			env.REACT_APP_FLOW_WIDTH = '100px';
			env.REACT_APP_FLOW_HEIGHT = '300px';
			render(<App />);

			expect(await screen.findByTestId('descope-component')).toHaveClass(
				'descope-base-container'
			);

			expect(await screen.findByTestId('descope-component')).toHaveStyle({
				width: 'min(100px, 100dvw)',
				'min-height': 'min(300px, 100dvh)'
			});
		});

		it('width and height set in percentage', async () => {
			env.REACT_APP_FLOW_WIDTH = '50%';
			env.REACT_APP_FLOW_HEIGHT = '25%';
			render(<App />);

			expect(await screen.findByTestId('descope-component')).toHaveClass(
				'descope-base-container'
			);

			expect(await screen.findByTestId('descope-component')).toHaveStyle({
				width: 'min(50dvw, 100dvw)',
				'min-height': 'min(25dvh, 100dvh)'
			});
		});

		it('width invalid', async () => {
			env.REACT_APP_FLOW_WIDTH = '50 blabla';
			render(<App />);

			expect(await screen.findByTestId('descope-component')).toHaveClass(
				'descope-base-container',
				'descope-login-container'
			);
			expect(
				await screen.findByTestId('descope-component')
			).not.toHaveAttribute('style');
		});
	});

	describe('favicon', () => {
		beforeEach(() => {
			jest.clearAllMocks();
			env.REACT_APP_BASE_FUNCTIONS_URL = 'https://example.com';
			env.REACT_APP_FAVICON_URL = 'https://example.com/favicon.ico';
			env.DESCOPE_PROJECT_ID = 'P1234567890123456789012345678901';

			Object.defineProperty(window, 'location', {
				value: {
					...window.location,
					search: '?sso_app_id=testSsoAppId',
					pathname: '/test'
				},
				writable: true
			});
		});

		afterEach(() => {
			// clean head after each test
			document.head.innerHTML = '';
		});

		it('should update the favicon when all conditions are met', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200
			});

			env.REACT_APP_DEFAULT_FAVICON_URL =
				'https://example.com/default-favicon.ico';
			env.REACT_APP_FAVICON_URL_TEMPLATE =
				'https://example.com/{projectId}/{ssoAppId}/new-favicon.ico';
			render(<App />);

			await waitFor(() => {
				// eslint-disable-next-line testing-library/no-node-access -- can't query head with screen
				const link = document.head.querySelector(
					"link[rel~='icon']"
				) as HTMLLinkElement;
				expect(link).toBeInTheDocument();
			});

			await waitFor(() => {
				// eslint-disable-next-line testing-library/no-node-access -- can't query head with screen
				const link = document.head.querySelector(
					"link[rel~='icon']"
				) as HTMLLinkElement;
				expect(link.href).toBe(
					'https://example.com/P1234567890123456789012345678901/testSsoAppId/new-favicon.ico'
				);
			});
		});

		it('should not update the favicon if the response is not ok', async () => {
			env.REACT_APP_DEFAULT_FAVICON_URL =
				'https://example.com/default-favicon.ico-default';
			env.REACT_APP_FAVICON_URL_TEMPLATE =
				'https://example.com/{projectId}/{ssoAppId}/new-favicon.ico';

			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 404
			});

			render(<App />);

			await waitFor(() => {
				// eslint-disable-next-line testing-library/no-node-access -- can't query head with screen
				const link = document.head.querySelector(
					"link[rel~='icon']"
				) as HTMLLinkElement;
				expect(link.href).toBe(
					'https://example.com/default-favicon.ico-default'
				);
			});
		});

		it('should not update the favicon if the URL is not secure', async () => {
			env.REACT_APP_FAVICON_URL_TEMPLATE =
				'http://example.com/{projectId}/{ssoAppId}/new-favicon.ico';
			render(<App />);

			await waitFor(() => {
				// eslint-disable-next-line testing-library/no-node-access -- can't query head with screen
				const link = document.querySelector("link[rel~='icon']");
				expect(link).not.toBeInTheDocument();
			});
		});

		it('should not update the favicon if the URL is not valid', async () => {
			env.REACT_APP_FAVICON_URL_TEMPLATE = 'invalid-url';
			render(<App />);

			await waitFor(() => {
				// eslint-disable-next-line testing-library/no-node-access -- can't query head with screen
				const link = document.querySelector("link[rel~='icon']");
				expect(link).not.toBeInTheDocument();
			});
		});

		it('should not update the favicon if fetch throws an error', async () => {
			env.REACT_APP_DEFAULT_FAVICON_URL =
				'https://example.com/default-favicon.ico';
			env.REACT_APP_FAVICON_URL_TEMPLATE =
				'https://example.com/{projectId}/{ssoAppId}/new-favicon.ico';
			mockFetch.mockRejectedValueOnce(new Error('test error'));

			render(<App />);

			await waitFor(() => {
				// eslint-disable-next-line testing-library/no-node-access -- can't query head with screen
				const link = document.querySelector("link[rel~='icon']");
				expect(link).not.toBeInTheDocument();
			});
		});

		it('should not update the favicon if faviconUrl is missing', async () => {
			env.REACT_APP_FAVICON_URL_TEMPLATE = '';

			render(<App />);

			await waitFor(() => {
				// eslint-disable-next-line testing-library/no-node-access -- can't query head with screen
				const link = document.querySelector("link[rel~='icon']");
				expect(link).not.toBeInTheDocument();
			});
		});

		// If the default favicon is not sanitized, it should not be updated
		it('should not update the favicon if the default favicon is not sanitized', async () => {
			env.REACT_APP_DEFAULT_FAVICON_URL = 'invalid-url';
			env.REACT_APP_FAVICON_URL_TEMPLATE = 'invalid-url';

			render(<App />);
			await waitFor(() => {
				// eslint-disable-next-line testing-library/no-node-access -- can't query head with screen
				const link = document.querySelector("link[rel~='icon']");
				expect(link).not.toBeInTheDocument();
			});
		});
	});

	describe('bg', () => {
		beforeEach(() => {
			jest.clearAllMocks();
			env.REACT_APP_BASE_FUNCTIONS_URL = 'https://example.com';
			env.DESCOPE_PROJECT_ID = 'P1234567890123456789012345678901';
			delete env.DESCOPE_BG;
			delete env.DESCOPE_BG_COLOR;

			Object.defineProperty(window, 'location', {
				value: {
					...window.location,
					search: '?sso_app_id=testSsoAppId',
					pathname: '/test'
				},
				writable: true
			});
		});

		it('should allow a secure image background', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200
			});

			env.DESCOPE_BG = 'https://example.com/bg.png';
			render(<App />);

			expect(await screen.findByTestId('app')).toHaveStyle({
				'background-image': 'url("https://example.com/bg.png")',
				'background-size': 'cover'
			});
		});

		it('should disallow an insecure image background', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200
			});

			env.DESCOPE_BG = 'http://example.com/bg.png';
			render(<App />);

			expect(await screen.findByTestId('app')).toHaveStyle({
				'background-color': 'http://example.com/bg.png' // try to interpret as color
			});
		});

		it('should allow a color name', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200
			});

			env.DESCOPE_BG = 'red';
			render(<App />);

			expect(await screen.findByTestId('app')).toHaveStyle({
				'background-color': 'red'
			});
		});

		it('should allow a color hex', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200
			});

			env.DESCOPE_BG = '#ff00ff';
			render(<App />);

			expect(await screen.findByTestId('app')).toHaveStyle({
				'background-color': '#ff00ff'
			});
		});

		it('should allow a color hex with old env', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200
			});

			env.DESCOPE_BG_COLOR = '#ff00ff';
			render(<App />);

			expect(await screen.findByTestId('app')).toHaveStyle({
				'background-color': '#ff00ff'
			});
		});
	});

	describe('useOidcMfa', () => {
		beforeEach(() => {
			Object.defineProperty(window, 'location', {
				value: {
					...window.location,
					search:
						'?oidc_mfa_state=testState&oidc_mfa_id_token=testIdToken&oidc_mfa_redirect_url=https://login.microsoftonline.com/common/federation/externalauthprovider',
					pathname: '/test'
				},
				writable: true
			});

			// Mock window.history.replaceState
			window.history.replaceState = jest.fn();

			// Mock form.submit
			HTMLFormElement.prototype.submit = jest.fn();
		});

		afterEach(() => {
			// Clean up the DOM after each test
			document.body.innerHTML = '';
		});

		it('should create and submit a form with the correct parameters', () => {
			renderHook(() => useOidcMfa());

			const form = screen.getByTestId('oidc-mfa-form');
			expect(form).toBeInTheDocument();
			expect(form).toHaveAttribute(
				'action',
				'https://login.microsoftonline.com/common/federation/externalauthprovider'
			);
			expect(form).toHaveAttribute('method', 'POST');

			const stateInput = within(form).getByTestId('state');
			expect(stateInput).toBeInTheDocument();
			expect(stateInput).toHaveValue('testState');

			const idTokenInput = within(form).getByTestId('id_token', {});
			expect(idTokenInput).toBeInTheDocument();
			expect(idTokenInput).toHaveValue('testIdToken');
		});
		it('should not create form post if the URL is not approved', () => {
			Object.defineProperty(window, 'location', {
				value: {
					...window.location,
					search:
						'?oidc_mfa_state=testState&oidc_mfa_id_token=testIdToken&oidc_mfa_redirect_url=https://example.com',
					pathname: '/test'
				},
				writable: true
			});

			renderHook(() => useOidcMfa());

			expect(screen.queryByTestId('oidc-mfa-form')).not.toBeInTheDocument();
		});
	});
});
