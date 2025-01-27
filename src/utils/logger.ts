const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
	log: (...args: any[]) => {
		if (isDevelopment) {
			// eslint-disable-next-line no-console
			console.log(...args);
		}
	},
	error: (...args: any[]) => {
		if (isDevelopment) {
			// eslint-disable-next-line no-console
			console.error(...args);
		}
	}
};
