// eslint-disable-next-line import/no-extraneous-dependencies
import { CycloneDxWebpackPlugin } from '@cyclonedx/webpack-plugin';

import type { CracoConfig } from '@craco/types';

export default <CracoConfig>{
	webpack: {
		plugins: {
			add: [
				new CycloneDxWebpackPlugin({
					includeWellknown: false,
					outputLocation: '../.bom'
				})
			]
		}
	}
};
