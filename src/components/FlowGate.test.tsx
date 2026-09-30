import '@testing-library/jest-dom';
import { act, render, screen, waitFor } from '@testing-library/react';
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

// Both fetches are issued synchronously in the effect, so the call count is true
// immediately and the gate is still 'open'. Asserting the flow renders without
// letting res.json() and the setState that follows settle would pass even if the
// gate treated the response as disabled, so every positive case flushes first.
const settleRequests = async () => {
	await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
	await act(async () => {
		await Promise.resolve();
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

		await settleRequests();
		expect(screen.getByTestId('flow')).toBeInTheDocument();
		expect(screen.queryByTestId('notfound-component')).not.toBeInTheDocument();
	});

	it('shows the not-found screen when the project turned hosting off', async () => {
		respondWith({ config: { disableAuthHosting: true } });
		renderGate(baseUrl, projectId);

		expect(await screen.findByTestId('notfound-component')).toBeInTheDocument();
		expect(screen.queryByTestId('flow')).not.toBeInTheDocument();
	});

	it('shows the not-found screen even while the domain check still passes', async () => {
		respondWith({ domainOk: true, config: { disableAuthHosting: true } });
		renderGate(baseUrl, projectId);

		expect(await screen.findByTestId('notfound-component')).toBeInTheDocument();
	});

	it('renders the flow when the flag is explicitly false', async () => {
		respondWith({ config: { disableAuthHosting: false } });
		renderGate(baseUrl, projectId);

		await settleRequests();
		expect(screen.getByTestId('flow')).toBeInTheDocument();
		expect(screen.queryByTestId('notfound-component')).not.toBeInTheDocument();
	});

	it('renders the flow for a project that predates the flag', async () => {
		respondWith({ config: { allowAuthHostingIframeEmbedding: true } });
		renderGate(baseUrl, projectId);

		await settleRequests();
		expect(screen.getByTestId('flow')).toBeInTheDocument();
		expect(screen.queryByTestId('notfound-component')).not.toBeInTheDocument();
	});

	it('fails open when the project configuration cannot be read', async () => {
		respondWith({ configOk: false });
		renderGate(baseUrl, projectId);

		await settleRequests();
		expect(screen.getByTestId('flow')).toBeInTheDocument();
		expect(screen.queryByTestId('notfound-component')).not.toBeInTheDocument();
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

		await settleRequests();
		expect(screen.getByTestId('flow')).toBeInTheDocument();
		expect(screen.queryByTestId('notfound-component')).not.toBeInTheDocument();
	});

	// The two requests race. This pins the order that used to lose the notice: the
	// config answers first and sets 'disabled', then the slower domain check comes
	// back unapproved and must not overwrite it with the generic error screen.
	it('keeps the not-found screen when a slower domain check also fails', async () => {
		let releaseDomainCheck: () => void = () => {};
		const domainCheckDone = new Promise<void>((resolve) => {
			releaseDomainCheck = resolve;
		});
		mockFetch.mockImplementation((url: string) => {
			if (url.includes('/v1/flow/validate-domain')) {
				return domainCheckDone.then(() => ({
					ok: true,
					json: async () => ({ success: false })
				}));
			}
			return Promise.resolve({
				ok: true,
				json: async () => ({ disableAuthHosting: true })
			});
		});

		renderGate(baseUrl, projectId);

		expect(await screen.findByTestId('notfound-component')).toBeInTheDocument();

		releaseDomainCheck();
		await act(async () => {
			await Promise.resolve();
		});

		expect(screen.getByTestId('notfound-component')).toBeInTheDocument();
	});

	it('still blocks on an unapproved domain', async () => {
		respondWith({ domainOk: false });
		renderGate(baseUrl, projectId);

		await waitFor(() =>
			expect(screen.queryByTestId('flow')).not.toBeInTheDocument()
		);
		expect(screen.queryByTestId('notfound-component')).not.toBeInTheDocument();
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
