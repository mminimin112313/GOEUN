import { writable, type Writable } from 'svelte/store';
import { browser } from '$app/environment';

export function persisted<T>(key: string, initialValue: T): Writable<T> {
    // Check if client-side
    if (!browser) return writable(initialValue);

    // Load from Storage
    const storedValue = localStorage.getItem(key);
    const data = storedValue ? JSON.parse(storedValue) : initialValue;

    const store = writable<T>(data);

    // Subscribe and Save
    store.subscribe(value => {
        if (browser) {
            localStorage.setItem(key, JSON.stringify(value));
        }
    });

    return store;
}
