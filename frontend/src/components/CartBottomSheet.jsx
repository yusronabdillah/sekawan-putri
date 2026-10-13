import React from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, Plus, Minus } from 'lucide-react';
import { useCartStore } from '../store/store';
import CustomSelect from './CustomSelect';

const convertToDisplay = (qty, baseUnit, targetUnit) => {
  if (qty === '') return '';
  if (baseUnit === targetUnit || !targetUnit) return qty;
  let v = Number(qty);
  if (baseUnit === 'Kg') {
    if (targetUnit === 'Ons') v = v * 10;
    if (targetUnit === 'Gram') v = v * 1000;
  }
  if (baseUnit === 'Gram') {
    if (targetUnit === 'Kg') v = v / 1000;
    if (targetUnit === 'Ons') v = v / 100;
  }
  return parseFloat(v.toPrecision(12));
};

const convertToActual = (inputQty, baseUnit, targetUnit) => {
  if (baseUnit === targetUnit || !targetUnit) return inputQty;
  let v = Number(inputQty);
  if (baseUnit === 'Kg') {
    if (targetUnit === 'Ons') v = v / 10;
    if (targetUnit === 'Gram') v = v / 1000;
  }
  if (baseUnit === 'Gram') {
    if (targetUnit === 'Kg') v = v * 1000;
    if (targetUnit === 'Ons') v = v * 100;
  }
  return v;
};

export default function CartBottomSheet({ isOpen, onClose, onCheckout }) {
  const { cart, updateQty, removeFromCart, getTotal } = useCartStore();
  const total = getTotal();

  if (!isOpen) return null;

  const content = (
    <>
      <div 
        className="animate-fade-in"
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 40,
          backdropFilter: 'blur(2px)'
        }}
        onClick={onClose}
      />
      <div 
        className="animate-slide-up-sheet"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'var(--surface)',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          zIndex: 41,
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '85vh',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.1)'
        }}
      >
        {/* Drag Handle Area */}
        <div 
          onClick={onClose}
          style={{ 
            padding: '16px', 
            display: 'flex', 
            justifyContent: 'center', 
            cursor: 'pointer' 
          }}
        >
          <div style={{ width: '40px', height: '6px', backgroundColor: 'var(--border)', borderRadius: '4px' }} />
        </div>

        {/* Header */}
        <div className="flex justify-between items-center" style={{ padding: '0 20px 16px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Keranjang Belanja</h2>
          <button className="btn-icon" onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={24} />
          </button>
        </div>

        {/* Item List (Scrollable) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {cart.length === 0 ? (
            <div className="animate-fade-in" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
              Keranjang kosong
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {cart.map((item) => (
                <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '16px', borderBottom: '1px dashed var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: '15px' }}>{item.name}</div>
                      <div className="number-transition" style={{ color: 'var(--primary)', fontWeight: '600', fontSize: '14px', marginTop: '4px' }}>
                        Rp {((item.price - (item.price * (item.discount || 0) / 100)) * Number(item.qty || 0)).toLocaleString('id-ID')}
                      </div>
                    </div>
                    
                    {/* Qty Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {item.qty === 0 || item.qty <= 1 ? (
                        <button 
                          className="btn-icon" 
                          onClick={() => removeFromCart(item.id)} 
                          style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', borderRadius: '8px', width: '32px', height: '32px', transition: 'all 0.2s ease' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : (
                        <button 
                          className="btn-icon btn-outline" 
                          onClick={() => updateQty(item.id, Number(item.qty) - 1)}
                          style={{ borderRadius: '8px', width: '32px', height: '32px', border: '1px solid var(--border)', transition: 'all 0.2s ease' }}
                        >
                          <Minus size={16} />
                        </button>
                      )}
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input 
                          type="number"
                          className="form-input"
                          style={{ 
                            width: '72px', 
                            padding: '6px', 
                            textAlign: 'center', 
                            fontWeight: '700', 
                            fontSize: '15px'
                          }}
                          value={convertToDisplay(item.qty, item.unit, item.cartUnit || item.unit)}
                          step={((item.cartUnit || item.unit) === 'Kg' || item.category === 'Sayur') ? "0.01" : "1"}
                          min="0"
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '') {
                              updateQty(item.id, '');
                            } else {
                              const cartU = item.cartUnit || item.unit;
                              let parsedVal = val;
                              if (item.unit !== cartU) {
                                parsedVal = convertToActual(val, item.unit, cartU);
                              }
                              
                              if (Number(parsedVal) > item.stock) {
                                alert(`Sisa stok tinggal ${item.stock} ${item.unit}`);
                              }
                              
                              if (item.unit === cartU) {
                                updateQty(item.id, val);
                              } else {
                                updateQty(item.id, parsedVal);
                              }
                            }
                          }}
                        />
                        {(item.unit === 'Kg' || item.unit === 'Gram') && (
                          <div style={{ width: '90px' }}>
                            <CustomSelect
                              value={item.cartUnit || item.unit}
                              onChange={(val) => {
                                const { updateCartUnit } = useCartStore.getState();
                                updateCartUnit(item.id, val);
                              }}
                              options={[
                                { value: 'Kg', label: 'Kg' },
                                { value: 'Ons', label: 'Ons' },
                                { value: 'Gram', label: 'Gram' }
                              ]}
                              searchable={false}
                              dropdownPosition="top"
                              portal={true}
                            />
                          </div>
                        )}
                      </div>
                      
                      <button 
                        className="btn-icon btn-outline" 
                        onClick={() => updateQty(item.id, Number(item.qty || 0) + 1)}
                        style={{ borderRadius: '8px', width: '32px', height: '32px', border: '1px solid var(--primary)', color: 'var(--primary)', backgroundColor: 'var(--primary-light)', transition: 'all 0.2s ease' }}
                        disabled={item.qty >= item.stock}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Discount Indicator */}
                  {item.discount > 0 && item.category !== 'Sayur' && (
                    <div style={{ marginTop: '4px' }}>
                      <span className="badge" style={{ backgroundColor: 'var(--danger)', color: 'white', fontSize: '10px' }}>
                        Disc {item.discount}%
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', backgroundColor: 'var(--background)' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
              <span className="number-transition" style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: '600' }}>
                Total {cart.reduce((sum, item) => sum + Number(item.qty || 0), 0)} Item
              </span>
              <span className="number-transition" style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary)' }}>
                Rp {cart.reduce((sum, item) => sum + ((item.price - (item.price * (item.discount || 0) / 100)) * Number(item.qty || 0)), 0).toLocaleString('id-ID')}
              </span>
            </div>
            
            <button 
              className="btn btn-primary btn-block" 
              onClick={onCheckout}
              style={{ minHeight: '56px', fontSize: '16px', fontWeight: '700', borderRadius: '12px' }}
            >
              Lanjut ke Pembayaran
            </button>
          </div>
        )}
      </div>
    </>
  );

  return createPortal(content, document.body);
}
