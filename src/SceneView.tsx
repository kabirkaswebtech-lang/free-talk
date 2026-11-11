import React from 'react';
import { View } from 'react-native';
import Scene from './Scene';
import Scene3D from './Scene3D';
import type { CharacterId } from './characters';
import type { SceneMode } from './behavior';

type Props = { kind: CharacterId; mode: SceneMode };

/**
 * Shows the 3D room. If 3D cannot start on this device (no WebGL / GL error),
 * it quietly falls back to the flat 2D scene so the chat still works.
 */
class Boundary extends React.Component<{ fallback: React.ReactNode; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn('3D scene failed, using 2D fallback:', error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default function SceneView({ kind, mode }: Props) {
  return (
    <Boundary
      fallback={
        <View style={{ flex: 1, backgroundColor: '#2a1a14', justifyContent: 'flex-start' }}>
          <Scene kind={kind} mode={mode} />
        </View>
      }
    >
      <Scene3D kind={kind} mode={mode} />
    </Boundary>
  );
}
