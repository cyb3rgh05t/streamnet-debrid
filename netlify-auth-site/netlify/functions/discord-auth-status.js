const backend = require("./_backend");

exports.handler = (event) => backend.handleDiscordAuthStatus(event);
