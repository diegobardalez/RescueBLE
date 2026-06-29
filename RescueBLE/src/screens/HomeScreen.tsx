// src/screens/HomeScreen.tsx
// Pantalla de inicio: selección de modo Rescatista o Víctima

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS } from '../utils/constants';

type RootStackParamList = {
  Home: undefined;
  Rescuer: undefined;
  Victim: undefined;
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export default function HomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <View style={styles.container}>

        <View style={styles.header}>
          <Text style={styles.logo}>🔴</Text>
          <Text style={styles.title}>Rescue BLE</Text>
          <Text style={styles.subtitle}>
            Detección de personas atrapadas{'\n'}mediante Bluetooth
          </Text>
        </View>

        <View style={styles.modes}>
          <TouchableOpacity
            style={[styles.card, styles.cardRescuer]}
            onPress={() => navigation.navigate('Rescuer')}
            activeOpacity={0.8}
          >
            <Text style={styles.cardIcon}>📡</Text>
            <Text style={styles.cardTitle}>Modo Rescatista</Text>
            <Text style={styles.cardDesc}>
              Escanea dispositivos cercanos y guía hacia la víctima mediante
              señal de audio — más cerca, más rápido el beep.
            </Text>
            <View style={styles.cardBadge}>
              <Text style={styles.cardBadgeText}>ESCANEAR →</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.card, styles.cardVictim]}
            onPress={() => navigation.navigate('Victim')}
            activeOpacity={0.8}
          >
            <Text style={styles.cardIcon}>📶</Text>
            <Text style={styles.cardTitle}>Modo Víctima / SOS</Text>
            <Text style={styles.cardDesc}>
              Emite una señal Bluetooth continua para ser localizado por los
              rescatistas. Funciona con la pantalla apagada.
            </Text>
            <View style={[styles.cardBadge, styles.cardBadgeVictim]}>
              <Text style={[styles.cardBadgeText, { color: COLORS.warning }]}>
                EMITIR SEÑAL →
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          No requiere internet · Funciona sin torres celulares
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    paddingVertical: 24,
  },
  header: {
    alignItems: 'center',
    paddingTop: 16,
  },
  logo: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  modes: {
    gap: 16,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  cardRescuer: {
    backgroundColor: COLORS.accentSoft,
    borderColor: COLORS.accent + '50',
  },
  cardVictim: {
    backgroundColor: COLORS.warningBg,
    borderColor: COLORS.warning + '50',
  },
  cardIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 20,
    marginBottom: 16,
  },
  cardBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.accent + '20',
    borderWidth: 1,
    borderColor: COLORS.accent + '40',
  },
  cardBadgeVictim: {
    backgroundColor: COLORS.warning + '15',
    borderColor: COLORS.warning + '40',
  },
  cardBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accent,
    letterSpacing: 1,
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
