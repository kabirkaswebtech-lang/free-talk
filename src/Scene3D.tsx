import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { CharacterId } from './characters';
import { createBehavior, SceneMode } from './behavior';
import { CAM_MAX_X, CAM_MIN_X } from './world';
import Figure from './three/Figure';
import Room from './three/Room';
import { Shared, SharedCtx, useShared } from './three/parts';

/**
 * A real 3D house with a full-body character, rendered with three.js.
 * Works on the web and on phones (through expo-gl). Everything is built from simple shapes,
 * so there are no model files to download. The camera follows the character from room to room.
 */

function CameraRig() {
  const shared = useShared();
  const { camera } = useThree();
  const x = useRef(0);
  useFrame((_, dt) => {
    const target = Math.max(CAM_MIN_X, Math.min(CAM_MAX_X, shared.current.frame.pose.x));
    x.current += (target - x.current) * Math.min(1, dt * 2.2);
    camera.position.set(x.current, 2.15, 7.4);
    camera.lookAt(x.current, 0.45, 0);
  });
  return null;
}

/** `act` and `fov` are only for previews and tests: start with that activity straight away / zoom in. */
export default function Scene3D({ kind, mode, act, fov = 50 }: { kind: CharacterId; mode: SceneMode; act?: string; fov?: number }) {
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const beh = useMemo(() => createBehavior(act), [act]);
  const shared = useRef<Shared>({ frame: beh.update('idle', Date.now()) });

  return (
    <Canvas
      flat
      dpr={[1, 2]}
      camera={{ position: [0, 2.15, 7.4], fov, near: 0.1, far: 80 }}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#2a1a14']} />
      <hemisphereLight args={['#fff3e0', '#7a5230', 1.6]} />
      <directionalLight position={[2.5, 5, 4]} intensity={1.7} color="#fff0dc" />
      <directionalLight position={[-3, 3, -1]} intensity={0.5} color="#9bbcff" />
      <SharedCtx.Provider value={shared}>
        <CameraRig />
        <Room />
        <Figure kind={kind} modeRef={modeRef} beh={beh} />
      </SharedCtx.Provider>
    </Canvas>
  );
}
