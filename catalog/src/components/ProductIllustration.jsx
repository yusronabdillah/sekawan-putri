import React from 'react';
import { 
  Beef, Carrot, CupSoda, Drumstick, Egg, Fish, 
  IceCream, Leaf, Pizza, ShoppingBasket, Soup, Wheat, Flame, Apple, Package
} from 'lucide-react';

export default function ProductIllustration({ name, category, size = 'fill' }) {
  const n = (name || '').toLowerCase();
  const c = (category || '').toLowerCase();

  let Icon = ShoppingBasket;
  let bg = '#FDF8F5';
  let circleBg = '#FADADD';
  let color = '#4A1D24';

  if (c === 'buah' || n.includes('nanas') || n.includes('jeruk') || n.includes('lemon') || n.includes('apel') || n.includes('semangka')) {
    Icon = Apple; bg = '#FFF7ED'; circleBg = '#FFEDD5'; color = '#EA580C';
  } else if (n.includes('sapi') || n.includes('beef') || n.includes('daging') || n.includes('kornet')) {
    Icon = Beef; bg = '#FFF5F5'; circleBg = '#FEE2E2'; color = '#B91C1C';
  } else if (n.includes('ayam') || n.includes('chicken') || n.includes('karage') || n.includes('nugget') || n.includes('wings')) {
    Icon = Drumstick; bg = '#FFFBEB'; circleBg = '#FEF3C7'; color = '#B45309';
  } else if (n.includes('ikan') || n.includes('fish') || n.includes('seafood') || n.includes('crab') || n.includes('kepiting') || n.includes('odeng') || n.includes('sarden') || n.includes('tongkol') || n.includes('pindang')) {
    Icon = Fish; bg = '#F0F9FF'; circleBg = '#E0F2FE'; color = '#0369A1';
  } else if (n.includes('telur')) {
    Icon = Egg; bg = '#FEFCE8'; circleBg = '#FEF08A'; color = '#A16207';
  } else if (c === 'ice cream' || n.includes('aice') || n.includes('es tube')) {
    Icon = IceCream; bg = '#FAF5FF'; circleBg = '#F3E8FF'; color = '#7E22CE';
  } else if (c === 'kebutuhan rumah' || n.includes('gas ') || n.includes('rokok') || n.includes('korek') || n.includes('arang') || n.includes('sunlight') || n.includes('wipol') || n.includes('daia') || n.includes('attack') || n.includes('lifebuoy') || n.includes('giv') || n.includes('tusuk sate') || n.includes('sumpit')) {
    if (n.includes('gas') || n.includes('korek') || n.includes('arang')) {
      Icon = Flame; bg = '#FEF2F2'; circleBg = '#FECACA'; color = '#DC2626';
    } else {
      Icon = Package; bg = '#F1F5F9'; circleBg = '#E2E8F0'; color = '#475569';
    }
  } else if (c === 'bumbu dapur' || n.includes('bumbu') || n.includes('racik') || n.includes('masako') || n.includes('royco') || n.includes('bamboe') || n.includes('sajiku') || n.includes('desaku') || n.includes('saos') || n.includes('kecap') || n.includes('delmonte') || n.includes('mamayo') || n.includes('mayonais') || n.includes('cabe') || n.includes('bawang') || n.includes('jahe') || n.includes('kunyit') || n.includes('laos') || n.includes('sereh')) {
    Icon = Leaf; bg = '#ECFDF5'; circleBg = '#D1FAE5'; color = '#047857';
  } else if (c === 'sayur' || n.includes('wortel') || n.includes('kentang') || n.includes('jagung') || n.includes('brokoli') || n.includes('jamur') || n.includes('tomat') || n.includes('tahu') || n.includes('tempe') || n.includes('kangkung') || n.includes('bayam') || n.includes('sawi')) {
    Icon = Carrot; bg = '#F0FDF4'; circleBg = '#DCFCE7'; color = '#15803D';
  } else if (n.includes('dimsum') || n.includes('minipao') || n.includes('siomay') || n.includes('dumpling') || n.includes('bakso')) {
    Icon = Soup; bg = '#FFF7ED'; circleBg = '#FFEDD5'; color = '#C2410C';
  } else if (n.includes('sosis') || n.includes('kebab') || n.includes('maryam') || n.includes('donat') || n.includes('cireng') || n.includes('kulit')) {
    Icon = Pizza; bg = '#FFF1F2'; circleBg = '#FFE4E6'; color = '#BE123C';
  } else if (c === 'minuman' || n.includes('kopi') || n.includes('teh') || n.includes('the ') || n.includes('susu') || n.includes('club') || n.includes('golda') || n.includes('milku') || n.includes('sprite') || n.includes('coca') || n.includes('larutan')) {
    Icon = CupSoda; bg = '#ECFEFF'; circleBg = '#CFFAFE'; color = '#0E7490';
  } else if (c === 'sembako' || n.includes('tepung') || n.includes('terigu') || n.includes('beras') || n.includes('mie') || n.includes('bihun') || n.includes('soun') || n.includes('gula') || n.includes('minyak')) {
    Icon = Wheat; bg = '#FEFCE8'; circleBg = '#FEF9C3'; color = '#A16207';
  }

  if (size === 'fill' || size === 'detail') {
    const isDetail = size === 'detail';
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          minHeight: isDetail ? '280px' : '100%',
          backgroundColor: bg,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: isDetail ? '14px' : '6px',
          padding: '12px',
          userSelect: 'none'
        }}
      >
        <div
          style={{
            width: isDetail ? '96px' : '56px',
            height: isDetail ? '96px' : '56px',
            borderRadius: '50%',
            backgroundColor: circleBg,
            color: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.04)'
          }}
        >
          <Icon size={isDetail ? 46 : 28} strokeWidth={1.75} />
        </div>
        <span
          style={{
            fontSize: isDetail ? '13px' : '10px',
            fontWeight: 700,
            color: color,
            opacity: 0.8,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            textAlign: 'center'
          }}
        >
          {category || 'Sekawan Putri'}
        </span>
      </div>
    );
  }

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
      backgroundColor: circleBg,
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
