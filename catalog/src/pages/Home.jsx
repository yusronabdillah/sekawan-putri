import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';

// Categories will be dynamically generated from products

export const getFallbackImage = (category, name) => {
  const n = (name || '').toLowerCase();
  const c = (category || '').toLowerCase();

  if (n.includes('dimsum') || n.includes('siomay') || n.includes('dumpling')) {
    return 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?q=80&w=800&auto=format&fit=crop';
  }
  if (n.includes('sosis')) {
    return 'https://images.unsplash.com/photo-1595155135117-6ff56f4d0840?q=80&w=800&auto=format&fit=crop';
  }
  if (n.includes('nugget') || n.includes('karage')) {
    return 'https://images.unsplash.com/photo-1569691899455-88464f6d3cb1?q=80&w=800&auto=format&fit=crop';
  }
  if (n.includes('ayam') || n.includes('chicken')) {
    return 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?q=80&w=800&auto=format&fit=crop';
  }
  if (n.includes('sapi') || n.includes('beef') || n.includes('daging')) {
    return 'https://images.unsplash.com/photo-1603048297172-c92544798d5e?q=80&w=800&auto=format&fit=crop';
  }
  if (n.includes('bakso')) {
    return 'https://images.unsplash.com/photo-1568909344668-6f14a07b56a0?q=80&w=800&auto=format&fit=crop'; // Meatball soup
  }
  if (c.includes('sayur') || n.includes('kentang')) {
    return 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=800&auto=format&fit=crop';
  }
  if (c.includes('minuman')) {
    return 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=800&auto=format&fit=crop';
  }

  // Generic appetizing frozen food / grocery mix
  return 'https://images.unsplash.com/photo-1588137378633-dea1336ce1e2?q=80&w=800&auto=format&fit=crop';
};

export default function Home({ products, WA_NUMBER }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;
  const gridRef = React.useRef(null);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    if (gridRef.current) {
      // Offset by 100px so the sticky header doesn't cover the top of the grid
      const y = gridRef.current.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchSearch = product.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const prodCategory = product.category || 'Lainnya';
      let matchCategory = true;
      if (activeCategory !== 'Semua') {
        matchCategory = prodCategory.toLowerCase().includes(activeCategory.toLowerCase());
      }
      return matchSearch && matchCategory;
    });
  }, [products, searchQuery, activeCategory]);

  // Reset page when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeCategory]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const currentProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const dynamicCategories = useMemo(() => {
    const cats = new Set(products.map(p => p.category).filter(c => c && c.trim() !== ''));
    return ['Semua', ...Array.from(cats).sort()];
  }, [products]);

  return (
    <main className="container">
      {/* BANNER HERO SECTION */}
      <section style={{ margin: '24px auto 48px auto', width: '100%', maxWidth: '1000px', borderRadius: '24px', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
        <img src="/banner.jpg?v=3" alt="Selamat Datang di Sekawan Putri Frozen Food" style={{ width: '100%', height: 'auto', display: 'block' }} />
      </section>

      {/* CATALOG SECTION */}
      <section id="produk">
        <div className="toolbar">
          <div className="search-bar">
            <Search size={20} strokeWidth={2} />
            <input 
              type="text" 
              placeholder="Cari produk apa hari ini?" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="categories">
            {dynamicCategories.map(cat => (
              <button 
                key={cat} 
                className={`category-btn ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="product-grid" ref={gridRef}>
          {currentProducts.length === 0 ? (
            <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
              <div style={{width: '64px', height: '64px', background: 'var(--primary-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto'}}>
                <Search size={32} color="var(--primary)" strokeWidth={2} />
              </div>
              <h3 style={{fontSize: '20px', marginBottom: '8px', color: 'var(--text-main)'}}>Belum Ada Produk</h3>
              <p style={{maxWidth: '300px', margin: '0 auto', color: 'var(--text-muted)'}}>Kategori ini masih kosong atau produk yang Anda cari tidak ditemukan.</p>
            </div>
          ) : (
            currentProducts.map(product => {
              const stock = product.stock || 0;
              const isAvailable = stock > 0;
              const imgUrl = product.image_url || getFallbackImage(product.category, product.name);
              
              return (
                <Link to={`/product/${product.id}`} key={product.id} className="product-card">
                  {/* Badge moved to card level so it overlaps the right text area */}
                  {isAvailable ? (
                    <div className="badge badge-success product-badge">Tersedia</div>
                  ) : (
                    <div className="badge badge-danger product-badge">Habis</div>
                  )}
                  
                  <div className="product-img-wrapper">
                    <img src={imgUrl} alt={product.name} className="product-img" loading="lazy" />
                  </div>
                  
                  <div className="product-info">
                    <h3 className="product-title">{product.name}</h3>
                    <div className="product-price">
                      Rp {(product.price || 0).toLocaleString('id-ID')}
                    </div>
                    
                    <div className="stock-text">
                      <div className={`stock-dot ${stock > 10 ? 'high' : (stock > 0 ? 'low' : 'out')}`}></div>
                      Sisa stok: {stock} {product.unit ? product.unit.toLowerCase() : (stock % 1 !== 0 ? 'kg' : 'pack')}
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="pagination">
            <button 
              className="page-btn" 
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              &laquo;
            </button>
            
            {Array.from({length: totalPages}, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                className={`page-btn ${currentPage === page ? 'active' : ''}`}
                onClick={() => handlePageChange(page)}
              >
                {page}
              </button>
            ))}

            <button 
              className="page-btn" 
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              &raquo;
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
