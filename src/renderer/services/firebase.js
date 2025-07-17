// Firebase configuration and initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, collection, doc, addDoc, setDoc, onSnapshot, query, serverTimestamp, updateDoc, where, getDocs } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBkzz0CflvDNXcoa30-_fSIwD62SBF29SQ",
    authDomain: "hubmonitoramento.firebaseapp.com",
    projectId: "hubmonitoramento",
    storageBucket: "hubmonitoramento.appspot.com",
    messagingSenderId: "828068813283",
    appId: "1:828068813283:web:f2a3f64efeff8a7f88e8d6",
    measurementId: "G-QF0ETTB8Y2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firebase functions
export const firebase = {
    app,
    getAuth,
    signInAnonymously,
    onAuthStateChanged,
    getFirestore,
    collection,
    doc,
    addDoc,
    setDoc,
    onSnapshot,
    query,
    serverTimestamp,
    updateDoc,
    where,
    getDocs
};
