// config-overrides.js
const fs = require('fs');
const path = require('path');
const gitSha =
	process.env.VERCEL_GIT_COMMIT_SHA ??
	process.env.GITHUB_SHA ??
	process.env.GIT_SHA;

module.exports = function override(config, env) {
	// New config, e.g. config.plugins.push...
	delete config.module.rules[1].oneOf[3].include;

	// Add a hook to write the version file after build
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

	return config;
};
