import { initializeApp } from 'firebase/app';
// @ts-ignore
import { initializeAuth, getReactNativePersistence, Auth } from 'firebase/auth';
// @ts-ignore
import AsyncStorage from '@react-native-async-storage/async-storage';



// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCXEHcBUnkEnwce9NELKJujWWf-ELjGmoI",
    authDomain: "crowdvision-ffa34.firebaseapp.com",
    projectId: "crowdvision-ffa34",
    storageBucket: "crowdvision-ffa34.firebasestorage.app",
    messagingSenderId: "332642888898",
    appId: "1:332642888898:web:b929ae8b36b3dcfeb51f5b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with AsyncStorage persistence
// Definite assignment assertion: auth is always assigned in the try/catch below
let auth!: Auth;
try {
    auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
    });
} catch (e) {
    console.warn('[FirebaseConfig] initializeAuth failed, falling back to getAuth:', e);
    // @ts-ignore - Fallback for some versions
    const { getAuth } = require('firebase/auth');
    auth = getAuth(app);
}

import { getFirestore } from 'firebase/firestore';
const db = getFirestore(app);

export { app, auth, db };




