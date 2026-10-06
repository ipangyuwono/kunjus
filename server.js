require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Static files — dotfiles: 'deny' biar .env / .git tidak bisa diakses via HTTP
app.use(express.static(__dirname, { dotfiles: 'deny' }));

// API routes — same handlers dipakai Vercel dari folder /api
app.post('/api/forgot-password', (req, res) => require('./api/forgot-password')(req, res));
app.post('/api/reset-password', (req, res) => require('./api/reset-password')(req, res));

// Biar jelas kalau ada yang GET /api/... manual (bukan dari form)
app.get('/api/:name', (req, res) => {
  return res.status(405).json({ error: `Gunakan POST ke /api/${req.params.name}, bukan GET.` });
});

app.listen(PORT, () => {
  console.log(`Jalan di http://localhost:${PORT}`);
  console.log(`Buka forgot: http://localhost:${PORT}/forgot-password.html`);
});
