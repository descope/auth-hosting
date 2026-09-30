import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import FlowGate from './FlowGate';

const baseUrl = 'https://api.descope.test';
const projectId = 'P2Sn0gttY5sY4Zu6WDGAAEJ4VTrv';

const mockFetch = jest.fn();
const originalFetch = global.fetch;

beforeAll(() => {
	global.fetch = mockFetch as unknown as typeof fetch;
});

afterAll(() => {
	global.fetch = originalFetch;
});

beforeEach(() => {
	jest.clearAllMocks();
});

// Routes each of the gate's two requests independently, so a test can say what the
// domain check and the project configuration each reply without depending on order.
const respondWith = ({
	domainOk = true,
	config = {},
	configOk = true
}: {
	domainOk?: boolean;
	config?: Record<string, unknown>;
	configOk?: boolean;
}) => {
	mockFetch.mockImplementation((url: string) => {
		if (url.includes('/v1/flow/validate-domain')) {
			return Promise.resolve({
				ok: true,
				json: async () => ({ success: domainOk })
			});
		}
		if (url.includes('/.well-known/project-configuration/')) {
			return Promise.resolve({ ok: configOk, json: async () => config });
		}
		return Promise.resolve({ ok: false });
	});
};

const renderGate = (url: string | undefined, id: string) =>
	render(
		<FlowGate baseUrl={url} projectId={id}>
			<div data-testid="flow" />
		</FlowGate>
	);

describe('FlowGate', () => {
	it('renders the flow when the domain is approved and hosting is on', async () => {
		respondWith({});
		renderGate(baseUrl, projectId);

		await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
		expect(screen.getByTestId('flow')).toBeInTheDocument();
	});

	it('shows the disabled notice when the project turned hosting off', async () => {
		respondWith({ config: { disableAuthHosting: true } });
		renderGate(baseUrl, projectId);

		expect(await screen.findByTestId('disabled-component')).toBeInTheDocument();
		expect(screen.queryByTestId('flow')).not.toBeInTheDocument();
	});

	it('shows the disabled notice even while the domain check still passes', async () => {
		respondWith({ domainOk: true, config: { disableAuthHosting: true } });
		renderGate(baseUrl, projectId);

		expect(await screen.findByTestId('disabled-component')).toBeInTheDocument();
	});

	it('renders the flow when the flag is explicitly false', async () => {
		respondWith({ config: { disableAuthHosting: false } });
		renderGate(baseUrl, projectId);

		await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
		expect(screen.getByTestId('flow')).toBeInTheDocument();
	});

	it('renders the flow for a project that predates the flag', async () => {
		respondWith({ config: { allowAuthHostingIframeEmbedding: true } });
		renderGate(baseUrl, projectId);

		await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
		expect(screen.getByTestId('flow')).toBeInTheDocument();
	});

	it('fails open when the project configuration cannot be read', async () => {
		respondWith({ configOk: false });
		renderGate(baseUrl, projectId);

		await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
		expect(screen.getByTestId('flow')).toBeInTheDocument();
	});

	it('fails open when the project configuration request throws', async () => {
		mockFetch.mockImplementation((url: string) => {
			if (url.includes('/v1/flow/validate-domain')) {
				return Promise.resolve({
					ok: true,
					json: async () => ({ success: true })
				});
			}
			return Promise.reject(new Error('network down'));
		});
		renderGate(baseUrl, projectId);

		await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
		expect(screen.getByTestId('flow')).toBeInTheDocument();
	});

	it('still blocks on an unapproved domain', async () => {
		respondWith({ domainOk: false });
		renderGate(baseUrl, projectId);

		await waitFor(() =>
			expect(screen.queryByTestId('flow')).not.toBeInTheDocument()
		);
		expect(screen.queryByTestId('disabled-component')).not.toBeInTheDocument();
	});

	it('makes no request without a base URL', async () => {
		renderGate(undefined, projectId);

		expect(await screen.findByTestId('flow')).toBeInTheDocument();
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it('makes no request without a project id', async () => {
		renderGate(baseUrl, '');

		expect(await screen.findByTestId('flow')).toBeInTheDocument();
		expect(mockFetch).not.toHaveBeenCalled();
	});
});
