import React, { useEffect, useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useCartStore, useCategoryStore, useAuthStore } from '../store/store';
import ProductCard from '../components/ProductCard';
import CheckoutModal from '../components/CheckoutModal';
import CartBottomSheet from '../components/CartBottomSheet';
import { Search, ShoppingBag, X, ShoppingCart, RefreshCw, User, Calendar } from 'lucide-react';
import { AppDialog, AppInput, AppCombobox, AppButton, PageHeader } from '../components/ui';
import CustomSelect from '../components/CustomSelect';

export default function POS() {
  const liveProducts = useLiveQuery(() => db.products.toArray(), null);
  const isLoading = liveProducts === null;
  const allProducts = useMemo(() => {
    if (!liveProducts) return [];
    return [...liveProducts].sort((a, b) => (a.sku || a.id || '').localeCompare(b.sku || b.id || ''));
  }, [liveProducts]);
  const [search, setSearch] = useState('');
  const { user } = useAuthStore();
  
  const today = new Date().toLocaleDateString('id-ID', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const [parentCategory, setParentCategory] = useState('Semua'); // 'Semua', 'Kategori A', 'Kategori B'
  const [filterCategory, setFilterCategory] = useState('Semua');
  const { categories, parentMapping = {} } = useCategoryStore();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isCartSheetOpen, setIsCartSheetOpen] = useState(false);
  const [sayurModal, setSayurModal] = useState({ isOpen: false, product: null, qty: '1', price: '', unit: 'Pcs' });
  
  const { cart, addToCart, clearCart, getTotal } = useCartStore();
  const total = getTotal();

  const products = useMemo(() => {
    let data = allProducts;
    
    // Parent filter
    if (parentCategory !== 'Semua') {
      const allowedCats = categories.filter(c => (parentMapping[c] || 'Kategori A') === parentCategory);
      data = data.filter(p => allowedCats.includes(p.category));
    }

    // Sub filter
    if (filterCategory !== 'Semua') {
      data = data.filter(p => p.category === filterCategory);
    }
    
    if (search) {
      const lowerSearch = search.toLowerCase();
      data = data.filter(p => 
        p.name.toLowerCase().includes(lowerSearch) ||
        (p.barcode && p.barcode.toLowerCase().includes(lowerSearch))
      );
    }
    return data;
  }, [search, filterCategory, parentCategory, allProducts, categories, parentMapping]);

  // Handle Edit Pesanan from Checkout Modal
  const handleEditPesanan = () => {
    setIsCheckoutOpen(false);
    setIsCartSheetOpen(true);
  };

  const handleCheckoutClick = () => {
    setIsCartSheetOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleProductClick = (product) => {
    if (!product.price || product.price <= 0) {
      setSayurModal({ isOpen: true, product, qty: '1', price: '', unit: product.unit || 'Pcs' });
    } else if (['Sayur', 'Buah', 'Bumbu Dapur'].includes(product.category) && product.unit === 'Kg') {
      setSayurModal({ isOpen: true, product, qty: '1', price: product.price.toString(), unit: 'Kg' });
    } else {
      addToCart(product);
    }
  };

  const handleSayurSubmit = () => {
    if (!sayurModal.product) return;
    let qtyNum = parseFloat(sayurModal.qty);
    const priceNum = parseInt(String(sayurModal.price).replace(/\D/g, ''), 10);
    if (!isNaN(qtyNum) && qtyNum > 0 && !isNaN(priceNum) && priceNum > 0) {
      if (sayurModal.product.price > 0 && (sayurModal.unit === 'Kg' || sayurModal.unit === 'Ons' || sayurModal.unit === 'Gram')) {
        if (sayurModal.unit === 'Gram') {
          qtyNum = qtyNum / 1000;
        } else if (sayurModal.unit === 'Ons') {
          qtyNum = qtyNum / 10;
        }
        const customProduct = { ...sayurModal.product, price: sayurModal.product.price }; 
        addToCart(customProduct, qtyNum, sayurModal.unit);
      } else {
        // Manual price input for products with price === 0
        const effectiveUnitPrice = Math.round(priceNum / qtyNum);
        const customProduct = { ...sayurModal.product, price: effectiveUnitPrice };
        addToCart(customProduct, qtyNum, sayurModal.unit);
      }
      setSayurModal({ isOpen: false, product: null, qty: '1', price: '', unit: 'Pcs' });
    }
  };

  const handleSayurUnitChange = (newUnit, newQty) => {
    if (!sayurModal.product) return;
    const qty = parseFloat(newQty || 0);
    let basePricePerKg = sayurModal.product.price || 0;
    
    if (basePricePerKg <= 0) {
      setSayurModal({ ...sayurModal, unit: newUnit, qty: newQty });
      return;
    }

    let calculatedPrice = 0;
    if (newUnit === 'Kg' || newUnit === 'Pcs') calculatedPrice = basePricePerKg * qty;
    else if (newUnit === 'Ons') calculatedPrice = (basePricePerKg / 10) * qty;
    else if (newUnit === 'Gram') calculatedPrice = (basePricePerKg / 1000) * qty;

    setSayurModal({ ...sayurModal, unit: newUnit, qty: newQty, price: Math.round(calculatedPrice).toString() });
  };

  return (
    <>
      <AppDialog 
        isOpen={sayurModal.isOpen} 
        onClose={() => setSayurModal({ ...sayurModal, isOpen: false })}
        title={`Input Pesanan: ${sayurModal.product?.name}`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="form-label">Satuan</label>
            <CustomSelect
              value={sayurModal.unit} 
              onChange={val => handleSayurUnitChange(val, sayurModal.qty)}
              options={[
                { value: 'Pcs', label: 'Pcs / Pack' },
                { value: 'Kg', label: 'Kg' },
                { value: 'Ons', label: 'Ons' },
                { value: 'Gram', label: 'Gram' }
              ]}
              searchable={false}
              portal={true}
            />
          </div>
          <div>
            <label className="form-label">Kuantitas / Berat (Sesuai Satuan)</label>
            <AppInput 
              type="number" 
              step="any"
              value={sayurModal.qty} 
              onChange={e => handleSayurUnitChange(sayurModal.unit, e.target.value)} 
              placeholder="Contoh: 1" 
            />
          </div>
          <div>
            <label className="form-label">Total Harga (Rp)</label>
            <AppInput 
              type="text" 
              inputMode="numeric"
              value={sayurModal.price ? Number(String(sayurModal.price).replace(/\D/g, '') || 0).toLocaleString('id-ID') : ''} 
              onChange={e => setSayurModal({ ...sayurModal, price: e.target.value.replace(/\D/g, '') })}
              placeholder="Masukkan nominal harga (Rp)" 
            />
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
            <AppButton variant="outline" onClick={() => setSayurModal({ ...sayurModal, isOpen: false })}>Batal</AppButton>
            <AppButton onClick={handleSayurSubmit}>Tambahkan</AppButton>
          </div>
        </div>
      </AppDialog>

      <div className="flex flex-col page-transition">
        <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--background)', margin: '-16px -16px 16px -16px', padding: '16px 16px 0 16px' }}>
          <PageHeader 
            title="Kasir" 
            subtitle={`Pilih produk dan catat pesanan pelanggan.`}
            icon={ShoppingCart} 
            actions={
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--primary-light)', padding: '4px 10px', borderRadius: '100px', border: '1px solid rgba(74, 29, 36, 0.1)' }}>
                  <User size={14} color="var(--primary)" />
                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--primary)' }}>Kasir: {user?.username || user?.name || 'Admin'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                  <Calendar size={14} />
                  <span style={{ fontSize: '13px', fontWeight: '500' }}>{today}</span>
                </div>
              </div>
            }
          />
          
          {/* Parent Categories */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            {['Semua', 'Kategori A', 'Kategori B'].map(cat => (
              <button 
                key={cat}
                style={{ 
                  padding: '6px 16px', 
                  cursor: 'pointer', 
                  border: '1px solid var(--border)',
                  backgroundColor: parentCategory === cat ? 'var(--primary)' : 'var(--surface)',
                  color: parentCategory === cat ? 'white' : 'var(--text-main)',
                  fontSize: '14px',
                  fontWeight: parentCategory === cat ? '600' : '500',
                  borderRadius: 'var(--radius-full)',
                  whiteSpace: 'nowrap'
                }}
                onClick={() => {
                  setParentCategory(cat);
                  setFilterCategory('Semua'); // reset sub category when parent changes
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Sub Categories */}
          {parentCategory !== 'Semua' && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <button 
                style={{ 
                  padding: '4px 12px', cursor: 'pointer', border: '1px solid var(--border)',
                  backgroundColor: filterCategory === 'Semua' ? 'var(--primary-light)' : 'var(--surface)',
                  color: filterCategory === 'Semua' ? 'var(--primary)' : 'var(--text-main)',
                  fontSize: '13px', fontWeight: filterCategory === 'Semua' ? '600' : '500',
                  borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap'
                }}
                onClick={() => setFilterCategory('Semua')}
              >
                Semua {parentCategory}
              </button>
              {categories.filter(cat => (parentMapping[cat] || 'Kategori A') === parentCategory).map(cat => (
                <button 
                  key={cat}
                  style={{ 
                    padding: '4px 12px', cursor: 'pointer', border: '1px solid var(--border)',
                    backgroundColor: filterCategory === cat ? 'var(--primary-light)' : 'var(--surface)',
                    color: filterCategory === cat ? 'var(--primary)' : 'var(--text-main)',
                    fontSize: '13px', fontWeight: filterCategory === cat ? '600' : '500',
                    borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap'
                  }}
                  onClick={() => setFilterCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          <div className="search-bar" style={{ marginBottom: '16px' }}>
            <Search size={20} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="Cari produk atau scan barcode..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            {search && <X size={20} color="var(--text-muted)" onClick={() => setSearch('')} style={{cursor:'pointer'}}/>}
          </div>
        </div>

        <div className="product-grid" style={{ paddingBottom: cart.length > 0 ? '100px' : '20px' }}>
          {isLoading ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <span className="animate-spin" style={{ display: 'inline-block', marginBottom: '12px' }}><RefreshCw size={24} /></span>
              <div>Memuat daftar produk...</div>
            </div>
          ) : products.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Produk tidak ditemukan
            </div>
          ) : (
            products.map(p => (
              <ProductCard 
                key={p.id} 
                product={p} 
                onAdd={handleProductClick}
              />
            ))
          )}
        </div>
      </div>

      {/* MINI CART (FLOATING) */}
      {cart.length > 0 && (
        <div className="animate-slide-up-centered" style={{ 
          position: 'fixed', 
          bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))', 
          left: '50%', 
          transform: 'translateX(-50%)', 
          width: '90%', 
          maxWidth: '480px',
          height: '72px',
          backgroundColor: 'var(--primary)',
          color: 'white',
          padding: '0 20px',
          borderRadius: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: 'var(--shadow-lg)',
          cursor: 'pointer',
          zIndex: 30
        }} onClick={() => setIsCartSheetOpen(true)}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', overflow: 'hidden' }}>
            <div style={{ 
              width: '40px', height: '40px', 
              borderRadius: '50%', 
              backgroundColor: 'rgba(255,255,255,0.2)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <ShoppingBag size={20} />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div style={{ fontWeight: '700', fontSize: '15px' }}>
                {cart.reduce((sum, item) => sum + item.qty, 0)} Item
              </div>
              <div style={{ 
                fontSize: '12px', 
                opacity: 0.9, 
                whiteSpace: 'nowrap', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis',
                maxWidth: '180px'
              }}>
                {cart.length <= 2 
                  ? cart.map(i => i.name).join(', ')
                  : `${cart[0].name}, ${cart[1].name} +${cart.length - 2} lainnya`
                }
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
            <div style={{ fontWeight: '800', fontSize: '16px' }}>
              Rp {(total || 0).toLocaleString('id-ID')}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.8, fontWeight: '500' }}>
              Lihat Keranjang &rarr;
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM SHEET KERANJANG */}
      <CartBottomSheet 
        isOpen={isCartSheetOpen}
        onClose={() => setIsCartSheetOpen(false)}
        onCheckout={handleCheckoutClick}
      />

      {/* CHECKOUT MODAL */}
      {isCheckoutOpen && (
        <CheckoutModal 
          isOpen={isCheckoutOpen} 
          onClose={() => setIsCheckoutOpen(false)}
          onEditPesanan={handleEditPesanan}
          cart={cart} 
          total={total} 
          clearCart={clearCart} 
        />
      )}


    </>
  );
}
