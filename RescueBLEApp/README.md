# RescueBLE

**Author / Autor:** Diego Bardalez Plaza

---

## English

### What is RescueBLE?

RescueBLE is a mobile application built with React Native that uses Bluetooth Low Energy (BLE) to help locate people trapped under rubble, debris, or in disaster scenarios where GPS and cellular signals may be unavailable.

The app operates in two modes:

#### 🆘 Victim Mode
When a person is trapped, they open the app and enter Victim Mode. The device **immediately** begins broadcasting a continuous BLE signal (advertising) containing a unique identifier. No button press is required — the signal activates automatically the moment the screen opens, so it works even if the person is injured or disoriented.

#### 🔍 Rescuer Mode
Search and rescue personnel use Rescuer Mode to scan for nearby BLE signals emitted by victims. The app displays a list of detected devices with signal strength (RSSI), allowing rescuers to estimate proximity and zero in on the victim's location. As the rescuer gets closer, the signal strength increases and an audio alert helps guide them.

### Key Features

- Automatic BLE advertising on Victim Mode entry
- Real-time BLE scanning with RSSI-based proximity estimation
- Audio proximity alerts for rescuers
- Works without internet, GPS, or cellular signal
- Screen-off / background compatible (via Android Foreground Service)
- Dark UI optimized for low-light / emergency conditions

### Tech Stack

- React Native 0.73
- react-native-ble-plx (BLE scanning)
- react-native-ble-advertiser (BLE advertising — plug-in ready)
- React Navigation
- TypeScript

### Requirements

- Android 8.0+ (API 26+) or iOS 13+
- Bluetooth 4.0+ (BLE capable device)
- Location permission (required for BLE scanning on Android < 12)

### Setup

```bash
# Install dependencies
npm install

# Android
npx react-native run-android

# iOS
cd ios && pod install && cd ..
npx react-native run-ios
```

> **Note:** BLE advertising on Android requires `react-native-ble-advertiser`. Follow the library's setup guide and replace the placeholder in `src/screens/VictimScreen.tsx`.

---

## Español

### ¿Qué es RescueBLE?

RescueBLE es una aplicación móvil desarrollada con React Native que utiliza Bluetooth Low Energy (BLE) para ayudar a localizar personas atrapadas bajo escombros o en situaciones de desastre donde el GPS y la señal celular pueden no estar disponibles.

La app funciona en dos modos:

#### 🆘 Modo Víctima
Cuando una persona queda atrapada, abre la app y entra al Modo Víctima. El dispositivo **inmediatamente** comienza a emitir una señal BLE continua (advertising) con un identificador único. No se necesita presionar ningún botón — la señal se activa sola al abrir la pantalla, de modo que funciona incluso si la persona está herida o desorientada.

#### 🔍 Modo Rescatista
El personal de búsqueda y rescate usa el Modo Rescatista para escanear señales BLE emitidas por víctimas cercanas. La app muestra una lista de dispositivos detectados con la intensidad de señal (RSSI), lo que permite estimar la proximidad y ubicar a la víctima. A medida que el rescatista se acerca, la señal aumenta y una alerta de audio ayuda a guiarlo.

### Características principales

- Advertising BLE automático al entrar al Modo Víctima
- Escaneo BLE en tiempo real con estimación de proximidad por RSSI
- Alertas de audio de proximidad para rescatistas
- Funciona sin internet, GPS ni señal celular
- Compatible con pantalla apagada / segundo plano (via Android Foreground Service)
- UI oscura optimizada para condiciones de poca luz / emergencia

### Stack tecnológico

- React Native 0.73
- react-native-ble-plx (escaneo BLE)
- react-native-ble-advertiser (advertising BLE — listo para conectar)
- React Navigation
- TypeScript

### Requisitos

- Android 8.0+ (API 26+) o iOS 13+
- Bluetooth 4.0+ (dispositivo compatible con BLE)
- Permiso de ubicación (requerido para escaneo BLE en Android < 12)

### Instalación

```bash
# Instalar dependencias
npm install

# Android
npx react-native run-android

# iOS
cd ios && pod install && cd ..
npx react-native run-ios
```

> **Nota:** El advertising BLE en Android requiere `react-native-ble-advertiser`. Sigue la guía de instalación de la librería y reemplaza el placeholder en `src/screens/VictimScreen.tsx`.

---

## License / Licencia

MIT © Diego Bardalez Plaza
