export type Level = 'Beginner' | 'Intermediate' | 'Advanced';

export type Scenario = {
  id: string;
  title: string;
  emoji: string;
  desc: string;
  setup: string;
};

export type Turn = { role: 'user' | 'model'; text: string };

export type BotReply = {
  reply: string;
  correction: string | null;
  explanation: string | null;
};

export const SCENARIOS: Scenario[] = [
  {
    id: 'free',
    title: 'Free Talk',
    emoji: '💬',
    desc: 'Kisi bhi topic par baat karo',
    setup: 'Have a casual, friendly conversation about everyday topics (hobbies, food, movies, family, daily life).',
  },
  {
    id: 'interview',
    title: 'Job Interview',
    emoji: '💼',
    desc: 'Interview ki practice',
    setup: 'You are an HR interviewer conducting a job interview for the user. Ask one interview question at a time.',
  },
  {
    id: 'restaurant',
    title: 'Restaurant',
    emoji: '🍽️',
    desc: 'Order karna seekho',
    setup: 'You are a waiter at a restaurant. The user is a customer. Help them order food and drinks.',
  },
  {
    id: 'travel',
    title: 'Airport & Travel',
    emoji: '✈️',
    desc: 'Check-in, directions, hotel',
    setup: 'You are an airport / hotel staff member helping a traveller with check-in, directions and bookings.',
  },
  {
    id: 'doctor',
    title: 'Doctor Visit',
    emoji: '🩺',
    desc: 'Health problem batana',
    setup: 'You are a doctor. The user is a patient describing a health problem. Ask simple follow-up questions.',
  },
  {
    id: 'shopping',
    title: 'Shopping',
    emoji: '🛍️',
    desc: 'Dukaan par baat-cheet',
    setup: 'You are a shop assistant in a clothes store. The user is a customer. Help them find and buy things.',
  },
];

// If one model is busy (503/429) or missing (404), we automatically try the next one.
// Google retires model names often, so we ask the API which models this key can use right now.
// Lite models first: they answer much faster, which matters more than depth for short practice replies.
const FALLBACK_MODELS = ['gemini-flash-lite-latest', 'gemini-flash-latest'];
const RETRYABLE = [404, 429, 500, 502, 503, 504];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Remembers if the "no thinking" setting is accepted. Some models reject it with a generic 400.
let fastOk = true;

let cachedModels: string[] | null = null;
async function pickModels(apiKey: string): Promise<string[]> {
  if (cachedModels) return cachedModels;
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', {
      headers: { 'x-goog-api-key': apiKey },
    });
    if (res.ok) {
      const j = await res.json();
      const names: string[] = (j.models ?? [])
        .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m: any) => String(m.name).replace('models/', ''))
        .filter((n: string) => /^gemini-[\d.]+-flash(-lite)?$/.test(n)); // stable text models only
      const ver = (n: string) => parseFloat(n.match(/gemini-([\d.]+)-/)?.[1] ?? '0');
      names.sort((a, b) => ver(b) - ver(a) || Number(b.endsWith('-lite')) - Number(a.endsWith('-lite'))); // newest first, lite before full
      cachedModels = [...FALLBACK_MODELS, ...names.slice(0, 4)];
      return cachedModels;
    }
  } catch {}
  return FALLBACK_MODELS;
}

function systemPrompt(scenario: Scenario, level: Level, persona: string) {
  return `You are an English-speaking partner for a Hindi-speaking learner.
Your character: ${persona}
Scenario: ${scenario.setup}
Learner level: ${level}.

Rules:
1. Stay in the scenario. Reply in simple, natural English that suits the ${level} level. Keep it to 1-3 short sentences and end with a question so the conversation continues.
2. Check ONLY the learner's last message for grammar, word choice and spelling mistakes. The message may come from voice input, so ignore missing punctuation and capital letters.
3. If there are mistakes: set "correction" to the corrected version of their sentence, and "explanation" to a short, simple explanation of the main mistake written in Hinglish (Hindi in Roman letters).
4. If the sentence is correct: set "correction" to null and "explanation" to a short Hinglish praise (for example "Bahut badhiya!") or, if useful, a more natural way to say it.
5. In "reply" do not use emojis, markdown or lists (it is read aloud).
6. Stay in your character's personality but never use sound effects like "woof" or "meow" (the reply is read aloud). The correction and explanation must stay clear and helpful.
7. Output ONLY valid JSON: {"reply": string, "correction": string | null, "explanation": string | null}`;
}

/** Sends one generateContent request, trying several models and giving friendly errors. */
async function generate(apiKey: string, requestBody: object): Promise<any> {
  // Switch off "thinking" for speed. If a model rejects that setting we retry without it.
  const fastBody = JSON.stringify({
    ...requestBody,
    generationConfig: { ...(requestBody as any).generationConfig, thinkingConfig: { thinkingBudget: 0 } },
  });
  const plainBody = JSON.stringify(requestBody);
  let useFast = fastOk;
  let data: any = null;
  let lastStatus = 0;
  let lastMsg = '';
  let sawBusy = false; // if any model said "busy", that is the most useful thing to tell the user
  const models = await pickModels(apiKey);

  // up to 2 passes over the model list (short pause in between) before giving up
  outer: for (let pass = 0; pass < 2; pass++) {
    if (pass > 0) await sleep(2000);
    for (const model of models) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
            body: useFast ? fastBody : plainBody,
          },
        );
        if (res.ok) {
          data = await res.json();
          break outer;
        }
        lastStatus = res.status;
        if (res.status === 503 || res.status === 429) sawBusy = true;
        try {
          lastMsg = (await res.json())?.error?.message ?? '';
        } catch {
          lastMsg = '';
        }
        if (res.status === 400 && useFast) {
          // The 400 may be caused by our speed-up setting (message is often just "invalid argument").
          // Stop sending it, and redo the whole round without it.
          useFast = false;
          fastOk = false;
          pass--;
          continue outer;
        }
        if (!RETRYABLE.includes(res.status)) break outer; // bad key / bad request - no point retrying
      } catch (e: any) {
        lastStatus = -1;
        lastMsg = e?.name === 'AbortError' ? 'timeout' : 'network';
      } finally {
        clearTimeout(timer);
      }
    }
  }

  if (!data) {
    if (sawBusy && lastStatus !== 403 && lastStatus !== 400) {
      throw new Error('Google ke servers abhi busy hain (ya free limit poori ho gayi). Thodi der baad Retry dabao.');
    }
    if (lastStatus === -1 && lastMsg === 'network') throw new Error('Internet se connect nahi ho pa raha. Net check karke Retry dabao.');
    if (lastStatus === -1) throw new Error('Gemini ne jawab nahi diya (timeout). Retry dabao.');
    if (lastStatus === 400 && /api key/i.test(lastMsg)) throw new Error('API key galat hai. ⚙️ dabakar sahi key daalo.');
    if (lastStatus === 403) throw new Error('API key ko permission nahi hai (403). ⚙️ dabakar nayi key daalo.');
    throw new Error(`Gemini error ${lastStatus}: ${lastMsg}`);
  }
  return data;
}

const textOf = (data: any): string =>
  data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('') ?? '';

export async function askGemini(
  apiKey: string,
  scenario: Scenario,
  level: Level,
  history: Turn[],
  persona: string,
): Promise<BotReply> {
  const contents = [
    { role: 'user', parts: [{ text: '[Please start the conversation with a short greeting and your first question.]' }] },
    ...history.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
  ];

  const data = await generate(apiKey, {
    systemInstruction: { parts: [{ text: systemPrompt(scenario, level, persona) }] },
    contents,
    generationConfig: { responseMimeType: 'application/json', temperature: 0.8 },
  });

  const text = textOf(data);
  try {
    const parsed = JSON.parse(text);
    return {
      reply: String(parsed.reply ?? '').trim() || '...',
      correction: parsed.correction ? String(parsed.correction) : null,
      explanation: parsed.explanation ? String(parsed.explanation) : null,
    };
  } catch {
    return { reply: text.trim() || 'Sorry, could you say that again?', correction: null, explanation: null };
  }
}

/** Speech -> text using Gemini (works in Expo Go, no native speech module needed). */
export async function transcribeAudio(apiKey: string, base64: string, mimeType: string): Promise<string> {
  const data = await generate(apiKey, {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text:
              'Transcribe exactly what the speaker says in English. Keep their grammar mistakes as they are, do not correct or improve anything. If a Hindi word is spoken, write it in Roman letters. Output ONLY the transcript. If there is no speech, output exactly: [no speech]',
          },
          { inlineData: { mimeType, data: base64 } },
        ],
      },
    ],
    generationConfig: { temperature: 0 },
  });
  const t = textOf(data).trim();
  return /^\[?no speech\]?$/i.test(t) ? '' : t;
}

/** Looks at a selfie and comments on the facial expression (never identifies the person). */
export async function analyzeFace(apiKey: string, base64: string, scenario: Scenario): Promise<string> {
  const data = await generate(apiKey, {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text:
              `You are an English speaking coach. The learner is practising "${scenario.title}" and took a selfie so you can check their facial expression and body language. ` +
              'In 3 short lines written in simple Hinglish (Hindi in Roman letters, with a few English words): ' +
              '1) which expression/emotion you see (for example confident, nervous, tired, confused, smiling), ' +
              '2) is it suitable for this situation, ' +
              '3) one small tip to look more confident while speaking. ' +
              'Be kind and encouraging. Do not identify the person and do not guess age, race or health. If no face is visible, say so and ask them to retake the photo.',
          },
          { inlineData: { mimeType: 'image/jpeg', data: base64 } },
        ],
      },
    ],
    generationConfig: { temperature: 0.6 },
  });
  return textOf(data).trim() || 'Photo samajh nahi aayi, dobara try karo.';
}
