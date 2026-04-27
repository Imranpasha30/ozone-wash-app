/**
 * Donut — pure SVG donut chart, dependency-free.
 * 200×200, center label = total. Supports any number of slices.
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface Props {
  slices: DonutSlice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string | number;
}

const Donut: React.FC<Props> = ({
  slices,
  size = 200,
  thickness = 28,
  centerLabel,
  centerValue,
}) => {
  const C = useTheme();
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = useMemo(
    () => slices.reduce((sum, s) => sum + (s.value || 0), 0),
    [slices]
  );

  let cumulative = 0;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        {/* Background ring */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={C.surfaceHighlight}
          strokeWidth={thickness}
          fill="none"
        />
        {total > 0 && (
          <G>
            {slices.map((slice, i) => {
              const value = Math.max(0, slice.value || 0);
              const fraction = value / total;
              const dash = fraction * circumference;
              const offset = -cumulative;
              cumulative += dash;
              return (
                <Circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={slice.color}
                  strokeWidth={thickness}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={offset}
                  fill="none"
                  strokeLinecap="butt"
                />
              );
            })}
          </G>
        )}
      </Svg>
      <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: C.foreground }}>
          {centerValue ?? total}
        </Text>
        {centerLabel ? (
          <Text style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{centerLabel}</Text>
        ) : null}
      </View>
    </View>
  );
};

export default Donut;
