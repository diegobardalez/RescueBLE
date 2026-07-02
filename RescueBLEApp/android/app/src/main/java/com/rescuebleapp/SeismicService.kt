package com.rescuebleapp

import android.app.*
import android.app.ActivityManager
import android.content.*
import android.hardware.*
import android.os.*
import androidx.core.app.NotificationCompat
import kotlin.math.sqrt

class SeismicService : Service(), SensorEventListener {

    private var sensorManager: SensorManager? = null
    private var score = 0
    private val THRESHOLD_MAG = 2.8f
    private val SCORE_TRIGGER = 40
    private val SCORE_DECAY = 3
    private var cooldownUntil = 0L

    companion object {
        const val CHANNEL_ID = "rescueble_seismic"
        const val CHANNEL_SOS = "rescueble_sos"
        const val NOTIF_ID = 1001
        const val NOTIF_SOS_ID = 1002
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(NOTIF_ID, buildNotification())
        sensorManager = getSystemService(SENSOR_SERVICE) as SensorManager
        val sensor = sensorManager?.getDefaultSensor(Sensor.TYPE_LINEAR_ACCELERATION)
        sensorManager?.registerListener(this, sensor, SensorManager.SENSOR_DELAY_GAME)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_STICKY

    override fun onDestroy() {
        sensorManager?.unregisterListener(this)
        super.onDestroy()
    }

    override fun onBind(intent: Intent?) = null

    override fun onSensorChanged(event: SensorEvent) {
        val x = event.values[0].toDouble()
        val y = event.values[1].toDouble()
        val z = event.values[2].toDouble()
        val mag = sqrt(x * x + y * y + z * z).toFloat()
        val now = System.currentTimeMillis()
        if (now < cooldownUntil) return

        if (mag >= THRESHOLD_MAG) {
            score++
            if (score >= SCORE_TRIGGER) {
                cooldownUntil = now + 30_000L
                score = 0
                triggerSOS(mag.toDouble())
            }
        } else {
            score = maxOf(0, score - SCORE_DECAY)
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    private fun isAppInForeground(): Boolean {
        val am = getSystemService(ACTIVITY_SERVICE) as? ActivityManager ?: return false
        return am.runningAppProcesses?.any {
            it.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND &&
            it.processName == packageName
        } == true
    }

    private fun triggerSOS(mag: Double) {
        vibrate()
        getSharedPreferences("rescueble", MODE_PRIVATE)
            .edit().putBoolean("seismic_pending", true).apply()

        if (isAppInForeground()) {
            // App visible — navigate via JS callback
            AccelerometerModule.seismicCallback?.invoke(mag)
        } else {
            // App closed/background — show fullscreen notification
            showSOSNotification()
        }
    }

    private fun showSOSNotification() {
        createSOSChannel()
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        } ?: return

        val pi = PendingIntent.getActivity(
            this, 2, launchIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_SOS)
            .setContentTitle("⚠️ SISMO DETECTADO")
            .setContentText("Toca para activar señal SOS automáticamente")
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setContentIntent(pi)
            .setAutoCancel(true)
            .build()

        getSystemService(NotificationManager::class.java)
            ?.notify(NOTIF_SOS_ID, notification)
    }

    private fun createSOSChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_SOS, "RescueBLE SOS",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Alerta de sismo detectado"
                enableLights(true)
                enableVibration(false) // ya vibramos manualmente
            }
            getSystemService(NotificationManager::class.java)
                ?.createNotificationChannel(channel)
        }
    }

    private fun vibrate() {
        val pattern = longArrayOf(0, 300, 150, 300)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            (getSystemService(VIBRATOR_MANAGER_SERVICE) as? VibratorManager)
                ?.defaultVibrator
                ?.vibrate(VibrationEffect.createWaveform(pattern, -1))
        } else {
            @Suppress("DEPRECATION")
            (getSystemService(VIBRATOR_SERVICE) as? Vibrator)
                ?.vibrate(VibrationEffect.createWaveform(pattern, -1))
        }
    }

    private fun buildNotification(): Notification {
        val pi = PendingIntent.getActivity(
            this, 0,
            packageManager.getLaunchIntentForPackage(packageName),
            PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("RescueBLE activo")
            .setContentText("Detección sísmica en segundo plano")
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentIntent(pi)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID, "RescueBLE Sísmico",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Detección sísmica en segundo plano"
                setShowBadge(false)
            }
            getSystemService(NotificationManager::class.java)
                ?.createNotificationChannel(channel)
        }
    }
}
