import React, { useState, useEffect } from 'react';
import './FloatingActions.css';

const FloatingActions = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="float-wrap">
      {/* Chat / Tư vấn */}
      <a href="#" className="float-btn float-chat">
        <span className="float-icon">💬</span>
        <span className="float-label">Tư vấn<br/>Dược sĩ</span>
      </a>

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
  );
};

export default FloatingActions;
