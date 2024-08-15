import fetch from 'node-fetch';

export default async function handler(req, res) {
	const { url } = req.query;

	// URL for default favicon
	const defaultFaviconUrl = 'https://app.descope.com/descope_favicon_24X24.ico';

	try {
		// Fetch the custom favicon
		// to-do: Leave it to Nico to do his magic here
		const response = await fetch(`${url}/favicon.ico`);

		if (response.ok) {
			// If found, pipe the result
			const faviconBuffer = await response.buffer();
			res.setHeader('Content-Type', 'image/x-icon');
			res.send(faviconBuffer);
		} else {
			// If not found, fallback to default
			const defaultResponse = await fetch(defaultFaviconUrl);
			const defaultFaviconBuffer = await defaultResponse.buffer();
			res.setHeader('Content-Type', 'image/x-icon');
			res.send(defaultFaviconBuffer);
		}
	} catch (error) {
		// In case of an error, return default favicon
		const defaultResponse = await fetch(defaultFaviconUrl);
		const defaultFaviconBuffer = await defaultResponse.buffer();
		res.setHeader('Content-Type', 'image/x-icon');
		res.send(defaultFaviconBuffer);
	}
}
