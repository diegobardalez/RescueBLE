// src/screens/RescuerScreen.tsx
// Pantalla del rescatista: escanea BLE, muestra víctimas ordenadas por proximidad
// y reproduce beep cuya frecuencia/velocidad varía con la distancia.

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  SafeAreaView,
  StatusBar,
  Switch,
  Vibration,
  Platform,
} from 'react-native';
import { useBLE, DetectedVictim } from '../hooks/useBLE';
import { useProximityAudio } from '../hooks/useProximityAudio';
import { COLORS, DISTANCE_CRITICAL, DISTANCE_NEAR } from '../utils/constants';

function DistanceBadge({ distance }: { distance: number }) {
  const isClose = distance <= DISTANCE_CRITICAL;
  const isMid = distance <= DISTANCE_NEAR;
  const color = isClose ? COLORS.accent : isMid ? COLORS.warning : COLORS.textMuted;
  const bg = isClose ? COLORS.accentSoft : isMid ? COLORS.warningBg : COLORS.surfaceElevated;
  const label = isClose ? '🔴 MUY CERCA' : isMid ? '🟡 CERCA' : '⚪ LEJOS';

  return (
    <View style={[styles.badge, { backgroundColor: bg, borderColor: color + '60' }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

function SignalBars({ rssi }: { rssi: number }) {
  // RSSI típico: -30 (excelente) a -100 (muy débil)
  const strength = Math.max(0, Math.min(4, Math.round((rssi + 100) / 17.5)));
  return (
    <View style={styles.bars}>
      {[1, 2, 3, 4].map(i => (
        <View
          key={i}
          style={[
            styles.bar,
            { height: 6 + i * 4 },
            i <= strength && { backgroundColor: COLORS.accent },
          ]}
        />
      ))}
    </View>
  );
}

function VictimCard({ victim, isTarget }: { victim: DetectedVictim; isTarget: boolean }) {
  return (
    <View style={[styles.card, isTarget && styles.cardTarget]}>
      {isTarget && (
        <View style={styles.targetBanner}>
          <Text style={styles.targetBannerText}>◎ OBJETIVO MÁS CERCANO</Text>
        </View>
      )}
      <View style={styles.cardRow}>
        <View style={styles.cardLeft}>
          <Text style={styles.victimName}>{victim.name ?? `Dispositivo ${victim.id.slice(-4)}`}</Text>
          <Text style={styles.victimId} numberOfLines={1}>{victim.id}</Text>
        </View>
        <SignalBars rssi={victim.rssi} />
      </View>
      <View style={styles.cardStats}>
        <View style={styles.stat}>
          <Text style={styles.statVal}>{victim.distance.toFixed(1)}m</Text>
          <Text style={styles.statLabel}>distancia est.</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statVal}>{victim.rssi} dBm</Text>
          <Text style={styles.statLabel}>RSSI (Kalman)</Text>
        </View>
        <DistanceBadge distance={victim.distance} />
      </View>
    </View>
  );
}

export default function RescuerScreen() {
  const { bleState, isScanning, victims, error, startScanning, stopScanning } = useBLE();
  const { start: startAudio, stop: stopAudio, updateDistance, isPlaying } = useProximityAudio();
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [lastVibration, setLastVibration] = useState(0);

  const closestVictim = victims.length > 0 ? victims[0] : null;

  // Actualizar audio con la víctima más cercana
  useEffect(() => {
    if (!audioEnabled || !isScanning) {
      updateDistance(null);
      return;
    }
    updateDistance(closestVictim?.distance ?? null);
  }, [closestVictim?.distance, audioEnabled, isScanning, updateDistance]);

  // Vibración cuando hay víctima muy cerca
  useEffect(() => {
    if (!closestVictim || closestVictim.distance > DISTANCE_CRITICAL) return;
    const now = Date.now();
    if (now - lastVibration > 2000) {
      Vibration.vibrate(Platform.OS === 'android' ? [0, 200, 100, 200] : 200);
      setLastVibration(now);
    }
  }, [closestVictim, lastVibration]);

  const handleToggle = useCallback(() => {
    if (isScanning) {
      stopScanning();
      stopAudio();
    } else {
      startScanning();
      // El audio arranca automáticamente cuando updateDistance detecta una víctima
    }
  }, [isScanning, startScanning, stopScanning, stopAudio]);

  const toggleAudio = useCallback((val: boolean) => {
    setAudioEnabled(val);
    if (!val) stopAudio();
    else if (isScanning && closestVictim) startAudio();
  }, [isScanning, closestVictim, startAudio, stopAudio]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Rescatista</Text>
          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: isScanning ? COLORS.success : COLORS.textMuted }]} />
            <Text style={styles.statusText}>
              {isScanning ? 'Escaneando...' : 'Detenido'}
            </Text>
          </View>
        </View>
        <View style={styles.audioToggle}>
          <Text style={styles.audioLabel}>🔊</Text>
          <Switch
            value={audioEnabled}
            onValueChange={toggleAudio}
            trackColor={{ false: COLORS.border, true: COLORS.accent + '80' }}
            thumbColor={audioEnabled ? COLORS.accent : COLORS.textMuted}
          />
        </View>
      </View>

      {/* Botón principal */}
      <TouchableOpacity
        style={[styles.mainBtn, isScanning && styles.mainBtnActive]}
        onPress={handleToggle}
        activeOpacity={0.8}
      >
        <Text style={styles.mainBtnText}>
          {isScanning ? '⏹ Detener escaneo' : '▶ Iniciar escaneo BLE'}
        </Text>
      </TouchableOpacity>

      {/* Error */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠ {error}</Text>
        </View>
      )}

      {/* Stats rápidos */}
      {isScanning && (
        <View style={styles.statsRow}>
          <View style={styles.quickStat}>
            <Text style={styles.quickStatVal}>{victims.length}</Text>
            <Text style={styles.quickStatLabel}>detectados</Text>
          </View>
          <View style={styles.quickStat}>
            <Text style={styles.quickStatVal}>
              {closestVictim ? `${closestVictim.distance.toFixed(1)}m` : '--'}
            </Text>
            <Text style={styles.quickStatLabel}>más cercano</Text>
          </View>
          <View style={styles.quickStat}>
            <Text style={[styles.quickStatVal, { color: isPlaying ? COLORS.success : COLORS.textMuted }]}>
              {isPlaying ? 'ON' : 'OFF'}
            </Text>
            <Text style={styles.quickStatLabel}>audio</Text>
          </View>
        </View>
      )}

      {/* Lista de víctimas */}
      <FlatList
        data={victims}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <VictimCard victim={item} isTarget={index === 0 && isScanning} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>{isScanning ? '🔍' : '📡'}</Text>
            <Text style={styles.emptyText}>
              {isScanning
                ? 'Buscando dispositivos SOS cercanos...\nAsegúrate de que la víctima tenga la app activa.'
                : 'Presiona Iniciar escaneo BLE\npara comenzar la búsqueda.'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerLeft: {},
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 13, color: COLORS.textMuted },
  audioToggle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  audioLabel: { fontSize: 18 },
  mainBtn: {
    marginHorizontal: 20,
    marginBottom: 12,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  mainBtnActive: {
    backgroundColor: COLORS.accentSoft,
    borderColor: COLORS.accent + '60',
  },
  mainBtnText: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  errorBox: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: COLORS.accentSoft,
    borderWidth: 1,
    borderColor: COLORS.accent + '50',
  },
  errorText: { color: COLORS.accent, fontSize: 13 },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 12,
    gap: 10,
  },
  quickStat: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickStatVal: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  quickStatLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  list: { paddingHorizontal: 20, paddingBottom: 20, gap: 10 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTarget: {
    borderColor: COLORS.accent + '80',
    backgroundColor: COLORS.accentSoft,
  },
  targetBanner: {
    backgroundColor: COLORS.accent + '25',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  targetBannerText: { fontSize: 11, fontWeight: '700', color: COLORS.accent, letterSpacing: 0.5 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardLeft: { flex: 1 },
  victimName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  victimId: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, fontFamily: 'monospace' },
  cardStats: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stat: {},
  statVal: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.textMuted },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    marginLeft: 'auto',
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  bar: { width: 5, borderRadius: 2, backgroundColor: COLORS.border },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22 },
  surfaceElevated: { backgroundColor: COLORS.surfaceElevated },
});
