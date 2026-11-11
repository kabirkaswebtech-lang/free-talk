/**
 * What the 3D character is doing right now. This is a plain state machine with no React in it,
 * so it can be stepped once per rendered frame. Units are metres and radians.
 *
 * Idle: wanders around the room, waves, jumps and dances.
 * Typing: steps up to the camera and watches the text box.
 * Listening: faces you with a hand at its ear.
 * Speaking: gestures while the mouth moves.  Thinking: ponders with a "?".
 */

export type SceneMode = 'idle' | 'speaking' | 'listening' | 'typing' | 'thinking';
type Act = 'stand' | 'walk' | 'wave' | 'jump' | 'dance' | 'talk' | 'listen' | 'watch' | 'think';

export type Pose3D = {
  x: number;
  z: number;
  lift: number; // jump height
  rotY: number; // 0 = facing the camera
  armA: number; // outward raise of the arm on screen-left: 0 hanging, 1.57 sideways, 3.14 straight up
  armB: number; // same for the arm on screen-right
  armAx: number; // swing forward/back (negative = forward)
  armBx: number;
  legA: number;
  legB: number;
  headNod: number; // positive = nodding forward/down
  headTilt: number;
  lookX: number; // -1 .. 1
  lookY: number;
  tail: number;
  scale: number;
  open: number; // mouth 0..1
  blink: boolean;
  bubble: 'dots' | 'q' | 'waves' | null;
  T: number;
};

export const X_RANGE = 0.75;
export const Z_MIN = -0.7;
export const Z_MAX = 0.35;
export const FRONT_Z = 0.35; // where it stands when talking with the user

type Smooth = Pick<
  Pose3D,
  'armA' | 'armB' | 'armAx' | 'armBx' | 'legA' | 'legB' | 'headNod' | 'headTilt' | 'lookX' | 'lookY' | 'scale' | 'rotY'
>;

export function createBehavior() {
  const S = {
    x: 0,
    z: 0.1,
    tx: 0,
    tz: 0.1,
    act: 'stand' as Act,
    actStart: Date.now(),
    actUntil: 0,
    walkPh: 0,
    last: Date.now(),
    open: 0,
    nextMouth: 0,
    nextBlink: Date.now() + 2500,
    blinkUntil: 0,
    cur: { armA: 0.15, armB: 0.15, armAx: 0, armBx: 0, legA: 0, legB: 0, headNod: 0, headTilt: 0, lookX: 0, lookY: 0, scale: 1, rotY: 0 } as Smooth,
  };

  const wrapPi = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

  function update(m: SceneMode, now: number): Pose3D {
    const dt = Math.min(0.1, (now - S.last) / 1000);
    S.last = now;
    const T = now / 1000;

    // ---- decide what to do ----
    let act: Act;
    if (m === 'idle') {
      if (now > S.actUntil) {
        const r = Math.random();
        S.actStart = now;
        if (r < 0.45) {
          S.act = 'walk';
          S.tx = (Math.random() * 2 - 1) * X_RANGE;
          S.tz = Z_MIN + Math.random() * (Z_MAX - Z_MIN);
          S.actUntil = now + 9000;
        } else if (r < 0.6) {
          S.act = 'stand';
          S.actUntil = now + 1800 + Math.random() * 1800;
        } else if (r < 0.72) {
          S.act = 'wave';
          S.actUntil = now + 2400;
        } else if (r < 0.84) {
          S.act = 'jump';
          S.actUntil = now + 2000;
        } else {
          S.act = 'dance';
          S.actUntil = now + 3200;
        }
      }
      act = S.act;
    } else {
      S.actUntil = 0; // idle scheduler restarts afterwards
      if (m === 'speaking') act = 'talk';
      else if (m === 'thinking') act = 'think';
      else if (Math.hypot(S.x, S.z - FRONT_Z) > 0.06) {
        act = 'walk'; // step up to the user first
        S.tx = 0;
        S.tz = FRONT_Z;
      } else act = m === 'listening' ? 'listen' : 'watch';
      if (S.act !== act) {
        S.act = act;
        S.actStart = now;
      }
    }

    // ---- target pose ----
    const ta = (now - S.actStart) / 1000;
    const t: Smooth = { armA: 0.15, armB: 0.15, armAx: 0, armBx: 0, legA: 0, legB: 0, headNod: 0, headTilt: 0, lookX: 0, lookY: 0, scale: 1, rotY: 0 };
    let lift = 0;
    let tail = Math.sin(T * 3) * 0.25;
    let bubble: Pose3D['bubble'] = null;
    let rotYDirect: number | null = null;

    switch (act) {
      case 'walk': {
        const dx = S.tx - S.x;
        const dz = S.tz - S.z;
        const dist = Math.hypot(dx, dz);
        const step = 0.55 * dt;
        if (dist <= step) {
          S.x = S.tx;
          S.z = S.tz;
          if (m === 'idle') S.actUntil = 0;
        } else {
          S.x += (dx / dist) * step;
          S.z += (dz / dist) * step;
          t.rotY = Math.atan2(dx, dz); // face where we are going
          rotYDirect = t.rotY;
        }
        S.walkPh += dt * 9;
        const sw = Math.sin(S.walkPh);
        t.legA = sw * 0.7;
        t.legB = -sw * 0.7;
        t.armAx = -sw * 0.6;
        t.armBx = sw * 0.6;
        t.headTilt = sw * 0.04;
        lift = Math.abs(Math.cos(S.walkPh)) * 0.035;
        tail = Math.sin(T * 8) * 0.5;
        break;
      }
      case 'wave':
        t.armB = 2.6 + Math.sin(T * 11) * 0.35;
        t.headTilt = 0.12;
        tail = Math.sin(T * 10) * 0.6;
        break;
      case 'jump': {
        const h = Math.max(0, Math.sin(ta * 7));
        lift = h * 0.45;
        t.armA = 0.3 + h * 2.4;
        t.armB = 0.3 + h * 2.4;
        t.legA = h * 0.3;
        t.legB = -h * 0.3;
        tail = Math.sin(T * 12) * 0.6;
        break;
      }
      case 'dance': {
        const s6 = Math.sin(T * 6);
        t.armA = 1.6 + s6 * 1.3;
        t.armB = 1.6 - s6 * 1.3;
        t.legA = s6 * 0.4;
        t.legB = -s6 * 0.4;
        lift = Math.abs(s6) * 0.07;
        t.rotY = Math.sin(T * 3) * 0.55; // twist
        t.headTilt = Math.sin(T * 3) * 0.18;
        tail = Math.sin(T * 9) * 0.7;
        break;
      }
      case 'talk':
        t.armA = 0.2 + Math.max(0, Math.sin(T * 4)) * 0.9;
        t.armB = 0.2 + Math.max(0, Math.sin(T * 4 + 2.2)) * 0.9;
        t.armAx = -0.25;
        t.armBx = -0.25;
        t.headNod = Math.sin(T * 5) * 0.06;
        t.headTilt = Math.sin(T * 2.5) * 0.1;
        lift = Math.abs(Math.sin(T * 5)) * 0.02;
        tail = Math.sin(T * 9) * 0.5;
        break;
      case 'listen':
        t.armB = 2.9; // hand up at the ear
        t.armBx = -0.45;
        t.headTilt = 0.28;
        t.lookX = 0.6;
        t.scale = 1.04;
        bubble = 'waves';
        tail = Math.sin(T * 2) * 0.2;
        break;
      case 'watch':
        t.lookY = -1; // eyes down, towards the text box
        t.headNod = 0.22 + Math.sin(T * 2.2) * 0.04;
        t.armA = 0.3;
        t.armB = 0.3;
        t.armAx = -0.35;
        t.armBx = -0.35;
        t.scale = 1.04;
        bubble = 'dots';
        tail = Math.sin(T * 4) * 0.3;
        break;
      case 'think':
        t.armB = 2.15 + Math.sin(T * 3) * 0.05;
        t.armBx = -0.9;
        t.headTilt = -0.2;
        t.lookX = 0.8;
        t.lookY = 0.8;
        bubble = 'q';
        tail = Math.sin(T * 2) * 0.15;
        break;
      default: // stand: breathe and look around a little
        t.armA = 0.15 + Math.sin(T * 2) * 0.03;
        t.armB = 0.15 + Math.sin(T * 2 + 1) * 0.03;
        t.headTilt = Math.sin(T * 0.9) * 0.05;
        t.rotY = Math.sin(T * 0.5) * 0.4;
        lift = Math.sin(T * 2) * 0.01;
    }

    // ease into the target pose; the body turns the short way round
    const k = Math.min(1, dt * 12);
    (Object.keys(t) as (keyof Smooth)[]).forEach((key) => {
      if (key === 'rotY') {
        const target = rotYDirect ?? t.rotY;
        S.cur.rotY += wrapPi(target - S.cur.rotY) * Math.min(1, dt * 8);
      } else {
        S.cur[key] += (t[key] - S.cur[key]) * k;
      }
    });

    // mouth and blinking
    if (m === 'speaking') {
      if (now > S.nextMouth) {
        S.open = Math.random() < 0.2 ? 0.15 : 0.35 + Math.random() * 0.65;
        S.nextMouth = now + 130;
      }
    } else S.open = 0;
    if (now > S.nextBlink) {
      S.blinkUntil = now + 140;
      S.nextBlink = now + 2500 + Math.random() * 2000;
    }

    return {
      x: S.x,
      z: S.z,
      lift,
      rotY: S.cur.rotY,
      armA: S.cur.armA,
      armB: S.cur.armB,
      armAx: S.cur.armAx,
      armBx: S.cur.armBx,
      legA: S.cur.legA,
      legB: S.cur.legB,
      headNod: S.cur.headNod,
      headTilt: S.cur.headTilt,
      lookX: S.cur.lookX,
      lookY: S.cur.lookY,
      tail,
      scale: S.cur.scale,
      open: S.open,
      blink: now < S.blinkUntil,
      bubble,
      T,
    };
  }

  return { update };
}
