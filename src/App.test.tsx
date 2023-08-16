import '@testing-library/jest-dom';
import React, { PropsWithChildren } from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import App from './App';
import packageJson from '../package.json';

const mockDescope = jest.fn();
const mockAuthProvider = jest.fn();

jest.mock('@descope/react-sdk', () => ({
	...jest.requireActual('@descope/react-sdk'),
	Descope: (props: unknown) => {
		mockDescope(props);
		return <div />;
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
		expect(screen.getByTestId('welcome-component')).toBeInTheDocument();
		expect(screen.getByTestId('welcome-copy-component')).toBeInTheDocument();
		expect(screen.getByTestId('welcome-copy-icon')).toBeInTheDocument();
		fireEvent.click(screen.getByTestId('welcome-copy-component'));
		await screen.findByTestId('welcome-copied-icon');
		expect(screen.getByTestId('welcome-component')).toHaveTextContent(
			`/${packageJson.homepage}/`
		);
	});

	test('displays Descope component when projectId is valid and part of the location', async () => {
		window.location.pathname = `/${packageJson.homepage}/${validProjectId}`;
		render(<App />);
		expect(screen.getByTestId('descope-component')).toBeInTheDocument();
		expect(mockAuthProvider).toHaveBeenCalledWith(
			// baseUrl is undefined by default
			expect.objectContaining({ baseUrl: undefined })
		);
	});

	test('displays welcome component when projectId is invalid and part of the location', async () => {
		window.location.pathname = `/${packageJson.homepage}/${invalidProjectId}`;
		render(<App />);
		expect(screen.getByTestId('welcome-component')).toBeInTheDocument();
	});

	test('displays Descope component when projectId is valid and as an env var', async () => {
		process.env.DESCOPE_PROJECT_ID = validProjectId;
		render(<App />);
		expect(screen.getByTestId('descope-component')).toBeInTheDocument();
	});

	test('displays welcome component when projectId is invalid and as an env var', async () => {
		process.env.DESCOPE_PROJECT_ID = invalidProjectId;
		render(<App />);
		expect(screen.getByTestId('welcome-component')).toBeInTheDocument();
	});

	test('displays Descope component when projectId is valid and part of the location and env', async () => {
		process.env.DESCOPE_PROJECT_ID = validProjectId;
		window.location.pathname = `/${packageJson.homepage}/${validProjectId}`;
		render(<App />);
		expect(screen.getByTestId('descope-component')).toBeInTheDocument();
	});

	test('that the baseUrl is the same as the origin', async () => {
		process.env.REACT_APP_USE_ORIGIN_BASE_URL = 'true';
		Object.defineProperty(window.location, 'origin', {
			value: baseUrl
		});
		window.location.pathname = `/${packageJson.homepage}/${validProjectId}`;
		render(<App />);
		expect(mockAuthProvider).toHaveBeenCalledWith(
			expect.objectContaining({ baseUrl })
		);
	});

	test('that the flow can be customized with env', async () => {
		process.env.REACT_APP_DESCOPE_BASE_URL = baseUrl;
		process.env.DESCOPE_FLOW_ID = flowId;
		process.env.DESCOPE_FLOW_DEBUG = debug.toString();

		window.location.pathname = `/${packageJson.homepage}/${validProjectId}`;
		render(<App />);
		expect(mockAuthProvider).toHaveBeenCalledWith(
			expect.objectContaining({ baseUrl })
		);
		expect(mockDescope).toHaveBeenCalledWith(
			expect.objectContaining({ debug, flowId })
		);
	});

	test('that the flow can be customized with search params', async () => {
		window.location.pathname = `/${packageJson.homepage}/${validProjectId}`;
		window.location.search = `?debug=${debug}&flow=${flowId}`;
		render(<App />);
		expect(mockDescope).toHaveBeenCalledWith(
			expect.objectContaining({ debug, flowId })
		);
	});
});
