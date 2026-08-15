import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';
import { Leaf, Activity, Sparkles, Check, ChevronRight, Calendar, ShoppingCart, ArrowLeft, RotateCcw, AlertCircle, XCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { toLocalWallClockIso } from '../utils/dateTime';
import { formatDateTimeVN } from '../utils/dateUtils';
import TongueAnalysisCard from '../components/ui/TongueAnalysisCard';
import './SelfDiagnosis.css';

const pad = n => String(n).padStart(2, '0');

function toDateInput(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function buildTimeSlots() {
  const slots = [];
  for (let h = 8; h <= 17; h++) {
    slots.push(`${pad(h)}:00`, `${pad(h)}:30`);
  }
  return slots;
}

function slotToDate(dateStr, slot) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [hh, mm] = slot.split(':').map(Number);
  return new Date(y, mo - 1, d, hh, mm, 0, 0);
}

function isSlotPassed(dateStr, slot) {
  return slotToDate(dateStr, slot) <= new Date();
}

const formatDateTime = (value) => formatDateTimeVN(value);

const APPT_STATUS_LABELS = {
  Pending: 'Chờ xác nhận',
  PendingConfirmation: 'Chờ xác nhận',
  Scheduled: 'Chờ xác nhận',
  Confirmed: 'Đã xác nhận',
  Completed: 'Hoàn thành',
  Cancelled: 'Đã hủy',
  Rejected: 'Đã từ chối',
  Expired: 'Quá hạn'
};

const SelfDiagnosis = ({ onBack, onNavigateToLogin, onAppointmentBooked }) => {
  const { user } = useAuth();
  const { addToCart } = useCart();

  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [history, setHistory] = useState([]); // câu hỏi đã hiển thị theo thứ tự (adaptive)
  const [answers, setAnswers] = useState([]); // [{ questionId, answerOptionId }] — song song history[0..length-1]
  const [minRecommended, setMinRecommended] = useState(6);
  const [loadingNext, setLoadingNext] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingDate, setBookingDate] = useState(() => toDateInput(new Date()));
  const [timeSlot, setTimeSlot] = useState(() => buildTimeSlots().find(s => !isSlotPassed(toDateInput(new Date()), s)) || buildTimeSlots()[buildTimeSlots().length - 1]);
  const [blockingAppt, setBlockingAppt] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [lastBooked, setLastBooked] = useState(null);

  const todayStr = toDateInput(new Date());
  const maxDateStr = toDateInput(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000));
  const TIME_SLOTS = buildTimeSlots();

  useEffect(() => {
    loadFirstQuestion();
  }, []);

  // Câu hỏi tự chẩn đoán thích ứng: BE chọn câu hỏi kế tiếp phân biệt tốt nhất giữa các thể bệnh
  // đang dẫn đầu dựa trên answers hiện có, thay vì hỏi hết 1 bộ câu hỏi cố định theo thứ tự.
  const loadFirstQuestion = async () => {
    setLoadingQuestions(true);
    try {
      const data = await api.fetchNextDiagnosisQuestion([]);
      if (data?.nextQuestion) {
        setCurrentQuestion(data.nextQuestion);
        setHistory([data.nextQuestion]);
        setMinRecommended(data.minRecommended || 6);
      }
    } catch (err) {
      console.error('Không thể nạp câu hỏi tự chẩn đoán:', err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleSelectOption = async (questionId, optionId) => {
    const nextAnswers = [...answers, { questionId, answerOptionId: optionId }];
    setAnswers(nextAnswers);
    setLoadingNext(true);
    try {
      const data = await api.fetchNextDiagnosisQuestion(nextAnswers);
      if (data?.done || !data?.nextQuestion) {
        await submitDiagnosis(nextAnswers);
      } else {
        setCurrentQuestion(data.nextQuestion);
        setHistory(prev => [...prev, data.nextQuestion]);
      }
    } catch (err) {
      console.error('Không thể tải câu hỏi tiếp theo:', err);
      // Không lấy được câu tiếp theo -> vẫn cố phân tích với các câu đã trả lời thay vì kẹt màn hình
      await submitDiagnosis(nextAnswers);
    } finally {
      setLoadingNext(false);
    }
  };

  const handlePrevQuestion = () => {
    if (history.length <= 1) return;
    const prevHistory = history.slice(0, -1);
    const prevAnswers = answers.slice(0, -1);
    setHistory(prevHistory);
    setAnswers(prevAnswers);
    setCurrentQuestion(prevHistory[prevHistory.length - 1]);
  };

  const submitDiagnosis = async (finalAnswersList) => {
    setSubmitting(true);
    try {
      const res = await api.classifyDiagnosis(finalAnswersList);
      setResult(res);
    } catch (err) {
      console.error('Lỗi khi phân tích chẩn đoán:', err);
      alert('Đã xảy ra lỗi khi phân tích chẩn đoán. Vui lòng thử lại!');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDateChange = (dateStr) => {
    setBookingDate(dateStr);
    setBlockingAppt(null);
    if (isSlotPassed(dateStr, timeSlot)) {
      const next = TIME_SLOTS.find(s => !isSlotPassed(dateStr, s));
      setTimeSlot(next || TIME_SLOTS[TIME_SLOTS.length - 1]);
    }
  };

  const handleBookAppointment = async () => {
    if (!user) {
      alert('Vui lòng đăng nhập tài khoản để đăng ký lịch hẹn khám!');
      window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: 'login' }));
      if (onNavigateToLogin) onNavigateToLogin();
      return;
    }

    try {
      const syndromeName = result?.primarySyndrome?.name || 'Đông Y';
      const reasonText = `Tự chẩn đoán: Thể bệnh ${syndromeName}`;

      const apptDate = slotToDate(bookingDate, timeSlot);

      await api.createAppointment({
        appointmentDate: toLocalWallClockIso(apptDate),
        reason: reasonText,
        status: 'Scheduled',
        notes: `Phân tích thể bệnh: ${syndromeName}. Lời khuyên: ${result?.recommendationText}.`
      });

      setLastBooked({ date: apptDate, slot: timeSlot });
      setBookingSuccess(true);
      setBlockingAppt(null);
      if (onAppointmentBooked) onAppointmentBooked();
    } catch (err) {
      console.error(err);
      if (err.isBlocked && err.blockingAppointment) {
        setBlockingAppt(err.blockingAppointment);
      } else {
        alert(err.message || 'Đã xảy ra lỗi khi đăng ký lịch hẹn.');
      }
    }
  };

  const handleCancelBlocking = async () => {
    if (!blockingAppt) return;
    setCancelling(true);
    try {
      await api.cancelAppointment(blockingAppt.id);
      setBlockingAppt(null);
      alert('Đã hủy lịch hẹn cũ. Bạn có thể đặt lịch mới!');
      if (onAppointmentBooked) onAppointmentBooked();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Không thể hủy lịch hẹn. Vui lòng thử lại.');
    } finally {
      setCancelling(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setAnswers([]);
    setHistory([]);
    setCurrentQuestion(null);
    setBookingSuccess(false);
    setBlockingAppt(null);
    setLastBooked(null);
    loadFirstQuestion();
  };

  if (loadingQuestions) {
    return (
      <div className="self-diagnosis-container">
        <div className="loading-state-card">
          <Activity className="pulse-icon spinner" />
          <p>Đang nạp bộ câu hỏi tự chẩn đoán Đông Y...</p>
        </div>
      </div>
    );
  }

  const progressPercent = Math.min(100, Math.round((history.length / minRecommended) * 100));

  return (
    <div className="self-diagnosis-container">
      <button className="back-btn" onClick={onBack}>
        <ArrowLeft size={16} /> Quay lại trang chủ
      </button>

      {!result ? (
        <div className="diag-quiz-card">
          {/* Header & Progress Bar */}
          <div className="quiz-header">
            <div className="quiz-title-row">
              <Activity className="pulse-icon" />
              <h2>Tự Chẩn Đoán Thể Bệnh Đông Y</h2>
            </div>
            <p>Trả lời từng câu — AI Đông Y chọn câu hỏi tiếp theo dựa trên câu trả lời trước đó, thường dừng sau khoảng {minRecommended} câu khi đã đủ rõ ràng.</p>

            <div className="progress-bar-box">
              <div className="progress-bar-info">
                <span>Câu {history.length}</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
              </div>
            </div>
          </div>

          {/* Current Question Display */}
          {currentQuestion && (
            <div className="question-wizard-step">
              {currentQuestion.category && (
                <span className="category-tag">Nhóm: {currentQuestion.category}</span>
              )}
              <h3 className="wizard-question-text">{currentQuestion.questionText}</h3>

              <div className="wizard-options-list">
                {currentQuestion.answerOptions.map(opt => (
                  <button
                    key={opt.id}
                    className="wizard-option-btn"
                    disabled={loadingNext}
                    onClick={() => handleSelectOption(currentQuestion.id, opt.id)}
                  >
                    <div className="option-check-circle" />
                    <span>{opt.optionText}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Wizard Footer Controls */}
          <div className="wizard-footer">
            {history.length > 1 && (
              <button className="wizard-prev-btn" onClick={handlePrevQuestion} disabled={loadingNext}>
                <ArrowLeft size={16} /> Câu trước
              </button>
            )}
            {(loadingNext || submitting) && (
              <div className="submitting-indicator">
                <Activity className="spinner" size={18} /> {submitting ? 'Đang phân tích kết quả...' : 'Đang chọn câu hỏi tiếp theo...'}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Result Screen */
        <div className="diag-result-card">
          <div className="result-header">
            <Sparkles className="spark-icon" />
            <h3>Kết Quả Phân Loại Thể Bệnh Đông Y</h3>
            <span className="result-badge">Biện chứng luận trị</span>
          </div>

          <div className="result-body">
            <div className="syndrome-title-box">
              <span className="syndrome-code">{result.primarySyndrome?.code || 'ĐY'}</span>
              <div>
                <h4 className="disease-title">
                  {result.primarySyndrome?.name}
                  {result.secondarySyndrome && (
                    <span className="secondary-title"> (Kết hợp {result.secondarySyndrome.name})</span>
                  )}
                </h4>
                <p className="disease-desc">{result.description}</p>
              </div>
            </div>

            <div className="advice-section">
              <h5>🌱 Lời khuyên dưỡng sinh & Khuyến nghị y tế:</h5>
              <p>{result.recommendationText}</p>
            </div>

            {result.suggestedMedicines?.length > 0 && (
              <div className="suggested-medicines-section">
                <h5>💊 Sản phẩm gợi ý phù hợp thể bệnh {result.primarySyndrome?.name}:</h5>
                <div className="suggested-medicines-grid">
                  {result.suggestedMedicines.map(m => (
                    <div key={m.medicineId} className="suggested-medicine-card">
                      {m.imageUrl && <img src={api.formatImageUrl(m.imageUrl)} alt={m.name} />}
                      <div className="sm-info">
                        <span className="sm-name">{m.name}</span>
                        {m.price != null && <span className="sm-price">{m.price.toLocaleString('vi-VN')}đ</span>}
                        <p className="sm-reason">{m.reason}</p>
                      </div>
                      <button className="sm-add-btn" onClick={() => addToCart({ id: m.medicineId, name: m.name }, 1)}>
                        <ShoppingCart size={14} /> Thêm vào giỏ
                      </button>
                    </div>
                  ))}
                </div>
                <p className="sm-disclaimer">
                  {result.suggestedMedicines.some(m => m.isAiGenerated)
                    ? 'Gợi ý bởi AI dựa trên thể bệnh vừa chẩn đoán — không thay thế tư vấn của Dược sĩ.'
                    : 'Gợi ý theo từ khóa công dụng liên quan — không thay thế tư vấn của Dược sĩ.'}
                </p>
              </div>
            )}

            <TongueAnalysisCard />

            {/* Direct Clinical Appointment Booking */}
            <div className="appointment-booking-box">
              <h5>📅 Đăng ký lịch hẹn khám chi tiết:</h5>
              {bookingSuccess ? (
                <div className="booking-success-msg">
                  <Check size={18} />
                  <span>Đã gửi yêu cầu hẹn khám thành công! Khung giờ khám {lastBooked ? formatDateTime(lastBooked.date) : ''}. Vui lòng chờ nhà thuốc xác nhận (tối đa 24 giờ); lịch hẹn sẽ hết hiệu lực nếu không được xác nhận đúng hạn.</span>
                </div>
              ) : blockingAppt ? (
                <div className="blocking-appt-box">
                  <div className="blocking-title">
                    <AlertCircle size={18} />
                    <strong>Bạn đang có một lịch hẹn chưa hoàn tất</strong>
                  </div>
                  <div className="blocking-detail">
                    <span>Thời gian: <strong>{formatDateTime(blockingAppt.appointmentDate)}</strong></span>
                    <span>Trạng thái: <strong>{APPT_STATUS_LABELS[blockingAppt.status] || blockingAppt.status}</strong></span>
                    {blockingAppt.reason && <span>Lý do: {blockingAppt.reason}</span>}
                  </div>
                  <p className="blocking-note">Bạn có thể hủy lịch hẹn này để đặt lịch mới, hoặc chờ lịch được xác nhận / quá hạn.</p>
                  <button className="cancel-blocking-btn" onClick={handleCancelBlocking} disabled={cancelling}>
                    <XCircle size={16} /> {cancelling ? 'Đang hủy...' : 'Hủy lịch hẹn này'}
                  </button>
                </div>
              ) : (
                <div className="booking-inputs">
                  <p className="booking-notice">Lý do hẹn sẽ tự động điền: <strong>"Tự chẩn đoán: Thể bệnh {result.primarySyndrome?.name}"</strong></p>
                  <div className="inputs-row">
                    <input
                      type="date"
                      className="booking-input"
                      value={bookingDate}
                      min={todayStr}
                      max={maxDateStr}
                      onChange={e => handleDateChange(e.target.value)}
                    />
                  </div>
                  <div className="slot-grid">
                    {TIME_SLOTS.map(slot => {
                      const disabled = isSlotPassed(bookingDate, slot);
                      return (
                        <button
                          key={slot}
                          type="button"
                          className={`slot-btn ${timeSlot === slot ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
                          disabled={disabled}
                          onClick={() => setTimeSlot(slot)}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                  {bookingDate === todayStr && TIME_SLOTS.every(s => isSlotPassed(todayStr, s)) && (
                    <p className="slot-warning">Đã hết khung giờ khả dụng hôm nay, vui lòng chọn ngày khác.</p>
                  )}
                  <div className="inputs-row">
                    <button className="confirm-booking-btn" onClick={handleBookAppointment} disabled={isSlotPassed(bookingDate, timeSlot)}>
                      <Calendar size={16} /> {isSlotPassed(bookingDate, timeSlot) ? 'Vui lòng chọn ngày/giờ khác' : `Đặt lịch khám - ${timeSlot}`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button className="reset-diag-btn" onClick={handleReset}>
            <RotateCcw size={16} /> Thực hiện chẩn đoán lại
          </button>
        </div>
      )}
    </div>
  );
};

export default SelfDiagnosis;
