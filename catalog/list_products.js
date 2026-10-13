import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAPednaDojIDY9BUChZ7b9pLAXciFzOxhU",
  authDomain: "sekawan-putri-crm-and-pos.firebaseapp.com",
  projectId: "sekawan-putri-crm-and-pos",
  storageBucket: "sekawan-putri-crm-and-pos.firebasestorage.app",
  messagingSenderId: "1091815783351",
  appId: "1:1091815783351:web:c882c22d5644de92bd8632",
  measurementId: "G-E873D7JMZQ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const querySnapshot = await getDocs(collection(db, "products"));
  const products = [];
  querySnapshot.forEach((doc) => {
    products.push({ id: doc.id, ...doc.data() });
  });
  console.log(JSON.stringify(products, null, 2));
  process.exit(0);
}

run().catch(console.error);
