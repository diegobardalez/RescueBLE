import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  AppState,
  Platform,
  Alert,
  Vibration,
  NativeModules,
} from 'react-native';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { COLORS, RESCUE_SERVICE_UUID } from '../utils/constants';

const BLEAdvertiser = NativeModules.BLEAdvertiserModule;

type AdvertisingState = 'idle' | 'advertising' | 'error';

export default function VictimScreen() {
  const [state, setState] = useState<AdvertisingState>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [deviceId] = useState(() => Math.floor(Math.random() * 9000 + 1000).toString());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef(AppState.currentState);

  const deviceName = `SOS-${deviceId}`;

  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, []);

  // Arrancar señal automáticamente al entrar a la pantalla
  useEffect(() => {
    startAdvertising();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startAdvertising = useCallback(async () => {
    try {
      if (Platform.OS === 'android' && Platform.Version >= 31) {
        const result = await request(PERMISSIONS.ANDROID.BLUETOOTH_ADVERTISE);
        if (result !== RESULTS.GRANTED) {
          Alert.alert('Permiso requerido', 'Se necesita permiso de Bluetooth para emitir la señal SOS.');
          return;
        }
      }
      await BLEAdvertiser.startAdvertising(RESCUE_SERVICE_UUID);
      setState('advertising');
      setElapsedSeconds(0);
      Vibration.vibrate(200);
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(s => s + 1);
      }, 1000);
    } catch (err: any) {
      setState('error');
      Alert.alert('Error BLE', err?.message || `No se pudo iniciar la señal: ${err}`);
    }
  }, []);

  const stopAdvertising = useCallback(async () => {
    try {
      await BLEAdvertiser.stopAdvertising();
    } catch (_) {}
    setState('idle');
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopAdvertising();
    };
  }, [stopAdvertising]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const isActive = state === 'advertising';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <View style={styles.container}>
        <View style={styles.central}>
          <View style={[styles.pulse, isActive && styles.pulseActive]}>
            <View style={[styles.pulseInner, isActive && styles.pulseInnerActive]}>
              <Text style={styles.pulseIcon}>{isActive ? '📶' : '📵'}</Text>
            </View>
          </View>

          <Text style={[styles.stateLabel, isActive && styles.stateLabelActive]}>
            {isActive ? 'SEÑAL ACTIVA' : 'SEÑAL APAGADA'}
          </Text>

          {isActive && (
            <Text style={styles.elapsed}>Tiempo activo: {formatTime(elapsedSeconds)}</Text>
          )}
        </View>

        <View style={styles.infoCard}>
          <Row label="Nombre BLE" value={deviceName} mono />
          <Row label="UUID servicio" value={RESCUE_SERVICE_UUID.slice(0, 18) + '...'} mono />
          <Row label="Plataforma" value={Platform.OS === 'ios' ? 'iOS (iBeacon)' : 'Android (BLE)'} />
          <Row label="Estado" value={isActive ? '✅ Emitiendo' : '⏸ Inactivo'} />
        </View>

        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 Para maximizar las chances de rescate</Text>
          <Text style={styles.tip}>• Mantén el teléfono con carga o conectado</Text>
          <Text style={styles.tip}>• Activa el volumen al máximo — el rescatista puede llamarte</Text>
          <Text style={styles.tip}>• La señal atraviesa escombros hasta ~10-20m</Text>
          <Text style={styles.tip}>• Puedes apagar la pantalla — la señal continúa</Text>
        </View>

        <TouchableOpacity
          style={[styles.btn, isActive ? styles.btnStop : styles.btnStart]}
          onPress={isActive ? stopAdvertising : startAdvertising}
          activeOpacity={0.8}
        >
          <Text style={styles.btnText}>
            {isActive ? '⏹ Apagar señal SOS' : '🆘 Activar señal SOS'}
          </Text>
        </TouchableOpacity>

        {!isActive && (
          <Text style={styles.disclaimer}>
            Al activar, el dispositivo emitirá una señal Bluetooth continua
            que los rescatistas podrán detectar.
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, mono && styles.mono]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    gap: 16,
  },
  central: { alignItems: 'center', paddingVertical: 24 },
  pulse: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  pulseActive: {
    borderColor: COLORS.warning,
    backgroundColor: COLORS.warningBg,
    shadowColor: COLORS.warning,
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  pulseInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseInnerActive: { backgroundColor: COLORS.warning + '30' },
  pulseIcon: { fontSize: 36 },
  stateLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 2,
  },
  stateLabelActive: { color: COLORS.warning },
  elapsed: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { fontSize: 13, color: COLORS.textMuted },
  rowValue: { fontSize: 13, color: COLORS.text, fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
  mono: { fontFamily: 'monospace', fontSize: 12 },
  tipsCard: {
    backgroundColor: COLORS.blueBg,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.blue + '40',
    gap: 6,
  },
  tipsTitle: { fontSize: 13, fontWeight: '600', color: COLORS.blue, marginBottom: 4 },
  tip: { fontSize: 13, color: COLORS.textMuted, lineHeight: 20 },
  btn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  btnStart: {
    backgroundColor: COLORS.warningBg,
    borderColor: COLORS.warning + '60',
  },
  btnStop: {
    backgroundColor: COLORS.accentSoft,
    borderColor: COLORS.accent + '60',
  },
  btnText: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  disclaimer: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
