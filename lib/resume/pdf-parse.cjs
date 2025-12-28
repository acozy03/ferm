// Bridge the CommonJS entry of pdf-parse so Next never touches the ESM build.
// eslint-disable-next-line @typescript-eslint/no-require-imports
module.exports = require("pdf-parse")
