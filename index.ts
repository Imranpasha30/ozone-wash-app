import 'react-native-gesture-handler'; // MUST be first — required by @react-navigation/stack
import { registerRootComponent } from 'expo';
import App from './App';

console.log('[1] index.ts loaded — calling registerRootComponent');
registerRootComponent(App);
console.log('[2] registerRootComponent done');
