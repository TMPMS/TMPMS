import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import './HeroBanner.css';

const slides = [
  { id: 1, bg: "linear-gradient(to right, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.2) 100%), url('/images/hero_banner_1.png') center/cover no-repeat", label: 'Tinh Hoa Dược Liệu Cổ Truyền', sub: 'TCMPAM chắt lọc tinh hoa từ nguồn thảo dược thiên nhiên sạch, an toàn', btn: 'Khám phá ngay', color: '#fff' },
  { id: 2, bg: 'linear-gradient(135deg, #065f46 0%, #022c22 100%)', label: 'Đông Trùng Hạ Thảo Thượng Hạng', sub: 'Hỗ trợ tăng cường sức đề kháng, bồi bổ cơ thể toàn diện', btn: 'Mua ngay', color: '#fff' },
  { id: 3, bg: 'linear-gradient(135deg, #b45309 0%, #78350f 100%)', label: 'Cao Hồng Sâm Hàn Quốc Cao Cấp', sub: 'Tăng cường tuần hoàn máu, cải thiện sinh lực và sức khỏe', btn: 'Xem sản phẩm', color: '#fff' },
];

const sideBanners = [
  { id: 1, bg: "linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.65)), url('/images/side_banner_1.png') center/cover no-repeat", label: 'TINH DẦU TRÀM HUẾ NGUYÊN CHẤT', sub: 'Chăm sóc ấm áp từ thiên nhiên' },
  { id: 2, bg: "linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.65)), url('/images/side_banner_2.png') center/cover no-repeat", label: 'MẬT ONG RỪNG NGUYÊN CHẤT', sub: 'Sức khỏe ngọt ngào Tây Nguyên' },
];

const HeroBanner = () => {
  return (
    <div className="hero-banner">
      {/* Main Slider - 70% */}
      <div className="hero-main">
        <Swiper
          modules={[Autoplay, Navigation]}
          autoplay={{ delay: 4000, disableOnInteraction: false }}
          navigation={{ nextEl: '.hero-next', prevEl: '.hero-prev' }}
          loop
          className="hero-swiper"
        >
          {slides.map(slide => (
            <SwiperSlide key={slide.id}>
              <div className="hero-slide" style={{ background: slide.bg }}>
                <div className="hero-slide-content">
                  <h2 className="hero-title">{slide.label}</h2>
                  <p className="hero-sub">{slide.sub}</p>
                  <a href="#" className="hero-btn">{slide.btn}</a>
                </div>
                {/* Decorative circles */}
                <div className="hero-deco hero-deco-1" />
                <div className="hero-deco hero-deco-2" />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
        <button className="hero-nav-btn hero-prev">‹</button>
        <button className="hero-nav-btn hero-next">›</button>
      </div>

      {/* Side Banners - 30% */}
      <div className="hero-side">
        {sideBanners.map(b => (
          <div key={b.id} className="hero-side-banner" style={{ background: b.bg }}>
            <span className="side-sub">{b.sub}</span>
            <strong className="side-label">{b.label}</strong>
            <a href="#" className="side-link">Xem ngay →</a>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HeroBanner;
