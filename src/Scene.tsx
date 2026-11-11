import React, { useEffect, useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';
import { CatFace, DogFace, HumanFace } from './Avatar';
import type { CharacterId } from './characters';

/**
 * A cosy Christmas living room with a full-body character that keeps itself busy:
 * it wanders, waves, jumps and dances when idle, listens with a hand at its ear while you speak,
 * watches your typing, and ponders while the bot is thinking.
 * Everything is drawn with SVG, so it works in Expo Go and on the web with no image files.
 */

export type SceneMode = 'idle' | 'speaking' | 'listening' | 'typing' | 'thinking';
type Act = 'stand' | 'walk' | 'wave' | 'jump' | 'dance' | 'talk' | 'listen' | 'watch' | 'think';

type Pose = {
  x: number;
  lift: number;
  armL: number; // 0 = hanging down, 90 = sideways, 180 = straight up
  armR: number;
  legL: number;
  legR: number;
  tilt: number; // head tilt in degrees
  lookX: number;
  lookY: number;
  tail: number;
  scale: number;
  open: number;
  blink: boolean;
  bubble: 'dots' | 'q' | 'waves' | null;
  T: number;
  bg: number;
};

const FLOOR = 250; // y of the floor line where the character stands
const X_MIN = 105;
const X_MAX = 295;
const CENTER = 200;
const BASE_SCALE = 0.66;

const INITIAL: Pose = {
  x: CENTER,
  lift: 0,
  armL: 10,
  armR: 10,
  legL: 0,
  legR: 0,
  tilt: 0,
  lookX: 0,
  lookY: 0,
  tail: 0,
  scale: 1,
  open: 0,
  blink: false,
  bubble: null,
  T: 0,
  bg: 0,
};

/* ---------------------------------------------------------------------------------------- */
/* Behaviour                                                                                */
/* ---------------------------------------------------------------------------------------- */

function usePose(mode: SceneMode): Pose {
  const [pose, setPose] = useState<Pose>(INITIAL);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    const S = {
      x: CENTER,
      target: CENTER,
      act: 'stand' as Act,
      actStart: Date.now(),
      actUntil: 0,
      walkPh: 0,
      last: Date.now(),
      frame: 0,
      cur: { armL: 10, armR: 10, legL: 0, legR: 0, tilt: 0, lookX: 0, lookY: 0, scale: 1 } as Record<string, number>,
      open: 0,
      nextMouth: 0,
      nextBlink: Date.now() + 2500,
      blinkUntil: 0,
    };

    const id = setInterval(() => {
      const now = Date.now();
      const dt = Math.min(0.15, (now - S.last) / 1000);
      S.last = now;
      S.frame++;
      const T = now / 1000;
      const m = modeRef.current;

      // ---- decide what to do ----
      let act: Act;
      if (m === 'idle') {
        if (now > S.actUntil) {
          const r = Math.random();
          S.actStart = now;
          if (r < 0.45) {
            S.act = 'walk';
            S.target = X_MIN + Math.random() * (X_MAX - X_MIN);
            S.actUntil = now + 8000;
          } else if (r < 0.6) {
            S.act = 'stand';
            S.actUntil = now + 1500 + Math.random() * 1500;
          } else if (r < 0.72) {
            S.act = 'wave';
            S.actUntil = now + 2200;
          } else if (r < 0.84) {
            S.act = 'jump';
            S.actUntil = now + 1800;
          } else {
            S.act = 'dance';
            S.actUntil = now + 3000;
          }
        }
        act = S.act;
      } else {
        S.actUntil = 0; // the idle scheduler restarts when we go back to idle
        if (m === 'speaking') act = 'talk';
        else if (m === 'thinking') act = 'think';
        else if (Math.abs(S.x - CENTER) > 5) {
          act = 'walk'; // step to the middle first, so the user is faced properly
          S.target = CENTER;
        } else act = m === 'listening' ? 'listen' : 'watch';
        if (S.act !== act) {
          S.act = act;
          S.actStart = now;
        }
      }

      // ---- pose for this act ----
      const ta = (now - S.actStart) / 1000;
      const t: Record<string, number> = { armL: 10, armR: 10, legL: 0, legR: 0, tilt: 0, lookX: 0, lookY: 0, scale: 1 };
      let lift = 0;
      let dx = 0;
      let tail = Math.sin(T * 3) * 10;
      let bubble: Pose['bubble'] = null;

      switch (act) {
        case 'walk': {
          const dir = Math.sign(S.target - S.x) || 1;
          const step = 60 * dt;
          if (Math.abs(S.target - S.x) <= step) {
            S.x = S.target;
            if (m === 'idle') S.actUntil = 0;
          } else S.x += dir * step;
          S.walkPh += dt * 10;
          const sw = Math.sin(S.walkPh);
          t.legL = sw * 28;
          t.legR = -sw * 28;
          t.armL = 10 + sw * 16;
          t.armR = 10 - sw * 16;
          t.tilt = sw * 2;
          lift = Math.abs(Math.cos(S.walkPh)) * 4;
          tail = Math.sin(T * 8) * 14;
          break;
        }
        case 'wave':
          t.armR = 150 + Math.sin(T * 11) * 20;
          t.tilt = 5;
          tail = Math.sin(T * 10) * 20;
          break;
        case 'jump': {
          const h = Math.max(0, Math.sin(ta * 7));
          lift = h * 26;
          t.armL = 20 + h * 130;
          t.armR = 20 + h * 130;
          t.legL = h * 10;
          t.legR = -h * 10;
          tail = Math.sin(T * 12) * 20;
          break;
        }
        case 'dance': {
          const s6 = Math.sin(T * 6);
          t.armL = 95 + s6 * 75;
          t.armR = 95 - s6 * 75;
          t.legL = s6 * 14;
          t.legR = -s6 * 14;
          lift = Math.abs(s6) * 6;
          dx = Math.sin(T * 3) * 8;
          t.tilt = Math.sin(T * 3) * 9;
          tail = Math.sin(T * 9) * 22;
          break;
        }
        case 'talk':
          t.armL = 15 + Math.max(0, Math.sin(T * 4)) * 45;
          t.armR = 15 + Math.max(0, Math.sin(T * 4 + 2.2)) * 45;
          t.tilt = Math.sin(T * 2.5) * 4;
          lift = Math.abs(Math.sin(T * 5)) * 1.5;
          tail = Math.sin(T * 9) * 16;
          break;
        case 'listen':
          t.armR = 172 + Math.sin(T * 6) * 3; // hand up at the ear
          t.tilt = 11;
          t.lookX = 4;
          t.scale = 1.04;
          bubble = 'waves';
          tail = Math.sin(T * 2) * 6;
          break;
        case 'watch':
          t.lookY = 7; // eyes down, towards the text box
          t.tilt = Math.sin(T * 2.2) * 3;
          t.scale = 1.07;
          t.armL = 22;
          t.armR = 22;
          bubble = 'dots';
          tail = Math.sin(T * 4) * 8;
          break;
        case 'think':
          t.armR = 128 + Math.sin(T * 3) * 4;
          t.tilt = -8;
          t.lookX = 5;
          t.lookY = -6;
          bubble = 'q';
          tail = Math.sin(T * 2) * 5;
          break;
        default: // stand and breathe
          t.armL = 10 + Math.sin(T * 2) * 2;
          t.armR = 10 + Math.sin(T * 2 + 1) * 2;
          t.tilt = Math.sin(T * 0.9) * 2;
          lift = Math.sin(T * 2) * 0.8;
      }

      // smooth movement between poses
      for (const k of Object.keys(t)) S.cur[k] += (t[k] - S.cur[k]) * 0.3;

      // mouth and blinking
      if (m === 'speaking') {
        if (now > S.nextMouth) {
          S.open = Math.random() < 0.2 ? 0.15 : 0.35 + Math.random() * 0.65;
          S.nextMouth = now + 140;
        }
      } else S.open = 0;
      if (now > S.nextBlink) {
        S.blinkUntil = now + 140;
        S.nextBlink = now + 2500 + Math.random() * 2000;
      }

      setPose({
        x: S.x + dx,
        lift,
        armL: S.cur.armL,
        armR: S.cur.armR,
        legL: S.cur.legL,
        legR: S.cur.legR,
        tilt: S.cur.tilt,
        lookX: S.cur.lookX,
        lookY: S.cur.lookY,
        tail,
        scale: S.cur.scale,
        open: S.open,
        blink: now < S.blinkUntil,
        bubble,
        T,
        bg: Math.floor(S.frame / 2),
      });
    }, 66);

    return () => clearInterval(id);
  }, []);

  return pose;
}

/* ---------------------------------------------------------------------------------------- */
/* Scene                                                                                    */
/* ---------------------------------------------------------------------------------------- */

type Props = { kind: CharacterId; mode: SceneMode; compact?: boolean };

export default function Scene({ kind, mode, compact = false }: Props) {
  const { width } = useWindowDimensions();
  const w = Math.min(width, 520);
  const vb = compact ? { y: 70, h: 190 } : { y: 0, h: 260 };
  const h = (w * vb.h) / 400;
  const p = usePose(mode);
  const sc = BASE_SCALE * p.scale;
  const headY = FLOOR - p.lift - 174 * sc;

  return (
    <View style={{ width: w, height: h, alignSelf: 'center', overflow: 'hidden' }}>
      <Svg width={w} height={h} viewBox={`0 ${vb.y} 400 ${vb.h}`}>
        <Background ph={p.bg} />

        {/* shadow */}
        <Ellipse cx={p.x} cy={FLOOR + 3} rx={36 * (1 - p.lift / 90)} ry={7} fill="#000" opacity={0.25} />

        <G transform={`translate(${p.x} ${FLOOR - p.lift}) scale(${sc})`}>
          <Character kind={kind} p={p} />
        </G>

        <Bubble kind={p.bubble} x={p.x} y={headY - 52 * sc} T={p.T} />
      </Svg>
    </View>
  );
}

/* ---------------------------------------------------------------------------------------- */
/* Speech bubbles and sound waves                                                           */
/* ---------------------------------------------------------------------------------------- */

function Bubble({ kind, x, y, T }: { kind: Pose['bubble']; x: number; y: number; T: number }) {
  if (!kind) return null;
  if (kind === 'waves') {
    // sound waves coming towards the ear on the right side of the head
    const cx = x + 44;
    const cy = y + 62;
    return (
      <G fill="none" stroke="#4F46E5" strokeWidth={3} strokeLinecap="round">
        {[0, 1, 2].map((i) => (
          <Path
            key={i}
            d={`M${cx + i * 9} ${cy - 8 - i * 4} Q${cx + 8 + i * 9} ${cy} ${cx + i * 9} ${cy + 8 + i * 4}`}
            opacity={0.25 + 0.75 * Math.abs(Math.sin(T * 5 - i * 0.9))}
          />
        ))}
      </G>
    );
  }
  const bx = x + 44;
  return (
    <G>
      <Ellipse cx={bx} cy={y} rx={26} ry={15} fill="#fff" stroke="#C7D2FE" strokeWidth={2} />
      <Circle cx={bx - 26} cy={y + 17} r={3.5} fill="#fff" stroke="#C7D2FE" strokeWidth={1.5} />
      {kind === 'dots' ? (
        [0, 1, 2].map((i) => (
          <Circle key={i} cx={bx - 11 + i * 11} cy={y} r={3.5} fill="#4F46E5" opacity={0.3 + 0.7 * Math.abs(Math.sin(T * 5 - i * 0.8))} />
        ))
      ) : (
        <SvgText x={bx} y={y + 7} fontSize={20} fontWeight="bold" fill="#4F46E5" textAnchor="middle">
          ?
        </SvgText>
      )}
    </G>
  );
}

/* ---------------------------------------------------------------------------------------- */
/* Full-body character (local origin = centre of the feet, y grows downwards)                */
/* ---------------------------------------------------------------------------------------- */

const OUTFIT = {
  dog: { fur: '#D9A066', paw: '#F3DDBB', top: '#D62828', bottom: '#D9A066', shoe: '#F3DDBB' },
  cat: { fur: '#F2A65A', paw: '#FFE3C2', top: '#2E8B57', bottom: '#F2A65A', shoe: '#FFE3C2' },
  human: { fur: '#F6C9A0', paw: '#F6C9A0', top: '#2B59A8', bottom: '#2B2D42', shoe: '#6B4423' },
} as const;

function Character({ kind, p }: { kind: CharacterId; p: Pose }) {
  const c = OUTFIT[kind];
  const face = { open: p.open, eyeRy: p.blink ? 0.15 : 1, lookX: p.lookX, lookY: p.lookY, hat: true };

  return (
    <G>
      {/* tail (behind the body) */}
      {kind === 'dog' && (
        <G transform={`translate(8 -84) rotate(${p.tail})`}>
          <Path d="M0 0 Q26 -4 34 -34" stroke={c.fur} strokeWidth={12} fill="none" strokeLinecap="round" />
        </G>
      )}
      {kind === 'cat' && (
        <G transform={`translate(8 -84) rotate(${p.tail})`}>
          <Path d="M0 0 Q50 10 48 -30 Q46 -60 62 -66" stroke={c.fur} strokeWidth={11} fill="none" strokeLinecap="round" />
        </G>
      )}

      {/* legs */}
      <Leg side={-1} angle={p.legL} color={c.bottom} shoe={c.shoe} />
      <Leg side={1} angle={p.legR} color={c.bottom} shoe={c.shoe} />

      {/* body */}
      <Rect x={-30} y={-142} width={60} height={70} rx={18} fill={c.top} />
      {kind === 'dog' && (
        <>
          <Rect x={-30} y={-82} width={60} height={10} fill="#fff" />
          <Circle cx={-12} cy={-112} r={3} fill="#fff" />
          <Circle cx={8} cy={-102} r={3} fill="#fff" />
          <Circle cx={-2} cy={-92} r={3} fill="#fff" />
        </>
      )}
      {kind === 'cat' && (
        <>
          <Rect x={-34} y={-148} width={68} height={16} rx={8} fill="#C62828" />
          <Rect x={14} y={-140} width={14} height={36} rx={6} fill="#C62828" />
          <Rect x={14} y={-124} width={14} height={4} fill="#fff" />
          <Rect x={14} y={-112} width={14} height={4} fill="#fff" />
          <Circle cx={0} cy={-130} r={5} fill="#FFD93D" />
        </>
      )}
      {kind === 'human' && (
        <>
          <Rect x={-34} y={-148} width={68} height={16} rx={8} fill="#fff" />
          <Rect x={-2} y={-132} width={4} height={58} fill="#1E4380" />
          {[-120, -102, -84].map((y) => (
            <Circle key={y} cx={0} cy={y} r={3} fill="#fff" />
          ))}
        </>
      )}

      {/* head */}
      <G transform={`translate(0 -135) rotate(${p.tilt}) scale(0.6) translate(-100 -170)`}>
        {kind === 'dog' && <DogFace {...face} />}
        {kind === 'cat' && <CatFace {...face} />}
        {kind === 'human' && <HumanFace {...face} />}
      </G>

      {/* arms (drawn last so a raised hand can sit in front of the head) */}
      <Arm side={-1} angle={p.armL} sleeve={c.top} hand={c.paw} />
      <Arm side={1} angle={p.armR} sleeve={c.top} hand={c.paw} />
    </G>
  );
}

function Leg({ side, angle, color, shoe }: { side: -1 | 1; angle: number; color: string; shoe: string }) {
  return (
    <G transform={`translate(${side * 15} -76) rotate(${angle})`}>
      <Line x1={0} y1={0} x2={0} y2={60} stroke={color} strokeWidth={17} strokeLinecap="round" />
      <Ellipse cx={side * 3} cy={66} rx={14} ry={7} fill={shoe} />
    </G>
  );
}

function Arm({ side, angle, sleeve, hand }: { side: -1 | 1; angle: number; sleeve: string; hand: string }) {
  return (
    <G transform={`translate(${side * 31} -128) rotate(${side < 0 ? angle : -angle})`}>
      <Line x1={0} y1={0} x2={0} y2={42} stroke={sleeve} strokeWidth={17} strokeLinecap="round" />
      <Circle cx={0} cy={50} r={9.5} fill={hand} />
    </G>
  );
}

/* ---------------------------------------------------------------------------------------- */
/* Christmas living room                                                                    */
/* ---------------------------------------------------------------------------------------- */

const LIGHT_COLORS = ['#FF4D4D', '#FFD93D', '#4DABF7', '#69DB7C', '#FF8FD8'];

const quad = (a: number[], b: number[], c: number[], t: number) => [
  (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * b[0] + t * t * c[0],
  (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * b[1] + t * t * c[1],
];

const star = (cx: number, cy: number, ro: number, ri: number) =>
  Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? ro : ri;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');

const GARLAND_1 = [[0, 6], [100, 44], [200, 16]];
const GARLAND_2 = [[200, 16], [300, 44], [400, 6]];
const ORNAMENTS: [number, number, string][] = [
  [40, 110, '#FF4D4D'],
  [68, 104, '#FFD93D'],
  [32, 150, '#4DABF7'],
  [58, 142, '#FF4D4D'],
  [82, 148, '#FFD93D'],
  [24, 186, '#FFD93D'],
  [52, 178, '#4DABF7'],
  [80, 184, '#FF4D4D'],
];

const Background = React.memo(function Background({ ph }: { ph: number }) {
  const tw = (i: number) => 0.45 + 0.55 * Math.abs(Math.sin(ph * 0.35 + i * 1.9));
  const flame = (i: number) => 22 + 9 * Math.sin(ph * 0.9 + i * 2.1) + 4 * Math.sin(ph * 1.7 + i);
  const garlandLights = [GARLAND_1, GARLAND_2].flatMap((seg, s) =>
    [0.12, 0.3, 0.5, 0.7, 0.88].map((t, i) => {
      const [x, y] = quad(seg[0], seg[1], seg[2], t);
      return { x, y: y + 5, i: s * 5 + i };
    }),
  );

  return (
    <G>
      {/* wall and floor */}
      <Rect x={0} y={0} width={400} height={196} fill="#EBD9BC" />
      {Array.from({ length: 21 }, (_, i) => (
        <Line key={i} x1={i * 20} y1={0} x2={i * 20} y2={190} stroke="#E0CBA8" strokeWidth={2} />
      ))}
      <Rect x={0} y={190} width={400} height={70} fill="#A9703F" />
      {[205, 218, 232, 246].map((y) => (
        <Line key={y} x1={0} y1={y} x2={400} y2={y} stroke="#8E5A2E" strokeWidth={1} />
      ))}
      <Rect x={0} y={188} width={400} height={8} fill="#6B4423" />

      {/* window with falling snow */}
      <Rect x={153} y={48} width={94} height={94} rx={3} fill="#F4F1EA" />
      <Rect x={159} y={54} width={82} height={82} fill="#16233F" />
      <Circle cx={223} cy={72} r={8} fill="#FFF8D6" />
      {[[168, 66], [182, 78], [208, 62], [232, 96], [172, 100]].map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r={1.2} fill="#fff" opacity={tw(i)} />
      ))}
      <Path d="M159 130 Q200 112 241 130 L241 136 L159 136 Z" fill="#EAF2FF" />
      <Polygon points="176,128 168,128 172,112" fill="#1E5A3A" />
      <Polygon points="176,128 184,128 180,108 172,112" fill="#1E5A3A" />
      <Polygon points="226,128 218,128 222,110" fill="#1E5A3A" />
      <Polygon points="226,128 236,128 231,106 222,110" fill="#1E5A3A" />
      {Array.from({ length: 16 }, (_, i) => {
        const x = 163 + ((i * 37) % 74) + Math.sin(ph * 0.2 + i) * 3;
        const y = 56 + ((ph * 1.4 + i * 17) % 76);
        return <Circle key={i} cx={x} cy={y} r={1.6 + (i % 3) * 0.5} fill="#fff" />;
      })}
      <Line x1={200} y1={54} x2={200} y2={136} stroke="#F4F1EA" strokeWidth={4} />
      <Line x1={159} y1={95} x2={241} y2={95} stroke="#F4F1EA" strokeWidth={4} />
      <Rect x={147} y={140} width={106} height={7} rx={2} fill="#D9CDB8" />
      {/* curtains */}
      <Line x1={128} y1={44} x2={272} y2={44} stroke="#C9A227" strokeWidth={4} strokeLinecap="round" />
      <Path d="M134 46 L158 46 L158 150 Q146 162 134 150 Z" fill="#B71C1C" />
      <Path d="M266 46 L242 46 L242 150 Q254 162 266 150 Z" fill="#B71C1C" />
      <Circle cx={128} cy={44} r={4} fill="#C9A227" />
      <Circle cx={272} cy={44} r={4} fill="#C9A227" />

      {/* garland with blinking lights */}
      <Path d="M0 6 Q100 44 200 16 Q300 44 400 6" stroke="#1E7A3C" strokeWidth={9} fill="none" strokeLinecap="round" />
      {garlandLights.map((l) => (
        <Circle key={l.i} cx={l.x} cy={l.y} r={4} fill={LIGHT_COLORS[l.i % 5]} opacity={tw(l.i)} />
      ))}
      <Circle cx={200} cy={20} r={7} fill="#C62828" />
      <Circle cx={200} cy={20} r={3} fill="#FFD93D" />

      {/* Christmas tree */}
      <Rect x={50} y={196} width={10} height={16} fill="#6B4423" />
      <Polygon points="55,118 8,200 102,200" fill="#1E7A3C" />
      <Polygon points="55,86 16,158 94,158" fill="#2B9348" />
      <Polygon points="55,58 26,118 84,118" fill="#37A855" />
      <Polygon points={star(55, 52, 10, 4.5)} fill="#FFD93D" opacity={0.7 + 0.3 * Math.sin(ph * 0.4)} />
      {ORNAMENTS.map(([x, y, col], i) => (
        <G key={i}>
          <Circle cx={x} cy={y} r={5.5} fill={col} />
          <Circle cx={x - 1.5} cy={y - 1.5} r={1.5} fill="#fff" opacity={0.7} />
        </G>
      ))}
      {[[46, 76], [63, 94], [40, 128], [72, 126], [18, 172], [44, 196], [90, 190]].map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r={3} fill={LIGHT_COLORS[i % 5]} opacity={tw(i + 3)} />
      ))}
      {/* presents */}
      <Rect x={66} y={200} width={26} height={20} rx={3} fill="#C62828" />
      <Rect x={77} y={200} width={4} height={20} fill="#FFD93D" />
      <Rect x={66} y={208} width={26} height={4} fill="#FFD93D" />
      <Rect x={94} y={206} width={20} height={14} rx={2} fill="#1971C2" />
      <Rect x={102} y={206} width={4} height={14} fill="#fff" />

      {/* fireplace */}
      <Rect x={303} y={92} width={84} height={108} fill="#A64B3C" />
      {[108, 124, 140, 156, 172, 188].map((y, i) => (
        <Line key={y} x1={303} y1={y} x2={387} y2={y} stroke="#7A3328" strokeWidth={2} opacity={i % 2 ? 1 : 0.8} />
      ))}
      <Rect x={321} y={140} width={48} height={60} rx={6} fill="#1A0F0B" />
      <Rect x={327} y={188} width={36} height={8} rx={3} fill="#5A3A22" />
      {[-10, 0, 10].map((o, i) => {
        const hh = flame(i);
        const cx = 345 + o;
        return (
          <G key={i}>
            <Path d={`M${cx - 9} 192 Q${cx - 13} ${192 - hh} ${cx - 2} ${192 - hh - 8} Q${cx + 3} ${192 - hh / 2} ${cx + 9} 192 Z`} fill="#FF8A00" />
            <Path d={`M${cx - 5} 192 Q${cx - 7} ${192 - hh / 1.6} ${cx} ${192 - hh / 1.3} Q${cx + 4} ${192 - hh / 2.2} ${cx + 5} 192 Z`} fill="#FFD93D" />
          </G>
        );
      })}
      <Rect x={295} y={84} width={100} height={12} rx={3} fill="#6B4423" />
      {[[312, '#C62828'], [342, '#2E8B57'], [372, '#C62828']].map(([x, col], i) => (
        <G key={i}>
          <Path d={`M${x} 96 h12 v24 q0 10 -10 10 h-6 q-6 0 -6 -8 q0 -6 6 -6 h4 z`} fill={col as string} />
          <Rect x={Number(x) - 1} y={96} width={14} height={6} fill="#fff" />
        </G>
      ))}
      {/* wreath */}
      <Circle cx={345} cy={52} r={17} stroke="#1E7A3C" strokeWidth={9} fill="none" />
      {[[333, 44], [356, 46], [345, 36], [338, 62]].map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r={2.5} fill="#E03131" />
      ))}
      <Polygon points="345,66 335,76 340,66" fill="#C62828" />
      <Polygon points="345,66 355,76 350,66" fill="#C62828" />
      <Circle cx={345} cy={66} r={3.5} fill="#C62828" />

      {/* rug */}
      <Ellipse cx={200} cy={243} rx={140} ry={16} fill="#B71C1C" />
      <Ellipse cx={200} cy={243} rx={122} ry={12} fill="none" stroke="#fff" strokeWidth={2} opacity={0.5} />
    </G>
  );
});
