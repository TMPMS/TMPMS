import React, { useState } from 'react';
import { Camera, Sparkles, AlertTriangle, Loader2 } from 'lucide-react';
import { analyzeTongueImage } from '../../services/api';
import './TongueAnalysisCard.css';

// Thiệt chẩn (xem lưỡi) bằng AI — bổ trợ tùy chọn cho kết quả tự chẩn đoán theo bảng câu hỏi
// (Vấn chẩn) đã có ở SelfDiagnosis. Không bắt buộc, khách có thể bỏ qua.
const TongueAnalysisCard = () => {
  const [previewUrl, setPreviewUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
    setError('');
    setAnalyzing(true);
    try {
      const data = await analyzeTongueImage(file);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Không thể phân tích ảnh lưỡi. Vui lòng thử lại.');
    } finally {
      setAnalyzing(false);
      e.target.value = '';
    }
  };

  return (
    <div className="tongue-card">
      <h5><Sparkles size={15} /> Phân tích ảnh lưỡi bằng AI (Thiệt chẩn) — tùy chọn</h5>
      <p className="tongue-intro">
        Chụp ảnh lưỡi trong ánh sáng tự nhiên để AI quan sát sắc lưỡi & rêu lưỡi, bổ trợ thêm cho kết quả phân loại thể bệnh ở trên.
      </p>

      <div className="tongue-upload-row">
        <input
          type="file"
          id="tongue-file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="tongue-file-input"
          disabled={analyzing}
        />
        <label htmlFor="tongue-file" className="tongue-upload-btn">
          <Camera size={16} />
          {previewUrl ? 'Chụp/chọn ảnh khác' : 'Chụp hoặc tải ảnh lưỡi'}
        </label>
        {previewUrl && <img src={previewUrl} alt="Ảnh lưỡi" className="tongue-preview-thumb" />}
      </div>

      {analyzing && (
        <div className="tongue-loading">
          <Loader2 size={16} className="spinner" /> AI đang quan sát ảnh lưỡi...
        </div>
      )}

      {error && (
        <div className="tongue-error">
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {result && (
        <div className="tongue-result">
          <div className="tongue-attrs-grid">
            {result.tongueColor && <div><span>Sắc lưỡi</span><strong>{result.tongueColor}</strong></div>}
            {result.coatingColor && <div><span>Màu rêu lưỡi</span><strong>{result.coatingColor}</strong></div>}
            {result.coatingThickness && <div><span>Độ dày rêu</span><strong>{result.coatingThickness}</strong></div>}
            {result.moisture && <div><span>Độ ẩm</span><strong>{result.moisture}</strong></div>}
          </div>

          {result.observations && <p className="tongue-observations">{result.observations}</p>}

          {result.relatedSyndromes?.length > 0 && (
            <div className="tongue-syndromes">
              {result.relatedSyndromes.map((s) => <span key={s} className="tongue-syndrome-badge">{s}</span>)}
            </div>
          )}

          {result.recommendation && <p className="tongue-recommendation">{result.recommendation}</p>}

          <p className="tongue-disclaimer">{result.disclaimer}</p>
        </div>
      )}
    </div>
  );
};

export default TongueAnalysisCard;
