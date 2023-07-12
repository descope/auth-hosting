import '@testing-library/jest-dom';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import App from './App';

jest.mock('@descope/react-sdk', () => ({
	...jest.requireActual('@descope/react-sdk'),
	Descope: jest.fn(() => <div />)
}));

describe('App component', () => {
	beforeEach(() => {
		jest.resetModules();
		process.env.DESCOPE_PROJECT_ID = '';
	});

	test('displays Welcome component when projectId is missing', async () => {
		Object.defineProperty(window, 'location', {
			value: {
				pathname: '/invalid-project-id'
			},
			writable: true // possibility to override
		});
		Object.assign(navigator, {
			clipboard: {
				writeText: () => undefined
			}
		});

		render(<App />);
		expect(screen.getByTestId('welcome-component')).toBeInTheDocument();
		expect(screen.getByTestId('welcome-copy-component')).toBeInTheDocument();
		expect(screen.getByTestId('welcome-copy-icon')).toBeInTheDocument();
		fireEvent.click(screen.getByTestId('welcome-copy-component'));
		await screen.findByTestId('welcome-copied-icon');
	});

	test('displays Descope component when projectId is valid and part of the location', async () => {
		Object.defineProperty(window, 'location', {
			value: {
				pathname: '/P2Qbs5l8F1kD1g2inbBktiCDummy'
			},
			writable: true // possibility to override
		});
		render(<App />);
		expect(screen.getByTestId('descope-component')).toBeInTheDocument();
	});

	test('displays Descope component when projectId is invalid and part of the location', async () => {
		Object.defineProperty(window, 'location', {
			value: {
				pathname: '/P2Qbs5l8F1kD1g2inbBktiCDumm'
			},
			writable: true // possibility to override
		});
		render(<App />);
		expect(screen.getByTestId('welcome-component')).toBeInTheDocument();
	});

	test('displays Descope component when projectId is valid and as an env var', async () => {
		process.env.DESCOPE_PROJECT_ID = 'P2Qbs5l8F1kD1g2inbBktiCDummy';
		render(<App />);
		expect(screen.getByTestId('descope-component')).toBeInTheDocument();
	});

	test('displays Descope component when projectId is invalid and as an env var', async () => {
		process.env.DESCOPE_PROJECT_ID = 'P2Qbs5l8F1kD1g2inbBktiCDumm';
		render(<App />);
		expect(screen.getByTestId('welcome-component')).toBeInTheDocument();
	});

	test('displays Descope component when projectId is valid and part of the location and env', async () => {
		process.env.DESCOPE_PROJECT_ID = 'P2Qbs5l8F1kD1g2inbBktiCDummk';
		Object.defineProperty(window, 'location', {
			value: {
				pathname: '/P2Qbs5l8F1kD1g2inbBktiCDummy'
			},
			writable: true // possibility to override
		});
		render(<App />);
		expect(screen.getByTestId('descope-component')).toBeInTheDocument();
	});
});
