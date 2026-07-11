import React, { useState, useEffect } from 'react';
import { User, Tag, ShoppingBag, Edit3, Save, X, Copy, Check, Gift, Calendar, Phone, MapPin, Mail, Shield } from 'lucide-react';
import * as api from '../services/api';
import './ProfileView.css';

const GENDER_OPTIONS = ['Nam', 'Nữ', 'Khác'];

const VOUCHER_COLORS = [
  ['#0d9488', '#134e4a'],
  ['#7c3aed', '#4c1d95'],
  ['#ea580c', '#7c2d12'],
  ['#0284c7', '#0c4a6e'],
  ['#be185d', '#831843'],
];

export default function ProfileView({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({});
  const [vouchers, setVouchers] = useState([]);
  const [copiedCode, setCopiedCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [prof, vouch] = await Promise.allSettled([
          api.fetchMyProfile(),
          api.fetchVouchers(),
        ]);
        if (prof.status === 'fulfilled') {
          setProfile(prof.value);
          setFormData(prof.value);
        }
        if (vouch.status === 'fulfilled') setVouchers(vouch.value);
      } catch (e) {
        // fallback to localStorage
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const updated = await api.updateMyProfile(formData);
      setProfile({ ...profile, ...formData });
      setEditing(false);
      setSuccess('Cập nhật hồ sơ thành công!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError('Không thể cập nhật hồ sơ. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('vi-VN');
  };

  const formatPrice = (p) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p || 0);

  const displayName = profile?.full_name || profile?.username || user?.username || 'Người dùng';
  const avatarLetter = (displayName || 'U')[0].toUpperCase();
  const roleName = profile?.role_name === 'Customer' || profile?.role_name === 'User' ? 'Thành viên' :
    profile?.role_name === 'Admin' ? 'Quản trị viên' : profile?.role_name || 'Thành viên';

  if (loading) return (
    <div className="profile-loading">
      <div className="profile-loading-spinner" />
      <p>Đang tải hồ sơ...</p>
    </div>
  );

  return (
    <div className="profile-layout">
      {/* SIDEBAR */}
      <aside className="profile-sidebar">
        {/* Avatar + Name */}
        <div className="profile-avatar-block">
          <div className="profile-avatar">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="avatar" />
              : <span>{avatarLetter}</span>
            }
            <div className="profile-avatar-ring" />
          </div>
          <h3 className="profile-name">{displayName}</h3>
          <span className="profile-role-badge">{roleName}</span>
          <p className="profile-member-since">Thành viên từ {formatDate(profile?.created_at)}</p>
        </div>

        {/* Points Card */}
        <div className="profile-points-card">
          <div className="points-header">
            <Gift size={18} />
            <span>Điểm tích lũy</span>
          </div>
          <div className="points-value">1.250 điểm</div>
          <div className="points-bar-bg">
            <div className="points-bar-fill" style={{ width: '62%' }} />
          </div>
          <p className="points-note">Còn 750 điểm để lên hạng Vàng</p>
        </div>

        {/* Nav Tabs */}
        <nav className="profile-nav">
          <button
            className={`pnav-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={16} /> Hồ sơ của tôi
          </button>
          <button
            className={`pnav-btn ${activeTab === 'vouchers' ? 'active' : ''}`}
            onClick={() => setActiveTab('vouchers')}
          >
            <Tag size={16} /> Voucher của tôi
            <span className="pnav-badge">{vouchers.length}</span>
          </button>
          <button
            className={`pnav-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => { onNavigate && onNavigate('history'); }}
          >
            <ShoppingBag size={16} /> Lịch sử đơn hàng
          </button>
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="profile-main">
        {success && <div className="profile-success">{success}</div>}
        {error && <div className="profile-error">{error}</div>}

        {/* ─── TAB: PROFILE ─── */}
        {activeTab === 'profile' && (
          <div className="profile-card">
            <div className="profile-card-header">
              <h2>Thông tin cá nhân</h2>
              {!editing ? (
                <button className="edit-btn" onClick={() => setEditing(true)}>
                  <Edit3 size={15} /> Chỉnh sửa
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="save-btn" onClick={handleSave} disabled={saving}>
                    <Save size={15} /> {saving ? 'Đang lưu...' : 'Lưu lại'}
                  </button>
                  <button className="cancel-btn" onClick={() => { setEditing(false); setFormData(profile); }}>
                    <X size={15} /> Hủy
                  </button>
                </div>
              )}
            </div>

            <div className="profile-form-grid">
              {/* Full Name */}
              <div className="pform-group">
                <label><User size={13} /> Họ và tên</label>
                {editing
                  ? <input className="pform-input" value={formData.full_name || ''} onChange={e => setFormData(p => ({ ...p, full_name: e.target.value }))} placeholder="Nguyễn Văn A" />
                  : <span>{profile?.full_name || <em>Chưa cập nhật</em>}</span>
                }
              </div>

              {/* Username */}
              <div className="pform-group">
                <label><Shield size={13} /> Tên đăng nhập</label>
                <span className="pform-readonly">{profile?.username}</span>
              </div>

              {/* Email */}
              <div className="pform-group">
                <label><Mail size={13} /> Email</label>
                <span className="pform-readonly">{profile?.email}</span>
              </div>

              {/* Phone */}
              <div className="pform-group">
                <label><Phone size={13} /> Số điện thoại</label>
                {editing
                  ? <input className="pform-input" value={formData.phone || ''} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} placeholder="0901234567" />
                  : <span>{profile?.phone || <em>Chưa cập nhật</em>}</span>
                }
              </div>

              {/* Date of Birth */}
              <div className="pform-group">
                <label><Calendar size={13} /> Ngày sinh</label>
                {editing
                  ? <input type="date" className="pform-input" value={formData.date_of_birth ? formData.date_of_birth.split('T')[0] : ''} onChange={e => setFormData(p => ({ ...p, date_of_birth: e.target.value }))} />
                  : <span>{profile?.date_of_birth ? formatDate(profile.date_of_birth) : <em>Chưa cập nhật</em>}</span>
                }
              </div>

              {/* Gender */}
              <div className="pform-group">
                <label>Giới tính</label>
                {editing
                  ? (
                    <div className="gender-options">
                      {GENDER_OPTIONS.map(g => (
                        <button
                          key={g}
                          type="button"
                          className={`gender-opt ${formData.gender === g ? 'active' : ''}`}
                          onClick={() => setFormData(p => ({ ...p, gender: g }))}
                        >{g}</button>
                      ))}
                    </div>
                  )
                  : <span>{profile?.gender || <em>Chưa cập nhật</em>}</span>
                }
              </div>

              {/* Address — full width */}
              <div className="pform-group pform-full">
                <label><MapPin size={13} /> Địa chỉ giao hàng</label>
                {editing
                  ? <input className="pform-input" value={formData.address || ''} onChange={e => setFormData(p => ({ ...p, address: e.target.value }))} placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố" />
                  : <span>{profile?.address || <em>Chưa cập nhật</em>}</span>
                }
              </div>

              {/* Avatar URL */}
              {editing && (
                <div className="pform-group pform-full">
                  <label>URL ảnh đại diện</label>
                  <input className="pform-input" value={formData.avatar_url || ''} onChange={e => setFormData(p => ({ ...p, avatar_url: e.target.value }))} placeholder="https://..." />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB: VOUCHERS ─── */}
        {activeTab === 'vouchers' && (
          <div className="profile-card">
            <div className="profile-card-header">
              <h2>🎟️ Voucher của tôi</h2>
            </div>

            {vouchers.length === 0 ? (
              <div className="voucher-empty">
                <Tag size={48} strokeWidth={1} />
                <p>Chưa có voucher nào. Mua hàng để nhận voucher!</p>
              </div>
            ) : (
              <div className="voucher-grid">
                {vouchers.map((v, i) => {
                  const [bg1, bg2] = VOUCHER_COLORS[i % VOUCHER_COLORS.length];
                  const isCopied = copiedCode === v.code;
                  const daysLeft = v.end_date ? Math.ceil((new Date(v.end_date) - new Date()) / 86400000) : null;

                  return (
                    <div key={v.id} className="voucher-card" style={{ '--c1': bg1, '--c2': bg2 }}>
                      <div className="vc-left">
                        <div className="vc-discount">
                          {v.discount_type === 'percent'
                            ? <><span className="vc-val">{v.discount_value}%</span><span className="vc-type">GIẢM</span></>
                            : <><span className="vc-val">{new Intl.NumberFormat('vi-VN').format(v.discount_value)}</span><span className="vc-type">VND OFF</span></>
                          }
                        </div>
                        <div className="vc-zigzag" />
                      </div>
                      <div className="vc-right">
                        <div className="vc-name">{v.name}</div>
                        {v.min_order_value > 0 && (
                          <div className="vc-condition">Đơn tối thiểu {formatPrice(v.min_order_value)}</div>
                        )}
                        {v.max_discount && (
                          <div className="vc-condition">Giảm tối đa {formatPrice(v.max_discount)}</div>
                        )}
                        <div className="vc-code-row">
                          <span className="vc-code">{v.code}</span>
                          <button className="vc-copy-btn" onClick={() => handleCopy(v.code)}>
                            {isCopied ? <><Check size={12} /> Đã copy!</> : <><Copy size={12} /> Sao chép</>}
                          </button>
                        </div>
                        {daysLeft !== null && (
                          <div className={`vc-expires ${daysLeft <= 3 ? 'urgent' : ''}`}>
                            {daysLeft <= 0 ? 'Hết hạn' : `Còn ${daysLeft} ngày`}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
