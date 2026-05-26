/**
 * GooglePlayColorLogo — the proper multi-colour Google Play triangle logo.
 * Phosphor's GooglePlayLogo is monochrome; we use an inline SVG here so the
 * official red / yellow / green / blue palette comes through on web + native.
 *
 * Path data adapted from the public Google Play brand guidelines.
 */
import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface Props { size?: number }

const GooglePlayColorLogo: React.FC<Props> = ({ size = 28 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    {/* Blue (left back face) */}
    <Path
      d="M3 20.5V3.5C3 2.91 3.34 2.39 3.84 2.15L13.69 12L3.84 21.85C3.34 21.6 3 21.09 3 20.5Z"
      fill="#2196F3"
    />
    {/* Green (top edge → right pivot) */}
    <Path
      d="M16.81 8.88L6.05 2.66L14.54 11.15L16.81 8.88Z"
      fill="#4CAF50"
    />
    {/* Yellow (right tip / centre highlight) */}
    <Path
      d="M20.16 10.81C20.5 11.08 20.75 11.5 20.75 12C20.75 12.5 20.53 12.9 20.18 13.18L17.89 14.5L15.39 12L17.89 9.5L20.16 10.81Z"
      fill="#FFC107"
    />
    {/* Red (bottom edge → right pivot) */}
    <Path
      d="M16.81 15.12L6.05 21.34L14.54 12.85L16.81 15.12Z"
      fill="#F44336"
    />
  </Svg>
);

export default GooglePlayColorLogo;
