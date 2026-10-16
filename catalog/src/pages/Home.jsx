import React, { useState, useMemo, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Calendar, Clock, ArrowRight, BookOpen } from 'lucide-react';
import ProductIllustration from '../components/ProductIllustration';

export default function Home({ products, articles = [] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;
  const gridRef = React.useRef(null);
  const location = useLocation();

  useEffect(() => {
    document.title = 'Sekawan Putri - Katalog Frozen Food & Sayur Segar Dau, Malang';
    if (location.hash === '#produk' || window.location.hash === '#produk') {
      const scroll = () => {
        const el = document.getElementById('produk');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      };
      scroll();
      const t1 = setTimeout(scroll, 100);
      const t2 = setTimeout(scroll, 300);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [location.hash, location.pathname]);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    if (gridRef.current) {
      // Offset by 100px so the sticky header doesn't cover the top of the grid
      const y = gridRef.current.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      const skuA = a.sku || a.id || '';
      const skuB = b.sku || b.id || '';
      return skuA.localeCompare(skuB);
    });
  }, [products]);

  const filteredProducts = useMemo(() => {
    return sortedProducts.filter(product => {
      const matchSearch = product.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const prodCategory = product.category || 'Lainnya';
      let matchCategory = true;
      if (activeCategory !== 'Semua') {
        matchCategory = prodCategory.toLowerCase() === activeCategory.toLowerCase();
      }
      return matchSearch && matchCategory;
    });
  }, [sortedProducts, searchQuery, activeCategory]);

  // Reset page when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeCategory]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const currentProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Generate compact pagination numbers with ellipsis
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = [1];
    if (currentPage > 3) pages.push('...');
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  }, [totalPages, currentPage]);

  const dynamicCategories = useMemo(() => {
    const PREFERRED_ORDER = [
      'Frozen Food', 'Sayur', 'Buah', 'Bumbu Dapur', 
      'Sembako', 'Minuman', 'Ice Cream', 'Kebutuhan Rumah'
    ];
    const presentCats = new Set(products.map(p => p.category).filter(c => c && c.trim() !== ''));
    const sorted = Array.from(presentCats).sort((a, b) => {
      const idxA = PREFERRED_ORDER.indexOf(a);
      const idxB = PREFERRED_ORDER.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
    return ['Semua', ...sorted];
  }, [products]);

  const latestArticles = useMemo(() => {
    return [...articles]
      .sort((a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0))
      .slice(0, 3);
  }, [articles]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <main className="container">
      {/* BANNER HERO SECTION */}
      <section style={{ margin: '24px auto 48px auto', width: '100%', maxWidth: '1000px', aspectRatio: '1376 / 768', borderRadius: '24px', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
        <img src="/banner.jpg?v=3" alt="Selamat Datang di Sekawan Putri Frozen Food" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </section>

      {/* CATALOG SECTION */}
      <section id="produk">
        <div className="toolbar">
          <div className="search-bar">
            <Search size={20} strokeWidth={2} />
            <input 
              type="text" 
              placeholder={`Cari dari ${products.length || 433} produk tersedia hari ini...`} 
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
              const hasImage = Boolean(product.image_url && product.image_url.trim() !== '');
              
              return (
                <Link to={`/product/${product.id}`} key={product.id} className="product-card">
                  {isAvailable ? (
                    <div className="badge badge-success product-badge">Tersedia</div>
                  ) : (
                    <div className="badge badge-danger product-badge">Habis</div>
                  )}
                  
                  <div className="product-img-wrapper">
                    {hasImage ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name} 
                        className="product-img" 
                        loading="lazy"
                      />
                    ) : (
                      <ProductIllustration name={product.name} category={product.category} size="fill" />
                    )}
                  </div>
                  
                  <div className="product-info">
                    <h3 className="product-title">{product.name}</h3>
                    <div className="product-price">
                      {product.price > 0 ? `Rp ${product.price.toLocaleString('id-ID')}` : 'Harga Menyesuaikan'}
                    </div>
                    
                    <div className="stock-text">
                      <div className={`stock-dot ${stock > 10 ? 'high' : (stock > 0 ? 'low' : 'out')}`}></div>
                      Sisa stok: {stock} {product.unit ? product.unit.toLowerCase() : 'pcs'}
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
              aria-label="Halaman Sebelumnya"
            >
              &laquo;
            </button>
            
            {pageNumbers.map((page, idx) => (
              page === '...' ? (
                <span key={`ellipsis-${idx}`} style={{ padding: '0 4px', color: 'var(--text-muted)', fontWeight: '700' }}>...</span>
              ) : (
                <button
                  key={page}
                  className={`page-btn ${currentPage === page ? 'active' : ''}`}
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </button>
              )
            ))}

            <button 
              className="page-btn" 
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              aria-label="Halaman Berikutnya"
            >
              &raquo;
            </button>
          </div>
        )}
      </section>

      {/* PORTAL BERITA / ARTIKEL SECTION (3 TERBARU) */}
      {latestArticles.length > 0 && (
        <section id="artikel" className="home-articles-section">
          <div className="home-articles-header">
            <div>
              <span className="section-tag">
                <BookOpen size={14} /> Portal Berita & Tips Dapur
              </span>
              <h2 className="home-articles-title">Artikel & Inspirasi Terbaru</h2>
              <p className="home-articles-subtitle">
                Tips menyimpan frozen food, sayuran segar, dan ide masakan praktis untuk keluarga Anda.
              </p>
            </div>
            <Link to="/artikel" className="btn btn-outline-primary">
              Lihat Semua Artikel <ArrowRight size={16} />
            </Link>
          </div>

          <div className="article-grid">
            {latestArticles.map(article => (
              <Link to={`/artikel/${article.slug}`} key={article.id || article.slug} className="article-card">
                <div className="article-img-wrapper">
                  <img 
                    src={article.image_url} 
                    alt={article.title} 
                    className="article-img" 
                    loading="lazy" 
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/banner.jpg';
                    }}
                  />
                  {article.category && (
                    <span className="article-category-badge">{article.category}</span>
                  )}
                </div>
                <div className="article-body">
                  <div className="article-meta">
                    <span><Calendar size={13} /> {formatDate(article.published_at)}</span>
                    {article.read_time && (
                      <span><Clock size={13} /> {article.read_time}</span>
                    )}
                  </div>
                  <h3 className="article-title">{article.title}</h3>
                  <p className="article-excerpt">{article.excerpt}</p>
                  <div className="article-read-more">
                    Baca Selengkapnya <ArrowRight size={16} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
