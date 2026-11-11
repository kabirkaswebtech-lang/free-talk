import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { CharacterId } from './characters';
import { createBehavior, SceneMode } from './behavior';

/**
 * A real 3D Christmas living room with a full-body character, rendered with three.js.
 * Works on the web and on phones (through expo-gl). All shapes are built from primitives,
 * so there are no model files to download.
 */

type V3 = [number, number, number];
type PartProps = {
  p?: V3;
  r?: V3;
  s?: V3 | number;
  c: string;
  rough?: number;
  emissive?: string;
  ei?: number;
  opacity?: number;
  double?: boolean;
  children?: React.ReactNode;
};

function Mat({ c, rough = 0.75, emissive, ei = 1, opacity, double }: PartProps) {
  return (
    <meshStandardMaterial
      color={c}
      roughness={rough}
      metalness={0}
      emissive={emissive ?? '#000000'}
      emissiveIntensity={emissive ? ei : 0}
      transparent={opacity !== undefined}
      opacity={opacity ?? 1}
      side={double ? THREE.DoubleSide : THREE.FrontSide}
    />
  );
}

const Ball = ({ rad = 1, seg = 28, ...m }: PartProps & { rad?: number; seg?: number }) => (
  <mesh position={m.p} rotation={m.r} scale={m.s}>
    <sphereGeometry args={[rad, seg, Math.round(seg * 0.75)]} />
    <Mat {...m} />
  </mesh>
);
const Caps = ({ rad, len, ...m }: PartProps & { rad: number; len: number }) => (
  <mesh position={m.p} rotation={m.r} scale={m.s}>
    <capsuleGeometry args={[rad, len, 8, 20]} />
    <Mat {...m} />
  </mesh>
);
const Cone = ({ rad, h, seg = 32, ...m }: PartProps & { rad: number; h: number; seg?: number }) => (
  <mesh position={m.p} rotation={m.r} scale={m.s}>
    <coneGeometry args={[rad, h, seg]} />
    <Mat {...m} />
  </mesh>
);
const Cyl = ({ rad, h, seg = 24, ...m }: PartProps & { rad: number; h: number; seg?: number }) => (
  <mesh position={m.p} rotation={m.r} scale={m.s}>
    <cylinderGeometry args={[rad, rad, h, seg]} />
    <Mat {...m} />
  </mesh>
);
const Box = ({ w, h, d, ...m }: PartProps & { w: number; h: number; d: number }) => (
  <mesh position={m.p} rotation={m.r} scale={m.s}>
    <boxGeometry args={[w, h, d]} />
    <Mat {...m} />
  </mesh>
);
const Tor = ({ rad, tube, arc = Math.PI * 2, ...m }: PartProps & { rad: number; tube: number; arc?: number }) => (
  <mesh position={m.p} rotation={m.r} scale={m.s}>
    <torusGeometry args={[rad, tube, 12, 36, arc]} />
    <Mat {...m} />
  </mesh>
);

/* ---------------------------------------------------------------------------------------- */
/* Character                                                                                */
/* ---------------------------------------------------------------------------------------- */

const COL = {
  dog: { fur: '#D9A066', light: '#F6E3C4', ear: '#8B5A2B', top: '#D62828', legs: '#D9A066', shoe: '#F6E3C4', skin: '#D9A066' },
  cat: { fur: '#F2A65A', light: '#FFE8CC', ear: '#F2A65A', top: '#2E8B57', legs: '#F2A65A', shoe: '#FFE8CC', skin: '#F2A65A' },
  human: { fur: '#F6C9A0', light: '#F6C9A0', ear: '#F6C9A0', top: '#2B59A8', legs: '#2B2D42', shoe: '#6B4423', skin: '#F6C9A0' },
} as const;

type Refs = Record<string, THREE.Object3D | null>;

function Figure({ kind, modeRef }: { kind: CharacterId; modeRef: React.MutableRefObject<SceneMode> }) {
  const beh = useMemo(() => createBehavior(), []);
  const R = useRef<Refs>({});
  const ref = (n: string) => (o: THREE.Object3D | null) => {
    R.current[n] = o;
  };
  const c = COL[kind];

  useFrame(() => {
    const P = beh.update(modeRef.current, Date.now());
    const o = R.current;
    const g = <T extends THREE.Object3D = THREE.Object3D>(n: string) => o[n] as T | null;

    g('root')?.position.set(P.x, 0, P.z);
    const lift = g('lift');
    if (lift) {
      lift.position.y = P.lift;
      lift.scale.setScalar(P.scale);
    }
    g('body')?.rotation.set(0, P.rotY, 0);
    g('head')?.rotation.set(P.headNod, 0, P.headTilt);
    g('armA')?.rotation.set(P.armAx, 0, -P.armA);
    g('armB')?.rotation.set(P.armBx, 0, P.armB);
    if (g('legA')) g('legA')!.rotation.x = P.legA;
    if (g('legB')) g('legB')!.rotation.x = P.legB;
    if (g('tail')) g('tail')!.rotation.y = P.tail;

    const sh = g('shadow');
    if (sh) sh.scale.setScalar(1 - P.lift * 0.6);

    // face
    const eyeY = P.blink ? 0.1 : 1;
    if (g('eyeA')) g('eyeA')!.scale.y = eyeY;
    if (g('eyeB')) g('eyeB')!.scale.y = eyeY;
    for (const n of ['pupA', 'pupB']) {
      const e = g(n);
      if (e) e.position.set((n === 'pupA' ? -0.0 : 0) + P.lookX * 0.02, P.lookY * 0.014, e.position.z);
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

    // thought bubble / sound waves
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
    }
    const q = g('bQ');
    if (q) q.position.y = 2.15 + Math.sin(P.T * 3) * 0.04;
  });

  const mouthPos: V3 = kind === 'dog' ? [0, -0.15, 0.34] : kind === 'cat' ? [0, -0.135, 0.3] : [0, -0.14, 0.29];

  return (
    <group ref={ref('root')}>
      {/* soft blob shadow */}
      <mesh ref={ref('shadow')} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <circleGeometry args={[0.5, 32]} />
        <meshBasicMaterial color="#000" transparent opacity={0.28} />
      </mesh>

      <group ref={ref('lift')}>
        <group ref={ref('body')}>
          {/* tail */}
          {kind !== 'human' && (
            <group ref={ref('tail')} position={[0, 0.5, -0.2]}>
              <Caps
                rad={kind === 'dog' ? 0.05 : 0.04}
                len={kind === 'dog' ? 0.3 : 0.5}
                p={[0, 0.18, -0.18]}
                r={[-0.9, 0, 0]}
                c={c.fur}
              />
            </group>
          )}

          {/* legs */}
          {[-1, 1].map((sd) => (
            <group key={sd} ref={ref(sd < 0 ? 'legA' : 'legB')} position={[sd * 0.12, 0.42, 0]}>
              <Caps rad={0.08} len={0.22} p={[0, -0.2, 0]} c={c.legs} />
              <Ball rad={1} p={[0, -0.405, 0.05]} s={[0.1, 0.055, 0.15]} c={c.shoe} />
            </group>
          ))}

          {/* torso */}
          <Caps rad={0.22} len={0.2} p={[0, 0.72, 0]} s={[1, 1, 0.85]} c={c.top} />
          {kind === 'dog' && <Tor rad={0.215} tube={0.03} p={[0, 0.46, 0]} r={[Math.PI / 2, 0, 0]} s={[1, 0.85, 1]} c="#ffffff" />}
          {kind === 'cat' && (
            <>
              <Tor rad={0.2} tube={0.065} p={[0, 1.0, 0]} r={[Math.PI / 2, 0, 0]} c="#C62828" />
              <Box w={0.1} h={0.28} d={0.05} p={[0.1, 0.86, 0.2]} c="#C62828" />
              <Ball rad={0.04} p={[0, 0.97, 0.24]} c="#FFD93D" rough={0.3} />
            </>
          )}
          {kind === 'human' && (
            <>
              <Tor rad={0.2} tube={0.06} p={[0, 1.0, 0]} r={[Math.PI / 2, 0, 0]} c="#ffffff" />
              <Tor rad={0.215} tube={0.025} p={[0, 0.46, 0]} r={[Math.PI / 2, 0, 0]} s={[1, 0.85, 1]} c="#1a1a1a" />
              {[0.84, 0.7, 0.56].map((y) => (
                <Ball key={y} rad={0.018} p={[0, y, 0.19]} c="#ffffff" />
              ))}
            </>
          )}

          {/* arms */}
          {[-1, 1].map((sd) => (
            <group key={sd} ref={ref(sd < 0 ? 'armA' : 'armB')} position={[sd * 0.27, 0.95, 0]}>
              <Caps rad={0.065} len={0.2} p={[0, -0.17, 0]} c={c.top} />
              <Ball rad={0.078} p={[0, -0.37, 0]} c={c.fur} />
            </group>
          ))}

          {/* head */}
          <group ref={ref('head')} position={[0, 1.0, 0]}>
            <group position={[0, 0.3, 0]}>
              <Ball rad={0.33} s={[1, 0.96, 0.99]} c={c.skin} rough={0.6} />

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
                  <Ball rad={1} p={[0, -0.1, 0.25]} s={[0.14, 0.1, 0.11]} c={c.light} />
                  <Ball rad={0.03} p={[0, -0.04, 0.345]} s={[1.3, 0.9, 0.8]} c="#FF8FA3" rough={0.3} />
                  {[-1, 1].map((sd) => (
                    <group key={sd}>
                      <Cone rad={0.11} h={0.26} p={[sd * 0.2, 0.3, 0]} r={[0, 0, -sd * 0.3]} c={c.fur} />
                      <Cone rad={0.07} h={0.18} p={[sd * 0.2 + sd * -0.012, 0.28, 0.035]} r={[0, 0, -sd * 0.3]} c="#FFB6C1" />
                      {[0.02, -0.02, -0.06].map((y, i) => (
                        <Cyl
                          key={i}
                          rad={0.003}
                          h={0.24}
                          p={[sd * 0.27, -0.07 + y, 0.28]}
                          r={[0, 0, Math.PI / 2 + sd * (i - 1) * 0.15]}
                          c="#EDEDED"
                        />
                      ))}
                    </group>
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
                      <Ball rad={0.05} p={[sd * 0.325, -0.03, 0.02]} c={c.skin} />
                      <Ball rad={0.055} p={[sd * 0.2, -0.08, 0.25]} s={[1, 0.6, 0.4]} c="#FF9AA2" opacity={0.4} />
                    </group>
                  ))}
                  <Ball rad={0.035} p={[0, -0.025, 0.33]} c="#E6AE86" />
                </>
              )}

              {/* eyes */}
              {[-1, 1].map((sd) => {
                const ex = sd * (kind === 'human' ? 0.125 : kind === 'cat' ? 0.13 : 0.125);
                const ey = kind === 'dog' ? 0.07 : 0.05;
                const ez = kind === 'dog' ? 0.29 : 0.285;
                return (
                  <group key={sd} ref={ref(sd < 0 ? 'eyeA' : 'eyeB')} position={[ex, ey, ez]}>
                    {kind === 'dog' && (
                      <>
                        <Ball rad={0.05} c="#2B1B12" rough={0.2} />
                        <Ball rad={0.016} p={[0.015, 0.02, 0.04]} c="#fff" rough={0.1} />
                      </>
                    )}
                    {kind === 'cat' && (
                      <>
                        <Ball rad={0.065} s={[1, 1.1, 0.6]} c="#8EDB8A" rough={0.2} />
                        <Ball rad={0.03} p={[0, 0, 0.03]} s={[0.35, 1.3, 0.4]} c="#1a1a1a" rough={0.2} />
                        <Ball rad={0.014} p={[0.018, 0.025, 0.045]} c="#fff" rough={0.1} />
                      </>
                    )}
                    {kind === 'human' && (
                      <>
                        <Ball rad={0.058} s={[1, 0.85, 0.5]} c="#ffffff" rough={0.2} />
                        <group ref={ref(sd < 0 ? 'pupA' : 'pupB')} position={[0, 0, 0.025]}>
                          <Ball rad={0.032} c="#4B3426" rough={0.2} />
                          <Ball rad={0.012} p={[0.012, 0.014, 0.025]} c="#fff" rough={0.1} />
                        </group>
                      </>
                    )}
                  </group>
                );
              })}

              {/* mouth: smile when closed, dark opening when talking */}
              <group position={mouthPos}>
                <group ref={ref('smile')} position={[0, 0.045, 0]}>
                  <Tor rad={0.055} tube={0.009} arc={Math.PI} r={[0, 0, Math.PI]} c={kind === 'human' ? '#B5493F' : '#2B1B12'} rough={0.4} />
                </group>
                <group ref={ref('mouthOpen')} visible={false} scale={[1, 0.01, 1]}>
                  <Ball rad={1} s={[0.07, 1, 0.05]} c="#5A1E1E" rough={0.4} />
                </group>
                <group ref={ref('tongue')} visible={false}>
                  <Ball rad={1} p={[0, -0.03, 0.01]} s={[0.04, 0.02, 0.03]} c="#FF7A8A" />
                </group>
              </group>

              {/* Christmas hats */}
              {kind === 'dog' && (
                <group position={[0, 0.25, -0.01]} rotation={[0, 0, -0.3]}>
                  <Cone rad={0.27} h={0.45} p={[0, 0.2, 0]} c="#D62828" />
                  <Tor rad={0.27} tube={0.055} p={[0, 0, 0]} r={[Math.PI / 2, 0, 0]} c="#ffffff" />
                  <Ball rad={0.075} p={[0, 0.44, 0]} c="#ffffff" />
                </group>
              )}
              {kind === 'human' && (
                <group position={[0, 0.17, -0.01]}>
                  <mesh>
                    <sphereGeometry args={[0.36, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                    <Mat c="#C62828" />
                  </mesh>
                  <Tor rad={0.34} tube={0.042} p={[0, 0.0, 0]} r={[Math.PI / 2, 0, 0]} c="#ffffff" />
                  <Ball rad={0.08} p={[0, 0.38, 0]} c="#ffffff" />
                </group>
              )}
            </group>
          </group>
        </group>
      </group>

      {/* thought bubble / sound waves, always facing the camera */}
      <group position={[0.5, 2.1, 0]}>
        <group ref={ref('bDots')} visible={false}>
          <Ball rad={1} s={[0.26, 0.15, 0.05]} c="#ffffff" />
          {[-1, 0, 1].map((i) => (
            <group key={i} ref={ref(`dot${i + 1}`)} position={[i * 0.1, 0, 0.05]}>
              <Ball rad={0.035} c="#4F46E5" emissive="#4F46E5" ei={0.6} />
            </group>
          ))}
        </group>
        <group ref={ref('bQ')} visible={false} position={[0, 0.05, 0]}>
          <Tor rad={0.07} tube={0.022} arc={Math.PI * 1.5} s={[-1, 1, 1]} p={[0, 0.06, 0]} c="#4F46E5" emissive="#4F46E5" ei={0.5} double />
          <Cyl rad={0.02} h={0.06} p={[0, -0.04, 0]} c="#4F46E5" emissive="#4F46E5" ei={0.5} />
          <Ball rad={0.026} p={[0, -0.12, 0]} c="#4F46E5" emissive="#4F46E5" ei={0.5} />
        </group>
      </group>
      <group ref={ref('bWaves')} visible={false} position={[0.62, 1.35, 0.1]}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} ref={ref(`wave${i}`)} rotation={[0, 0, -Math.PI / 4 - 0.0]}>
            <torusGeometry args={[0.1 + i * 0.07, 0.012, 8, 20, Math.PI / 2]} />
            <meshStandardMaterial color="#4F46E5" emissive="#4F46E5" emissiveIntensity={0.7} transparent opacity={0.6} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* ---------------------------------------------------------------------------------------- */
/* Room                                                                                     */
/* ---------------------------------------------------------------------------------------- */

const LIGHT_COLORS = ['#FF4D4D', '#FFD93D', '#4DABF7', '#69DB7C', '#FF8FD8'];
const BACK = -3.2; // z of the back wall

/** A little emissive bulb that twinkles. */
function Bulb({ p, c, seed, rad = 0.045 }: { p: V3; c: string; seed: number; rad?: number }) {
  const m = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (m.current) m.current.emissiveIntensity = 0.5 + 1.6 * Math.abs(Math.sin(clock.elapsedTime * 1.6 + seed * 1.9));
  });
  return (
    <mesh position={p}>
      <sphereGeometry args={[rad, 12, 10]} />
      <meshStandardMaterial ref={m} color={c} emissive={c} emissiveIntensity={1} />
    </mesh>
  );
}

function Snow() {
  const COUNT = 140;
  const geo = useRef<THREE.BufferGeometry>(null);
  const pos = useMemo(() => {
    const a = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      a[i * 3] = (Math.random() - 0.5) * 1.35;
      a[i * 3 + 1] = (Math.random() - 0.5) * 1.55;
      a[i * 3 + 2] = 0;
    }
    return a;
  }, []);
  useFrame((_, dt) => {
    const g = geo.current;
    if (!g) return;
    const attr = g.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3 + 1] -= dt * (0.12 + (i % 5) * 0.03);
      pos[i * 3] += Math.sin(Date.now() / 900 + i) * dt * 0.02;
      if (pos[i * 3 + 1] < -0.78) pos[i * 3 + 1] = 0.78;
    }
    attr.needsUpdate = true;
  });
  return (
    <points position={[0, 0, 0.07]}>
      <bufferGeometry ref={geo}>
        <bufferAttribute attach="attributes-position" args={[pos, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.035} color="#ffffff" sizeAttenuation />
    </points>
  );
}

function WindowFrame() {
  return (
    <group position={[0, 2.0, BACK + 0.04]}>
      <Box w={1.75} h={1.95} d={0.1} c="#F4F1EA" />
      <mesh position={[0, 0, 0.056]}>
        <planeGeometry args={[1.5, 1.72]} />
        <meshStandardMaterial color="#0a1530" emissive="#13224a" emissiveIntensity={0.9} />
      </mesh>
      <Ball rad={0.12} p={[0.42, 0.52, 0.06]} c="#FFF8D6" emissive="#FFF3B0" ei={1.4} />
      {[[-0.5, 0.55], [-0.2, 0.7], [0.1, 0.3], [-0.45, 0.1], [0.5, 0.05], [0.25, 0.75]].map(([x, y], i) => (
        <Ball key={i} rad={0.012} p={[x, y, 0.06]} c="#fff" emissive="#fff" ei={1} />
      ))}
      <Ball rad={1} p={[0, -0.88, 0.06]} s={[0.85, 0.2, 0.05]} c="#EAF2FF" emissive="#9DB6E0" ei={0.35} />
      {[[-0.45, -0.66, 0.32], [0.42, -0.62, 0.38]].map(([x, y, h], i) => (
        <Cone key={i} rad={0.1} h={h} p={[x, y + h / 2 - 0.1, 0.065]} c="#1E5A3A" />
      ))}
      <Snow />
      <Box w={0.05} h={1.72} d={0.04} p={[0, 0, 0.075]} c="#F4F1EA" />
      <Box w={1.5} h={0.05} d={0.04} p={[0, 0.05, 0.075]} c="#F4F1EA" />
      <Box w={1.95} h={0.08} d={0.22} p={[0, -1.0, 0.08]} c="#E3D8C3" />
      {/* curtains */}
      {[-1, 1].map((sd) => (
        <group key={sd} position={[sd * 1.12, 0.12, 0.12]}>
          <Box w={0.46} h={2.4} d={0.12} c="#A31621" rough={0.95} />
          {[-0.12, 0.04, 0.2].map((x, i) => (
            <Box key={i} w={0.05} h={2.4} d={0.14} p={[x, 0, 0.01]} c="#7d0f18" rough={0.95} />
          ))}
        </group>
      ))}
      <Cyl rad={0.03} h={3.0} p={[0, 1.3, 0.14]} r={[0, 0, Math.PI / 2]} c="#C9A227" rough={0.3} />
      <Ball rad={0.06} p={[-1.5, 1.3, 0.14]} c="#C9A227" rough={0.3} />
      <Ball rad={0.06} p={[1.5, 1.3, 0.14]} c="#C9A227" rough={0.3} />
    </group>
  );
}

function Garland() {
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-5, 3.55, BACK + 0.1),
        new THREE.Vector3(-2.6, 3.0, BACK + 0.1),
        new THREE.Vector3(0, 3.45, BACK + 0.1),
        new THREE.Vector3(2.6, 3.0, BACK + 0.1),
        new THREE.Vector3(5, 3.55, BACK + 0.1),
      ]),
    [],
  );
  const bulbs = useMemo(() => Array.from({ length: 22 }, (_, i) => curve.getPoint((i + 0.5) / 22)), [curve]);
  return (
    <group>
      <mesh>
        <tubeGeometry args={[curve, 80, 0.065, 8, false]} />
        <meshStandardMaterial color="#1E7A3C" roughness={0.9} />
      </mesh>
      {bulbs.map((b, i) => (
        <Bulb key={i} p={[b.x, b.y - 0.1, b.z + 0.06]} c={LIGHT_COLORS[i % 5]} seed={i} />
      ))}
    </group>
  );
}

function Tree() {
  const items = useMemo(() => {
    let seed = 7;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const tiers = [
      { r: 0.88, h: 1.0, y: 0.85 },
      { r: 0.68, h: 0.9, y: 1.45 },
      { r: 0.5, h: 0.8, y: 1.98 },
      { r: 0.3, h: 0.65, y: 2.42 },
    ];
    const out: { p: V3; c: string; kind: 'ball' | 'bulb' }[] = [];
    tiers.forEach((t, ti) => {
      for (let i = 0; i < 7; i++) {
        const f = 0.15 + rnd() * 0.6;
        const a = rnd() * Math.PI * 2;
        const rr = t.r * (1 - f) * 0.96;
        out.push({
          p: [Math.cos(a) * rr, t.y - t.h / 2 + f * t.h, Math.sin(a) * rr],
          c: ['#E03131', '#FFD93D', '#339AF0', '#F783AC'][Math.floor(rnd() * 4)],
          kind: i % 2 === 0 ? 'ball' : 'bulb',
        });
      }
    });
    return { tiers, out };
  }, []);
  return (
    <group position={[-1.75, 0, -2.0]}>
      <Cyl rad={0.1} h={0.45} p={[0, 0.22, 0]} c="#6B4423" />
      {items.tiers.map((t, i) => (
        <Cone key={i} rad={t.r} h={t.h} p={[0, t.y, 0]} c={['#1E7A3C', '#238A43', '#2B9348', '#37A855'][i]} rough={0.9} />
      ))}
      <Ball rad={0.1} p={[0, 2.8, 0]} s={[1, 1, 1]} c="#FFD93D" emissive="#FFC400" ei={1.6} rough={0.3} />
      {items.out.map((o, i) =>
        o.kind === 'ball' ? (
          <Ball key={i} rad={0.065} p={o.p} c={o.c} rough={0.25} />
        ) : (
          <Bulb key={i} p={o.p} c={LIGHT_COLORS[i % 5]} seed={i + 4} rad={0.035} />
        ),
      )}
      {/* presents */}
      <group position={[0.2, 0, 0.9]}>
        <Box w={0.42} h={0.32} d={0.42} p={[0, 0.16, 0]} c="#C62828" />
        <Box w={0.06} h={0.33} d={0.43} p={[0, 0.165, 0]} c="#FFD93D" rough={0.4} />
        <Box w={0.43} h={0.33} d={0.06} p={[0, 0.165, 0]} c="#FFD93D" rough={0.4} />
      </group>
      <group position={[0.75, 0, 0.7]} rotation={[0, 0.4, 0]}>
        <Box w={0.32} h={0.24} d={0.32} p={[0, 0.12, 0]} c="#1971C2" />
        <Box w={0.05} h={0.25} d={0.33} p={[0, 0.125, 0]} c="#ffffff" />
        <Box w={0.33} h={0.25} d={0.05} p={[0, 0.125, 0]} c="#ffffff" />
      </group>
      <group position={[-0.65, 0, 0.9]} rotation={[0, -0.3, 0]}>
        <Box w={0.28} h={0.2} d={0.28} p={[0, 0.1, 0]} c="#2E8B57" />
        <Box w={0.05} h={0.21} d={0.29} p={[0, 0.105, 0]} c="#FFD93D" rough={0.4} />
      </group>
    </group>
  );
}

function Fireplace() {
  const flames = useRef<(THREE.Object3D | null)[]>([]);
  const light = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    flames.current.forEach((f, i) => {
      if (!f) return;
      f.scale.y = 0.85 + 0.3 * Math.sin(t * 9 + i * 2.1) + 0.12 * Math.sin(t * 17 + i);
      f.scale.x = 0.9 + 0.12 * Math.sin(t * 7 + i);
    });
    if (light.current) light.current.intensity = 5 + Math.sin(t * 11) * 1.2 + Math.sin(t * 23) * 0.6;
  });
  return (
    <group position={[1.8, 0, -2.9]}>
      <Box w={1.7} h={1.5} d={0.6} p={[0, 0.75, 0]} c="#A64B3C" rough={0.95} />
      {[0.25, 0.5, 0.75, 1.0, 1.25].map((y) => (
        <Box key={y} w={1.7} h={0.025} d={0.02} p={[0, y, 0.305]} c="#7A3328" rough={1} />
      ))}
      <Box w={0.85} h={0.8} d={0.05} p={[0, 0.45, 0.31]} c="#120a07" rough={1} />
      <Cyl rad={0.06} h={0.7} p={[0, 0.1, 0.27]} r={[0, 0, Math.PI / 2]} c="#4a2e18" />
      {[-0.17, 0, 0.17].map((x, i) => (
        <group key={i} ref={(o) => { flames.current[i] = o; }} position={[x, 0.16, 0.27]}>
          <Cone rad={0.11} h={0.42} p={[0, 0.2, 0]} c="#FF8A00" emissive="#FF6A00" ei={1.8} />
          <Cone rad={0.06} h={0.25} p={[0, 0.14, 0.02]} c="#FFD93D" emissive="#FFD93D" ei={1.8} />
        </group>
      ))}
      <pointLight ref={light} position={[0, 0.55, 0.8]} color="#ff8a3d" intensity={5} distance={7} decay={1.6} />
      {/* mantel + stockings */}
      <Box w={2.1} h={0.12} d={0.85} p={[0, 1.56, 0.12]} c="#6B4423" rough={0.6} />
      {[[-0.6, '#C62828'], [0, '#2E8B57'], [0.6, '#C62828']].map(([x, col], i) => (
        <group key={i} position={[x as number, 1.5, 0.52]}>
          <Box w={0.13} h={0.34} d={0.05} p={[0, -0.18, 0]} c={col as string} />
          <Box w={0.2} h={0.14} d={0.05} p={[0.04, -0.37, 0]} c={col as string} />
          <Box w={0.16} h={0.07} d={0.06} p={[0, -0.02, 0]} c="#ffffff" />
        </group>
      ))}
      {/* wreath */}
      <group position={[0, 2.35, 0.32]}>
        <Tor rad={0.32} tube={0.085} c="#1E7A3C" rough={0.95} />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Ball key={i} rad={0.03} p={[Math.cos(i * 1.05) * 0.32, Math.sin(i * 1.05) * 0.32, 0.07]} c="#E03131" />
        ))}
        <Ball rad={0.06} p={[0, -0.32, 0.08]} c="#C62828" />
        <Box w={0.12} h={0.2} d={0.03} p={[-0.07, -0.43, 0.06]} r={[0, 0, 0.3]} c="#C62828" />
        <Box w={0.12} h={0.2} d={0.03} p={[0.07, -0.43, 0.06]} r={[0, 0, -0.3]} c="#C62828" />
      </group>
    </group>
  );
}

function Room() {
  return (
    <group>
      {/* floor with planks */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[16, 14]} />
        <meshStandardMaterial color="#A56D3D" roughness={0.65} />
      </mesh>
      {Array.from({ length: 22 }, (_, i) => (
        <Box key={i} w={16} h={0.004} d={0.014} p={[0, 0.003, -3.2 + i * 0.5]} c="#7d4f27" rough={1} />
      ))}
      {/* walls */}
      <mesh position={[0, 3, BACK]}>
        <planeGeometry args={[16, 6]} />
        <meshStandardMaterial color="#EAD8B8" roughness={0.95} />
      </mesh>
      {Array.from({ length: 32 }, (_, i) => (
        <Box key={i} w={0.03} h={5} d={0.01} p={[-7.75 + i * 0.5, 3.1, BACK + 0.006]} c="#DCC7A2" rough={1} />
      ))}
      <Box w={16} h={1.0} d={0.08} p={[0, 0.5, BACK + 0.04]} c="#7A4A2A" rough={0.7} />
      <Box w={16} h={0.08} d={0.12} p={[0, 1.02, BACK + 0.05]} c="#5B3720" rough={0.6} />
      <Box w={16} h={0.14} d={0.1} p={[0, 0.07, BACK + 0.05]} c="#5B3720" rough={0.6} />
      <mesh position={[-6, 3, -0.2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[6.5, 6]} />
        <meshStandardMaterial color="#E4D0AE" roughness={0.95} />
      </mesh>
      <mesh position={[6, 3, -0.2]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[6.5, 6]} />
        <meshStandardMaterial color="#E4D0AE" roughness={0.95} />
      </mesh>

      <WindowFrame />
      <Garland />
      <Tree />
      <Fireplace />

      {/* rug */}
      <group position={[0, 0.012, 0.15]} scale={[1, 1, 0.72]}>
        <Cyl rad={1.75} h={0.02} seg={64} c="#B71C1C" rough={1} />
        <Tor rad={1.5} tube={0.02} p={[0, 0.012, 0]} r={[Math.PI / 2, 0, 0]} c="#f5f5f5" rough={1} />
      </group>
    </group>
  );
}

/* ---------------------------------------------------------------------------------------- */
/* Canvas                                                                                   */
/* ---------------------------------------------------------------------------------------- */

export default function Scene3D({ kind, mode }: { kind: CharacterId; mode: SceneMode }) {
  const modeRef = useRef(mode);
  modeRef.current = mode;
  return (
    <Canvas
      flat
      dpr={[1, 2]}
      camera={{ position: [0, 2.15, 7.4], fov: 50, near: 0.1, far: 60 }}
      onCreated={({ camera }) => camera.lookAt(0, 0.45, 0)}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#2a1a14']} />
      <hemisphereLight args={['#fff3e0', '#7a5230', 1.6]} />
      <directionalLight position={[2.5, 5, 4]} intensity={1.7} color="#fff0dc" />
      <directionalLight position={[-3, 3, -1]} intensity={0.5} color="#9bbcff" />
      <pointLight position={[-1.75, 1.6, -1.2]} intensity={2.5} color="#ffd9a0" distance={6} decay={1.6} />
      <Room />
      <Figure kind={kind} modeRef={modeRef} />
    </Canvas>
  );
}
