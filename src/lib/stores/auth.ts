import { writable } from 'svelte/store';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signOut, onAuthStateChanged, type User } from 'firebase/auth';

interface AuthState {
    user: User | null;
    loading: boolean;
    error: string | null;
}

function createAuthStore() {
    const { subscribe, set, update } = writable<AuthState>({
        user: null,
        loading: true,
        error: null
    });

    return {
        subscribe,
        login: async () => {
            update(s => ({ ...s, loading: true, error: null }));
            try {
                await signInWithPopup(auth, googleProvider);
            } catch (e: any) {
                update(s => ({ ...s, error: e.message }));
            } finally {
                update(s => ({ ...s, loading: false }));
            }
        },
        logout: async () => {
            update(s => ({ ...s, loading: true, error: null }));
            try {
                await signOut(auth);
            } catch (e: any) {
                update(s => ({ ...s, error: e.message }));
            } finally {
                update(s => ({ ...s, loading: false }));
            }
        },
        // Private updater for state change listener
        _setUser: (user: User | null) => {
            update(s => ({ ...s, user, loading: false }));
        }
    };
}

export const authStore = createAuthStore();

// Initialize listener
if (typeof window !== 'undefined') {
    onAuthStateChanged(auth, (user) => {
        authStore._setUser(user);
    });
}
