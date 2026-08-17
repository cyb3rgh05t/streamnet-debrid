const backend = require("./_backend");

exports.handler = (event) => backend.handleDiscordAuthStart(event);
