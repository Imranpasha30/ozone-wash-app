const { getDefaultConfig } = require('expo/metro-config');
const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const path = require('path');

// Wrap with Sentry's metro config so source maps are uploaded on EAS builds.
const config = getSentryExpoConfig(__dirname);

// On web, redirect react-native-maps to a no-op stub.
// The module uses native-only APIs (codegenNativeCommands) that crash
// the Metro web bundler even when guarded by Platform.OS !== 'web'.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // On web, stub out react-native-maps AND all its sub-path imports
  // (e.g. react-native-maps/lib/MapMarkerNativeComponent) — they all use
  // native-only codegenNativeCommands that crash the Metro web bundler.
  if (platform === 'web' && moduleName.startsWith('react-native-maps')) {
    return {
      filePath: path.resolve(__dirname, 'src/mocks/react-native-maps.web.js'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
