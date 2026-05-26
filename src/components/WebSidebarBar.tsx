/**
 * WebSidebarBar — left rail navigation on web (>=768 px) replacing the
 * mobile bottom tab bar. Supports an expanded mode (240px, icon + label) and
 * a collapsed mode (68px, icon-only) toggled via the sidebar store.
 */
import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image, Platform,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { COLORS } from '../utils/constants';
import useSidebarStore, {
  SIDEBAR_WIDTH_EXPANDED, SIDEBAR_WIDTH_COLLAPSED,
} from '../store/sidebar.store';
import { CaretLeft, CaretRight } from './Icons';

const WebSidebarBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const collapsed = useSidebarStore((s) => s.collapsed);
  const toggle    = useSidebarStore((s) => s.toggle);
  const width = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  return (
    <View style={[s.sidebar, { width }]}>
      {/* Toggle button (top-right of sidebar) */}
      <TouchableOpacity
        onPress={toggle}
        style={[s.toggleBtn, collapsed && { right: 14, left: undefined }]}
        activeOpacity={0.7}
        accessibilityLabel={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed
          ? <CaretRight size={14} weight="bold" color={COLORS.muted} />
          : <CaretLeft  size={14} weight="bold" color={COLORS.muted} />}
      </TouchableOpacity>

      {/* Brand */}
      <View style={[s.brandRow, collapsed && { paddingHorizontal: 10, justifyContent: 'center' }]}>
        <Image
          source={require('../../assets/logo.png')}
          style={s.logo}
          resizeMode="contain"
        />
        {!collapsed && (
          <View>
            <Text style={s.brandName}>OZONE WASH</Text>
            <Text style={s.brandSub}>Tank Hygiene</Text>
          </View>
        )}
      </View>

      <View style={s.divider} />

      {/* Nav items */}
      <View style={[s.nav, collapsed && { paddingHorizontal: 6 }]}>
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
              style={[
                s.navItem,
                isFocused && s.navItemActive,
                collapsed && { paddingHorizontal: 0, justifyContent: 'center' },
              ]}
              activeOpacity={0.75}
              // Native HTML title tooltip on web → shows label when collapsed
              {...(Platform.OS === 'web' && collapsed
                ? ({ title: label } as any)
                : {})}
            >
              <View style={[s.navIconWrap, isFocused && s.navIconActive]}>
                {icon}
              </View>
              {!collapsed && (
                <Text style={[s.navLabel, isFocused && s.navLabelActive]}>
                  {label}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Footer */}
      {!collapsed && (
        <View style={s.sidebarFooter}>
          <Text style={s.sidebarFooterText}>VijRam Health Sense</Text>
          <Text style={s.sidebarFooterSub}>Hyderabad, Telangana</Text>
        </View>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  sidebar: {
    // Inline flex layout — tabBarPosition='left' on the Tab.Navigator lays out
    // the bar as a sibling flex item next to the scene container. Stays put
    // during page scroll because the parent layout itself does not scroll
    // (only the inner ScrollViews inside each screen do).
    flexShrink: 0,
    height: '100%',
    backgroundColor: COLORS.surface,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    zIndex: 100,
    paddingTop: 24,
    paddingBottom: 16,
    flexDirection: 'column',
    ...(Platform.OS === 'web' ? ({ transition: 'width 0.2s ease-out' } as any) : {}),
  },
  toggleBtn: {
    position: 'absolute' as any,
    top: 16, right: -12,
    width: 24, height: 24, borderRadius: 999,
    backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 101,
    ...Platform.select({
      web: { boxShadow: '0 2px 6px rgba(0,0,0,0.08)', cursor: 'pointer' } as any,
      ios: { shadowColor: 'rgba(0,0,0,0.15)', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
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
