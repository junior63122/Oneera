/**
 * Module natif de lecture des balises iBeacon.
 * - iOS : CoreLocation (ranging iBeacon filtré par UUID) — un lot par seconde, RSSI moyenné par l'OS.
 * - Android : BluetoothLeScanner, chaque publicité iBeacon reçue (RSSI brut).
 * NON COMPILÉ dans l'environnement de développement actuel : à valider sur appareil (voir README de l'app).
 */
import { EventEmitter, requireNativeModule } from 'expo-modules-core';

export interface NativeBeacon {
  uuid: string;
  major: number;
  minor: number;
  rssi: number;
}

export interface BeaconBatchEvent {
  /** ms epoch */
  at: number;
  /** 'batch' (iOS, une mesure par balise et par seconde) ou 'packet' (Android, un paquet). */
  mode: 'batch' | 'packet';
  beacons: NativeBeacon[];
}

type Events = { onBeacons: (e: BeaconBatchEvent) => void };

const Native = requireNativeModule('OneeraBeacons');
const emitter = new EventEmitter<Events>(Native);

export function startBeaconScan(uuid: string): Promise<void> {
  return Native.start(uuid.toUpperCase());
}

export function stopBeaconScan(): void {
  Native.stop();
}

export function addBeaconListener(fn: (e: BeaconBatchEvent) => void) {
  return emitter.addListener('onBeacons', fn);
}
