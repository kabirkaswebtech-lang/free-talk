export type CharacterId = 'dog' | 'cat' | 'human';

export type Character = {
  id: CharacterId;
  name: string;
  emoji: string;
  desc: string;
  /** Added to the system prompt so the bot talks in this character's style. */
  persona: string;
  /** Text-to-speech voice tuning (expo-speech). */
  pitch: number;
  rate: number;
};

export const CHARACTERS: Character[] = [
  {
    id: 'dog',
    name: 'Bruno',
    emoji: '🐶',
    desc: 'Khush aur energetic dost',
    persona:
      'You are Bruno, a cheerful, energetic and loyal talking dog. You are enthusiastic and encouraging. You may very occasionally mention walks, treats or playing, but never at the cost of the lesson.',
    pitch: 0.8,
    rate: 0.95,
  },
  {
    id: 'cat',
    name: 'Mimi',
    emoji: '🐱',
    desc: 'Pyaari, shant aur thodi shararati',
    persona:
      'You are Mimi, a gentle, curious and slightly playful talking cat. You are calm, kind and encouraging. You may very occasionally mention naps, milk or being curious, but never at the cost of the lesson.',
    pitch: 1.5,
    rate: 1.0,
  },
  {
    id: 'human',
    name: 'Emma',
    emoji: '🧑',
    desc: 'Friendly English teacher',
    persona:
      'You are Emma, a warm, patient and professional English teacher and conversation partner. You speak clearly and encourage the learner.',
    pitch: 1.1,
    rate: 0.95,
  },
];

export const getCharacter = (id: string | null | undefined): Character =>
  CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
