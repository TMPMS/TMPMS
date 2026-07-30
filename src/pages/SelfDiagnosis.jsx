import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';
import { Leaf, Activity, Sparkles, Check, ChevronRight, Calendar, ShoppingCart, ArrowLeft } from 'lucide-react';
import { useCart } from '../context/CartContext';
import './SelfDiagnosis.css';

const SYMPTOMS = [
  { id: 'mat_ngu', label: 'Mất ngủ, trằn trọc, ngủ không sâu giấc', category: 'tâm_tỳ' },
  { id: 'dau_dau', label: 'Đau đầu, hoa mắt, chóng mặt', category: 'tâm_tỳ' },
  { id: 'hoi_hop', label: 'Hồi hộp, tim đập nhanh, lo âu', category: 'tâm_tỳ' },
  
  { id: 'dau_lung', label: 'Đau lưng, mỏi gối, mỏi vai gáy', category: 'thận_hư' },
  { id: 'lanh_chan_tay', label: 'Sợ lạnh, tay chân lạnh, tiểu đêm nhiều', category: 'thận_hư' },
  { id: 'giam_sinh_luc', label: 'Mệt mỏi kéo dài, suy giảm sinh lực', category: 'thận_hư' },
  
  { id: 'nong_trong', label: 'Nóng trong người, hay lở miệng, khát nước', category: 'nhiệt_độc' },
  { id: 'mun_nhot', label: 'Mẩn ngứa, mụn nhọt, nổi mề đay', category: 'nhiệt_độc' },
  { id: 'tao_bon', label: 'Táo bón, nước tiểu vàng sậm', category: 'nhiệt_độc' },
  
  { id: 'day_bung', label: 'Đầy bụng, khó tiêu, chướng bụng', category: 'tỳ_vị' },
  { id: 'chan_an', label: 'Ăn uống không ngon miệng, phân lỏng', category: 'tỳ_vị' },
  { id: 'dau_da_day', label: 'Đau âm ỉ vùng thượng vị, trào ngược', category: 'tỳ_vị' },
];

const DIAGNOSES = {
  tâm_tỳ: {
    title: 'Thể bệnh: Tâm Tỳ Lưỡng Hư',
    desc: 'Huyết dịch không đủ nuôi dưỡng tâm thần, tỳ khí suy yếu không vận hóa được ngũ cốc gây mất ngủ, mệt mỏi, đau đầu và giảm trí nhớ.',
    advice: 'Nên ăn các thực phẩm bổ huyết như táo đỏ, hạt sen, long nhãn. Tránh suy nghĩ quá độ trước khi ngủ.',
    herbs: [
      { id: 101, name: 'Hoạt Huyết Dưỡng Não Traphaco', price: 95000 },
      { id: 319, name: 'Viên Uống An Thần Traphaco', price: 98000 }
    ],
    acupuncture: 'Phương pháp đề xuất: Châm cứu dưỡng tâm an thần (Thần môn, Nội quan, Tam âm giao).'
  },
  thận_hư: {
    title: 'Thể bệnh: Thận Khí Bất Túc (Thận Dương Hư)',
    desc: 'Mệnh môn hỏa suy yếu không sưởi ấm được tỳ thổ và cơ thể, gây đau mỏi lưng gối, tay chân lạnh, giảm năng lượng hoạt động.',
    advice: 'Nên giữ ấm vùng thắt lưng, ngâm chân bằng nước muối ấm hoặc gừng trước khi ngủ. Hạn chế đồ ăn sống lạnh.',
    herbs: [
      { id: 310, name: 'Bát Vị Quế Phụ OPC', price: 155000 },
      { id: 315, name: 'Rượu Thuốc Ngũ Gia Bì', price: 230000 }
    ],
    acupuncture: 'Phương pháp đề xuất: Cứu ngải, ôn châm (Thận du, Mệnh môn, Quan nguyên).'
  },
  nhiệt_độc: {
    title: 'Thể bệnh: Can Đởm Uất Nhiệt (Nóng trong tích độc)',
    desc: 'Chức năng giải độc của gan mật bị quá tải hoặc uất kết sinh hỏa, gây nóng trong người, phát mụn nhọt, ngứa ngáy da.',
    advice: 'Uống nhiều nước, ăn nhiều rau xanh giải nhiệt (khổ qua, rau má). Hạn chế thức ăn cay nóng, dầu mỡ và rượu bia.',
    herbs: [
      { id: 102, name: 'Trà túi lọc Cà Gai Leo thải độc gan', price: 45000 },
      { id: 317, name: 'Trà Diệp Hạ Châu Mát Gan', price: 42000 }
    ],
    acupuncture: 'Phương pháp đề xuất: Châm tả nhiệt (Hành gian, Thái xung, Khúc trì).'
  },
  tỳ_vị: {
    title: 'Thể bệnh: Tỳ Vị Hư Hàn (Rối loạn tiêu hóa)',
    desc: 'Hệ thống tiêu hóa bị suy yếu, lạnh bụng, không chuyển hóa được thức ăn gây chướng bụng, đầy hơi, đại tiện lỏng nát.',
    advice: 'Nên ăn thức ăn ấm nóng, dễ tiêu, thêm gừng hoặc nghệ vào gia vị món ăn. Giữ ấm vùng bụng.',
    herbs: [
      { id: 312, name: 'Tiêu Dao Hoàn OPC', price: 110000 },
      { id: 414, name: 'Berberin Traphaco Hỗ Trợ Tiêu Hóa', price: 32000 }
    ],
    acupuncture: 'Phương pháp đề xuất: Cứu ngải vùng bụng (Trung quản, Thiên khu, Túc tam lý).'
  }
};

const SelfDiagnosis = ({ onBack }) => {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [result, setResult] = useState(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [phone, setPhone] = useState(user?.phone || '');
  const [name, setName] = useState(user?.username || '');

  const toggleSymptom = (id) => {
    setSelectedSymptoms(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleDiagnose = async () => {
    if (selectedSymptoms.length === 0) {
      alert('Vui lòng chọn ít nhất một triệu chứng cơ thể đang gặp phải!');
      return;
    }

    // Count categories
    const counts = { tâm_tỳ: 0, thận_hư: 0, nhiệt_độc: 0, tỳ_vị: 0 };
    selectedSymptoms.forEach(sId => {
      const sym = SYMPTOMS.find(s => s.id === sId);
      if (sym) {
        counts[sym.category]++;
      }
    });

    // Find max category
    let maxCat = 'tâm_tỳ';
    let maxVal = -1;
    Object.keys(counts).forEach(cat => {
      if (counts[cat] > maxVal) {
        maxVal = counts[cat];
        maxCat = cat;
      }
    });

    const diagResult = DIAGNOSES[maxCat];
    setResult(diagResult);

    // Non-blocking background call to save diagnosis history into SQL Server DB
    try {
      const currentUserStr = localStorage.getItem('user');
      const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
      const patientId = currentUser?.id || 1;
      
      const selectedNames = selectedSymptoms
        .map(id => SYMPTOMS.find(s => s.id === id)?.label)
        .filter(Boolean)
        .join(', ');

      await api.createDiagnosis({
        patientId: patientId,
        doctorId: 1,
        symptoms: selectedNames || 'Tự chọn triệu chứng Đông Y',
        clinicalExamination: 'Tự kiểm tra triệu chứng qua hệ thống AI Đông Y',
        diagnosisResult: diagResult.title,
        note: `Mô tả: ${diagResult.description}. Khuyên dùng: ${diagResult.recommendation}`,
        diagnosisDate: new Date().toISOString()
      });
      console.log('Saved self-diagnosis result into database successfully.');
    } catch (err) {
      console.warn('Could not save diagnosis history to database:', err);
    }
  };

  const handleBookAppointment = async () => {
    if (!name || !phone) {
      alert('Vui lòng nhập tên và số điện thoại liên hệ!');
      return;
    }

    try {
      // Schedule Appointment with default Doctor (id = 10) directly via customer endpoint
      await api.createAppointment({
        doctorId: 10,
        appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        reason: `Đặt lịch hẹn khám chuyên sâu: ${result.title}`,
        status: 'Scheduled',
        notes: `Tự chẩn đoán: ${result.title}. SĐT liên hệ: ${phone}. Tên: ${name}`
      });

      setBookingSuccess(true);
    } catch (err) {
      console.error(err);
      alert('Đã xảy ra lỗi khi đăng ký lịch hẹn.');
    }
  };

  return (
    <div className="self-diagnosis-container">
      <button className="back-btn" onClick={onBack}>
        <ArrowLeft size={16} /> Quay lại trang chủ
      </button>

      {!result ? (
        <div className="diag-quiz-card">
          <div className="quiz-header">
            <Activity className="pulse-icon" />
            <h2>Trợ Lý Tự Chẩn Đoán Sức Khỏe Đông Y</h2>
            <p>Chọn các dấu hiệu cơ thể bạn đang gặp phải dưới đây để nhận khuyến nghị bài thuốc & phác đồ điều trị Đông Y phù hợp.</p>
          </div>

          <div className="symptoms-grid">
            {SYMPTOMS.map(s => (
              <div 
                key={s.id} 
                className={`symptom-item ${selectedSymptoms.includes(s.id) ? 'selected' : ''}`}
                onClick={() => toggleSymptom(s.id)}
              >
                <div className="checkbox-indicator">
                  {selectedSymptoms.includes(s.id) && <Check size={14} />}
                </div>
                <span>{s.label}</span>
              </div>
            ))}
          </div>

          <button className="submit-diag-btn" onClick={handleDiagnose}>
            Bắt đầu phân tích triệu chứng <ChevronRight size={18} />
          </button>
        </div>
      ) : (
        <div className="diag-result-card">
          <div className="result-header">
            <Sparkles className="spark-icon" />
            <h3>Kết Quả Chẩn Đoán Sơ Bộ</h3>
            <span className="result-badge">Y học cổ truyền</span>
          </div>

          <div className="result-body">
            <h4 className="disease-title">{result.title}</h4>
            <p className="disease-desc">{result.desc}</p>
            
            <div className="advice-section">
              <h5>🌱 Lời khuyên của Thầy thuốc:</h5>
              <p>{result.advice}</p>
            </div>

            <div className="acupuncture-section">
              <h5>🪡 Liệu pháp trị liệu đề xuất:</h5>
              <p>{result.acupuncture}</p>
            </div>

            {/* Suggested Herbs */}
            <div className="suggested-herbs-box">
              <h5>🌿 Các bài thuốc thảo dược khuyên dùng:</h5>
              <div className="herbs-list">
                {result.herbs.map(h => (
                  <div key={h.id} className="herb-card-suggestion">
                    <div className="herb-details">
                      <strong>{h.name}</strong>
                      <span>Giá tham khảo: {h.price.toLocaleString()}đ</span>
                    </div>
                    <button 
                      className="add-herb-cart"
                      onClick={() => {
                        addToCart({
                          id: h.id,
                          name: h.name,
                          price: h.price,
                          image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400&h=400&fit=crop',
                          unit: 'Hộp',
                          origin: 'Việt Nam'
                        });
                        alert(`Đã thêm ${h.name} vào giỏ hàng!`);
                      }}
                    >
                      <ShoppingCart size={14} /> Thêm vào giỏ
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Direct Clinical Appointment Booking */}
            <div className="appointment-booking-box">
              <h5>📅 Đăng ký lịch hẹn khám & bốc thuốc chi tiết:</h5>
              {bookingSuccess ? (
                <div className="booking-success-msg">
                  <Check size={18} />
                  <span>Đã đặt lịch hẹn thành công! Thầy thuốc sẽ gọi điện xác nhận trong 15 phút tới.</span>
                </div>
              ) : (
                <div className="booking-inputs">
                  <p className="booking-notice">Hệ thống sẽ đặt lịch khám tự động vào ngày mai với Bác sĩ Đông Y chuyên khoa cho bạn.</p>
                  <div className="inputs-row">
                    <input 
                      type="text" 
                      className="booking-input" 
                      placeholder="Họ tên bệnh nhân" 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                    />
                    <input 
                      type="tel" 
                      className="booking-input" 
                      placeholder="Số điện thoại liên hệ" 
                      value={phone} 
                      onChange={e => setPhone(e.target.value)} 
                    />
                    <button className="confirm-booking-btn" onClick={handleBookAppointment}>
                      <Calendar size={16} /> Đăng ký khám
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button className="reset-diag-btn" onClick={() => { setResult(null); setSelectedSymptoms([]); setBookingSuccess(false); }}>
            Thực hiện chẩn đoán lại
          </button>
        </div>
      )}
    </div>
  );
};

export default SelfDiagnosis;
