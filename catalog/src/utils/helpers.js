// Fungsi untuk membuat deskripsi otomatis yang realistis berdasarkan nama/kategori
export const generateDescription = (name, category, description) => {
  // Jika deskripsi sudah ada dari database dan panjangnya cukup, gunakan deskripsi asli
  if (description && description.length > 10) return description;

  const n = (name || '').toLowerCase();
  const c = (category || '').toLowerCase();

  if (n.includes('dimsum') || c.includes('dimsum')) {
    return `${name} premium dengan bahan daging pilihan. Memiliki tekstur kenyal, padat, dan rasa gurih yang lezat. Sangat cocok disajikan hangat sebagai cemilan keluarga di rumah.`;
  }
  
  if (n.includes('nugget') || c.includes('nugget') || n.includes('karage')) {
    return `${name} berkualitas tinggi dengan balutan tepung renyah (crispy) di luar dan daging yang lembut di dalam. Praktis untuk bekal anak atau hidangan cepat saji kapan saja.`;
  }

  if (n.includes('sosis') || c.includes('sosis')) {
    return `${name} pilihan dengan rasa daging yang kuat, juicy, dan tekstur yang pas. Dapat digoreng, dibakar, atau dijadikan bahan pelengkap untuk berbagai macam masakan Anda.`;
  }

  if (n.includes('bakso') || c.includes('bakso')) {
    return `${name} sapi asli dengan tekstur kenyal dan rasa kaldu yang kaya. Cocok untuk dibuat kuah bakso, campuran sup, mie goreng, atau dibakar dengan bumbu kecap pedas.`;
  }
  
  if (n.includes('kentang') || c.includes('kentang')) {
    return `${name} pilihan yang dipotong sempurna. Digoreng renyah di luar namun tetap lembut di dalam. Pas disajikan bersama saus sambal atau mayones favorit keluarga.`;
  }

  if (c.includes('sayur')) {
    return `${name} segar pilihan yang dikemas higienis untuk menjaga kualitas dan nutrisinya. Memudahkan Anda dalam menyiapkan hidangan sehat untuk keluarga tercinta setiap hari.`;
  }
  
  if (c.includes('minuman')) {
    return `${name} segar yang diracik khusus untuk menyegarkan hari Anda. Dibuat dari bahan-bahan berkualitas untuk menghasilkan rasa yang nikmat dan memuaskan dahaga.`;
  }

  // Fallback umum
  return `Produk ${name} berkualitas terbaik dari Sekawan Putri Frozen Food. Dikemas dengan higienis untuk memastikan kesegaran dan cita rasa aslinya tetap terjaga hingga sampai ke tangan Anda.`;
};
