import React, { useState } from 'react';
import { X, UploadCloud, CheckCircle2, ShieldAlert, FileText } from 'lucide-react';
import { createPrescription, uploadPrescriptionImage } from '../../services/api';
import { toLocalWallClockIso } from '../../utils/dateTime';
import './UploadPrescriptionModal.css';

const UploadPrescriptionModal = ({ isOpen, onClose, user }) => {
  const [doctorName, setDoctorName] = useState('');
  const [hospital, setHospital] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(''); // Xem trước cục bộ (local blob URL)
  const [uploadedUrl, setUploadedUrl] = useState(''); // Đường dẫn ảnh thật đã lưu trên server
  const [uploading, setUploading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setUploadedUrl('');
    setError('');
    setUploading(true);
    try {
      // Tải ảnh THẬT lên server — Dược sĩ cần xem đúng ảnh toa thuốc để duyệt, và AI chỉ đọc được
      // đúng nội dung khi có ảnh thật (không dùng ảnh minh họa ngẫu nhiên như trước đây).
      const { url } = await uploadPrescriptionImage(file);
      setUploadedUrl(url);
    } catch (err) {
      setError(err.message || 'Không thể tải ảnh lên. Vui lòng thử lại.');
      setSelectedFile(null);
      setPreviewUrl('');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!uploadedUrl) {
      setError('Vui lòng chọn ảnh toa thuốc của bạn và chờ tải lên hoàn tất.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        userId: user.id,
        diagnosisId: null,
        doctorId: null,
        doctorName: doctorName || 'Bác sĩ chưa rõ',
        hospital: hospital || 'Bệnh viện chưa rõ',
        prescriptionDate: toLocalWallClockIso(new Date()),
        diagnosisNote: notes || null,
        imageUrl: uploadedUrl,
        items: []
      };

      await createPrescription(payload);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setDoctorName('');
        setHospital('');
        setNotes('');
        setSelectedFile(null);
        setPreviewUrl('');
        setUploadedUrl('');
        onClose();
      }, 3000);
    } catch (err) {
      console.error('Submit prescription failed', err);
      setError(err.message || 'Không thể gửi đơn thuốc. Vui lòng kiểm tra lại kết nối.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upm-overlay" onClick={onClose}>
      <div className="upm-modal" onClick={(e) => e.stopPropagation()}>
        <button className="upm-close-btn" onClick={onClose} aria-label="Close modal">
          <X size={20} />
        </button>

        {success ? (
          <div className="upm-success-state">
            <CheckCircle2 size={56} className="upm-success-icon" />
            <h3>Gửi Đơn Thuốc Thành Công!</h3>
            <p>Dược sĩ của chúng tôi đã nhận được toa thuốc của bạn và sẽ liên hệ tư vấn qua SĐT <strong>{user?.phone}</strong> trong vòng 10-15 phút.</p>
            <span className="upm-loader-bar" />
          </div>
        ) : (
          <>
            <div className="upm-header">
              <FileText size={24} className="upm-header-icon" />
              <div>
                <h3>Gửi Toa Thuốc Của Bạn</h3>
                <p>Kết nối nhanh với Dược sĩ để nhận báo giá & mua thuốc chính hãng</p>
              </div>
            </div>

            {error && (
              <div className="upm-error-alert">
                <ShieldAlert size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="upm-form">
              {/* User pre-filled info */}
              <div className="upm-form-row">
                <div className="upm-input-group">
                  <label>Họ và tên khách hàng</label>
                  <input type="text" value={user?.username} disabled className="upm-input-disabled" />
                </div>
                <div className="upm-input-group">
                  <label>Số điện thoại liên hệ</label>
                  <input type="text" value={user?.phone || 'Chưa cập nhật'} disabled className="upm-input-disabled" />
                </div>
              </div>

              {/* Prescription metadata */}
              <div className="upm-form-row">
                <div className="upm-input-group">
                  <label>Bác sĩ kê đơn (Nếu có)</label>
                  <input 
                    type="text" 
                    placeholder="Ví dụ: BS. Nguyễn Văn A" 
                    value={doctorName} 
                    onChange={(e) => setDoctorName(e.target.value)} 
                  />
                </div>
                <div className="upm-input-group">
                  <label>Bệnh viện / Phòng khám (Nếu có)</label>
                  <input 
                    type="text" 
                    placeholder="Ví dụ: Phòng khám Đông Y TMPMS"
                    value={hospital} 
                    onChange={(e) => setHospital(e.target.value)} 
                  />
                </div>
              </div>

              {/* Upload area */}
              <div className="upm-input-group">
                <label>Ảnh toa thuốc điều trị</label>
                <div className="upm-upload-zone">
                  <input 
                    type="file" 
                    id="presc-file" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                    className="upm-file-input"
                  />
                  <label htmlFor="presc-file" className="upm-upload-label">
                    {selectedFile ? (
                      <div className="upm-file-preview">
                        <img src={previewUrl} alt="Toa thuốc preview" className="upm-preview-img" />
                        <span className="upm-file-name">
                          {selectedFile.name} {uploading ? '(Đang tải lên...)' : uploadedUrl ? '(Đã tải lên — nhấp để đổi ảnh)' : ''}
                        </span>
                      </div>
                    ) : (
                      <>
                        <UploadCloud size={32} className="upm-upload-icon" />
                        <span className="upm-upload-title">Nhấp vào đây để chọn hoặc tải lên ảnh toa thuốc</span>
                        <span className="upm-upload-subtitle">Hỗ trợ các định dạng ảnh JPEG, PNG</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div className="upm-input-group">
                <label>Ghi chú thêm cho Dược sĩ</label>
                <textarea 
                  placeholder="Nhập các triệu chứng, số ngày mua thuốc hoặc dặn dò đặc biệt..." 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Action Buttons */}
              <div className="upm-actions">
                <button type="button" className="upm-cancel-btn" onClick={onClose} disabled={loading}>
                  Hủy bỏ
                </button>
                <button type="submit" className="upm-submit-btn" disabled={loading || uploading || !uploadedUrl}>
                  {loading ? 'Đang gửi toa...' : uploading ? 'Đang tải ảnh lên...' : 'Gửi đơn thuốc cho Dược sĩ'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default UploadPrescriptionModal;
