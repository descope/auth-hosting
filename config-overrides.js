// config-overrides.js
module.exports = function override(config, env) {
	// New config, e.g. config.plugins.push...
	delete config.module.rules[1].oneOf[3].include
	return config
}
