import { useEffect, useRef, useCallback } from 'react';
import { NativeModules, NativeEventEmitter, Vibration } from 'react-native';

const { AccelerometerModule } = NativeModules;
const emitter = AccelerometerModule ? new NativeEventEmitter(AccelerometerModule) : null;

export function useSeismicDetector(onDetected: () => void) {
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;

  const start = useCallback(async () => {
    if (!AccelerometerModule) return;
    try { await AccelerometerModule.startForegroundDetection(); } catch (_) {}
  }, []);

  // Check if app was launched from a seismic event while closed
  const checkPending = useCallback(async () => {
    if (!AccelerometerModule) return;
    try {
      const pending = await AccelerometerModule.checkPendingSeismic();
      if (pending) {
        Vibration.vibrate([0, 300, 150, 300]);
        onDetectedRef.current();
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (!emitter) return;
    // Receive seismic events from the service while app is open
    const sub = emitter.addListener('SeismicDetected', () => {
      Vibration.vibrate([0, 300, 150, 300]);
      onDetectedRef.current();
    });
    return () => sub.remove();
  }, []);

  return { start, checkPending };
}
