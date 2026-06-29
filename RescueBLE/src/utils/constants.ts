// src/utils/constants.ts

// UUID del servicio BLE usado para identificar dispositivos de rescate.
// Todos los dispositivos con la app deben usar el mismo UUID.
export const RESCUE_SERVICE_UUID = '0000FFAA-0000-1000-8000-00805F9B34FB';

// Parámetros del filtro de Kalman para suavizar RSSI
// R = varianza del ruido de medición (mayor = más suavizado, más lento)
// Q = varianza del ruido del proceso (mayor = respuesta más rápida a cambios reales)
export const KALMAN_R = 2;
export const KALMAN_Q = 0.5;

// Nombre que usará el dispositivo víctima al anunciar por BLE
// Se puede personalizar con el ID del usuario o número de grupo
export const VICTIM_DEVICE_NAME = 'SOS-RESCUE';

// Distancias de alerta (metros)
export const DISTANCE_CRITICAL = 3;   // rojo — muy cerca
export const DISTANCE_NEAR = 10;      // amarillo — cerca
export const DISTANCE_FAR = 25;       // gris — lejos

// Colores de la app
export const COLORS = {
  background: '#0A0A0A',
  surface: '#151515',
  surfaceElevated: '#1E1E1E',
  border: '#2A2A2A',
  text: '#F0F0F0',
  textMuted: '#6B6B6B',
  accent: '#E8534A',      // rojo rescate
  accentSoft: '#2D1110',
  warning: '#E8A84A',
  warningBg: '#2D210A',
  success: '#4AE87E',
  successBg: '#0A2D18',
  blue: '#4A8EE8',
  blueBg: '#0A1A2D',
};
