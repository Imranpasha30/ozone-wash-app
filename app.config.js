// Dynamic Expo config — reads sensitive values from environment variables.
// Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in your .env (local) or EAS Secrets (CI/production).
// The static app.json is kept for non-sensitive fields only.

module.exports = ({ config }) => {
  const mapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

  return {
    ...config,
    ios: {
      ...config.ios,
      config: {
        googleMapsApiKey: mapsKey,
      },
    },
    android: {
      ...config.android,
      config: {
        googleMaps: {
          apiKey: mapsKey,
        },
      },
    },
  };
};
