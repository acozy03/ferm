// Bridge the CommonJS entry of pdf-parse so Next never touches the ESM build.
module.exports = require("pdf-parse");
