import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  AudioModule,
  AudioQuality,
  IOSOutputFormat,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  type RecordingOptions,
} from 'expo-audio';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { analyzeFace, askGemini, Level, Scenario, SCENARIOS, transcribeAudio, Turn } from './src/gemini';
import { speak, startListening, stopSpeaking, voiceInputAvailable } from './src/speech';
import Avatar from './src/Avatar';
import { Character, CHARACTERS, getCharacter } from './src/characters';

type Msg = {
  id: string;
  role: 'user' | 'model';
  text: string;
  correction?: string | null;
  explanation?: string | null;
  kind?: 'note'; // side notes (like the face check) are shown but never sent to the chat model
};

// Gemini reliably understands .aac and .wav, so we record in exactly those formats (mono, 16 kHz is enough for speech).
const HQ = RecordingPresets.HIGH_QUALITY;
const REC_OPTIONS: RecordingOptions =
  Platform.OS === 'android'
    ? {
        ...HQ,
        extension: '.aac',
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 64000,
        android: { ...HQ.android, extension: '.aac', outputFormat: 'aac_adts', audioEncoder: 'aac', sampleRate: 16000 },
      }
    : {
        ...HQ,
        extension: '.wav',
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 256000,
        ios: {
          ...HQ.ios,
          extension: '.wav',
          outputFormat: IOSOutputFormat.LINEARPCM,
          audioQuality: AudioQuality.MAX,
          sampleRate: 16000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      };
const REC_MIME = Platform.OS === 'android' ? 'audio/aac' : 'audio/wav';

const LEVELS: Level[] = ['Beginner', 'Intermediate', 'Advanced'];
const KEY_STORE = 'gemini_api_key';
const LEVEL_STORE = 'level';
const CHAR_STORE = 'character';
const C = {
  bg: '#F5F7FB',
  card: '#FFFFFF',
  primary: '#4F46E5',
  text: '#1F2937',
  muted: '#6B7280',
  ok: '#16A34A',
  warn: '#D97706',
  border: '#E5E7EB',
};

export default function App() {
  return (
    <SafeAreaProvider>
      <Root />
    </SafeAreaProvider>
  );
}

function Root() {
  const [ready, setReady] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [level, setLevel] = useState<Level>('Beginner');
  const [character, setCharacter] = useState<Character>(CHARACTERS[0]);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [editingKey, setEditingKey] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [k, l, c] = await Promise.all([
          AsyncStorage.getItem(KEY_STORE),
          AsyncStorage.getItem(LEVEL_STORE),
          AsyncStorage.getItem(CHAR_STORE),
        ]);
        if (k) setApiKey(k);
        if (c) setCharacter(getCharacter(c));
        if (l && LEVELS.includes(l as Level)) setLevel(l as Level);
      } catch {}
      setReady(true);
    })();
  }, []);

  const saveKey = async (k: string) => {
    setApiKey(k);
    setEditingKey(false);
    try {
      await AsyncStorage.setItem(KEY_STORE, k);
    } catch {}
  };
  const changeLevel = async (l: Level) => {
    setLevel(l);
    try {
      await AsyncStorage.setItem(LEVEL_STORE, l);
    } catch {}
  };

  const changeCharacter = async (c: Character) => {
    setCharacter(c);
    try {
      await AsyncStorage.setItem(CHAR_STORE, c.id);
    } catch {}
  };

  if (!ready) {
    return (
      <View style={[s.fill, s.center]}>
        <ActivityIndicator color={C.primary} />
      </View>
    );
  }

  let body: React.ReactNode;
  if (!apiKey || editingKey) {
    body = <KeyScreen initial={apiKey} onSave={saveKey} onCancel={apiKey ? () => setEditingKey(false) : undefined} />;
  } else if (scenario) {
    body = (
      <ChatScreen
        apiKey={apiKey}
        level={level}
        scenario={scenario}
        character={character}
        onBack={() => setScenario(null)}
      />
    );
  } else {
    body = (
      <HomeScreen
        level={level}
        onLevel={changeLevel}
        character={character}
        onCharacter={changeCharacter}
        onPick={setScenario}
        onSettings={() => setEditingKey(true)}
      />
    );
  }

  return (
    <SafeAreaView style={s.fill} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      {body}
    </SafeAreaView>
  );
}

/* ---------------------------- API key screen ---------------------------- */

function KeyScreen({
  initial,
  onSave,
  onCancel,
}: {
  initial: string;
  onSave: (k: string) => void;
  onCancel?: () => void;
}) {
  const [val, setVal] = useState(initial);
  return (
    <View style={[s.fill, { padding: 24, justifyContent: 'center' }]}>
      <Text style={s.title}>English Buddy 🤖</Text>
      <Text style={[s.muted, { marginBottom: 20 }]}>
        Shuru karne ke liye apni free Gemini API key daalo. Key sirf aapke phone mein save hoti hai.{'\n\n'}
        Key yahan se milegi: aistudio.google.com/apikey
      </Text>
      <TextInput
        style={s.input}
        value={val}
        onChangeText={setVal}
        placeholder="AIza..."
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
      />
      <Pressable
        style={[s.btn, !val.trim() && { opacity: 0.5 }]}
        disabled={!val.trim()}
        onPress={() => onSave(val.trim())}
      >
        <Text style={s.btnText}>Save & Start</Text>
      </Pressable>
      {onCancel && (
        <Pressable onPress={onCancel} style={{ marginTop: 14, alignItems: 'center' }}>
          <Text style={{ color: C.muted }}>Cancel</Text>
        </Pressable>
      )}
    </View>
  );
}

/* ------------------------------ Home screen ------------------------------ */

function HomeScreen({
  level,
  onLevel,
  character,
  onCharacter,
  onPick,
  onSettings,
}: {
  level: Level;
  onLevel: (l: Level) => void;
  character: Character;
  onCharacter: (c: Character) => void;
  onPick: (s: Scenario) => void;
  onSettings: () => void;
}) {
  return (
    <View style={s.fill}>
      <View style={s.header}>
        <Text style={s.title}>English Buddy 🤖</Text>
        <Pressable onPress={onSettings} hitSlop={10}>
          <Text style={{ fontSize: 22 }}>⚙️</Text>
        </Pressable>
      </View>

      <Text style={s.section}>Aapka level</Text>
      <View style={s.row}>
        {LEVELS.map((l) => (
          <Pressable key={l} onPress={() => onLevel(l)} style={[s.chip, level === l && s.chipOn]}>
            <Text style={[s.chipText, level === l && { color: '#fff' }]}>{l}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={s.section}>Apna partner choose karo</Text>
      <View style={s.row}>
        {CHARACTERS.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => onCharacter(c)}
            style={[s.charCard, character.id === c.id && s.charCardOn]}
          >
            <Avatar kind={c.id} speaking={false} size={64} />
            <Text style={s.charName}>
              {c.emoji} {c.name}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={[s.muted, { marginHorizontal: 16, marginTop: 6 }]}>{character.desc}</Text>

      <Text style={s.section}>Practice choose karo</Text>
      <FlatList
        data={SCENARIOS}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item }) => (
          <Pressable style={s.card} onPress={() => onPick(item)}>
            <Text style={{ fontSize: 30 }}>{item.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>{item.title}</Text>
              <Text style={s.muted}>{item.desc}</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

/* ------------------------------ Chat screen ------------------------------ */

function ChatScreen({
  apiKey,
  level,
  scenario,
  character,
  onBack,
}: {
  apiKey: string;
  level: Level;
  scenario: Scenario;
  character: Character;
  onBack: () => void;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [retryFn, setRetryFn] = useState<null | (() => void)>(null);
  const [speaking, setSpeaking] = useState(false);
  const [kbOpen, setKbOpen] = useState(false);
  const recorder = useAudioRecorder(REC_OPTIONS);
  const faceAsked = useRef(false);
  const stopRef = useRef<null | (() => void)>(null);
  const listRef = useRef<FlatList<Msg>>(null);
  const autoSpeakRef = useRef(autoSpeak);
  autoSpeakRef.current = autoSpeak;

  // Speak with this character's voice; `speaking` drives the avatar's mouth.
  const say = useCallback(
    (text: string) =>
      speak(text, {
        rate: character.rate,
        pitch: character.pitch,
        onStart: () => setSpeaking(true),
        onDone: () => setSpeaking(false),
      }),
    [character],
  );

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKbOpen(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKbOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const turn = useCallback(
    async (history: Msg[]) => {
      setBusy(true);
      setError(null);
      setRetryFn(null);
      try {
        const turns: Turn[] = history
          .filter((m) => m.kind !== 'note')
          .map((m) => ({ role: m.role, text: m.text }));
        const r = await askGemini(apiKey, scenario, level, turns, character.persona);
        setMsgs((cur) => {
          const next = [...cur];
          // attach feedback to the learner's last message
          for (let i = next.length - 1; i >= 0; i--) {
            if (next[i].role === 'user') {
              next[i] = { ...next[i], correction: r.correction, explanation: r.explanation };
              break;
            }
          }
          next.push({ id: `m${Date.now()}`, role: 'model', text: r.reply });
          return next;
        });
        if (autoSpeakRef.current) say(r.reply);
      } catch (e: any) {
        setError(e?.message ?? 'Kuch gadbad ho gayi. Dobara try karo.');
        setRetryFn(() => () => turn(history));
      } finally {
        setBusy(false);
      }
    },
    [apiKey, scenario, level, character, say],
  );

  // bot starts the conversation
  useEffect(() => {
    turn([]);
    return () => {
      stopSpeaking();
      stopRef.current?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }, [msgs, busy]);

  const send = (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    stopSpeaking();
    const next: Msg[] = [...msgs, { id: `u${Date.now()}`, role: 'user', text: t }];
    setMsgs(next);
    setInput('');
    turn(next);
  };

  // Works in Expo Go: record audio, let Gemini turn it into text.
  const toggleRecording = async () => {
    setNotice(null);
    if (recording) {
      setRecording(false);
      setBusy(true);
      try {
        await recorder.stop();
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
        const uri = recorder.uri;
        if (!uri) throw new Error('Recording save nahi hui. Dobara try karo.');
        const base64 = await new File(uri).base64();
        if (base64.length < 2000) throw new Error('Recording bahut chhoti ya khali hai. Thoda lamba bolkar dobara try karo.');
        const text = await transcribeAudio(apiKey, base64, REC_MIME);
        setBusy(false);
        if (!text) {
          setNotice('Awaaz sunai nahi di. Mic ke paas thoda zor se bolo aur dobara try karo.');
          return;
        }
        send(text);
      } catch (e: any) {
        setBusy(false);
        setError(e?.message ?? 'Voice samajh nahi aayi. Dobara try karo.');
        setRetryFn(null);
      }
      return;
    }
    setError(null);
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) throw new Error('Microphone permission nahi mili. Phone Settings mein Expo Go ko mic allow karo.');
      stopSpeaking();
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecording(true);
      setNotice('🔴 Recording... bolna khatam hone par ⏹️ dabao.');
    } catch (e: any) {
      setError(e?.message ?? 'Mic start nahi hua.');
      setRetryFn(null);
    }
  };

  // Selfie -> Gemini vision tells you how your expression looks.
  const checkFace = async () => {
    if (busy) return;
    setError(null);
    setNotice(null);
    if (!faceAsked.current) {
      const msg =
        'Aapki selfie Google Gemini ko bheji jayegi taaki wo aapka expression dekh sake. Photo save nahi hoti. Aage badhein?';
      // Alert.alert does nothing on the web, so use the browser's confirm dialog there.
      const ok =
        Platform.OS === 'web'
          ? window.confirm(msg)
          : await new Promise<boolean>((resolve) =>
              Alert.alert(
                '📷 Expression check',
                msg,
                [
                  { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                  { text: 'Haan', onPress: () => resolve(true) },
                ],
                { onDismiss: () => resolve(false) },
              ),
            );
      if (!ok) return;
      faceAsked.current = true;
    }
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) throw new Error('Camera permission nahi mili. Phone Settings mein Expo Go ko camera allow karo.');
      const r = await ImagePicker.launchCameraAsync({
        cameraType: ImagePicker.CameraType.front,
        quality: 0.6,
        base64: true,
      });
      const b64 = r.assets?.[0]?.base64;
      if (r.canceled || !b64) return;
      setBusy(true);
      const text = await analyzeFace(apiKey, b64, scenario);
      setMsgs((cur) => [...cur, { id: `n${Date.now()}`, role: 'model', text, kind: 'note' }]);
    } catch (e: any) {
      setError(e?.message ?? 'Photo check nahi ho paya.');
      setRetryFn(null);
    } finally {
      setBusy(false);
    }
  };

  const toggleMic = async () => {
    if (!voiceInputAvailable) {
      if (Platform.OS === 'web') {
        setNotice('Is browser mein voice support nahi hai. Chrome ya Edge use karo, ya type karke likho.');
        return;
      }
      return toggleRecording();
    }
    if (listening) {
      stopRef.current?.();
      return;
    }
    setError(null);
    setNotice(null);
    try {
      setListening(true);
      let last = '';
      stopRef.current = await startListening(
        (text) => {
          last = text;
          setInput(text);
        },
        () => {
          setListening(false);
          stopRef.current = null;
          if (last.trim()) send(last);
        },
        (m) => {
          setListening(false);
          setError(m);
        },
      );
    } catch (e: any) {
      setListening(false);
      setError(e?.message ?? 'Mic start nahi hua.');
    }
  };

  return (
    <KeyboardAvoidingView style={s.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.header}>
        <Pressable onPress={onBack} hitSlop={10}>
          <Text style={{ fontSize: 16, color: C.primary }}>← Back</Text>
        </Pressable>
        <Text style={s.cardTitle}>
          {scenario.emoji} {scenario.title}
        </Text>
        <Pressable
          onPress={() => {
            stopSpeaking();
            setAutoSpeak((v) => !v);
          }}
          hitSlop={10}
        >
          <Text style={{ fontSize: 22 }}>{autoSpeak ? '🔊' : '🔇'}</Text>
        </Pressable>
      </View>

      <View style={s.avatarBox}>
        <Avatar
          kind={character.id}
          speaking={speaking}
          thinking={busy && !speaking}
          size={kbOpen ? 56 : 130}
        />
        <Text style={s.avatarName}>
          {character.name}{' '}
          <Text style={{ color: C.muted, fontWeight: '400' }}>
            {recording || listening
              ? '· 👂 Sun raha hu...'
              : busy
                ? '· 💭 Soch raha hu...'
                : speaking
                  ? '· 🗣️ Bol raha hu...'
                  : '· Aapki baari!'}
          </Text>
        </Text>
      </View>

      <FlatList
        ref={listRef}
        data={msgs}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        renderItem={({ item }) => <Bubble m={item} onSpeak={say} />}
        ListFooterComponent={
          <View>
            {busy && <ActivityIndicator color={C.primary} style={{ marginTop: 8, alignSelf: 'flex-start' }} />}
            {notice && <Text style={{ color: C.muted, marginTop: 8 }}>ℹ️ {notice}</Text>}
            {error && (
              <View style={{ marginTop: 8 }}>
                <Text style={{ color: '#DC2626' }}>{error}</Text>
                {retryFn && (
                  <Pressable
                    onPress={retryFn}
                    disabled={busy}
                    style={[s.btn, { marginTop: 10, alignSelf: 'flex-start', paddingVertical: 10 }]}
                  >
                    <Text style={s.btnText}>🔄 Retry</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        }
      />

      <View style={s.inputBar}>
        <Pressable onPress={checkFace} disabled={busy || recording} style={s.mic} accessibilityLabel="Expression check">
          <Text style={{ fontSize: 20 }}>📷</Text>
        </Pressable>
        <Pressable
          onPress={toggleMic}
          disabled={busy && !recording && !listening}
          style={[s.mic, (listening || recording) && { backgroundColor: '#DC2626' }]}
          accessibilityLabel="Microphone"
        >
          <Text style={{ fontSize: 20 }}>{listening || recording ? '⏹️' : '🎤'}</Text>
        </Pressable>
        <TextInput
          style={[s.input, { flex: 1, marginBottom: 0 }]}
          value={input}
          onChangeText={setInput}
          placeholder={listening || recording ? 'Listening...' : 'Type or tap 🎤 to speak'}
          multiline
          onSubmitEditing={() => send(input)}
        />
        <Pressable
          onPress={() => send(input)}
          disabled={busy || !input.trim()}
          style={[s.send, (busy || !input.trim()) && { opacity: 0.4 }]}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Bubble({ m, onSpeak }: { m: Msg; onSpeak: (t: string) => void }) {
  const mine = m.role === 'user';
  if (m.kind === 'note') {
    return (
      <View style={[s.feedback, { maxWidth: '100%', backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}>
        <Text style={{ color: C.primary, fontWeight: '700', marginBottom: 4 }}>📷 Expression check</Text>
        <Text style={{ color: C.text, fontSize: 15 }}>{m.text}</Text>
      </View>
    );
  }
  return (
    <View style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
      <View style={[s.bubble, mine ? s.mine : s.theirs]}>
        <Text style={{ color: mine ? '#fff' : C.text, fontSize: 16 }}>{m.text}</Text>
        {!mine && (
          <Pressable onPress={() => onSpeak(m.text)} hitSlop={8} style={{ marginTop: 6 }}>
            <Text style={{ color: C.primary, fontSize: 13 }}>🔊 Sunao</Text>
          </Pressable>
        )}
      </View>
      {mine && (m.correction || m.explanation) && (
        <View style={s.feedback}>
          {m.correction ? (
            <Text style={{ color: C.warn, fontWeight: '600' }}>✏️ Better: {m.correction}</Text>
          ) : (
            <Text style={{ color: C.ok, fontWeight: '600' }}>✅ Sahi hai!</Text>
          )}
          {m.explanation ? <Text style={{ color: C.text, marginTop: 4 }}>{m.explanation}</Text> : null}
        </View>
      )}
    </View>
  );
}

/* -------------------------------- Styles -------------------------------- */

const s = StyleSheet.create({
  fill: { flex: 1, backgroundColor: C.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.card,
  },
  title: { fontSize: 22, fontWeight: '800', color: C.text },
  section: { fontSize: 15, fontWeight: '700', color: C.muted, marginTop: 16, marginHorizontal: 16 },
  muted: { color: C.muted, fontSize: 14 },
  row: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  chipOn: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { color: C.text, fontWeight: '600' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.card,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  input: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 14,
    maxHeight: 110,
  },
  btn: { backgroundColor: C.primary, padding: 14, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  bubble: { maxWidth: '85%', padding: 12, borderRadius: 16 },
  mine: { backgroundColor: C.primary, borderBottomRightRadius: 4 },
  theirs: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderBottomLeftRadius: 4 },
  feedback: {
    maxWidth: '85%',
    marginTop: 6,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 10,
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  mic: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  charCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: C.border,
  },
  charCardOn: { borderColor: C.primary, backgroundColor: '#EEF2FF' },
  charName: { marginTop: 2, fontWeight: '700', color: C.text, fontSize: 13 },
  avatarBox: {
    alignItems: 'center',
    paddingVertical: 6,
    backgroundColor: '#EEF2FF',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  avatarName: { fontWeight: '700', color: C.text, fontSize: 14 },
  send: { backgroundColor: C.primary, paddingHorizontal: 16, height: 44, borderRadius: 22, justifyContent: 'center' },
});
