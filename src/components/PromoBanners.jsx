import React, { useState, useEffect, useRef } from 'react';
import './PromoBanners.css';

const BANNERS = [
  {
    id: 1,
    type: 'flash',
    gradient: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 40%, #b91c1c 100%)',
    accentColor: '#fca5a5',
    glowColor: 'rgba(239,68,68,0.3)',
    tag: '⚡ FLASH SALE',
    tagBg: '#dc2626',
    title: 'Siêu Giảm Giá\nĐông Y Chính Hãng',
    sub: 'Hàng trăm sản phẩm thảo dược giảm đến 40% — Số lượng có hạn!',
    cta: 'Mua ngay kẻo hết',
    ctaBg: '#fff',
    ctaColor: '#dc2626',
    countdown: true,
    hours: 5, mins: 42, secs: 18,
    particles: ['⚡','🔥','💥','✨'],
    badge: { text: 'ĐẾN -40%', bg: '#fef2f2', color: '#dc2626' },
    floatEmoji: '🔥',
  },
  {
    id: 2,
    type: 'new',
    gradient: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
    accentColor: '#6ee7b7',
    glowColor: 'rgba(16,185,129,0.25)',
    tag: '🌿 MỚI VỀ',
    tagBg: '#059669',
    title: 'Bộ Sưu Tập\nThảo Dược Mùa Hè',
    sub: 'Tinh chất hoa rừng, trà xanh Tây Bắc — Thanh mát từ thiên nhiên',
    cta: 'Khám phá ngay',
    ctaBg: '#fff',
    ctaColor: '#059669',
    countdown: false,
    particles: ['🌿','🍃','🌺','🌱'],
    badge: { text: 'HÀNG MỚI', bg: '#ecfdf5', color: '#059669' },
    floatEmoji: '🌿',
  },
  {
    id: 3,
    type: 'premium',
    gradient: 'linear-gradient(135deg, #78350f 0%, #92400e 50%, #b45309 100%)',
    accentColor: '#fcd34d',
    glowColor: 'rgba(251,191,36,0.2)',
    tag: '👑 CAO CẤP',
    tagBg: '#b45309',
    title: 'Nhân Sâm & Đông\nTrùng Hạ Thảo',
    sub: 'Dược liệu thượng hạng nhập khẩu chính hãng từ Hàn Quốc, Trung Quốc',
    cta: 'Xem bộ sưu tập',
    ctaBg: '#fef3c7',
    ctaColor: '#92400e',
    countdown: false,
    particles: ['👑','✨','🌟','💛'],
    badge: { text: 'NHẬP KHẨU', bg: '#fffbeb', color: '#b45309' },
    floatEmoji: '✨',
  },
  {
    id: 4,
    type: 'combo',
    gradient: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #3730a3 100%)',
    accentColor: '#a5b4fc',
    glowColor: 'rgba(99,102,241,0.25)',
    tag: '🎁 COMBO ƯU ĐÃI',
    tagBg: '#4f46e5',
    title: 'Mua 2 Tặng 1\nToàn Bộ Cao Dược',
    sub: 'Ưu đãi đặc biệt khi mua combo — Tiết kiệm đến 33% chi phí điều trị',
    cta: 'Chọn combo ngay',
    ctaBg: '#eef2ff',
    ctaColor: '#3730a3',
    countdown: true,
    hours: 23, mins: 15, secs: 44,
    particles: ['🎁','🎉','🛍️','🏷️'],
    badge: { text: 'MUA 2 TẶNG 1', bg: '#eef2ff', color: '#4f46e5' },
    floatEmoji: '🎁',
  },
];

/* --- Countdown hook --- */
const useCountdown = (initialH, initialM, initialS, active) => {
  const [time, setTime] = useState({ h: initialH, m: initialM, s: initialS });
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setTime(prev => {
        let { h, m, s } = prev;
        if (s > 0) return { h, m, s: s - 1 };
        if (m > 0) return { h, m: m - 1, s: 59 };
        if (h > 0) return { h: h - 1, m: 59, s: 59 };
        return { h: 0, m: 0, s: 0 };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [active]);
  return time;
};

const pad = n => String(n).padStart(2, '0');

/* --- Single banner slide --- */
const BannerSlide = ({ banner, active }) => {
  const { h, m, s } = useCountdown(
    banner.hours || 0, banner.mins || 0, banner.secs || 0,
    active && banner.countdown
  );

  return (
    <div
      className={`pb-slide${active ? ' pb-slide--active' : ''}`}
      style={{ background: banner.gradient }}
    >
      {/* Animated particles */}
      <div className="pb-particles" aria-hidden="true">
        {banner.particles.map((p, i) => (
          <span key={i} className={`pb-particle pb-particle-${i}`}>{p}</span>
        ))}
      </div>

      {/* Glow orb */}
      <div className="pb-glow" style={{ background: banner.glowColor }} />

      {/* Decorative rings */}
      <div className="pb-ring pb-ring-1" style={{ borderColor: `${banner.accentColor}22` }} />
      <div className="pb-ring pb-ring-2" style={{ borderColor: `${banner.accentColor}15` }} />

      {/* Content */}
      <div className="pb-content">
        <div className="pb-left">
          {/* Tag */}
          <span className="pb-tag" style={{ background: `${banner.accentColor}22`, color: banner.accentColor, borderColor: `${banner.accentColor}44` }}>
            {banner.tag}
          </span>

          {/* Title */}
          <h2 className="pb-title" style={{ whiteSpace: 'pre-line' }}>
            {banner.title}
          </h2>

          {/* Sub */}
          <p className="pb-sub">{banner.sub}</p>

          {/* Countdown */}
          {banner.countdown && (
            <div className="pb-countdown">
              <span className="pb-countdown-label">⏰ Kết thúc sau:</span>
              <div className="pb-countdown-blocks">
                {[['Giờ', pad(h)], ['Phút', pad(m)], ['Giây', pad(s)]].map(([lbl, val]) => (
                  <div key={lbl} className="pb-time-block">
                    <span className="pb-time-num" style={{ color: banner.accentColor }}>{val}</span>
                    <span className="pb-time-lbl">{lbl}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA Button */}
          <a
            href="#"
            className="pb-cta"
            style={{ background: banner.ctaBg, color: banner.ctaColor }}
          >
            {banner.cta}
            <span className="pb-cta-arrow">→</span>
          </a>
        </div>

        <div className="pb-right">
          <div className="pb-badge-float" style={{ background: banner.badge.bg, color: banner.badge.color }}>
            {banner.badge.text}
          </div>
          <div className="pb-emoji-hero">{banner.floatEmoji}</div>
          <div className="pb-circle-deco" style={{ borderColor: `${banner.accentColor}33` }} />
        </div>
      </div>

      {/* Bottom wave */}
      <div className="pb-wave" style={{ '--wave-color': `${banner.accentColor}18` }} />
    </div>
  );
};

/* --- Main component --- */
const PromoBanners = () => {
  const [current, setCurrent] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const timerRef = useRef(null);

  const goTo = (idx) => {
    if (transitioning || idx === current) return;
    setTransitioning(true);
    setTimeout(() => {
      setCurrent(idx);
      setTransitioning(false);
    }, 350);
  };

  const next = () => goTo((current + 1) % BANNERS.length);
  const prev = () => goTo((current - 1 + BANNERS.length) % BANNERS.length);

  // Auto advance
  useEffect(() => {
    timerRef.current = setInterval(next, 6000);
    return () => clearInterval(timerRef.current);
  }, [current]);

  const resetTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(next, 6000);
  };

  return (
    <div className="promo-banners">
      {/* Slider */}
      <div className={`pb-slider${transitioning ? ' pb-slider--out' : ''}`}>
        {BANNERS.map((b, i) => (
          <BannerSlide key={b.id} banner={b} active={i === current} />
        ))}
      </div>

      {/* Nav buttons */}
      <button className="pb-nav pb-nav-prev" onClick={() => { prev(); resetTimer(); }} aria-label="Trước">
        ‹
      </button>
      <button className="pb-nav pb-nav-next" onClick={() => { next(); resetTimer(); }} aria-label="Sau">
        ›
      </button>

      {/* Dots */}
      <div className="pb-dots">
        {BANNERS.map((b, i) => (
          <button
            key={b.id}
            className={`pb-dot${i === current ? ' pb-dot--active' : ''}`}
            onClick={() => { goTo(i); resetTimer(); }}
            style={i === current ? { background: BANNERS[current].accentColor } : {}}
          />
        ))}
      </div>

      {/* Thumbnail strip */}
      <div className="pb-thumbs">
        {BANNERS.map((b, i) => (
          <button
            key={b.id}
            className={`pb-thumb${i === current ? ' pb-thumb--active' : ''}`}
            onClick={() => { goTo(i); resetTimer(); }}
            style={{
              background: b.gradient,
              borderColor: i === current ? b.accentColor : 'transparent',
            }}
          >
            <span>{b.floatEmoji}</span>
            <span className="pb-thumb-tag">{b.tag}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default PromoBanners;
