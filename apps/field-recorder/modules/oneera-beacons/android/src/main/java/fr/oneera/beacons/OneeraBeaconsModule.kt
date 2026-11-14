package fr.oneera.beacons

import android.annotation.SuppressLint
import android.bluetooth.BluetoothManager
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.nio.ByteBuffer
import java.util.UUID

/**
 * Scan BLE des trames iBeacon (données fabricant Apple 0x004C, type 0x02, longueur 0x15).
 * Un seul démarrage de scan par session : Android limite à 5 démarrages / 30 s par application.
 */
class OneeraBeaconsModule : Module() {
  private var callback: ScanCallback? = null
  private var targetUuid: UUID? = null

  override fun definition() = ModuleDefinition {
    Name("OneeraBeacons")
    Events("onBeacons")

    AsyncFunction("start") { uuid: String, promise: Promise ->
      try {
        startScan(UUID.fromString(uuid))
        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("E_SCAN", e.message ?: "échec du scan BLE", e)
      }
    }

    Function("stop") { stopScan() }

    OnDestroy { stopScan() }
  }

  @SuppressLint("MissingPermission") // permissions demandées côté JS avant l'appel
  private fun startScan(uuid: UUID) {
    stopScan()
    val ctx = appContext.reactContext ?: throw IllegalStateException("contexte indisponible")
    val adapter = (ctx.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager).adapter
      ?: throw IllegalStateException("Bluetooth indisponible")
    if (!adapter.isEnabled) throw IllegalStateException("Bluetooth désactivé")
    val scanner = adapter.bluetoothLeScanner ?: throw IllegalStateException("scanner BLE indisponible")
    targetUuid = uuid

    // Filtre matériel sur le préfixe iBeacon + UUID (préserve la batterie, requis écran éteint).
    val data = ByteArray(18)
    val mask = ByteArray(18)
    data[0] = 0x02; data[1] = 0x15
    mask[0] = 0xFF.toByte(); mask[1] = 0xFF.toByte()
    val bb = ByteBuffer.wrap(data, 2, 16)
    bb.putLong(uuid.mostSignificantBits); bb.putLong(uuid.leastSignificantBits)
    for (i in 2 until 18) mask[i] = 0xFF.toByte()
    val filter = ScanFilter.Builder().setManufacturerData(0x004C, data, mask).build()
    val settings = ScanSettings.Builder()
      .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
      .setReportDelay(0)
      .build()

    val cb = object : ScanCallback() {
      override fun onScanResult(callbackType: Int, result: ScanResult) {
        val bytes = result.scanRecord?.getManufacturerSpecificData(0x004C) ?: return
        if (bytes.size < 22 || bytes[0] != 0x02.toByte() || bytes[1] != 0x15.toByte()) return
        val buf = ByteBuffer.wrap(bytes)
        val u = UUID(buf.getLong(2), buf.getLong(10))
        if (u != targetUuid) return
        val major = ((bytes[18].toInt() and 0xFF) shl 8) or (bytes[19].toInt() and 0xFF)
        val minor = ((bytes[20].toInt() and 0xFF) shl 8) or (bytes[21].toInt() and 0xFF)
        sendEvent("onBeacons", mapOf(
          "at" to System.currentTimeMillis().toDouble(),
          "mode" to "packet",
          "beacons" to listOf(mapOf("uuid" to u.toString(), "major" to major, "minor" to minor, "rssi" to result.rssi))
        ))
      }

      override fun onScanFailed(errorCode: Int) {
        sendEvent("onBeacons", mapOf("at" to System.currentTimeMillis().toDouble(), "mode" to "packet", "beacons" to emptyList<Any>(), "error" to errorCode))
      }
    }
    scanner.startScan(listOf(filter), settings, cb)
    callback = cb
  }

  @SuppressLint("MissingPermission")
  private fun stopScan() {
    val cb = callback ?: return
    val ctx = appContext.reactContext ?: return
    (ctx.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager).adapter?.bluetoothLeScanner?.stopScan(cb)
    callback = null
  }
}
