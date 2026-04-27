/**
 * Bars — horizontal bar chart, pure SVG.
 * Each bar: label on left, value on right, bar in middle. Auto-max if not set.
 */
import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';

export interface Bar {
  label: string;
  value: number;
  max?: number;
  color?: string;
}

interface Props {
  bars: Bar[];
  width?: number;
  barHeight?: number;
  formatValue?: (n: number) => string;
}

const Bars: React.FC<Props> = ({
  bars,
  width = 320,
  barHeight = 14,
  formatValue,
}) => {
  const C = useTheme();
  const computedMax = useMemo(() => {
    const explicit = bars.reduce((m, b) => Math.max(m, b.max || 0), 0);
    if (explicit > 0) return explicit;
    return Math.max(1, ...bars.map((b) => b.value || 0));
  }, [bars]);

  const labelW = 110;
  const valueW = 70;
  const trackW = Math.max(40, width - labelW - valueW - 16);

  return (
    <View style={{ width: '100%' }}>
      {bars.map((b, i) => {
        const v = Math.max(0, b.value || 0);
        const w = computedMax > 0 ? (v / computedMax) * trackW : 0;
        const color = b.color || C.primary;
        return (
          <View
            key={i}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 8,
              width: '100%',
            }}
          >
            <Text
              numberOfLines={1}
              style={{ width: labelW, fontSize: 12, color: C.foreground, fontWeight: '600' }}
            >
              {b.label}
            </Text>
            <Svg width={trackW} height={barHeight}>
              <Rect
                x={0}
                y={0}
                width={trackW}
                height={barHeight}
                rx={barHeight / 2}
                fill={C.surfaceHighlight}
              />
              <Rect
                x={0}
                y={0}
                width={w}
                height={barHeight}
                rx={barHeight / 2}
                fill={color}
              />
            </Svg>
            <Text
              style={{ width: valueW, textAlign: 'right', fontSize: 12, color: C.muted, fontWeight: '600' }}
            >
              {formatValue ? formatValue(v) : v}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

export default Bars;
