import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Polygon } from 'react-native-svg';
import type { CharacterId } from './characters';

type Props = {
  kind: CharacterId;
  speaking: boolean;
  thinking?: boolean;
  size?: number;
};

const DARK = '#2B1B12';
const MOUTH_IN = '#5A1E1E';

/**
 * A simple animated talking face. The mouth opens and closes while `speaking` is true and the
 * eyes blink every few seconds. It is drawn with SVG, so it works in Expo Go with no extra assets.
 */
export default function Avatar({ kind, speaking, thinking = false, size = 150 }: Props) {
  const [open, setOpen] = useState(0); // 0 = closed, up to 1 = wide open
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (!speaking) {
      setOpen(0);
      return;
    }
    const id = setInterval(() => setOpen(Math.random() < 0.2 ? 0.15 : 0.35 + Math.random() * 0.65), 140);
    return () => clearInterval(id);
  }, [speaking]);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const id = setInterval(() => {
      setBlink(true);
      t = setTimeout(() => setBlink(false), 140);
    }, 3200);
    return () => {
      clearInterval(id);
      clearTimeout(t);
    };
  }, []);

  const eyeRy = blink ? 1.5 : 1;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 200 200">
        {kind === 'dog' && <Dog open={open} eyeRy={eyeRy} thinking={thinking} />}
        {kind === 'cat' && <Cat open={open} eyeRy={eyeRy} thinking={thinking} />}
        {kind === 'human' && <Human open={open} eyeRy={eyeRy} thinking={thinking} />}
      </Svg>
    </View>
  );
}

type FaceProps = { open: number; eyeRy: number; thinking: boolean };

function Dog({ open, eyeRy, thinking }: FaceProps) {
  const ey = thinking ? 90 : 96; // eyes glance up while thinking
  return (
    <G>
      {/* floppy ears */}
      <Ellipse cx={42} cy={88} rx={24} ry={50} fill="#8B5A2B" transform="rotate(18 42 88)" />
      <Ellipse cx={158} cy={88} rx={24} ry={50} fill="#8B5A2B" transform="rotate(-18 158 88)" />
      {/* head */}
      <Circle cx={100} cy={105} r={68} fill="#D9A066" />
      <Ellipse cx={100} cy={136} rx={40} ry={30} fill="#F3DDBB" />
      {/* eyes */}
      <Ellipse cx={72} cy={ey} rx={9} ry={9 * eyeRy} fill={DARK} />
      <Ellipse cx={128} cy={ey} rx={9} ry={9 * eyeRy} fill={DARK} />
      {eyeRy === 1 && (
        <>
          <Circle cx={75} cy={ey - 3} r={3} fill="#fff" />
          <Circle cx={131} cy={ey - 3} r={3} fill="#fff" />
        </>
      )}
      {/* eyebrows */}
      <Path d="M58 78 Q72 70 86 78" stroke="#6B4423" strokeWidth={4} fill="none" strokeLinecap="round" />
      <Path d="M114 78 Q128 70 142 78" stroke="#6B4423" strokeWidth={4} fill="none" strokeLinecap="round" />
      {/* nose */}
      <Ellipse cx={100} cy={118} rx={15} ry={10} fill={DARK} />
      <Line x1={100} y1={126} x2={100} y2={137} stroke={DARK} strokeWidth={3} />
      {/* mouth */}
      {open > 0.05 ? (
        <>
          <Ellipse cx={100} cy={148} rx={17} ry={4 + open * 15} fill={MOUTH_IN} />
          <Ellipse cx={100} cy={148 + open * 9} rx={9} ry={3 + open * 6} fill="#FF7A8A" />
        </>
      ) : (
        <Path d="M80 142 Q90 154 100 140 Q110 154 120 142" stroke={DARK} strokeWidth={3.5} fill="none" strokeLinecap="round" />
      )}
    </G>
  );
}

function Cat({ open, eyeRy, thinking }: FaceProps) {
  const ey = thinking ? 92 : 98;
  return (
    <G>
      {/* ears */}
      <Polygon points="40,78 52,14 98,48" fill="#F2A65A" />
      <Polygon points="160,78 148,14 102,48" fill="#F2A65A" />
      <Polygon points="52,66 58,34 82,52" fill="#FFB6C1" />
      <Polygon points="148,66 142,34 118,52" fill="#FFB6C1" />
      {/* head */}
      <Circle cx={100} cy={110} r={68} fill="#F2A65A" />
      {/* forehead stripes */}
      <Path d="M100 44 L100 62 M84 48 L88 62 M116 48 L112 62" stroke="#D9822B" strokeWidth={4} strokeLinecap="round" />
      <Ellipse cx={100} cy={138} rx={34} ry={24} fill="#FFE3C2" />
      {/* eyes */}
      <Ellipse cx={72} cy={ey} rx={12} ry={13 * eyeRy} fill="#8EDB8A" />
      <Ellipse cx={128} cy={ey} rx={12} ry={13 * eyeRy} fill="#8EDB8A" />
      {eyeRy === 1 && (
        <>
          <Ellipse cx={72} cy={ey} rx={4} ry={11} fill={DARK} />
          <Ellipse cx={128} cy={ey} rx={4} ry={11} fill={DARK} />
          <Circle cx={75} cy={ey - 5} r={2.5} fill="#fff" />
          <Circle cx={131} cy={ey - 5} r={2.5} fill="#fff" />
        </>
      )}
      {/* nose */}
      <Polygon points="92,119 108,119 100,129" fill="#FF8FA3" />
      {/* mouth */}
      {open > 0.05 ? (
        <Ellipse cx={100} cy={141} rx={11} ry={3 + open * 12} fill={MOUTH_IN} />
      ) : (
        <Path d="M100 129 Q94 141 84 137 M100 129 Q106 141 116 137" stroke={DARK} strokeWidth={3} fill="none" strokeLinecap="round" />
      )}
      {/* whiskers */}
      <G stroke="#6B6B6B" strokeWidth={2} strokeLinecap="round">
        <Line x1={62} y1={132} x2={22} y2={124} />
        <Line x1={62} y1={140} x2={20} y2={142} />
        <Line x1={64} y1={148} x2={26} y2={158} />
        <Line x1={138} y1={132} x2={178} y2={124} />
        <Line x1={138} y1={140} x2={180} y2={142} />
        <Line x1={136} y1={148} x2={174} y2={158} />
      </G>
    </G>
  );
}

function Human({ open, eyeRy, thinking }: FaceProps) {
  const ey = thinking ? 96 : 102;
  const HAIR = '#3B2A20';
  return (
    <G>
      {/* hair behind */}
      <Ellipse cx={100} cy={104} rx={76} ry={86} fill={HAIR} />
      {/* neck + face */}
      <Ellipse cx={100} cy={112} rx={58} ry={68} fill="#F6C9A0" />
      {/* fringe */}
      <Path d="M40 100 Q44 30 100 28 Q158 30 160 100 Q132 64 100 68 Q68 64 40 100 Z" fill={HAIR} />
      {/* eyebrows */}
      <Path d="M62 86 Q76 80 90 86" stroke={HAIR} strokeWidth={4} fill="none" strokeLinecap="round" />
      <Path d="M110 86 Q124 80 138 86" stroke={HAIR} strokeWidth={4} fill="none" strokeLinecap="round" />
      {/* eyes */}
      <Ellipse cx={76} cy={ey} rx={11} ry={8 * eyeRy} fill="#fff" />
      <Ellipse cx={124} cy={ey} rx={11} ry={8 * eyeRy} fill="#fff" />
      {eyeRy === 1 && (
        <>
          <Circle cx={thinking ? 79 : 77} cy={ey} r={5.5} fill="#4B3426" />
          <Circle cx={thinking ? 127 : 125} cy={ey} r={5.5} fill="#4B3426" />
          <Circle cx={thinking ? 81 : 79} cy={ey - 2} r={1.8} fill="#fff" />
          <Circle cx={thinking ? 129 : 127} cy={ey - 2} r={1.8} fill="#fff" />
        </>
      )}
      {/* nose + cheeks */}
      <Path d="M100 108 Q95 124 103 126" stroke="#D49A78" strokeWidth={3} fill="none" strokeLinecap="round" />
      <Circle cx={60} cy={130} r={9} fill="#FF9AA2" opacity={0.35} />
      <Circle cx={140} cy={130} r={9} fill="#FF9AA2" opacity={0.35} />
      {/* mouth */}
      {open > 0.05 ? (
        <>
          <Ellipse cx={100} cy={147} rx={16} ry={3 + open * 15} fill="#7A1F1F" />
          {open > 0.4 && <Ellipse cx={100} cy={144 - open * 2} rx={11} ry={3} fill="#fff" />}
        </>
      ) : (
        <Path d="M82 142 Q100 156 118 142" stroke="#B5493F" strokeWidth={4} fill="none" strokeLinecap="round" />
      )}
    </G>
  );
}
