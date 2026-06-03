const express = require('express');
const multer = require('multer');
const path = require('path');
const { getDb, all, get, run } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'assets', 'images'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) return cb(null, true);
    cb(new Error('Only image files (jpg, png, gif, webp) are allowed'));
  },
});

router.get('/', async (req, res) => {
  try {
    await getDb();
    const products = all('SELECT * FROM products ORDER BY created_at DESC');
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load products' });
  }
});

router.get('/available', async (req, res) => {
  try {
    await getDb();
    const products = all('SELECT * FROM products WHERE available = 1 ORDER BY created_at DESC');
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load products' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    await getDb();
    const product = get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load product' });
  }
});

router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    await getDb();
    const { name, description, price, available } = req.body;
    if (!name || !description || !price) {
      return res.status(400).json({ error: 'Name, description, and price are required' });
    }
    const image = req.file ? req.file.filename : (req.body.image || '');
    const priceInt = Math.round(parseFloat(price) * 100);
    if (isNaN(priceInt) || priceInt <= 0) {
      return res.status(400).json({ error: 'Invalid price' });
    }
    const avail = available !== undefined ? (available === 'false' || available === false ? 0 : 1) : 1;
    const result = run(
      'INSERT INTO products (name, description, price, image, available) VALUES (?, ?, ?, ?, ?)',
      [name, description, priceInt, image, avail]
    );
    const product = get('SELECT * FROM products WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(product);
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

router.put('/:id', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    await getDb();
    const existing = get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    const { name, description, price, available } = req.body;
    const image = req.file ? req.file.filename : (req.body.image !== undefined ? req.body.image : existing.image);
    const priceInt = price !== undefined ? Math.round(parseFloat(price) * 100) : existing.price;
    if (price !== undefined && (isNaN(priceInt) || priceInt <= 0)) {
      return res.status(400).json({ error: 'Invalid price' });
    }
    const avail = available !== undefined ? (available === 'false' || available === false ? 0 : 1) : existing.available;

    run(`
      UPDATE products SET name=?, description=?, price=?, image=?, available=?, updated_at=datetime('now')
      WHERE id=?
    `, [
      name || existing.name,
      description || existing.description,
      priceInt,
      image,
      avail,
      req.params.id
    ]);
    const product = get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    res.json(product);
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await getDb();
    const existing = get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Product not found' });
    run('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;
