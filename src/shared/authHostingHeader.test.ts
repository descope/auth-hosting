import { AUTH_HOSTING_HEADER, addAuthHostingHeader } from './authHostingHeader';

// This is the global beforeRequest for every SDK and flow request, so whatever the caller already
// set has to survive it -- losing Authorization would break every call, not only the flow.
describe('addAuthHostingHeader', () => {
	it('adds the header when there are none', () => {
		expect(addAuthHostingHeader({ path: '/v1/flow/start' })).toEqual({
			path: '/v1/flow/start',
			headers: { [AUTH_HOSTING_HEADER]: '1' }
		});
	});

	it('keeps headers given as a plain object', () => {
		const { headers } = addAuthHostingHeader({
			headers: {
				Authorization: 'Bearer p1',
				'Content-Type': 'application/json'
			}
		});
		expect(headers).toEqual({
			Authorization: 'Bearer p1',
			'Content-Type': 'application/json',
			[AUTH_HOSTING_HEADER]: '1'
		});
	});

	it('keeps headers given as an entry array', () => {
		const { headers } = addAuthHostingHeader({
			headers: [
				['Authorization', 'Bearer p1'],
				['Content-Type', 'application/json']
			] as [string, string][]
		});
		expect(headers).toEqual({
			Authorization: 'Bearer p1',
			'Content-Type': 'application/json',
			[AUTH_HOSTING_HEADER]: '1'
		});
	});

	// Read through the instance's own forEach, so this does not depend on a global Headers.
	it('keeps headers given as a Headers-like instance', () => {
		const headersLike = {
			forEach: (cb: (value: string, name: string) => void) => {
				cb('Bearer p1', 'authorization');
				cb('application/json', 'content-type');
			}
		} as unknown as Headers;

		const { headers } = addAuthHostingHeader({ headers: headersLike });
		expect(headers).toEqual({
			authorization: 'Bearer p1',
			'content-type': 'application/json',
			[AUTH_HOSTING_HEADER]: '1'
		});
	});

	it('leaves the rest of the request alone', () => {
		expect(
			addAuthHostingHeader({
				path: '/v1/flow/next',
				method: 'POST',
				token: 't'
			})
		).toEqual(
			expect.objectContaining({
				path: '/v1/flow/next',
				method: 'POST',
				token: 't'
			})
		);
	});
});
