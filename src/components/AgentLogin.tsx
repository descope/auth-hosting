import '../App.css';
import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import packageJson from '../../package.json';
import { projectRegex } from '../shared/projectRegex';

const AGENT_NAME_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;
const DEFAULT_INTERVAL_SEC = 5;
const SLOW_DOWN_STEP_SEC = 5;

type Phase =
	| { name: 'email' }
	| { name: 'starting' }
	| { name: 'waiting'; authReqId: string; intervalSec: number }
	| { name: 'approved'; accessToken: string; callbackUrl: string }
	| { name: 'denied' }
	| { name: 'expired' }
	| { name: 'error' };

const TERMINAL_MESSAGES: Partial<Record<Phase['name'], string>> = {
	denied: 'The request was denied.',
	expired: 'The request expired or is no longer valid.',
	error: 'Something went wrong. Please try again.'
};

const agentLoginProjectId = (pathname: string) => {
	const segments = pathname.split('/').filter(Boolean);
	if (segments.length < 2 || segments[segments.length - 2] !== 'agent') {
		return undefined;
	}
	return projectRegex.exec(segments[segments.length - 1])?.[0];
};

// Browsers strip tabs and newlines and treat backslashes as slashes, so any of
// them could turn a relative path into a protocol-relative URL.
const SAFE_RETURN_TO_REGEX = /^\/(?![/\\])[^\s\\]*$/;

const safeReturnTo = (value: string | null) =>
	value && SAFE_RETURN_TO_REGEX.test(value) ? value : '/';

// Same origin only: the function sends no CORS headers.
const agentCibaApiUrl = () =>
	`${window.location.origin}/${packageJson.homepage}/api/agent-ciba`;

const callAgentCiba = async (
	payload: Record<string, string>
): Promise<Record<string, unknown>> => {
	const response = await fetch(agentCibaApiUrl(), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload)
	});
	if (!response.ok) {
		throw new Error(`Agent CIBA request failed (${response.status})`);
	}
	return response.json();
};

const nextPhase = (
	current: Extract<Phase, { name: 'waiting' }>,
	result: Record<string, unknown>
): Phase => {
	switch (result.status) {
		case 'pending':
			// A new object re-arms the poll timer
			return { ...current };
		case 'slow_down':
			return {
				...current,
				intervalSec: current.intervalSec + SLOW_DOWN_STEP_SEC
			};
		case 'approved':
			if (
				typeof result.accessToken === 'string' &&
				typeof result.callbackUrl === 'string'
			) {
				return {
					name: 'approved',
					accessToken: result.accessToken,
					callbackUrl: result.callbackUrl
				};
			}
			return { name: 'error' };
		case 'denied':
			return { name: 'denied' };
		case 'expired':
			return { name: 'expired' };
		default:
			return { name: 'error' };
	}
};

const AgentLogin = () => {
	const { projectId, agent, returnTo } = useMemo(() => {
		const params = new URLSearchParams(window.location.search);
		const agentParam = params.get('agent') ?? '';
		return {
			projectId: agentLoginProjectId(window.location.pathname) ?? '',
			agent: AGENT_NAME_REGEX.test(agentParam) ? agentParam : '',
			returnTo: safeReturnTo(params.get('returnTo'))
		};
	}, []);
	const [email, setEmail] = useState('');
	const [phase, setPhase] = useState<Phase>({ name: 'email' });
	const callbackFormRef = useRef<HTMLFormElement>(null);

	useEffect(() => {
		if (phase.name !== 'waiting') return undefined;
		let active = true;
		const timeoutId = setTimeout(async () => {
			try {
				const result = await callAgentCiba({
					action: 'poll',
					projectId,
					agent,
					authReqId: phase.authReqId
				});
				if (active) setPhase(nextPhase(phase, result));
			} catch {
				if (active) setPhase({ name: 'error' });
			}
		}, phase.intervalSec * 1000);
		return () => {
			active = false;
			clearTimeout(timeoutId);
		};
	}, [phase, projectId, agent]);

	useEffect(() => {
		if (phase.name === 'approved') callbackFormRef.current?.submit();
	}, [phase]);

	const onSubmit = async (event: FormEvent) => {
		event.preventDefault();
		setPhase({ name: 'starting' });
		try {
			const result = await callAgentCiba({
				action: 'start',
				projectId,
				agent,
				email
			});
			if (typeof result.authReqId !== 'string') throw new Error();
			setPhase({
				name: 'waiting',
				authReqId: result.authReqId,
				intervalSec:
					typeof result.interval === 'number' && result.interval > 0
						? result.interval
						: DEFAULT_INTERVAL_SEC
			});
		} catch {
			setPhase({ name: 'error' });
		}
	};

	if (!projectId || !agent) {
		return (
			<div className="app" data-testid="agent-login">
				<div className="app-content">
					<h2>This agent sign-in link is invalid.</h2>
				</div>
			</div>
		);
	}

	const terminalMessage = TERMINAL_MESSAGES[phase.name];
	const collectingEmail = phase.name === 'email' || phase.name === 'starting';

	return (
		<div className="app" data-testid="agent-login">
			<div className="app-content">
				<h2>{agent} wants to sign in to your account</h2>
				{collectingEmail && (
					<form className="agent-login-form" onSubmit={onSubmit}>
						<label htmlFor="agent-login-email">
							Your account email
							<input
								id="agent-login-email"
								type="email"
								required
								autoComplete="email"
								value={email}
								disabled={phase.name === 'starting'}
								onChange={(event) => setEmail(event.target.value)}
							/>
						</label>
						<button type="submit" disabled={phase.name === 'starting'}>
							Send approval request
						</button>
					</form>
				)}
				{phase.name === 'waiting' && (
					<p className="text-body">
						We sent an approval request to {email}. Approve it to let {agent}{' '}
						in. This page continues on its own.
					</p>
				)}
				{phase.name === 'approved' && (
					<>
						<p className="text-body">Approved. Taking you back...</p>
						<form
							ref={callbackFormRef}
							method="post"
							action={phase.callbackUrl}
							data-testid="agent-login-callback"
						>
							<input type="hidden" name="token" value={phase.accessToken} />
							<input type="hidden" name="returnTo" value={returnTo} />
						</form>
					</>
				)}
				{terminalMessage && (
					<>
						<p className="text-body" role="alert">
							{terminalMessage}
						</p>
						<button type="button" onClick={() => setPhase({ name: 'email' })}>
							Try again
						</button>
					</>
				)}
			</div>
		</div>
	);
};

export { agentLoginProjectId };
export default AgentLogin;
