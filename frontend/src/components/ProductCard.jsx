import React from 'react';
import { Image as ImageIcon } from 'lucide-react';

import SosisIcon from '../assets/placeholders/Sosis.svg';
import NuggetIcon from '../assets/placeholders/Nugget.svg';
import BaksoIcon from '../assets/placeholders/Bakso.svg';
import SeafoodIcon from '../assets/placeholders/Seafood.svg';
import DagingIcon from '../assets/placeholders/Daging.svg';
import DumplingIcon from '../assets/placeholders/Dumpling.svg';
import RotiIcon from '../assets/placeholders/Roti.svg';
import SayuranIcon from '../assets/placeholders/Sayuran.svg';
import DefaultIcon from '../assets/placeholders/Default.svg';

const getPlaceholder = (category) => {
  const cat = category?.toLowerCase() || '';
  if (cat.includes('sosis')) return SosisIcon;
  if (cat.includes('nugget')) return NuggetIcon;
  if (cat.includes('bakso')) return BaksoIcon;
  if (cat.includes('seafood') || cat.includes('ikan')) return SeafoodIcon;
  if (cat.includes('daging') || cat.includes('beef')) return DagingIcon;
  if (cat.includes('dumpling') || cat.includes('dimsum')) return DumplingIcon;
  if (cat.includes('roti') || cat.includes('pao')) return RotiIcon;
  if (cat.includes('sayur') || cat.includes('kentang')) return SayuranIcon;
  return DefaultIcon;
};

export default function ProductCard({ product, onAdd }) {
  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock <= 10 && product.stock > 0;
  const imageSrc = product.image_url || getPlaceholder(product.category);

  const hasDiscount = product.discount > 0 && product.category !== 'Sayur';
  const discountedPrice = hasDiscount ? product.price - (product.price * (product.discount / 100)) : product.price;

  const handleAdd = () => {
    if (isOutOfStock) return;
    onAdd(product);
  };

  return (
    <div 
      className="card" 
      style={{ padding: '0', overflow: 'hidden', cursor: isOutOfStock ? 'not-allowed' : 'pointer', position: 'relative', display: 'flex', flexDirection: 'column' }}
      onClick={handleAdd}
    >
      <div style={{ position: 'relative', width: '100%', paddingTop: '100%', backgroundColor: 'var(--background)' }}>
        <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 2, display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
          {hasDiscount && (
            <span className="badge" style={{ backgroundColor: 'var(--danger)', color: 'white', boxShadow: 'var(--shadow-sm)', fontWeight: 'bold' }}>
              Disc {product.discount}%
            </span>
          )}
          {isOutOfStock ? (
             <span className="badge badge-danger" style={{ boxShadow: 'var(--shadow-sm)' }}>Habis</span>
          ) : isLowStock ? (
             <span className="badge badge-danger" style={{ boxShadow: 'var(--shadow-sm)', maxWidth: 'calc(100vw - 32px)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Sisa: {product.stock}</span>
          ) : (
             <span className="badge" style={{ backgroundColor: 'rgba(255,255,255,0.95)', color: 'var(--text)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
               Stok: {product.stock} {product.unit || ''}
             </span>
          )}
        </div>
        <img 
          src={imageSrc} 
          alt={product.name} 
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => {
            e.target.style.opacity = 0;
            e.target.nextSibling.style.display = 'flex';
          }}
          onLoad={(e) => {
            e.target.style.opacity = 1;
            e.target.nextSibling.style.display = 'none';
          }}
        />
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'none', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          <ImageIcon size={32} />
        </div>
        
        {isOutOfStock && (
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.5)' }}></div>
        )}
      </div>
      
      <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ marginBottom: '8px' }}>
          <span className="badge" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', marginBottom: '6px', display: 'inline-block', fontSize: '10px' }}>
            {product.category || 'Frozen Food'}
          </span>
          <h3 style={{ fontSize: '14px', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.4' }}>
            {product.name}
          </h3>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {hasDiscount && (
            <span style={{ fontSize: '12px', textDecoration: 'line-through', color: 'var(--text-muted)' }}>
              Rp {(product.price || 0).toLocaleString('id-ID')}
            </span>
          )}
          <div style={{ fontWeight: '700', color: hasDiscount ? 'var(--danger)' : 'var(--primary)', fontSize: '15px' }}>
            {product.category === 'Sayur' ? (
              <span style={{ fontSize: '13px', fontStyle: 'italic', color: 'var(--text-muted)' }}>Input Manual</span>
            ) : (
              `Rp ${discountedPrice.toLocaleString('id-ID')}`
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
