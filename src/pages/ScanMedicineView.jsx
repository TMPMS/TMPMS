import React, { useState } from 'react';
import { ScanLine, Search, ArrowLeft, PackageX } from 'lucide-react';
import BarcodeScannerModal from '../components/admin/BarcodeScannerModal';
import { fetchMedicineByBarcode } from '../services/medicines';
import './ScanMedicineView.css';

// Trang public cho khách hàng: quét mã vạch/QR in trên vỏ hộp thuốc để tìm nhanh
// thông tin sản phẩm, không yêu cầu đăng nhập (endpoint by-barcode ở BE là public).
const ScanMedicineView = ({ onBack, onProductFound }) => {
  const [showScanner, setShowScanner] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [notFoundCode, setNotFoundCode] = useState(null);
  const [error, setError] = useState('');

  const lookup = async (code) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    setNotFoundCode(null);
    try {
      const product = await fetchMedicineByBarcode(trimmed);
      if (product) {
        onProductFound(product);
      } else {
        setNotFoundCode(trimmed);
      }
    } catch (err) {
      setError(err.message || 'Không thể tra cứu sản phẩm. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleDetected = (code) => {
    setShowScanner(false);
    lookup(code);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    lookup(manualCode);
  };

  return (
    <div className="scan-medicine-view">
      <button className="scan-back-btn" onClick={onBack}>
        <ArrowLeft size={16} /> Quay lại
      </button>

      <div className="scan-medicine-card">
        <div className="scan-medicine-icon">
          <ScanLine size={36} />
        </div>
        <h1>Quét mã tìm thuốc</h1>
        <p className="scan-medicine-desc">
          Đưa camera vào mã vạch hoặc mã QR in trên vỏ hộp thuốc để xem nhanh thông tin sản phẩm,
          hoặc nhập mã thủ công bên dưới.
        </p>

        <button className="scan-medicine-btn" onClick={() => setShowScanner(true)} disabled={loading}>
          <ScanLine size={18} /> Bắt đầu quét bằng camera
        </button>

        <div className="scan-medicine-divider"><span>hoặc</span></div>

        <form className="scan-medicine-manual" onSubmit={handleManualSubmit}>
          <input
            type="text"
            placeholder="Nhập mã vạch sản phẩm..."
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            disabled={loading}
          />
          <button type="submit" disabled={loading || !manualCode.trim()}>
            <Search size={16} /> Tìm
          </button>
        </form>

        {loading && <p className="scan-medicine-status">Đang tra cứu...</p>}

        {notFoundCode && !loading && (
          <div className="scan-medicine-notfound">
            <PackageX size={20} />
            <span>Không tìm thấy sản phẩm với mã <strong>{notFoundCode}</strong>. Vui lòng thử lại hoặc liên hệ nhà thuốc.</span>
          </div>
        )}

        {error && !loading && <p className="scan-medicine-error">{error}</p>}
      </div>

      {showScanner && (
        <BarcodeScannerModal onDetected={handleDetected} onClose={() => setShowScanner(false)} />
      )}
    </div>
  );
};

export default ScanMedicineView;
