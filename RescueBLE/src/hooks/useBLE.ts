// src/hooks/useBLE.ts
// Core BLE logic: scanning (rescuer mode) + advertising (victim mode)

import { useState, useEffect, useRef, useCallback } from 'react';
import { BleManager, Device, State } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';
import { RESCUE_SERVICE_UUID, RSSI_TO_DISTANCE, KALMAN_R, KALMAN_Q } from '../utils/constants';

export interface DetectedVictim {
  id: string;
  name: string | null;
  rssi: number;
  distance: number; // metros estimados
  lastSeen: number; // timestamp
}

// Filtro de Kalman simple para suavizar RSSI inestable
function createKalmanFilter() {
  let xEst = -70;
  let pEst = 1;
  return (rssi: number) => {
    const pPred = pEst + KALMAN_Q;
    const k = pPred / (pPred + KALMAN_R);
    xEst = xEst + k * (rssi - xEst);
    pEst = (1 - k) * pPred;
    return xEst;
  };
}

// Modelo path-loss para estimar distancia desde RSSI
// txPower = RSSI calibrado a 1 metro (ajustar según dispositivo)
export function rssiToDistance(rssi: number, txPower = -59): number {
  if (rssi === 0) return -1;
  const ratio = rssi / txPower;
  if (ratio < 1.0) {
    return Math.pow(ratio, 10);
  }
  // n=2.7 para interiores/obstáculos; bajar a 2.0 en espacio libre
  const n = 2.7;
  return Math.pow(10, (txPower - rssi) / (10 * n));
}

export function useBLE() {
  const managerRef = useRef<BleManager | null>(null);
  const [bleState, setBleState] = useState<State>(State.Unknown);
  const [victims, setVictims] = useState<Map<string, DetectedVictim>>(new Map());
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const kalmanFilters = useRef<Map<string, ReturnType<typeof createKalmanFilter>>>(new Map());

  // Inicializar BleManager una sola vez
  useEffect(() => {
    managerRef.current = new BleManager();
    const sub = managerRef.current.onStateChange((state) => {
      setBleState(state);
    }, true);

    // Limpiar dispositivos no vistos en más de 10s
    const staleSweep = setInterval(() => {
      const now = Date.now();
      setVictims(prev => {
        const next = new Map(prev);
        next.forEach((v, id) => {
          if (now - v.lastSeen > 10000) next.delete(id);
        });
        return next;
      });
    }, 5000);

    return () => {
      sub.remove();
      clearInterval(staleSweep);
      managerRef.current?.destroy();
    };
  }, []);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'ios') return true; // iOS maneja permisos via Info.plist

    if (Platform.OS === 'android') {
      const apiLevel = parseInt(Platform.Version as string, 10);

      if (apiLevel >= 31) {
        // Android 12+
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        return Object.values(granted).every(v => v === PermissionsAndroid.RESULTS.GRANTED);
      } else {
        // Android < 12
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    }
    return false;
  }, []);

  const startScanning = useCallback(async () => {
    const manager = managerRef.current;
    if (!manager) return;

    const hasPerms = await requestPermissions();
    if (!hasPerms) {
      setError('Permisos de Bluetooth/Ubicación denegados');
      return;
    }

    if (bleState !== State.PoweredOn) {
      setError('Activa el Bluetooth del dispositivo');
      return;
    }

    setError(null);
    setIsScanning(true);

    // Escanear todos los dispositivos BLE cercanos
    // allowDuplicates: true para actualizar RSSI en tiempo real
    manager.startDeviceScan(
      null, // null = todos los UUIDs, o filtrar por RESCUE_SERVICE_UUID
      { allowDuplicates: true, scanMode: 2 }, // scanMode 2 = LOW_LATENCY
      (err, device) => {
        if (err) {
          setError(err.message);
          setIsScanning(false);
          return;
        }
        if (!device || device.rssi === null) return;

        // Filtrar solo dispositivos con nombre "SOS-" o UUID de rescate
        const isRescueDevice =
          device.name?.startsWith('SOS-') ||
          device.serviceUUIDs?.includes(RESCUE_SERVICE_UUID);

        if (!isRescueDevice) return;

        // Aplicar filtro de Kalman al RSSI
        if (!kalmanFilters.current.has(device.id)) {
          kalmanFilters.current.set(device.id, createKalmanFilter());
        }
        const smoothRSSI = kalmanFilters.current.get(device.id)!(device.rssi);
        const distance = rssiToDistance(smoothRSSI);

        setVictims(prev => {
          const next = new Map(prev);
          next.set(device.id, {
            id: device.id,
            name: device.name,
            rssi: Math.round(smoothRSSI),
            distance: Math.max(0.5, parseFloat(distance.toFixed(1))),
            lastSeen: Date.now(),
          });
          return next;
        });
      }
    );
  }, [bleState, requestPermissions]);

  const stopScanning = useCallback(() => {
    managerRef.current?.stopDeviceScan();
    setIsScanning(false);
  }, []);

  // Víctimas ordenadas por proximidad (menor distancia primero)
  const sortedVictims = Array.from(victims.values()).sort(
    (a, b) => a.distance - b.distance
  );

  return {
    bleState,
    isScanning,
    victims: sortedVictims,
    error,
    startScanning,
    stopScanning,
    requestPermissions,
  };
}
