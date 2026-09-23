import './Footer.css';

const Footer = () => (
  <footer className="footer">
    <div className="footer-inner">
      <div className="footer-grid">
        {/* Column 1 */}
        <div className="footer-col">
          <div className="footer-logo">
            <img src="/logo.png" alt="TMPMS Logo" className="footer-logo-img" />
          </div>
          <p className="footer-desc">Hệ thống nhà thuốc chuẩn GPP - Uy tín - Chất lượng. Đủ thuốc, giá tốt, tư vấn tận tâm.</p>
          <div className="footer-ministry">
            <div className="ministry-badge">
              <span className="ministry-icon">🏛️</span>
              <div>
                <div className="ministry-title">Bộ Công Thương</div>
                <div className="ministry-sub">Đã thông báo</div>
              </div>
            </div>
            <div className="ministry-badge">
              <span className="ministry-icon">🛡️</span>
              <div>
                <div className="ministry-title">DMCA</div>
                <div className="ministry-sub">Protected</div>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2 */}
        <div className="footer-col">
          <h4 className="footer-col-title">VỀ CHÚNG TÔI</h4>
          <ul className="footer-links">
            {['Giới thiệu', 'Mua sắm cùng TMPMS', 'Điều khoản sử dụng', 'Chính sách bảo mật', 'Chính sách hoàn trả', 'Chính sách vận chuyển', 'Tra cứu hóa đơn điện tử', 'Tuyển dụng'].map(l => <li key={l}><span title="Tính năng đang được phát triển">{l}</span></li>)}
          </ul>
        </div>

        {/* Column 3 */}
        <div className="footer-col">
          <h4 className="footer-col-title">TÌM HIỂU THÊM</h4>
          <ul className="footer-links">
            {['Bệnh & Góc sức khỏe', 'Tra cứu thuốc', 'Tra cứu dược chất', 'Kiểm tra tương tác thuốc', 'Danh sách bệnh viện', 'Trung tâm châm cứu', 'Câu hỏi thường gặp'].map(l => <li key={l}><span title="Tính năng đang được phát triển">{l}</span></li>)}
          </ul>
        </div>

        {/* Column 4: Hotline Card */}
        <div className="footer-col footer-col-hotline">
          <h4 className="footer-col-title">TỔNG ĐÀI HỖ TRỢ</h4>
          <div className="footer-hotline-card">
            <div className="f-hotline-main">
              <span className="hotline-badge">Miễn cước</span>
              <a href="tel:0862544627" className="hotline-num">0862 544 627</a>
            </div>
            <p className="hotline-scope">Tư vấn thuốc, Châm cứu & Khiếu nại dịch vụ</p>
            <p className="hotline-note">🕒 8:00 – 22:00 (kể cả Lễ, Tết)</p>
            <a href="tel:0862544627" className="footer-call-btn">
              📞 Gọi tổng đài ngay
            </a>
          </div>
          <p className="footer-address" style={{ marginTop: '12px' }}>🏢 Số 1 Võ Văn Ngân, P. Linh Chiểu, TP. Thủ Đức, TP. HCM</p>
          <p className="footer-address">✉️ <a href="mailto:ng.tammail@gmail.com">ng.tammail@gmail.com</a></p>
        </div>

        {/* Column 5: Socials & Apps */}
        <div className="footer-col footer-col-socials">
          <h4 className="footer-col-title">KẾT NỐI VỚI CHÚNG TÔI</h4>
          <div className="footer-socials">
            <a href="https://www.facebook.com/profile.php?id=61592828656029" target="_blank" rel="noopener noreferrer" className="social-btn fb" title="Facebook TMPMS">
              <span>f</span>
              <small>Facebook</small>
            </a>
            <span className="social-btn zalo" title="Zalo Official Account">
              <span>Z</span>
              <small>Zalo</small>
            </span>
            <span className="social-btn yt" title="YouTube Channel">
              <span>▶</span>
              <small>YouTube</small>
            </span>
          </div>
          <h4 className="footer-col-title" style={{ marginTop: '16px' }}>TẢI ỨNG DỤNG</h4>
          <div className="footer-app-btns">
            <span className="app-btn" title="Ứng dụng đang được phát triển">
              <span className="app-icon">🍎</span>
              <div><span className="app-sub">Tải về trên</span><span className="app-name">App Store</span></div>
            </span>
            <span className="app-btn" title="Ứng dụng đang được phát triển">
              <span className="app-icon">▶</span>
              <div><span className="app-sub">Tải về trên</span><span className="app-name">Google Play</span></div>
            </span>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="footer-bottom">
        <p>© 2025 Công ty Cổ phần Dược phẩm TMPMS. Mã số doanh nghiệp: 0316698720. Giấy phép kinh doanh dược liệu số 9975/HCM-BHYT.</p>
      </div>
    </div>
  </footer>
);

export default Footer;
