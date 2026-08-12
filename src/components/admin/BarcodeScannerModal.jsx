import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, ScanLine } from 'lucide-react';

const SCANNER_ELEMENT_ID = 'barcode-scanner-viewport';

// Modal quét mã vạch/QR bằng camera thiết bị. Dùng chung cho form sản phẩm (điền mã vạch)
// và tab Kho hàng (tra cứu nhanh 1 sản phẩm để nhập/kiểm kê lô hàng).
const BarcodeScannerModal = ({ onDetected, onClose }) => {
  const scannerRef = useRef(null);
  const [error, setError] = useState('');
  const detectedRef = useRef(false);

  // Giữ callback mới nhất trong ref thay vì đưa `onDetected` vào dependency array: cả 2 nơi gọi
  // component này (ProductsTab/InventoryTab) truyền vào 1 hàm arrow inline mới mỗi lần render,
  // nên nếu effect phụ thuộc [onDetected], bất kỳ re-render nào của component cha khi modal đang
  // mở (gõ vào ô khác, 1 fetch không liên quan hoàn tất...) cũng làm effect chạy lại — tắt rồi mở
  // lại camera giữa chừng, gây NotReadableError hoặc preview giật liên tục không kịp quét.
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;

  useEffect(() => {
    const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
    scannerRef.current = scanner;
    const state = { unmounted: false, running: false };

    const stopSafely = () => {
      // html5-qrcode's stop() throws SYNCHRONOUSLY (not a rejected promise) if start()
      // never succeeded (camera denied/unavailable) — a bare .catch() on the chain does
      // not catch a throw that happens before the promise exists, so wrap in try/catch too.
      if (!state.running) return;
      state.running = false;
      try {
        scanner.stop().then(() => scanner.clear()).catch(() => {});
      } catch {}
    };

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 150 } },
      (decodedText) => {
        if (detectedRef.current) return;
        detectedRef.current = true;
        onDetectedRef.current(decodedText);
      },
      () => {} // lỗi từng frame không tìm thấy mã — bỏ qua, không phải lỗi thật
    ).then(() => {
      state.running = true;
      // Modal đã bị đóng trước khi camera kịp khởi động xong — tắt ngay để không rò camera.
      if (state.unmounted) stopSafely();
    }).catch((err) => {
      setError('Không thể mở camera. Vui lòng cấp quyền camera cho trình duyệt hoặc nhập mã thủ công.');
      console.error(err);
    });

    return () => {
      state.unmounted = true;
      stopSafely();
    };
    // Cố ý chỉ chạy 1 lần khi mount/unmount — xem ghi chú ở onDetectedRef phía trên.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
    }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ScanLine size={18} /> Quét mã vạch / QR
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ padding: 16 }}>
          <div id={SCANNER_ELEMENT_ID} style={{ width: '100%', borderRadius: 10, overflow: 'hidden' }} />
          {error && <p style={{ color: '#dc2626', fontSize: 13, marginTop: 10 }}>{error}</p>}
          <p style={{ fontSize: 12, color: '#6b7280', marginTop: 10, textAlign: 'center' }}>
            Đưa mã vạch/QR vào giữa khung hình để quét tự động.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScannerModal;
