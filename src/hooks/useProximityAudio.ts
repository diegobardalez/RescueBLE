// src/hooks/useProximityAudio.ts
// Genera un tono de beep que varía en frecuencia e intervalo según la distancia.
// A menor distancia → mayor frecuencia + beeps más rápidos (como detector de metales).

import { useEffect, useRef, useCallback, useState } from 'react';

const MIN_DIST = 0.5;   // metros — distancia mínima considerada
const MAX_DIST = 30;    // metros — distancia máxima con audio
const MIN_FREQ = 300;   // Hz — tono más grave (lejos)
const MAX_FREQ = 1400;  // Hz — tono más agudo (cerca)
const MIN_INTERVAL = 120;  // ms entre beeps (muy cerca)
const MAX_INTERVAL = 2000; // ms entre beeps (lejos)

function distanceToFreq(distance: number): number {
  const clamped = Math.max(MIN_DIST, Math.min(MAX_DIST, distance));
  const ratio = 1 - (clamped - MIN_DIST) / (MAX_DIST - MIN_DIST);
  return MIN_FREQ + ratio * (MAX_FREQ - MIN_FREQ);
}

function distanceToInterval(distance: number): number {
  const clamped = Math.max(MIN_DIST, Math.min(MAX_DIST, distance));
  const ratio = (clamped - MIN_DIST) / (MAX_DIST - MIN_DIST);
  return MIN_INTERVAL + ratio * (MAX_INTERVAL - MIN_INTERVAL);
}

export function useProximityAudio() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);
  const distanceRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const getCtx = useCallback((): AudioContext => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }, []);

  const playBeep = useCallback((freq: number, duration = 0.08) => {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }, [getCtx]);

  const scheduleNext = useCallback(() => {
    if (!activeRef.current || distanceRef.current === null) return;

    const dist = distanceRef.current;
    const freq = distanceToFreq(dist);
    const interval = distanceToInterval(dist);

    playBeep(freq);

    timeoutRef.current = setTimeout(scheduleNext, interval);
  }, [playBeep]);

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
  }, []);

  // Actualizar distancia en tiempo real — el próximo beep usará la nueva distancia
  const updateDistance = useCallback((distance: number | null) => {
    distanceRef.current = distance;
    // Si hay una víctima cerca y no estamos sonando, arrancar
    if (distance !== null && distance <= MAX_DIST && !activeRef.current) {
      start();
    }
    // Si perdimos señal, detener
    if (distance === null && activeRef.current) {
      stop();
    }
  }, [start, stop]);

  useEffect(() => {
    return () => {
      stop();
      audioCtxRef.current?.close();
    };
  }, [stop]);

  return { start, stop, updateDistance, isPlaying };
}
