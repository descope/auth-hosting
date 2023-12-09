// eslint-disable-next-line import/no-extraneous-dependencies
import { CycloneDxWebpackPlugin } from '@cyclonedx/webpack-plugin';

export default {
	webpack: {
		plugins: {
			add: [new CycloneDxWebpackPlugin()]
		}
	}
};
