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
				}),
				{
					apply: (compiler) => {
						compiler.hooks.afterEmit.tap('ReplaceVersionPlugin', () => {
							const fs = require('fs');
							const gitSha =
								process.env.VERCEL_GIT_COMMIT_SHA ??
								process.env.GITHUB_SHA ??
								process.env.GIT_SHA ??
								'local';
							fs.writeFileSync('public/version', gitSha);
						});
					}
				}
			]
		}
	}
};
