/**
 * WebSidebarBar — replaces the bottom tab bar on web large screens.
 * Rendered via the `tabBar` prop of each Tab.Navigator.
 */
import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image, Platform,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { COLORS } from '../utils/constants';
import { SIDEBAR_WIDTH } from '../utils/responsive';

const WebSidebarBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  return (
    <View style={s.sidebar}>
      {/* Brand */}
      <View style={s.brandRow}>
        <Image
          source={require('../../assets/logo.png')}
          style={s.logo}
          resizeMode="contain"
        />
        <View>
          <Text style={s.brandName}>OZONE WASH</Text>
          <Text style={s.brandSub}>Tank Hygiene</Text>
        </View>
      </View>

      <View style={s.divider} />

      {/* Nav items */}
      <View style={s.nav}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const rawLabel = options.tabBarLabel ?? options.title ?? route.name;
          const label = typeof rawLabel === 'string' ? rawLabel : route.name;

          const icon = options.tabBarIcon?.({
            focused: isFocused,
            color: isFocused ? COLORS.primary : COLORS.muted,
            size: 20,
          });

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={[s.navItem, isFocused && s.navItemActive]}
              activeOpacity={0.75}
            >
              <View style={[s.navIconWrap, isFocused && s.navIconActive]}>
                {icon}
              </View>
              <Text style={[s.navLabel, isFocused && s.navLabelActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Footer */}
      <View style={s.sidebarFooter}>
        <Text style={s.sidebarFooterText}>VijRam Health Sense</Text>
        <Text style={s.sidebarFooterSub}>Hyderabad, Telangana</Text>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  sidebar: {
    position: 'fixed' as any,
    left: 0, top: 0, bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: COLORS.surface,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    zIndex: 100,
    paddingTop: 24,
    paddingBottom: 16,
    flexDirection: 'column',
  },
  brandRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingBottom: 16,
  },
  logo: { width: 36, height: 36, borderRadius: 10 },
  brandName: {
    fontSize: 13, fontWeight: '800', color: COLORS.foreground, letterSpacing: 1.5,
  },
  brandSub: { fontSize: 10, color: COLORS.muted, marginTop: 1 },
  divider: {
    height: 1, backgroundColor: COLORS.border, marginHorizontal: 16, marginBottom: 12,
  },
  nav: { flex: 1, paddingHorizontal: 10 },
  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 11, borderRadius: 12,
    marginBottom: 4,
  },
  navItemActive: { backgroundColor: COLORS.primaryBg },
  navIconWrap: {
    width: 32, height: 32, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  navIconActive: { backgroundColor: COLORS.primary + '18' },
  navLabel: { fontSize: 13, fontWeight: '600', color: COLORS.muted },
  navLabelActive: { color: COLORS.primary },
  sidebarFooter: {
    paddingHorizontal: 20, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  sidebarFooterText: { fontSize: 11, color: COLORS.muted, fontWeight: '600' },
  sidebarFooterSub: { fontSize: 10, color: COLORS.muted, marginTop: 2 },
});

export default WebSidebarBar;
