import React, { useState, useEffect } from 'react';
import PharmacyChatWidget from './PharmacyChatWidget';
import './FloatingActions.css';

const FloatingActions = ({ user }) => {
  const [visible, setVisible] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handlePharmacyChatClick = (e) => {
    e.preventDefault();
    if (!user) {
      window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: 'login' }));
      return;
    }
    setIsChatOpen(true);
  };

  return (
    <>
      <div className="float-wrap">
        {/* Chat / Tư vấn */}
        <button
          className="float-btn float-chat"
          onClick={handlePharmacyChatClick}
          title="Tư vấn Dược sĩ Trực tuyến"
          style={{ cursor: 'pointer', border: 'none' }}
        >
          <span className="float-icon">💬</span>
          <span className="float-label">Tư vấn<br />Dược sĩ</span>
        </button>

        {/* Scroll to top */}
        {visible && (
          <button
            className="float-btn float-top fade-in"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            title="Lên đầu trang"
          >
            ↑
          </button>
        )}
      </div>

      <PharmacyChatWidget
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        user={user}
      />
    </>
  );
};

export default FloatingActions;
