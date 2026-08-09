import React, { useState, useEffect } from 'react';
import * as api from '../../services/api';
import { FileText } from 'lucide-react';

// Tin tức sức khỏe — tách từ AdminView.jsx (tab "news", chỉ Admin).
const NewsTab = ({ hasAccess, showSuccess, setError }) => {
  const [loading, setLoading] = useState(true);
  const [newsArticles, setNewsArticles] = useState([]);
  const [editingNewsId, setEditingNewsId] = useState(null);
  const emptyNewsForm = {
    title: '', excerpt: '', content: '', tag: 'Dinh dưỡng', imageUrl: '', isActive: true
  };
  const [newsForm, setNewsForm] = useState(emptyNewsForm);

  const loadTabData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.fetchNewsArticles();
      setNewsArticles(data);
    } catch (err) {
      console.error(err);
      setError('Lỗi tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTabData(); }, []);


  if (loading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Đang tải dữ liệu và biên dịch báo cáo...</p>
      </div>
    );
  }

  return (
            <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20, alignItems: 'start' }}>
              {/* Form */}
              <div className="admin-card">
                <h3 className="admin-section-title">
                  <FileText size={16} /> {editingNewsId ? 'Cập nhật bài viết' : 'Thêm bài viết mới'}
                </h3>
                <div className="admin-form">
                  <div className="form-group">
                    <label>Tiêu đề *</label>
                    <input className="admin-input" value={newsForm.title} onChange={e => setNewsForm(p => ({ ...p, title: e.target.value }))} placeholder="VD: 5 loại dược liệu tăng đề kháng" />
                  </div>
                  <div className="form-group">
                    <label>Chuyên mục</label>
                    <select className="admin-input" value={newsForm.tag} onChange={e => setNewsForm(p => ({ ...p, tag: e.target.value }))}>
                      <option value="Dinh dưỡng">Dinh dưỡng</option>
                      <option value="Phòng chữa bệnh">Phòng chữa bệnh</option>
                      <option value="Khỏe đẹp">Khỏe đẹp</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Tóm tắt</label>
                    <textarea className="admin-input" rows={2} value={newsForm.excerpt} onChange={e => setNewsForm(p => ({ ...p, excerpt: e.target.value }))} placeholder="Tóm tắt ngắn hiển thị ở trang chủ" />
                  </div>
                  <div className="form-group">
                    <label>Nội dung đầy đủ *</label>
                    <textarea className="admin-input" rows={6} value={newsForm.content} onChange={e => setNewsForm(p => ({ ...p, content: e.target.value }))} placeholder="Nội dung chi tiết bài viết" />
                  </div>
                  <div className="form-group">
                    <label>Ảnh minh họa (URL)</label>
                    <input className="admin-input" value={newsForm.imageUrl} onChange={e => setNewsForm(p => ({ ...p, imageUrl: e.target.value }))} placeholder="https://..." />
                  </div>
                  <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <input type="checkbox" id="nIsActive" checked={newsForm.isActive} onChange={e => setNewsForm(p => ({ ...p, isActive: e.target.checked }))} />
                    <label htmlFor="nIsActive" style={{ fontWeight: 600, cursor: 'pointer' }}>Hiển thị trên trang chủ</label>
                  </div>
                  <div className="product-form-actions">
                    <button className="admin-add-btn" style={{ flex: 2 }} onClick={async () => {
                      if (!newsForm.title || !newsForm.content) { setError('Vui lòng nhập tiêu đề và nội dung'); return; }
                      try {
                        if (editingNewsId) {
                          await api.updateNewsArticle(editingNewsId, newsForm);
                          showSuccess('Cập nhật bài viết thành công!');
                        } else {
                          await api.createNewsArticle(newsForm);
                          showSuccess('Thêm bài viết thành công!');
                        }
                        setNewsForm(emptyNewsForm);
                        setEditingNewsId(null);
                        const data = await api.fetchNewsArticles(); setNewsArticles(data);
                      } catch (e) { setError(e.message); }
                    }}>
                      {editingNewsId ? '💾 Cập nhật' : '➕ Thêm bài viết'}
                    </button>
                    {editingNewsId && (
                      <button className="cancel-edit-btn" onClick={() => { setEditingNewsId(null); setNewsForm(emptyNewsForm); }}>Hủy</button>
                    )}
                  </div>
                </div>
              </div>

              {/* List */}
              <div className="admin-card">
                <h3 className="admin-section-title"><FileText size={16} /> Danh sách bài viết ({newsArticles.length})</h3>
                <div className="medicine-crud-list" style={{ maxHeight: 550 }}>
                  {newsArticles.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>Chưa có bài viết nào</p>
                  ) : newsArticles.map(a => (
                    <div key={a.id} className={`medicine-crud-row ${editingNewsId === a.id ? 'editing' : ''}`}>
                      <div className="medicine-crud-info" style={{ flex: 1 }}>
                        <strong>{a.title}</strong>
                        <span className="med-meta">{a.excerpt || '—'}</span>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, background: '#fef3c7', color: '#92400e', fontWeight: 700 }}>{a.tag}</span>
                          <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, background: a.isActive ? '#dcfce7' : '#fee2e2', color: a.isActive ? '#166534' : '#991b1b', fontWeight: 700 }}>
                            {a.isActive ? 'Đang hiển thị' : 'Đã ẩn'}
                          </span>
                        </div>
                      </div>
                      <div className="medicine-crud-actions">
                        <button className="med-edit-btn" onClick={() => {
                          setEditingNewsId(a.id);
                          setNewsForm({
                            title: a.title, excerpt: a.excerpt || '', content: a.content || '',
                            tag: a.tag || 'Dinh dưỡng', imageUrl: a.imageUrl || '', isActive: a.isActive
                          });
                        }}>✏️ Sửa</button>
                        <button className="med-delete-btn" onClick={async () => {
                          if (!confirm(`Xóa bài viết "${a.title}"?`)) return;
                          await api.deleteNewsArticle(a.id);
                          const data = await api.fetchNewsArticles(); setNewsArticles(data);
                          showSuccess('Đã xóa bài viết!');
                        }}>🗑️ Xóa</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
  );
};

export default NewsTab;
