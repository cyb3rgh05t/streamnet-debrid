const backend = require("./_backend");

exports.handler = (event) => backend.handleDiscordAuthCallback(event);
