import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BACK, ST } from '../world';
import { Ball, Box, Bulb, Caps, Cone, Cyl, LIGHT_COLORS, Tor, useShared, V3 } from './parts';

/**
 * The house: bedroom, Christmas tree, bookshelf, fireplace, armchair, window, dining table and kitchen,
 * side by side along the back wall. The camera follows the character through it.
 */

/* ---------------------------------------------------------------------------------------- */
/* Shell                                                                                    */
/* ---------------------------------------------------------------------------------------- */

function Shell() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[46, 16]} />
        <meshStandardMaterial color="#A56D3D" roughness={0.65} />
      </mesh>
      {Array.from({ length: 16 }, (_, i) => (
        <Box key={i} w={46} h={0.004} d={0.014} p={[0, 0.003, -3.2 + i * 0.5]} c="#7d4f27" rough={1} />
      ))}

      <mesh position={[0, 3, BACK]}>
        <planeGeometry args={[46, 6]} />
        <meshStandardMaterial color="#EAD8B8" roughness={0.95} />
      </mesh>
      {Array.from({ length: 46 }, (_, i) => (
        <Box key={i} w={0.04} h={5} d={0.01} p={[-22.5 + i, 3.1, BACK + 0.006]} c="#DCC7A2" rough={1} />
      ))}
      <Box w={46} h={1.0} d={0.08} p={[0, 0.5, BACK + 0.04]} c="#7A4A2A" rough={0.7} />
      <Box w={46} h={0.08} d={0.12} p={[0, 1.02, BACK + 0.05]} c="#5B3720" rough={0.6} />
      <Box w={46} h={0.14} d={0.1} p={[0, 0.07, BACK + 0.05]} c="#5B3720" rough={0.6} />
      <Box w={46} h={0.1} d={0.1} p={[0, 5.9, BACK + 0.05]} c="#F4EBDD" rough={0.7} />

      <mesh position={[-11, 3, -0.2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[6.5, 6]} />
        <meshStandardMaterial color="#E4D0AE" roughness={0.95} />
      </mesh>
      <mesh position={[11, 3, -0.2]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[6.5, 6]} />
        <meshStandardMaterial color="#E4D0AE" roughness={0.95} />
      </mesh>
    </group>
  );
}

/* ---------------------------------------------------------------------------------------- */
/* Window with falling snow                                                                 */
/* ---------------------------------------------------------------------------------------- */

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

function WindowFrame({ x, y = 2.0 }: { x: number; y?: number }) {
  return (
    <group position={[x, y, BACK + 0.04]}>
      <Box w={1.75} h={1.95} d={0.1} c="#F4F1EA" />
      <mesh position={[0, 0, 0.056]}>
        <planeGeometry args={[1.5, 1.72]} />
        <meshStandardMaterial color="#0a1530" emissive="#13224a" emissiveIntensity={0.9} />
      </mesh>
      <Ball rad={0.12} p={[0.42, 0.52, 0.06]} c="#FFF8D6" emissive="#FFF3B0" ei={1.4} />
      {[[-0.5, 0.55], [-0.2, 0.7], [0.1, 0.3], [-0.45, 0.1], [0.5, 0.05], [0.25, 0.75]].map(([px, py], i) => (
        <Ball key={i} rad={0.012} p={[px, py, 0.06]} c="#fff" emissive="#fff" ei={1} />
      ))}
      <Ball rad={1} p={[0, -0.88, 0.06]} s={[0.85, 0.2, 0.05]} c="#EAF2FF" emissive="#9DB6E0" ei={0.35} />
      {[[-0.45, -0.66, 0.32], [0.42, -0.62, 0.38]].map(([px, py, h], i) => (
        <Cone key={i} rad={0.1} h={h} p={[px, py + h / 2 - 0.1, 0.065]} c="#1E5A3A" />
      ))}
      <Snow />
      <Box w={0.05} h={1.72} d={0.04} p={[0, 0, 0.075]} c="#F4F1EA" />
      <Box w={1.5} h={0.05} d={0.04} p={[0, 0.05, 0.075]} c="#F4F1EA" />
      <Box w={1.95} h={0.08} d={0.22} p={[0, -1.0, 0.08]} c="#E3D8C3" />
      {[-1, 1].map((sd) => (
        <group key={sd} position={[sd * 1.12, 0.12, 0.12]}>
          <Box w={0.46} h={2.4} d={0.12} c="#A31621" rough={0.95} />
          {[-0.12, 0.04, 0.2].map((fx, i) => (
            <Box key={i} w={0.05} h={2.4} d={0.14} p={[fx, 0, 0.01]} c="#7d0f18" rough={0.95} />
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
  const curve = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 10; i++) pts.push(new THREE.Vector3(-11 + i * 2.2, i % 2 === 0 ? 3.6 : 3.05, BACK + 0.1));
    return new THREE.CatmullRomCurve3(pts);
  }, []);
  const bulbs = useMemo(() => Array.from({ length: 44 }, (_, i) => curve.getPoint((i + 0.5) / 44)), [curve]);
  return (
    <group>
      <mesh>
        <tubeGeometry args={[curve, 160, 0.065, 8, false]} />
        <meshStandardMaterial color="#1E7A3C" roughness={0.9} />
      </mesh>
      {bulbs.map((b, i) => (
        <Bulb key={i} p={[b.x, b.y - 0.1, b.z + 0.06]} c={LIGHT_COLORS[i % 5]} seed={i} />
      ))}
    </group>
  );
}

/* ---------------------------------------------------------------------------------------- */
/* Christmas tree: the lights only come on when the character hangs them up                 */
/* ---------------------------------------------------------------------------------------- */

function Tree() {
  const light = useRef<THREE.PointLight>(null);
  const shared = useShared();
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
    tiers.forEach((t) => {
      for (let i = 0; i < 8; i++) {
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
  const bulbCount = items.out.filter((o) => o.kind === 'bulb').length;
  let bi = 0;

  useFrame(() => {
    if (light.current) light.current.intensity = 0.2 + 2.6 * shared.current.frame.world.treeLit;
  });

  return (
    <group position={[ST.tree.x, 0, ST.tree.z]}>
      <Cyl rad={0.1} h={0.45} p={[0, 0.22, 0]} c="#6B4423" />
      {items.tiers.map((t, i) => (
        <Cone key={i} rad={t.r} h={t.h} p={[0, t.y, 0]} c={['#1E7A3C', '#238A43', '#2B9348', '#37A855'][i]} rough={0.9} />
      ))}
      <Ball rad={0.1} p={[0, 2.8, 0]} c="#FFD93D" emissive="#FFC400" ei={1.6} rough={0.3} />
      {items.out.map((o, i) => {
        if (o.kind === 'ball') return <Ball key={i} rad={0.065} p={o.p} c={o.c} rough={0.25} />;
        bi++;
        return <Bulb key={i} p={o.p} c={LIGHT_COLORS[i % 5]} seed={i + 4} rad={0.035} litAt={bi / bulbCount} />;
      })}
      <pointLight ref={light} position={[0, 1.6, 1.2]} intensity={0.2} color="#ffd9a0" distance={6} decay={1.6} />
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

/* ---------------------------------------------------------------------------------------- */
/* Fireplace, firewood basket                                                               */
/* ---------------------------------------------------------------------------------------- */

function Fireplace() {
  const flames = useRef<(THREE.Object3D | null)[]>([]);
  const light = useRef<THREE.PointLight>(null);
  const shared = useShared();
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const fire = shared.current.frame.world.fire;
    const size = 0.25 + fire * 0.6;
    flames.current.forEach((f, i) => {
      if (!f) return;
      f.scale.y = size * (0.85 + 0.3 * Math.sin(t * 9 + i * 2.1) + 0.12 * Math.sin(t * 17 + i));
      f.scale.x = size * (0.9 + 0.12 * Math.sin(t * 7 + i));
      f.scale.z = size;
    });
    if (light.current) light.current.intensity = 1.2 + fire * 4 + Math.sin(t * 11) * 0.8 + Math.sin(t * 23) * 0.4;
  });
  return (
    <group position={[ST.fire.x, 0, ST.fire.z]}>
      <Box w={1.7} h={1.5} d={0.6} p={[0, 0.75, 0]} c="#A64B3C" rough={0.95} />
      {[0.25, 0.5, 0.75, 1.0, 1.25].map((y) => (
        <Box key={y} w={1.7} h={0.025} d={0.02} p={[0, y, 0.305]} c="#7A3328" rough={1} />
      ))}
      <Box w={0.85} h={0.8} d={0.05} p={[0, 0.45, 0.31]} c="#120a07" rough={1} />
      <Cyl rad={0.06} h={0.7} p={[0, 0.1, 0.27]} r={[0, 0, Math.PI / 2]} c="#4a2e18" />
      <Cyl rad={0.05} h={0.6} p={[0, 0.16, 0.2]} r={[0, 0, Math.PI / 2]} c="#5a3a22" />
      {[-0.17, 0, 0.17].map((x, i) => (
        <group
          key={i}
          ref={(o) => {
            flames.current[i] = o;
          }}
          position={[x, 0.16, 0.27]}
        >
          <Cone rad={0.11} h={0.42} p={[0, 0.2, 0]} c="#FF8A00" emissive="#FF6A00" ei={1.8} />
          <Cone rad={0.06} h={0.25} p={[0, 0.14, 0.02]} c="#FFD93D" emissive="#FFD93D" ei={1.8} />
        </group>
      ))}
      <pointLight ref={light} position={[0, 0.55, 0.8]} color="#ff8a3d" intensity={5} distance={7} decay={1.6} />
      <Box w={2.1} h={0.12} d={0.85} p={[0, 1.56, 0.12]} c="#6B4423" rough={0.6} />
      {[[-0.6, '#C62828'], [0, '#2E8B57'], [0.6, '#C62828']].map(([x, col], i) => (
        <group key={i} position={[x as number, 1.5, 0.52]}>
          <Box w={0.13} h={0.34} d={0.05} p={[0, -0.18, 0]} c={col as string} />
          <Box w={0.2} h={0.14} d={0.05} p={[0.04, -0.37, 0]} c={col as string} />
          <Box w={0.16} h={0.07} d={0.06} p={[0, -0.02, 0]} c="#ffffff" />
        </group>
      ))}
      {/* candles and a little tree on the mantel */}
      {[-0.85, 0.85].map((x) => (
        <group key={x} position={[x, 1.62, 0.2]}>
          <Cyl rad={0.035} h={0.2} p={[0, 0.1, 0]} c="#F4EFE0" />
          <Ball rad={0.02} p={[0, 0.23, 0]} c="#FFD93D" emissive="#FFB000" ei={2} />
        </group>
      ))}
      <Cone rad={0.12} h={0.3} p={[0.4, 1.77, 0.2]} c="#1E7A3C" />
      <Cone rad={0.09} h={0.25} p={[0.4, 1.92, 0.2]} c="#2B9348" />
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

function LogBasket() {
  return (
    <group position={[ST.logs.x, 0, ST.logs.z]}>
      <Cyl rad={0.3} h={0.38} p={[0, 0.19, 0]} c="#A0753A" rough={1} seg={20} />
      <Cyl rad={0.27} h={0.04} p={[0, 0.37, 0]} c="#3b2412" rough={1} seg={20} />
      {[[-0.1, 0.1, 0.45], [0.12, -0.05, -0.4], [0, 0.0, 0.1]].map(([x, z, rz], i) => (
        <Cyl key={i} rad={0.065} h={0.55} p={[x, 0.55, z]} r={[0.2 * (i - 1), 0, rz]} c="#6b4423" rough={1} />
      ))}
    </group>
  );
}

/* ---------------------------------------------------------------------------------------- */
/* Living room: bookshelf, clock, pictures, armchair, lamp                                  */
/* ---------------------------------------------------------------------------------------- */

function Bookshelf() {
  const books = useMemo(() => {
    let seed = 3;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const cols = ['#8e2c2c', '#2c5d8e', '#2e7d4f', '#c9a227', '#6b3b8e', '#d9d2c0', '#c46a2a'];
    const out: { x: number; y: number; w: number; h: number; c: string }[] = [];
    for (let row = 0; row < 4; row++) {
      let x = -0.55;
      while (x < 0.5) {
        const w = 0.05 + rnd() * 0.06;
        const h = 0.28 + rnd() * 0.12;
        out.push({ x: x + w / 2, y: 0.25 + row * 0.5 + h / 2, w, h, c: cols[Math.floor(rnd() * cols.length)] });
        x += w + 0.008;
      }
    }
    return out;
  }, []);
  return (
    <group position={[-2.4, 0, BACK + 0.2]}>
      <Box w={1.3} h={2.1} d={0.34} p={[0, 1.05, 0]} c="#5B3720" rough={0.7} />
      <Box w={1.18} h={1.96} d={0.3} p={[0, 1.05, 0.04]} c="#2a1a10" rough={1} />
      {[0, 1, 2, 3, 4].map((i) => (
        <Box key={i} w={1.2} h={0.04} d={0.32} p={[0, 0.2 + i * 0.5, 0.04]} c="#7a4a2a" rough={0.7} />
      ))}
      {books.map((b, i) => (
        <Box key={i} w={b.w} h={b.h} d={0.22} p={[b.x, b.y, 0.06]} c={b.c} rough={0.8} />
      ))}
      <Ball rad={0.1} p={[0.45, 2.2, 0]} c="#2c5d8e" rough={0.4} />
    </group>
  );
}

function WallClock() {
  const minute = useRef<THREE.Object3D>(null);
  const hour = useRef<THREE.Object3D>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (minute.current) minute.current.rotation.z = -t * 0.25;
    if (hour.current) hour.current.rotation.z = -t * 0.02 + 1;
  });
  return (
    <group position={[-2.4, 2.75, BACK + 0.05]}>
      <Cyl rad={0.27} h={0.06} r={[Math.PI / 2, 0, 0]} c="#5B3720" />
      <Cyl rad={0.23} h={0.07} r={[Math.PI / 2, 0, 0]} p={[0, 0, 0.005]} c="#F6F0E0" />
      {Array.from({ length: 12 }, (_, i) => (
        <Box key={i} w={0.015} h={0.04} d={0.01} p={[Math.sin((i * Math.PI) / 6) * 0.19, Math.cos((i * Math.PI) / 6) * 0.19, 0.045]} r={[0, 0, -(i * Math.PI) / 6]} c="#222" />
      ))}
      <group ref={minute} position={[0, 0, 0.05]}>
        <Box w={0.012} h={0.17} d={0.01} p={[0, 0.08, 0]} c="#222" />
      </group>
      <group ref={hour} position={[0, 0, 0.055]}>
        <Box w={0.02} h={0.11} d={0.01} p={[0, 0.05, 0]} c="#222" />
      </group>
    </group>
  );
}

function Picture({ x, y = 2.3, w = 0.9, h = 0.65 }: { x: number; y?: number; w?: number; h?: number }) {
  return (
    <group position={[x, y, BACK + 0.04]}>
      <Box w={w + 0.1} h={h + 0.1} d={0.05} c="#5B3720" rough={0.5} />
      <Box w={w} h={h} d={0.02} p={[0, 0, 0.03]} c="#1c2c52" emissive="#0e1a38" ei={0.4} />
      <Ball rad={1} p={[0, -h * 0.35, 0.045]} s={[w * 0.5, h * 0.22, 0.02]} c="#EAF2FF" />
      <Cone rad={0.07} h={0.18} p={[-w * 0.2, -h * 0.12, 0.045]} c="#1E5A3A" />
      <Cone rad={0.09} h={0.24} p={[w * 0.18, -h * 0.1, 0.045]} c="#1E5A3A" />
      <Ball rad={0.05} p={[w * 0.3, h * 0.28, 0.045]} c="#FFF8D6" emissive="#FFF3B0" ei={1} />
    </group>
  );
}

function Armchair() {
  const fabric = '#7a1f2b';
  return (
    <group position={[ST.chair.x, 0, ST.chair.z]} rotation={[0, -0.25, 0]}>
      <Box w={0.95} h={0.14} d={0.92} p={[0, 0.12, 0]} c="#5a1520" rough={0.9} />
      <Box w={0.84} h={0.16} d={0.8} p={[0, 0.22, 0.02]} c={fabric} rough={0.95} />
      <Caps rad={0.13} len={0.62} p={[0, 0.98, -0.43]} r={[0, 0, Math.PI / 2]} c={fabric} rough={0.95} />
      <Box w={0.84} h={0.6} d={0.2} p={[0, 0.58, -0.43]} c={fabric} rough={0.95} />
      {[-1, 1].map((sd) => (
        <group key={sd}>
          <Caps rad={0.1} len={0.62} p={[sd * 0.5, 0.5, 0]} r={[Math.PI / 2, 0, 0]} c={fabric} rough={0.95} />
          <Box w={0.18} h={0.4} d={0.7} p={[sd * 0.5, 0.28, 0]} c="#6a1a25" rough={0.95} />
        </group>
      ))}
      {[[-0.4, -0.38], [0.4, -0.38], [-0.4, 0.38], [0.4, 0.38]].map(([x, z], i) => (
        <Cyl key={i} rad={0.04} h={0.08} p={[x, 0.04, z]} c="#2a1a10" />
      ))}
      <Ball rad={1} p={[0.28, 0.5, -0.2]} r={[0, 0.4, 0.3]} s={[0.16, 0.16, 0.06]} c="#D8B24A" rough={0.9} />
    </group>
  );
}

function SideTable() {
  return (
    <group position={[3.4, 0, -1.4]}>
      <Cyl rad={0.3} h={0.04} p={[0, 0.55, 0]} c="#7a4a2a" rough={0.5} />
      <Cyl rad={0.04} h={0.55} p={[0, 0.27, 0]} c="#5B3720" />
      <Cyl rad={0.2} h={0.03} p={[0, 0.015, 0]} c="#5B3720" />
      <Cyl rad={0.055} h={0.1} p={[-0.08, 0.62, 0.05]} c="#F4EFE0" />
      <Tor rad={0.03} tube={0.01} p={[-0.03, 0.62, 0.05]} c="#F4EFE0" />
      <Box w={0.2} h={0.04} d={0.27} p={[0.1, 0.59, -0.05]} r={[0, 0.3, 0]} c="#2c5d8e" />
    </group>
  );
}

function FloorLamp() {
  const light = useRef<THREE.PointLight>(null);
  return (
    <group position={[1.25, 0, -2.7]}>
      <Cyl rad={0.14} h={0.03} p={[0, 0.015, 0]} c="#2a2a2a" />
      <Cyl rad={0.015} h={1.4} p={[0, 0.7, 0]} c="#2a2a2a" />
      <Cyl rad={0.13} rad2={0.2} h={0.3} p={[0, 1.5, 0]} c="#FFE9B0" emissive="#FFD27A" ei={1.1} rough={0.9} />
      <pointLight ref={light} position={[0, 1.4, 0.2]} intensity={1.6} color="#ffd9a0" distance={5} decay={1.7} />
    </group>
  );
}

/* ---------------------------------------------------------------------------------------- */
/* Bedroom                                                                                  */
/* ---------------------------------------------------------------------------------------- */

function Bed() {
  return (
    <group position={[ST.bed.x, 0, ST.bed.z]}>
      <Box w={2.3} h={0.3} d={1.5} p={[0, 0.15, 0]} c="#6B4423" rough={0.7} />
      <Box w={2.2} h={0.25} d={1.4} p={[0, 0.425, 0]} c="#EDE6D6" rough={0.95} />
      <Box w={0.1} h={1.1} d={1.6} p={[-1.2, 0.65, 0]} c="#5B3720" rough={0.7} />
      <Box w={0.08} h={0.55} d={1.55} p={[1.17, 0.4, 0]} c="#5B3720" rough={0.7} />
      <Ball rad={1} p={[-0.88, 0.64, 0]} s={[0.3, 0.11, 0.42]} c="#ffffff" rough={0.95} />
      {/* blanket over the lower body */}
      <Box w={1.35} h={0.4} d={1.46} p={[0.38, 0.72, 0]} c="#B71C1C" rough={0.95} />
      {[-0.2, 0.15, 0.5, 0.85].map((x) => (
        <Box key={x} w={0.07} h={0.41} d={1.47} p={[0.38 + x - 0.3, 0.72, 0]} c="#F4EFE0" rough={0.95} />
      ))}
      {/* nightstand with lamp */}
      <group position={[-1.5, 0, -0.4]}>
        <Box w={0.5} h={0.55} d={0.45} p={[0, 0.275, 0]} c="#7A4A2A" rough={0.7} />
        <Box w={0.44} h={0.02} d={0.02} p={[0, 0.4, 0.23]} c="#3b2412" />
        <Cyl rad={0.03} h={0.2} p={[0, 0.65, 0]} c="#C9A227" />
        <Cyl rad={0.08} rad2={0.14} h={0.18} p={[0, 0.82, 0]} c="#FFE9B0" emissive="#FFC878" ei={1.0} rough={0.9} />
        <pointLight position={[0, 0.9, 0.2]} intensity={0.9} color="#ffcf8a" distance={4} decay={1.8} />
      </group>
    </group>
  );
}

/* ---------------------------------------------------------------------------------------- */
/* Dining area                                                                              */
/* ---------------------------------------------------------------------------------------- */

function Dining() {
  const food = useRef<THREE.Object3D>(null);
  const shared = useShared();
  useFrame(() => {
    const f = Math.max(0.001, shared.current.frame.world.food);
    if (food.current) food.current.scale.setScalar(f);
  });
  return (
    <group>
      {/* table */}
      <group position={[ST.table.x, 0, ST.table.z]}>
        <Box w={1.7} h={0.06} d={0.95} p={[0, 0.76, 0]} c="#8a5a2e" rough={0.5} />
        <Box w={0.5} h={0.008} d={0.95} p={[0, 0.795, 0]} c="#B71C1C" rough={1} />
        {[[-0.78, -0.4], [0.78, -0.4], [-0.78, 0.4], [0.78, 0.4]].map(([x, z], i) => (
          <Cyl key={i} rad={0.045} h={0.74} p={[x, 0.37, z]} c="#5B3720" />
        ))}
        {/* plate and food in front of the diner (the diner sits at the far side, z = -0.75 here) */}
        <Cyl rad={0.17} h={0.02} p={[0, 0.81, -0.28]} c="#ffffff" rough={0.3} />
        <group ref={food} position={[0, 0.83, -0.28]}>
          <Ball rad={0.08} p={[0, 0.03, 0]} s={[1.3, 0.7, 1]} c="#C27A3A" rough={0.8} />
          <Ball rad={0.04} p={[0.09, 0.03, 0.04]} c="#6BBF59" />
          <Ball rad={0.04} p={[-0.09, 0.03, 0.03]} c="#E03131" />
        </group>
        {/* roast on a serving dish */}
        <Cyl rad={0.26} h={0.025} p={[0.45, 0.81, 0.1]} c="#F4F1EA" rough={0.3} />
        <Ball rad={0.15} p={[0.45, 0.93, 0.1]} s={[1.2, 0.85, 0.9]} c="#B8702F" rough={0.7} />
        <Ball rad={0.045} p={[0.62, 0.93, 0.0]} c="#E9C28C" />
        <Ball rad={0.045} p={[0.62, 0.93, 0.2]} c="#E9C28C" />
        {/* cake with candles */}
        <Cyl rad={0.2} h={0.13} p={[-0.45, 0.88, 0.1]} c="#F6E3C4" />
        <Cyl rad={0.2} h={0.03} p={[-0.45, 0.955, 0.1]} c="#B71C1C" />
        {[-0.07, 0.07].map((x) => (
          <group key={x} position={[-0.45 + x, 0.97, 0.1]}>
            <Cyl rad={0.012} h={0.1} p={[0, 0.05, 0]} c="#ffffff" />
            <Ball rad={0.013} p={[0, 0.11, 0]} c="#FFD93D" emissive="#FFB000" ei={2} />
          </group>
        ))}
        {/* glasses and apples */}
        {[0.28, -0.28].map((x) => (
          <Cyl key={x} rad={0.035} rad2={0.03} h={0.12} p={[x, 0.85, -0.3]} c="#cfe8ff" opacity={0.5} rough={0.1} />
        ))}
        <Ball rad={0.05} p={[0.05, 0.84, 0.28]} c="#E03131" />
        <Ball rad={0.05} p={[-0.02, 0.84, 0.32]} c="#6BBF59" />
      </group>
      {/* chair behind the table */}
      <group position={[ST.diningSeat.x, 0, ST.diningSeat.z - 0.05]}>
        <Box w={0.52} h={0.06} d={0.5} p={[0, 0.27, 0.05]} c="#8a5a2e" rough={0.6} />
        <Box w={0.52} h={0.55} d={0.05} p={[0, 0.58, -0.22]} c="#8a5a2e" rough={0.6} />
        {[[-0.22, -0.2], [0.22, -0.2], [-0.22, 0.28], [0.22, 0.28]].map(([x, z], i) => (
          <Cyl key={i} rad={0.025} h={0.27} p={[x, 0.135, z]} c="#5B3720" />
        ))}
      </group>
    </group>
  );
}

/* ---------------------------------------------------------------------------------------- */
/* Kitchen                                                                                  */
/* ---------------------------------------------------------------------------------------- */

function Steam() {
  const puffs = useRef<(THREE.Mesh | null)[]>([]);
  const shared = useShared();
  useFrame(({ clock }) => {
    const on = shared.current.frame.world.steam;
    puffs.current.forEach((m, i) => {
      if (!m) return;
      m.visible = on;
      if (!on) return;
      const k = (clock.elapsedTime * 0.4 + i / 7) % 1;
      m.position.set(Math.sin(clock.elapsedTime * 2 + i) * 0.05, 0.25 + k * 0.7, Math.cos(clock.elapsedTime * 1.7 + i) * 0.04);
      m.scale.setScalar(0.5 + k * 1.3);
      (m.material as THREE.MeshStandardMaterial).opacity = 0.5 * (1 - k);
    });
  });
  return (
    <group>
      {Array.from({ length: 7 }, (_, i) => (
        <mesh
          key={i}
          ref={(o) => {
            puffs.current[i] = o;
          }}
          visible={false}
        >
          <sphereGeometry args={[0.07, 10, 8]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.4} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function Kitchen() {
  const cx = 8.0;
  const z = ST.stove.z;
  return (
    <group>
      {/* counter */}
      <group position={[cx, 0, z]}>
        <Box w={2.4} h={0.9} d={0.7} p={[0, 0.45, 0]} c="#EDE6D6" rough={0.8} />
        <Box w={2.5} h={0.05} d={0.78} p={[0, 0.925, 0]} c="#7a7a7a" rough={0.4} />
        {[-0.7, 0.1, 0.9].map((x) => (
          <Box key={x} w={0.7} h={0.7} d={0.02} p={[x, 0.45, 0.36]} c="#E0D8C4" rough={0.8} />
        ))}
        {/* stove (left part of the counter) */}
        <Box w={0.8} h={0.03} d={0.64} p={[-0.55, 0.96, 0]} c="#1c1c1c" rough={0.4} />
        {[[-0.75, -0.14], [-0.35, -0.14], [-0.75, 0.16], [-0.35, 0.16]].map(([x, zz], i) => (
          <Tor key={i} rad={0.09} tube={0.012} p={[x, 0.98, zz]} r={[Math.PI / 2, 0, 0]} c="#555" />
        ))}
        <Box w={0.7} h={0.45} d={0.02} p={[-0.55, 0.42, 0.36]} c="#1c1c1c" rough={0.4} />
        <Box w={0.5} h={0.2} d={0.02} p={[-0.55, 0.45, 0.371]} c="#3a4a5a" emissive="#ff7a1a" ei={0.15} />
        {/* cooking pot with lid, on the front-left burner */}
        <group position={[-0.75, 0.98, 0.16]}>
          <Cyl rad={0.16} h={0.2} p={[0, 0.1, 0]} c="#b9bfc7" rough={0.3} />
          <Cyl rad={0.165} h={0.02} p={[0, 0.21, 0]} c="#9aa1aa" rough={0.3} />
          <Ball rad={0.025} p={[0, 0.24, 0]} c="#2a2a2a" />
          <Box w={0.12} h={0.025} d={0.03} p={[0.22, 0.14, 0]} c="#2a2a2a" />
          <Box w={0.12} h={0.025} d={0.03} p={[-0.22, 0.14, 0]} c="#2a2a2a" />
          <Steam />
        </group>
        {/* frying pan on the other burner */}
        <group position={[-0.35, 0.98, -0.14]}>
          <Cyl rad={0.14} rad2={0.12} h={0.04} p={[0, 0.02, 0]} c="#222" />
          <Box w={0.22} h={0.02} d={0.04} p={[0.22, 0.04, 0]} c="#222" />
        </group>
        {/* chopping board with vegetables */}
        <Box w={0.5} h={0.03} d={0.32} p={[0.55, 0.96, 0]} c="#C9A064" rough={0.7} />
        <Ball rad={0.06} p={[0.45, 1.03, 0]} c="#E03131" />
        <Ball rad={0.05} p={[0.6, 1.02, 0.06]} c="#6BBF59" />
        <Caps rad={0.025} len={0.14} p={[0.7, 1.0, -0.05]} r={[0, 0, Math.PI / 2]} c="#F08A24" />
        <Cyl rad={0.1} h={0.12} p={[0.95, 1.0, 0.05]} c="#2c5d8e" />
        {/* extractor hood and wall cupboards */}
        <Box w={0.9} h={0.18} d={0.55} p={[-0.55, 1.95, -0.08]} c="#cfd2d6" rough={0.3} />
        <Box w={0.3} h={0.6} d={0.3} p={[-0.55, 2.35, -0.2]} c="#cfd2d6" rough={0.3} />
        <Box w={1.0} h={0.7} d={0.4} p={[0.7, 2.0, -0.15]} c="#EDE6D6" rough={0.8} />
        <Box w={0.46} h={0.62} d={0.02} p={[0.45, 2.0, 0.056]} c="#E0D8C4" rough={0.8} />
        <Box w={0.46} h={0.62} d={0.02} p={[0.95, 2.0, 0.056]} c="#E0D8C4" rough={0.8} />
        {/* hanging utensils */}
        <Box w={0.9} h={0.02} d={0.02} p={[0.6, 1.55, -0.3]} c="#9aa1aa" />
        {[0.3, 0.55, 0.8].map((x, i) => (
          <group key={x} position={[x, 1.55, -0.3]}>
            <Cyl rad={0.008} h={0.28} p={[0, -0.15, 0]} c="#9aa1aa" />
            <Ball rad={1} p={[0, -0.32, 0]} s={[0.04, i === 1 ? 0.03 : 0.05, 0.015]} c="#9aa1aa" />
          </group>
        ))}
      </group>
      {/* fridge */}
      <group position={[9.75, 0, z + 0.05]}>
        <Box w={0.95} h={1.9} d={0.8} p={[0, 0.95, 0]} c="#F4F6F8" rough={0.35} />
        <Box w={0.93} h={0.02} d={0.02} p={[0, 1.25, 0.41]} c="#9aa1aa" />
        <Box w={0.03} h={0.4} d={0.04} p={[0.38, 1.55, 0.43]} c="#9aa1aa" rough={0.3} />
        <Box w={0.03} h={0.5} d={0.04} p={[0.38, 0.85, 0.43]} c="#9aa1aa" rough={0.3} />
        <Box w={0.12} h={0.14} d={0.01} p={[-0.2, 1.6, 0.41]} c="#E03131" />
        <Box w={0.12} h={0.12} d={0.01} p={[0.0, 1.55, 0.41]} c="#FFD93D" />
      </group>
      <pointLight position={[8.0, 2.3, -1.6]} intensity={1.3} color="#fff1d6" distance={5} decay={1.7} />
    </group>
  );
}

/* ---------------------------------------------------------------------------------------- */

function Rugs() {
  return (
    <group>
      <group position={[1.1, 0.012, -0.9]} scale={[1, 1, 0.6]}>
        <Cyl rad={2.4} h={0.02} seg={64} c="#1F6B45" rough={1} />
        <Tor rad={2.1} tube={0.02} p={[0, 0.012, 0]} r={[Math.PI / 2, 0, 0]} c="#f5f5f5" rough={1} />
      </group>
      <group position={[-7.5, 0.012, -1.0]} scale={[1, 1, 0.6]}>
        <Cyl rad={1.3} h={0.02} seg={48} c="#B71C1C" rough={1} />
      </group>
      <Box w={2.2} h={0.015} d={0.7} p={[8.0, 0.01, -1.9]} c="#2c5d8e" rough={1} />
    </group>
  );
}

export default function Room() {
  return (
    <group>
      <Shell />
      <Rugs />
      <Garland />
      <WindowFrame x={-7.7} y={2.3} />
      <WindowFrame x={4.2} />
      <Picture x={-5.7} />
      <Picture x={2.3} />
      <Tree />
      <Bookshelf />
      <WallClock />
      <Fireplace />
      <LogBasket />
      <Armchair />
      <SideTable />
      <FloorLamp />
      <Bed />
      <Dining />
      <Kitchen />
    </group>
  );
}
