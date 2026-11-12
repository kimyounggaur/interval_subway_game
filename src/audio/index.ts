"use client";

import { frequency, midi, type Note } from "../game";

let context: AudioContext | null = null;
let active: AudioScheduledSourceNode[] = [];
let generation = 0;

async function unlock(): Promise<AudioContext | null> {
  if (typeof window === "undefined") return null;
  const AudioCtor =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtor) return null;
  try {
    context ??= new AudioCtor();
    if (context.state === "suspended") await context.resume();
    return context.state === "running" ? context : null;
  } catch {
    return null;
  }
}

export function stopAudio() {
  generation += 1;
  for (const source of active) {
    try {
      source.stop();
    } catch {
      /* A completed source is already stopped. */
    }
  }
  active = [];
}

function tone(
  ctx: AudioContext,
  note: Note,
  at: number,
  seconds: number,
  volume = 0.15,
) {
  const oscillator = ctx.createOscillator();
  const envelope = ctx.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(frequency(midi(note)), at);
  envelope.gain.setValueAtTime(0.0001, at);
  envelope.gain.exponentialRampToValueAtTime(volume, at + 0.012);
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + seconds - 0.01);
  oscillator.connect(envelope);
  envelope.connect(ctx.destination);
  active.push(oscillator);
  oscillator.onended = () => {
    active = active.filter((source) => source !== oscillator);
    oscillator.disconnect();
    envelope.disconnect();
  };
  oscillator.start(at);
  oscillator.stop(at + seconds);
}

/** Resolves once the audible pair ends; callers start ear-mode timers afterwards. */
export async function playPair(
  root: Note,
  upper: Note,
  mode: "melodic" | "harmonic",
  enabled = true,
): Promise<void> {
  stopAudio();
  if (!enabled) return;
  const request = generation;
  const ctx = await unlock();
  if (!ctx || request !== generation) return;
  const at = ctx.currentTime + 0.02;
  if (mode === "melodic") {
    tone(ctx, root, at, 0.6);
    tone(ctx, upper, at + 0.6, 0.6);
  } else {
    tone(ctx, root, at, 1.2, 0.11);
    tone(ctx, upper, at, 1.2, 0.11);
  }
  await new Promise<void>((resolve) => setTimeout(resolve, 1220));
}

export async function playMove(note: Note, enabled = true): Promise<void> {
  stopAudio();
  if (!enabled) return;
  const request = generation;
  const ctx = await unlock();
  if (ctx && request === generation)
    tone(ctx, note, ctx.currentTime + 0.01, 0.35);
}

/** Short filtered noise distinguishes UI feedback from pitched interval examples. */
export async function playEffect(
  kind: "arrive" | "stamp" | "retry" | string,
  enabled = true,
): Promise<void> {
  if (!enabled) return;
  const ctx = await unlock();
  if (!ctx) return;
  const seconds = kind === "stamp" ? 0.19 : 0.11;
  const buffer = ctx.createBuffer(
    1,
    Math.floor(ctx.sampleRate * seconds),
    ctx.sampleRate,
  );
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++)
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3);
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = kind === "retry" ? 500 : 1800;
  const gain = ctx.createGain();
  gain.gain.value = 0.13;
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  active.push(noise);
  noise.onended = () => {
    active = active.filter((source) => source !== noise);
    noise.disconnect();
    filter.disconnect();
    gain.disconnect();
  };
  noise.start();
}
