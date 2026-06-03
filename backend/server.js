require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { getDb } = require('./db');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const paymentRoutes = require('./routes/payments');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '..')));

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/payments', paymentRoutes);

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }
  if (err.message && err.message.includes('image files')) {
    return res.status(400).json({ error: err.message });
  }
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  if (path.extname(req.path)) {
    return res.status(404).send('Not found');
  }
  next();
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

getDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Art Gallery server running at http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
