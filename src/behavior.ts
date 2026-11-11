/**
 * What the 3D character is doing right now. A plain state machine with no React in it,
 * stepped once per rendered frame. Units are metres and radians.
 *
 * When you talk, type or listen, the character drops everything and reacts to you.
 * Otherwise it lives its life: wanders, cooks, eats, reads in the armchair, adds logs to the fire,
 * decorates the tree, sleeps, waves, jumps and dances.
 */
import { faceTo, ST } from './world';

export type SceneMode = 'idle' | 'speaking' | 'listening' | 'typing' | 'thinking';
export type Held = 'log' | 'spoon' | 'fork' | 'bulb' | 'book' | null;
export type Bubble = 'dots' | 'q' | 'waves' | 'zzz' | null;

export type World = {
  fire: number; // 0 embers .. 1.6 roaring
  treeLit: number; // 0 .. 1 share of the tree lights that are on
  steam: boolean; // pot on the stove
  food: number; // 0 empty plates .. 1 full
};

export type Pose3D = {
  x: number;
  z: number;
  y: number; // body height offset (sitting lowers, lying raises)
  lift: number; // jump height
  rotY: number;
  pitch: number; // rotation about x, used for lying down
  // arms: raise = sideways angle (0 down .. 3.14 up), swing = forward (negative) / back, yaw = towards centre, elbow = bend (negative)
  aR: number; aS: number; aY: number; aE: number;
  bR: number; bS: number; bY: number; bE: number;
  // legs: hip swing and knee bend
  lAh: number; lAk: number; lBh: number; lBk: number;
  hN: number; // head nod
  hT: number; // head tilt
  hY: number; // head turn
  lx: number; // eyes look left/right  (-1..1)
  ly: number; // eyes look down/up
  tail: number;
  scale: number;
  open: number;
  blink: boolean;
  eyesClosed: boolean;
  bubble: Bubble;
  held: Held;
  T: number;
};

export type Frame = { pose: Pose3D; world: World };

const KEYS = ['aR', 'aS', 'aY', 'aE', 'bR', 'bS', 'bY', 'bE', 'lAh', 'lAk', 'lBh', 'lBk', 'hN', 'hT', 'hY', 'lx', 'ly', 'y', 'pitch', 'scale'] as const;
type Tgt = Record<(typeof KEYS)[number], number>;

const base = (): Tgt => ({
  aR: 0.15, aS: 0, aY: 0, aE: -0.12,
  bR: 0.15, bS: 0, bY: 0, bE: -0.12,
  lAh: 0, lAk: 0, lBh: 0, lBk: 0,
  hN: 0, hT: 0, hY: 0, lx: 0, ly: 0, y: 0, pitch: 0, scale: 1,
});

const SIT_Y = -0.22;
const FRONT_Z = 0.35; // where it stands when talking with the user

type PoseName =
  | 'stand' | 'crossed' | 'wave' | 'jump' | 'dance'
  | 'sitIdle' | 'read' | 'eat' | 'stir' | 'taste'
  | 'pickup' | 'throw' | 'warm' | 'hang' | 'lie' | 'stretch';

type Out = { t: Tgt; lift: number; open: number; tail: number };

const sit = (t: Tgt) => {
  t.y = SIT_Y;
  t.lAh = -1.45;
  t.lBh = -1.45;
  t.lAk = 1.5;
  t.lBk = 1.5;
};

/** Target pose for a named pose. ta = seconds since the pose started, dur = how long it lasts. */
function poseFor(name: PoseName, T: number, ta: number, dur: number): Out {
  const t = base();
  let lift = 0;
  let open = 0;
  let tail = Math.sin(T * 3) * 0.25;
  const s = Math.sin;

  switch (name) {
    case 'crossed': // arms folded
      t.aR = 0.1; t.aS = -0.75; t.aY = 1.15; t.aE = -2.0;
      t.bR = 0.1; t.bS = -0.75; t.bY = -1.15; t.bE = -2.0;
      t.hT = 0.06;
      t.hY = s(T * 0.6) * 0.3;
      t.lBh = s(T * 2) * 0.05;
      break;
    case 'wave':
      t.bR = 2.6 + s(T * 11) * 0.35; t.bE = -0.3;
      t.hT = 0.12;
      tail = s(T * 10) * 0.6;
      break;
    case 'jump': {
      const h = Math.max(0, s(ta * 7));
      lift = h * 0.45;
      t.aR = 0.3 + h * 2.4; t.bR = 0.3 + h * 2.4;
      t.lAh = -h * 0.5; t.lBh = -h * 0.5; t.lAk = h * 0.9; t.lBk = h * 0.9;
      tail = s(T * 12) * 0.6;
      break;
    }
    case 'dance': {
      const d = s(T * 6);
      t.aR = 1.6 + d * 1.3; t.bR = 1.6 - d * 1.3; t.aE = -0.3; t.bE = -0.3;
      t.lAh = d * 0.4; t.lBh = -d * 0.4; t.lAk = Math.max(0, -d) * 0.6; t.lBk = Math.max(0, d) * 0.6;
      lift = Math.abs(d) * 0.07;
      t.hT = s(T * 3) * 0.18;
      tail = s(T * 9) * 0.7;
      break;
    }
    case 'sitIdle':
      sit(t);
      t.aR = 0.25; t.aS = -0.5; t.aE = -1.1;
      t.bR = 0.25; t.bS = -0.5; t.bE = -1.1;
      t.hY = s(T * 0.7) * 0.35;
      break;
    case 'read':
      sit(t);
      t.aS = -0.9; t.aE = -1.5; t.aY = 0.5; t.aR = 0.15;
      t.bS = -0.9; t.bE = -1.5; t.bY = -0.5; t.bR = 0.15;
      t.hN = 0.28 + s(T * 0.8) * 0.03;
      t.ly = -0.8;
      break;
    case 'eat': {
      sit(t);
      const ph = (s(T * 3.2) + 1) / 2; // fork goes to the mouth and back
      t.aR = 0.3; t.aS = -0.8; t.aE = -1.2;
      t.bR = 0.3; t.bS = -0.9 - ph * 0.5; t.bE = -1.6 - ph * 0.8; t.bY = -ph * 0.55;
      t.hN = 0.12 + ph * 0.08;
      t.ly = -0.5;
      open = ph > 0.8 ? 0.45 : 0;
      break;
    }
    case 'stir': {
      t.aR = 0.5; t.aS = -0.3; t.aE = -1.7;
      t.bR = 0.5; t.bS = -0.7 + s(T * 5) * 0.18; t.bE = -1.5; t.bY = -0.5 + Math.cos(T * 5) * 0.22;
      t.hN = 0.2;
      t.ly = -0.6;
      break;
    }
    case 'taste':
      t.aR = 0.5; t.aS = -0.3; t.aE = -1.7;
      t.bR = 0.3; t.bS = -1.2; t.bE = -2.2; t.bY = -0.5;
      t.hN = 0.08;
      open = ta % 1 < 0.4 ? 0.35 : 0;
      break;
    case 'pickup': // squat down and grab
      t.y = -0.2;
      t.lAh = -0.9; t.lBh = -0.9; t.lAk = 1.5; t.lBk = 1.5;
      t.aS = -1.0; t.aE = -0.3; t.bS = -1.0; t.bE = -0.3;
      t.hN = 0.3;
      break;
    case 'throw': {
      const k = Math.min(1, ta / Math.max(0.01, dur));
      if (k < 0.45) {
        t.bR = 0.5; t.bS = 0.6; t.bE = -0.6; // wind up
        t.aS = -0.4; t.aE = -0.5;
      } else {
        t.bR = 0.5; t.bS = -1.5; t.bE = -0.15; // swing through
        t.aS = -0.4; t.aE = -0.5;
      }
      t.hY = 0;
      break;
    }
    case 'warm':
      t.aR = 0.35; t.aS = -1.25; t.aE = -0.5;
      t.bR = 0.35; t.bS = -1.25; t.bE = -0.5;
      t.hN = 0.05;
      t.lBh = s(T * 2) * 0.04;
      break;
    case 'hang': // reaching up to the tree
      t.aR = 2.6 + s(T * 3) * 0.2; t.aE = -0.5;
      t.bR = 2.6 - s(T * 3) * 0.2; t.bE = -0.5;
      t.hN = -0.25;
      t.ly = 0.8;
      t.lAh = s(T * 3) * 0.05;
      break;
    case 'lie':
      t.pitch = -Math.PI / 2;
      t.y = 0.74;
      t.aR = 0.18; t.bR = 0.18;
      open = 0.08 + 0.07 * Math.max(0, s(T * 1.3)); // gentle snoring
      break;
    case 'stretch':
      t.aR = 3.0; t.bR = 3.0; t.aE = -0.1; t.bE = -0.1;
      t.hN = -0.2;
      open = 0.5;
      break;
    default: // stand
      t.aR = 0.15 + s(T * 2) * 0.03; t.bR = 0.15 + s(T * 2 + 1) * 0.03;
      t.hT = s(T * 0.9) * 0.05;
      t.hY = s(T * 0.5) * 0.4;
      lift = s(T * 2) * 0.01;
  }
  return { t, lift, open, tail };
}

/* ---------------------------------------------------------------------------------------- */
/* Activities                                                                               */
/* ---------------------------------------------------------------------------------------- */

type Ctx = { S: State; world: World };
type Step =
  | { k: 'go'; x: number; z: number; face?: number }
  | { k: 'do'; pose: PoseName; dur: number; held?: Held; bubble?: Bubble; steam?: boolean; fx?: (c: Ctx, ta: number, dur: number) => void; end?: (c: Ctx) => void }
  | { k: 'sit'; x: number; z: number; face: number }
  | { k: 'stand'; x: number; z: number }
  | { k: 'lie' }
  | { k: 'rise'; x: number; z: number };

type State = {
  x: number; z: number; faceYaw: number;
  seated: boolean; lying: boolean; held: Held;
  cooked: boolean; last: string;
  queue: Step[]; step: { def: Step; t0: number; init: boolean } | null;
  nextAt: number; walkPh: number; tick: number;
};

const go = (p: { x: number; z: number }, faceAt?: { x: number; z: number }): Step => ({
  k: 'go', x: p.x, z: p.z, face: faceAt ? faceTo(p.x, p.z, faceAt.x, faceAt.z) : undefined,
});

type Act = { id: string; w: (c: Ctx) => number; build: (c: Ctx) => Step[] };

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

const ACTS: Act[] = [
  {
    id: 'wander',
    w: () => 0.22,
    build: () => {
      const zone = [-7, -4.5, -1.5, 1, 3.4, 6, 8][Math.floor(Math.random() * 7)];
      return [{ k: 'go', x: zone + rnd(-0.8, 0.8), z: rnd(-0.7, 0.35) }, { k: 'do', pose: 'crossed', dur: rnd(2, 4) }];
    },
  },
  {
    id: 'logs',
    w: (c) => (c.world.fire < 0.5 ? 0.3 : 0.08),
    build: () => [
      go(ST.logSpot, ST.logs),
      { k: 'do', pose: 'pickup', dur: 1.4, held: 'log' },
      go(ST.fireSpot, ST.fire),
      {
        k: 'do', pose: 'throw', dur: 1.1,
        fx: (c, ta, dur) => {
          if (ta > dur * 0.5 && c.S.held === 'log') {
            c.S.held = null;
            c.world.fire = Math.min(1.6, c.world.fire + 0.9); // the fire flares up
          }
        },
      },
      { k: 'do', pose: 'warm', dur: 4 },
    ],
  },
  {
    id: 'cook',
    w: () => 0.13,
    build: () => {
      const face = Math.PI - 0.55; // three-quarter view of the stove
      const spot = { k: 'go', x: ST.cookSpot.x, z: ST.cookSpot.z, face } as Step;
      return [
        spot,
        { k: 'do', pose: 'stir', dur: 7, held: 'spoon', steam: true },
        { k: 'do', pose: 'taste', dur: 2.6, held: 'spoon', steam: true },
        { k: 'do', pose: 'stir', dur: 3, held: 'spoon', steam: true },
        {
          k: 'do', pose: 'stand', dur: 0.4, held: null, steam: false,
          end: (c) => {
            c.world.food = 1; // dinner is served
            c.S.cooked = true;
          },
        },
      ];
    },
  },
  {
    id: 'eat',
    w: (c) => (c.S.cooked ? 0.35 : 0.04),
    build: () => [
      { k: 'go', x: ST.diningStart.x, z: ST.diningStart.z },
      { k: 'go', x: ST.diningSide.x, z: ST.diningSide.z },
      { k: 'sit', x: ST.diningSeat.x, z: ST.diningSeat.z, face: 0 },
      {
        k: 'do', pose: 'eat', dur: 12, held: 'fork',
        fx: (c, ta, dur) => {
          c.world.food = Math.max(0.15, 1 - (ta / dur) * 0.85);
        },
      },
      { k: 'stand', x: ST.diningSide.x, z: ST.diningSide.z + 0.3 },
      {
        k: 'do', pose: 'stand', dur: 0.4, held: null,
        end: (c) => {
          c.S.cooked = false;
        },
      },
    ],
  },
  {
    id: 'decorate',
    w: (c) => (c.world.treeLit < 0.5 ? 0.18 : 0),
    build: () => [
      go(ST.treeSpot, ST.tree),
      {
        k: 'do', pose: 'hang', dur: 9, held: 'bulb',
        fx: (c, ta, dur) => {
          c.world.treeLit = Math.max(c.world.treeLit, Math.min(1, ta / (dur * 0.9)));
        },
      },
      { k: 'do', pose: 'stand', dur: 0.4, held: null },
    ],
  },
  {
    id: 'read',
    w: () => 0.13,
    build: () => [
      go(ST.chairFront),
      { k: 'sit', x: ST.chair.x, z: ST.chair.z, face: -0.25 },
      { k: 'do', pose: 'read', dur: 10, held: 'book' },
      { k: 'do', pose: 'sitIdle', dur: 3.5, held: null },
      { k: 'stand', x: ST.chairFront.x, z: ST.chairFront.z },
    ],
  },
  {
    id: 'sleep',
    w: () => 0.07,
    build: () => [
      go(ST.bedSide, ST.bed),
      { k: 'lie' },
      {
        k: 'do', pose: 'lie', dur: 13, bubble: 'zzz',
        fx: (c) => {
          c.world.treeLit = 0; // lights out for the night
        },
      },
      { k: 'rise', x: ST.bedRise.x, z: ST.bedRise.z },
      { k: 'do', pose: 'stretch', dur: 3 },
    ],
  },
  { id: 'wave', w: () => 0.05, build: () => [{ k: 'do', pose: 'wave', dur: 2.4 }] },
  { id: 'jump', w: () => 0.04, build: () => [{ k: 'do', pose: 'jump', dur: 2 }] },
  { id: 'dance', w: () => 0.05, build: () => [{ k: 'do', pose: 'dance', dur: 3.2 }] },
];

/* ---------------------------------------------------------------------------------------- */

export function createBehavior(start?: string) {
  const world: World = { fire: 0.5, treeLit: 0, steam: false, food: 0 };
  const S: State = {
    x: 0, z: 0.1, faceYaw: 0,
    seated: false, lying: false, held: null,
    cooked: false, last: '',
    queue: [], step: null, nextAt: Date.now() + 1500, walkPh: 0, tick: 0,
  };
  const cur: Tgt = base();
  let curRot = 0;
  let nextMouth = 0;
  let open = 0;
  let nextBlink = Date.now() + 2500;
  let blinkUntil = 0;
  let last = Date.now();
  const ctx: Ctx = { S, world };
  const wrapPi = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

  // For previews and tests: start with a given activity straight away.
  if (start) {
    const a = ACTS.find((x) => x.id === start);
    if (a) {
      S.queue = a.build(ctx);
      S.nextAt = 0;
      const first = S.queue[0];
      if (first && first.k === 'go') {
        S.x = first.x - 0.4; // start right next to the first stop, so previews do not wait for a long walk
        S.z = first.z;
      }
      if (start === 'eat') world.food = 1;
      if (start === 'cook') world.food = 0;
    }
  }

  /** Walks towards a point. Returns true when there. */
  function walkTo(tx: number, tz: number, dt: number, faceDir = true): boolean {
    const dx = tx - S.x;
    const dz = tz - S.z;
    const dist = Math.hypot(dx, dz);
    const step = 0.6 * dt;
    if (dist <= step) {
      S.x = tx;
      S.z = tz;
      return true;
    }
    S.x += (dx / dist) * step;
    S.z += (dz / dist) * step;
    if (faceDir) S.faceYaw = Math.atan2(dx, dz);
    S.walkPh += dt * 9;
    return false;
  }

  function leaveSeat() {
    if (S.seated) {
      S.seated = false;
      S.x += 0;
      S.z += 0.9; // step out of the chair, towards the camera
    }
    if (S.lying) {
      S.lying = false;
      S.x = ST.bedRise.x;
      S.z = ST.bedRise.z;
    }
  }

  function update(m: SceneMode, now: number): Frame {
    const dt = Math.min(start ? 0.5 : 0.1, (now - last) / 1000); // previews render slowly, so let them catch up
    last = now;
    const T = now / 1000;
    S.tick++;

    // the fire slowly burns down
    world.fire = Math.max(0.15, world.fire - dt * 0.012);

    let out: Out;
    let bubble: Bubble = null;
    let walking = false;
    let eyesClosed = false;
    let mouth: number | null = null;

    if (m !== 'idle') {
      // ---- the user is here: drop everything ----
      if (S.step || S.queue.length || S.seated || S.lying || S.held) {
        S.queue = [];
        S.step = null;
        leaveSeat();
        S.held = null;
        world.steam = false;
      }
      S.nextAt = now + 2500;
      if (m === 'speaking') {
        out = poseFor('stand', T, 0, 1);
        const t = out.t;
        t.aR = 0.2 + Math.max(0, Math.sin(T * 4)) * 0.9;
        t.bR = 0.2 + Math.max(0, Math.sin(T * 4 + 2.2)) * 0.9;
        t.aE = -0.6; t.bE = -0.6; t.aS = -0.25; t.bS = -0.25;
        t.hN = Math.sin(T * 5) * 0.06;
        t.hT = Math.sin(T * 2.5) * 0.1;
        out.lift = Math.abs(Math.sin(T * 5)) * 0.02;
        out.tail = Math.sin(T * 9) * 0.5;
        S.faceYaw = 0;
      } else if (m === 'thinking') {
        out = poseFor('stand', T, 0, 1);
        const t = out.t;
        t.bR = 0.4; t.bS = -0.9; t.bE = -2.3; t.bY = -0.7;
        t.hT = -0.2; t.lx = 0.8; t.ly = 0.8;
        bubble = 'q';
        S.faceYaw = 0;
      } else if (Math.abs(S.z - FRONT_Z) > 0.06) {
        walking = !walkTo(S.x, FRONT_Z, dt, false);
        out = poseFor('stand', T, 0, 1);
        S.faceYaw = 0;
      } else if (m === 'listening') {
        out = poseFor('stand', T, 0, 1);
        const t = out.t;
        t.bR = 2.95; t.bE = -1.1; t.bS = -0.1; // hand up to the ear
        t.hT = 0.28; t.lx = 0.6; t.scale = 1.04;
        bubble = 'waves';
        S.faceYaw = 0;
      } else {
        out = poseFor('stand', T, 0, 1);
        const t = out.t;
        t.ly = -1; t.hN = 0.22 + Math.sin(T * 2.2) * 0.04; t.scale = 1.04;
        t.aS = -0.35; t.bS = -0.35; t.aE = -0.5; t.bE = -0.5; t.aR = 0.3; t.bR = 0.3;
        bubble = 'dots';
        S.faceYaw = 0;
      }
    } else {
      // ---- living its own life ----
      if (!S.step) {
        if (S.queue.length) {
          S.step = { def: S.queue.shift()!, t0: now, init: false };
        } else if (now >= S.nextAt) {
          const weights = ACTS.map((a) => a.w(ctx) * (a.id === S.last ? 0.2 : 1));
          let r = Math.random() * weights.reduce((p, c) => p + c, 0);
          let pick = ACTS[0];
          for (let i = 0; i < ACTS.length; i++) {
            r -= weights[i];
            if (r <= 0) {
              pick = ACTS[i];
              break;
            }
          }
          S.last = pick.id;
          S.queue = pick.build(ctx);
          S.nextAt = Infinity;
        } else if (S.nextAt === Infinity) {
          S.nextAt = now + rnd(1500, 4000); // activity finished: short breather
        }
      }

      out = poseFor('crossed', T, 0, 1); // waiting around, arms folded
      const st = S.step;
      if (st) {
        const d = st.def;
        const ta = (now - st.t0) / 1000;
        let done = false;
        if (d.k === 'go') {
          const arrived = walkTo(d.x, d.z, dt);
          walking = !arrived;
          out = poseFor('stand', T, 0, 1);
          if (arrived) {
            if (d.face !== undefined) S.faceYaw = d.face;
            done = true;
          }
        } else if (d.k === 'do') {
          if (!st.init) {
            st.init = true;
            if (d.held !== undefined) S.held = d.held;
            if (d.steam !== undefined) world.steam = d.steam;
          }
          out = poseFor(d.pose, T, ta, d.dur);
          d.fx?.(ctx, ta, d.dur);
          if (d.bubble) bubble = d.bubble;
          if (ta >= d.dur) {
            d.end?.(ctx);
            done = true;
          }
        } else if (d.k === 'sit') {
          S.x = d.x;
          S.z = d.z;
          S.faceYaw = d.face;
          S.seated = true;
          out = poseFor('sitIdle', T, ta, 0.5);
          if (ta > 0.5) done = true;
        } else if (d.k === 'stand') {
          S.seated = false;
          S.x = d.x;
          S.z = d.z;
          done = true;
        } else if (d.k === 'lie') {
          S.lying = true;
          S.x = ST.bedLie.x;
          S.z = ST.bedLie.z;
          S.faceYaw = Math.PI / 2;
          out = poseFor('lie', T, ta, 0.7);
          if (ta > 0.7) done = true;
        } else if (d.k === 'rise') {
          S.lying = false;
          S.x = d.x;
          S.z = d.z;
          S.faceYaw = 0;
          done = true;
        }
        if (done) S.step = null;
      }
      if (S.lying) {
        eyesClosed = true;
        bubble = bubble ?? 'zzz';
      }
    }

    mouth = out.open || null;

    // walking legs
    const t = out.t;
    let lift = out.lift;
    if (walking) {
      const sw = Math.sin(S.walkPh);
      t.lAh = sw * 0.7;
      t.lBh = -sw * 0.7;
      t.lAk = Math.max(0, Math.cos(S.walkPh)) * 0.6;
      t.lBk = Math.max(0, -Math.cos(S.walkPh)) * 0.6;
      t.aS = -sw * 0.6;
      t.bS = sw * 0.6;
      lift = Math.abs(Math.cos(S.walkPh)) * 0.035;
      out.tail = Math.sin(T * 8) * 0.5;
    }

    // ease into the target pose; the body turns the short way round
    const k = Math.min(1, dt * 12);
    for (const key of KEYS) cur[key] += (t[key] - cur[key]) * k;
    curRot += wrapPi(S.faceYaw - curRot) * Math.min(1, dt * 8);

    // mouth and blinking
    if (m === 'speaking') {
      if (now > nextMouth) {
        open = Math.random() < 0.2 ? 0.15 : 0.35 + Math.random() * 0.65;
        nextMouth = now + 130;
      }
    } else open = mouth ?? 0;
    if (now > nextBlink) {
      blinkUntil = now + 140;
      nextBlink = now + 2500 + Math.random() * 2000;
    }

    const pose: Pose3D = {
      x: S.x,
      z: S.z,
      y: cur.y,
      lift,
      rotY: curRot,
      pitch: cur.pitch,
      aR: cur.aR, aS: cur.aS, aY: cur.aY, aE: cur.aE,
      bR: cur.bR, bS: cur.bS, bY: cur.bY, bE: cur.bE,
      lAh: cur.lAh, lAk: cur.lAk, lBh: cur.lBh, lBk: cur.lBk,
      hN: cur.hN, hT: cur.hT, hY: cur.hY, lx: cur.lx, ly: cur.ly,
      tail: out.tail,
      scale: cur.scale,
      open,
      blink: now < blinkUntil,
      eyesClosed,
      bubble,
      held: S.held,
      T,
    };
    return { pose, world };
  }

  return { update, world };
}
