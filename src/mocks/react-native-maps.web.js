// Stub for react-native-maps on web — the module uses native APIs that
// don't exist in a browser. AddressPickerScreen already guards usage with
// Platform.OS !== 'web', so this stub just needs to export the expected shape.
import React from 'react';
import { View } from 'react-native';

const MapView = (props) => React.createElement(View, props);
MapView.Animated = MapView;

export default MapView;
export const Marker = (props) => React.createElement(View, props);
export const Callout = (props) => React.createElement(View, props);
export const Circle = () => null;
export const Polygon = () => null;
export const Polyline = () => null;
export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = null;
