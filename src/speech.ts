import * as Speech from 'expo-speech';

// expo-speech-recognition is a custom native module, so it is NOT available in Expo Go.
// We load it defensively: text chat + bot voice still work in Expo Go,
// and mic input works once you run a development build.
let Mod: any = null;
try {
  Mod = require('expo-speech-recognition').ExpoSpeechRecognitionModule;
} catch {
  Mod = null;
}

export const voiceInputAvailable = !!Mod;

export type SpeakOptions = {
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onDone?: () => void; // called when speech ends, is stopped, or fails
};

export function speak(text: string, opts: SpeakOptions = {}) {
  Speech.stop();
  Speech.speak(text, {
    language: 'en-US',
    rate: opts.rate ?? 0.95,
    pitch: opts.pitch ?? 1.0,
    onStart: opts.onStart,
    onDone: opts.onDone,
    onStopped: opts.onDone,
    onError: opts.onDone,
  });
}

export function stopSpeaking() {
  Speech.stop();
}

/** Starts listening. Returns a function that stops listening. */
export async function startListening(
  onText: (text: string, isFinal: boolean) => void,
  onEnd: () => void,
  onError: (message: string) => void,
): Promise<() => void> {
  if (!Mod) throw new Error('Voice input needs a development build (not Expo Go).');

  const perm = await Mod.requestPermissionsAsync();
  if (!perm.granted) throw new Error('Microphone permission nahi mili.');

  Speech.stop();
  const subs: { remove: () => void }[] = [];
  const cleanup = () => subs.splice(0).forEach((s) => s.remove());

  subs.push(
    Mod.addListener('result', (e: any) => {
      const t = e?.results?.[0]?.transcript;
      if (t) onText(t, !!e.isFinal);
    }),
    Mod.addListener('error', (e: any) => {
      cleanup();
      onError(e?.message ?? 'Speech error');
    }),
    Mod.addListener('end', () => {
      cleanup();
      onEnd();
    }),
  );

  Mod.start({ lang: 'en-US', interimResults: true, continuous: false });
  return () => Mod.stop();
}
