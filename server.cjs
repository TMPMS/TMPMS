const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

const allowedOrigins = [
  'http://localhost:5173',
  'https://tmpms.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for now
    }
  },
  credentials: true,
}));
app.use(express.json());

// Connect to PostgreSQL via DATABASE_URL (Neon/Render) or local config
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      host: '127.0.0.1',
      port: 5432,
      database: 'tmpms',
      user: 'postgres',
    });

// Middleware to log requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Helper to parse PostgREST query parameters (like eq.X or ilike.*X*)
function parseFilter(val) {
  if (!val) return null;
  if (val.startsWith('eq.')) {
    return { op: '=', val: val.substring(3) };
  }
  if (val.startsWith('ilike.')) {
    // Convert *search* to %search%
    let search = val.substring(6);
    if (search.startsWith('*')) search = '%' + search.substring(1);
    if (search.endsWith('*')) search = search.substring(0, search.length - 1) + '%';
    return { op: 'ILIKE', val: search };
  }
  return null;
}

// 1. GET /categories
app.get('/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 2. GET /medicines
app.get('/medicines', async (req, res) => {
  try {
    let query = 'SELECT * FROM medicines';
    const params = [];
    const conditions = [];

    // Parse filters
    if (req.query.category_id) {
      const filter = parseFilter(req.query.category_id);
      if (filter) {
        params.push(filter.val);
        conditions.push(`category_id ${filter.op} $${params.length}`);
      }
    }

    if (req.query.name) {
      const filter = parseFilter(req.query.name);
      if (filter) {
        params.push(filter.val);
        conditions.push(`name ${filter.op} $${params.length}`);
      }
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY id ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 3. GET /carts
app.get('/carts', async (req, res) => {
  try {
    let query = 'SELECT * FROM carts';
    const params = [];
    if (req.query.user_id) {
      const filter = parseFilter(req.query.user_id);
      if (filter) {
        params.push(filter.val);
        query += ` WHERE user_id ${filter.op} $1`;
      }
    }
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 4. GET /cart_items
app.get('/cart_items', async (req, res) => {
  try {
    let query = `
      SELECT ci.*, row_to_json(m.*) as medicine 
      FROM cart_items ci
      JOIN medicines m ON ci.medicine_id = m.id
    `;
    const params = [];
    
    if (req.query.cart_id) {
      const filter = parseFilter(req.query.cart_id);
      if (filter) {
        params.push(filter.val);
        query += ` WHERE ci.cart_id ${filter.op} $1`;
      }
    }
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 5. POST /cart_items
app.post('/cart_items', async (req, res) => {
  try {
    const { cart_id, medicine_id, quantity } = req.body;
    
    const result = await pool.query(
      `INSERT INTO cart_items (cart_id, medicine_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (cart_id, medicine_id)
       DO UPDATE SET quantity = EXCLUDED.quantity
       RETURNING *`,
      [cart_id, medicine_id, quantity]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 6. PATCH /cart_items
app.patch('/cart_items', async (req, res) => {
  try {
    let idVal = null;
    if (req.query.id) {
      const filter = parseFilter(req.query.id);
      if (filter) idVal = filter.val;
    }

    if (!idVal) {
      return res.status(400).json({ error: 'Missing cart item ID filter' });
    }

    const { quantity } = req.body;
    const result = await pool.query(
      'UPDATE cart_items SET quantity = $1 WHERE id = $2 RETURNING *',
      [quantity, idVal]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cart item not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 7. DELETE /cart_items
app.delete('/cart_items', async (req, res) => {
  try {
    let idVal = null;
    if (req.query.id) {
      const filter = parseFilter(req.query.id);
      if (filter) idVal = filter.val;
    }

    if (!idVal) {
      return res.status(400).json({ error: 'Missing cart item ID filter' });
    }

    const result = await pool.query(
      'DELETE FROM cart_items WHERE id = $1 RETURNING *',
      [idVal]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cart item not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// RPC: register_user
app.post('/rpc/register_user', async (req, res) => {
  try {
    const { p_username, p_email, p_password, p_phone, p_role_id } = req.body;
    const result = await pool.query(
      'SELECT * FROM register_user($1, $2, $3, $4, $5)',
      [p_username, p_email, p_password, p_phone, p_role_id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message });
  }
});

// RPC: login_user
app.post('/rpc/login_user', async (req, res) => {
  try {
    const { p_username, p_password } = req.body;
    const result = await pool.query(
      'SELECT * FROM login_user($1, $2)',
      [p_username, p_password]
    );
    
    if (result.rows.length === 0 || !result.rows[0].id) {
      return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không chính xác' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message });
  }
});

// RPC: sync_cart_items
app.post('/rpc/sync_cart_items', async (req, res) => {
  try {
    const { p_user_id, p_items } = req.body;
    await pool.query(
      'SELECT sync_cart_items($1, $2::jsonb)',
      [p_user_id, JSON.stringify(p_items)]
    );
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /orders (Checkout transaction)
app.post('/orders', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { user_id, total_amount, shipping_address, payment_method, items } = req.body;
    
    // 1. Insert order
    const orderRes = await client.query(
      `INSERT INTO orders (user_id, total_amount, status, shipping_address, payment_status)
       VALUES ($1, $2, 'Pending', $3, 'Unpaid')
       RETURNING *`,
      [user_id, total_amount, shipping_address]
    );
    const order = orderRes.rows[0];
    
    // 2. Insert order items
    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, medicine_id, quantity, price)
         VALUES ($1, $2, $3, $4)`,
        [order.id, item.id, item.quantity, item.price]
      );
    }
    
    // 3. Insert payment
    await client.query(
      `INSERT INTO payments (order_id, method, transaction_code, amount, status)
       VALUES ($1, $2, $3, $4, 'Pending')`,
      [order.id, payment_method, 'TXN-' + Date.now(), total_amount]
    );
    
    // 4. Clear cart_items for this user
    const cartRes = await client.query('SELECT id FROM carts WHERE user_id = $1', [user_id]);
    if (cartRes.rows.length > 0) {
      await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cartRes.rows[0].id]);
    }
    
    await client.query('COMMIT');
    res.status(201).json(order);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// GET /user-orders/:userId (Purchase history)
app.get('/user-orders/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const ordersRes = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    const orders = ordersRes.rows;
    for (const order of orders) {
      const itemsRes = await pool.query(
        `SELECT oi.*, m.name as medicine_name, m.image_url 
         FROM order_items oi
         JOIN medicines m ON oi.medicine_id = m.id
         WHERE oi.order_id = $1`,
        [order.id]
      );
      order.items = itemsRes.rows;
    }
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/orders (Admin View - all orders)
app.get('/admin/orders', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, u.username, u.email 
       FROM orders o
       JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC`
    );
    const orders = result.rows;
    for (const order of orders) {
      const itemsRes = await pool.query(
        `SELECT oi.*, m.name as medicine_name, m.image_url 
         FROM order_items oi
         JOIN medicines m ON oi.medicine_id = m.id
         WHERE oi.order_id = $1`,
        [order.id]
      );
      order.items = itemsRes.rows;
    }
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /admin/orders/:id (Admin View - update order status)
app.patch('/admin/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, payment_status } = req.body;
    const result = await pool.query(
      `UPDATE orders SET status = COALESCE($1, status), payment_status = COALESCE($2, payment_status)
       WHERE id = $3 RETURNING *`,
      [status, payment_status, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /medicines (Admin View - add medicine)
app.post('/medicines', async (req, res) => {
  try {
    const { category_id, supplier_id, name, description, price, stock_quantity, image_url, unit, origin, packaging } = req.body;
    const result = await pool.query(
      `INSERT INTO medicines (category_id, supplier_id, name, description, price, stock_quantity, image_url, unit, origin, packaging)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [category_id, supplier_id, name, description, price, stock_quantity, image_url, unit, origin, packaging]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /suppliers (Suppliers directory)
app.get('/suppliers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM suppliers ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /warehouses-info (Warehouses directory with total stock quantity)
app.get('/warehouses-info', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT w.*, COALESCE(SUM(s.quantity), 0) as total_quantity
       FROM warehouses w
       LEFT JOIN inventory_stocks s ON w.id = s.warehouse_id
       GROUP BY w.id
       ORDER BY w.id ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// ==================== AUTHENTICATION & PROFILE APIS ====================

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email: usernameOrEmail, password } = req.body;
    const result = await pool.query(
      `SELECT u.*, r.name as role_name 
       FROM users u 
       LEFT JOIN roles r ON u.role_id = r.id 
       WHERE (u.username = $1 OR u.email = $1) AND u.password_hash = $2 AND u.is_active = TRUE`,
      [usernameOrEmail, password]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác' });
    }

    const user = result.rows[0];
    const roles = [];
    if (user.role_name === 'Admin') roles.push('Admin');
    else if (user.role_name === 'Pharmacy' || user.role_name === 'Doctor' || user.role_name === 'Pharmacist') roles.push('Pharmacy');
    else roles.push('User');

    res.json({
      userId: user.id,
      userName: user.username,
      email: user.email,
      roles: roles,
      accessToken: 'mock-access-token-' + user.id,
      refreshToken: 'mock-refresh-token-' + user.id
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/otp-login
app.post('/api/auth/otp-login', async (req, res) => {
  try {
    const { phone, code } = req.body;
    const result = await pool.query(
      `SELECT u.*, r.name as role_name 
       FROM users u 
       LEFT JOIN roles r ON u.role_id = r.id 
       WHERE u.phone = $1 AND u.is_active = TRUE`,
      [phone]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Số điện thoại chưa được đăng ký hoặc tài khoản bị khóa' });
    }

    const user = result.rows[0];
    const roles = [];
    if (user.role_name === 'Admin') roles.push('Admin');
    else if (user.role_name === 'Pharmacy' || user.role_name === 'Doctor' || user.role_name === 'Pharmacist') roles.push('Pharmacy');
    else roles.push('User');

    res.json({
      userId: user.id,
      userName: user.username,
      email: user.email,
      roles: roles,
      accessToken: 'mock-access-token-' + user.id,
      refreshToken: 'mock-refresh-token-' + user.id
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/send-otp
app.post('/api/auth/send-otp', (req, res) => {
  res.status(200).json({ message: 'OTP sent successfully (Mock: 123456)' });
});

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { userName, email, password, roleName, phone } = req.body;
    
    // Check if user exists
    const checkRes = await pool.query(
      'SELECT 1 FROM users WHERE username = $1 OR email = $2',
      [userName, email]
    );
    if (checkRes.rows.length > 0) {
      return res.status(400).send('Tên tài khoản hoặc email đã tồn tại');
    }

    // Map role
    let role_id = 2; // User
    if (roleName === 'Admin') role_id = 1;
    else if (roleName === 'Pharmacy' || roleName === 'Doctor' || roleName === 'Pharmacist') role_id = 3;

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, phone, role_id, is_active)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING *`,
      [userName, email, password, phone, role_id]
    );
    const newUser = result.rows[0];

    // Automatically create a cart for the user
    await pool.query('INSERT INTO carts (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING', [newUser.id]);

    const roles = [roleName || 'User'];
    res.status(201).json({
      userId: newUser.id,
      userName: newUser.username,
      email: newUser.email,
      roles: roles,
      accessToken: 'mock-access-token-' + newUser.id,
      refreshToken: 'mock-refresh-token-' + newUser.id
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/assign-role
app.post('/api/auth/assign-role', async (req, res) => {
  try {
    const { userId, roleName } = req.body;
    let role_id = 2;
    if (roleName === 'Admin') role_id = 1;
    else if (roleName === 'Pharmacy' || roleName === 'Doctor' || roleName === 'Pharmacist') role_id = 3;

    await pool.query(
      'UPDATE users SET role_id = $1 WHERE id = $2',
      [role_id, userId]
    );
    res.json({ message: 'Cập nhật quyền thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/profile/users
app.get('/api/profile/users', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.*, r.name as role_name 
       FROM users u 
       LEFT JOIN roles r ON u.role_id = r.id 
       ORDER BY u.id ASC`
    );

    res.json(result.rows.map(row => {
      let role = row.role_name;
      if (role === 'Customer') role = 'User';
      if (role === 'Doctor' || role === 'Pharmacist') role = 'Pharmacy';
      return {
        id: row.id,
        username: row.username,
        email: row.email,
        phone: row.phone,
        role: role || 'User',
        isActive: row.is_active,
        createdAt: row.created_at
      };
    }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/profile/users/:userId/status
app.put('/api/profile/users/:userId/status', async (req, res) => {
  try {
    const { userId } = req.params;
    const { is_active } = req.body;
    const result = await pool.query(
      'UPDATE users SET is_active = $1 WHERE id = $2 RETURNING *',
      [is_active, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// ==================== PATIENT CRUD APIS ====================

// GET /patients
app.get('/patients', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM patients ORDER BY id DESC');
    res.json(result.rows.map(r => ({
      id: r.id,
      name: r.name,
      gender: r.gender,
      dateOfBirth: r.date_of_birth,
      phone: r.phone,
      address: r.address,
      medicalHistory: r.medical_history,
      createdAt: r.created_at
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /patients
app.post('/patients', async (req, res) => {
  try {
    const { name, gender, dateOfBirth, phone, address, medicalHistory } = req.body;
    const result = await pool.query(
      `INSERT INTO patients (name, gender, date_of_birth, phone, address, medical_history)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, gender, dateOfBirth, phone, address, medicalHistory]
    );
    const r = result.rows[0];
    res.status(201).json({
      id: r.id,
      name: r.name,
      gender: r.gender,
      dateOfBirth: r.date_of_birth,
      phone: r.phone,
      address: r.address,
      medicalHistory: r.medical_history,
      createdAt: r.created_at
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /patients/:id
app.put('/patients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, gender, dateOfBirth, phone, address, medicalHistory } = req.body;
    const result = await pool.query(
      `UPDATE patients 
       SET name = $1, gender = $2, date_of_birth = $3, phone = $4, address = $5, medical_history = $6
       WHERE id = $7
       RETURNING *`,
      [name, gender, dateOfBirth, phone, address, medicalHistory, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    const r = result.rows[0];
    res.json({
      id: r.id,
      name: r.name,
      gender: r.gender,
      dateOfBirth: r.date_of_birth,
      phone: r.phone,
      address: r.address,
      medicalHistory: r.medical_history,
      createdAt: r.created_at
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /patients/:id
app.delete('/patients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM patients WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// ==================== APPOINTMENT CRUD APIS ====================

// GET /appointments
app.get('/appointments', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        a.id,
        a.patient_id AS "patientId",
        a.doctor_id AS "doctorId",
        a.appointment_date AS "appointmentDate",
        a.reason,
        a.status,
        a.notes,
        p.name AS "patientName",
        p.phone AS "patientPhone",
        u.username AS "doctorName"
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN users u ON a.doctor_id = u.id
      ORDER BY a.appointment_date DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /appointments
app.post('/appointments', async (req, res) => {
  try {
    const { patientId, doctorId, appointmentDate, reason, status, notes } = req.body;
    const insertRes = await pool.query(
      `INSERT INTO appointments (patient_id, doctor_id, appointment_date, reason, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [patientId, doctorId, appointmentDate, reason, status, notes]
    );
    
    const newId = insertRes.rows[0].id;
    const result = await pool.query(
      `SELECT 
        a.id,
        a.patient_id AS "patientId",
        a.doctor_id AS "doctorId",
        a.appointment_date AS "appointmentDate",
        a.reason,
        a.status,
        a.notes,
        p.name AS "patientName",
        p.phone AS "patientPhone",
        u.username AS "doctorName"
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN users u ON a.doctor_id = u.id
      WHERE a.id = $1`,
      [newId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /appointments/:id
app.put('/appointments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { patientId, doctorId, appointmentDate, reason, status, notes } = req.body;
    const updateRes = await pool.query(
      `UPDATE appointments
       SET patient_id = $1, doctor_id = $2, appointment_date = $3, reason = $4, status = $5, notes = $6
       WHERE id = $7
       RETURNING id`,
      [patientId, doctorId, appointmentDate, reason, status, notes, id]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const result = await pool.query(
      `SELECT 
        a.id,
        a.patient_id AS "patientId",
        a.doctor_id AS "doctorId",
        a.appointment_date AS "appointmentDate",
        a.reason,
        a.status,
        a.notes,
        p.name AS "patientName",
        p.phone AS "patientPhone",
        u.username AS "doctorName"
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN users u ON a.doctor_id = u.id
      WHERE a.id = $1`,
      [id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /appointments/:id
app.delete('/appointments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM appointments WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// ==================== PRESCRIPTION APIS ====================

// GET /api/prescription
app.get('/api/prescription', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        p.id,
        p.patient_id AS "patientId",
        p.user_id AS "userId",
        p.doctor_name AS "doctorName",
        p.hospital,
        p.prescription_date AS "prescriptionDate",
        p.image_url AS "imageUrl",
        p.status,
        pat.name AS "patientName"
      FROM prescriptions p
      LEFT JOIN patients pat ON p.patient_id = pat.id
      ORDER BY p.id DESC`
    );

    const prescriptions = result.rows;
    for (const p of prescriptions) {
      const itemsRes = await pool.query(
        `SELECT 
          pi.id,
          pi.prescription_id AS "prescriptionId",
          pi.medicine_id AS "medicineId",
          pi.quantity,
          m.name AS "medicineName"
        FROM prescription_items pi
        JOIN medicines m ON pi.medicine_id = m.id
        WHERE pi.prescription_id = $1`,
        [p.id]
      );
      p.items = itemsRes.rows;
    }
    res.json(prescriptions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/prescription
app.post('/api/prescription', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { patientId, doctorName, hospital, items } = req.body;

    const presRes = await client.query(
      `INSERT INTO prescriptions (patient_id, doctor_name, hospital, prescription_date, status)
       VALUES ($1, $2, $3, NOW(), 'Active')
       RETURNING *`,
      [patientId, doctorName, hospital]
    );
    const newPres = presRes.rows[0];

    for (const item of items) {
      await client.query(
        `INSERT INTO prescription_items (prescription_id, medicine_id, quantity)
         VALUES ($1, $2, $3)`,
        [newPres.id, item.medicineId, item.quantity]
      );
    }

    await client.query('COMMIT');

    // Retrieve full data for response
    const fullRes = await pool.query(
      `SELECT 
        p.id,
        p.patient_id AS "patientId",
        p.user_id AS "userId",
        p.doctor_name AS "doctorName",
        p.hospital,
        p.prescription_date AS "prescriptionDate",
        p.image_url AS "imageUrl",
        p.status,
        pat.name AS "patientName"
      FROM prescriptions p
      LEFT JOIN patients pat ON p.patient_id = pat.id
      WHERE p.id = $1`,
      [newPres.id]
    );

    const prescription = fullRes.rows[0];
    const itemsRes = await pool.query(
      `SELECT 
        pi.id,
        pi.prescription_id AS "prescriptionId",
        pi.medicine_id AS "medicineId",
        pi.quantity,
        m.name AS "medicineName"
      FROM prescription_items pi
      JOIN medicines m ON pi.medicine_id = m.id
      WHERE pi.prescription_id = $1`,
      [prescription.id]
    );
    prescription.items = itemsRes.rows;

    res.status(201).json(prescription);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/prescription/:id/status
app.put('/api/prescription/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const result = await pool.query(
      'UPDATE prescriptions SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prescription not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// ==================== PRODUCT REVIEWS APIS ====================

// GET /api/reviews/medicine/:productId
app.get('/api/reviews/medicine/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const result = await pool.query(
      `SELECT 
        r.id,
        r.user_id AS "userId",
        r.medicine_id AS "medicineId",
        r.rating,
        r.comment,
        r.created_at AS "createdAt",
        u.username AS "userName"
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.medicine_id = $1
      ORDER BY r.created_at DESC`,
      [productId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reviews/check-eligibility
app.get('/api/reviews/check-eligibility', async (req, res) => {
  try {
    const { medicineId, userId } = req.query;
    if (!medicineId || !userId) {
      return res.status(400).json({ error: 'Missing medicineId or userId' });
    }

    // Check if the user has a completed order with this medicine
    const result = await pool.query(
      `SELECT EXISTS(
        SELECT 1 FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE o.user_id = $1 AND oi.medicine_id = $2
      ) AS eligible`,
      [userId, medicineId]
    );
    res.json({ eligible: result.rows[0].eligible });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reviews
app.post('/api/reviews', async (req, res) => {
  try {
    const { userId, medicineId, rating, comment } = req.body;
    const insertRes = await pool.query(
      `INSERT INTO reviews (user_id, medicine_id, rating, comment, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id`,
      [userId, medicineId, rating, comment]
    );
    
    const newId = insertRes.rows[0].id;
    const result = await pool.query(
      `SELECT 
        r.id,
        r.user_id AS "userId",
        r.medicine_id AS "medicineId",
        r.rating,
        r.comment,
        r.created_at AS "createdAt",
        u.username AS "userName"
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.id = $1`,
      [newId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// PATCH /medicines
app.patch('/medicines', async (req, res) => {
  try {
    let idVal = null;
    if (req.query.id) {
      const filter = parseFilter(req.query.id);
      if (filter) idVal = filter.val;
    }

    if (!idVal) {
      return res.status(400).json({ error: 'Missing medicine ID filter' });
    }

    const { category_id, supplier_id, name, description, price, stock_quantity, image_url, unit, origin, packaging, requires_prescription } = req.body;
    
    const result = await pool.query(
      `UPDATE medicines 
       SET category_id = COALESCE($1, category_id), 
           supplier_id = COALESCE($2, supplier_id), 
           name = COALESCE($3, name), 
           description = COALESCE($4, description), 
           price = COALESCE($5, price), 
           stock_quantity = COALESCE($6, stock_quantity), 
           image_url = COALESCE($7, image_url), 
           unit = COALESCE($8, unit), 
           origin = COALESCE($9, origin), 
           packaging = COALESCE($10, packaging), 
           requires_prescription = COALESCE($11, requires_prescription)
       WHERE id = $12 RETURNING *`,
      [category_id, supplier_id, name, description, price, stock_quantity, image_url, unit, origin, packaging, requires_prescription, idVal]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Medicine not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /medicines
app.delete('/medicines', async (req, res) => {
  try {
    let idVal = null;
    if (req.query.id) {
      const filter = parseFilter(req.query.id);
      if (filter) idVal = filter.val;
    }

    if (!idVal) {
      return res.status(400).json({ error: 'Missing medicine ID filter' });
    }

    const result = await pool.query(
      'DELETE FROM medicines WHERE id = $1 RETURNING *',
      [idVal]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Medicine not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// ==================== VOUCHER APIS ====================

// GET /vouchers — Public list of active vouchers
app.get('/vouchers', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM vouchers WHERE is_active = TRUE AND (end_date IS NULL OR end_date > NOW()) ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/vouchers — All vouchers for admin
app.get('/admin/vouchers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM vouchers ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/vouchers — Create voucher
app.post('/admin/vouchers', async (req, res) => {
  try {
    const { code, name, discount_type, discount_value, min_order_value, max_discount, start_date, end_date, usage_limit, is_active } = req.body;
    const result = await pool.query(
      `INSERT INTO vouchers (code, name, discount_type, discount_value, min_order_value, max_discount, start_date, end_date, usage_limit, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [code, name, discount_type || 'percent', discount_value, min_order_value || 0, max_discount, start_date || new Date(), end_date, usage_limit || 100, is_active !== false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /admin/vouchers/:id — Update voucher
app.patch('/admin/vouchers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, discount_type, discount_value, min_order_value, max_discount, start_date, end_date, usage_limit, is_active } = req.body;
    const result = await pool.query(
      `UPDATE vouchers SET
        code = COALESCE($1, code),
        name = COALESCE($2, name),
        discount_type = COALESCE($3, discount_type),
        discount_value = COALESCE($4, discount_value),
        min_order_value = COALESCE($5, min_order_value),
        max_discount = COALESCE($6, max_discount),
        start_date = COALESCE($7, start_date),
        end_date = $8,
        usage_limit = COALESCE($9, usage_limit),
        is_active = COALESCE($10, is_active)
       WHERE id = $11 RETURNING *`,
      [code, name, discount_type, discount_value, min_order_value, max_discount, start_date, end_date, usage_limit, is_active, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Voucher not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /admin/vouchers/:id
app.delete('/admin/vouchers/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM vouchers WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Voucher not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /vouchers/validate — Validate a voucher code
app.post('/vouchers/validate', async (req, res) => {
  try {
    const { code, order_total } = req.body;
    const result = await pool.query(
      `SELECT * FROM vouchers WHERE code = $1 AND is_active = TRUE AND (end_date IS NULL OR end_date > NOW()) AND used_count < usage_limit`,
      [code]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mã voucher không hợp lệ hoặc đã hết hạn' });
    }
    const v = result.rows[0];
    if (parseFloat(order_total) < parseFloat(v.min_order_value)) {
      return res.status(400).json({ error: `Đơn hàng tối thiểu ${new Intl.NumberFormat('vi-VN').format(v.min_order_value)}đ để dùng voucher này` });
    }
    let discount = 0;
    if (v.discount_type === 'percent') {
      discount = parseFloat(order_total) * parseFloat(v.discount_value) / 100;
      if (v.max_discount) discount = Math.min(discount, parseFloat(v.max_discount));
    } else {
      discount = parseFloat(v.discount_value);
    }
    res.json({ valid: true, voucher: v, discount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== USER PROFILE APIS ====================

// GET /api/profile/me — Get current user profile
app.get('/api/profile/me', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const result = await pool.query(
      `SELECT u.id, u.username, u.email, u.phone, u.is_active, u.created_at, r.name as role_name,
              u.full_name, u.address, u.avatar_url, u.date_of_birth, u.gender
       FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = $1`,
      [userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    // Try without extra columns (graceful fallback)
    try {
      const userId = req.headers['x-user-id'];
      const result = await pool.query(
        `SELECT u.id, u.username, u.email, u.phone, u.is_active, u.created_at, r.name as role_name
         FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = $1`,
        [userId]
      );
      res.json(result.rows[0] || {});
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
});

// PATCH /api/profile/me — Update user profile
app.patch('/api/profile/me', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { full_name, phone, address, avatar_url, date_of_birth, gender } = req.body;

    // Add columns if missing (safe migration)
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(200)`).catch(() => {});
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT`).catch(() => {});
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT`).catch(() => {});
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE`).catch(() => {});
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(20)`).catch(() => {});

    const result = await pool.query(
      `UPDATE users SET
        full_name = COALESCE($1, full_name),
        phone = COALESCE($2, phone),
        address = COALESCE($3, address),
        avatar_url = COALESCE($4, avatar_url),
        date_of_birth = COALESCE($5, date_of_birth),
        gender = COALESCE($6, gender)
       WHERE id = $7 RETURNING id, username, email, phone, full_name, address, avatar_url, date_of_birth, gender, created_at`,
      [full_name, phone, address, avatar_url, date_of_birth || null, gender, userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Mock PostgREST server running at http://localhost:${port}`);
});


