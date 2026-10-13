import React from 'react';
import { 
  Beef, Carrot, CupSoda, Drumstick, Egg, Fish, 
  IceCream, Leaf, Pizza, ShoppingBasket, Soup, Wheat
} from 'lucide-react';

export default function ProductIllustration({ name, category, size = 'sm' }) {
  const n = (name || '').toLowerCase();
  const c = (category || '').toLowerCase();

  let Icon = ShoppingBasket;
  let bg = '#F3F4F6'; // Default Gray
  let color = '#6B7280'; 

  if (n.includes('sapi') || n.includes('beef') || c.includes('daging')) {
    Icon = Beef; bg = '#FEE2E2'; color = '#EF4444'; // Red
  } else if (n.includes('ayam') || n.includes('chicken') || n.includes('karage') || n.includes('nugget')) {
    Icon = Drumstick; bg = '#FEF3C7'; color = '#F59E0B'; // Amber/Orange
  } else if (n.includes('ikan') || n.includes('fish') || n.includes('seafood') || n.includes('udang') || n.includes('tempura')) {
    Icon = Fish; bg = '#E0F2FE'; color = '#0EA5E9'; // Blue
  } else if (c.includes('sayur') || n.includes('kentang') || n.includes('jagung') || n.includes('wortel')) {
    Icon = Carrot; bg = '#DCFCE7'; color = '#22C55E'; // Green
  } else if (n.includes('dimsum') || n.includes('bakpao') || n.includes('siomay') || n.includes('dumpling')) {
    Icon = Soup; bg = '#FFEDD5'; color = '#F97316'; // Orange
  } else if (n.includes('bakso') || n.includes('sosis')) {
    Icon = Egg; bg = '#FCE7F3'; color = '#EC4899'; // Pink
  } else if (c.includes('minuman') || n.includes('es') || n.includes('kopi') || n.includes('teh')) {
    Icon = CupSoda; bg = '#CFFAFE'; color = '#06B6D4'; // Cyan
  } else if (n.includes('es krim') || n.includes('ice cream')) {
    Icon = IceCream; bg = '#F3E8FF'; color = '#A855F7'; // Purple
  } else if (c.includes('frozen food') || n.includes('pizza') || n.includes('kebab')) {
    Icon = Pizza; bg = '#FFE4E6'; color = '#F43F5E'; // Rose
  } else if (c.includes('sembako') || n.includes('beras') || n.includes('gandum') || n.includes('roti')) {
    Icon = Wheat; bg = '#FEF9C3'; color = '#EAB308'; // Yellow
  } else if (c.includes('bumbu') || n.includes('daun')) {
    Icon = Leaf; bg = '#D1FAE5'; color = '#10B981'; // Emerald
  }

  // Size configurations
  const dimensions = {
    sm: { box: 56, icon: 28, radius: 14 },
    lg: { box: 120, icon: 60, radius: 24 }
  };
  
  const dim = dimensions[size] || dimensions.sm;

  return (
    <div style={{
      width: dim.box,
      height: dim.box,
      minWidth: dim.box,
      backgroundColor: bg,
      color: color,
      borderRadius: dim.radius,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
    }}>
      <Icon size={dim.icon} strokeWidth={1.5} />
    </div>
  );
}
