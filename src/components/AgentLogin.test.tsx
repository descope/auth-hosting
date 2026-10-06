import React from 'react';
import {
	act,
	fireEvent,
	render,
	screen,
	waitFor
} from '@testing-library/react';
import AgentLogin, { agentLoginProjectId } from './AgentLogin';

const projectId = 'P2Sn0gttY5sY4Zu6WDGAAEJ4VTrv';
const callbackUrl = 'https://shop.example.com/agent/callback';
const apiUrl = 'http://localhost/login/api/agent-ciba';

const mockFetch = jest.fn() as jest.Mock & typeof fetch;
const originalFetch = global.fetch;
let submitSpy: jest.SpyInstance;

const apiReplies = (status: number, body: unknown) => {
	mockFetch.mockResolvedValueOnce({
		ok: status >= 200 && status < 300,
		status,
		json: async () => body
	});
};

const visit = (search: string, path = `/login/agent/${projectId}`) => {
	window.history.pushState({}, '', `${path}${search}`);
};

const sentBody = (callIndex: number) =>
	JSON.parse(mockFetch.mock.calls[callIndex][1].body);

const advance = async (ms: number) => {
	await act(async () => {
		jest.advanceTimersByTime(ms);
	});
};

const submitEmail = async (email = 'alice@example.com') => {
	fireEvent.change(screen.getByLabelText('Your account email'), {
		target: { value: email }
	});
	fireEvent.click(
		screen.getByRole('button', { name: 'Send approval request' })
	);
	await screen.findByText(/We sent an approval request to alice@example.com/);
};

describe('agentLoginProjectId', () => {
	it.each([
		[`/login/agent/${projectId}`, projectId],
		[`/agent/${projectId}`, projectId],
		[`/login/${projectId}`, undefined],
		['/login/agent/not-a-project', undefined],
		['/', undefined]
	])('parses %j', (path, expected) => {
		expect(agentLoginProjectId(path)).toBe(expected);
	});
});

describe('AgentLogin', () => {
	beforeAll(() => {
		global.fetch = mockFetch;
	});

	afterAll(() => {
		global.fetch = originalFetch;
	});

	beforeEach(() => {
		jest.useFakeTimers();
		submitSpy = jest
			.spyOn(HTMLFormElement.prototype, 'submit')
			.mockImplementation(() => {});
		visit('?agent=grok&returnTo=/cart');
	});

	afterEach(() => {
		jest.useRealTimers();
		submitSpy.mockRestore();
	});

	it.each([
		['no agent', ''],
		['an agent with unsafe characters', '?agent=%3Cscript%3E']
	])('shows an invalid link message for %s', (_, search) => {
		visit(search);

		render(<AgentLogin />);

		expect(
			screen.getByText('This agent sign-in link is invalid.')
		).toBeInTheDocument();
	});

	it('shows an invalid link message when the project id is not valid', () => {
		visit('?agent=grok', '/login/agent/Pnope');

		render(<AgentLogin />);

		expect(
			screen.getByText('This agent sign-in link is invalid.')
		).toBeInTheDocument();
	});

	it('starts CIBA, polls, and posts the token to the shop on approval', async () => {
		apiReplies(200, { authReqId: 'test-auth-req-id', interval: 5 });
		apiReplies(200, { status: 'pending' });
		apiReplies(200, {
			status: 'approved',
			accessToken: 'test-access-token',
			callbackUrl
		});
		render(<AgentLogin />);
		expect(
			screen.getByText('grok wants to sign in to your account')
		).toBeInTheDocument();

		await submitEmail();
		expect(mockFetch).toHaveBeenCalledWith(
			apiUrl,
			expect.objectContaining({ method: 'POST' })
		);
		expect(sentBody(0)).toEqual({
			action: 'start',
			projectId,
			agent: 'grok',
			email: 'alice@example.com'
		});

		await advance(5000);
		await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
		expect(sentBody(1)).toEqual({
			action: 'poll',
			projectId,
			agent: 'grok',
			authReqId: 'test-auth-req-id'
		});

		await advance(5000);
		await waitFor(() => expect(submitSpy).toHaveBeenCalledTimes(1));
		const form = screen.getByTestId('agent-login-callback');
		expect(form).toHaveAttribute('action', callbackUrl);
		expect(form).toHaveAttribute('method', 'post');
		expect(form).toHaveFormValues({
			token: 'test-access-token',
			returnTo: '/cart'
		});
	});

	it.each([
		'//evil.example.com',
		'/%09/evil.example.com',
		'/%5Cevil.example.com',
		'https://evil.example.com'
	])('replaces unsafe returnTo %j with the shop root', async (returnTo) => {
		visit(`?agent=grok&returnTo=${returnTo}`);
		apiReplies(200, { authReqId: 'test-auth-req-id', interval: 1 });
		apiReplies(200, {
			status: 'approved',
			accessToken: 'test-access-token',
			callbackUrl
		});
		render(<AgentLogin />);

		await submitEmail();
		await advance(1000);

		await waitFor(() => expect(submitSpy).toHaveBeenCalled());
		expect(screen.getByTestId('agent-login-callback')).toHaveFormValues({
			returnTo: '/'
		});
	});

	it('backs off on slow_down', async () => {
		apiReplies(200, { authReqId: 'test-auth-req-id', interval: 5 });
		apiReplies(200, { status: 'slow_down' });
		apiReplies(200, { status: 'pending' });
		render(<AgentLogin />);
		await submitEmail();

		await advance(5000);
		await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
		await advance(5000);
		expect(mockFetch).toHaveBeenCalledTimes(2);
		await advance(5000);

		await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(3));
	});

	it.each([
		['denied', { status: 'denied' }, 'The request was denied.'],
		[
			'expired',
			{ status: 'expired' },
			'The request expired or is no longer valid.'
		],
		[
			'approved without a token',
			{ status: 'approved' },
			'Something went wrong. Please try again.'
		]
	])('shows a message when the request is %s', async (_, poll, message) => {
		apiReplies(200, { authReqId: 'test-auth-req-id', interval: 1 });
		apiReplies(200, poll);
		render(<AgentLogin />);
		await submitEmail();

		await advance(1000);

		expect(await screen.findByRole('alert')).toHaveTextContent(message);
		expect(submitSpy).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
		expect(screen.getByLabelText('Your account email')).toBeInTheDocument();
	});

	it('shows an error when starting fails', async () => {
		apiReplies(502, { error: 'ciba_start_failed' });
		render(<AgentLogin />);

		fireEvent.change(screen.getByLabelText('Your account email'), {
			target: { value: 'alice@example.com' }
		});
		fireEvent.click(
			screen.getByRole('button', { name: 'Send approval request' })
		);

		expect(await screen.findByRole('alert')).toHaveTextContent(
			'Something went wrong. Please try again.'
		);
	});

	it('shows an error when polling fails', async () => {
		apiReplies(200, { authReqId: 'test-auth-req-id' });
		mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
		render(<AgentLogin />);
		await submitEmail();

		await advance(5000);

		expect(await screen.findByRole('alert')).toHaveTextContent(
			'Something went wrong. Please try again.'
		);
	});
});
