const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Allow HTML files to be bundled as assets (needed for offline PDF.js viewer)
config.resolver.assetExts.push("html");

module.exports = config;
