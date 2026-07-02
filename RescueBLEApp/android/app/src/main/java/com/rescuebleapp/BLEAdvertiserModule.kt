package com.rescuebleapp

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.BluetoothLeAdvertiser
import android.content.Context
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.media.MediaPlayer
import android.os.Handler
import android.os.Looper
import android.os.ParcelUuid
import com.facebook.react.bridge.*
import java.util.UUID
import kotlin.math.PI
import kotlin.math.sin

class BLEAdvertiserModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var advertiser: BluetoothLeAdvertiser? = null
    private var advertiseCallback: AdvertiseCallback? = null
    private var mediaPlayer: MediaPlayer? = null

    // Ultrasonic K9
    private var audioTrack: AudioTrack? = null
    private var ultrasonicRunning = false
    private val handler = Handler(Looper.getMainLooper())
    private val SAMPLE_RATE = 44100
    private val FREQ_HZ = 18000.0   // 18 kHz — dentro del rango 5k-100k, alcanzable por speakers Android

    override fun getName() = "BLEAdvertiserModule"

    // ── BLE Advertising ──────────────────────────────────────────────────────

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

    // ── Beep de proximidad ────────────────────────────────────────────────────

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
                if (it.isPlaying) it.seekTo(0) else it.start()
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

    // ── Tono ultrasónico K9 (5s ON / 5s OFF) ─────────────────────────────────

    @ReactMethod
    fun startUltrasonic(promise: Promise) {
        if (ultrasonicRunning) { promise.resolve(true); return }
        ultrasonicRunning = true
        scheduleUltrasonicCycle(playNow = true)
        promise.resolve(true)
    }

    @ReactMethod
    fun stopUltrasonic(promise: Promise) {
        ultrasonicRunning = false
        handler.removeCallbacksAndMessages(null)
        releaseAudioTrack()
        promise.resolve(true)
    }

    private fun scheduleUltrasonicCycle(playNow: Boolean) {
        if (!ultrasonicRunning) return
        if (playNow) {
            playUltrasonicTone()
            // Apagar después de 5 s
            handler.postDelayed({
                releaseAudioTrack()
                // Silencio de 5 s, luego volver a sonar
                handler.postDelayed({ scheduleUltrasonicCycle(playNow = true) }, 5000)
            }, 5000)
        }
    }

    private fun playUltrasonicTone() {
        try {
            // Buffer completo de 5 segundos con fade-in y fade-out de 100ms
            // Evita el chasquido que ocurre al arrancar/parar la onda abruptamente
            val totalSamples = SAMPLE_RATE * 5
            val fadeSamples = (SAMPLE_RATE * 0.1).toInt()  // 100 ms
            val bufferBytes = totalSamples * 2              // 16-bit = 2 bytes/sample

            val samples = ShortArray(totalSamples) { i ->
                val angle = 2.0 * PI * FREQ_HZ * i / SAMPLE_RATE
                val envelope = when {
                    i < fadeSamples -> i.toDouble() / fadeSamples
                    i >= totalSamples - fadeSamples -> (totalSamples - i).toDouble() / fadeSamples
                    else -> 1.0
                }
                (sin(angle) * Short.MAX_VALUE * 0.85 * envelope).toInt().toShort()
            }

            audioTrack = AudioTrack(
                AudioManager.STREAM_MUSIC,
                SAMPLE_RATE,
                AudioFormat.CHANNEL_OUT_MONO,
                AudioFormat.ENCODING_PCM_16BIT,
                bufferBytes,
                AudioTrack.MODE_STATIC
            ).apply {
                write(samples, 0, samples.size)
                play()
            }
        } catch (_: Exception) {}
    }

    private fun releaseAudioTrack() {
        try {
            audioTrack?.stop()
            audioTrack?.release()
        } catch (_: Exception) {}
        audioTrack = null
    }

    // ─────────────────────────────────────────────────────────────────────────

    override fun onCatalystInstanceDestroy() {
        mediaPlayer?.release()
        mediaPlayer = null
        ultrasonicRunning = false
        handler.removeCallbacksAndMessages(null)
        releaseAudioTrack()
    }
}
