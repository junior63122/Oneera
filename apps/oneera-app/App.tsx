/**
 * ONEERA — version de démonstration installable (TestFlight).
 *
 * Embarque le prototype (prototype/dist) et l'affiche en plein écran, sans réseau :
 * au premier lancement (et à chaque nouvelle version), les fichiers sont copiés dans le dossier de l'app,
 * puis chargés dans une vue web locale. Aucune donnée n'est envoyée : les positions et amis sont simulés.
 */
import * as AppleAuthentication from 'expo-apple-authentication';
import { Asset } from 'expo-asset';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { WebView as RNWebView, type WebViewMessageEvent } from 'react-native-webview';

// Les types du composant fusionnent les options iOS et Android (incompatibles entre elles) : typage explicite.
type WebViewHandle = { injectJavaScript: (js: string) => void };
const WebView = RNWebView as unknown as React.ComponentType<Record<string, unknown> & { ref?: React.Ref<WebViewHandle> }>;
import { WEB_FILES, WEB_VERSION } from './webManifest';

SplashScreen.preventAutoHideAsync().catch(() => {});

const ROOT = `${FileSystem.documentDirectory}web/`;
const GOOGLE_IOS_CLIENT_ID: string = (Constants.expoConfig?.extra as { googleIosClientId?: string } | undefined)?.googleIosClientId ?? '';

/** Connexion native demandée par l'interface (pont WebView) : renvoie le jeton d'identité à vérifier par le serveur. */
async function nativeSignIn(provider: string): Promise<Record<string, unknown>> {
  if (provider === 'apple') {
    if (Platform.OS !== 'ios' || !(await AppleAuthentication.isAvailableAsync())) return { error: 'Connexion Apple indisponible sur cet appareil.' };
    try {
      const c = await AppleAuthentication.signInAsync({ requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL] });
      return { identityToken: c.identityToken, fullName: c.fullName?.givenName ?? null };
    } catch (e) {
      return (e as { code?: string }).code === 'ERR_REQUEST_CANCELED' ? { cancelled: true } : { error: 'Connexion Apple impossible. Réessaie.' };
    }
  }
  if (provider === 'google') {
    if (!GOOGLE_IOS_CLIENT_ID) return { error: 'Connexion Google pas encore activée dans cette version.' };
    try {
      // Chargé seulement si configuré (module natif absent sinon).
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      GoogleSignin.configure({ iosClientId: GOOGLE_IOS_CLIENT_ID });
      if (Platform.OS === 'android') await GoogleSignin.hasPlayServices();
      const r = await GoogleSignin.signIn();
      if (r.type !== 'success') return { cancelled: true };
      return { idToken: r.data.idToken, name: r.data.user.givenName ?? null };
    } catch {
      return { error: 'Connexion Google impossible. Réessaie.' };
    }
  }
  return { error: 'Fournisseur inconnu.' };
}

async function installWeb(): Promise<string> {
  const marker = `${ROOT}.version`;
  const info = await FileSystem.getInfoAsync(marker);
  if (info.exists && (await FileSystem.readAsStringAsync(marker)) === WEB_VERSION) return ROOT;
  await FileSystem.deleteAsync(ROOT, { idempotent: true });
  const dirs = new Set(WEB_FILES.map(([p]) => p.split('/').slice(0, -1).join('/')));
  for (const d of dirs) await FileSystem.makeDirectoryAsync(ROOT + d, { intermediates: true });
  // Copie par petits lots pour rester rapide sans saturer le système de fichiers.
  for (let i = 0; i < WEB_FILES.length; i += 12) {
    await Promise.all(WEB_FILES.slice(i, i + 12).map(async ([path, mod]) => {
      const a = Asset.fromModule(mod);
      await a.downloadAsync();
      if (!a.localUri) throw new Error(`Fichier introuvable : ${path}`);
      await FileSystem.copyAsync({ from: a.localUri, to: ROOT + path });
    }));
  }
  await FileSystem.writeAsStringAsync(marker, WEB_VERSION);
  return ROOT;
}

export default function App() {
  const [root, setRoot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const web = useRef<WebViewHandle>(null);
  const reply = (msg: unknown) => web.current?.injectJavaScript(`window.__oneeraNative && window.__oneeraNative(${JSON.stringify(msg)}); true;`);
  const onMessage = async (e: WebViewMessageEvent) => {
    let m: { type?: string; provider?: string; id?: string };
    try { m = JSON.parse(e.nativeEvent.data); } catch { return; }
    if (m.type === 'auth' && m.provider) reply({ id: m.id, ...(await nativeSignIn(m.provider)) });
  };
  // Disponibilité annoncée à l'interface avant son chargement.
  const bootstrap = `window.ONEERA_NATIVE = ${JSON.stringify({ apple: Platform.OS === 'ios', google: !!GOOGLE_IOS_CLIENT_ID, platform: Platform.OS })}; true;`;

  useEffect(() => {
    installWeb().then(setRoot).catch((e) => setError(String(e?.message ?? e)));
  }, []);

  if (error) {
    SplashScreen.hideAsync().catch(() => {});
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Impossible d'ouvrir ONEERA</Text>
        <Text style={styles.msg}>{error}</Text>
      </View>
    );
  }
  if (!root) return <View style={styles.center}><ActivityIndicator color="#ffffff" /></View>;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <WebView
        ref={web}
        onMessage={onMessage}
        injectedJavaScriptBeforeContentLoaded={bootstrap}
        source={{ uri: `${root}index.html` }}
        allowingReadAccessToURL={root}
        originWhitelist={['*']}
        allowFileAccess
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
        javaScriptEnabled
        domStorageEnabled
        bounces={false}
        overScrollMode="never"
        scrollEnabled={false}
        setBuiltInZoomControls={false}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        allowsBackForwardNavigationGestures={false}
        mediaPlaybackRequiresUserAction={false}
        style={styles.web}
        onLoadEnd={() => SplashScreen.hideAsync().catch(() => {})}
        onContentProcessDidTerminate={() => setRoot(`${root}`)}
        {...(Platform.OS === 'android' ? { mixedContentMode: 'always' as const } : {})}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#010922' },
  web: { flex: 1, backgroundColor: '#010922' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#010922', padding: 24 },
  title: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  msg: { color: '#c9cbe0', fontSize: 14, textAlign: 'center' },
});
