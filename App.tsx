import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, ScrollView } from 'react-native';
import RootNavigator from './src/navigation/RootNavigator';

console.log('[3] App.tsx module loaded');

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <ScrollView style={{ flex: 1, backgroundColor: '#fff', padding: 24, paddingTop: 60 }}>
          <Text style={{ color: 'red', fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>
            APP CRASH — copy this error:
          </Text>
          <Text style={{ color: '#000', fontSize: 14, marginBottom: 8 }}>{err.message}</Text>
          <Text style={{ color: '#555', fontSize: 11 }}>{err.stack}</Text>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  console.log('[4] App() render called');
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <RootNavigator />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}