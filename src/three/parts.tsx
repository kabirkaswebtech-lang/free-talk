import React, { createContext, useContext, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Frame } from '../behavior';

export type V3 = [number, number, number];

/** The latest pose and world state, written by the character every frame and read by the room. */
export type Shared = { frame: Frame };
export const SharedCtx = createContext<React.MutableRefObject<Shared> | null>(null);
export const useShared = () => useContext(SharedCtx)!;

export type PartProps = {
  p?: V3;
  r?: V3;
  s?: V3 | number;
  c: string;
  rough?: number;
  emissive?: string;
  ei?: number;
  opacity?: number;
  double?: boolean;
};

export function Mat({ c, rough = 0.75, emissive, ei = 1, opacity, double }: PartProps) {
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

export const Ball = ({ rad = 1, seg = 28, ...m }: PartProps & { rad?: number; seg?: number }) => (
  <mesh position={m.p} rotation={m.r} scale={m.s}>
    <sphereGeometry args={[rad, seg, Math.round(seg * 0.75)]} />
    <Mat {...m} />
  </mesh>
);
export const Caps = ({ rad, len, ...m }: PartProps & { rad: number; len: number }) => (
  <mesh position={m.p} rotation={m.r} scale={m.s}>
    <capsuleGeometry args={[rad, len, 8, 20]} />
    <Mat {...m} />
  </mesh>
);
export const Cone = ({ rad, h, seg = 32, ...m }: PartProps & { rad: number; h: number; seg?: number }) => (
  <mesh position={m.p} rotation={m.r} scale={m.s}>
    <coneGeometry args={[rad, h, seg]} />
    <Mat {...m} />
  </mesh>
);
export const Cyl = ({ rad, h, seg = 24, rad2, ...m }: PartProps & { rad: number; h: number; seg?: number; rad2?: number }) => (
  <mesh position={m.p} rotation={m.r} scale={m.s}>
    <cylinderGeometry args={[rad, rad2 ?? rad, h, seg]} />
    <Mat {...m} />
  </mesh>
);
export const Box = ({ w, h, d, ...m }: PartProps & { w: number; h: number; d: number }) => (
  <mesh position={m.p} rotation={m.r} scale={m.s}>
    <boxGeometry args={[w, h, d]} />
    <Mat {...m} />
  </mesh>
);
export const Tor = ({ rad, tube, arc = Math.PI * 2, ...m }: PartProps & { rad: number; tube: number; arc?: number }) => (
  <mesh position={m.p} rotation={m.r} scale={m.s}>
    <torusGeometry args={[rad, tube, 12, 36, arc]} />
    <Mat {...m} />
  </mesh>
);

export const LIGHT_COLORS = ['#FF4D4D', '#FFD93D', '#4DABF7', '#69DB7C', '#FF8FD8'];

/**
 * A little emissive bulb that twinkles. With `litAt` it belongs to the Christmas tree and only
 * switches on once the character has hung up enough lights (world.treeLit passes that fraction).
 */
export function Bulb({ p, c, seed, rad = 0.045, litAt }: { p: V3; c: string; seed: number; rad?: number; litAt?: number }) {
  const m = useRef<THREE.MeshStandardMaterial>(null);
  const shared = useShared();
  useFrame(({ clock }) => {
    if (!m.current) return;
    const on = litAt === undefined || shared.current.frame.world.treeLit >= litAt;
    m.current.emissiveIntensity = on ? 0.5 + 1.6 * Math.abs(Math.sin(clock.elapsedTime * 1.6 + seed * 1.9)) : 0;
    m.current.color.set(on ? c : '#3a3a3a');
  });
  return (
    <mesh position={p}>
      <sphereGeometry args={[rad, 12, 10]} />
      <meshStandardMaterial ref={m} color={c} emissive={c} emissiveIntensity={1} />
    </mesh>
  );
}
