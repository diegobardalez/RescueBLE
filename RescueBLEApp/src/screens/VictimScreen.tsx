import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, AppState, Platform, Alert, Vibration,
  NativeModules, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { COLORS, RESCUE_SERVICE_UUID } from '../utils/constants';

type Nav = NativeStackNavigationProp<{ Home: undefined; Rescuer: undefined; Victim: undefined }>;

const BLEAdvertiser = NativeModules.BLEAdvertiserModule;

type AdvertisingState = 'idle' | 'advertising' | 'error';

function PulsingSignal({ active }: { active: boolean }) {
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (active) {
      const pulse = (anim: Animated.Value, delay: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, { toValue: 1, duration: 1600, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
          ])
        );
      animRef.current = Animated.parallel([pulse(ring1, 0), pulse(ring2, 500), pulse(ring3, 1000)]);
      animRef.current.start();
    } else {
      animRef.current?.stop();
      ring1.setValue(0); ring2.setValue(0); ring3.setValue(0);
    }
  }, [active, ring1, ring2, ring3]);

  const ringStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.5, 0.15, 0] }),
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.8] }) }],
  });

  return (
    <View style={pulseStyles.wrap}>
      <Animated.View style={[pulseStyles.ring, ringStyle(ring1)]} />
      <Animated.View style={[pulseStyles.ring, ringStyle(ring2)]} />
      <Animated.View style={[pulseStyles.ring, ringStyle(ring3)]} />
      <View style={[pulseStyles.core, active && pulseStyles.coreActive]}>
        <Text style={pulseStyles.icon}>{active ? '📶' : '📵'}</Text>
      </View>
    </View>
  );
}

function StatBox({ icon, label, value, color }: { icon: string; label: string; value: string; color?: string }) {
  return (
    <View style={statStyles.box}>
      <Text style={statStyles.icon}>{icon}</Text>
      <Text style={[statStyles.value, color ? { color } : {}]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

export default function VictimScreen() {
  const nav = useNavigation<Nav>();
  const [state, setState] = useState<AdvertisingState>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [deviceId] = useState(() => Math.floor(Math.random() * 9000 + 1000).toString());
  const [ultrasonicOn, setUltrasonicOn] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', next => { appStateRef.current = next; });
    return () => sub.remove();
  }, []);

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
      intervalRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    } catch (err: any) {
      setState('error');
      Alert.alert('Error BLE', err?.message || `No se pudo iniciar la señal: ${err}`);
    }
  }, []);

  const stopAdvertising = useCallback(async () => {
    try { await BLEAdvertiser.stopAdvertising(); } catch (_) {}
    setState('idle');
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  const toggleUltrasonic = useCallback(async (val: boolean) => {
    setUltrasonicOn(val);
    try {
      if (val) await BLEAdvertiser.startUltrasonic();
      else await BLEAdvertiser.stopUltrasonic();
    } catch (_) {}
  }, []);

  useEffect(() => () => {
    stopAdvertising();
    BLEAdvertiser.stopUltrasonic?.().catch(() => {});
  }, [stopAdvertising]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const isActive = state === 'advertising';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#110D00" />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Animación central */}
        <View style={styles.centralWrap}>
          <PulsingSignal active={isActive} />
          <View style={[styles.statusBadge, isActive && styles.statusBadgeActive]}>
            <View style={[styles.statusDot, isActive && styles.statusDotActive]} />
            <Text style={[styles.statusText, isActive && styles.statusTextActive]}>
              {isActive ? 'Señal activa' : 'Señal inactiva'}
            </Text>
          </View>
        </View>

        {/* Timer */}
        {isActive && (
          <View style={styles.timerWrap}>
            <Text style={styles.timer}>{formatTime(elapsedSeconds)}</Text>
            <Text style={styles.timerLabel}>Emitiendo señal Bluetooth</Text>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatBox icon="🔋" label="Batería" value="OK" />
          <StatBox icon="✳️" label="Estado" value={isActive ? 'Transmitiendo' : 'Inactivo'} color={isActive ? COLORS.warning : COLORS.textMuted} />
          <StatBox icon="🌙" label="Pantalla" value="Puede estar apagada" />
        </View>

        {/* Tono K9 */}
        <TouchableOpacity
          style={[styles.k9Card, ultrasonicOn && styles.k9CardOn]}
          onPress={() => toggleUltrasonic(!ultrasonicOn)}
          activeOpacity={0.85}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.k9Title}>🐕 Señal para perros K9</Text>
            <Text style={styles.k9Desc}>
              {ultrasonicOn ? 'Emitiendo 18 kHz · 5s ON / 5s OFF' : 'Tono ultrasónico para brigadas caninas'}
            </Text>
          </View>
          <View style={[styles.k9Badge, ultrasonicOn && styles.k9BadgeOn]}>
            <Text style={styles.k9BadgeText}>{ultrasonicOn ? 'ON' : 'OFF'}</Text>
          </View>
        </TouchableOpacity>

        {/* Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nombre BLE</Text>
            <Text style={styles.infoValue}>SOS-{deviceId}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>UUID servicio</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{RESCUE_SERVICE_UUID.slice(0, 18)}…</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Plataforma</Text>
            <Text style={styles.infoValue}>{Platform.OS === 'ios' ? 'iOS (iBeacon)' : 'Android BLE'}</Text>
          </View>
        </View>

        {/* Botón */}
        <TouchableOpacity
          style={[styles.btn, isActive ? styles.btnStop : styles.btnStart]}
          onPress={isActive ? stopAdvertising : startAdvertising}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>
            {isActive ? '⏹  DETENER SEÑAL SOS' : '🆘  ACTIVAR SEÑAL SOS'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.hint}>
          {isActive
            ? '⚡ Para ahorrar batería, mantén el dispositivo quieto'
            : 'Al activar, el dispositivo emitirá una señal Bluetooth continua'}
        </Text>
      </ScrollView>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => { stopAdvertising(); nav.navigate('Home'); }}>
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={styles.navLabel}>Inicio</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const pulseStyles = StyleSheet.create({
  wrap: { width: 130, height: 130, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute', width: 100, height: 100, borderRadius: 50,
    borderWidth: 2, borderColor: COLORS.warning,
  },
  core: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: COLORS.warningBg,
    borderWidth: 2, borderColor: COLORS.warning + '60',
    alignItems: 'center', justifyContent: 'center',
  },
  coreActive: { borderColor: COLORS.warning },
  icon: { fontSize: 38 },
});

const statStyles = StyleSheet.create({
  box: {
    flex: 1, backgroundColor: COLORS.surface,
    borderRadius: 12, padding: 12, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  icon: { fontSize: 18, marginBottom: 4 },
  value: { fontSize: 12, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  label: { fontSize: 10, color: COLORS.textMuted, marginTop: 2, textAlign: 'center' },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#110D00' },
  container: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 80, gap: 14 },

  centralWrap: { alignItems: 'center', paddingVertical: 12, gap: 14 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.surface, paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.border,
  },
  statusBadgeActive: { borderColor: COLORS.success + '60', backgroundColor: COLORS.successBg },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.textMuted },
  statusDotActive: { backgroundColor: COLORS.success },
  statusText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  statusTextActive: { color: COLORS.success },

  timerWrap: { alignItems: 'center' },
  timer: { fontSize: 44, fontWeight: '800', color: COLORS.text, letterSpacing: 2 },
  timerLabel: { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },

  statsRow: { flexDirection: 'row', gap: 8 },

  infoCard: {
    backgroundColor: COLORS.surface, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 10,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: 13, color: COLORS.textMuted },
  infoValue: { fontSize: 13, color: COLORS.text, fontWeight: '500', maxWidth: '60%', textAlign: 'right', fontVariant: ['tabular-nums'] },

  btn: { paddingVertical: 18, borderRadius: 14, alignItems: 'center', borderWidth: 1 },
  btnStart: { backgroundColor: COLORS.warningBg, borderColor: COLORS.warning + '70' },
  btnStop: { backgroundColor: '#2A1800', borderColor: COLORS.warning },
  btnText: { fontSize: 16, fontWeight: '800', color: COLORS.text, letterSpacing: 0.5 },

  hint: { fontSize: 12, color: COLORS.textDim, textAlign: 'center', lineHeight: 18 },

  k9Card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 12,
  },
  k9CardOn: { borderColor: '#3B82F680', backgroundColor: '#0F1A2D' },
  k9Title: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 3 },
  k9Desc: { fontSize: 11, color: COLORS.textMuted, lineHeight: 16 },
  k9Badge: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: COLORS.border,
  },
  k9BadgeOn: { backgroundColor: COLORS.blue },
  k9BadgeText: { fontSize: 12, fontWeight: '800', color: COLORS.text },
  bottomNav: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingBottom: 12, paddingTop: 8,
  },
  navItem: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  navIcon: { fontSize: 20, marginBottom: 2, color: COLORS.textMuted },
  navLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },
});
