-- Seed Roles
INSERT INTO roles (id, name) VALUES 
(1, 'Admin'),
(2, 'Customer')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Seed Categories
INSERT INTO categories (id, name, description) VALUES
(1, 'Thực phẩm chức năng', 'Các sản phẩm bổ sung dưỡng chất, vitamin, khoáng chất cải thiện sức khỏe'),
(2, 'Dược mỹ phẩm', 'Sản phẩm chăm sóc da mặt, chống nắng, tẩy trang kết hợp dược liệu'),
(3, 'Thuốc', 'Thuốc kê đơn và không kê đơn điều trị bệnh lý'),
(4, 'Chăm sóc cá nhân', 'Các sản phẩm vệ sinh cơ thể, dầu gội, sữa tắm'),
(5, 'Thiết bị y tế', 'Máy đo huyết áp, nhiệt kế và các thiết bị chăm sóc sức khỏe tại nhà'),
(6, 'Châm cứu', 'Thiết bị châm cứu, cứu ngải, bấm huyệt'),
(7, 'Bệnh & Góc sức khỏe', 'Cung cấp kiến thức y tế'),
(8, 'Hệ thống nhà thuốc', 'Danh sách địa điểm hệ thống nhà thuốc')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Seed Suppliers
INSERT INTO suppliers (id, company_name, contact_person, email, phone, address, tax_code, status) VALUES
(1, 'Công ty Cổ phần Traphaco', 'Nguyễn Văn A', 'traphaco@gmail.com', '0243681161', '75 Yên Ninh, Ba Đình, Hà Nội', '0100108656', 'Active'),
(2, 'Công ty TNHH Dược phẩm OPC', 'Trần Thị B', 'opc@opcpharma.com', '0283960124', '1017 Hồng Bàng, Quận 6, TP. HCM', '0302560112', 'Active'),
(3, 'Công ty Cổ phần Bách Thảo Dược', 'Lê Văn C', 'contact@bachthaoduoc.com.vn', '0225381881', 'Lô Q-6, KCN Tràng Duệ, Hải Phòng', '0201882654', 'Active'),
(4, 'Nhà sâm KGC Hàn Quốc (Cheong Kwan Jang)', 'Kim Min Woo', 'kgc_global@kgc.co.kr', '+82-2-2189-6100', 'Seoul, Hàn Quốc', 'FOREIGN-001', 'Active')
ON CONFLICT (id) DO UPDATE SET company_name = EXCLUDED.company_name;

-- Seed Medicines (Thuốc Đông Y và Thảo dược từ Mock Data trong App.jsx)
-- Best Sellers (Thuốc Đông Y bán chạy) - Category 3 (Thuốc) hoặc Category 1 (Thực phẩm chức năng)
INSERT INTO medicines (id, category_id, supplier_id, name, description, price, old_price, unit, discount, origin, packaging, stock_quantity, manufacture_date, expiry_date, requires_prescription, image_url) VALUES
(101, 3, 1, 'Hoạt Huyết Dưỡng Não Traphaco (Hộp 5 vỉ x 20 viên)', 'Bổ não, tăng cường tuần hoàn não, giảm đau đầu, chóng mặt, suy giảm trí nhớ.', 95000, 105000, 'Hộp', 10, 'Việt Nam', 'Hộp 100 viên', 150, '2026-01-01', '2029-01-01', FALSE, 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&h=400&fit=crop'),
(102, 1, 3, 'Trà túi lọc Cà Gai Leo thải độc gan (Hộp 20 túi)', 'Hỗ trợ mát gan, giải độc gan, hạ men gan và phục hồi tế bào gan bị tổn thương.', 45000, NULL, 'Hộp', NULL, 'Việt Nam', 'Hộp 20 túi lọc', 200, '2026-02-01', '2028-02-01', FALSE, 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=400&h=400&fit=crop'),
(103, 3, 2, 'Kim Tiền Thảo trị sỏi thận OPC (Hộp 100 viên)', 'Thanh nhiệt, lợi niệu, tiêu sỏi, hỗ trợ điều trị sỏi đường tiết niệu, sỏi thận, sỏi mật.', 65000, 72000, 'Hộp', 9, 'Việt Nam', 'Hộp 100 viên', 120, '2026-01-10', '2029-01-10', FALSE, 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=400&h=400&fit=crop'),
(104, 1, 3, 'Cao Xương Khớp Bách Thảo Dược (Lọ 100g)', 'Hỗ trợ mạnh gân cốt, giảm đau nhức xương khớp do thoái hóa hoặc phong thấp.', 180000, NULL, 'Lọ', NULL, 'Việt Nam', 'Lọ 100g', 80, '2026-03-01', '2028-03-01', FALSE, 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=400&h=400&fit=crop'),
(105, 1, 3, 'Mật ong hoa rừng nguyên chất Tây Nguyên (Chai 500ml)', 'Mật ong thiên nhiên nguyên chất, hỗ trợ bồi bổ sức khỏe, làm dịu cổ họng và hỗ trợ tiêu hóa.', 120000, NULL, 'Chai', NULL, 'Việt Nam', 'Chai 500ml', 90, '2026-04-01', '2029-04-01', FALSE, 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=400&fit=crop'),
(106, 1, 3, 'Bột gừng mật ong sấy thăng hoa (Hộp 15 gói)', 'Làm ấm cơ thể, phòng cảm lạnh, giảm buồn nôn và tăng cường tiêu hóa.', 75000, 85000, 'Hộp', 11, 'Việt Nam', 'Hộp 15 gói', 110, '2026-03-15', '2028-03-15', FALSE, 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400&h=400&fit=crop')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price, image_url = EXCLUDED.image_url;

-- Supplements (Thảo dược & Cao dược liệu) - Category 1 (Thực phẩm chức năng)
INSERT INTO medicines (id, category_id, supplier_id, name, description, price, old_price, unit, discount, origin, packaging, stock_quantity, manufacture_date, expiry_date, requires_prescription, image_url) VALUES
(201, 1, 3, 'Đông Trùng Hạ Thảo Militaris sấy (Lọ 10g)', 'Bồi bổ cơ thể, tăng cường hệ miễn dịch, cải thiện sinh lực và hỗ trợ chức năng hô hấp.', 290000, 320000, 'Lọ', 9, 'Việt Nam', 'Lọ 10g', 60, '2026-01-20', '2027-07-20', FALSE, 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=400&h=400&fit=crop'),
(202, 1, 2, 'Cao Atiso Vân Anh Đà Lạt (Hộp 1kg)', 'Giải độc gan, lợi mật, giảm cholesterol, thanh nhiệt cơ thể và cải thiện giấc ngủ.', 220000, 245000, 'Hộp', 10, 'Việt Nam', 'Hộp 1kg', 75, '2026-02-15', '2028-02-15', FALSE, 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=400&h=400&fit=crop'),
(203, 1, 4, 'Nhân sâm lát tẩm mật ong Hàn Quốc (Hộp 10 gói)', 'Tăng cường sức đề kháng, phục hồi sức khỏe, giảm căng thẳng mệt mỏi.', 350000, 380000, 'Hộp', 8, 'Hàn Quốc', 'Hộp 200g', 50, '2026-01-05', '2029-01-05', FALSE, 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400&h=400&fit=crop'),
(204, 1, 4, 'Tinh chất hồng sâm KGC Everytime (Hộp 30 gói)', 'Chiết xuất hồng sâm 6 năm tuổi cô đặc cao cấp giúp cải thiện trí nhớ, tăng lưu thông máu.', 1450000, NULL, 'Hộp', NULL, 'Hàn Quốc', 'Hộp 30 gói', 40, '2026-03-10', '2029-03-10', FALSE, 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=400&h=400&fit=crop'),
(205, 1, 3, 'Viên nghệ mật ong sữa chúa Tenchi (Hộp 250g)', 'Hỗ trợ viêm loét dạ dày, tá tràng, làm đẹp da và bồi bổ cơ thể.', 160000, 180000, 'Hộp', 11, 'Việt Nam', 'Hộp 250g', 95, '2026-04-12', '2028-04-12', FALSE, 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400&h=400&fit=crop'),
(206, 1, 3, 'Dầu tràm nguyên chất Cung Đình Huế (Chai 50ml)', 'Phòng tránh gió máy, cảm cúm, sổ mũi, côn trùng cắn, thích hợp cho bé và bà mẹ sau sinh.', 125000, 140000, 'Chai', 10, 'Việt Nam', 'Chai 50ml', 130, '2026-05-01', '2031-05-01', FALSE, 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=400&h=400&fit=crop')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price, image_url = EXCLUDED.image_url;

-- Reset SERIAL sequence for tables just in case we insert manual IDs
SELECT setval('categories_id_seq', COALESCE((SELECT MAX(id)+1 FROM categories), 1), false);
SELECT setval('suppliers_id_seq', COALESCE((SELECT MAX(id)+1 FROM suppliers), 1), false);
SELECT setval('medicines_id_seq', COALESCE((SELECT MAX(id)+1 FROM medicines), 1), false);

-- Seed Users (Admin và Customer mặc định)
-- Sử dụng mật khẩu plaintext để so khớp đơn giản (hoặc MD5/SHA256 tùy chọn)
INSERT INTO users (id, username, email, password_hash, phone, role_id, is_active) VALUES
(1, 'admin', 'admin@example.com', 'admin123', '0987654321', 1, TRUE),
(2, 'user', 'user@example.com', 'user123', '0123456789', 2, TRUE)
ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username, password_hash = EXCLUDED.password_hash;

SELECT setval('users_id_seq', COALESCE((SELECT MAX(id)+1 FROM users), 1), false);

-- Tạo giỏ hàng trống cho người dùng mẫu
INSERT INTO carts (user_id) VALUES (1), (2)
ON CONFLICT (user_id) DO NOTHING;
