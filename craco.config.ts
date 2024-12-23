// eslint-disable-next-line import/no-extraneous-dependencies
import { CycloneDxWebpackPlugin } from '@cyclonedx/webpack-plugin';
import type { CracoConfig } from '@craco/types';
import path from 'path';
import fs from 'fs';

const gitSha =
	process.env.VERCEL_GIT_COMMIT_SHA ??
	process.env.GITHUB_SHA ??
	process.env.GIT_SHA;

export default <CracoConfig>{
	webpack: {
		plugins: {
			add: [
				new CycloneDxWebpackPlugin({
					includeWellknown: false,
					outputLocation: '../.bom'
				}),
				...(gitSha
					? [
							{
								apply: (compiler: any) => {
									compiler.hooks.afterEmit.tap('CreateFilePlugin', () => {
										const outputPath = path.resolve(
											compiler.options.output.path,
											'version'
										);
										fs.writeFileSync(outputPath, gitSha);
									});
								}
							}
						]
					: [])
			]
		}
	}
};
