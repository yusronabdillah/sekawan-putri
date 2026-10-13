import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc } from "firebase/firestore";

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
  console.log("Starting DB update...");
  
  // 1. Fix broken images by clearing image_url on existing products 
  // (so they use the robust getFallbackImage frontend logic)
  const querySnapshot = await getDocs(collection(db, "products"));
  let updatedCount = 0;
  
  for (const docSnapshot of querySnapshot.docs) {
    const data = docSnapshot.data();
    // If it has an image_url but it's not from unsplash (or maybe just clear all to be safe and let fallback handle it unless we explicitly set it below)
    if (data.image_url && !data.image_url.includes("unsplash")) {
      await updateDoc(doc(db, "products", docSnapshot.id), {
        image_url: ""
      });
      updatedCount++;
    }
  }
  console.log(`Cleared broken image_url on ${updatedCount} existing products.`);

  // 2. Add dummy products
  const dummies = [
    {
      name: "Teh Pucuk Harum 350ml",
      price: 4000,
      category: "Minuman",
      stock: 50,
      description: "Teh Pucuk Harum 350ml segar, cocok untuk menemani makan siang Anda. Dibuat dari pucuk teh pilihan.",
      image_url: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?q=80&w=800&auto=format&fit=crop"
    },
    {
      name: "Coca-Cola 1.5 Liter",
      price: 15000,
      category: "Minuman",
      stock: 20,
      description: "Minuman soda menyegarkan ukuran botol besar 1.5L. Sangat pas disajikan dingin untuk acara keluarga atau pesta.",
      image_url: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=800&auto=format&fit=crop"
    },
    {
      name: "Aqua Air Mineral 600ml",
      price: 3000,
      category: "Minuman",
      stock: 100,
      description: "Air minum dalam kemasan dari sumber mata air pegunungan terbaik.",
      image_url: "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?q=80&w=800&auto=format&fit=crop"
    },
    {
      name: "Susu Ultra Milk Coklat 250ml",
      price: 6000,
      category: "Minuman",
      stock: 45,
      description: "Susu UHT rasa coklat lezat yang kaya akan nutrisi dan vitamin.",
      image_url: "https://images.unsplash.com/photo-1550583724-b2692b85b150?q=80&w=800&auto=format&fit=crop" // chocolate milk
    },
    {
      name: "Beras Mentik Wangi Premium 5kg",
      price: 75000,
      category: "Sembako",
      stock: 15,
      description: "Beras premium kualitas super tanpa pemutih dan pengawet. Menghasilkan nasi yang pulen dan wangi.",
      image_url: "https://images.unsplash.com/photo-1586201375761-83865001e8ac?q=80&w=800&auto=format&fit=crop" // bowl of rice
    },
    {
      name: "Minyak Goreng Bimoli 2L",
      price: 35000,
      category: "Sembako",
      stock: 30,
      description: "Minyak goreng kelapa sawit berkualitas tinggi, menghasilkan gorengan yang lebih krispi dan sehat.",
      image_url: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?q=80&w=800&auto=format&fit=crop" // oil
    },
    {
      name: "Telur Ayam Negeri 1kg",
      price: 28000,
      category: "Sembako",
      stock: 10,
      description: "Telur ayam negeri segar langsung dari peternakan. Kaya protein, cocok untuk kebutuhan dapur sehari-hari.",
      image_url: "https://images.unsplash.com/photo-1587486913049-53fc88980fdc?q=80&w=800&auto=format&fit=crop" // eggs
    },
    {
      name: "Gula Pasir Gulaku 1kg",
      price: 16000,
      category: "Sembako",
      stock: 40,
      description: "Gula pasir putih bersih dan manis murni. Pas untuk membuat teh, kopi, maupun aneka kue.",
      image_url: "https://images.unsplash.com/photo-1581428982868-e410dd4fcfa3?q=80&w=800&auto=format&fit=crop" // sugar
    }
  ];

  for (const dummy of dummies) {
    await addDoc(collection(db, "products"), dummy);
    console.log("Added", dummy.name);
  }

  console.log("Finished updating database.");
  process.exit(0);
}

run().catch(console.error);
