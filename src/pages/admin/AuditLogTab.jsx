import React, { useState, useEffect } from 'react';
import * as api from '../../services/api';
import { History } from 'lucide-react';

// Nhật ký thao tác — ghi lại các hành động nhạy cảm trên toàn hệ thống, chỉ Admin xem được.
const ACTION_LABELS = {
  Create: 'Tạo mới', Update: 'Cập nhật', Delete: 'Xóa', Deactivate: 'Ẩn',
  Lock: 'Khóa', Unlock: 'Mở khóa', AssignRole: 'Gán vai trò',
  Dispose: 'Huỷ lô hàng', Adjust: 'Điều chỉnh',
  Finalize: 'Duyệt đơn thuốc', UpdateStatus: 'Đổi trạng thái',
  Cancel: 'Hủy', CancelWithRefund: 'Hủy & hoàn cọc', ReturnRequest: 'Yêu cầu trả hàng',
  CheckIn: 'Check-in', ProposeTime: 'Đề xuất giờ khám', ResolveReschedule: 'Xử lý đổi lịch',
  NoShow: 'Vắng mặt', Approve: 'Duyệt', Reject: 'Từ chối', Complete: 'Hoàn thành',
  Sync: 'Đồng bộ', WebhookSuccess: 'Webhook thanh toán',
  AppointmentPaymentSuccess: 'Đặt cọc thành công', DemoPayAppointment: 'Đặt cọc (giả lập)',
  VerifySuccess: 'Xác minh thanh toán', VerifyFailed: 'Thanh toán thất bại', DemoPay: 'Thanh toán (giả lập)',
};
const ACTION_COLORS = {
  Create: { bg: '#dcfce7', fg: '#166534' },
  Update: { bg: '#dbeafe', fg: '#1e40af' },
  Delete: { bg: '#fee2e2', fg: '#991b1b' },
  Deactivate: { bg: '#fee2e2', fg: '#991b1b' },
  Lock: { bg: '#fee2e2', fg: '#991b1b' },
  Unlock: { bg: '#dcfce7', fg: '#166534' },
  AssignRole: { bg: '#fef3c7', fg: '#92400e' },
  Dispose: { bg: '#fee2e2', fg: '#991b1b' },
  Adjust: { bg: '#fef3c7', fg: '#92400e' },
  Finalize: { bg: '#dcfce7', fg: '#166534' },
  UpdateStatus: { bg: '#dbeafe', fg: '#1e40af' },
  Cancel: { bg: '#fee2e2', fg: '#991b1b' },
  CancelWithRefund: { bg: '#fee2e2', fg: '#991b1b' },
  ReturnRequest: { bg: '#fef3c7', fg: '#92400e' },
  CheckIn: { bg: '#dbeafe', fg: '#1e40af' },
  ProposeTime: { bg: '#fef3c7', fg: '#92400e' },
  ResolveReschedule: { bg: '#dbeafe', fg: '#1e40af' },
  NoShow: { bg: '#fee2e2', fg: '#991b1b' },
  Approve: { bg: '#dcfce7', fg: '#166534' },
  Reject: { bg: '#fee2e2', fg: '#991b1b' },
  Complete: { bg: '#dcfce7', fg: '#166534' },
  Sync: { bg: '#f1f5f9', fg: '#334155' },
  WebhookSuccess: { bg: '#dcfce7', fg: '#166534' },
  AppointmentPaymentSuccess: { bg: '#dcfce7', fg: '#166534' },
  DemoPayAppointment: { bg: '#fef3c7', fg: '#92400e' },
  VerifySuccess: { bg: '#dcfce7', fg: '#166534' },
  VerifyFailed: { bg: '#fee2e2', fg: '#991b1b' },
  DemoPay: { bg: '#fef3c7', fg: '#92400e' },
};
const ENTITY_OPTIONS = [
  'User', 'Supplier', 'Voucher', 'StockBatch', 'Medicine', 'Category',
  'Order', 'Cart', 'CartItem', 'Prescription', 'Appointment', 'Payment',
];

const AuditLogTab = ({ hasAccess, showSuccess, setError }) => {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [filters, setFilters] = useState({ entityName: '', action: '', fromDate: '', toDate: '' });

  const loadTabData = async (targetPage = page) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.fetchAuditLogs({ ...filters, page: targetPage, pageSize });
      setLogs(data.items || []);
      setTotalCount(data.totalCount || 0);
    } catch (err) {
      console.error(err);
      setError('Lỗi tải nhật ký thao tác. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTabData(1); setPage(1); }, [filters.entityName, filters.action, filters.fromDate, filters.toDate]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  if (loading && logs.length === 0) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Đang tải nhật ký thao tác...</p>
      </div>
    );
  }

  return (
    <div className="admin-card">
      <h3 className="admin-section-title"><History size={16} /> Nhật ký thao tác ({totalCount})</h3>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <select className="admin-input" style={{ width: 180 }} value={filters.entityName}
          onChange={e => setFilters(f => ({ ...f, entityName: e.target.value }))}>
          <option value="">Tất cả đối tượng</option>
          {ENTITY_OPTIONS.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <select className="admin-input" style={{ width: 160 }} value={filters.action}
          onChange={e => setFilters(f => ({ ...f, action: e.target.value }))}>
          <option value="">Tất cả hành động</option>
          {Object.keys(ACTION_LABELS).map(a => <option key={a} value={a}>{ACTION_LABELS[a]}</option>)}
        </select>
        <input type="date" className="admin-input" style={{ width: 160 }} value={filters.fromDate}
          onChange={e => setFilters(f => ({ ...f, fromDate: e.target.value }))} />
        <input type="date" className="admin-input" style={{ width: 160 }} value={filters.toDate}
          onChange={e => setFilters(f => ({ ...f, toDate: e.target.value }))} />
      </div>

      <div className="medicine-crud-list" style={{ maxHeight: 600 }}>
        {logs.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>Không có nhật ký nào khớp bộ lọc</p>
        ) : logs.map(log => {
          const color = ACTION_COLORS[log.action] || { bg: '#f1f5f9', fg: '#334155' };
          return (
            <div key={log.id} className="medicine-crud-row">
              <div className="medicine-crud-info" style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, background: color.bg, color: color.fg, fontWeight: 700 }}>
                    {ACTION_LABELS[log.action] || log.action}
                  </span>
                  <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, background: '#f1f5f9', color: '#334155', fontWeight: 700 }}>
                    {log.entityName}{log.entityId ? ` #${log.entityId}` : ''}
                  </span>
                  <span className="med-meta">{new Date(log.createdAt).toLocaleString('vi-VN')}</span>
                </div>
                <strong style={{ marginTop: 4, display: 'block' }}>{log.description}</strong>
                <span className="med-meta">Thực hiện bởi: {log.userName} ({log.userRole || '—'}){log.ipAddress ? ` · IP: ${log.ipAddress}` : ''}</span>
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button className="cancel-edit-btn" disabled={page <= 1}
            onClick={() => { const p = page - 1; setPage(p); loadTabData(p); }}>‹ Trước</button>
          <span style={{ alignSelf: 'center', color: '#64748b', fontSize: 13 }}>Trang {page}/{totalPages}</span>
          <button className="cancel-edit-btn" disabled={page >= totalPages}
            onClick={() => { const p = page + 1; setPage(p); loadTabData(p); }}>Sau ›</button>
        </div>
      )}
    </div>
  );
};

export default AuditLogTab;
