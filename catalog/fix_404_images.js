import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";

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

const BROKEN_URLS = [
  "https://images.unsplash.com/photo-1586201375761-83865001e8ac?q=80&w=800&auto=format&fit=crop", // Rice
  "https://images.unsplash.com/photo-1587486913049-53fc88980fdc?q=80&w=800&auto=format&fit=crop", // Eggs
  "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?q=80&w=800&auto=format&fit=crop", // Water
  "https://images.unsplash.com/photo-1581428982868-e410dd4fcfa3?q=80&w=800&auto=format&fit=crop"  // Sugar
];

const WORKING_GENERIC = "https://images.unsplash.com/photo-1588137378633-dea1336ce1e2?q=80&w=800&auto=format&fit=crop";

async function run() {
  const querySnapshot = await getDocs(collection(db, "products"));
  let count = 0;
  
  for (const docSnapshot of querySnapshot.docs) {
    const data = docSnapshot.data();
    
    if (data.image_url && BROKEN_URLS.includes(data.image_url)) {
      await updateDoc(doc(db, "products", docSnapshot.id), {
        image_url: WORKING_GENERIC
      });
      console.log(`Fixed broken image for ${data.name}`);
      count++;
    }
  }
  
  console.log(`Successfully fixed ${count} products with broken 404 images.`);
  process.exit(0);
}

run().catch(console.error);
