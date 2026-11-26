// Configuration dynamique : la connexion Google n'est ajoutée que lorsque l'identifiant client iOS est renseigné
// (app.json → expo.extra.googleIosClientId, ex. « 1234-abcd.apps.googleusercontent.com »).
module.exports = ({ config }) => {
  const id = (config.extra && config.extra.googleIosClientId) || '';
  if (id) {
    const scheme = 'com.googleusercontent.apps.' + id.replace(/\.apps\.googleusercontent\.com$/, '');
    config.plugins = [...(config.plugins || []), ['@react-native-google-signin/google-signin', { iosUrlScheme: scheme }]];
  }
  return config;
};
