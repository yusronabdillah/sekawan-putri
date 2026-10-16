import React, { useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Calendar, Clock, User, Share2, ShoppingBag } from 'lucide-react';
import ProductIllustration from '../components/ProductIllustration';

export default function ArticleDetail({ articles, products }) {
  const { slug } = useParams();

  const article = useMemo(() => {
    return articles.find(a => a.slug === slug || a.id === slug);
  }, [articles, slug]);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (article) {
      document.title = `${article.title} | Sekawan Putri Frozen Food`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc && article.excerpt) {
        metaDesc.setAttribute('content', article.excerpt);
      }
    }
  }, [article]);

  const relatedProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    const targetCat = (article?.related_category || 'Frozen Food').toLowerCase();
    const matched = products.filter(p => 
      (p.stock || 0) > 0 && 
      (p.category || '').toLowerCase().includes(targetCat)
    );
    return (matched.length >= 4 ? matched : products.filter(p => (p.stock || 0) > 0)).slice(0, 4);
  }, [products, article]);

  if (!article) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '100px 24px' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Artikel tidak ditemukan</h2>
        <Link to="/artikel" className="btn btn-primary">Kembali ke Daftar Artikel</Link>
      </div>
    );
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const handleShareWA = () => {
    const url = window.location.href;
    const text = `Baca artikel menarik dari Sekawan Putri:\n*${article.title}*\n\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <main className="container" style={{ paddingTop: '32px', paddingBottom: '80px' }}>
      <article className="article-detail-container">
        <div className="breadcrumb">
          <Link to="/artikel"><ChevronLeft size={16} /> Kembali ke Semua Artikel</Link>
        </div>

        <header className="article-detail-header">
          {article.category && (
            <span className="section-tag" style={{ marginBottom: '12px' }}>{article.category}</span>
          )}
          <h1 className="article-detail-title">{article.title}</h1>
          
          <div className="article-detail-meta">
            <span><User size={15} /> {article.author || 'Tim Sekawan Putri'}</span>
            <span><Calendar size={15} /> {formatDate(article.published_at)}</span>
            {article.read_time && (
              <span><Clock size={15} /> {article.read_time}</span>
            )}
            <button onClick={handleShareWA} className="share-wa-btn" type="button">
              <Share2 size={14} /> Bagikan ke WA
            </button>
          </div>
        </header>

        <div className="article-detail-banner">
          <img 
            src={article.image_url} 
            alt={article.title} 
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/banner.jpg';
            }}
          />
        </div>

        <div 
          className="article-detail-content"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        {/* RELATED PRODUCTS CROSS-SELLING */}
        {relatedProducts.length > 0 && (
          <section className="article-related-products">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
                  <ShoppingBag size={20} /> Belanja Produk Terkait di Sekawan Putri
                </h3>
                <p style={{ fontSize: '14px', marginTop: '4px' }}>Stok segar & siap dipesan langsung via WhatsApp</p>
              </div>
              <Link to="/#produk" className="article-view-all-link">Lihat Katalog Lengkap &rarr;</Link>
            </div>

            <div className="product-grid" style={{ marginBottom: 0 }}>
              {relatedProducts.map(product => {
                const stock = product.stock || 0;
                const hasImage = Boolean(product.image_url && product.image_url.trim() !== '');

                return (
                  <Link to={`/product/${product.id}`} key={product.id} className="product-card" style={{ background: 'var(--bg-card)' }}>
                    <div className="badge badge-success product-badge">Tersedia</div>
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
                      <h4 className="product-title">{product.name}</h4>
                      <div className="product-price">
                        {product.price > 0 ? `Rp ${product.price.toLocaleString('id-ID')}` : 'Harga Menyesuaikan'}
                      </div>
                      <div className="stock-text">
                        <div className="stock-dot high"></div>
                        Sisa stok: {stock} {product.unit ? product.unit.toLowerCase() : 'pcs'}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </article>
    </main>
  );
}
