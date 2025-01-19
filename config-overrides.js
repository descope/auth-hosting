// config-overrides.js
const fs = require('fs');
const path = require('path');
const reactAppRewireBuildDev = require('react-app-rewire-build-dev');

const gitSha =
	process.env.VERCEL_GIT_COMMIT_SHA ??
	process.env.GITHUB_SHA ??
	process.env.GIT_SHA;

module.exports = function override(config, env) {
	// Remove the include restriction
	delete config.module.rules[1].oneOf[3].include;

	// Add version file plugin
	config.plugins.push({
		apply: (compiler) => {
			compiler.hooks.afterEmit.tap('CreateVersionFile', (compilation) => {
				const versionPath = path.join(compiler.options.output.path, 'version');

				try {
					fs.writeFileSync(versionPath, gitSha);
				} catch (error) {
					console.error('Error writing version file:', error);
				}
			});
		}
	});

	config.devServer = // Example: set the dev server to use a specific certificate in https.
		function (configFunction) {
			// Return the replacement function for create-react-app to use to generate the Webpack
			// Development Server config. "configFunction" is the function that would normally have
			// been used to generate the Webpack Development server config - you can use it to create
			// a starting configuration to then modify instead of having to create a config from scratch.
			return function (proxy, allowedHost) {
				// Create the default config by calling configFunction with the proxy/allowedHost parameters
				const config = configFunction(proxy, allowedHost);

				// Change the https certificate options to match your certificate, using the .env file to
				// set the file paths & passphrase.
				const fs = require('fs');
				config.https = {
					key: fs.readFileSync(process.env.REACT_HTTPS_KEY, 'utf8'),
					cert: fs.readFileSync(process.env.REACT_HTTPS_CERT, 'utf8'),
					ca: fs.readFileSync(process.env.REACT_HTTPS_CA, 'utf8'),
					passphrase: process.env.REACT_HTTPS_PASS
				};

				// Return your customised Webpack Development Server config.
				return config;
			};
		};
};
