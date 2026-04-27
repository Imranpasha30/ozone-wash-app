/**
 * MisScaffold — shared header/filter/gaps building blocks for MIS screens.
 * Keeps each MIS screen lean and consistent.
 */
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput, Platform,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { ArrowLeft, Warning, CaretDown, CaretRight, ArrowsClockwise } from '../Icons';

export type QuickRange = '7d' | '30d' | '90d' | 'custom';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
}

export const MisHeader: React.FC<HeaderProps> = ({ title, subtitle, onBack }) => {
  const C = useTheme();
  return (
    <View
      style={{
        backgroundColor: C.surface,
        paddingTop: 56,
        paddingBottom: 18,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
      }}
    >
      {onBack ? (
        <TouchableOpacity onPress={onBack} hitSlop={12}>
          <ArrowLeft size={22} color={C.foreground} />
        </TouchableOpacity>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: C.foreground }}>{title}</Text>
        {subtitle ? (
          <Text style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{subtitle}</Text>
        ) : null}
      </View>
    </View>
  );
};

interface RangeProps {
  range: QuickRange;
  from: string;
  to: string;
  onChange: (range: QuickRange, from: string, to: string) => void;
}

const todayISO = () => new Date().toISOString().slice(0, 10);
const isoBack = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
};

export const computeDefaultRange = (days = 30) => ({
  from: isoBack(days),
  to: todayISO(),
});

export const DateRangeFilter: React.FC<RangeProps> = ({ range, from, to, onChange }) => {
  const C = useTheme();
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);

  const apply = (r: QuickRange) => {
    if (r === 'custom') {
      onChange(r, draftFrom, draftTo);
      return;
    }
    const days = r === '7d' ? 7 : r === '30d' ? 30 : 90;
    onChange(r, isoBack(days), todayISO());
  };

  const chip = (label: string, key: QuickRange) => {
    const active = range === key;
    return (
      <TouchableOpacity
        key={key}
        onPress={() => apply(key)}
        style={{
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 999,
          backgroundColor: active ? C.primary : C.surface,
          borderWidth: 1,
          borderColor: active ? C.primary : C.border,
        }}
      >
        <Text
          style={{
            fontSize: 12,
            fontWeight: '700',
            color: active ? C.primaryFg : C.foreground,
          }}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginTop: 14,
        marginBottom: 8,
        padding: 12,
        backgroundColor: C.surfaceElevated,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: C.border,
      }}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {chip('Last 7d', '7d')}
        {chip('Last 30d', '30d')}
        {chip('Last 90d', '90d')}
        {chip('Custom', 'custom')}
      </View>
      {range === 'custom' ? (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <TextInput
            value={draftFrom}
            onChangeText={setDraftFrom}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={C.muted}
            style={{
              flex: 1,
              backgroundColor: C.surface,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: C.border,
              paddingHorizontal: 12,
              paddingVertical: 8,
              color: C.foreground,
              fontSize: 13,
            }}
          />
          <TextInput
            value={draftTo}
            onChangeText={setDraftTo}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={C.muted}
            style={{
              flex: 1,
              backgroundColor: C.surface,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: C.border,
              paddingHorizontal: 12,
              paddingVertical: 8,
              color: C.foreground,
              fontSize: 13,
            }}
          />
          <TouchableOpacity
            onPress={() => onChange('custom', draftFrom, draftTo)}
            style={{
              backgroundColor: C.primary,
              borderRadius: 10,
              paddingHorizontal: 14,
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: C.primaryFg, fontWeight: '700', fontSize: 12 }}>Apply</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={{ marginTop: 8, fontSize: 11, color: C.muted }}>
          {from} → {to}
        </Text>
      )}
    </View>
  );
};

export const Skeleton: React.FC<{ count?: number }> = ({ count = 5 }) => {
  const C = useTheme();
  return (
    <View style={{ padding: 16, gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            height: 70,
            backgroundColor: C.surfaceHighlight,
            borderRadius: 14,
            opacity: 0.6,
          }}
        />
      ))}
    </View>
  );
};

interface ErrorProps {
  message: string;
  onRetry: () => void;
}

export const ErrorState: React.FC<ErrorProps> = ({ message, onRetry }) => {
  const C = useTheme();
  return (
    <View
      style={{
        margin: 16,
        padding: 18,
        backgroundColor: C.dangerBg,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: C.danger,
        alignItems: 'center',
        gap: 10,
      }}
    >
      <Warning size={26} color={C.danger} />
      <Text style={{ color: C.foreground, fontSize: 13, textAlign: 'center' }}>{message}</Text>
      <TouchableOpacity
        onPress={onRetry}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          backgroundColor: C.danger,
          borderRadius: 10,
          paddingHorizontal: 16,
          paddingVertical: 9,
        }}
      >
        <ArrowsClockwise size={14} color="#FFF" />
        <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
};

interface GapBucket {
  label: string;
  items: string[];
}

interface GapsProps {
  buckets: GapBucket[];
}

export const GapsPanel: React.FC<GapsProps> = ({ buckets }) => {
  const C = useTheme();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const totalGaps = buckets.reduce((sum, b) => sum + (b.items?.length || 0), 0);

  return (
    <View
      style={{
        margin: 16,
        backgroundColor: C.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: C.border,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          padding: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: C.dangerBg,
          borderBottomWidth: 1,
          borderBottomColor: C.border,
        }}
      >
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.danger }} />
        <Text style={{ fontSize: 14, fontWeight: '700', color: C.foreground, flex: 1 }}>
          Gaps & Action Items
        </Text>
        <Text style={{ fontSize: 12, color: C.danger, fontWeight: '700' }}>{totalGaps} items</Text>
      </View>
      {buckets.map((b, i) => {
        const isOpen = !!open[b.label];
        const count = b.items?.length || 0;
        return (
          <View key={i} style={{ borderBottomWidth: i < buckets.length - 1 ? 1 : 0, borderBottomColor: C.border }}>
            <TouchableOpacity
              onPress={() => setOpen((o) => ({ ...o, [b.label]: !isOpen }))}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 14,
                paddingVertical: 12,
                gap: 8,
              }}
              activeOpacity={0.7}
            >
              {isOpen ? (
                <CaretDown size={14} color={C.muted} />
              ) : (
                <CaretRight size={14} color={C.muted} />
              )}
              <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: C.foreground }}>
                {b.label}
              </Text>
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 999,
                  backgroundColor: count > 0 ? C.dangerBg : C.surfaceHighlight,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: count > 0 ? C.danger : C.muted,
                  }}
                >
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
            {isOpen && count > 0 ? (
              <View style={{ paddingHorizontal: 30, paddingBottom: 12, gap: 4 }}>
                {b.items.map((item, j) => (
                  <Text key={j} style={{ fontSize: 12, color: C.muted }} numberOfLines={1}>
                    • {item}
                  </Text>
                ))}
              </View>
            ) : null}
            {isOpen && count === 0 ? (
              <View style={{ paddingHorizontal: 30, paddingBottom: 12 }}>
                <Text style={{ fontSize: 11, color: C.muted, fontStyle: 'italic' }}>None</Text>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
};

export const SectionTitle: React.FC<{ title: string }> = ({ title }) => {
  const C = useTheme();
  return (
    <Text
      style={{
        fontSize: 12,
        fontWeight: '700',
        color: C.muted,
        textTransform: 'uppercase',
        paddingHorizontal: 16,
        marginTop: 18,
        marginBottom: 8,
        letterSpacing: 0.5,
      }}
    >
      {title}
    </Text>
  );
};

export const Card: React.FC<{ children: React.ReactNode; style?: any }> = ({ children, style }) => {
  const C = useTheme();
  return (
    <View
      style={[
        {
          marginHorizontal: 16,
          marginBottom: 12,
          padding: 14,
          backgroundColor: C.surface,
          borderRadius: 16,
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
      {children}
    </View>
  );
};

const _styles = StyleSheet.create({}); // eslint-disable-line
