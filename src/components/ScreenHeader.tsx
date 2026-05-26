/**
 * ScreenHeader — drop-in header with a back button for Stack-pushed screens.
 *
 * Tab screens (root of each navigator) should NOT use this — they have no
 * back history. Use it on every other screen so the user can always return
 * one step.
 *
 * Usage:
 *   <ScreenHeader title="Field Agents" subtitle="2 agents on roster" />
 *   <ScreenHeader title="Booking #ABCD" right={<TouchableOpacity>...</TouchableOpacity>} />
 *
 * Behaviour:
 *   - Renders an ArrowLeft button on the left that calls navigation.goBack()
 *     when there's history, or navigation.navigate(fallbackRoute) otherwise.
 *   - Sticks to the top with a subtle border-bottom so it reads as the page
 *     chrome rather than inline content.
 */
import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';
import { ArrowLeft } from './Icons';

interface Props {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  // If there's no back history (e.g. deep-linked entry), navigate here.
  fallbackRoute?: string;
}

const ScreenHeader: React.FC<Props> = ({ title, subtitle, right, fallbackRoute }) => {
  const C = useTheme();
  const navigation = useNavigation<any>();
  const styles = React.useMemo(() => makeStyles(C), [C]);

  const handleBack = () => {
    if (navigation.canGoBack?.()) {
      navigation.goBack();
    } else if (fallbackRoute) {
      navigation.navigate(fallbackRoute);
    } else {
      // Last-resort: try to pop, otherwise do nothing.
      try { navigation.goBack(); } catch (_) {}
    }
  };

  return (
    <View style={styles.row}>
      <TouchableOpacity
        onPress={handleBack}
        style={styles.backBtn}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        activeOpacity={0.7}
      >
        <ArrowLeft size={22} weight="regular" color={C.foreground} />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
};

const makeStyles = (C: any) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.surface,
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    ...Platform.select({
      ios: { shadowColor: C.shadowMedium, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.surfaceElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  title:    { fontSize: 18, fontWeight: '700', color: C.foreground },
  subtitle: { fontSize: 12, color: C.muted, marginTop: 2 },
  right:    { marginLeft: 8 },
});

export default ScreenHeader;
