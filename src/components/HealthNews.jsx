import React, { useEffect, useState } from 'react';
import { fetchNewsArticles } from '../services/api';
import './HealthNews.css';

const TABS = ['Dinh dưỡng', 'Phòng chữa bệnh', 'Khỏe đẹp'];
const INITIAL_COUNT = 5;

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('vi-VN');
};

const HealthNews = () => {
  const [tab, setTab] = useState(TABS[0]);
  const [articles, setArticles] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [openArticle, setOpenArticle] = useState(null);

  useEffect(() => {
    setShowAll(false);
    fetchNewsArticles(tab).then(data => {
      if (Array.isArray(data)) setArticles(data);
    }).catch(() => setArticles([]));
  }, [tab]);

  if (articles.length === 0) return null;

  const visible = showAll ? articles : articles.slice(0, INITIAL_COUNT);
  const featured = visible[0];
  const rest = visible.slice(1);

  return (
    <section className="hn-section">
      <div className="hn-header">
        <div className="hn-title-wrap">
          <div className="hn-title-bar" />
          <h2 className="hn-title">Bệnh & Góc sức khoẻ</h2>
        </div>
        <div className="hn-tabs">
          {TABS.map(t => (
            <button key={t} className={`hn-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
        {!showAll && articles.length > INITIAL_COUNT && (
          <a href="#" className="hn-all" onClick={(e) => { e.preventDefault(); setShowAll(true); }}>Xem tất cả →</a>
        )}
      </div>

      <div className="hn-content">
        {/* Featured */}
        {featured && (
          <a href="#" className="hn-featured" onClick={(e) => { e.preventDefault(); setOpenArticle(featured); }}>
            <div className="hn-featured-img">
              <div className="hn-img-placeholder">{(featured.tag || tab)[0]}</div>
            </div>
            <div className="hn-featured-body">
              <span className="hn-tag">{featured.tag}</span>
              <h3 className="hn-featured-title">{featured.title}</h3>
              <p className="hn-featured-excerpt">{featured.excerpt}</p>
              <span className="hn-date">{formatDate(featured.publishedDate || featured.published_date)}</span>
            </div>
          </a>
        )}

        {/* List */}
        <div className="hn-list">
          {rest.map(a => (
            <a key={a.id} href="#" className="hn-item" onClick={(e) => { e.preventDefault(); setOpenArticle(a); }}>
              <div className="hn-item-img">
                <div className="hn-img-sm-placeholder">{(a.tag || tab)[0]}</div>
              </div>
              <div className="hn-item-body">
                <span className="hn-tag">{a.tag}</span>
                <p className="hn-item-title">{a.title}</p>
                <span className="hn-date">{formatDate(a.publishedDate || a.published_date)}</span>
              </div>
            </a>
          ))}
        </div>
      </div>

      {openArticle && (
        <div className="hn-reader-overlay" onClick={() => setOpenArticle(null)}>
          <div className="hn-reader" onClick={(e) => e.stopPropagation()}>
            <button className="hn-reader-close" onClick={() => setOpenArticle(null)}>×</button>
            <span className="hn-tag">{openArticle.tag}</span>
            <h3 className="hn-reader-title">{openArticle.title}</h3>
            <span className="hn-date">{formatDate(openArticle.publishedDate || openArticle.published_date)}</span>
            <p className="hn-reader-body">{openArticle.content}</p>
          </div>
        </div>
      )}
    </section>
  );
};

export default HealthNews;
