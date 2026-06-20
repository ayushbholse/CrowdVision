import 'react-native-get-random-values';
console.log('[Index] Initializing environment...');
import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';

import App from './App';

console.log('[Index] Registering Root Component...');
registerRootComponent(App);
console.log('[Index] Root Component Registered.');
