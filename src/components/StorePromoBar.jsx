import React from 'react';
import './StorePromoBar.css';

const StorePromoBar = () => (
  <div className="store-promo-bar">
    <div className="store-promo-inner">
      <div className="store-promo-left">
        <span className="store-promo-icon">🏪</span>
        <div>
          <div className="store-promo-count">2,501 nhà thuốc</div>
          <div className="store-promo-sub">Xem hệ thống nhà thuốc trên toàn quốc</div>
        </div>
      </div>
      <a href="#" className="store-promo-btn">Xem danh sách nhà thuốc →</a>
    </div>
  </div>
);

export default StorePromoBar;
