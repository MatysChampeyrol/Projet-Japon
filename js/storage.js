/* ============================================
   storage.js — Hybrid API / LocalStorage
   Utilise l'API si disponible, sinon localStorage
   ============================================ */

const Storage = {
  _pois: [],
  _useAPI: false,
  _apiBase: '/api',

  async init() {
    try {
      const res = await fetch(`${this._apiBase}/pois`);
      if (res.ok) {
        this._pois = await res.json();
        this._useAPI = true;
        console.log('📡 Mode API activé');
        return;
      }
    } catch (e) {}

    this._useAPI = false;
    try {
      const data = localStorage.getItem('japan_quest_pois');
      this._pois = data ? JSON.parse(data) : [];
    } catch (e) { this._pois = []; }
    console.log('💾 Mode LocalStorage');
  },

  getPOIs() { return [...this._pois]; },

  getPOI(id) { return this._pois.find(p => p.id === id) || null; },

  async addPOI(poi) {
    if (this._useAPI) {
      const res = await fetch(`${this._apiBase}/pois`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(poi)
      });
      const saved = await res.json();
      this._pois.push(saved);
      return saved;
    } else {
      poi.id = 'poi_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
      poi.created_at = new Date().toISOString();
      this._pois.push(poi);
      this._saveLocal();
      return poi;
    }
  },

  async updatePOI(id, updates) {
    if (this._useAPI) {
      const res = await fetch(`${this._apiBase}/pois/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const updated = await res.json();
      const idx = this._pois.findIndex(p => p.id === id);
      if (idx !== -1) this._pois[idx] = updated;
      return updated;
    } else {
      const idx = this._pois.findIndex(p => p.id === id);
      if (idx === -1) return null;
      this._pois[idx] = { ...this._pois[idx], ...updates, updated_at: new Date().toISOString() };
      this._saveLocal();
      return this._pois[idx];
    }
  },

  async deletePOI(id) {
    if (this._useAPI) {
      await fetch(`${this._apiBase}/pois/${id}`, { method: 'DELETE' });
    }
    this._pois = this._pois.filter(p => p.id !== id);
    if (!this._useAPI) this._saveLocal();
  },

  _saveLocal() {
    localStorage.setItem('japan_quest_pois', JSON.stringify(this._pois));
  },

  getStats() {
    return {
      total: this._pois.length,
      toVisit: this._pois.filter(p => p.status === 'to-visit').length,
      visited: this._pois.filter(p => p.status === 'visited').length
    };
  },

  getSettings() {
    try {
      const d = localStorage.getItem('japan_quest_settings');
      return d ? JSON.parse(d) : { sidebarOpen: true };
    } catch (e) { return { sidebarOpen: true }; }
  },

  saveSettings(s) { localStorage.setItem('japan_quest_settings', JSON.stringify(s)); },

  exportData() {
    const blob = new Blob([JSON.stringify({ pois: this._pois, exportedAt: new Date().toISOString(), version: '1.0' }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `japan-quest-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  },

  async importData(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      if (!data.pois || !Array.isArray(data.pois)) return { success: false, error: 'Format invalide' };
      if (this._useAPI) {
        for (const poi of data.pois) {
          await fetch(`${this._apiBase}/pois`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(poi)
          });
        }
        const res = await fetch(`${this._apiBase}/pois`);
        this._pois = await res.json();
      } else {
        this._pois = data.pois;
        this._saveLocal();
      }
      return { success: true, count: data.pois.length };
    } catch (e) { return { success: false, error: 'JSON invalide' }; }
  }
};
