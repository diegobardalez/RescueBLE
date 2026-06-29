# RescueBLE

**Author / Autor:** Diego Bardalez Plaza

App Android de rescate en desastres que usa Bluetooth Low Energy para localizar personas atrapadas bajo escombros — sin internet, sin GPS, sin torres celulares.

---

## Demo

https://github.com/diegobardalez/RescueBLE/raw/master/assets/demo.mp4

---

## Descargar / Download

📥 **[RescueBLE-v1.0.0.apk](https://github.com/diegobardalez/RescueBLE/releases/download/v1.0.0/RescueBLE-v1.0.0.apk)**

> Requiere Android 5.0+ con Bluetooth activado.  
> Ir a **Ajustes → Seguridad → Instalar apps de fuentes desconocidas** antes de abrir el APK.

---

## ¿Qué es RescueBLE? / What is RescueBLE?

Nacida la noche de los terremotos de Venezuela del 24 de junio de 2026 (magnitud 7.2 y 7.5), RescueBLE convierte cualquier teléfono Android en un dispositivo de rescate.

*Born the night of the Venezuela earthquakes of June 24, 2026 (magnitude 7.2 and 7.5), RescueBLE turns any Android phone into a rescue device.*

---

## Cómo funciona / How it works

### 🆘 Modo Víctima / Victim Mode
El teléfono emite una señal BLE continua al instante de abrir la pantalla. No requiere botón — funciona aunque la persona esté herida o desorientada. La señal atraviesa escombros hasta ~15-20 metros.

*The phone broadcasts a continuous BLE signal the moment the screen opens. No button press needed — works even if the person is injured. Signal penetrates rubble up to ~15-20 meters.*

### 🔍 Modo Rescatista / Rescuer Mode
Escanea señales BLE cercanas y reproduce un beep cuya velocidad aumenta cuanto más cerca estás de la víctima — como un detector de metales, pero para personas.

*Scans nearby BLE signals and plays a beep that speeds up the closer you get to the victim — like a metal detector, but for people.*

---

## Características / Features

- Señal BLE automática al entrar a Modo Víctima
- Escaneo en tiempo real con estimación de distancia por RSSI
- Filtro de Kalman para suavizar lecturas de señal inestables
- Beep de proximidad con velocidad variable
- Sin internet · Sin GPS · Sin infraestructura
- Compatible con pantalla apagada

---

## Stack técnico / Tech Stack

- React Native 0.73 · TypeScript
- react-native-ble-plx (escaneo BLE)
- Módulo nativo Kotlin — BLE Advertising + MediaPlayer
- Filtro de Kalman para RSSI
- Android 5.0+ (API 21+)

---

## Arquitectura / Architecture

```
RescueBLEApp/
  src/
    hooks/
      useBLE.ts              ← BLE scan + Kalman + distance estimation
      useProximityAudio.ts   ← Proximity beep with variable speed
    screens/
      HomeScreen.tsx         ← Mode selector
      RescuerScreen.tsx      ← BLE scanner + victim list + audio
      VictimScreen.tsx       ← BLE advertising (SOS signal)
    utils/
      constants.ts           ← UUID, colors, distance thresholds
  android/
    app/src/main/
      java/com/rescuebleapp/
        BLEAdvertiserModule.kt   ← Native Kotlin: BLE + audio
        BLEAdvertiserPackage.kt
      assets/beep.mp3
```

---

## Ideas para siguiente versión / Roadmap

- [ ] Trilateración: 3 rescatistas reportan RSSI → calcular posición 2D
- [ ] Historial de última señal conocida
- [ ] Audio configurable (volumen, tipo de tono)
- [ ] Modo mesh: rescatistas retransmiten señales de víctimas lejanas
- [ ] iOS support

---

## License / Licencia

MIT © Diego Bardalez Plaza
