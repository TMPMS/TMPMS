import React, { useState, useEffect } from 'react';
import * as api from '../services/api';
import './SuppliersView.css';

const EMPTY_FORM = {
  companyName: '', contactPerson: '', phone: '', email: '', taxCode: '', address: '', status: 'Active',
};

const SuppliersView = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [loggedInUser, setLoggedInUser] = useState(null);
  const [formMode, setFormMode] = useState(null); // null | 'add' | 'edit'
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try { setLoggedInUser(JSON.parse(storedUser)); } catch (e) {}
    }
  }, []);

  const isAdmin = loggedInUser?.role_id === 1;

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [suppliersData, warehousesData] = await Promise.all([
        api.fetchSuppliers(),
        api.fetchWarehouses()
      ]);
      setSuppliers(suppliersData);
      setWarehouses(warehousesData);
    } catch (err) {
      console.error(err);
      setError('Không thể tải thông tin đối tác & kho hàng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const openAddForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormMode('add');
  };

  const openEditForm = (sup) => {
    setForm({
      companyName: sup.company_name || '',
      contactPerson: sup.contact_person || '',
      phone: sup.phone || '',
      email: sup.email || '',
      taxCode: sup.tax_code || '',
      address: sup.address || '',
      status: sup.status || 'Active',
    });
    setEditingId(sup.id);
    setFormMode('edit');
  };

  const closeForm = () => {
    setFormMode(null);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.companyName.trim()) {
      setError('Vui lòng nhập tên công ty.');
      return;
    }
    try {
      if (formMode === 'edit' && editingId) {
        await api.updateSupplier(editingId, form);
        showSuccess('Đã cập nhật nhà cung cấp.');
      } else {
        await api.createSupplier(form);
        showSuccess('Đã thêm nhà cung cấp mới.');
      }
      closeForm();
      await loadData();
    } catch (err) {
      setError(err.message || 'Lỗi khi lưu nhà cung cấp.');
    }
  };

  const handleDelete = async (sup) => {
    if (!window.confirm(`Xác nhận xóa nhà cung cấp "${sup.company_name}"?`)) return;
    setError('');
    try {
      await api.deleteSupplier(sup.id);
      showSuccess('Đã xóa nhà cung cấp.');
      await loadData();
    } catch (err) {
      setError(err.message || 'Lỗi khi xóa nhà cung cấp (có thể đang được thuốc/lô hàng tham chiếu).');
    }
  };

  return (
    <div className="suppliers-container">
      <div className="suppliers-header-block">
        <h2 className="suppliers-title">Hệ Thống Phân Phối & Kho Vận</h2>
        <p className="suppliers-subtitle">Thông tin về các công ty đối tác dược phẩm và mạng lưới kho hàng y tế</p>
      </div>

      {error && <div className="suppliers-error">{error}</div>}
      {success && <div className="suppliers-success">{success}</div>}

      {loading ? (
        <div className="suppliers-loading">Đang tải dữ liệu mạng lưới dược phẩm...</div>
      ) : (
        <div className="suppliers-dashboard-grid">
          {/* Column 1: Suppliers list */}
          <div className="dashboard-column">
            <div className="column-header-row">
              <h3 className="column-title">🏢 Các Đại Lý & Đối Tác Cung Cấp ({suppliers.length})</h3>
              {isAdmin && (
                <button type="button" className="supplier-add-btn" onClick={openAddForm}>+ Thêm nhà cung cấp</button>
              )}
            </div>

            {isAdmin && formMode && (
              <form className="supplier-form-card" onSubmit={handleSubmit}>
                <h4>{formMode === 'edit' ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp mới'}</h4>
                <div className="supplier-form-grid">
                  <div className="supplier-form-group">
                    <label>Tên công ty *</label>
                    <input type="text" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} required />
                  </div>
                  <div className="supplier-form-group">
                    <label>Người liên hệ</label>
                    <input type="text" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
                  </div>
                  <div className="supplier-form-group">
                    <label>Điện thoại</label>
                    <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div className="supplier-form-group">
                    <label>Email</label>
                    <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="supplier-form-group">
                    <label>Mã số thuế</label>
                    <input type="text" value={form.taxCode} onChange={(e) => setForm({ ...form, taxCode: e.target.value })} />
                  </div>
                  <div className="supplier-form-group">
                    <label>Trạng thái</label>
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      <option value="Active">Hoạt động</option>
                      <option value="Inactive">Ngừng hợp tác</option>
                    </select>
                  </div>
                  <div className="supplier-form-group supplier-form-group-full">
                    <label>Địa chỉ</label>
                    <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                  </div>
                </div>
                <div className="supplier-form-actions">
                  <button type="submit" className="supplier-save-btn">{formMode === 'edit' ? 'Lưu thay đổi' : 'Thêm mới'}</button>
                  <button type="button" className="supplier-cancel-btn" onClick={closeForm}>Hủy</button>
                </div>
              </form>
            )}

            <div className="cards-list">
              {suppliers.map(sup => (
                <div key={sup.id} className="directory-card supplier-card">
                  <div className="card-top-row">
                    <span className="supplier-company-name">{sup.company_name}</span>
                    <span className={`status-tag ${sup.status.toLowerCase()}`}>
                      {sup.status === 'Active' ? 'Hoạt động' : sup.status}
                    </span>
                  </div>
                  <div className="card-detail-info">
                    <p><strong>Người liên hệ:</strong> {sup.contact_person || 'N/A'}</p>
                    <p><strong>Điện thoại:</strong> {sup.phone || 'N/A'}</p>
                    <p><strong>Email:</strong> {sup.email || 'N/A'}</p>
                    <p><strong>Mã số thuế:</strong> <code>{sup.tax_code || 'N/A'}</code></p>
                    <p><strong>Địa chỉ:</strong> {sup.address || 'N/A'}</p>
                  </div>
                  {isAdmin && (
                    <div className="supplier-card-actions">
                      <button type="button" className="supplier-edit-btn" onClick={() => openEditForm(sup)}>Sửa</button>
                      <button type="button" className="supplier-delete-btn" onClick={() => handleDelete(sup)}>Xóa</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Warehouses list */}
          <div className="dashboard-column">
            <h3 className="column-title">📦 Hệ Thống Nhà Kho Dược Phẩm ({warehouses.length})</h3>
            <div className="cards-list">
              {warehouses.map(wh => (
                <div key={wh.id} className="directory-card warehouse-card">
                  <div className="card-top-row">
                    <span className="warehouse-name">{wh.name}</span>
                    <span className="stock-volume-tag">
                      Tồn kho: <strong>{wh.total_quantity}</strong> sp
                    </span>
                  </div>
                  <div className="card-detail-info">
                    <p><strong>Mã kho:</strong> KHO-0{wh.id}</p>
                    <p><strong>Địa chỉ nhà kho:</strong> {wh.address || 'N/A'}</p>
                  </div>
                  <div className="warehouse-capacity-bar">
                    <div className="capacity-label">Tình trạng lưu kho (Tạm tính)</div>
                    <div className="progress-bg">
                      {/* Let's render a nice mock fill bar using total_quantity */}
                      <div
                        className="progress-fill"
                        style={{ width: `${Math.min((wh.total_quantity / 1000) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuppliersView;
