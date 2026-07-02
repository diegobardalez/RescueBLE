package com.rescuebleapp

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.BluetoothLeAdvertiser
import android.content.Context
import android.media.MediaPlayer
import android.os.ParcelUuid
import com.facebook.react.bridge.*
import java.util.UUID

class BLEAdvertiserModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var advertiser: BluetoothLeAdvertiser? = null
    private var advertiseCallback: AdvertiseCallback? = null
    private var mediaPlayer: MediaPlayer? = null

    override fun getName() = "BLEAdvertiserModule"

    @ReactMethod
    fun startAdvertising(serviceUUID: String, promise: Promise) {
        try {
            val bluetoothManager = reactContext.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
            val bluetoothAdapter = bluetoothManager.adapter

            if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled) {
                promise.reject("BLE_DISABLED", "Bluetooth no está activado")
                return
            }

            if (!bluetoothAdapter.isMultipleAdvertisementSupported) {
                promise.reject("BLE_UNSUPPORTED", "Este dispositivo no soporta BLE advertising")
                return
            }

            advertiser = bluetoothAdapter.bluetoothLeAdvertiser

            val settings = AdvertiseSettings.Builder()
                .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
                .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
                .setConnectable(false)
                .setTimeout(0)
                .build()

            val data = AdvertiseData.Builder()
                .addServiceUuid(ParcelUuid(UUID.fromString(serviceUUID)))
                .setIncludeDeviceName(false)
                .setIncludeTxPowerLevel(false)
                .build()

            advertiseCallback = object : AdvertiseCallback() {
                override fun onStartSuccess(settingsInEffect: AdvertiseSettings?) {
                    promise.resolve("Advertising iniciado")
                }
                override fun onStartFailure(errorCode: Int) {
                    promise.reject("ADVERTISE_FAILED", "Error al iniciar advertising: $errorCode")
                }
            }

            advertiser?.startAdvertising(settings, data, advertiseCallback)
        } catch (e: Exception) {
            promise.reject("EXCEPTION", e.message)
        }
    }

    @ReactMethod
    fun stopAdvertising(promise: Promise) {
        try {
            advertiseCallback?.let { advertiser?.stopAdvertising(it) }
            advertiseCallback = null
            promise.resolve("Advertising detenido")
        } catch (e: Exception) {
            promise.reject("EXCEPTION", e.message)
        }
    }

    @ReactMethod
    fun playBeep(promise: Promise) {
        try {
            if (mediaPlayer == null) {
                val afd = reactContext.assets.openFd("beep.mp3")
                mediaPlayer = MediaPlayer().apply {
                    setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)
                    afd.close()
                    prepare()
                }
            }
            mediaPlayer?.let {
                if (it.isPlaying) it.seekTo(0)
                else it.start()
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SOUND_ERROR", e.message)
        }
    }

    @ReactMethod
    fun stopBeep(promise: Promise) {
        try {
            mediaPlayer?.stop()
            mediaPlayer?.release()
            mediaPlayer = null
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(true)
        }
    }

    override fun onCatalystInstanceDestroy() {
        mediaPlayer?.release()
        mediaPlayer = null
    }
}
