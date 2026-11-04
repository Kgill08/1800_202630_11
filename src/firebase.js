import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyD12lxKzk-0BUREk9v8LtFUYp01MWZEfyE",
    authDomain: "decisionlog-bby11.firebaseapp.com",
    projectId: "decisionlog-bby11",
    storageBucket: "decisionlog-bby11.firebasestorage.app",
    messagingSenderId: "1082040851078",
    appId: "1:1082040851078:web:f14b4ce8729950e86e8f07",
    measurementId: "G-JRY3Q9C82P"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Authentication and Firestore
const auth = getAuth(app);
const db = getFirestore(app);

// Export Firebase services
export { auth, db };