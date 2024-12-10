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
		process.env.DESCOPE_PROJECT_ID = '';
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
		process.env.DESCOPE_PROJECT_ID = validProjectId;
		render(<App />);
		expect(await screen.findByTestId('descope-component')).toBeInTheDocument();
	});

	test('displays welcome component when projectId is invalid and as an env var', async () => {
		process.env.DESCOPE_PROJECT_ID = invalidProjectId;
		render(<App />);
		expect(await screen.findByTestId('welcome-component')).toBeInTheDocument();
	});

	test('displays Descope component when projectId is valid and part of the location and env', async () => {
		process.env.DESCOPE_PROJECT_ID = validProjectId;
		window.location.pathname = `/${packageJson.homepage}/${validProjectId}`;
		render(<App />);
		expect(await screen.findByTestId('descope-component')).toBeInTheDocument();
	});

	test('that the baseUrl is the same as the origin', async () => {
		process.env.REACT_APP_USE_ORIGIN_BASE_URL = 'true';
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
		process.env.REACT_APP_DESCOPE_BASE_URL = baseUrl;
		process.env.DESCOPE_FLOW_ID = flowId;
		process.env.DESCOPE_FLOW_DEBUG = debug.toString();

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
		window.location.search = `?debug=${debug}&flow=${flowId}`;
		render(<App />);
		await waitFor(() =>
			expect(mockDescope).toHaveBeenCalledWith(
				expect.objectContaining({ debug, flowId })
			)
		);
	});

	describe('onSuccess callback', () => {
		beforeEach(() => {
			jest.clearAllMocks();
			process.env.DESCOPE_PROJECT_ID = 'P123456789012345678901234567';
			process.env.DESCOPE_FLOW_ID = 'saml-config';
			process.env.REACT_APP_DESCOPE_BASE_URL = baseUrl;

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

	describe('favicon', () => {
		beforeEach(() => {
			jest.clearAllMocks();
			process.env.REACT_APP_BASE_FUNCTIONS_URL = 'https://example.com';
			process.env.REACT_APP_FAVICON_URL = 'https://example.com/favicon.ico';
			process.env.DESCOPE_PROJECT_ID = 'P1234567890123456789012345678901';

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
				json: async () => ({
					faviconUrl: 'https://example.com/new-favicon.ico'
				})
			});

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
				expect(link.href).toBe('https://example.com/new-favicon.ico');
			});
		});

		it('should not update the favicon if the response is not ok', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false
			});

			render(<App />);

			await waitFor(() => {
				// eslint-disable-next-line testing-library/no-node-access -- can't query head with screen
				const link = document.head.querySelector("link[rel~='icon']");
				expect(link).not.toBeInTheDocument();
			});
		});

		it('should not update the favicon if the URL is not secure', async () => {
			process.env.REACT_APP_FAVICON_URL = 'http://example.com/favicon.ico';

			render(<App />);

			await waitFor(() => {
				// eslint-disable-next-line testing-library/no-node-access -- can't query head with screen
				const link = document.querySelector("link[rel~='icon']");
				expect(link).not.toBeInTheDocument();
			});
		});

		it('should not update the favicon if the URL is not valid', async () => {
			process.env.REACT_APP_FAVICON_URL = 'invalid-url';

			render(<App />);

			await waitFor(() => {
				// eslint-disable-next-line testing-library/no-node-access -- can't query head with screen
				const link = document.querySelector("link[rel~='icon']");
				expect(link).not.toBeInTheDocument();
			});
		});

		it('should not update the favicon if fetch throws an error', async () => {
			mockFetch.mockRejectedValueOnce(new Error('test error'));

			render(<App />);

			await waitFor(() => {
				// eslint-disable-next-line testing-library/no-node-access -- can't query head with screen
				const link = document.querySelector("link[rel~='icon']");
				expect(link).not.toBeInTheDocument();
			});
		});

		it('should not update the favicon if faviconUrl is missing', async () => {
			process.env.REACT_APP_FAVICON_URL = '';

			render(<App />);

			await waitFor(() => {
				// eslint-disable-next-line testing-library/no-node-access -- can't query head with screen
				const link = document.querySelector("link[rel~='icon']");
				expect(link).not.toBeInTheDocument();
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
