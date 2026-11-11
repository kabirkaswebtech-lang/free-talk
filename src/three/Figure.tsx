import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { CharacterId } from '../characters';
import { createBehavior, SceneMode } from '../behavior';
import { Ball, Box, Caps, Cone, Cyl, Mat, Tor, useShared, V3 } from './parts';

/**
 * One full-body character, built from simple shapes: a big head with big eyes, a soft body,
 * and arms and legs with elbows and knees, so it can walk, sit, lie down and use its hands.
 * Original design in the "cute cartoon" style. Local origin = middle of the feet.
 */

const HIP = 0.52;
const SHOULDER = 1.0;
const NECK = 1.08;

const COL = {
  dog: { fur: '#D9A066', light: '#F6E3C4', ear: '#8B5A2B', top: '#D62828', bottom: '#2F5DA8', legs: '#D9A066', bare: true },
  cat: { fur: '#F2A65A', light: '#FFE8CC', ear: '#F2A65A', top: '#2E8B57', bottom: '#2F5DA8', legs: '#F2A65A', bare: true },
  human: { fur: '#F6C9A0', light: '#F6C9A0', ear: '#F6C9A0', top: '#2B59A8', bottom: '#2B2D42', legs: '#2B2D42', bare: false },
} as const;

type Refs = Record<string, THREE.Object3D | null>;
type RefFn = (n: string) => (o: THREE.Object3D | null) => void;

function Sneaker({ human }: { human: boolean }) {
  const shoe = human ? '#6B4423' : '#ffffff';
  return (
    <group>
      <Ball rad={1} p={[0, -0.045, 0.05]} s={[0.1, 0.062, 0.165]} c={shoe} rough={0.5} />
      <Ball rad={1} p={[0, -0.085, 0.055]} s={[0.106, 0.024, 0.18]} c={human ? '#3b2412' : '#e9e3d1'} rough={0.7} />
      {!human && (
        <>
          <Ball rad={1} p={[0, -0.04, 0.135]} s={[0.088, 0.05, 0.07]} c="#f4f4f4" />
          <Ball rad={1} p={[0.095, -0.04, 0.04]} s={[0.012, 0.03, 0.08]} c="#3DBB5B" />
          <Ball rad={1} p={[-0.095, -0.04, 0.04]} s={[0.012, 0.03, 0.08]} c="#3DBB5B" />
        </>
      )}
    </group>
  );
}

function Leg({ side, kind, rf }: { side: -1 | 1; kind: CharacterId; rf: RefFn }) {
  const c = COL[kind];
  const n = side < 0 ? 'A' : 'B';
  return (
    <group ref={rf(`leg${n}`)} position={[side * 0.12, HIP, 0]}>
      <Caps rad={0.083} len={0.1} p={[0, -0.11, 0]} c={c.legs} />
      {c.bare && <Cyl rad={0.108} h={0.16} p={[0, -0.07, 0]} c={c.bottom} rough={0.9} />}
      <group ref={rf(`knee${n}`)} position={[0, -0.22, 0]}>
        <Caps rad={0.072} len={0.09} p={[0, -0.1, 0]} c={c.legs} />
        <group position={[0, -0.2, 0]}>
          <Sneaker human={kind === 'human'} />
        </group>
      </group>
    </group>
  );
}

function Arm({ side, kind, rf }: { side: -1 | 1; kind: CharacterId; rf: RefFn }) {
  const c = COL[kind];
  const n = side < 0 ? 'A' : 'B';
  return (
    <group ref={rf(`arm${n}`)} position={[side * 0.27, SHOULDER, 0]}>
      <Caps rad={0.062} len={0.13} p={[0, -0.13, 0]} c={c.top} />
      <group ref={rf(`elbow${n}`)} position={[0, -0.26, 0]}>
        <Caps rad={0.056} len={0.12} p={[0, -0.12, 0]} c={c.top} />
        <group position={[0, -0.25, 0]}>
          <Ball rad={0.076} c={c.fur} />
          {side > 0 && (
            <>
              {/* things held in the right hand */}
              <group ref={rf('hLog')} visible={false} position={[0, -0.02, 0.04]} rotation={[0, 0, Math.PI / 2]}>
                <Cyl rad={0.05} h={0.36} c="#6b4423" rough={1} />
                <Cyl rad={0.042} h={0.012} p={[0, 0.18, 0]} c="#c89b6a" />
                <Cyl rad={0.042} h={0.012} p={[0, -0.18, 0]} c="#c89b6a" />
              </group>
              <group ref={rf('hSpoon')} visible={false} position={[0, -0.02, 0.02]}>
                <Cyl rad={0.013} h={0.4} p={[0, -0.12, 0]} c="#b98a52" rough={0.8} />
                <Ball rad={1} p={[0, -0.33, 0]} s={[0.045, 0.025, 0.055]} c="#b98a52" rough={0.8} />
              </group>
              <group ref={rf('hFork')} visible={false} position={[0, -0.02, 0.03]}>
                <Cyl rad={0.01} h={0.2} p={[0, -0.08, 0]} c="#cfd2d6" rough={0.3} />
                {[-0.016, 0, 0.016].map((x) => (
                  <Box key={x} w={0.006} h={0.05} d={0.006} p={[x, -0.2, 0]} c="#cfd2d6" rough={0.3} />
                ))}
              </group>
              <group ref={rf('hBulb')} visible={false} position={[0, -0.04, 0.03]}>
                <Ball rad={0.05} c="#FFD93D" emissive="#FFC400" ei={1.5} />
                <Cyl rad={0.006} h={0.3} p={[0, 0.12, 0]} c="#2a6b3a" />
              </group>
              <group ref={rf('hBook')} visible={false} position={[0, -0.02, 0.1]} rotation={[0.5, 0, 0]}>
                <Box w={0.22} h={0.04} d={0.29} c="#8e2c2c" rough={0.8} />
                <Box w={0.2} h={0.03} d={0.27} p={[0, 0.005, 0]} c="#f6f0e0" />
              </group>
            </>
          )}
        </group>
      </group>
    </group>
  );
}

function ZShape({ name, rf }: { name: string; rf: RefFn }) {
  return (
    <group ref={rf(name)} visible={false}>
      <Box w={0.12} h={0.025} d={0.02} p={[0, 0.07, 0]} c="#ffffff" emissive="#99aabb" ei={0.6} />
      <Box w={0.14} h={0.025} d={0.02} r={[0, 0, -0.78]} c="#ffffff" emissive="#99aabb" ei={0.6} />
      <Box w={0.12} h={0.025} d={0.02} p={[0, -0.07, 0]} c="#ffffff" emissive="#99aabb" ei={0.6} />
    </group>
  );
}

export type Behavior = ReturnType<typeof createBehavior>;

export default function Figure({
  kind,
  modeRef,
  beh,
}: {
  kind: CharacterId;
  modeRef: React.MutableRefObject<SceneMode>;
  beh: Behavior;
}) {
  const shared = useShared();
  const R = useRef<Refs>({});
  const rf: RefFn = (n) => (o) => {
    R.current[n] = o;
  };
  const c = COL[kind];

  useFrame(() => {
    const frame = beh.update(modeRef.current, Date.now());
    shared.current.frame = frame;
    const P = frame.pose;
    const o = R.current;
    const g = (n: string) => o[n] ?? null;

    g('root')?.position.set(P.x, 0, P.z);
    const lift = g('lift');
    if (lift) {
      lift.position.y = P.y + P.lift;
      lift.scale.setScalar(P.scale);
    }
    g('body')?.rotation.set(P.pitch, P.rotY, 0, 'YXZ');
    g('head')?.rotation.set(P.hN, P.hY, P.hT);
    g('armA')?.rotation.set(P.aS, P.aY, -P.aR, 'YXZ');
    g('armB')?.rotation.set(P.bS, P.bY, P.bR, 'YXZ');
    g('elbowA')?.rotation.set(P.aE, 0, 0);
    g('elbowB')?.rotation.set(P.bE, 0, 0);
    g('legA')?.rotation.set(P.lAh, 0, 0);
    g('legB')?.rotation.set(P.lBh, 0, 0);
    g('kneeA')?.rotation.set(P.lAk, 0, 0);
    g('kneeB')?.rotation.set(P.lBk, 0, 0);
    g('tail')?.rotation.set(0, P.tail, 0);

    const sh = g('shadow');
    if (sh) sh.scale.setScalar((1 - P.lift * 0.6) * (P.pitch < -1 ? 0 : 1));

    // face
    const eyeY = P.blink || P.eyesClosed ? 0.1 : 1;
    for (const n of ['eyeA', 'eyeB']) {
      const e = g(n);
      if (e) e.scale.y = eyeY;
    }
    for (const n of ['pupA', 'pupB']) {
      const e = g(n);
      if (e) e.position.set(P.lx * 0.022, P.ly * 0.02, e.position.z);
    }
    const mo = g('mouthOpen');
    if (mo) {
      mo.visible = P.open > 0.05;
      mo.scale.y = 0.01 + P.open * 0.075;
    }
    const tongue = g('tongue');
    if (tongue) tongue.visible = P.open > 0.4;
    const smile = g('smile');
    if (smile) smile.visible = P.open <= 0.05;

    // held items
    const pairs: [string, string][] = [['hLog', 'log'], ['hSpoon', 'spoon'], ['hFork', 'fork'], ['hBulb', 'bulb'], ['hBook', 'book']];
    for (const [n, k] of pairs) {
      const h = g(n);
      if (h) h.visible = P.held === k;
    }

    // thought bubbles, sound waves, Zzz
    const set = (n: string, v: boolean) => {
      const x = g(n);
      if (x) x.visible = v;
    };
    set('bDots', P.bubble === 'dots');
    set('bQ', P.bubble === 'q');
    set('bWaves', P.bubble === 'waves');
    for (let i = 0; i < 3; i++) {
      const d = g(`dot${i}`);
      if (d) d.scale.setScalar(0.6 + 0.6 * Math.abs(Math.sin(P.T * 5 - i * 0.8)));
      const w = g(`wave${i}`) as THREE.Mesh | null;
      if (w) (w.material as THREE.MeshStandardMaterial).opacity = 0.2 + 0.8 * Math.abs(Math.sin(P.T * 5 - i * 0.9));
      const z = g(`z${i}`);
      if (z) {
        z.visible = P.bubble === 'zzz';
        const k = (P.T * 0.35 + i * 0.33) % 1;
        z.position.set(-1.25 + k * 0.25, 1.3 + k * 0.7, 0.1);
        z.scale.setScalar(0.7 + i * 0.3);
      }
    }
    const q = g('bQ');
    if (q) q.position.y = 0.05 + Math.sin(P.T * 3) * 0.04;
  });

  const mouthPos: V3 = kind === 'dog' ? [0, -0.15, 0.34] : kind === 'cat' ? [0, -0.17, 0.34] : [0, -0.14, 0.29];

  return (
    <group ref={rf('root')}>
      <mesh ref={rf('shadow')} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <circleGeometry args={[0.5, 32]} />
        <meshBasicMaterial color="#000" transparent opacity={0.28} />
      </mesh>

      <group ref={rf('lift')}>
        <group ref={rf('body')}>
          {/* tail */}
          {kind !== 'human' && (
            <group ref={rf('tail')} position={[0, 0.55, -0.2]}>
              <Caps rad={kind === 'dog' ? 0.05 : 0.042} len={kind === 'dog' ? 0.3 : 0.45} p={[0, 0.2, -0.2]} r={[-0.9, 0, 0]} c={c.fur} />
              {kind === 'cat' && <Ball rad={0.05} p={[0, 0.5, -0.38]} c="#C8742A" />}
            </group>
          )}

          <Leg side={-1} kind={kind} rf={rf} />
          <Leg side={1} kind={kind} rf={rf} />

          {/* torso */}
          <Caps rad={0.22} len={0.2} p={[0, 0.8, 0]} s={[1, 1, 0.86]} c={c.top} />
          {c.bare && <Ball rad={1} p={[0, 0.55, 0]} s={[0.245, 0.12, 0.215]} c={c.bottom} rough={0.9} />}
          {kind === 'dog' && <Tor rad={0.22} tube={0.03} p={[0, 0.6, 0]} r={[Math.PI / 2, 0, 0]} s={[1, 0.86, 1]} c="#ffffff" />}
          {kind === 'cat' && (
            <>
              <Tor rad={0.2} tube={0.065} p={[0, 1.1, 0]} r={[Math.PI / 2, 0, 0]} c="#C62828" />
              <Box w={0.1} h={0.28} d={0.05} p={[0.1, 0.95, 0.2]} c="#C62828" />
              <Ball rad={0.04} p={[0, 1.06, 0.25]} c="#FFD93D" rough={0.3} />
              {/* snowflake dots on the sweater */}
              {[[-0.1, 0.78], [0.08, 0.7], [0, 0.88]].map(([x, y], i) => (
                <Ball key={i} rad={0.022} p={[x, y, 0.19]} c="#ffffff" />
              ))}
            </>
          )}
          {kind === 'human' && (
            <>
              <Tor rad={0.2} tube={0.06} p={[0, 1.1, 0]} r={[Math.PI / 2, 0, 0]} c="#ffffff" />
              <Tor rad={0.222} tube={0.025} p={[0, 0.58, 0]} r={[Math.PI / 2, 0, 0]} s={[1, 0.86, 1]} c="#1a1a1a" />
              {[0.95, 0.8, 0.66].map((y) => (
                <Ball key={y} rad={0.018} p={[0, y, 0.19]} c="#ffffff" />
              ))}
            </>
          )}

          <Arm side={-1} kind={kind} rf={rf} />
          <Arm side={1} kind={kind} rf={rf} />

          {/* head */}
          <group ref={rf('head')} position={[0, NECK, 0]}>
            <group position={[0, 0.3, 0]}>
              <Ball rad={kind === 'cat' ? 0.36 : 0.33} s={kind === 'cat' ? [1.1, 0.97, 1] : [1, 0.96, 0.99]} c={c.fur} rough={0.6} />

              {kind === 'dog' && (
                <>
                  <Ball rad={1} p={[0, -0.075, 0.28]} s={[0.17, 0.12, 0.15]} c={c.light} />
                  <Ball rad={0.048} p={[0, -0.01, 0.42]} s={[1.2, 0.9, 1]} c="#2B1B12" rough={0.3} />
                  <Ball rad={1} p={[-0.3, 0.02, -0.02]} r={[0, 0, 0.3]} s={[0.075, 0.21, 0.11]} c={c.ear} />
                  <Ball rad={1} p={[0.3, 0.02, -0.02]} r={[0, 0, -0.3]} s={[0.075, 0.21, 0.11]} c={c.ear} />
                </>
              )}
              {kind === 'cat' && (
                <>
                  <Ball rad={1} p={[0, -0.11, 0.27]} s={[0.2, 0.135, 0.13]} c={c.light} />
                  <Ball rad={1} p={[0, -0.045, 0.385]} s={[0.036, 0.027, 0.028]} c="#FF8FA3" rough={0.3} />
                  {[-1, 1].map((sd) => (
                    <group key={sd}>
                      <Cone rad={0.13} h={0.3} p={[sd * 0.25, 0.34, -0.02]} r={[0, 0, -sd * 0.32]} c={c.fur} />
                      <Cone rad={0.085} h={0.21} p={[sd * 0.245, 0.32, 0.03]} r={[0, 0, -sd * 0.32]} c="#FFB6C1" />
                      {[0.02, -0.02, -0.06].map((y, i) => (
                        <Cyl key={i} rad={0.003} h={0.26} p={[sd * 0.3, -0.07 + y, 0.28]} r={[0, 0, Math.PI / 2 + sd * (i - 1) * 0.15]} c="#EDEDED" />
                      ))}
                    </group>
                  ))}
                  {/* forehead stripes */}
                  {[[-0.07, 0.28, 0.12], [0, 0.3, 0], [0.07, 0.28, -0.12]].map(([x, y, rz], i) => (
                    <Ball key={i} rad={1} p={[x, y, 0.31]} r={[0.3, 0, rz]} s={[0.014, 0.06, 0.012]} c="#C8742A" />
                  ))}
                </>
              )}
              {kind === 'human' && (
                <>
                  <Ball rad={0.355} p={[0, 0.02, -0.04]} r={[-0.55, 0, 0]} c="#3B2A20" rough={0.9} />
                  <Ball rad={1} p={[0, 0.17, 0.22]} s={[0.27, 0.1, 0.12]} c="#3B2A20" rough={0.9} />
                  {[-1, 1].map((sd) => (
                    <group key={sd}>
                      <Ball rad={1} p={[sd * 0.3, -0.03, -0.06]} s={[0.075, 0.2, 0.14]} c="#3B2A20" rough={0.9} />
                      <Ball rad={0.05} p={[sd * 0.325, -0.03, 0.02]} c={c.fur} />
                      <Ball rad={0.055} p={[sd * 0.2, -0.08, 0.25]} s={[1, 0.6, 0.4]} c="#FF9AA2" opacity={0.4} />
                    </group>
                  ))}
                  <Ball rad={0.035} p={[0, -0.025, 0.33]} c="#E6AE86" />
                </>
              )}

              {/* big eyes */}
              {[-1, 1].map((sd) => {
                const ex = sd * (kind === 'cat' ? 0.15 : 0.125);
                const ey = kind === 'dog' ? 0.07 : 0.06;
                const ez = kind === 'cat' ? 0.3 : kind === 'dog' ? 0.29 : 0.285;
                return (
                  <group key={sd} ref={rf(sd < 0 ? 'eyeA' : 'eyeB')} position={[ex, ey, ez]}>
                    {kind === 'dog' && (
                      <group ref={rf(sd < 0 ? 'pupA' : 'pupB')}>
                        <Ball rad={0.052} c="#2B1B12" rough={0.2} />
                        <Ball rad={0.017} p={[0.015, 0.02, 0.04]} c="#fff" rough={0.1} />
                      </group>
                    )}
                    {kind === 'cat' && (
                      <>
                        <Ball rad={0.1} s={[1, 1.18, 0.5]} c="#ffffff" rough={0.15} />
                        <group ref={rf(sd < 0 ? 'pupA' : 'pupB')} position={[0, 0, 0.03]}>
                          <Ball rad={0.066} s={[1, 1.1, 0.6]} c="#58C95A" rough={0.2} />
                          <Ball rad={0.034} p={[0, 0, 0.03]} s={[0.8, 1.2, 0.5]} c="#101010" rough={0.2} />
                          <Ball rad={0.016} p={[0.02, 0.028, 0.045]} c="#fff" rough={0.1} />
                        </group>
                      </>
                    )}
                    {kind === 'human' && (
                      <>
                        <Ball rad={0.058} s={[1, 0.85, 0.5]} c="#ffffff" rough={0.2} />
                        <group ref={rf(sd < 0 ? 'pupA' : 'pupB')} position={[0, 0, 0.025]}>
                          <Ball rad={0.032} c="#4B3426" rough={0.2} />
                          <Ball rad={0.012} p={[0.012, 0.014, 0.025]} c="#fff" rough={0.1} />
                        </group>
                      </>
                    )}
                  </group>
                );
              })}

              {/* mouth: smile when closed, dark opening when talking or eating */}
              <group position={mouthPos}>
                <group ref={rf('smile')} position={[0, 0.045, 0]}>
                  <Tor rad={0.058} tube={0.009} arc={Math.PI} r={[0, 0, Math.PI]} c={kind === 'human' ? '#B5493F' : '#2B1B12'} rough={0.4} />
                </group>
                <group ref={rf('mouthOpen')} visible={false} scale={[1, 0.01, 1]}>
                  <Ball rad={1} s={[0.07, 1, 0.05]} c="#5A1E1E" rough={0.4} />
                </group>
                <group ref={rf('tongue')} visible={false}>
                  <Ball rad={1} p={[0, -0.03, 0.01]} s={[0.04, 0.02, 0.03]} c="#FF7A8A" />
                </group>
              </group>

              {/* Christmas hats */}
              {kind === 'dog' && (
                <group position={[0, 0.25, -0.01]} rotation={[0, 0, -0.3]}>
                  <Cone rad={0.27} h={0.45} p={[0, 0.2, 0]} c="#D62828" />
                  <Tor rad={0.27} tube={0.055} r={[Math.PI / 2, 0, 0]} c="#ffffff" />
                  <Ball rad={0.075} p={[0, 0.44, 0]} c="#ffffff" />
                </group>
              )}
              {kind === 'human' && (
                <group position={[0, 0.17, -0.01]}>
                  <mesh>
                    <sphereGeometry args={[0.36, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                    <Mat c="#C62828" />
                  </mesh>
                  <Tor rad={0.34} tube={0.042} r={[Math.PI / 2, 0, 0]} c="#ffffff" />
                  <Ball rad={0.08} p={[0, 0.38, 0]} c="#ffffff" />
                </group>
              )}
            </group>
          </group>
        </group>
      </group>

      {/* thought bubble, sound waves and Zzz, always facing the camera */}
      <group position={[0.5, 2.1, 0]}>
        <group ref={rf('bDots')} visible={false}>
          <Ball rad={1} s={[0.26, 0.15, 0.05]} c="#ffffff" />
          {[-1, 0, 1].map((i) => (
            <group key={i} ref={rf(`dot${i + 1}`)} position={[i * 0.1, 0, 0.05]}>
              <Ball rad={0.035} c="#4F46E5" emissive="#4F46E5" ei={0.6} />
            </group>
          ))}
        </group>
        <group ref={rf('bQ')} visible={false} position={[0, 0.05, 0]}>
          <Tor rad={0.07} tube={0.022} arc={Math.PI * 1.5} s={[-1, 1, 1]} p={[0, 0.06, 0]} c="#4F46E5" emissive="#4F46E5" ei={0.5} double />
          <Cyl rad={0.02} h={0.06} p={[0, -0.04, 0]} c="#4F46E5" emissive="#4F46E5" ei={0.5} />
          <Ball rad={0.026} p={[0, -0.12, 0]} c="#4F46E5" emissive="#4F46E5" ei={0.5} />
        </group>
      </group>
      <group ref={rf('bWaves')} visible={false} position={[0.62, 1.45, 0.1]}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} ref={rf(`wave${i}`)} rotation={[0, 0, -Math.PI / 4]}>
            <torusGeometry args={[0.1 + i * 0.07, 0.012, 8, 20, Math.PI / 2]} />
            <meshStandardMaterial color="#4F46E5" emissive="#4F46E5" emissiveIntensity={0.7} transparent opacity={0.6} />
          </mesh>
        ))}
      </group>
      {[0, 1, 2].map((i) => (
        <ZShape key={i} name={`z${i}`} rf={rf} />
      ))}
    </group>
  );
}
