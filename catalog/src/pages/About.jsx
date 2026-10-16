import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Snowflake, HeartHandshake, Tag, MapPin, Clock, ArrowRight } from 'lucide-react';

export default function About({ WA_NUMBER }) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.title = 'Tentang Kami | Sekawan Putri Frozen Food & Sayur Segar Landungsari';
  }, []);

  const values = [
    {
      icon: <Snowflake size={28} />,
      title: 'Kualitas & Kesegaran Terjaga',
      desc: 'Seluruh produk frozen food disimpan pada suhu beku standar industri dan sayur segar dipilih setiap pagi agar tetap segar saat sampai di tangan Anda.'
    },
    {
      icon: <Tag size={28} />,
      title: 'Harga Bersahabat (Ecer & Grosir)',
      desc: 'Kami berkomitmen memberikan harga yang ramah di kantong, baik untuk belanja harian rumah tangga, anak kos, maupun kebutuhan usaha kuliner/katering.'
    },
    {
      icon: <ShieldCheck size={28} />,
      title: 'Produk Halal & Terpercaya',
      desc: 'Hanya menyediakan merek-merek frozen food dan bahan pangan yang sudah terjamin keamanan pangan serta kehalalannya.'
    },
    {
      icon: <HeartHandshake size={28} />,
      title: 'Pelayanan Ramah & Cepat',
      desc: 'Bisa belanja langsung di toko fisik kami di Landungsari atau pesan praktis lewat WhatsApp untuk disiapkan lebih cepat.'
    }
  ];

  return (
    <main className="container about-page">
      {/* HERO HEADER */}
      <div className="about-page-hero">
        <span className="section-tag">Mengenal Lebih Dekat</span>
        <h1 className="about-page-title">Tentang Sekawan Putri</h1>
        <p className="about-page-subtitle">
          Mitra dapur keluarga dan usaha kuliner di Landungsari, Dau, Malang untuk kebutuhan Frozen Food, Sayur Segar, dan Sembako berkualitas setiap hari.
        </p>
      </div>

      {/* MAIN STORY CARD */}
      <div className="about-card" style={{ marginBottom: '48px' }}>
        <div className="about-image">
          <img src="/store.png" alt="Toko Sekawan Putri Landungsari" />
        </div>
        <div className="about-content">
          <span className="section-tag" style={{ marginBottom: '12px' }}>Cerita Kami</span>
          <h2 style={{ fontSize: '28px', color: 'var(--primary)', marginBottom: '20px' }}>
            Hadir untuk Memudahkan Kebutuhan Dapur Harian Anda
          </h2>
          <p style={{ fontSize: '16px', color: 'var(--text-muted)', lineHeight: '1.8', marginBottom: '16px', textAlign: 'justify' }}>
            <strong>Sekawan Putri</strong> adalah penyedia aneka ragam makanan beku (<em>frozen food</em>), sayuran segar, dan bahan pangan pilihan yang praktis, bergizi, dan tentunya lezat. Berlokasi strategis di <strong>Jl. Tirto Rahayu No.12 A, Landungsari, Kec. Dau, Malang</strong>, kami senantiasa berkomitmen untuk menghadirkan produk berkualitas tinggi dengan harga yang bersahabat.
          </p>
          <p style={{ fontSize: '16px', color: 'var(--text-muted)', lineHeight: '1.8', marginBottom: '24px', textAlign: 'justify' }}>
            Misi kami adalah memastikan setiap keluarga, mahasiswa, hingga pelaku UMKM kuliner dapat menyajikan hidangan istimewa dengan mudah, cepat, dan aman setiap harinya. Kualitas produk dan kepuasan pelanggan adalah prioritas utama kami dalam melayani setiap kebutuhan dapur Anda.
          </p>

          <div className="about-store-badges">
            <a 
              href="https://maps.app.goo.gl/FgBaBnbaE3YQo9jH7" 
              target="_blank" 
              rel="noreferrer"
              className="about-store-badge"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <MapPin size={18} />
              <span>Jl. Tirto Rahayu No.12 A, Dau (Buka di Maps &rarr;)</span>
            </a>
            <div className="about-store-badge">
              <Clock size={18} />
              <span>Buka Setiap Hari: 08.00 – 20.00 WIB</span>
            </div>
          </div>
        </div>
      </div>

      {/* KEUNGGULAN / VALUES */}
      <section className="about-values-section">
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <span className="section-tag">Keunggulan Kami</span>
          <h2 style={{ fontSize: '28px', color: 'var(--primary)' }}>Mengapa Belanja di Sekawan Putri?</h2>
        </div>

        <div className="about-values-grid">
          {values.map((item, idx) => (
            <div key={idx} className="about-value-card">
              <div className="about-value-icon">{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="about-cta-card">
        <div>
          <h2>Siap Belanja Kebutuhan Dapur Hari Ini?</h2>
          <p>Cek katalog lengkap produk kami atau hubungi admin via WhatsApp untuk tanya stok & pemesanan cepat.</p>
        </div>
        <div className="about-cta-actions">
          <Link to="/" className="btn btn-primary">
            Lihat Katalog Produk <ArrowRight size={18} />
          </Link>
          <a
            href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Halo Sekawan Putri, saya ingin tanya stok produk...')}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-outline-primary"
          >
            Chat via WhatsApp
          </a>
        </div>
      </section>
    </main>
  );
}
