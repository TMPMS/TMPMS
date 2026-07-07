import React from 'react';
import './QuickLinks.css';

const QuickLinks = ({ onNavigate }) => {
  const links = [
    { icon: '💊', label: 'Cần mua thuốc', color: '#e8f0fe', action: () => onNavigate && onNavigate('home') },
    { icon: '👨‍⚕️', label: 'Tự Chẩn Đoán Đông Y', color: '#e8f5e9', action: () => onNavigate && onNavigate('diagnose') },
    { icon: '📋', label: 'Đơn của tôi', color: '#fff3e0', action: () => onNavigate && onNavigate('history') },
    { icon: '🏪', label: 'Tìm nhà thuốc', color: '#fce4ec' },
    { icon: '🪡', label: 'Châm cứu', color: '#e0f2f1' },
    { icon: '🔍', label: 'Tra thuốc chính hãng', color: '#e0f7fa' },
  ];

  return (
    <div className="quick-links-bar">
      {links.map((l) => (
        <a 
          key={l.label} 
          href="#" 
          className="quick-link-item"
          onClick={(e) => {
            e.preventDefault();
            if (l.action) l.action();
          }}
        >
          <div className="quick-link-icon" style={{ backgroundColor: l.color }}>
            <span>{l.icon}</span>
          </div>
          <span className="quick-link-label">{l.label}</span>
        </a>
      ))}
    </div>
  );
};

export default QuickLinks;
