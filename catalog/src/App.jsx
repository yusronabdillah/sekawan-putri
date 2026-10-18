import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { Phone, MapPin, Clock, Menu, X } from 'lucide-react';
import { firestore } from './firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import './index.css';

import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail';
import Articles from './pages/Articles';
import ArticleDetail from './pages/ArticleDetail';
import About from './pages/About';
import { DEFAULT_ARTICLES } from './utils/articlesData';

const WA_NUMBER = "6285775586209";

function AppContent() {
  const [products, setProducts] = useState([]);
  const [articles, setArticles] = useState(DEFAULT_ARTICLES);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Close mobile menu when route changes & scroll to hash target if present
  useEffect(() => {
    setMobileMenuOpen(false);
    if (location.hash) {
      const targetId = location.hash.replace('#', '');
      const scroll = () => {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      };
      scroll();
      const t1 = setTimeout(scroll, 120);
      const t2 = setTimeout(scroll, 350);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [location.pathname, location.hash]);

  const handleSectionClick = (e, sectionId) => {
    e.preventDefault();
    setMobileMenuOpen(false);

    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.history.replaceState(null, '', `#${sectionId}`);
    } else {
      navigate(`/#${sectionId}`);
    }
  };

  useEffect(() => {
    const q = collection(firestore, 'products');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedProducts = [];
      snapshot.forEach(doc => {
        fetchedProducts.push({ id: doc.id, ...doc.data() });
      });
      setProducts(fetchedProducts);
    }, (error) => {
      console.error("Error fetching products:", error);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = collection(firestore, 'articles');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const fetchedArticles = [];
        snapshot.forEach(doc => {
          fetchedArticles.push({ id: doc.id, ...doc.data() });
        });
        setArticles(fetchedArticles);
      } else {
        setArticles(DEFAULT_ARTICLES);
      }
    }, (error) => {
      console.error("Error fetching articles:", error);
      setArticles(DEFAULT_ARTICLES);
    });
    return () => unsubscribe();
  }, []);

  return (
    <>
      <div style={{display: 'flex', flexDirection: 'column', minHeight: '100vh'}}>
        {/* HEADER */}
        <header className="header">
          <div className="container header-container">
            <Link to="/" className="logo" onClick={() => { setMobileMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
              <img src="/logo.png" alt="Sekawan Putri Logo" className="logo-img" />
              <div className="logo-brand">
                <span className="logo-title">Sekawan Putri</span>
                <span className="logo-subtitle">Frozen Food & Sayur Segar</span>
              </div>
            </Link>

            {/* DESKTOP NAV */}
            <nav className="nav-links desktop-nav">
              <Link to="/" className={location.pathname === '/' && !location.hash ? 'active' : ''} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Katalog</Link>
              <Link to="/artikel" className={location.pathname.startsWith('/artikel') ? 'active' : ''}>Artikel</Link>
              <Link to="/tentang-kami" className={location.pathname === '/tentang-kami' ? 'active' : ''}>Tentang Kami</Link>
              <a href="#kontak" onClick={(e) => handleSectionClick(e, 'kontak')}>Kontak</a>
              <div className="nav-divider"></div>
              <a href={`https://wa.me/${WA_NUMBER}`} target="_blank" rel="noreferrer" className="nav-social-pill wa">
                <svg width="16" height="16" viewBox="0 0 448 512" fill="currentColor">
                  <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
                </svg>
                WhatsApp
              </a>
              <a href="https://tiktok.com/@frozenfoodsekawanputri" target="_blank" rel="noreferrer" className="nav-social-pill tiktok">
                <svg width="15" height="15" viewBox="0 0 448 512" fill="currentColor">
                  <path d="M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0l88,0a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,381,102.39a121.43,121.43,0,0,0,67,20.14Z"/>
                </svg>
                @frozenfoodsekawanputri
              </a>
            </nav>

            {/* MOBILE MENU BUTTON */}
            <button 
              type="button"
              className="mobile-menu-toggle" 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Menu Navigasi"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* MOBILE DROPDOWN DRAWER */}
          {mobileMenuOpen && (
            <div className="mobile-nav-drawer">
              <div className="container mobile-nav-inner">
                <Link to="/" className={`mobile-nav-item ${location.pathname === '/' ? 'active' : ''}`} onClick={() => { setMobileMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                  Katalog Produk
                </Link>
                <Link to="/artikel" className={`mobile-nav-item ${location.pathname.startsWith('/artikel') ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                  Artikel & Tips Dapur
                </Link>
                <Link to="/tentang-kami" className={`mobile-nav-item ${location.pathname === '/tentang-kami' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                  Tentang Kami
                </Link>
                <a href="#kontak" className="mobile-nav-item" onClick={(e) => handleSectionClick(e, 'kontak')}>
                  Kontak & Lokasi Toko
                </a>
                <div className="mobile-nav-actions">
                  <a href={`https://wa.me/${WA_NUMBER}`} target="_blank" rel="noreferrer" className="mobile-action-btn wa">
                    <svg width="18" height="18" viewBox="0 0 448 512" fill="currentColor">
                      <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
                    </svg>
                    Chat WhatsApp
                  </a>
                  <a href="https://www.instagram.com/_sekawanputri/" target="_blank" rel="noreferrer" className="mobile-action-btn ig" style={{ backgroundColor: '#E1306C', color: 'white' }}>
                    <svg width="16" height="16" viewBox="0 0 448 512" fill="currentColor">
                      <path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z"/>
                    </svg>
                    Instagram
                  </a>
                  <a href="https://tiktok.com/@frozenfoodsekawanputri" target="_blank" rel="noreferrer" className="mobile-action-btn tiktok">
                    <svg width="16" height="16" viewBox="0 0 448 512" fill="currentColor">
                      <path d="M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0l88,0a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,381,102.39a121.43,121.43,0,0,0,67,20.14Z"/>
                    </svg>
                    TikTok Kami
                  </a>
                </div>
              </div>
            </div>
          )}
        </header>

        {/* MAIN CONTENT (ROUTING) */}
        <Routes>
          <Route path="/" element={<Home products={products} articles={articles} WA_NUMBER={WA_NUMBER} />} />
          <Route path="/product/:id" element={<ProductDetail products={products} WA_NUMBER={WA_NUMBER} />} />
          <Route path="/artikel" element={<Articles articles={articles} />} />
          <Route path="/artikel/:slug" element={<ArticleDetail articles={articles} products={products} />} />
          <Route path="/tentang-kami" element={<About WA_NUMBER={WA_NUMBER} />} />
        </Routes>

        {/* FOOTER ON HOME & ARTIKEL PAGES */}
        {!location.pathname.startsWith('/product/') && (
          <footer id="kontak" style={{ scrollMarginTop: '64px' }}>
            <div className="footer-wave">
              <svg viewBox="0 0 1440 320" preserveAspectRatio="none">
                <path fill="#4A1D24" fillOpacity="1" d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,133.3C672,139,768,181,864,181.3C960,181,1056,139,1152,122.7C1248,107,1344,117,1392,122.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
              </svg>
            </div>
            
            <div className="container footer-content">
              <h2 style={{fontSize: '24px', marginBottom: '32px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px'}}>
                Hubungi Kami
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 12L19 12M19 12L12 5M19 12L12 19" stroke="var(--primary-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </h2>
              
              <div className="footer-top">
                <a href={`https://wa.me/${WA_NUMBER}`} target="_blank" rel="noreferrer" className="contact-card" style={{textDecoration: 'none'}}>
                  <div className="contact-icon">
                    <Phone size={24} color="var(--primary-light)" />
                  </div>
                  <div className="contact-text">
                    <h4>WhatsApp</h4>
                    <p>+62 857-7558-6209</p>
                  </div>
                </a>
                <a href="https://maps.app.goo.gl/FgBaBnbaE3YQo9jH7" target="_blank" rel="noreferrer" className="contact-card" style={{textDecoration: 'none'}}>
                  <div className="contact-icon"><MapPin size={24} color="var(--primary-light)" /></div>
                  <div className="contact-text">
                    <h4>Alamat Store</h4>
                    <p>Jl. Tirto Rahayu No.12 A, Landungsari, Dau</p>
                  </div>
                </a>
                <a href="https://www.instagram.com/_sekawanputri/" target="_blank" rel="noreferrer" className="contact-card" style={{textDecoration: 'none'}}>
                  <div className="contact-icon">
                    <svg width="24" height="24" viewBox="0 0 448 512" fill="currentColor">
                      <path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z"/>
                    </svg>
                  </div>
                  <div className="contact-text">
                    <h4>Instagram</h4>
                    <p>@_sekawanputri</p>
                  </div>
                </a>
                <a href="https://tiktok.com/@frozenfoodsekawanputri" target="_blank" rel="noreferrer" className="contact-card" style={{textDecoration: 'none'}}>
                  <div className="contact-icon">
                    <svg width="24" height="24" viewBox="0 0 448 512" fill="currentColor">
                      <path d="M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0l88,0a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,381,102.39a121.43,121.43,0,0,0,67,20.14Z"/>
                    </svg>
                  </div>
                  <div className="contact-text">
                    <h4>TikTok</h4>
                    <p>@frozenfoodsekawanputri</p>
                  </div>
                </a>
                <div className="contact-card">
                  <div className="contact-icon"><Clock size={24} color="var(--primary-light)" /></div>
                  <div className="contact-text">
                    <h4>Jam Buka</h4>
                    <p>08.00 - 20.00 WIB</p>
                  </div>
                </div>
              </div>

              <div className="footer-map" style={{ position: 'relative' }}>
                <iframe 
                  src="https://maps.google.com/maps?q=-7.9299444,112.5971667&hl=id&z=17&output=embed" 
                  width="100%" 
                  height="100%" 
                  style={{border:0}} 
                  allowFullScreen="" 
                  loading="lazy" 
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Google Maps Sekawan Putri"
                ></iframe>
                <a 
                  href="https://maps.app.goo.gl/FgBaBnbaE3YQo9jH7" 
                  target="_blank" 
                  rel="noreferrer"
                  style={{
                    position: 'absolute',
                    bottom: '16px',
                    right: '16px',
                    backgroundColor: 'var(--primary)',
                    color: '#ffffff',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    textDecoration: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    zIndex: 2
                  }}
                >
                  <MapPin size={16} /> Buka di Google Maps
                </a>
              </div>

              <div className="footer-copyright" style={{flexWrap: 'wrap'}}>
                <span>&copy; {new Date().getFullYear()} Sekawan Putri Frozen Food.</span>
                <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                  Powered by 
                  <a href="https://www.naikomzet.web.id/" target="_blank" rel="noreferrer" style={{display: 'inline-flex', alignItems: 'center'}}>
                    <img src="/naikomzet-logo.png" alt="Naik Omzet" style={{height: '28px', objectFit: 'contain', filter: 'brightness(0) invert(1)'}} />
                  </a>
                </span>
              </div>
            </div>
          </footer>
        )}
      </div>

      {/* FLOATING WHATSAPP BUTTON */}
      {!location.pathname.startsWith('/product/') && (
        <a href={`https://wa.me/${WA_NUMBER}`} className="floating-wa" target="_blank" rel="noreferrer" aria-label="Hubungi via WhatsApp">
          <svg width="32" height="32" viewBox="0 0 448 512" fill="currentColor">
            <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
          </svg>
        </a>
      )}
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
