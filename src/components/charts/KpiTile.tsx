/**
 * KpiTile — compact tile with label, value, optional delta and color accent.
 */
import React from 'react';
import { View, Text, Platform, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface Props {
  label: string;
  value: string | number;
  delta?: string;
  deltaPositive?: boolean;
  color?: string;
  icon?: React.ReactNode;
  hint?: string;
  style?: StyleProp<ViewStyle>;
}

const KpiTile: React.FC<Props> = ({
  label,
  value,
  delta,
  deltaPositive,
  color,
  icon,
  hint,
  style,
}) => {
  const C = useTheme();
  const accent = color || C.primary;
  const deltaColor =
    delta && typeof deltaPositive === 'boolean'
      ? (deltaPositive ? C.success : C.danger)
      : C.muted;

  return (
    <View
      style={[
        {
          flex: 1,
          minWidth: 140,
          backgroundColor: C.surface,
          borderRadius: 16,
          padding: 14,
          borderWidth: 1,
          borderColor: C.border,
          ...Platform.select({
            ios: {
              shadowColor: C.shadow,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 1,
              shadowRadius: 8,
            },
            android: { elevation: 2 },
          }),
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
        {icon ? <View style={{ marginRight: 6 }}>{icon}</View> : null}
        <Text style={{ fontSize: 11, color: C.muted, fontWeight: '600', flexShrink: 1 }}>
          {label}
        </Text>
      </View>
      <Text style={{ fontSize: 22, fontWeight: '700', color: accent }} numberOfLines={1}>
        {value}
      </Text>
      {delta ? (
        <Text style={{ fontSize: 11, color: deltaColor, marginTop: 4, fontWeight: '600' }}>
          {delta}
        </Text>
      ) : null}
      {hint ? (
        <Text style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{hint}</Text>
      ) : null}
    </View>
  );
};

export default KpiTile;
