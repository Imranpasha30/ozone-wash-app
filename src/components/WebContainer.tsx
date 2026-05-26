/**
 * WebContainer — content-width wrapper for web layouts.
 *
 * On web (>=768 px) caps inner content at `maxWidth` and centres it inside
 * the screen, so cards do not stretch edge-to-edge across a 1300-px-wide
 * viewport. On mobile, renders children unchanged (no extra View) to avoid
 * any layout disruption.
 *
 * Usage:
 *   <ScrollView>
 *     <WebContainer>
 *       ...screen content...
 *     </WebContainer>
 *   </ScrollView>
 *
 * Variants:
 *   maxWidth   – default 1100. Pass `narrow` (560) for forms / single-column.
 *   noPadding  – disable horizontal padding (when the scroll already pads).
 */
import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { useResponsive } from '../utils/responsive';

type Variant = 'default' | 'narrow' | 'wide';

interface Props {
  children: React.ReactNode;
  variant?: Variant;
  maxWidth?: number;
  style?: StyleProp<ViewStyle>;
  noPadding?: boolean;
}

const VARIANT_WIDTH: Record<Variant, number> = {
  narrow: 560,
  default: 1100,
  wide: 1400,
};

const WebContainer: React.FC<Props> = ({
  children, variant = 'default', maxWidth, style, noPadding = false,
}) => {
  const { isLarge } = useResponsive();
  if (!isLarge) return <>{children}</>;

  const cap = maxWidth ?? VARIANT_WIDTH[variant];
  return (
    <View
      style={[
        {
          width: '100%',
          maxWidth: cap,
          alignSelf: 'center',
          paddingHorizontal: noPadding ? 0 : 28,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

export default WebContainer;
