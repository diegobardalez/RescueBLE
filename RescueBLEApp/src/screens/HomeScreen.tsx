import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Animated, ScrollView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { requestMultiple, checkMultiple, openSettings, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { COLORS } from '../utils/constants';

type Nav = NativeStackNavigationProp<{ Home: undefined; Rescuer: undefined; Victim: undefined }>;

function RadarAnimation() {
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 1800, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      ).start();
    pulse(ring1, 0);
    pulse(ring2, 600);
    pulse(ring3, 1200);
  }, [ring1, ring2, ring3]);

  const ringStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.7, 0.2, 0] }),
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] }) }],
  });

  return (
    <View style={styles.radarWrap}>
      <Animated.View style={[styles.radarRing, ringStyle(ring1)]} />
      <Animated.View style={[styles.radarRing, ringStyle(ring2)]} />
      <Animated.View style={[styles.radarRing, ringStyle(ring3)]} />
      <View style={styles.radarCore}>
        <View style={styles.radarDot} />
      </View>
    </View>
  );
}

function FeatureChip({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipIcon}>{icon}</Text>
      <Text style={styles.chipLabel}>{label}</Text>
    </View>
  );
}

async function requestBLEPermissions() {
  if (Platform.OS !== 'android') return;
  const apiLevel = parseInt(Platform.Version as string, 10);
  const perms = [
    PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
    ...(apiLevel >= 31 ? [
      PERMISSIONS.ANDROID.BLUETOOTH_SCAN,
      PERMISSIONS.ANDROID.BLUETOOTH_CONNECT,
      PERMISSIONS.ANDROID.BLUETOOTH_ADVERTISE,
    ] : []),
    ...(apiLevel >= 33 ? [PERMISSIONS.ANDROID.POST_NOTIFICATIONS] : []),
  ];

  const results = await requestMultiple(perms);

  // Si notificaciones fueron denegadas permanentemente, abrir configuración
  if (
    apiLevel >= 33 &&
    results[PERMISSIONS.ANDROID.POST_NOTIFICATIONS] === RESULTS.BLOCKED
  ) {
    Alert.alert(
      'Notificaciones bloqueadas',
      'Para recibir alertas sísmicas con la app cerrada, activa las notificaciones en Ajustes.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Abrir Ajustes', onPress: () => openSettings() },
      ]
    );
  }
}

export default function HomeScreen() {
  const nav = useNavigation<Nav>();
  const [permsGranted, setPermsGranted] = useState(false);

  useEffect(() => {
    requestBLEPermissions().then(() => setPermsGranted(true));
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <RadarAnimation />
          <Text style={styles.title}>Rescue <Text style={styles.titleBLE}>BLE</Text></Text>
          <Text style={styles.subtitle}>Detección de personas atrapadas{'\n'}mediante Bluetooth</Text>
        </View>

        {/* Banner sismo */}
        <View style={styles.seismicBanner}>
          <Text style={styles.seismicIcon}>🌍</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.seismicTitle}>Detección sísmica activa</Text>
            <Text style={styles.seismicDesc}>Si se detecta un sismo, el SOS se activa automáticamente</Text>
          </View>
          <View style={[styles.seismicDot, permsGranted && styles.seismicDotOn]} />
        </View>

        {/* Tarjeta Rescatista */}
        <View style={[styles.card, styles.cardRed]}>
          <View style={[styles.badge, styles.badgeRed]}>
            <Text style={[styles.badgeText, { color: COLORS.accent }]}>MODO RESCATISTA</Text>
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardIcon}>📡</Text>
            <View style={styles.cardTextWrap}>
              <Text style={styles.cardTitle}>Buscar víctimas</Text>
              <Text style={styles.cardDesc}>
                Escanea dispositivos cercanos y guía hacia la víctima con señal de audio e indicadores.
              </Text>
            </View>
          </View>
          <View style={styles.chips}>
            <FeatureChip icon="🔊" label={'Guiado por\naudio'} />
            <FeatureChip icon="📍" label={'Distancia en\ntiempo real'} />
            <FeatureChip icon="⚡" label={'Rápido y\neficiente'} />
          </View>
          <TouchableOpacity style={[styles.btn, styles.btnRed]} onPress={() => nav.navigate('Rescuer')} activeOpacity={0.85}>
            <Text style={styles.btnText}>ESCANEAR AHORA  →</Text>
          </TouchableOpacity>
        </View>

        {/* Tarjeta Víctima */}
        <View style={[styles.card, styles.cardAmber]}>
          <View style={[styles.badge, styles.badgeAmber]}>
            <Text style={[styles.badgeText, { color: COLORS.warning }]}>MODO VÍCTIMA / SOS</Text>
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardIcon}>📶</Text>
            <View style={styles.cardTextWrap}>
              <Text style={styles.cardTitle}>Emitir señal SOS</Text>
              <Text style={styles.cardDesc}>
                Tu dispositivo emitirá una señal Bluetooth continua para que los rescatistas puedan encontrarte.
              </Text>
            </View>
          </View>
          <View style={styles.chips}>
            <FeatureChip icon="🔋" label={'Bajo consumo\nde batería'} />
            <FeatureChip icon="🔒" label={'Funciona con\npantalla apagada'} />
            <FeatureChip icon="🛡️" label={'Sin internet\nni señal'} />
          </View>
          <TouchableOpacity style={[styles.btn, styles.btnAmber]} onPress={() => nav.navigate('Victim')} activeOpacity={0.85}>
            <Text style={styles.btnText}>EMITIR SEÑAL SOS  →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>🛡  Sin internet · Sin torres celulares{'\n'}Solo Bluetooth Low Energy (BLE)</Text>
        </View>

      </ScrollView>

      <View style={styles.bottomNav}>
        <View style={styles.navItem}>
          <Text style={[styles.navIcon, { color: COLORS.accent }]}>🏠</Text>
          <Text style={[styles.navLabel, { color: COLORS.accent }]}>Inicio</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8 },

  header: { alignItems: 'center', marginBottom: 20 },
  radarWrap: { width: 100, height: 100, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  radarRing: {
    position: 'absolute', width: 90, height: 90, borderRadius: 45,
    borderWidth: 2, borderColor: COLORS.accent,
  },
  radarCore: {
    width: 62, height: 62, borderRadius: 31,
    backgroundColor: COLORS.accentSoft,
    borderWidth: 2, borderColor: COLORS.accent + '90',
    alignItems: 'center', justifyContent: 'center',
  },
  radarDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: COLORS.accent },

  title: { fontSize: 34, fontWeight: '800', color: COLORS.text },
  titleBLE: { color: COLORS.accent },
  subtitle: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22, marginTop: 8 },

  seismicBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#0F1A10', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#22C55E30', marginBottom: 16,
  },
  seismicIcon: { fontSize: 26 },
  seismicTitle: { fontSize: 13, fontWeight: '700', color: COLORS.success, marginBottom: 2 },
  seismicDesc: { fontSize: 11, color: COLORS.textMuted, lineHeight: 16 },
  seismicDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.textDim },
  seismicDotOn: { backgroundColor: COLORS.success },

  card: { borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1 },
  cardRed: { backgroundColor: '#1C1010', borderColor: COLORS.accent + '40' },
  cardAmber: { backgroundColor: '#1C1600', borderColor: COLORS.warning + '40' },

  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, marginBottom: 14 },
  badgeRed: { backgroundColor: COLORS.accent + '25' },
  badgeAmber: { backgroundColor: COLORS.warning + '20' },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },

  cardBody: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 16 },
  cardIcon: { fontSize: 38 },
  cardTextWrap: { flex: 1 },
  cardTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  cardDesc: { fontSize: 14, color: COLORS.textMuted, lineHeight: 21 },

  chips: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  chip: {
    flex: 1, backgroundColor: COLORS.background, borderRadius: 10,
    padding: 10, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  chipIcon: { fontSize: 18, marginBottom: 4 },
  chipLabel: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', lineHeight: 15 },

  btn: { paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  btnRed: { backgroundColor: COLORS.accent },
  btnAmber: { backgroundColor: COLORS.warning },
  btnText: { fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: 1 },

  footer: { alignItems: 'center', paddingVertical: 20 },
  footerText: { fontSize: 12, color: COLORS.textDim, textAlign: 'center', lineHeight: 20 },

  bottomNav: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingBottom: 12, paddingTop: 8,
  },
  navItem: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  navIcon: { fontSize: 20, marginBottom: 2, color: COLORS.textMuted },
  navLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },
});
