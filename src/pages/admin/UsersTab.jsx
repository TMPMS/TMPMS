import React, { useState, useEffect } from 'react';
import * as api from '../../services/api';
import { formatDate } from './shared/adminFormat';

// Quản lý Người dùng — tách từ AdminView.jsx (tab "users").
const UsersTab = ({ hasAccess, showSuccess, setError }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTabData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.fetchUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
      setError('Lỗi tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTabData(); }, []);

  const handleUserRoleChange = async (userId, roleName) => {
    if (!hasAccess([1])) {
      setError('Chỉ Quản trị viên hệ thống (Admin) có quyền phân quyền người dùng.');
      return;
    }
    try {
      await api.updateUserRole(userId, roleName);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, roleName: roleName } : u));
      showSuccess('Cập nhật quyền người dùng thành công!');
      loadTabData();
    } catch (err) {
      setError('Lỗi khi đổi quyền người dùng.');
    }
  };

  const handleUserStatusToggle = async (userId, currentStatus) => {
    if (!hasAccess([1])) {
      setError('Chỉ Quản trị viên hệ thống (Admin) có quyền kích hoạt/khóa tài khoản.');
      return;
    }
    try {
      await api.toggleUserStatus(userId, !currentStatus);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !currentStatus } : u));
      showSuccess('Cập nhật trạng thái hoạt động thành công!');
    } catch (err) {
      setError('Lỗi khi thay đổi trạng thái hoạt động.');
    }
  };

  const handleUserDelete = async (userId, username) => {
    if (!hasAccess([1])) {
      setError('Chỉ Quản trị viên hệ thống (Admin) có quyền xóa tài khoản.');
      return;
    }
    if (!window.confirm(`Xóa vĩnh viễn tài khoản "${username}"? Hành động này không thể hoàn tác.`)) return;
    try {
      await api.deleteUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      showSuccess('Đã xóa người dùng thành công!');
    } catch (err) {
      if (err.code === 'HAS_RELATED_DATA') {
        const wantsForce = window.confirm(
          `${err.message}\n\nBạn có muốn ẩn danh hóa thông tin cá nhân (tên, email, SĐT) và khóa vĩnh viễn tài khoản "${username}" thay vì xóa cứng không? Đơn thuốc/hồ sơ liên quan sẽ được giữ nguyên.`
        );
        if (wantsForce) {
          try {
            await api.forceDeleteUser(userId);
            setUsers(prev => prev.filter(u => u.id !== userId));
            showSuccess('Đã ẩn danh hóa và khóa vĩnh viễn tài khoản!');
          } catch (err2) {
            setError(err2.message || 'Lỗi khi ẩn danh hóa tài khoản.');
          }
        }
        return;
      }
      setError(err.message || 'Lỗi khi xóa người dùng.');
    }
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Đang tải dữ liệu và biên dịch báo cáo...</p>
      </div>
    );
  }

  return (
            <div className="admin-card">
              <h3 className="card-title">Phân quyền & Quản lý Tài khoản người dùng</h3>
              {users.length === 0 ? (
                <div className="admin-empty">Không tìm thấy người dùng.</div>
              ) : (
                <div className="table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Tên tài khoản</th>
                        <th>Email đăng ký</th>
                        <th>Số điện thoại</th>
                        <th>Vai trò hiện tại</th>
                        <th>Ngày tạo</th>
                        <th>Trạng thái hoạt động</th>
                        <th>Phân quyền lại</th>
                        <th>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id}>
                          <td className="col-id">#{u.id}</td>
                          <td><strong>{u.username}</strong></td>
                          <td>{u.email}</td>
                          <td>{u.phone || 'Chưa đăng ký'}</td>
                          <td>
                            <span className={`role-badge role-${u.role_id}`}>
                              {u.roleName}
                            </span>
                          </td>
                          <td>{formatDate(u.created_at)}</td>
                          <td>
                            <button
                              className={`user-status-btn ${u.is_active ? 'active' : 'blocked'}`}
                              onClick={() => handleUserStatusToggle(u.id, u.is_active)}
                            >
                              {u.is_active ? 'Đang hoạt động' : 'Đã khóa'}
                            </button>
                          </td>
                          <td>
                            <select 
                              className="role-assign-select"
                              value={u.roleName || "User"}
                              onChange={(e) => handleUserRoleChange(u.id, e.target.value)}
                            >
                              <option value="Admin">Quản trị viên (Admin)</option>
                              <option value="User">Khách hàng / Bệnh nhân (User)</option>
                              <option value="Pharmacy">Nhân viên Nhà thuốc (Pharmacy)</option>
                              <option value="Staff">Nhân viên Lễ tân / Bệnh viện (Staff)</option>
                              <option value="Doctor">Bác sĩ / Thầy thuốc (Doctor)</option>
                              <option value="Accountant">Kế toán (Accountant)</option>
                              <option value="Warehouse">Thủ kho (Warehouse)</option>
                            </select>
                          </td>
                          <td>
                            <button
                              className="user-delete-btn"
                              onClick={() => handleUserDelete(u.id, u.username)}
                            >
                              Xóa
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
  );
};

export default UsersTab;
