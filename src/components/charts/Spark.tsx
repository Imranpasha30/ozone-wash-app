/**
 * Spark — tiny sparkline for trend arrays. Pure SVG.
 */
import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import Svg, { Polyline, Circle } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';

interface Props {
  values: number[];
  labels?: string[];
  width?: number;
  height?: number;
  color?: string;
  showEndDot?: boolean;
  showAxisLabels?: boolean;
}

const Spark: React.FC<Props> = ({
  values,
  labels,
  width = 280,
  height = 64,
  color,
  showEndDot = true,
  showAxisLabels = false,
}) => {
  const C = useTheme();
  const stroke = color || C.primary;

  const { points, lastX, lastY } = useMemo(() => {
    if (!values.length) return { points: '', lastX: 0, lastY: 0 };
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const padX = 4;
    const padY = 6;
    const w = width - padX * 2;
    const h = height - padY * 2;
    const step = values.length > 1 ? w / (values.length - 1) : 0;
    let last = { x: 0, y: 0 };
    const pts = values
      .map((v, i) => {
        const x = padX + i * step;
        const y = padY + h - ((v - min) / range) * h;
        last = { x, y };
        return `${x},${y}`;
      })
      .join(' ');
    return { points: pts, lastX: last.x, lastY: last.y };
  }, [values, width, height]);

  if (!values.length) {
    return (
      <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 11, color: C.muted }}>No data</Text>
      </View>
    );
  }

  return (
    <View style={{ width }}>
      <Svg width={width} height={height}>
        <Polyline
          points={points}
          fill="none"
          stroke={stroke}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {showEndDot && (
          <Circle cx={lastX} cy={lastY} r={3} fill={stroke} />
        )}
      </Svg>
      {showAxisLabels && labels && labels.length === values.length ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
          <Text style={{ fontSize: 9, color: C.muted }}>{labels[0]}</Text>
          <Text style={{ fontSize: 9, color: C.muted }}>{labels[labels.length - 1]}</Text>
        </View>
      ) : null}
    </View>
  );
};

export default Spark;
