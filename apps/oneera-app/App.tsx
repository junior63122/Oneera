/**
 * ONEERA — version de démonstration installable (TestFlight).
 *
 * Embarque le prototype (prototype/dist) et l'affiche en plein écran, sans réseau :
 * au premier lancement (et à chaque nouvelle version), les fichiers sont copiés dans le dossier de l'app,
 * puis chargés dans une vue web locale. Aucune donnée n'est envoyée : les positions et amis sont simulés.
 */
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { WEB_FILES, WEB_VERSION } from './webManifest';

SplashScreen.preventAutoHideAsync().catch(() => {});

const ROOT = `${FileSystem.documentDirectory}web/`;

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
        onContentProcessDidTerminate={(e) => e.nativeEvent && setRoot(`${root}`)}
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
