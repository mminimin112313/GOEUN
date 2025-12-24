import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
    apiKey: "AIzaSyDg36Hnx_Kh29517SxYEmwAOv6RQpTgork",
    authDomain: "ideastore-8895d.firebaseapp.com",
    projectId: "ideastore-8895d",
    storageBucket: "ideastore-8895d.firebasestorage.app",
    messagingSenderId: "1018846796696",
    appId: "1:1018846796696:web:b0fc4f067cebf4c50d29ed",
    measurementId: "G-3V6B5E0W03"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics (Client side only)
let analytics;
isSupported().then(yes => yes && (analytics = getAnalytics(app)));

// Auth
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
