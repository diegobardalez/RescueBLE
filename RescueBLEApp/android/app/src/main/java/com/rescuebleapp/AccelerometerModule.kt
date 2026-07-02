package com.rescuebleapp

import android.content.Context
import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class AccelerometerModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        // SeismicService calls this when app is open (process alive)
        @Volatile var seismicCallback: ((Double) -> Unit)? = null
    }

    override fun getName() = "AccelerometerModule"

    // Required by NativeEventEmitter on the JS side
    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Double) {}

    override fun initialize() {
        super.initialize()
        seismicCallback = { mag -> emitEvent("SeismicDetected", mag) }
    }

    @ReactMethod
    fun startForegroundDetection(promise: Promise) {
        try {
            val intent = Intent(reactContext, SeismicService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(intent)
            } else {
                reactContext.startService(intent)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("EXCEPTION", e.message)
        }
    }

    @ReactMethod
    fun stopForegroundDetection(promise: Promise) {
        try {
            reactContext.stopService(Intent(reactContext, SeismicService::class.java))
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("EXCEPTION", e.message)
        }
    }

    /** Returns true (once) if the app was launched by a seismic event while closed. */
    @ReactMethod
    fun checkPendingSeismic(promise: Promise) {
        val prefs = reactContext.getSharedPreferences("rescueble", Context.MODE_PRIVATE)
        val pending = prefs.getBoolean("seismic_pending", false)
        if (pending) prefs.edit().putBoolean("seismic_pending", false).apply()
        promise.resolve(pending)
    }

    private fun emitEvent(name: String, value: Double) {
        if (reactContext.hasActiveCatalystInstance()) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(name, value)
        }
    }

    override fun onCatalystInstanceDestroy() {
        seismicCallback = null
    }
}
