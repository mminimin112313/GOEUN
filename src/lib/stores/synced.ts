import { writable, type Writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { authStore } from './auth';

/**
 * Creates a store that syncs with LocalStorage (Guest) or Firestore (User).
 * @param key LocalStorage key
 * @param firestorePath Relative path segment (e.g., 'history') inside users/{uid}/data/
 * @param initialValue Default value
 */
export function synced<T>(key: string, firestoreId: string, initialValue: T): Writable<T> {
    const store = writable<T>(initialValue);

    // Internal state to prevent loops
    let isFromRemote = false;
    let unsubscribeFirestore: (() => void) | null = null;
    let currentUserUid: string | null = null;

    // 1. Initialize from LocalStorage first (for instant render)
    if (browser) {
        const local = localStorage.getItem(key);
        if (local) {
            try {
                store.set(JSON.parse(local));
            } catch (e) {
                console.error(`Failed to parse local ${key}`, e);
            }
        }
    }

    // 2. Auth Listener - Switch Source
    authStore.subscribe(async (state) => {
        const uid = state.user?.uid || null;

        if (uid === currentUserUid) return; // No change
        currentUserUid = uid;

        // Cleanup previous listener
        if (unsubscribeFirestore) {
            unsubscribeFirestore();
            unsubscribeFirestore = null;
        }

        if (uid) {
            // --- USER MODE (Firestore) ---
            const docRef = doc(db, 'users', uid, 'synced_data', firestoreId); // users/{uid}/synced_data/{firestoreId}

            // Realtime Listener
            unsubscribeFirestore = onSnapshot(docRef, (snap) => {
                if (snap.exists()) {
                    isFromRemote = true;
                    store.set(snap.data().value as T);
                    isFromRemote = false;
                } else {
                    isFromRemote = true;
                    store.set(initialValue);
                    isFromRemote = false;
                }
            }, (error) => {
                console.error("Firestore Sync Error (falling back to local):", error);
                // Optional: Force switch back to local if needed, but for now just prevent crash
                if (browser) {
                    // alert("Sync Error: " + error.message);
                }
            });

        } else {
            // --- GUEST MODE (LocalStorage) ---
            // Load from LS again to revert whatever cloud data was shown
            if (browser) {
                const local = localStorage.getItem(key);
                isFromRemote = true; // treat as remote to avoid loop
                store.set(local ? JSON.parse(local) : initialValue);
                isFromRemote = false;
            }
        }
    });

    // 3. Store Subscription - Handle Writes
    store.subscribe((value) => {
        if (!browser) return;
        if (isFromRemote) return; // Don't write back if it came from the source

        if (currentUserUid) {
            // Write to Firestore (Debouncing recommended for high freq, but TBD)
            const docRef = doc(db, 'users', currentUserUid, 'synced_data', firestoreId);
            setDoc(docRef, { value }, { merge: true }).catch(err => console.error("Firestore save failed", err));
        } else {
            // Write to LocalStorage
            localStorage.setItem(key, JSON.stringify(value));
        }
    });

    return store;
}
