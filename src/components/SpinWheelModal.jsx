import { useState, useEffect, useRef } from 'react';
import { X, Gift, Ticket, Copy, Check } from 'lucide-react';
import * as api from '../services/api';
import './SpinWheelModal.css';

const SEGMENT_COLORS = [
  '#0d9488', '#7c3aed', '#ea580c', '#0284c7',
  '#be185d', '#16a34a', '#d97706', '#4f46e5'
];

const SPIN_TURNS = 5;

const formatVnd = (n) => new Intl.NumberFormat('vi-VN').format(n) + 'đ';

const shortLabel = (prize) => {
  const amount = prize.discountType === 'percent' ? `${prize.discountValue}%` : `${Math.round(prize.discountValue / 1000)}K`;
  return `${amount} ${prize.type === 'shipping' ? 'SHIP' : 'SP'}`;
};

const SpinWheelModal = ({ isOpen, onClose }) => {
  const [prizes, setPrizes] = useState([]);
  const [status, setStatus] = useState(null); // { canSpinToday, nextResetAtUtc, lastSpin }
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null); // voucher trúng thưởng
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const wheelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setResult(null);
    setLoading(true);
    Promise.all([api.fetchWheelPrizes(), api.fetchWheelStatus()])
      .then(([prizeList, statusData]) => {
        setPrizes(prizeList);
        setStatus(statusData);
      })
      .catch((err) => setError(err.message || 'Không thể tải vòng quay.'))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const wheelBackground = prizes.length > 0
    ? `conic-gradient(${prizes.map((_, i) => {
        const start = (360 / prizes.length) * i;
        const end = (360 / prizes.length) * (i + 1);
        const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
        return `${color} ${start}deg ${end}deg`;
      }).join(', ')})`
    : '#e2e8f0';

  const resolveSpinResult = () => {
    const pending = wheelRef.current?.__pendingResult;
    if (!pending) return;
    wheelRef.current.__pendingResult = null;
    setSpinning(false);
    setResult(pending.voucher);
    setStatus((prev) => ({ ...prev, canSpinToday: false, lastSpin: { voucher: pending.voucher } }));
  };

  const handleSpin = async () => {
    if (spinning || !status?.canSpinToday || prizes.length === 0) return;
    setError('');
    setSpinning(true);
    try {
      const res = await api.spinWheel();
      const segAngle = 360 / prizes.length;
      const centerAngle = res.prizeIndex * segAngle + segAngle / 2;
      const targetMod = (360 - centerAngle) % 360;
      setRotation((prev) => {
        const prevMod = prev % 360;
        const delta = (targetMod - prevMod + 360) % 360;
        return prev + SPIN_TURNS * 360 + delta;
      });
      // Kết quả hiển thị sau khi animation quay xong. Chủ yếu dựa vào onTransitionEnd,
      // nhưng vẫn đặt timeout dự phòng (khớp thời lượng CSS transition) phòng trường hợp
      // trình duyệt không bắn sự kiện transitionend (tab bị throttle/ẩn, giảm hiệu ứng...).
      if (wheelRef.current) wheelRef.current.__pendingResult = res;
      setTimeout(resolveSpinResult, 4300);
    } catch (err) {
      setSpinning(false);
      setError(err.message || 'Không thể quay lúc này.');
    }
  };

  const handleTransitionEnd = () => resolveSpinResult();

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lastWonVoucher = result || status?.lastSpin?.voucher;

  return (
    <div className="wheel-modal-overlay" onClick={onClose}>
      <div className="wheel-modal" onClick={(e) => e.stopPropagation()}>
        <button className="wheel-modal-close" onClick={onClose}><X size={20} /></button>
        <h2 className="wheel-modal-title"><Gift size={20} /> Vòng quay may mắn hôm nay</h2>
        <p className="wheel-modal-subtitle">Mỗi ngày một lượt quay — trúng ngay voucher giảm giá!</p>

        {loading ? (
          <div className="wheel-loading">Đang tải vòng quay...</div>
        ) : (
          <>
            <div className="wheel-stage">
              <div className="wheel-pointer" />
              <div
                ref={wheelRef}
                className="wheel-disc"
                style={{ background: wheelBackground, transform: `rotate(${rotation}deg)` }}
                onTransitionEnd={handleTransitionEnd}
              >
                {prizes.map((p, i) => {
                  const segAngle = 360 / prizes.length;
                  const labelAngle = segAngle * i + segAngle / 2;
                  return (
                    <div
                      key={p.id}
                      className="wheel-segment-label"
                      style={{ transform: `rotate(${labelAngle}deg) translateY(-92px)` }}
                    >
                      <span style={{ transform: `rotate(${-labelAngle}deg)` }}>{shortLabel(p)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="wheel-center-btn">
                <button
                  className="wheel-spin-btn"
                  disabled={spinning || !status?.canSpinToday || prizes.length === 0}
                  onClick={handleSpin}
                >
                  {spinning ? '...' : status?.canSpinToday ? 'QUAY' : 'Hẹn mai'}
                </button>
              </div>
            </div>

            {error && <div className="wheel-error">{error}</div>}

            {!status?.canSpinToday && !spinning && (
              <p className="wheel-hint">Bạn đã quay hôm nay rồi, quay lại vào ngày mai nhé!</p>
            )}

            {lastWonVoucher && !spinning && (
              <div className="wheel-result-card">
                <div className="wheel-result-badge"><Ticket size={14} /> {result ? 'Chúc mừng bạn đã trúng!' : 'Phần thưởng gần nhất'}</div>
                <div className="wheel-result-name">{lastWonVoucher.name}</div>
                <div className="wheel-result-code-row">
                  <span className="wheel-result-code">{lastWonVoucher.code}</span>
                  <button className="wheel-result-copy" onClick={() => handleCopy(lastWonVoucher.code)}>
                    {copied ? <><Check size={12} /> Đã copy</> : <><Copy size={12} /> Sao chép</>}
                  </button>
                </div>
                {lastWonVoucher.minOrderValue > 0 && (
                  <div className="wheel-result-condition">Đơn tối thiểu {formatVnd(lastWonVoucher.minOrderValue)}</div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SpinWheelModal;
