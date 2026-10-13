import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, ShoppingCart, AlertCircle } from 'lucide-react';
import { generateDescription } from '../utils/helpers';
import { getFallbackImage } from './Home';

export default function ProductDetail({ products, WA_NUMBER }) {
  const { id } = useParams();
  
  // Scroll to top when entering the page
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  const product = useMemo(() => {
    return products.find(p => p.id === id);
  }, [products, id]);

  if (!product) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '100px 0' }}>
        <h2 style={{fontSize: '24px', marginBottom: '16px'}}>Produk tidak ditemukan</h2>
        <Link to="/" className="btn btn-primary">Kembali ke Beranda</Link>
      </div>
    );
  }

  const stock = product.stock || 0;
  const isAvailable = stock > 0;
  
  const description = generateDescription(product.name, product.category, product.description);
  const imgUrl = product.image_url || getFallbackImage(product.category, product.name);

  const handleOrderWhatsApp = () => {
    const message = `Halo Sekawan Putri Frozen Food, saya ingin memesan:\n\n*${product.name}*\nHarga: Rp ${product.price.toLocaleString('id-ID')}\n\nApakah stoknya masih ada?`;
    const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <>
      <div className="container">
        <div className="detail-container">
          <div className="breadcrumb">
            <Link to="/"><ChevronLeft size={16} /> Kembali ke Katalog</Link>
          </div>

          <div className="detail-grid">
            <div className="detail-image-wrapper">
              <img src={imgUrl} alt={product.name} />
            </div>
            
            <div className="detail-content">
              <div className="detail-category">{product.category || 'Premium Product'}</div>
              <h1 className="detail-title">{product.name}</h1>
              
              <div className="stock-info">
                <div className={`stock-dot ${stock > 10 ? 'high' : (stock > 0 ? 'low' : 'out')}`}></div>
                Status: {isAvailable ? <span style={{color: 'var(--success)'}}>Tersedia</span> : <span style={{color: 'var(--danger)'}}>Habis</span>} 
                <span style={{color: 'var(--border)', margin: '0 8px'}}>|</span> 
                Sisa Stok: {stock} {product.unit ? product.unit.toLowerCase() : (stock % 1 !== 0 ? 'kg' : 'pack')}
              </div>

              <div className="detail-price">Rp {(product.price || 0).toLocaleString('id-ID')}</div>

              <p className="detail-desc">{description}</p>
              
              {!isAvailable && (
                <div style={{padding: '16px', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: '12px', display: 'flex', gap: '12px', alignItems: 'flex-start'}}>
                  <AlertCircle size={24} style={{flexShrink: 0}} />
                  <div style={{fontSize: '14px'}}>
                    <strong>Maaf, stok produk ini sedang kosong.</strong><br/>
                    Silakan cek kembali beberapa hari lagi atau hubungi admin untuk informasi *restock*.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* STICKY BOTTOM BAR (SHOPEE STYLE) */}
      <div className="sticky-bottom-bar">
        <div className="sticky-bottom-inner">
          <div className="detail-title-small" style={{display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden'}}>
            <strong style={{fontSize: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{product.name}</strong>
            <span style={{color: 'var(--primary)', fontWeight: '800', fontSize: '18px'}}>Rp {(product.price || 0).toLocaleString('id-ID')}</span>
          </div>
          <button 
            className="btn btn-whatsapp" 
            onClick={handleOrderWhatsApp}
            disabled={!isAvailable}
          >
            <ShoppingCart size={20} />
            Beli via WhatsApp
          </button>
        </div>
      </div>
    </>
  );
}
