import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Calendar, ChevronLeft, ChevronRight, Clock, ImagePlus, MapPin, ShieldCheck, X } from 'lucide-react';
import * as api from '../services/api';
import { formatDateTimeVN } from '../utils/dateUtils';
import './AppointmentBooking.css';

const LOCATIONS = ['Nhà thuốc TMPMS - Quận 1', 'Nhà thuốc TMPMS - Cầu Giấy'];
const HOLD_WARNING_MS = 2 * 60 * 1000;
const pad = n => String(n).padStart(2, '0');
const dateInput = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const formatCountdown = ms => {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(totalSec / 60)}:${pad(totalSec % 60)}`;
};

export default function AppointmentBooking({ appointments = [], onBooked, onBack, initialHold = null }) {
  // Trợ lý AI đã giữ chỗ 1 khung giờ cụ thể trước khi vào trang này (vd "đặt lịch lúc 9h mai") —
  // vào thẳng bước 3 (xác nhận + đặt cọc) với chỗ đã giữ sẵn, khỏi bắt khách chọn lại ngày/giờ.
  const [step, setStep] = useState(initialHold ? 3 : 1);
  const [symptoms, setSymptoms] = useState(initialHold?.symptomHint || '');
  const [symptomsError, setSymptomsError] = useState('');
  const [note, setNote] = useState('');
  const [image, setImage] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [location, setLocation] = useState(initialHold?.location || LOCATIONS[0]);
  const [date, setDate] = useState(dateInput(new Date()));
  const [slots, setSlots] = useState([]);
  const [selected, setSelected] = useState(initialHold?.appointmentDate || null);
  const [hold, setHold] = useState(initialHold ? { token: initialHold.token, expiresAt: initialHold.expiresAt, depositAmount: initialHold.depositAmount } : null);
  const [forceExpired, setForceExpired] = useState(false);
  const [policy, setPolicy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errorKind, setErrorKind] = useState('generic'); // validation | conflict | network | payment | generic
  const [wasDemo, setWasDemo] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [holdAnnouncement, setHoldAnnouncement] = useState('');
  const activeCount = useMemo(() => appointments.filter(a => ['PendingConfirmation', 'Confirmed', 'CheckedIn', 'AlternativeProposed', 'RescheduleRequested'].includes(a.status)).length, [appointments]);

  // Khách hàng đến bước này với triệu chứng đã điền sẵn (từ Tự chẩn đoán hoặc Trợ lý AI) —
  // nêu rõ nguồn gốc để họ không thắc mắc vì sao ô này đã có nội dung.
  const autoFilledSource = initialHold?.symptomHint?.startsWith('Tự chẩn đoán') ? 'kết quả Tự chẩn đoán Đông Y' : initialHold?.symptomHint ? 'Trợ lý AI' : null;

  const clearError = () => { setError(''); setErrorKind('generic'); };
  const setErr = (kind, message) => { setErrorKind(kind); setError(message); };
  // "Hết hạn" trong thông báo lỗi từ server nghĩa là chỗ giữ đã bị hủy phía backend (đúng lúc khách
  // bấm thanh toán) — coi như xung đột giữ chỗ, không phải lỗi mạng/thanh toán thông thường.
  const reportFailure = (e, fallbackKind) => {
    if (/hết hạn|expired/i.test(e.message)) { setForceExpired(true); setErr('conflict', e.message); }
    else setErr(fallbackKind, e.message);
  };

  useEffect(() => {
    if (step !== 2) return;
    setBusy(true); setSelected(null); clearError();
    api.fetchAppointmentAvailability(date, location).then(setSlots).catch(e => setErr('network', e.message)).finally(() => setBusy(false));
  }, [step, date, location]);

  // Đếm ngược thời gian giữ chỗ còn lại ở bước xác nhận + đặt cọc — khung giờ chỉ được giữ 15 phút,
  // hết hạn mà không thấy cảnh báo thì khách sẽ bị lỗi bất ngờ ngay lúc quét mã thanh toán.
  useEffect(() => {
    if (step !== 3 || !hold?.expiresAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [step, hold?.expiresAt]);

  const holdRemainingMs = hold?.expiresAt ? new Date(hold.expiresAt).getTime() - now : null;
  const holdExpired = forceExpired || (holdRemainingMs !== null && holdRemainingMs <= 0);
  const holdWarning = !holdExpired && holdRemainingMs !== null && holdRemainingMs <= HOLD_WARNING_MS;

  // Báo trạng thái đếm ngược cho screen reader chỉ khi CHUYỂN mức (bình thường → sắp hết hạn → hết
  // hạn), không lặp lại mỗi giây — announce theo giây sẽ làm ồn quá mức với người dùng trình đọc màn hình.
  useEffect(() => {
    if (holdExpired) setHoldAnnouncement('Khung giờ giữ chỗ đã hết hạn.');
    else if (holdWarning) setHoldAnnouncement('Khung giờ giữ chỗ sắp hết hạn.');
  }, [holdExpired, holdWarning]);

  const slotGroups = useMemo(() => ([
    { label: 'Buổi sáng', items: slots.filter(s => new Date(s.appointmentDate).getHours() < 12) },
    { label: 'Buổi chiều', items: slots.filter(s => new Date(s.appointmentDate).getHours() >= 12) }
  ]), [slots]);

  const continueInfo = async () => {
    setSymptomsError('');
    if (!symptoms.trim()) { setSymptomsError('Vui lòng mô tả triệu chứng trước khi tiếp tục.'); return; }
    setBusy(true); clearError();
    try {
      if (image) setImageUrl((await api.uploadAppointmentPrescription(image)).url);
      setStep(2);
    } catch (e) { reportFailure(e, 'network'); } finally { setBusy(false); }
  };

  const holdSlot = async () => {
    if (!selected) { setErr('validation', 'Vui lòng chọn một khung giờ còn trống.'); return; }
    setBusy(true); clearError();
    try { setForceExpired(false); setHold(await api.holdAppointmentSlot(selected, location)); setStep(3); }
    catch (e) {
      reportFailure(e, 'conflict');
      // Khung giờ vừa chọn nhiều khả năng vừa bị người khác giữ trước — tải lại danh sách ngay để
      // khách thấy đúng trạng thái còn trống, thay vì phải tự bấm làm mới.
      setSelected(null);
      api.fetchAppointmentAvailability(date, location).then(setSlots).catch(() => {});
    }
    finally { setBusy(false); }
  };

  const checkout = async () => {
    if (!policy) { setErr('validation', 'Vui lòng xác nhận đã đọc chính sách.'); return; }
    setBusy(true); clearError();
    try {
      const payment = await api.checkoutAppointment({ holdToken: hold.token, symptomDescription: symptoms, prescriptionImageUrl: imageUrl || null, note, paymentMethod: 'PayOS', policyAccepted: true, returnUrl: `${window.location.origin}/?appointmentPayment=success`, cancelUrl: `${window.location.origin}/?appointmentPayment=cancelled` });
      sessionStorage.setItem('appointmentPaymentOrderCode', String(payment.orderCode));
      window.location.assign(payment.checkoutUrl);
    } catch (e) { reportFailure(e, 'payment'); }
    finally { setBusy(false); }
  };

  const demoCheckout = async () => {
    if (!policy) { setErr('validation', 'Vui lòng xác nhận đã đọc chính sách.'); return; }
    setBusy(true); clearError();
    try {
      const payment = await api.checkoutAppointment({ holdToken: hold.token, symptomDescription: symptoms, prescriptionImageUrl: imageUrl || null, note, paymentMethod: 'PayOS', policyAccepted: true, returnUrl: `${window.location.origin}/?appointmentPayment=success`, cancelUrl: `${window.location.origin}/?appointmentPayment=cancelled` });
      await api.demoPayOSAppointment(payment.orderCode);
      setWasDemo(true);
      setStep(4);
      if (onBooked) onBooked();
    } catch (e) { reportFailure(e, 'payment'); }
    finally { setBusy(false); }
  };

  const backToSlotPicker = () => { setForceExpired(false); setHold(null); setSelected(null); setStep(2); };
  const removeAttachment = () => { setImage(null); setImageUrl(''); };

  if (activeCount >= 3) return <div className="booking-shell booking-limit"><Calendar size={40}/><h3>Bạn đã có đủ 3 lịch đang hoạt động</h3><p>Vui lòng hoàn thành hoặc hủy một lịch trước khi đặt tiếp.</p><button onClick={onBack}>Quay lại danh sách lịch</button></div>;

  return <div className="booking-shell">
    {step < 4 && <div className="booking-progress"><span className={step >= 1 ? 'active' : ''}>1. Thông tin khám</span><span className={step >= 2 ? 'active' : ''}>2. Chọn lịch</span><span className={step >= 3 ? 'active' : ''}>3. Đặt cọc</span></div>}
    {error && <div className={`booking-error booking-error-${errorKind}`} role="alert" aria-live="assertive"><AlertTriangle size={16}/> {error}</div>}
    {step === 1 && <section>
      <h3>Mô tả tình trạng cần khám</h3>
      <p className="booking-muted">Mô tả ngắn gọn trong 1–2 dòng, hoặc <button type="button" className="booking-inline-link" onClick={() => window.dispatchEvent(new CustomEvent('app-navigate', { detail: 'diagnose' }))}>làm Tự chẩn đoán Đông Y trước</button> để hệ thống gợi ý thể bệnh và tự điền phần mô tả này giúp bạn.</p>
      <label>Triệu chứng *</label><textarea rows="3" maxLength="500" value={symptoms} onChange={e => { setSymptoms(e.target.value); if (symptomsError) setSymptomsError(''); }} placeholder="Ví dụ: Đau lưng âm ỉ 3 ngày, đau tăng khi cúi người…" />
      {symptomsError && <p className="booking-field-error">{symptomsError}</p>}
      <label>Ảnh đơn thuốc nếu có</label><label className="booking-upload"><ImagePlus size={20}/>{image ? image.name : 'Chọn ảnh JPG, PNG hoặc WEBP'}<input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setImage(e.target.files?.[0] || null)}/></label>
      <label>Ghi chú bổ sung</label><textarea rows="2" maxLength="500" value={note} onChange={e => setNote(e.target.value)} placeholder="Dị ứng thuốc, bệnh nền hoặc yêu cầu hỗ trợ…"/>
      <div className="booking-actions"><button className="secondary" onClick={onBack}><ChevronLeft size={16}/> Quay lại</button><button onClick={continueInfo} disabled={busy}>Tiếp tục <ChevronRight size={16}/></button></div>
    </section>}
    {step === 2 && <section>
      <h3>Chọn ngày và khung giờ</h3>
      <div className="booking-fields"><label><MapPin size={15}/> Địa điểm<select value={location} onChange={e => setLocation(e.target.value)}>{LOCATIONS.map(x => <option key={x}>{x}</option>)}</select></label><label><Calendar size={15}/> Ngày khám<input type="date" min={dateInput(new Date())} max={dateInput(new Date(Date.now() + 14*86400000))} value={date} onChange={e => setDate(e.target.value)}/></label></div>
      <div className="booking-slots-wrap">
        {busy ? <p>Đang tải khung giờ…</p> : slots.length === 0 ? <p className="booking-slots-empty">Không còn khung giờ trống cho ngày này — vui lòng chọn ngày khác.</p> : slotGroups.map(g => g.items.length > 0 && (
          <div className="booking-slot-group" key={g.label}>
            <span className="booking-slot-group-label">{g.label}</span>
            <div className="booking-slots">{g.items.map(s => { const time = new Date(s.appointmentDate).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}); return <button key={s.appointmentDate} disabled={!s.available} aria-label={s.available ? `Chọn khung giờ ${time}` : `Khung giờ ${time} đã kín`} className={selected === s.appointmentDate ? 'selected' : ''} onClick={() => setSelected(s.appointmentDate)}><Clock size={14}/>{time}</button>; })}</div>
          </div>
        ))}
      </div>
      <p className="booking-muted">Khung giờ được giữ trong 15 phút sau khi bạn tiếp tục.</p>
      <div className="booking-actions"><button className="secondary" onClick={() => setStep(1)}>Quay lại</button><button onClick={holdSlot} disabled={busy || !selected}>Giữ khung giờ</button></div>
    </section>}
    {step === 3 && <section>
      <h3>Xác nhận và đặt cọc</h3>
      {hold?.expiresAt && (
        <div className={`booking-hold-timer${holdExpired ? ' expired' : holdWarning ? ' warning' : ''}`}>
          <Clock size={15}/>
          {holdExpired
            ? <>Khung giờ giữ chỗ đã hết hạn — bấm "Chọn giờ khác" bên dưới để giữ lại một khung giờ mới.</>
            : <>Khung giờ đang được giữ — còn <strong>{formatCountdown(holdRemainingMs)}</strong> để hoàn tất đặt cọc.</>}
        </div>
      )}
      <span className="sr-only" role="status" aria-live="polite">{holdAnnouncement}</span>
      {autoFilledSource && <div className="booking-source-badge"><Activity size={14}/> Triệu chứng đã được điền tự động từ {autoFilledSource}.</div>}
      <div className="booking-summary">
        <div className="booking-summary-row">
          <div><span className="booking-summary-label">Triệu chứng</span><p className="booking-summary-value">{symptoms}</p></div>
          <button type="button" className="booking-edit-link" onClick={() => setStep(1)}>Chỉnh sửa</button>
        </div>
        {imageUrl && (
          <div className="booking-attachment">
            <img src={api.formatImageUrl(imageUrl)} alt="Ảnh đơn thuốc đã tải lên"/>
            <span>{image?.name || 'Ảnh đơn thuốc đính kèm'}</span>
            <button type="button" className="booking-edit-link" onClick={removeAttachment}><X size={13}/> Xóa ảnh</button>
          </div>
        )}
        <p><b>Thời gian:</b> {formatDateTimeVN(selected)}</p><p><b>Địa điểm:</b> {location}</p><p><b>Tiền cọc:</b> {Number(hold?.depositAmount || 0).toLocaleString('vi-VN')}đ</p>
      </div>
      <div className="booking-policy">
        <details className="booking-policy-details">
          <summary>Chính sách đổi, hủy và hoàn tiền</summary>
          <p>Hủy trước ít nhất 24 giờ: hoàn 100%. Hủy trong vòng 24 giờ: hoàn 50%. Không đến hoặc muộn quá 15 phút: không hoàn tiền. Nhà thuốc từ chối: hoàn 100%.</p>
        </details>
        <label><input type="checkbox" checked={policy} onChange={e => setPolicy(e.target.checked)}/> Tôi đã đọc và đồng ý chính sách</label>
      </div>
      <div className="booking-payment-method"><b>Phương thức thanh toán:</b> PayOS / Chuyển khoản ngân hàng (VietQR)</div>
      <div className="booking-actions column">
        <div className="booking-actions-row">
          <button className="secondary" onClick={backToSlotPicker}>Chọn giờ khác</button>
          <button onClick={checkout} disabled={busy || !policy || !symptoms.trim() || holdExpired}><ShieldCheck size={16}/>{busy ? 'Đang xử lý…' : 'Quét mã VietQR PayOS'}</button>
        </div>
        <button type="button" className="booking-demo-link" onClick={demoCheckout} disabled={busy || !policy || !symptoms.trim() || holdExpired}>
          Dùng chế độ demo (giả lập đã thanh toán — chỉ để kiểm thử)
        </button>
      </div>
    </section>}
    {step === 4 && <section className="booking-success">
      <ShieldCheck size={54}/><h3>Đặt lịch thành công</h3>
      <p>Lịch đang chờ nhà thuốc xác nhận. Giao dịch tiền cọc đã được ghi nhận.</p>
      <div className="booking-success-summary">
        <p><b>Thời gian:</b> {formatDateTimeVN(selected)}</p><p><b>Địa điểm:</b> {location}</p><p><b>Tiền cọc:</b> {Number(hold?.depositAmount || 0).toLocaleString('vi-VN')}đ</p>
      </div>
      <p className="booking-muted">Bạn sẽ nhận thông báo ngay khi nhà thuốc xác nhận lịch hẹn này.</p>
      {wasDemo && <p className="booking-demo-note">(Đã xác nhận qua chế độ demo)</p>}
      <button onClick={onBack}>Xem danh sách lịch</button>
    </section>}
  </div>;
}
