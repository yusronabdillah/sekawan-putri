import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, ArrowRight, Search, BookOpen } from 'lucide-react';

export default function Articles({ articles }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Semua');

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Artikel, Tips Dapur & Resep Praktis | Sekawan Putri Frozen Food';
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(articles.map(a => a.category).filter(Boolean));
    return ['Semua', ...Array.from(cats)];
  }, [articles]);

  const filteredArticles = useMemo(() => {
    return articles.filter(article => {
      const matchSearch = 
        article.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.excerpt?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = activeCategory === 'Semua' || article.category === activeCategory;
      return matchSearch && matchCat;
    });
  }, [articles, searchQuery, activeCategory]);

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

  return (
    <main className="container" style={{ paddingTop: '32px', paddingBottom: '64px' }}>
      <div className="articles-hero">
        <span className="section-tag">
          <BookOpen size={14} /> Blog & Inspirasi Dapur
        </span>
        <h1 className="articles-page-title">Artikel & Tips Sekawan Putri</h1>
        <p className="articles-page-subtitle">
          Temukan inspirasi resep praktis, tips menyimpan frozen food & sayuran segar, serta informasi menarik seputar kebutuhan dapur keluarga Anda.
        </p>
      </div>

      <div className="toolbar" style={{ marginBottom: '40px' }}>
        <div className="search-bar">
          <Search size={20} strokeWidth={2} />
          <input 
            type="text" 
            placeholder="Cari artikel atau tips dapur..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {categories.length > 1 && (
          <div className="categories">
            {categories.map(cat => (
              <button 
                key={cat} 
                className={`category-btn ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {filteredArticles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>Artikel Tidak Ditemukan</h3>
          <p>Coba gunakan kata kunci pencarian yang lain.</p>
        </div>
      ) : (
        <div className="article-grid">
          {filteredArticles.map(article => (
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
                <h2 className="article-title">{article.title}</h2>
                <p className="article-excerpt">{article.excerpt}</p>
                <div className="article-read-more">
                  Baca Selengkapnya <ArrowRight size={16} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
