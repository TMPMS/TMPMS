const pad = (n) => String(n).padStart(2, '0');

// Hàm dùng chung DUY NHẤT để hiển thị ngày giờ toàn bộ FE.
// - Chuỗi kèm "Z"/offset (BE trả đúng chuẩn UTC): new Date() tự quy đổi sang giờ địa phương.
// - Chuỗi KHÔNG kèm marker (wall-clock như AppointmentDate, DateOfBirth...):
//   JS coi là giờ local, hiển thị nguyên giá trị — đúng vì đó là giờ người dùng đã chọn.
export function formatDateTimeVN(value) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDateVN(value) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function formatTimeVN(value) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
