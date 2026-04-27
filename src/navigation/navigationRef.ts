import { createNavigationContainerRef } from '@react-navigation/native';

// Module-level navigation ref. Lives outside React's tree so non-component code
// (push notification handlers, deep-link routers, etc.) can navigate without
// reaching into a hook.
//
// Kept in its own file to avoid an App.tsx <-> RootNavigator.tsx import cycle.
export const navigationRef = createNavigationContainerRef<any>();
