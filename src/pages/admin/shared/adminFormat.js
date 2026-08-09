import { formatDateTimeVN } from '../../../utils/dateUtils';

// Shared formatting helpers used across the Admin tabs — extracted verbatim
// from the original AdminView.jsx (no behavior change).
export const formatPrice = (price) => {
  if (price == null) return 'Liên hệ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
};

export const formatDate = (dateStr) => formatDateTimeVN(dateStr);
