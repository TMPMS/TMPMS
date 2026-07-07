const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Connect to PostgreSQL (using trust auth locally, no password needed)
const pool = new Pool({
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

app.listen(port, () => {
  console.log(`Mock PostgREST server running at http://localhost:${port}`);
});


