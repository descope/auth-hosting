import fetch from 'node-fetch';

export default async function handler(req, res) {
	const { url } = req.query;
	const defaultFaviconUrl = process.env.DEFAULT_FAVICON_URL;

	try {
		const response = await fetch(url);

		if (response.ok) {
			return res.status(200).json({ faviconUrl: url });
		} else {
			return res.status(200).json({ faviconUrl: defaultFaviconUrl });
		}
	} catch (error) {
		return res.status(200).json({ faviconUrl: defaultFaviconUrl });
	}
}
