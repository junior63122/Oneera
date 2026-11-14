/**
 * ONEERA Mesure — app interne de métrologie terrain.
 * Écrans : 1) préparation (pack du lieu, session du protocole, conditions) ; 2) enregistrement
 * (points de contrôle à toucher, contrôles qualité en direct) ; 3) export du fichier de session.
 * Interface sombre, gros boutons : utilisable dans un club bruyant et peu éclairé.
 */
import * as Device from 'expo-device';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { StatusBar } from 'expo-status-bar';
import { useKeepAwake } from 'expo-keep-awake';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { FieldPack, LiveStats, SessionRecorder, validateFieldPack } from './src/core/recorder';
import { requestPermissions, startSensors } from './src/sensors';
import testPack from './assets/test-club.pack.json';

type Phase = 'setup' | 'recording' | 'done';
const PROTOCOLS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];
const CROWDS = ['empty', 'light', 'medium', 'dense'] as const;
const CROWD_LABEL: Record<(typeof CROWDS)[number], string> = { empty: 'Vide', light: 'Peu', medium: 'Moyen', dense: 'Dense' };

export default function App() {
  useKeepAwake();
  const [phase, setPhase] = useState<Phase>('setup');
  const [pack, setPack] = useState<FieldPack>(validateFieldPack(testPack));
  const [packUrl, setPackUrl] = useState('');
  const [protocol, setProtocol] = useState('S1');
  const [crowd, setCrowd] = useState<(typeof CROWDS)[number]>('empty');
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);
  const rec = useRef<SessionRecorder | null>(null);
  const stop = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (phase !== 'recording') return;
    const id = setInterval(() => rec.current && setStats({ ...rec.current.stats }), 500);
    return () => clearInterval(id);
  }, [phase]);

  async function loadPack() {
    setError(null);
    try {
      const r = await fetch(packUrl.trim());
      setPack(validateFieldPack(await r.json()));
    } catch (e) {
      setError(`Pack non chargé : ${(e as Error).message}`);
    }
  }

  async function start() {
    setError(null);
    const perms = await requestPermissions();
    if (!perms.location || !perms.bluetooth) {
      setError('Localisation et Bluetooth sont nécessaires pour mesurer. Autorisez-les dans les réglages.');
      return;
    }
    const now = Date.now();
    rec.current = new SessionRecorder({
      sessionId: `${pack.venueId}-${protocol}-${new Date(now).toISOString().replace(/[:.]/g, '-')}`,
      venueId: pack.venueId,
      mapVersion: pack.mapVersion,
      georef: pack.georef,
      checkpoints: pack.checkpoints,
      protocol,
      crowd,
      carry: protocol === 'S5' ? 'mixed' : 'hand',
      device: {
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        model: Device.modelName ?? 'inconnu',
        osVersion: Device.osVersion ?? 'inconnue',
        appVersion: '0.1.0',
      },
    }, now);
    try {
      stop.current = await startSensors(rec.current, pack.ibeaconUuid);
      setPhase('recording');
    } catch (e) {
      setError(`Capteurs indisponibles : ${(e as Error).message}`);
    }
  }

  async function finish() {
    stop.current?.();
    const text = rec.current!.finish();
    const path = `${FileSystem.documentDirectory}${pack.venueId}-${protocol}-${Date.now()}.jsonl`;
    await FileSystem.writeAsStringAsync(path, text);
    setFilePath(path);
    setPhase('done');
  }

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <Text style={s.title}>ONEERA · Mesure</Text>
      <Text style={s.sub}>{pack.venueName}</Text>
      {error && <Text style={s.error}>{error}</Text>}

      {phase === 'setup' && (
        <ScrollView contentContainerStyle={s.col}>
          <Text style={s.label}>Pack du lieu (URL fournie par ONEERA)</Text>
          <TextInput style={s.input} value={packUrl} onChangeText={setPackUrl} placeholder="https://…/pack.json" placeholderTextColor="#667" autoCapitalize="none" />
          <Btn label="Charger le pack" onPress={loadPack} disabled={!packUrl} />
          <Text style={s.label}>Session du protocole</Text>
          <Row>{PROTOCOLS.map((p) => <Chip key={p} label={p} on={protocol === p} onPress={() => setProtocol(p)} />)}</Row>
          <Text style={s.label}>Affluence</Text>
          <Row>{CROWDS.map((c) => <Chip key={c} label={CROWD_LABEL[c]} on={crowd === c} onPress={() => setCrowd(c)} />)}</Row>
          <Text style={s.hint}>{pack.checkpoints.length} points de contrôle · balises {pack.ibeaconUuid.slice(0, 8)}…</Text>
          <Btn label="Démarrer la mesure" onPress={start} big />
        </ScrollView>
      )}

      {phase === 'recording' && stats && (
        <View style={s.fill}>
          <View style={s.stats}>
            <Stat k="Durée" v={`${Math.floor(stats.elapsedS / 60)} min ${Math.floor(stats.elapsedS % 60)} s`} />
            <Stat k="Balises vues" v={String(stats.beaconsLastWindow)} warn={stats.beaconsLastWindow < 3} />
            <Stat k="RSSI max" v={stats.strongestRssi === null ? '—' : `${stats.strongestRssi} dBm`} />
            <Stat k="GNSS" v={stats.gnssAccuracyM === null ? '—' : `± ${Math.round(stats.gnssAccuracyM)} m`} />
            <Stat k="Pas" v={String(stats.steps)} />
            <Stat k="Points touchés" v={String(stats.truthMarks)} />
          </View>
          <Text style={s.label}>Touchez le point quand vous êtes DESSUS</Text>
          <ScrollView contentContainerStyle={s.grid}>
            {pack.checkpoints.map((c) => (
              <Pressable key={c.id} onPress={() => rec.current?.markTruth(Date.now(), c.id)}
                style={({ pressed }) => [s.cp, stats.lastCheckpoint === c.id && s.cpLast, pressed && s.cpPressed]}>
                <Text style={s.cpText}>{c.id}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Btn label="Terminer et enregistrer" onPress={finish} big />
        </View>
      )}

      {phase === 'done' && (
        <View style={s.col}>
          <Text style={s.label}>Session enregistrée</Text>
          <Text style={s.hint}>{filePath}</Text>
          <Btn label="Partager le fichier" onPress={() => filePath && Sharing.shareAsync(filePath, { mimeType: 'application/x-ndjson' })} big />
          <Btn label="Nouvelle mesure" onPress={() => { setPhase('setup'); setStats(null); }} />
        </View>
      )}
    </View>
  );
}

const Row = ({ children }: { children: React.ReactNode }) => <View style={s.row}>{children}</View>;
const Chip = ({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) => (
  <Pressable onPress={onPress} style={[s.chip, on && s.chipOn]}><Text style={s.chipText}>{label}</Text></Pressable>
);
const Btn = ({ label, onPress, big, disabled }: { label: string; onPress: () => void; big?: boolean; disabled?: boolean }) => (
  <Pressable onPress={onPress} disabled={disabled} style={[s.btn, big && s.btnBig, disabled && { opacity: 0.4 }]}><Text style={s.btnText}>{label}</Text></Pressable>
);
const Stat = ({ k, v, warn }: { k: string; v: string; warn?: boolean }) => (
  <View style={s.stat}><Text style={s.statK}>{k}</Text><Text style={[s.statV, warn && { color: '#ffb020' }]}>{v}</Text></View>
);

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b0b12', paddingTop: 56, paddingHorizontal: 16 },
  title: { color: '#fff', fontSize: 22, fontWeight: '700' },
  sub: { color: '#9aa0b4', marginBottom: 12 },
  error: { color: '#ff6b6b', marginVertical: 8 },
  col: { gap: 12, paddingBottom: 40 },
  fill: { flex: 1, gap: 12, paddingBottom: 24 },
  label: { color: '#cfd3e0', fontSize: 15, fontWeight: '600', marginTop: 8 },
  hint: { color: '#8a90a6', fontSize: 13 },
  input: { borderWidth: 1, borderColor: '#2a2d3e', borderRadius: 10, padding: 12, color: '#fff' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#1a1c28' },
  chipOn: { backgroundColor: '#7b5cff' },
  chipText: { color: '#fff', fontWeight: '600' },
  btn: { backgroundColor: '#24263a', borderRadius: 12, padding: 14, alignItems: 'center' },
  btnBig: { backgroundColor: '#7b5cff', padding: 18 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: { width: '31%', backgroundColor: '#151726', borderRadius: 10, padding: 10 },
  statK: { color: '#8a90a6', fontSize: 11 },
  statV: { color: '#fff', fontSize: 16, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cp: { width: 72, height: 72, borderRadius: 14, backgroundColor: '#1d2033', alignItems: 'center', justifyContent: 'center' },
  cpLast: { backgroundColor: '#1f6f4a' },
  cpPressed: { backgroundColor: '#7b5cff' },
  cpText: { color: '#fff', fontSize: 20, fontWeight: '800' },
});
