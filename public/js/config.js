// Khóa "publishable" của Supabase được thiết kế để công khai ở phía trình duyệt.
// Bảo mật dữ liệu dựa vào Row Level Security trong supabase/schema.sql.
export const SUPABASE_URL = 'https://bczhrosvlummhsaljozz.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_4iUndL7I9rnwf9nHvDkXwg_jSqTI34K';
export const EMAIL_DOMAIN = 'statverse-users.com'; // email ảo để đăng nhập bằng tên người dùng
export const LS = { key: 'sv_gemini_key', model: 'sv_gemini_model', stars: 'sv_stars', log: 'sv_log' };
export const BUCKET = 'forum-images';
export const CHAPTERS = [
  'Xác suất và công thức tính xác suất',
  'Biến ngẫu nhiên',
  'Một số phân phối xác suất thông dụng',
  'Mẫu ngẫu nhiên và các số đặc trưng của mẫu',
  'Ước lượng khoảng',
  'Kiểm định giả thiết trong thống kê',
  'So sánh 2 tham số'
];
export const ERROR_LABELS = ['Khái niệm', 'Công thức', 'Tính toán', 'Đọc đề', 'Thiếu bước', 'Trình bày'];
