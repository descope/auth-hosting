import {
	WIDGET_FLOW_DONE,
	WIDGET_FLOW_UNAUTHENTICATED,
	getFormParams,
	isNoSessionError,
	reportWidgetFlowFinished,
	reportWidgetFlowUnauthenticated,
	widgetOpenerOrigin
} from './widgetPopup';

const OPENER_ORIGIN = 'https://app.example.com';
const EXECUTION_ID = 'sign-up-or-in|#|3KQ0v5C645AXrPkAggORpgkOY1P';

// stand in for the <descope-wc> the page renders; executionId is empty until
// the flow actually starts, exactly as in the real component
const mountFlow = (executionId: string) => {
	const el = document.createElement('descope-wc');
	(el as any).flowState = { current: { executionId } };
	document.body.appendChild(el);
	return el;
};

const postMessage = jest.fn();
const close = jest.fn();

const asWidgetPopup = () => {
	window.name = `descope-widget-flow|${OPENER_ORIGIN}`;
};

beforeEach(() => {
	postMessage.mockReset();
	close.mockReset();
	window.name = '';
	document.body.innerHTML = '';
	Object.defineProperty(window, 'opener', {
		value: { postMessage },
		configurable: true,
		writable: true
	});
	Object.defineProperty(window, 'close', {
		value: close,
		configurable: true,
		writable: true
	});
});

describe('widgetOpenerOrigin', () => {
	it('is empty for a normal hosted login, which is what keeps this inert', () => {
		expect(widgetOpenerOrigin()).toBe('');
	});

	it('ignores a window name that is not ours', () => {
		window.name = `something-else|${OPENER_ORIGIN}`;
		expect(widgetOpenerOrigin()).toBe('');
	});

	it('ignores our prefix with no origin after it', () => {
		window.name = 'descope-widget-flow';
		expect(widgetOpenerOrigin()).toBe('');
	});

	it('reads the origin the widget stamped', () => {
		asWidgetPopup();
		expect(widgetOpenerOrigin()).toBe(OPENER_ORIGIN);
	});
});

describe('isNoSessionError', () => {
	it.each(['E064002', 'E064003'])(
		'treats %s as "we do not know this user"',
		(errorCode) => {
			expect(isNoSessionError({ errorCode })).toBe(true);
		}
	);

	it('leaves any other error alone, so real failures still surface', () => {
		expect(isNoSessionError({ errorCode: 'E011002' })).toBe(false);
		expect(isNoSessionError({})).toBe(false);
		expect(isNoSessionError(undefined)).toBe(false);
	});
});

describe('reportWidgetFlowFinished', () => {
	it('tells the opener and closes, and reports that it handled it', () => {
		asWidgetPopup();
		mountFlow(EXECUTION_ID);

		expect(reportWidgetFlowFinished()).toBe(true);
		expect(postMessage).toHaveBeenCalledWith(
			{ action: WIDGET_FLOW_DONE },
			OPENER_ORIGIN
		);
		expect(close).toHaveBeenCalled();
	});

	it('sends only "finished" - never a token', () => {
		asWidgetPopup();
		mountFlow(EXECUTION_ID);
		reportWidgetFlowFinished();

		expect(Object.keys(postMessage.mock.calls[0][0])).toEqual(['action']);
	});

	it('does nothing and says so on a normal hosted login', () => {
		mountFlow(EXECUTION_ID);

		expect(reportWidgetFlowFinished()).toBe(false);
		expect(postMessage).not.toHaveBeenCalled();
		expect(close).not.toHaveBeenCalled();
	});
});

describe('reportWidgetFlowUnauthenticated', () => {
	it('hands back to the app rather than signing anyone in here', () => {
		asWidgetPopup();

		expect(reportWidgetFlowUnauthenticated()).toBe(true);
		expect(postMessage).toHaveBeenCalledWith(
			{ action: WIDGET_FLOW_UNAUTHENTICATED },
			OPENER_ORIGIN
		);
		expect(close).toHaveBeenCalled();
	});

	it('stays out of the way on a normal hosted login', () => {
		expect(reportWidgetFlowUnauthenticated()).toBe(false);
		expect(postMessage).not.toHaveBeenCalled();
	});
});

describe('getFormParams', () => {
	it('expands form.<key>, which is how a specific passkey is removed', () => {
		const params = new URLSearchParams(
			'form.externalId=user-1&form.credentialId=cred-9&flow=f'
		);

		expect(getFormParams(params)).toEqual({
			externalId: 'user-1',
			credentialId: 'cred-9'
		});
	});

	it('returns nothing when there are none, so the existing form is unchanged', () => {
		expect(getFormParams(new URLSearchParams('flow=f&user_code=123'))).toEqual(
			{}
		);
	});

	it('does not pick up client.<key>', () => {
		expect(getFormParams(new URLSearchParams('client.userId=u1'))).toEqual({});
	});
});
