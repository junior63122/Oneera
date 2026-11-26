// Les fichiers du prototype (html, webp, png) sont embarqués comme ressources de l'app.
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('html');
module.exports = config;
