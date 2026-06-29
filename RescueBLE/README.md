# Rescue BLE — App de detección por Bluetooth para rescate sísmico

App React Native que permite a rescatistas localizar personas atrapadas bajo escombros
usando señales Bluetooth Low Energy (BLE). Sin internet. Sin torres celulares.

## Cómo funciona

- **Modo Víctima**: el teléfono emite una señal BLE continua identificada como `SOS-{ID}`.
- **Modo Rescatista**: el teléfono escanea BLE en tiempo real y emite un beep cuya
  frecuencia y velocidad aumentan al acercarse a la víctima (como un detector de metales).
- El RSSI se filtra con un **filtro de Kalman** para suavizar lecturas inestables.
- El audio usa la **Web Audio API** para generar tonos sin archivos externos.

## Setup

### 1. Requisitos
- Node 18+
- React Native 0.73+
- Xcode 15+ (iOS)
- Android Studio (API 31+ recomendado)

### 2. Instalar dependencias

```bash
npm install

# iOS
cd ios && pod install && cd ..
```

### 3. Dependencias clave a instalar

```bash
# BLE scanning (ya incluido en package.json)
npm install react-native-ble-plx

# BLE advertising (modo víctima) — instalar por separado
npm install react-native-ble-advertiser

# Navegación
npm install @react-navigation/native @react-navigation/native-stack
npm install react-native-screens react-native-safe-area-context

# Mantener pantalla encendida en modo víctima
npm install react-native-keep-awake
```

### 4. Permisos

**Android**: Agregar contenido de `android/app/src/main/AndroidManifest_additions.xml`
al `AndroidManifest.xml` existente.

**iOS**: Agregar contenido de `ios_info_plist_additions.xml` al `Info.plist`.

### 5. Activar modo víctima (advertising)

En `src/screens/VictimScreen.tsx`, hay un placeholder con comentarios detallados.
Reemplazar con:

```typescript
import BLEAdvertiser from 'react-native-ble-advertiser';

// Al arrancar:
BLEAdvertiser.setCompanyId(0x004C);
await BLEAdvertiser.broadcast(
  RESCUE_SERVICE_UUID,
  [{ key: 'localName', value: deviceName }],
  {
    advertiseMode: BLEAdvertiser.ADVERTISE_MODE_LOW_LATENCY,
    txPowerLevel: BLEAdvertiser.ADVERTISE_TX_POWER_HIGH,
    connectable: false,
  }
);

// Al detener:
await BLEAdvertiser.stopBroadcast();
```

### 6. Correr

```bash
# Android
npx react-native run-android

# iOS
npx react-native run-ios
```

## Arquitectura

```
src/
  hooks/
    useBLE.ts              ← BLE scan + filtro Kalman + estimación de distancia
    useProximityAudio.ts   ← Beep que varía frecuencia/velocidad por distancia
  screens/
    HomeScreen.tsx         ← Selector de modo
    RescuerScreen.tsx      ← Escáner con lista de víctimas + audio
    VictimScreen.tsx       ← Advertising BLE modo SOS
  utils/
    constants.ts           ← UUID, colores, umbrales de distancia
```

## Limitaciones conocidas

| Limitación | Mitigación |
|---|---|
| BLE inestable bajo concreto grueso | Kalman filter + promedio de N lecturas |
| Rango ~5-15m bajo escombros (vs 30m en espacio libre) | Advertir al usuario del rango realista |
| iOS advertising en background limitado | Usar KeepAwake en foreground como alternativa |
| RSSI varía con orientación del dispositivo | Promediar y suavizar, no asumir distancia exacta |
| Android < 12 requiere permiso de ubicación para BLE | Documentado en permisos |

## Ideas para siguiente versión

- [ ] Trilateration: 3 rescatistas reportan RSSI → servidor calcula posición 2D
- [ ] Historial de última posición conocida en caso de pérdida de señal
- [ ] Audio configurable (volumen, tipo de tono, vibración alternativa)
- [ ] QR de onboarding para configurar grupos de rescate
- [ ] Modo mesh: rescatistas retransmiten señales de víctimas lejanas
