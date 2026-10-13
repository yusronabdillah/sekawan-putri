import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAPednaDojIDY9BUChZ7b9pLAXciFzOxhU",
  authDomain: "sekawan-putri-crm-and-pos.firebaseapp.com",
  projectId: "sekawan-putri-crm-and-pos",
  storageBucket: "sekawan-putri-crm-and-pos.firebasestorage.app",
  messagingSenderId: "1091815783351",
  appId: "1:1091815783351:web:c882c22d5644de92bd8632",
  measurementId: "G-E873D7JMZQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const firestore = getFirestore(app);

// Initialize Firebase Authentication
export const auth = getAuth(app);

export default app;

window.firestore = firestore;
