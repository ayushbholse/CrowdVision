const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add support for BlazeFace model files and other binary assets
config.resolver.assetExts.push('bin', 'txt', 'jpg', 'png', 'json');

module.exports = config;
