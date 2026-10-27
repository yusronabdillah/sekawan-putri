import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'sekawan-auth-storage', // saves in localStorage
    }
  )
);

export const useCartStore = create((set, get) => ({
  cart: [],
  addToCart: (product, customQty = 1, customCartUnit = null) => {
    const cart = get().cart;
    const existing = cart.find((item) => item.id === product.id);
    
    if (existing) {
      if (existing.qty + customQty > product.stock) {
        // cannot exceed stock
        return false;
      }
      set({
        cart: cart.map((item) => 
          item.id === product.id ? { ...item, qty: item.qty + customQty, cartUnit: customCartUnit || item.cartUnit } : item
        )
      });
    } else {
      if (product.stock < customQty) return false;
      set({ cart: [...cart, { ...product, qty: customQty, cartUnit: customCartUnit || product.unit }] });
    }
    return true;
  },
  updateQty: (id, qty) => {
    // Allow empty string or 0 for typing decimals, remove only if strictly negative or explicit remove
    if (qty < 0) {
      set({ cart: get().cart.filter(item => item.id !== id) });
    } else {
      set({
        cart: get().cart.map((item) => {
          if (item.id === id) {
            let newQty = qty;
            // Cap qty to available stock if typing a number
            if (newQty !== '' && Number(newQty) > item.stock) {
              newQty = item.stock;
            }
            return { ...item, qty: newQty };
          }
          return item;
        })
      });
    }
  },
  updateDiscount: (id, discount) => {
    set({
      cart: get().cart.map((item) => 
        item.id === id ? { ...item, discount: Number(discount) || 0 } : item
      )
    });
  },
  updateCartUnit: (id, cartUnit) => {
    set({
      cart: get().cart.map((item) => 
        item.id === id ? { ...item, cartUnit } : item
      )
    });
  },
  removeFromCart: (id) => set({ cart: get().cart.filter((item) => item.id !== id) }),
  clearCart: () => set({ cart: [] }),
  getTotal: () => get().cart.reduce((total, item) => total + ((item.price - (item.price * (item.discount || 0) / 100)) * item.qty), 0)
}));

export const usePrinterStore = create(
  persist(
    (set) => ({
      config: {
        printMethod: 'browser', // 'browser' (Standard PC/Laptop) or 'rawbt' (RawBT Direct Android)
        paperSize: '58', // '58' or '80'
        showLogo: true,
        showAddress: true,
        footerText: 'Terima kasih telah berbelanja\nSimpan struk ini sebagai\nbukti pembayaran',
        autoPrint: false,
        copies: 1,
        marginTop: 0,
        marginBottom: 10,
        fontSize: 'normal', // 'normal' or 'compact'
      },
      updateConfig: (newConfig) => set((state) => ({ config: { ...state.config, ...newConfig } }))
    }),
    {
      name: 'sekawan-printer-config',
    }
  )
);

export const useCategoryStore = create(
  persist(
    (set) => ({
      categories: [
        'Frozen Food', 
        'Sayur', 
        'Buah', 
        'Bumbu Dapur', 
        'Sembako', 
        'Minuman', 
        'Ice Cream', 
        'Kebutuhan Rumah'
      ],
      parentMapping: {
        'Frozen Food': 'Kategori A',
        'Minuman': 'Kategori A',
        'Sembako': 'Kategori A',
        'Kebutuhan Rumah': 'Kategori A',
        'Sayur': 'Kategori B',
        'Buah': 'Kategori B',
        'Bumbu Dapur': 'Kategori B',
        'Ice Cream': 'Kategori B'
      },
      addCategory: (cat, parent = 'Kategori A') => set((state) => {
        if (!state.categories.includes(cat)) {
          return { 
            categories: [...state.categories, cat],
            parentMapping: { ...state.parentMapping, [cat]: parent }
          };
        }
        return state;
      }),
      removeCategory: (cat) => set((state) => {
        const newMapping = { ...state.parentMapping };
        delete newMapping[cat];
        return {
          categories: state.categories.filter((c) => c !== cat),
          parentMapping: newMapping
        };
      })
    }),
    {
      name: 'sekawan-category-storage-v2',
      merge: (persistedState, currentState) => {
        const validCategories = currentState.categories;
        const persistedCats = persistedState?.categories?.filter(c => c !== 'Endog') || [];
        const mergedCategories = Array.from(new Set([...validCategories, ...persistedCats]));
        
        return {
          ...currentState,
          ...persistedState,
          categories: mergedCategories,
          parentMapping: {
            ...currentState.parentMapping,
            ...(persistedState?.parentMapping || {})
          }
        };
      }
    }
  )
);

export const useBillScheduleStore = create(
  persist(
    (set) => ({
      schedules: [
        { id: '1', name: 'Gaji Bulanan', type: 'Bulanan', day: 1 },
        { id: '2', name: 'Wifi', type: 'Bulanan', day: 25 },
        { id: '3', name: 'Listrik', type: 'Bulanan', day: 20 }
      ],
      addSchedule: (schedule) => set((state) => ({ schedules: [...state.schedules, schedule] })),
      updateSchedule: (id, schedule) => set((state) => ({
        schedules: state.schedules.map(s => s.id === id ? { ...s, ...schedule } : s)
      })),
      removeSchedule: (id) => set((state) => ({
        schedules: state.schedules.filter(s => s.id !== id)
      }))
    }),
    {
      name: 'sekawan-billschedule-config',
    }
  )
);
