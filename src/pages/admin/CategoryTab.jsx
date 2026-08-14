import React, { useState, useEffect } from 'react';
import * as api from '../../services/api';
import { Tag } from 'lucide-react';

// Quản lý Danh mục sản phẩm — tách theo cùng khuôn mẫu với NewsTab.jsx (chỉ Admin).
const CategoryTab = ({ hasAccess, showSuccess, setError }) => {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const emptyCategoryForm = { name: '', description: '' };
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);

  const loadTabData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.fetchCategories();
      setCategories(data);
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
          <Tag size={16} /> {editingCategoryId ? 'Cập nhật danh mục' : 'Thêm danh mục mới'}
        </h3>
        <div className="admin-form">
          <div className="form-group">
            <label>Tên danh mục *</label>
            <input className="admin-input" value={categoryForm.name} onChange={e => setCategoryForm(p => ({ ...p, name: e.target.value }))} placeholder="VD: Thuốc Đông Y" />
          </div>
          <div className="form-group">
            <label>Mô tả</label>
            <textarea className="admin-input" rows={3} value={categoryForm.description} onChange={e => setCategoryForm(p => ({ ...p, description: e.target.value }))} placeholder="Mô tả ngắn cho danh mục" />
          </div>
          <div className="product-form-actions">
            <button className="admin-add-btn" style={{ flex: 2 }} onClick={async () => {
              if (!categoryForm.name.trim()) { setError('Vui lòng nhập tên danh mục'); return; }
              try {
                if (editingCategoryId) {
                  await api.updateCategory(editingCategoryId, categoryForm);
                  showSuccess('Cập nhật danh mục thành công!');
                } else {
                  await api.createCategory(categoryForm);
                  showSuccess('Thêm danh mục thành công!');
                }
                setCategoryForm(emptyCategoryForm);
                setEditingCategoryId(null);
                const data = await api.fetchCategories(); setCategories(data);
              } catch (e) { setError(e.message); }
            }}>
              {editingCategoryId ? '💾 Cập nhật' : '➕ Thêm danh mục'}
            </button>
            {editingCategoryId && (
              <button className="cancel-edit-btn" onClick={() => { setEditingCategoryId(null); setCategoryForm(emptyCategoryForm); }}>Hủy</button>
            )}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="admin-card">
        <h3 className="admin-section-title"><Tag size={16} /> Danh sách danh mục ({categories.length})</h3>
        <div className="medicine-crud-list" style={{ maxHeight: 550 }}>
          {categories.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>Chưa có danh mục nào</p>
          ) : categories.map(c => (
            <div key={c.id} className={`medicine-crud-row ${editingCategoryId === c.id ? 'editing' : ''}`}>
              <div className="medicine-crud-info" style={{ flex: 1 }}>
                <strong>{c.name}</strong>
                <span className="med-meta">{c.description || '—'}</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, background: '#e0e7ff', color: '#3730a3', fontWeight: 700 }}>
                    {c.productCount ?? 0} sản phẩm
                  </span>
                </div>
              </div>
              <div className="medicine-crud-actions">
                <button className="med-edit-btn" onClick={() => {
                  setEditingCategoryId(c.id);
                  setCategoryForm({ name: c.name, description: c.description || '' });
                }}>✏️ Sửa</button>
                <button className="med-delete-btn" onClick={async () => {
                  if (!confirm(`Xóa danh mục "${c.name}"?`)) return;
                  try {
                    await api.deleteCategory(c.id);
                    const data = await api.fetchCategories(); setCategories(data);
                    showSuccess('Đã xóa danh mục!');
                  } catch (e) { setError(e.message); }
                }}>🗑️ Xóa</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CategoryTab;
