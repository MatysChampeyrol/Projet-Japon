const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data', 'pois.json');

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// === Database helpers (JSON file) ===
function readDB() {
  try {
    if (!fs.existsSync(DB_PATH)) return [];
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch (e) {
    console.error('DB read error:', e);
    return [];
  }
}

function writeDB(pois) {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(pois, null, 2), 'utf-8');
}

function generateId() {
  return 'poi_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
}

// === API Routes ===

// GET all POIs
app.get('/api/pois', (req, res) => {
  res.json(readDB());
});

// GET single POI
app.get('/api/pois/:id', (req, res) => {
  const poi = readDB().find(p => p.id === req.params.id);
  if (!poi) return res.status(404).json({ error: 'POI not found' });
  res.json(poi);
});

// POST create POI
app.post('/api/pois', (req, res) => {
  const { name, lat, lng, category, status, notes, photo } = req.body;
  if (!name || lat == null || lng == null) {
    return res.status(400).json({ error: 'name, lat, lng required' });
  }
  const pois = readDB();
  const poi = {
    id: generateId(),
    name,
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    category: category || 'other',
    status: status || 'to-visit',
    notes: notes || '',
    photo: photo || '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  pois.push(poi);
  writeDB(pois);
  res.status(201).json(poi);
});

// PUT update POI
app.put('/api/pois/:id', (req, res) => {
  const pois = readDB();
  const idx = pois.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'POI not found' });
  pois[idx] = { ...pois[idx], ...req.body, id: req.params.id, updated_at: new Date().toISOString() };
  writeDB(pois);
  res.json(pois[idx]);
});

// DELETE POI
app.delete('/api/pois/:id', (req, res) => {
  let pois = readDB();
  const len = pois.length;
  pois = pois.filter(p => p.id !== req.params.id);
  if (pois.length === len) return res.status(404).json({ error: 'POI not found' });
  writeDB(pois);
  res.json({ success: true });
});

// GET stats
app.get('/api/stats', (req, res) => {
  const pois = readDB();
  res.json({
    total: pois.length,
    toVisit: pois.filter(p => p.status === 'to-visit').length,
    visited: pois.filter(p => p.status === 'visited').length
  });
});

// Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🎌 Japan Quest server running on http://localhost:${PORT}\n`);
});
