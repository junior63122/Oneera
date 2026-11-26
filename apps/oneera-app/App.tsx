/**
 * ONEERA — version de démonstration installable (TestFlight).
 *
 * Embarque le prototype (prototype/dist) et l'affiche en plein écran, sans réseau :
 * au premier lancement (et à chaque nouvelle version), les fichiers sont copiés dans le dossier de l'app,
 * puis chargés dans une vue web locale. Aucune donnée n'est envoyée : les positions et amis sont simulés.
 */
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Battery from 'expo-battery';
import { Accelerometer } from 'expo-sensors';
import { Asset } from 'expo-asset';
import * as Contacts from 'expo-contacts';
import * as Crypto from 'expo-crypto';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Platform, Share, StyleSheet, Text, View } from 'react-native';
import { WebView as RNWebView, type WebViewMessageEvent } from 'react-native-webview';

// Les types du composant fusionnent les options iOS et Android (incompatibles entre elles) : typage explicite.
type WebViewHandle = { injectJavaScript: (js: string) => void };
const WebView = RNWebView as unknown as React.ComponentType<Record<string, unknown> & { ref?: React.Ref<WebViewHandle> }>;
import { WEB_FILES, WEB_VERSION } from './webManifest';

SplashScreen.preventAutoHideAsync().catch(() => {});

const ROOT = `${FileSystem.documentDirectory}web/`;
const APPLE_SIGNIN = !!(Constants.expoConfig?.ios as { usesAppleSignIn?: boolean } | undefined)?.usesAppleSignIn;
const GOOGLE_IOS_CLIENT_ID: string = (Constants.expoConfig?.extra as { googleIosClientId?: string } | undefined)?.googleIosClientId ?? '';

/** Connexion native demandée par l'interface (pont WebView) : renvoie le jeton d'identité à vérifier par le serveur. */
/** Même normalisation que le serveur (packages/backend/src/api.ts → normalizePhone). */
function normalizePhone(raw: string, cc = '33'): string | null {
  let s = String(raw ?? '').trim().replace(/[\s.\-()/]/g, '');
  if (!s) return null;
  if (s.startsWith('00')) s = '+' + s.slice(2);
  if (!s.startsWith('+')) {
    if (!/^\d+$/.test(s)) return null;
    if (s.startsWith('0') && s.length === 10) s = '+' + cc + s.slice(1);
    else if (s.length === 9 && cc === '33') s = '+33' + s;
    else return null;
  }
  if (!/^\+\d{8,15}$/.test(s)) return null;
  if (s.startsWith('+330')) s = '+33' + s.slice(4);
  return s;
}
/** Contacts du téléphone → empreintes SHA-256 (seules les empreintes quittent l'app ; les noms restent sur le téléphone). */
async function nativeContacts(): Promise<Record<string, unknown>> {
  const perm = await Contacts.requestPermissionsAsync();
  if (perm.status !== 'granted') return { denied: true };
  const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.Emails, Contacts.Fields.PhoneNumbers, Contacts.Fields.Name] });
  const entries: { name: string; hashes: string[] }[] = [];
  for (const c of data.slice(0, 5000)) {
    const ids = new Set<string>();
    for (const e of c.emails ?? []) if (e.email) ids.add(e.email.trim().toLowerCase());
    for (const p of c.phoneNumbers ?? []) { const n = normalizePhone(p.number ?? p.digits ?? ''); if (n) ids.add(n); }
    if (!ids.size) continue;
    const hashes = await Promise.all([...ids].map((v) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, v)));
    entries.push({ name: c.name || [c.firstName, c.lastName].filter(Boolean).join(' ') || '', hashes });
  }
  return { entries, total: data.length };
}

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

/**
 * Avatar vivant : l'interface reçoit toutes les 2 s l'« énergie » du mouvement (écart-type de l'accélération, en g)
 * et le niveau de batterie. Rien n'est enregistré ; capteurs coupés quand l'app passe en arrière-plan.
 */
function useLiveSensors(send: (m: unknown) => void, ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    let buf: number[] = [], last = Date.now(), sub: { remove: () => void } | null = null, alive = true;
    const start = () => {
      if (sub) return;
      Accelerometer.setUpdateInterval(50);
      sub = Accelerometer.addListener(({ x, y, z }) => {
        buf.push(Math.sqrt(x * x + y * y + z * z));
        const now = Date.now();
        if (now - last < 2000) return;
        last = now;
        if (buf.length > 10) { const mu = buf.reduce((a, b) => a + b, 0) / buf.length; const sd = Math.sqrt(buf.reduce((a, b) => a + (b - mu) ** 2, 0) / buf.length); send({ type: 'motion', energy: Math.round(sd * 1000) / 1000 }); }
        buf = [];
      });
    };
    const stop = () => { sub?.remove(); sub = null; buf = []; };
    const battery = async () => {
      try {
        const [level, state] = await Promise.all([Battery.getBatteryLevelAsync(), Battery.getBatteryStateAsync()]);
        if (alive && level >= 0) send({ type: 'battery', level, charging: state === Battery.BatteryState.CHARGING || state === Battery.BatteryState.FULL });
      } catch { /* batterie indisponible (simulateur) */ }
    };
    Accelerometer.isAvailableAsync().then((ok) => { if (ok && alive && AppState.currentState === 'active') start(); }).catch(() => {});
    battery();
    const subs = [Battery.addBatteryLevelListener(() => void battery()), Battery.addBatteryStateListener(() => void battery())];
    const app = AppState.addEventListener('change', (st) => { if (st === 'active') { Accelerometer.isAvailableAsync().then((ok) => ok && start()).catch(() => {}); void battery(); } else stop(); });
    return () => { alive = false; stop(); subs.forEach((s) => s.remove()); app.remove(); };
  }, [ready]);
}

export default function App() {
  const [root, setRoot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const web = useRef<WebViewHandle>(null);
  const [loaded, setLoaded] = useState(false);
  const reply = (msg: unknown) => web.current?.injectJavaScript(`window.__oneeraNative && window.__oneeraNative(${JSON.stringify(msg)}); true;`);
  const onMessage = async (e: WebViewMessageEvent) => {
    let m: { type?: string; provider?: string; id?: string };
    try { m = JSON.parse(e.nativeEvent.data); } catch { return; }
    if (m.type === 'auth' && m.provider) reply({ id: m.id, ...(await nativeSignIn(m.provider)) });
    if (m.type === 'share') { const t = m as { title?: string; text?: string; id?: string }; try { const r = await Share.share({ title: t.title, message: String(t.text ?? '').slice(0, 5_000_000) }); reply({ id: t.id, shared: r.action === Share.sharedAction }); } catch { reply({ id: t.id, shared: false }); } }
    if (m.type === 'contacts') { try { reply({ id: m.id, ...(await nativeContacts()) }); } catch { reply({ id: m.id, error: 'Lecture des contacts impossible.' }); } }
  };
  // Disponibilité annoncée à l'interface avant son chargement.
  const bootstrap = `window.ONEERA_NATIVE = ${JSON.stringify({ apple: Platform.OS === 'ios' && APPLE_SIGNIN, google: !!GOOGLE_IOS_CLIENT_ID, contacts: true, platform: Platform.OS })}; true;`;

  useLiveSensors(reply, loaded);

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
        onLoadEnd={() => { SplashScreen.hideAsync().catch(() => {}); setLoaded(true); }}
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
