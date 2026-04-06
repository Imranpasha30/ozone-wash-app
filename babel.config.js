module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // react-native-reanimated v4 no longer needs a Babel plugin
    // expo-notifications, gesture-handler etc. are handled by babel-preset-expo
  };
};
