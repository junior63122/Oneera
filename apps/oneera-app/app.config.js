// Configuration dynamique : la connexion Google n'est ajoutée que lorsque l'identifiant client iOS est renseigné
// (app.json → expo.extra.googleIosClientId, ex. « 1234-abcd.apps.googleusercontent.com »).
module.exports = ({ config }) => {
  const id = (config.extra && config.extra.googleIosClientId) || '';
  if (id) {
    const scheme = 'com.googleusercontent.apps.' + id.replace(/\.apps\.googleusercontent\.com$/, '');
    config.plugins = [...(config.plugins || []), ['@react-native-google-signin/google-signin', { iosUrlScheme: scheme }]];
  }
  // Connexion Apple : n'activer (ios.usesAppleSignIn = true) qu'après avoir coché « Sign In with Apple »
  // sur l'identifiant com.mapping.festival (developer.apple.com) — sinon la signature de l'app échoue.
  if (!(config.ios && config.ios.usesAppleSignIn)) {
    config.plugins = (config.plugins || []).filter((p) => (Array.isArray(p) ? p[0] : p) !== 'expo-apple-authentication');
    // Expo applique d'office le module installé : on retire explicitement le droit « applesignin ».
    const { withEntitlementsPlist } = require('expo/config-plugins');
    config = withEntitlementsPlist(config, (c) => { delete c.modResults['com.apple.developer.applesignin']; return c; });
  }
  return config;
};
