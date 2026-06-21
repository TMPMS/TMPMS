import React from 'react';
import './QuickLinks.css';

const links = [
  { icon: '💊', label: 'Cần mua thuốc', color: '#e8f0fe' },
  { icon: '👨‍⚕️', label: 'Tư vấn với Dược Sỹ', color: '#e8f5e9' },
  { icon: '📋', label: 'Đơn của tôi', color: '#fff3e0' },
  { icon: '🏪', label: 'Tìm nhà thuốc', color: '#fce4ec' },
  { icon: '🪡', label: 'Châm cứu', color: '#e0f2f1' },
  { icon: '🔍', label: 'Tra thuốc chính hãng', color: '#e0f7fa' },
];

const QuickLinks = () => (
  <div className="quick-links-bar">
    {links.map((l) => (
      <a key={l.label} href="#" className="quick-link-item">
        <div className="quick-link-icon" style={{ backgroundColor: l.color }}>
          <span>{l.icon}</span>
        </div>
        <span className="quick-link-label">{l.label}</span>
      </a>
    ))}
  </div>
);

export default QuickLinks;
