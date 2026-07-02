import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  StatusBar, Switch, Vibration, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useBLE, DetectedVictim } from '../hooks/useBLE';
import { useProximityAudio } from '../hooks/useProximityAudio';
import { COLORS, DISTANCE_CRITICAL, DISTANCE_NEAR } from '../utils/constants';

type Nav = NativeStackNavigationProp<{ Home: undefined; Rescuer: undefined; Victim: undefined }>;

const MAX_DIST = 20;

function Gauge({ distance }: { distance: number | null }) {
  const TICKS = 32;
  const ratio = distance !== null ? Math.max(0, 1 - Math.min(distance, MAX_DIST) / MAX_DIST) : 0;
  const R = 110;
  const CX = 150;
  const CY = 130;

  const ticks = Array.from({ length: TICKS }).map((_, i) => {
    const angle = Math.PI + (i / (TICKS - 1)) * Math.PI;
    const isActive = i / TICKS <= ratio;
    const isMajor = i % 4 === 0;
    const len = isMajor ? 16 : 10;
    const x1 = CX + R * Math.cos(angle);
    const y1 = CY + R * Math.sin(angle);
    const x2 = CX + (R - len) * Math.cos(angle);
    const y2 = CY + (R - len) * Math.sin(angle);
    const color = isActive ? (ratio > 0.7 ? COLORS.accent : COLORS.warning) : '#2D2D2D';
    const dx = x2 - x1;
    const dy = y2 - y1;
    const tickLen = Math.sqrt(dx * dx + dy * dy);
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const rot = Math.atan2(dy, dx) * (180 / Math.PI);
    return { tickLen, midX, midY, rot, color, width: isMajor ? 3 : 2 };
  });

  const needleRot = -90 + ratio * 180;

  const distLabel = distance !== null ? distance.toFixed(1) : '--';
  const proximity = distance === null ? '' : distance <= DISTANCE_CRITICAL ? 'Muy cerca' : distance <= DISTANCE_NEAR ? 'Cerca' : 'Lejos';
  const proximityColor = distance === null ? COLORS.textMuted : distance <= DISTANCE_CRITICAL ? COLORS.accent : distance <= DISTANCE_NEAR ? COLORS.warning : COLORS.textMuted;

  return (
    <View style={gaugeStyles.wrap}>
      <View style={{ width: 300, height: 145 }}>
        {ticks.map((t, i) => (
          <View key={i} style={{
            position: 'absolute',
            width: t.tickLen, height: t.width, borderRadius: 2,
            backgroundColor: t.color,
            left: t.midX - t.tickLen / 2,
            top: t.midY - t.width / 2,
            transform: [{ rotate: `${t.rot}deg` }],
          }} />
        ))}
        {/* Aguja */}
        <View style={{
          position: 'absolute',
          width: 2, height: R - 28, borderRadius: 1,
          backgroundColor: '#fff',
          left: CX - 1, top: CY - (R - 28),
          transform: [
            { translateY: (R - 28) / 2 },
            { rotate: `${needleRot}deg` },
            { translateY: -(R - 28) / 2 },
          ],
        }} />
        <View style={{
          position: 'absolute', width: 14, height: 14, borderRadius: 7,
          backgroundColor: COLORS.accent, left: CX - 7, top: CY - 7,
        }} />
      </View>
      <View style={gaugeStyles.valueWrap}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
          <Text style={gaugeStyles.value}>{distLabel}</Text>
          {distance !== null && <Text style={gaugeStyles.unit}> m</Text>}
        </View>
        {proximity !== '' && <Text style={[gaugeStyles.proximity, { color: proximityColor }]}>{proximity}</Text>}
      </View>
    </View>
  );
}

function SignalBars({ rssi }: { rssi: number }) {
  const strength = Math.max(0, Math.min(8, Math.round((rssi + 100) / 9)));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <View key={i} style={{
          width: 4, height: 5 + i * 3, borderRadius: 2,
          backgroundColor: i < strength ? COLORS.accent : '#2D2D2D',
        }} />
      ))}
    </View>
  );
}

function VictimRow({ victim, isTarget, index }: { victim: DetectedVictim; isTarget: boolean; index: number }) {
  const dotColor = victim.distance <= DISTANCE_CRITICAL ? COLORS.accent : victim.distance <= DISTANCE_NEAR ? COLORS.warning : COLORS.textMuted;
  return (
    <View style={[rowStyles.row, isTarget && rowStyles.rowTarget]}>
      <View style={[rowStyles.dot, { backgroundColor: dotColor }]} />
      <View style={{ flex: 1 }}>
        <Text style={rowStyles.name}>{victim.name ?? `Víctima #${index + 1}`}</Text>
        <Text style={rowStyles.rssi}>Señal: {victim.rssi} dBm</Text>
      </View>
      <Text style={[rowStyles.dist, { color: dotColor }]}>{victim.distance.toFixed(1)} m</Text>
      <Text style={rowStyles.arrow}>›</Text>
    </View>
  );
}

export default function RescuerScreen() {
  const nav = useNavigation<Nav>();
  const { isScanning, victims, error, startScanning, stopScanning } = useBLE();
  const { start: startAudio, stop: stopAudio, updateDistance, isPlaying } = useProximityAudio();
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [lastVibration, setLastVibration] = useState(0);

  const closestVictim = victims.length > 0 ? victims[0] : null;

  useEffect(() => {
    if (!audioEnabled || !isScanning) { updateDistance(null); return; }
    updateDistance(closestVictim?.distance ?? null);
  }, [closestVictim?.distance, audioEnabled, isScanning, updateDistance]);

  useEffect(() => {
    if (!closestVictim || closestVictim.distance > DISTANCE_CRITICAL) return;
    const now = Date.now();
    if (now - lastVibration > 2000) {
      Vibration.vibrate(Platform.OS === 'android' ? [0, 200, 100, 200] : 200);
      setLastVibration(now);
    }
  }, [closestVictim, lastVibration]);

  const handleToggle = useCallback(() => {
    if (isScanning) { stopScanning(); stopAudio(); }
    else { startScanning(); }
  }, [isScanning, startScanning, stopScanning, stopAudio]);

  const toggleAudio = useCallback((val: boolean) => {
    setAudioEnabled(val);
    if (!val) stopAudio();
    // re-enable is handled by the updateDistance useEffect when audioEnabled flips to true
  }, [stopAudio]);

  const signalLabel = closestVictim
    ? closestVictim.distance <= DISTANCE_CRITICAL ? 'Señal fuerte' : closestVictim.distance <= DISTANCE_NEAR ? 'Señal media' : 'Señal débil'
    : isScanning ? 'Buscando...' : 'Sin señal';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#110808" />

      <View style={styles.gaugeSection}>
        <Gauge distance={closestVictim?.distance ?? null} />
      </View>

      <View style={styles.signalCard}>
        <Text style={styles.signalIcon}>{isPlaying ? '🔊' : '🔇'}</Text>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.signalLabel}>{signalLabel}</Text>
          <Text style={styles.signalSub}>{isScanning && closestVictim ? 'Sigue esta dirección' : 'Esperando víctima...'}</Text>
        </View>
        {closestVictim && <SignalBars rssi={closestVictim.rssi} />}
        <Switch
          value={audioEnabled}
          onValueChange={toggleAudio}
          trackColor={{ false: '#333', true: COLORS.accent + '80' }}
          thumbColor={audioEnabled ? COLORS.accent : '#666'}
          style={{ marginLeft: 10 }}
        />
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠  {error}</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>
        {isScanning ? `Dispositivos detectados  (${victims.length})` : 'Presiona iniciar para buscar'}
      </Text>

      <FlatList
        data={victims}
        keyExtractor={v => v.id}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <VictimRow victim={item} isTarget={index === 0 && isScanning} index={index} />
        )}
        ListEmptyComponent={
          isScanning ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Buscando dispositivos SOS cercanos...</Text>
            </View>
          ) : null
        }
      />

      <View style={styles.btnWrap}>
        <TouchableOpacity
          style={[styles.btn, isScanning && styles.btnStop]}
          onPress={handleToggle}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>{isScanning ? 'DETENER ESCANEO' : 'ESCANEAR AHORA  →'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => { stopScanning(); stopAudio(); nav.navigate('Home'); }}>
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={styles.navLabel}>Inicio</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const gaugeStyles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  valueWrap: { alignItems: 'center', marginTop: -10 },
  value: { fontSize: 60, fontWeight: '800', color: COLORS.text },
  unit: { fontSize: 26, fontWeight: '600', color: COLORS.textMuted, marginBottom: 10 },
  proximity: { fontSize: 18, fontWeight: '700', marginTop: 4 },
});

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 12,
    padding: 14, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border,
  },
  rowTarget: { borderColor: COLORS.accent + '70', backgroundColor: COLORS.accentSoft },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 4 },
  name: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  rssi: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  dist: { fontSize: 16, fontWeight: '700', marginRight: 4 },
  arrow: { fontSize: 22, color: COLORS.textMuted },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#110808' },
  gaugeSection: { alignItems: 'center', paddingTop: 16, paddingBottom: 4 },
  signalCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, backgroundColor: COLORS.surface,
    borderRadius: 14, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  signalIcon: { fontSize: 22 },
  signalLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  signalSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  errorBox: {
    marginHorizontal: 16, marginBottom: 10, padding: 12,
    backgroundColor: COLORS.accentSoft, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.accent + '50',
  },
  errorText: { color: COLORS.accent, fontSize: 13 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted, marginHorizontal: 16, marginBottom: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 8 },
  empty: { alignItems: 'center', paddingVertical: 20 },
  emptyText: { color: COLORS.textMuted, fontSize: 14 },
  btnWrap: { padding: 16, paddingBottom: 8 },
  btn: { backgroundColor: COLORS.accent, paddingVertical: 18, borderRadius: 14, alignItems: 'center' },
  btnStop: { backgroundColor: '#2A1010', borderWidth: 1, borderColor: COLORS.accent },
  btnText: { fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  bottomNav: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingBottom: 12, paddingTop: 8,
  },
  navItem: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  navIcon: { fontSize: 20, marginBottom: 2, color: COLORS.textMuted },
  navLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },
});
