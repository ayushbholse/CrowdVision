// src/services/authService.ts
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    User
} from 'firebase/auth';
import { auth } from '../config/firebaseConfig';

export const authService = {
    // Register a new user
    signup: async (email: string, pass: string, name: string) => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
            // Update the user's profile with the name
            await updateProfile(userCredential.user, {
                displayName: name
            });
            return userCredential.user;
        } catch (error: any) {
            throw new Error(error.message || 'Signup failed');
        }
    },

    // Login existing user
    login: async (email: string, pass: string) => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, pass);
            return userCredential.user;
        } catch (error: any) {
            throw new Error(error.message || 'Login failed');
        }
    },

    // Logout
    logout: async () => {
        try {
            await signOut(auth);
        } catch (error: any) {
            throw new Error(error.message || 'Logout failed');
        }
    },

    // Get current user
    getCurrentUser: () => {
        return auth.currentUser;
    },

    // Listen for auth state changes
    subscribeToAuthChanges: (callback: (user: User | null) => void) => {
        return onAuthStateChanged(auth, callback);
    }
};
