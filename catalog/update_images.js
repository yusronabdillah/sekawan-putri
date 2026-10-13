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

const getBestImageForName = (name) => {
  const n = name.toLowerCase();
  
  if (n.includes('kentang')) return 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?q=80&w=800&auto=format&fit=crop';
  if (n.includes('fish ball') || n.includes('bola') || n.includes('bakso')) return 'https://images.unsplash.com/photo-1627915570222-38e7456dce81?q=80&w=800&auto=format&fit=crop';
  if (n.includes('maryam') || n.includes('roti')) return 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=800&auto=format&fit=crop';
  if (n.includes('nugget')) return 'https://images.unsplash.com/photo-1569691899455-88464f6d3cb1?q=80&w=800&auto=format&fit=crop';
  if (n.includes('sosis')) return 'https://images.unsplash.com/photo-1595155135117-6ff56f4d0840?q=80&w=800&auto=format&fit=crop';
  if (n.includes('bawang merah') || n.includes('bawang putih')) return 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?q=80&w=800&auto=format&fit=crop';
  if (n.includes('cabai') || n.includes('cabe') || n.includes('chili')) return 'https://images.unsplash.com/photo-1588267232230-f7bc45dbccfb?q=80&w=800&auto=format&fit=crop';
  if (n.includes('lumpia') || n.includes('spring roll')) return 'https://images.unsplash.com/photo-1592314545521-2a2b7f0df8e7?q=80&w=800&auto=format&fit=crop';
  if (n.includes('beef') || n.includes('sapi')) return 'https://images.unsplash.com/photo-1603048297172-c92544798d5e?q=80&w=800&auto=format&fit=crop';
  if (n.includes('daun bawang')) return 'https://images.unsplash.com/photo-1628172051662-349f7e44a4fc?q=80&w=800&auto=format&fit=crop';
  if (n.includes('dada ayam') || n.includes('fillet')) return 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?q=80&w=800&auto=format&fit=crop';
  if (n.includes('donat') || n.includes('donut')) return 'https://images.unsplash.com/photo-1551024601-bec78aea704b?q=80&w=800&auto=format&fit=crop';
  if (n.includes('burger')) return 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=800&auto=format&fit=crop';
  if (n.includes('tomat')) return 'https://images.unsplash.com/photo-1518977822534-7049a61ee0c2?q=80&w=800&auto=format&fit=crop';
  if (n.includes('wortel')) return 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?q=80&w=800&auto=format&fit=crop';
  
  return null; // fallback
};

async function run() {
  const querySnapshot = await getDocs(collection(db, "products"));
  let count = 0;
  
  for (const docSnapshot of querySnapshot.docs) {
    const data = docSnapshot.data();
    const specificImage = getBestImageForName(data.name);
    
    // If we have a specific image and it's different from the current one
    if (specificImage && data.image_url !== specificImage) {
      await updateDoc(doc(db, "products", docSnapshot.id), {
        image_url: specificImage
      });
      console.log(`Updated ${data.name} with new image`);
      count++;
    } else if (!data.image_url || data.image_url === "") {
      // If it doesn't have an image, let's just make sure it gets a safe default generic one directly in DB
      let generic = 'https://images.unsplash.com/photo-1588137378633-dea1336ce1e2?q=80&w=800&auto=format&fit=crop';
      if ((data.category || '').toLowerCase().includes('sayur')) {
         generic = 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=800&auto=format&fit=crop';
      }
      await updateDoc(doc(db, "products", docSnapshot.id), {
        image_url: generic
      });
      console.log(`Set generic image for ${data.name}`);
      count++;
    }
  }
  
  console.log(`Successfully updated ${count} products with accurate images.`);
  process.exit(0);
}

run().catch(console.error);
