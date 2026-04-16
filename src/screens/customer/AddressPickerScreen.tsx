import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, ActivityIndicator, Platform, Keyboard, Alert,
  StatusBar, Animated,
} from 'react-native';
import * as Location from 'expo-location';
import axios from 'axios';
import { useTheme } from '../../hooks/useTheme';
import {
  ArrowLeft, ArrowRight, MapPin, NavigationArrow, MagnifyingGlass, X,
} from '../../components/Icons';

// Only import MapView on native platforms
let MapView: any = null;
let PROVIDER_GOOGLE: any = null;
if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  MapView = maps.default;
  PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
}

const MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

// Default center: Hyderabad
const DEFAULT_REGION = {
  latitude: 17.385044,
  longitude: 78.486671,
  latitudeDelta: 0.008,
  longitudeDelta: 0.008,
};

interface PlaceSuggestion {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

const AddressPickerScreen = ({ navigation, route }: any) => {
  const C = useTheme();
  const styles = React.useMemo(() => makeStyles(C), [C]);

  const { pickingFor, initialAddress, initialLat, initialLng } = route.params ?? {};

  const mapRef = useRef<any>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pinAnim = useRef(new Animated.Value(0)).current; // 0 = idle, 1 = dragging

  const [searchText, setSearchText] = useState(initialAddress ?? '');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [region, setRegion] = useState(
    initialLat && initialLng
      ? { latitude: initialLat, longitude: initialLng, latitudeDelta: 0.005, longitudeDelta: 0.005 }
      : DEFAULT_REGION,
  );
  const [confirmedAddress, setConfirmedAddress] = useState<string>(initialAddress ?? '');
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Reverse geocode helper
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setIsReverseGeocoding(true);
    try {
      const [geo] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (geo) {
        const parts = [geo.name, geo.street, geo.district, geo.city, geo.region, geo.postalCode].filter(Boolean);
        const addr = parts.join(', ');
        setConfirmedAddress(addr);
        setSearchText(addr);
      }
    } catch {
      /* silent — user can type manually */
    } finally {
      setIsReverseGeocoding(false);
    }
  }, []);

  // On mount: if no initial address, reverse geocode default region
  useEffect(() => {
    if (!initialAddress && Platform.OS !== 'web') {
      reverseGeocode(DEFAULT_REGION.latitude, DEFAULT_REGION.longitude);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Google Places Autocomplete ──────────────────────────────────
  const fetchSuggestions = useCallback(async (input: string) => {
    if (!MAPS_KEY || input.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const { data } = await axios.get(
        'https://maps.googleapis.com/maps/api/place/autocomplete/json',
        {
          params: {
            input,
            key: MAPS_KEY,
            components: 'country:in',
            language: 'en',
            types: 'geocode|establishment',
          },
        },
      );
      if (data.status === 'OK') setSuggestions(data.predictions.slice(0, 6));
      else setSuggestions([]);
    } catch {
      setSuggestions([]);
    }
  }, []);

  const handleSearchChange = (text: string) => {
    setSearchText(text);
    setShowSuggestions(true);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => fetchSuggestions(text), 320);
  };

  const handleClearSearch = () => {
    setSearchText('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // ── Select suggestion → get place details → animate map ────────
  const handleSelectSuggestion = useCallback(async (item: PlaceSuggestion) => {
    Keyboard.dismiss();
    setShowSuggestions(false);
    setSearchText(item.description);
    setConfirmedAddress(item.description);

    if (!MAPS_KEY) return;
    try {
      const { data } = await axios.get(
        'https://maps.googleapis.com/maps/api/place/details/json',
        {
          params: {
            place_id: item.place_id,
            fields: 'geometry,formatted_address',
            key: MAPS_KEY,
          },
        },
      );
      if (data.status === 'OK') {
        const { lat, lng } = data.result.geometry.location;
        const newRegion = { latitude: lat, longitude: lng, latitudeDelta: 0.005, longitudeDelta: 0.005 };
        setRegion(newRegion);
        setConfirmedAddress(data.result.formatted_address ?? item.description);
        setSearchText(data.result.formatted_address ?? item.description);
        mapRef.current?.animateToRegion(newRegion, 500);
      }
    } catch {
      /* silent */
    }
  }, []);

  // ── Use current GPS location ────────────────────────────────────
  const handleUseCurrentLocation = useCallback(async () => {
    Keyboard.dismiss();
    setShowSuggestions(false);
    setIsLocating(true);
    try {
      if (Platform.OS === 'web') {
        // Use browser Geolocation API on web
        if (!navigator.geolocation) {
          Alert.alert('Not Supported', 'Geolocation is not supported by your browser.');
          return;
        }
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            const newRegion = { latitude, longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 };
            setRegion(newRegion);
            await reverseGeocode(latitude, longitude);
            setIsLocating(false);
          },
          () => {
            Alert.alert('Location Error', 'Could not get your location. Please allow location access.');
            setIsLocating(false);
          },
          { enableHighAccuracy: true, timeout: 10000 },
        );
        return;
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Allow location access to use this feature.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = pos.coords;
      const newRegion = { latitude, longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 500);
      await reverseGeocode(latitude, longitude);
    } catch (err: any) {
      Alert.alert('Location Error', err.message ?? 'Could not get your location.');
    } finally {
      if (Platform.OS !== 'web') setIsLocating(false);
    }
  }, [reverseGeocode]);

  // ── Map drag handlers ───────────────────────────────────────────
  const handleRegionChange = useCallback(() => {
    // Lift pin while dragging
    Animated.spring(pinAnim, { toValue: 1, useNativeDriver: true, speed: 40 }).start();
  }, [pinAnim]);

  const handleRegionChangeComplete = useCallback(
    async (newRegion: typeof DEFAULT_REGION) => {
      // Drop pin
      Animated.spring(pinAnim, { toValue: 0, useNativeDriver: true, speed: 30 }).start();
      setRegion(newRegion);
      if (showSuggestions) return; // Don't reverse geocode while typing
      await reverseGeocode(newRegion.latitude, newRegion.longitude);
    },
    [pinAnim, showSuggestions, reverseGeocode],
  );

  // ── Confirm selection → navigate back ──────────────────────────
  const handleConfirm = useCallback(() => {
    if (!confirmedAddress.trim()) return;
    navigation.navigate('TankDetails', {
      pickedAddress: confirmedAddress.trim(),
      pickedLat: region.latitude,
      pickedLng: region.longitude,
      pickedFor: pickingFor,
    });
  }, [confirmedAddress, region, navigation, pickingFor]);

  // ── Pin animation interpolations ───────────────────────────────
  const pinTranslateY = pinAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -12] });
  const pinScale = pinAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });
  const shadowOpacity = pinAnim.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.08] });
  const shadowScale = pinAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.surface} translucent={false} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft size={22} weight="regular" color={C.foreground} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Select Location</Text>
          <Text style={styles.headerSub}>Drag the map or search to pinpoint your address</Text>
        </View>
      </View>

      {/* ── Body: search + map stacked; suggestions overlays both ── */}
      <View style={styles.body}>

        {/* Search bar */}
        <View style={styles.searchWrap}>
          <View style={styles.searchBar}>
            <MagnifyingGlass size={18} weight="regular" color={C.muted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search area, street, landmark..."
              placeholderTextColor={C.gray}
              value={searchText}
              onChangeText={handleSearchChange}
              onFocus={() => { if (searchText.length >= 2) setShowSuggestions(true); }}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={handleClearSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={16} weight="bold" color={C.muted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Map view (native only) */}
        {Platform.OS !== 'web' ? (
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={StyleSheet.absoluteFillObject}
              initialRegion={region}
              onRegionChange={handleRegionChange}
              onRegionChangeComplete={handleRegionChangeComplete}
              showsUserLocation={true}
              showsMyLocationButton={false}
              showsCompass={false}
              toolbarEnabled={false}
              onPress={() => { if (showSuggestions) { setShowSuggestions(false); Keyboard.dismiss(); } }}
            />

            {/* Fixed center pin (Zomato/Rapido style) */}
            <View style={styles.pinOverlay} pointerEvents="none">
              <Animated.View
                style={[
                  styles.pinAnimWrap,
                  { transform: [{ translateY: pinTranslateY }, { scale: pinScale }] },
                ]}
              >
                <MapPin size={44} weight="fill" color={C.primary} />
              </Animated.View>
              <Animated.View
                style={[
                  styles.pinShadowCircle,
                  {
                    opacity: shadowOpacity,
                    transform: [{ scaleX: shadowScale }, { scaleY: shadowScale }],
                  },
                ]}
              />
            </View>

            {/* GPS floating button */}
            <TouchableOpacity
              style={styles.gpsBtn}
              onPress={handleUseCurrentLocation}
              disabled={isLocating}
            >
              {isLocating
                ? <ActivityIndicator size="small" color={C.primary} />
                : <NavigationArrow size={22} weight="fill" color={C.primary} />}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.webFallback}>
            <MapPin size={48} weight="regular" color={C.border} />
            <Text style={styles.webFallbackText}>Map view is available on Android & iOS</Text>
            <TouchableOpacity style={styles.webGpsBtn} onPress={handleUseCurrentLocation}>
              <NavigationArrow size={18} weight="fill" color={C.primary} />
              <Text style={styles.webGpsBtnText}>Use current location</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Suggestions dropdown — position:absolute relative to body container */}
        {showSuggestions && (
          <View style={styles.suggestionsSheet}>
          {/* Use current location row */}
          <TouchableOpacity style={styles.currentLocRow} onPress={handleUseCurrentLocation}>
            <View style={styles.currentLocIconWrap}>
              <NavigationArrow size={18} weight="fill" color={C.primary} />
            </View>
            <View>
              <Text style={styles.currentLocMain}>Use current location</Text>
              <Text style={styles.currentLocSub}>GPS-detected address</Text>
            </View>
          </TouchableOpacity>

          {suggestions.length > 0 && (
            <>
              <View style={styles.divider} />
              <FlatList
                data={suggestions}
                keyExtractor={(s) => s.place_id}
                keyboardShouldPersistTaps="always"
                scrollEnabled={false}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    style={[styles.suggestionRow, index === suggestions.length - 1 && { borderBottomWidth: 0 }]}
                    onPress={() => handleSelectSuggestion(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.suggestionIconWrap}>
                      <MapPin size={14} weight="regular" color={C.muted} />
                    </View>
                    <View style={styles.suggestionTextWrap}>
                      <Text style={styles.suggestionMain} numberOfLines={1}>
                        {item.structured_formatting.main_text}
                      </Text>
                      <Text style={styles.suggestionSub} numberOfLines={1}>
                        {item.structured_formatting.secondary_text}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            </>
          )}
        </View>
      )}

      </View>{/* end body */}

      {/* ── Bottom confirm card ── */}
      <View style={styles.confirmCard}>
        <View style={styles.addressRow}>
          <View style={styles.addressIconWrap}>
            <MapPin size={22} weight="fill" color={C.primary} />
          </View>
          <View style={styles.addressTextWrap}>
            {isReverseGeocoding ? (
              <View style={styles.addressLoadingRow}>
                <ActivityIndicator size="small" color={C.primary} style={{ marginRight: 8 }} />
                <Text style={styles.addressLoadingText}>Finding address...</Text>
              </View>
            ) : confirmedAddress ? (
              <>
                <Text style={styles.addressMain} numberOfLines={2}>{confirmedAddress}</Text>
                <Text style={styles.addressSub}>Delivering to this address</Text>
              </>
            ) : (
              <Text style={styles.addressPlaceholder}>Move the map to select your location</Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.confirmBtn,
            (!confirmedAddress.trim() || isReverseGeocoding) && styles.confirmBtnDisabled,
          ]}
          onPress={handleConfirm}
          disabled={!confirmedAddress.trim() || isReverseGeocoding}
          activeOpacity={0.85}
        >
          <Text style={styles.confirmBtnText}>Confirm this location</Text>
          <ArrowRight size={18} weight="bold" color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  // Body wraps search + map; suggestions is absolute inside this
  body: { flex: 1, position: 'relative' },

  // ── Header ───────────────────────────────────────────────────────
  header: {
    backgroundColor: C.surface,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 8 : 52,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6 },
      android: { elevation: 3 },
    }),
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.foreground },
  headerSub: { fontSize: 12, color: C.muted, marginTop: 1 },

  // ── Search ───────────────────────────────────────────────────────
  searchWrap: {
    backgroundColor: C.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    zIndex: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surfaceElevated,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: C.foreground,
    padding: 0,
  },

  // ── Map ──────────────────────────────────────────────────────────
  mapContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: C.surfaceHighlight,
  },

  // Center pin overlay
  pinOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinAnimWrap: {
    // Bottom of the 44px icon (the tip) should sit at map center
    // MapPin icon: tip is at bottom → offset up by full height so tip = center
    marginBottom: -2, // fine-tune: pin tip sits at exact center
  },
  pinShadowCircle: {
    width: 18,
    height: 8,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.35)',
    marginTop: -4,
  },

  // GPS button
  gpsBtn: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: C.shadowMedium, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 10 },
      android: { elevation: 6 },
    }),
  },

  // Web fallback
  webFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: C.surfaceElevated,
  },
  webFallbackText: { fontSize: 14, color: C.muted, textAlign: 'center', paddingHorizontal: 32 },
  webGpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.primaryBg,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: C.borderActive,
    marginTop: 8,
  },
  webGpsBtnText: { fontSize: 14, color: C.primary, fontWeight: '600' },

  // ── Suggestions ──────────────────────────────────────────────────
  suggestionsSheet: {
    position: 'absolute',
    // Sits just below the search bar inside the body container
    // searchWrap: paddingVertical:10 + searchBar:paddingVertical:10*2 + icon ~20 = ~62px
    top: 62,
    left: 0,
    right: 0,
    backgroundColor: C.surface,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    ...Platform.select({
      ios: { shadowColor: C.shadowStrong, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 16 },
      android: { elevation: 10 },
    }),
    zIndex: 30,
    maxHeight: 340,
    overflow: 'hidden',
  },
  currentLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  currentLocIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentLocMain: { fontSize: 14, fontWeight: '700', color: C.primary },
  currentLocSub: { fontSize: 12, color: C.muted, marginTop: 1 },
  divider: { height: 1, backgroundColor: C.border, marginHorizontal: 14 },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  suggestionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionTextWrap: { flex: 1 },
  suggestionMain: { fontSize: 14, fontWeight: '600', color: C.foreground },
  suggestionSub: { fontSize: 12, color: C.muted, marginTop: 1 },

  // ── Confirm card ─────────────────────────────────────────────────
  confirmCard: {
    backgroundColor: C.surface,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    borderTopWidth: 1,
    borderTopColor: C.border,
    gap: 14,
    ...Platform.select({
      ios: { shadowColor: C.shadowStrong, shadowOffset: { width: 0, height: -6 }, shadowOpacity: 1, shadowRadius: 16 },
      android: { elevation: 12 },
    }),
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  addressIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  addressTextWrap: { flex: 1 },
  addressMain: { fontSize: 15, fontWeight: '700', color: C.foreground, lineHeight: 20 },
  addressSub: { fontSize: 12, color: C.muted, marginTop: 3 },
  addressPlaceholder: { fontSize: 14, color: C.muted, fontStyle: 'italic' },
  addressLoadingRow: { flexDirection: 'row', alignItems: 'center' },
  addressLoadingText: { fontSize: 14, color: C.muted },
  confirmBtn: {
    backgroundColor: C.primary,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmBtnDisabled: {
    opacity: 0.4,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default AddressPickerScreen;
