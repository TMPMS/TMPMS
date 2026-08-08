import { useState, useEffect } from 'react';
import { User, Tag, ShoppingBag, Edit3, Save, X, Copy, Check, Calendar, Phone, MapPin, Mail, Shield, KeyRound, Plus, Trash2, Star } from 'lucide-react';
import * as api from '../services/api';
import { formatDateVN } from '../utils/dateUtils';
import './ProfileView.css';

const GENDER_OPTIONS = ['Nam', 'Nữ', 'Khác'];

const EMPTY_ADDRESS_FORM = { addressLine: '', city: '', district: '', ward: '', isDefault: false };

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
  const [vouchers, setVouchers] = useState([]); // voucher công khai
  const [myVouchers, setMyVouchers] = useState([]); // voucher cá nhân (VD trúng vòng quay may mắn)
  const [copiedCode, setCopiedCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const [addresses, setAddresses] = useState([]);
  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressFormData, setAddressFormData] = useState(EMPTY_ADDRESS_FORM);
  const [addrSaving, setAddrSaving] = useState(false);
  const [addrError, setAddrError] = useState('');

  const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();

  const reloadAddresses = async () => {
    if (!user?.id) return;
    const list = await api.getPatientAddresses(user.id);
    setAddresses(Array.isArray(list) ? list : []);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const [prof, vouch, myVouch, addr] = await Promise.allSettled([
          api.fetchMyProfile(),
          api.fetchVouchers(),
          api.fetchMyVouchers(),
          user?.id ? api.getPatientAddresses(user.id) : Promise.resolve([]),
        ]);
        if (prof.status === 'fulfilled') {
          setProfile(prof.value);
          setFormData(prof.value);
        } else {
          setLoadError(prof.reason?.message || 'Không thể tải hồ sơ.');
        }
        if (vouch.status === 'fulfilled') setVouchers(vouch.value);
        if (myVouch.status === 'fulfilled') setMyVouchers(myVouch.value);
        if (addr.status === 'fulfilled') setAddresses(Array.isArray(addr.value) ? addr.value : []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const openAddAddress = () => {
    setEditingAddressId(null);
    setAddressFormData(EMPTY_ADDRESS_FORM);
    setAddrError('');
    setAddressFormOpen(true);
  };

  const openEditAddress = (addr) => {
    setEditingAddressId(addr.id);
    setAddressFormData({
      addressLine: addr.addressLine || '',
      city: addr.city || '',
      district: addr.district || '',
      ward: addr.ward || '',
      isDefault: !!addr.isDefault,
    });
    setAddrError('');
    setAddressFormOpen(true);
  };

  const closeAddressForm = () => {
    setAddressFormOpen(false);
    setEditingAddressId(null);
    setAddressFormData(EMPTY_ADDRESS_FORM);
  };

  const handleSaveAddress = async () => {
    if (!addressFormData.addressLine.trim()) {
      setAddrError('Vui lòng nhập địa chỉ chi tiết.');
      return;
    }
    setAddrSaving(true);
    setAddrError('');
    try {
      if (editingAddressId) {
        await api.updateAddress(editingAddressId, addressFormData);
      } else {
        await api.addAddress(user.id, addressFormData);
      }
      await reloadAddresses();
      closeAddressForm();
    } catch (e) {
      setAddrError(e.message || 'Không thể lưu địa chỉ.');
    } finally {
      setAddrSaving(false);
    }
  };

  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm('Xóa địa chỉ này?')) return;
    setAddrError('');
    try {
      await api.deleteAddress(addressId);
      await reloadAddresses();
    } catch (e) {
      setAddrError(e.message || 'Không thể xóa địa chỉ.');
    }
  };

  const handleSetDefaultAddress = async (addressId) => {
    setAddrError('');
    try {
      await api.setDefaultAddress(addressId);
      await reloadAddresses();
    } catch (e) {
      setAddrError(e.message || 'Không thể đặt địa chỉ mặc định.');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const updated = await api.updateMyProfile(formData);
      setProfile(updated);
      setFormData(updated);
      setEditing(false);
      setSuccess('Cập nhật hồ sơ thành công!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.message || 'Không thể cập nhật hồ sơ. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.'); return;
    }
    setSaving(true);
    try {
      await api.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSuccess('Đổi mật khẩu thành công!');
    } catch (e) {
      setError(e.message || 'Không thể đổi mật khẩu.');
    } finally { setSaving(false); }
  };

  const formatDate = (d) => formatDateVN(d);

  const formatPrice = (p) =>
    p == null ? 'Liên hệ' : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p);

  const renderVoucherCard = (v, i) => {
    const [bg1, bg2] = VOUCHER_COLORS[i % VOUCHER_COLORS.length];
    const isCopied = copiedCode === v.code;
    const daysLeft = v.endDate ? Math.ceil((new Date(v.endDate) - new Date()) / 86400000) : null;

    return (
      <div key={v.id} className="voucher-card" style={{ '--c1': bg1, '--c2': bg2 }}>
        <div className="vc-left">
          <div className="vc-discount">
            {v.discountType === 'percent'
              ? <><span className="vc-val">{v.discountValue}%</span><span className="vc-type">GIẢM</span></>
              : <><span className="vc-val">{new Intl.NumberFormat('vi-VN').format(v.discountValue)}</span><span className="vc-type">VND OFF</span></>
            }
          </div>
          <div className="vc-zigzag" />
        </div>
        <div className="vc-right">
          <div className="vc-name">{v.name}</div>
          {v.minOrderValue > 0 && (
            <div className="vc-condition">Đơn tối thiểu {formatPrice(v.minOrderValue)}</div>
          )}
          {v.maxDiscount && (
            <div className="vc-condition">Giảm tối đa {formatPrice(v.maxDiscount)}</div>
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
  };

  const displayName = profile?.fullName || profile?.username || user?.username || 'Người dùng';
  const avatarLetter = (displayName || 'U')[0].toUpperCase();
  const roleName = profile?.role_name === 'Customer' || profile?.role_name === 'User' ? 'Thành viên' :
    profile?.role_name === 'Admin' ? 'Quản trị viên' : profile?.role_name || 'Thành viên';

  if (loading) return (
    <div className="profile-loading" aria-live="polite">
      <div className="profile-skeleton profile-skeleton-avatar" />
      <div className="profile-skeleton profile-skeleton-line" />
      <div className="profile-skeleton profile-skeleton-panel" />
    </div>
  );

  if (loadError || !profile) return (
    <div className="profile-load-error" role="alert">
      <Shield size={34} />
      <h2>Không thể tải hồ sơ</h2>
      <p>{loadError || 'Bạn cần đăng nhập để xem thông tin tài khoản.'}</p>
      <button type="button" onClick={() => window.location.reload()}>Thử lại</button>
    </div>
  );

  return (
    <div className="profile-layout">
      {/* SIDEBAR */}
      <aside className="profile-sidebar">
        {/* Avatar + Name */}
        <div className="profile-avatar-block">
          <div className="profile-avatar">
            {profile?.avatarUrl
              ? <img src={profile.avatarUrl} alt={`Ảnh đại diện của ${displayName}`} />
              : <span>{avatarLetter}</span>
            }
            <div className="profile-avatar-ring" />
          </div>
          <h3 className="profile-name">{displayName}</h3>
          <span className="profile-role-badge">{roleName}</span>
          <p className="profile-member-since">{profile?.email}</p>
        </div>

        {/* Nav Tabs */}
        <nav className="profile-nav">
          <button
            className={`pnav-btn ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => { setActiveTab('security'); setError(''); setSuccess(''); }}
          >
            <KeyRound size={16} /> Đổi mật khẩu
          </button>
          <button
            className={`pnav-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={16} /> Hồ sơ của tôi
          </button>
          <button
            className={`pnav-btn ${activeTab === 'addresses' ? 'active' : ''}`}
            onClick={() => setActiveTab('addresses')}
          >
            <MapPin size={16} /> Sổ địa chỉ
            <span className="pnav-badge">{addresses.length}</span>
          </button>
          <button
            className={`pnav-btn ${activeTab === 'vouchers' ? 'active' : ''}`}
            onClick={() => setActiveTab('vouchers')}
          >
            <Tag size={16} /> Voucher
            <span className="pnav-badge">{myVouchers.length + vouchers.length}</span>
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
        {success && <div className="profile-success" role="status">{success}</div>}
        {error && <div className="profile-error" role="alert">{error}</div>}

        {/* ─── TAB: PROFILE ─── */}
        {activeTab === 'profile' && (
          <div className="profile-card">
            <div className="profile-card-header">
              <h2>Thông tin cá nhân</h2>
              {!editing ? (
                <button type="button" className="edit-btn" onClick={() => { setEditing(true); setError(''); setSuccess(''); }}>
                  <Edit3 size={15} /> Chỉnh sửa
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="save-btn" onClick={handleSave} disabled={saving}>
                    <Save size={15} /> {saving ? 'Đang lưu...' : 'Lưu lại'}
                  </button>
                  <button type="button" className="cancel-btn" onClick={() => { setEditing(false); setFormData(profile); setError(''); }}>
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
                  ? <input className="pform-input" autoComplete="name" value={formData.fullName || ''} onChange={e => setFormData(p => ({ ...p, fullName: e.target.value }))} placeholder="Nhập họ và tên" />
                  : <span>{profile?.fullName || <em>Chưa cập nhật</em>}</span>
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
                  ? <input className="pform-input" type="tel" autoComplete="tel" value={formData.phone || ''} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} placeholder="Nhập số điện thoại" />
                  : <span>{profile?.phone || <em>Chưa cập nhật</em>}</span>
                }
              </div>

              {/* Date of Birth */}
              <div className="pform-group">
                <label><Calendar size={13} /> Ngày sinh</label>
                {editing
                  ? <input type="date" className="pform-input" value={formData.dateOfBirth ? formData.dateOfBirth.split('T')[0] : ''} onChange={e => setFormData(p => ({ ...p, dateOfBirth: e.target.value }))} />
                  : <span>{profile?.dateOfBirth ? formatDate(profile.dateOfBirth) : <em>Chưa cập nhật</em>}</span>
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
                  ? <input className="pform-input" autoComplete="street-address" value={formData.address || ''} onChange={e => setFormData(p => ({ ...p, address: e.target.value }))} placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố" />
                  : <span>{profile?.address || <em>Chưa cập nhật</em>}</span>
                }
              </div>

              {/* Avatar URL */}
              {editing && (
                <div className="pform-group pform-full">
                  <label>URL ảnh đại diện</label>
                  <input className="pform-input" type="url" value={formData.avatarUrl || ''} onChange={e => setFormData(p => ({ ...p, avatarUrl: e.target.value }))} placeholder="https://example.com/avatar.jpg" />
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="profile-card">
            <div className="profile-card-header"><h2>Đổi mật khẩu</h2></div>
            <form className="password-form" onSubmit={handleChangePassword}>
              <div className="pform-group">
                <label>Mật khẩu hiện tại</label>
                <input className="pform-input" type="password" autoComplete="current-password" required value={passwordForm.currentPassword} onChange={e => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))} />
              </div>
              <div className="pform-group">
                <label>Mật khẩu mới</label>
                <input className="pform-input" type="password" autoComplete="new-password" required minLength={8} value={passwordForm.newPassword} onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))} />
                <small>Ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.</small>
              </div>
              <div className="pform-group">
                <label>Xác nhận mật khẩu mới</label>
                <input className="pform-input" type="password" autoComplete="new-password" required value={passwordForm.confirmPassword} onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))} />
              </div>
              <button type="submit" className="save-btn password-submit" disabled={saving}><KeyRound size={15} /> {saving ? 'Đang xử lý...' : 'Đổi mật khẩu'}</button>
            </form>
          </div>
        )}

        {/* ─── TAB: ADDRESSES ─── */}
        {activeTab === 'addresses' && (
          <div className="profile-card">
            <div className="profile-card-header">
              <h2>Sổ địa chỉ</h2>
              {!addressFormOpen && (
                <button type="button" className="edit-btn" onClick={openAddAddress}>
                  <Plus size={15} /> Thêm địa chỉ
                </button>
              )}
            </div>

            {addrError && <div className="profile-error" role="alert">{addrError}</div>}

            {addressFormOpen && (
              <div className="address-form">
                <div className="profile-form-grid">
                  <div className="pform-group pform-full">
                    <label><MapPin size={13} /> Địa chỉ chi tiết (số nhà, đường)</label>
                    <input className="pform-input" value={addressFormData.addressLine} onChange={e => setAddressFormData(p => ({ ...p, addressLine: e.target.value }))} placeholder="Số 12, ngõ 34, đường Láng" />
                  </div>
                  <div className="pform-group">
                    <label>Phường/Xã</label>
                    <input className="pform-input" value={addressFormData.ward} onChange={e => setAddressFormData(p => ({ ...p, ward: e.target.value }))} placeholder="Phường Láng Thượng" />
                  </div>
                  <div className="pform-group">
                    <label>Quận/Huyện</label>
                    <input className="pform-input" value={addressFormData.district} onChange={e => setAddressFormData(p => ({ ...p, district: e.target.value }))} placeholder="Đống Đa" />
                  </div>
                  <div className="pform-group pform-full">
                    <label>Tỉnh/Thành phố</label>
                    <input className="pform-input" value={addressFormData.city} onChange={e => setAddressFormData(p => ({ ...p, city: e.target.value }))} placeholder="Hà Nội" />
                  </div>
                  <div className="pform-group pform-full">
                    <label className="address-default-check">
                      <input type="checkbox" checked={addressFormData.isDefault} onChange={e => setAddressFormData(p => ({ ...p, isDefault: e.target.checked }))} />
                      Đặt làm địa chỉ mặc định
                    </label>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button type="button" className="save-btn" onClick={handleSaveAddress} disabled={addrSaving}>
                    <Save size={15} /> {addrSaving ? 'Đang lưu...' : 'Lưu địa chỉ'}
                  </button>
                  <button type="button" className="cancel-btn" onClick={closeAddressForm}>
                    <X size={15} /> Hủy
                  </button>
                </div>
              </div>
            )}

            {!addressFormOpen && (
              addresses.length === 0 ? (
                <div className="voucher-empty">
                  <MapPin size={48} strokeWidth={1} />
                  <p>Bạn chưa có địa chỉ nào. Thêm địa chỉ để đặt hàng nhanh hơn!</p>
                </div>
              ) : (
                <div className="address-list">
                  {addresses.map(addr => (
                    <div key={addr.id} className={`address-card ${addr.isDefault ? 'is-default' : ''}`}>
                      <div className="address-card-main">
                        {addr.isDefault && <span className="address-default-badge"><Star size={11} /> Mặc định</span>}
                        <p className="address-line">{addr.addressLine}</p>
                        <p className="address-sub">{[addr.ward, addr.district, addr.city].filter(Boolean).join(', ')}</p>
                      </div>
                      <div className="address-card-actions">
                        {!addr.isDefault && (
                          <button type="button" className="address-action-btn" onClick={() => handleSetDefaultAddress(addr.id)}>
                            <Star size={13} /> Đặt mặc định
                          </button>
                        )}
                        <button type="button" className="address-action-btn" onClick={() => openEditAddress(addr)}>
                          <Edit3 size={13} /> Sửa
                        </button>
                        <button type="button" className="address-action-btn danger" onClick={() => handleDeleteAddress(addr.id)}>
                          <Trash2 size={13} /> Xóa
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}

        {/* ─── TAB: VOUCHERS ─── */}
        {activeTab === 'vouchers' && (
          <>
            <div className="profile-card">
              <div className="profile-card-header">
                <h2>Voucher của tôi</h2>
              </div>
              {myVouchers.length === 0 ? (
                <div className="voucher-empty">
                  <Tag size={48} strokeWidth={1} />
                  <p>Chưa có voucher cá nhân nào. Quay vòng quay may mắn mỗi ngày để nhận voucher!</p>
                </div>
              ) : (
                <div className="voucher-grid">
                  {myVouchers.map((v, i) => renderVoucherCard(v, i))}
                </div>
              )}
            </div>

            <div className="profile-card" style={{ marginTop: 16 }}>
              <div className="profile-card-header">
                <h2>Voucher công khai</h2>
              </div>
              {vouchers.length === 0 ? (
                <div className="voucher-empty">
                  <Tag size={48} strokeWidth={1} />
                  <p>Hiện chưa có voucher công khai nào.</p>
                </div>
              ) : (
                <div className="voucher-grid">
                  {vouchers.map((v, i) => renderVoucherCard(v, i))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
