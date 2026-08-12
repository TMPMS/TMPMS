import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, ImagePlus, MapPin, ShieldCheck } from 'lucide-react';
import * as api from '../services/api';
import { toLocalWallClockIso } from '../utils/dateTime';
import { formatDateTimeVN } from '../utils/dateUtils';
import './AppointmentBooking.css';

const LOCATIONS = ['Nhà thuốc TMPMS - Quận 1', 'Nhà thuốc TMPMS - Cầu Giấy'];
const pad = n => String(n).padStart(2, '0');
const dateInput = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export default function AppointmentBooking({ appointments = [], onBooked, onBack, initialHold = null }) {
  // Trợ lý AI đã giữ chỗ 1 khung giờ cụ thể trước khi vào trang này (vd "đặt lịch lúc 9h mai") —
  // vào thẳng bước 3 (xác nhận + đặt cọc) với chỗ đã giữ sẵn, khỏi bắt khách chọn lại ngày/giờ.
  const [step, setStep] = useState(initialHold ? 3 : 1);
  const [symptoms, setSymptoms] = useState(initialHold?.symptomHint || '');
  const [note, setNote] = useState('');
  const [image, setImage] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [location, setLocation] = useState(initialHold?.location || LOCATIONS[0]);
  const [date, setDate] = useState(dateInput(new Date()));
  const [slots, setSlots] = useState([]);
  const [selected, setSelected] = useState(initialHold?.appointmentDate || null);
  const [hold, setHold] = useState(initialHold ? { token: initialHold.token, expiresAt: initialHold.expiresAt, depositAmount: initialHold.depositAmount } : null);
  const [policy, setPolicy] = useState(false);
  const [method, setMethod] = useState('PayOS');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const activeCount = useMemo(() => appointments.filter(a => ['PendingConfirmation', 'Confirmed', 'CheckedIn', 'AlternativeProposed', 'RescheduleRequested'].includes(a.status)).length, [appointments]);

  useEffect(() => {
    if (step !== 2) return;
    setBusy(true); setSelected(null); setError('');
    api.fetchAppointmentAvailability(date, location).then(setSlots).catch(e => setError(e.message)).finally(() => setBusy(false));
  }, [step, date, location]);

  const continueInfo = async () => {
    if (!symptoms.trim()) return setError('Vui lòng mô tả triệu chứng trước khi tiếp tục.');
    setBusy(true); setError('');
    try {
      if (image) setImageUrl((await api.uploadAppointmentPrescription(image)).url);
      setStep(2);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const holdSlot = async () => {
    if (!selected) return setError('Vui lòng chọn một khung giờ còn trống.');
    setBusy(true); setError('');
    try { setHold(await api.holdAppointmentSlot(selected, location)); setStep(3); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const checkout = async () => {
    if (!policy) return setError('Vui lòng xác nhận đã đọc chính sách.');
    setBusy(true); setError('');
    try {
      const payment = await api.checkoutAppointment({ holdToken: hold.token, symptomDescription: symptoms, prescriptionImageUrl: imageUrl || null, note, paymentMethod: 'PayOS', policyAccepted: true, returnUrl: `${window.location.origin}/?appointmentPayment=success`, cancelUrl: `${window.location.origin}/?appointmentPayment=cancelled` });
      sessionStorage.setItem('appointmentPaymentOrderCode', String(payment.orderCode));
      window.location.assign(payment.checkoutUrl);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const demoCheckout = async () => {
    if (!policy) return setError('Vui lòng xác nhận đã đọc chính sách.');
    setBusy(true); setError('');
    try {
      const payment = await api.checkoutAppointment({ holdToken: hold.token, symptomDescription: symptoms, prescriptionImageUrl: imageUrl || null, note, paymentMethod: 'PayOS', policyAccepted: true, returnUrl: `${window.location.origin}/?appointmentPayment=success`, cancelUrl: `${window.location.origin}/?appointmentPayment=cancelled` });
      await api.demoPayOSAppointment(payment.orderCode);
      alert('⚡ GIẢ LẬP DEMO: Đã xác nhận thanh toán tiền cọc lịch hẹn thành công!');
      setStep(4);
      if (onBooked) onBooked();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  if (activeCount >= 3) return <div className="booking-shell booking-limit"><Calendar size={40}/><h3>Bạn đã có đủ 3 lịch đang hoạt động</h3><p>Vui lòng hoàn thành hoặc hủy một lịch trước khi đặt tiếp.</p><button onClick={onBack}>Quay lại danh sách lịch</button></div>;

  return <div className="booking-shell">
    <div className="booking-progress"><span className={step >= 1 ? 'active' : ''}>1. Thông tin khám</span><span className={step >= 2 ? 'active' : ''}>2. Chọn lịch</span><span className={step >= 3 ? 'active' : ''}>3. Đặt cọc</span></div>
    {error && <div className="booking-error">{error}</div>}
    {step === 1 && <section>
      <h3>Mô tả tình trạng cần khám</h3><p className="booking-muted">Không cần làm khảo sát. Hãy mô tả ngắn gọn trong 1–2 dòng.</p>
      <label>Triệu chứng *</label><textarea rows="3" maxLength="500" value={symptoms} onChange={e => setSymptoms(e.target.value)} placeholder="Ví dụ: Đau lưng âm ỉ 3 ngày, đau tăng khi cúi người…" />
      <label>Ảnh đơn thuốc nếu có</label><label className="booking-upload"><ImagePlus size={20}/>{image ? image.name : 'Chọn ảnh JPG, PNG hoặc WEBP'}<input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setImage(e.target.files?.[0] || null)}/></label>
      <label>Ghi chú bổ sung</label><textarea rows="2" value={note} onChange={e => setNote(e.target.value)} placeholder="Dị ứng thuốc, bệnh nền hoặc yêu cầu hỗ trợ…"/>
      <div className="booking-actions"><button className="secondary" onClick={onBack}><ChevronLeft size={16}/> Quay lại</button><button onClick={continueInfo} disabled={busy}>Tiếp tục <ChevronRight size={16}/></button></div>
    </section>}
    {step === 2 && <section>
      <h3>Chọn ngày và khung giờ</h3>
      <div className="booking-fields"><label><MapPin size={15}/> Địa điểm<select value={location} onChange={e => setLocation(e.target.value)}>{LOCATIONS.map(x => <option key={x}>{x}</option>)}</select></label><label><Calendar size={15}/> Ngày khám<input type="date" min={dateInput(new Date())} max={dateInput(new Date(Date.now() + 14*86400000))} value={date} onChange={e => setDate(e.target.value)}/></label></div>
      <div className="booking-slots">{busy ? <p>Đang tải khung giờ…</p> : slots.map(s => <button key={s.appointmentDate} disabled={!s.available} className={selected === s.appointmentDate ? 'selected' : ''} onClick={() => setSelected(s.appointmentDate)}><Clock size={14}/>{new Date(s.appointmentDate).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}</button>)}</div>
      <p className="booking-muted">Khung giờ được giữ trong 15 phút sau khi bạn tiếp tục.</p>
      <div className="booking-actions"><button className="secondary" onClick={() => setStep(1)}>Quay lại</button><button onClick={holdSlot} disabled={busy || !selected}>Giữ khung giờ</button></div>
    </section>}
    {step === 3 && <section>
      <h3>Xác nhận và đặt cọc</h3>
      <div className="booking-summary">
        <label>Triệu chứng *</label>
        <textarea rows="2" maxLength="500" value={symptoms} onChange={e => setSymptoms(e.target.value)} placeholder="Mô tả ngắn gọn triệu chứng/lý do khám…" />
        <p><b>Thời gian:</b> {formatDateTimeVN(selected)}</p><p><b>Địa điểm:</b> {location}</p><p><b>Tiền cọc:</b> {Number(hold?.depositAmount || 0).toLocaleString('vi-VN')}đ</p>
      </div>
      <div className="booking-policy"><b>Chính sách đổi, hủy và hoàn tiền</b><p>Hủy trước ít nhất 24 giờ: hoàn 100%. Hủy trong vòng 24 giờ: hoàn 50%. Không đến hoặc muộn quá 15 phút: không hoàn tiền. Nhà thuốc từ chối: hoàn 100%.</p><label><input type="checkbox" checked={policy} onChange={e => setPolicy(e.target.checked)}/> Tôi đã đọc và đồng ý chính sách</label></div>
      <label>Phương thức thanh toán<select value={method} onChange={e => setMethod(e.target.value)}><option value="PayOS">PayOS / Chuyển khoản ngân hàng</option></select></label>
      <div className="booking-actions" style={{ flexDirection: 'column', gap: '10px', width: '100%' }}>
        <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
          <button className="secondary" style={{ flex: 1 }} onClick={() => setStep(2)}>Chọn giờ khác</button>
          <button style={{ flex: 2 }} onClick={checkout} disabled={busy || !policy || !symptoms.trim()}><ShieldCheck size={16}/>{busy ? 'Đang xử lý…' : 'Quét mã VietQR PayOS'}</button>
        </div>
        <button
          type="button"
          onClick={demoCheckout}
          disabled={busy || !policy || !symptoms.trim()}
          style={{
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: '#ffffff',
            border: 'none',
            padding: '12px 20px',
            borderRadius: '10px',
            fontWeight: 'bold',
            fontSize: '14px',
            cursor: 'pointer',
            width: '100%',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
          }}
        >
          ⚡ Thanh toán DEMO (Xác nhận Đã cọc thành công ngay)
        </button>
      </div>
    </section>}
    {step === 4 && <section className="booking-success"><ShieldCheck size={54}/><h3>Đặt lịch thành công</h3><p>Lịch đang chờ nhà thuốc xác nhận. Giao dịch tiền cọc đã được ghi nhận.</p><button onClick={onBack}>Xem danh sách lịch</button></section>}
  </div>;
}
