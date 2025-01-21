// config-overrides.js
const fs = require('fs');
const path = require('path');
const gitSha =
	process.env.VERCEL_GIT_COMMIT_SHA ??
	process.env.GITHUB_SHA ??
	process.env.GIT_SHA;

module.exports = {
	// The Webpack config to use when compiling your react app for development or production.
	webpack: function (config, env) {
		// New config, e.g. config.plugins.push...
		delete config.module.rules[1].oneOf[3].include;

		// Add a hook to write the version file after build
		config.plugins.push({
			apply: (compiler) => {
				compiler.hooks.afterEmit.tap('CreateVersionFile', (compilation) => {
					const versionPath = path.join(
						compiler.options.output.path,
						'version'
					);

					try {
						fs.writeFileSync(versionPath, gitSha ?? env);
					} catch (error) {
						console.error('Error writing version file:', error);
					}
				});

				compiler.hooks.afterEmit.tap('GenerateEnvJS', (compilation) => {
					const envPath = path.join(compiler.options.output.path, 'env.js');

					try {
						// Filter out any keys that start with 'npm_'
						const filteredEnv = Object.fromEntries(
							Object.entries(process.env).filter(
								([key]) =>
									key.startsWith('REACT_APP') ||
									key.startsWith('NEXT_PUBLIC') ||
									key.startsWith('PUBLIC_URL')
							)
						);

						fs.writeFileSync(
							envPath,
							`window.env = ${JSON.stringify(filteredEnv)}`
						);
					} catch (error) {
						console.error('Error writing env file:', error);
					}
				});
			}
		});
		return config;
	},
	devServer: function (configFunction) {
		return function (proxy, allowedHost) {
			const config = configFunction(proxy, allowedHost);

			// To allow the env.js file to be written to disk
			config.devMiddleware = {
				writeToDisk: true
			};

			return config;
		};
	}
};
