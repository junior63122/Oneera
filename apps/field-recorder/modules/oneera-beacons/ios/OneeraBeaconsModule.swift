import CoreLocation
import ExpoModulesCore

/// Ranging iBeacon via CoreLocation (seule voie fiable sur iOS ; Eddystone n'y est pas exposé).
public class OneeraBeaconsModule: Module {
  private var ranger: BeaconRanger?

  public func definition() -> ModuleDefinition {
    Name("OneeraBeacons")
    Events("onBeacons")

    AsyncFunction("start") { (uuidString: String, promise: Promise) in
      guard let uuid = UUID(uuidString: uuidString) else {
        promise.reject("E_UUID", "UUID iBeacon invalide")
        return
      }
      DispatchQueue.main.async {
        let r = BeaconRanger(uuid: uuid) { [weak self] beacons in
          let now = Date().timeIntervalSince1970 * 1000
          let list = beacons.map { b in
            ["uuid": b.uuid.uuidString, "major": b.major.intValue, "minor": b.minor.intValue, "rssi": b.rssi] as [String: Any]
          }
          self?.sendEvent("onBeacons", ["at": now, "mode": "batch", "beacons": list])
        }
        self.ranger = r
        r.start()
        promise.resolve(nil)
      }
    }

    Function("stop") {
      DispatchQueue.main.async {
        self.ranger?.stop()
        self.ranger = nil
      }
    }
  }
}

final class BeaconRanger: NSObject, CLLocationManagerDelegate {
  private let manager = CLLocationManager()
  private let constraint: CLBeaconIdentityConstraint
  private let onRange: ([CLBeacon]) -> Void

  init(uuid: UUID, onRange: @escaping ([CLBeacon]) -> Void) {
    self.constraint = CLBeaconIdentityConstraint(uuid: uuid)
    self.onRange = onRange
    super.init()
    manager.delegate = self
  }

  func start() {
    if manager.authorizationStatus == .notDetermined {
      manager.requestWhenInUseAuthorization()
    }
    manager.startRangingBeacons(satisfying: constraint)
  }

  func stop() {
    manager.stopRangingBeacons(satisfying: constraint)
  }

  func locationManager(_ manager: CLLocationManager, didRange beacons: [CLBeacon], satisfying constraint: CLBeaconIdentityConstraint) {
    // rssi == 0 : mesure non fiable selon Apple ; filtré côté TypeScript.
    onRange(beacons)
  }

  func locationManager(_ manager: CLLocationManager, didFailRangingFor constraint: CLBeaconIdentityConstraint, error: Error) {
    NSLog("[OneeraBeacons] échec du ranging : \(error.localizedDescription)")
  }
}
