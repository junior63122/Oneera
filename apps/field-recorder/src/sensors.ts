/**
 * Branchement des capteurs du téléphone sur l'enregistreur.
 * Toutes les mesures sont transmises brutes au cœur (`SessionRecorder`), qui les normalise.
 */
import * as Location from 'expo-location';
import { Accelerometer, Barometer, Pedometer } from 'expo-sensors';
import { PermissionsAndroid, Platform } from 'react-native';
import { addBeaconListener, startBeaconScan, stopBeaconScan } from '../modules/oneera-beacons/src';
import { SessionRecorder, StillnessDetector } from './core/recorder';

export interface PermissionReport {
  location: boolean;
  bluetooth: boolean;
  motion: boolean;
}

/** Demande les permissions au moment où l'opérateur démarre une mesure (jamais au lancement). */
export async function requestPermissions(): Promise<PermissionReport> {
  const loc = await Location.requestForegroundPermissionsAsync();
  let bluetooth = true;
  if (Platform.OS === 'android' && Platform.Version >= 31) {
    const r = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ]);
    bluetooth = Object.values(r).every((v) => v === PermissionsAndroid.RESULTS.GRANTED);
  }
  const motion = (await Pedometer.requestPermissionsAsync()).granted;
  return { location: loc.granted, bluetooth, motion };
}

/** Démarre tous les capteurs ; renvoie une fonction d'arrêt. */
export async function startSensors(rec: SessionRecorder, ibeaconUuid: string): Promise<() => void> {
  const stops: (() => void)[] = [];

  const beaconSub = addBeaconListener((e) => {
    if (e.mode === 'batch') rec.onBeaconBatch(e.at, e.beacons);
    else for (const b of e.beacons) rec.onBeacon({ ...b, at: e.at });
  });
  stops.push(() => beaconSub.remove());
  await startBeaconScan(ibeaconUuid);
  stops.push(() => stopBeaconScan());

  const locSub = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
    (p) => rec.onLocation(p.timestamp, p.coords.latitude, p.coords.longitude, p.coords.accuracy),
  );
  stops.push(() => locSub.remove());

  const headSub = await Location.watchHeadingAsync((h) => rec.onHeading(h.trueHeading >= 0 ? h.trueHeading : h.magHeading));
  stops.push(() => headSub.remove());

  if (await Pedometer.isAvailableAsync()) {
    let last = 0;
    const pedo = Pedometer.watchStepCount((r) => {
      const delta = r.steps - last;
      last = r.steps;
      rec.onSteps(Date.now(), delta);
    });
    stops.push(() => pedo.remove());
  }

  if (await Barometer.isAvailableAsync()) {
    Barometer.setUpdateInterval(1000);
    const baro = Barometer.addListener((b) => {
      if (typeof b.relativeAltitude === 'number') rec.onRelativeAltitude(Date.now(), b.relativeAltitude);
      else rec.onPressure(Date.now(), b.pressure);
    });
    stops.push(() => baro.remove());
  }

  const still = new StillnessDetector();
  Accelerometer.setUpdateInterval(50);
  const acc = Accelerometer.addListener((a) => {
    const s = still.push(a.x, a.y, a.z);
    if (s !== null) rec.onActivity(Date.now(), s);
  });
  stops.push(() => acc.remove());

  return () => stops.reverse().forEach((f) => f());
}
