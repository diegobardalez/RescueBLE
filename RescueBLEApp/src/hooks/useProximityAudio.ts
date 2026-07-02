import { useEffect, useRef, useCallback, useState } from 'react';
import { NativeModules } from 'react-native';

const { BLEAdvertiserModule } = NativeModules;

const MIN_DIST = 0.5;
const MAX_DIST = 30;
const MIN_INTERVAL = 300;   // ms entre beeps cuando está muy cerca
const MAX_INTERVAL = 3000;  // ms entre beeps cuando está lejos

function distanceToInterval(distance: number): number {
  const clamped = Math.max(MIN_DIST, Math.min(MAX_DIST, distance));
  const ratio = (clamped - MIN_DIST) / (MAX_DIST - MIN_DIST);
  return MIN_INTERVAL + ratio * (MAX_INTERVAL - MIN_INTERVAL);
}

export function useProximityAudio() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);
  const distanceRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const scheduleNext = useCallback(() => {
    if (!activeRef.current || distanceRef.current === null) return;
    const interval = distanceToInterval(distanceRef.current);
    BLEAdvertiserModule?.playBeep?.().catch(() => {});
    timeoutRef.current = setTimeout(() => scheduleNext(), interval);
  }, []);

  const start = useCallback(() => {
    if (activeRef.current) return;
    activeRef.current = true;
    setIsPlaying(true);
    scheduleNext();
  }, [scheduleNext]);

  const stop = useCallback(() => {
    activeRef.current = false;
    setIsPlaying(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    BLEAdvertiserModule?.stopBeep?.().catch(() => {});
  }, []);

  const updateDistance = useCallback((distance: number | null) => {
    distanceRef.current = distance;
    if (distance !== null && distance <= MAX_DIST && !activeRef.current) {
      start();
    }
    if (distance === null && activeRef.current) {
      stop();
    }
  }, [start, stop]);

  useEffect(() => {
    return () => { stop(); };
  }, [stop]);

  return { start, stop, updateDistance, isPlaying };
}
