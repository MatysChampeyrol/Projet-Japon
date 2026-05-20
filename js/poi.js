/* ============================================
   poi.js — Gestion des Points d'Intérêt
   CRUD async, sidebar, filtres, photos
   ============================================ */

const POIManager = {
  pois: [],
  currentFilter: 'all',
  searchQuery: '',
  editingId: null,

  CATEGORY_LABELS: {
    temple: 'Temple / Sanctuaire',
    restaurant: 'Restaurant',
    nature: 'Nature',
    shopping: 'Shopping',
    culture: 'Culture',
    hotel: 'Hébergement',
    other: 'Autre'
  },

  init() {
    this.pois = Storage.getPOIs();
    this.renderSidebar();
    this.renderStats();
    this.bindEvents();
    this.pois.forEach(poi => MapManager.addMarker(poi));
    console.log(`📍 ${this.pois.length} POIs chargés`);
  },

  bindEvents() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.currentFilter = e.target.dataset.filter;
        this.renderSidebar();
      });
    });

    document.getElementById('poi-filter')?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase();
      this.renderSidebar();
    });

    document.getElementById('poi-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleFormSubmit();
    });

    document.getElementById('modal-cancel')?.addEventListener('click', () => this.hideModal());
    document.getElementById('modal-close-x')?.addEventListener('click', () => this.hideModal());
    document.getElementById('poi-modal-overlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'poi-modal-overlay') this.hideModal();
    });

    document.getElementById('add-poi-btn')?.addEventListener('click', () => {
      const c = MapManager.map.getCenter();
      this.showAddModal(c.lat, c.lng);
    });

    document.getElementById('fetch-photo-btn')?.addEventListener('click', () => {
      const name = document.getElementById('poi-name').value.trim();
      if (name) SearchManager.fetchAndSetPhoto(name);
    });

    this.bindDetailPanel();
  },

  // === CRUD (async) ===

  async addPOI(data) {
    const poi = await Storage.addPOI({
      name: data.name, lat: data.lat, lng: data.lng,
      category: data.category || 'other',
      status: data.status || 'to-visit',
      notes: data.notes || '',
      photo: data.photo || ''
    });
    this.pois.push(poi);
    MapManager.addMarker(poi);
    this.renderSidebar();
    this.renderStats();
    this.showNotification(`✦ ${poi.name} ajouté !`, 'success');
    return poi;
  },

  async updatePOI(id, updates) {
    const updated = await Storage.updatePOI(id, updates);
    if (updated) {
      const i = this.pois.findIndex(p => p.id === id);
      if (i !== -1) this.pois[i] = updated;
      MapManager.updateMarker(updated);
      this.renderSidebar();
      this.renderStats();
    }
    return updated;
  },

  async deletePOI(id) {
    const poi = this.pois.find(p => p.id === id);
    await Storage.deletePOI(id);
    this.pois = this.pois.filter(p => p.id !== id);
    MapManager.removeMarker(id);
    RouterManager.removeWaypoint(id);
    this.renderSidebar();
    this.renderStats();
    if (poi) this.showNotification(`✕ ${poi.name} supprimé`, 'warning');
  },

  async toggleStatus(id) {
    const poi = this.pois.find(p => p.id === id);
    if (!poi) return;
    const ns = poi.status === 'visited' ? 'to-visit' : 'visited';
    await this.updatePOI(id, { status: ns });
    this.showNotification(ns === 'visited' ? `✅ ${poi.name} visité !` : `⭐ ${poi.name} à visiter`, 'info');
  },

  // === Sidebar ===

  getFilteredPOIs() {
    let f = [...this.pois];
    if (this.currentFilter === 'to-visit') f = f.filter(p => p.status === 'to-visit');
    else if (this.currentFilter === 'visited') f = f.filter(p => p.status === 'visited');
    if (this.searchQuery) f = f.filter(p => p.name.toLowerCase().includes(this.searchQuery) || (p.notes && p.notes.toLowerCase().includes(this.searchQuery)));
    return f;
  },

  renderSidebar() {
    const list = document.getElementById('poi-list');
    if (!list) return;
    const filtered = this.getFilteredPOIs();

    if (filtered.length === 0) {
      list.innerHTML = `<div class="empty-state"><div class="empty-icon">🏯</div><p>Aucun lieu trouvé</p><p class="empty-hint">Cherchez un lieu ou<br>clic droit sur la carte</p></div>`;
      return;
    }

    list.innerHTML = filtered.map(poi => this.renderPOICard(poi)).join('');

    list.querySelectorAll('.poi-card').forEach(card => {
      const id = card.dataset.id;
      card.querySelector('.poi-card-main')?.addEventListener('click', () => {
        const p = this.pois.find(x => x.id === id);
        if (p) { MapManager.centerOn(p.lat, p.lng); this.showDetailPanel(id); }
      });
      card.querySelector('.poi-toggle-status')?.addEventListener('click', (e) => { e.stopPropagation(); this.toggleStatus(id); });
      card.querySelector('.poi-delete')?.addEventListener('click', (e) => { e.stopPropagation(); if (confirm('Supprimer ce lieu ?')) this.deletePOI(id); });
      card.querySelector('.poi-edit')?.addEventListener('click', (e) => { e.stopPropagation(); this.showEditModal(id); });
      card.querySelector('.poi-route-checkbox')?.addEventListener('change', (e) => { e.stopPropagation(); RouterManager.toggleWaypoint(id); });
    });
  },

  renderPOICard(poi) {
    const color = MapManager.CATEGORY_COLORS[poi.category] || MapManager.CATEGORY_COLORS.other;
    const emoji = MapManager.CATEGORY_EMOJIS[poi.category] || MapManager.CATEGORY_EMOJIS.other;
    const catLabel = this.CATEGORY_LABELS[poi.category] || poi.category;
    const vis = poi.status === 'visited';
    const inRoute = RouterManager.waypoints.includes(poi.id);

    return `
      <div class="poi-card ${vis ? 'visited' : 'to-visit'}" data-id="${poi.id}" style="--card-accent: ${color}">
        <div class="poi-card-route">
          <label class="pixel-checkbox" title="Ajouter au parcours">
            <input type="checkbox" class="poi-route-checkbox" ${inRoute ? 'checked' : ''}>
            <span class="checkbox-visual">🗺️</span>
          </label>
        </div>
        ${poi.photo ? `<div class="poi-photo-thumb"><img src="${poi.photo}" alt="" loading="lazy"></div>` : ''}
        <div class="poi-card-main">
          <div class="poi-card-header">
            <span class="poi-emoji">${emoji}</span>
            <div class="poi-card-info">
              <h3 class="poi-name">${poi.name}</h3>
              <span class="poi-category-label" style="color: ${color}">${catLabel}</span>
            </div>
            <span class="poi-status-badge ${poi.status}">${vis ? '✅' : '⭐'}</span>
          </div>
          ${poi.notes ? `<p class="poi-notes">${poi.notes}</p>` : ''}
        </div>
        <div class="poi-card-actions">
          <button class="poi-action-btn poi-toggle-status" title="${vis ? 'À visiter' : 'Visité'}">${vis ? '⭐' : '✅'}</button>
          <button class="poi-action-btn poi-edit" title="Modifier">✎</button>
          <button class="poi-action-btn poi-delete" title="Supprimer">✕</button>
        </div>
      </div>`;
  },

  renderStats() {
    const s = Storage.getStats();
    const te = document.getElementById('stat-total');
    const tv = document.getElementById('stat-to-visit');
    const ve = document.getElementById('stat-visited');
    if (te) te.textContent = s.total;
    if (tv) tv.textContent = s.toVisit;
    if (ve) ve.textContent = s.visited;
    const pb = document.getElementById('progress-bar');
    if (pb) {
      const pct = s.total > 0 ? Math.round((s.visited / s.total) * 100) : 0;
      pb.style.width = pct + '%';
      document.getElementById('progress-text').textContent = pct + '%';
    }
  },

  highlightInSidebar(id) {
    document.querySelectorAll('.poi-card.highlighted').forEach(el => el.classList.remove('highlighted'));
    const c = document.querySelector(`.poi-card[data-id="${id}"]`);
    if (c) { c.classList.add('highlighted'); c.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); setTimeout(() => c.classList.remove('highlighted'), 2000); }
  },

  // === Modals ===

  showAddModal(lat, lng, name = '', category = 'other') {
    this.editingId = null;
    const modal = document.getElementById('poi-modal-overlay');
    if (!modal) return;
    document.getElementById('modal-title').textContent = '✦ Nouveau lieu';
    document.getElementById('poi-form').reset();
    document.getElementById('poi-lat').value = lat;
    document.getElementById('poi-lng').value = lng;
    if (name) document.getElementById('poi-name').value = name;
    document.getElementById('poi-category').value = category;
    // Reset photo
    document.getElementById('poi-photo').value = '';
    const img = document.getElementById('photo-preview-img');
    if (img) img.src = '';
    const box = document.getElementById('photo-preview');
    if (box) box.className = 'modal-photo-area';
    // Fermer les panneaux centraux
    document.querySelectorAll('.center-overlay.active').forEach(o => o.classList.remove('active'));
    document.querySelectorAll('.menu-btn.active').forEach(b => b.classList.remove('active'));
    modal.classList.add('active');
    document.getElementById('poi-name').focus();
  },

  showEditModal(id) {
    const poi = this.pois.find(p => p.id === id);
    if (!poi) return;
    this.editingId = id;
    const modal = document.getElementById('poi-modal-overlay');
    if (!modal) return;
    document.getElementById('modal-title').textContent = '✎ Modifier le lieu';
    document.getElementById('poi-name').value = poi.name;
    document.getElementById('poi-lat').value = poi.lat;
    document.getElementById('poi-lng').value = poi.lng;
    document.getElementById('poi-category').value = poi.category;
    document.getElementById('poi-notes').value = poi.notes || '';
    document.querySelector(`input[name="poi-status"][value="${poi.status}"]`).checked = true;
    document.getElementById('poi-photo').value = poi.photo || '';
    const img = document.getElementById('photo-preview-img');
    const box = document.getElementById('photo-preview');
    if (poi.photo && img && box) {
      img.src = poi.photo;
      box.className = 'modal-photo-area has-photo';
    } else if (box) {
      box.className = 'modal-photo-area';
    }
    modal.classList.add('active');
  },

  hideModal() {
    document.getElementById('poi-modal-overlay')?.classList.remove('active');
    this.editingId = null;
  },

  async handleFormSubmit() {
    const name = document.getElementById('poi-name').value.trim();
    if (!name) { this.showNotification('⚠ Nom obligatoire', 'warning'); return; }
    const data = {
      name,
      lat: parseFloat(document.getElementById('poi-lat').value),
      lng: parseFloat(document.getElementById('poi-lng').value),
      category: document.getElementById('poi-category').value,
      notes: document.getElementById('poi-notes').value.trim(),
      status: document.querySelector('input[name="poi-status"]:checked')?.value || 'to-visit',
      photo: document.getElementById('poi-photo').value || ''
    };

    let savedId = null;

    if (this.editingId) {
      const updated = await this.updatePOI(this.editingId, data);
      this.showNotification(`✎ ${name} modifié !`, 'info');
      savedId = this.editingId;
    } else {
      const created = await this.addPOI(data);
      savedId = created?.id;
    }

    this.hideModal();

    // Ouvrir le panneau de détail pour montrer le lieu sauvegardé
    if (savedId) {
      setTimeout(() => this.showDetailPanel(savedId), 150);
    }
  },


  // === Detail Panel ===

  bindDetailPanel() {
    document.getElementById('detail-close')?.addEventListener('click', () => this.hideDetailPanel());
    document.getElementById('detail-overlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'detail-overlay') this.hideDetailPanel();
    });
    document.getElementById('detail-edit-btn')?.addEventListener('click', () => {
      if (this._detailId) { this.hideDetailPanel(); this.showEditModal(this._detailId); }
    });
    document.getElementById('detail-delete-btn')?.addEventListener('click', async () => {
      if (this._detailId && confirm('Supprimer ce lieu ?')) {
        await this.deletePOI(this._detailId);
        this.hideDetailPanel();
      }
    });
    document.getElementById('detail-toggle-btn')?.addEventListener('click', async () => {
      if (this._detailId) {
        await this.toggleStatus(this._detailId);
        this.showDetailPanel(this._detailId);
      }
    });
    this.bindLightbox();
  },

  bindLightbox() {
    const overlay = document.getElementById('lightbox-overlay');
    document.getElementById('lightbox-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      overlay?.classList.remove('active');
    });
    overlay?.addEventListener('click', () => overlay.classList.remove('active'));
  },

  openLightbox(src) {
    const img = document.getElementById('lightbox-img');
    const overlay = document.getElementById('lightbox-overlay');
    if (!img || !overlay) return;
    img.src = src;
    overlay.classList.add('active');
  },

  showDetailPanel(id) {
    const poi = this.pois.find(p => p.id === id);
    if (!poi) return;
    this._detailId = id;

    // Fermer les panneaux centraux s'ils sont ouverts
    document.querySelectorAll('.center-overlay.active').forEach(o => o.classList.remove('active'));
    document.querySelectorAll('.menu-btn.active').forEach(b => b.classList.remove('active'));
    const color = MapManager.CATEGORY_COLORS[poi.category] || MapManager.CATEGORY_COLORS.other;
    const emoji = MapManager.CATEGORY_EMOJIS[poi.category] || MapManager.CATEGORY_EMOJIS.other;
    const catLabel = this.CATEGORY_LABELS[poi.category] || poi.category;
    const isVisited = poi.status === 'visited';

    // Remplir les infos gauche
    document.getElementById('detail-emoji').textContent = emoji;
    document.getElementById('detail-name').textContent = poi.name;
    const catEl = document.getElementById('detail-category-label');
    catEl.textContent = catLabel;
    catEl.style.color = color;
    document.getElementById('detail-status-badge').textContent = isVisited ? '✅' : '⭐';

    // Notes
    const notesEl = document.getElementById('detail-notes-text');
    const notesSection = document.getElementById('detail-notes-section');
    if (poi.notes) {
      notesEl.textContent = poi.notes;
      notesSection.style.display = 'block';
    } else {
      notesEl.textContent = 'Aucune note';
      notesSection.style.display = 'block';
    }

    // Coordonnées
    document.getElementById('detail-coords').textContent =
      `${parseFloat(poi.lat).toFixed(5)}, ${parseFloat(poi.lng).toFixed(5)}`;

    // Date
    const dateStr = poi.created_at
      ? new Date(poi.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
      : '—';
    document.getElementById('detail-date').textContent = dateStr;

    // Bouton toggle
    document.getElementById('detail-toggle-btn').textContent =
      isVisited ? '⭐ Marquer à visiter' : '✅ Marquer visité';

    // Photo droite
    const photoImg = document.getElementById('detail-photo-img');
    const noPhoto = document.getElementById('detail-no-photo');
    photoImg.classList.remove('loaded');
    if (poi.photo) {
      photoImg.src = poi.photo;
      photoImg.onload = () => {
        photoImg.classList.add('loaded');
        // Clic sur la photo → lightbox
        photoImg.onclick = () => this.openLightbox(poi.photo);
      };
      photoImg.onerror = () => { photoImg.classList.remove('loaded'); };
      noPhoto.style.display = 'none';
    } else {
      photoImg.src = '';
      photoImg.onclick = null;
      noPhoto.style.display = 'flex';
    }

    document.getElementById('detail-overlay').classList.add('active');
    this.highlightInSidebar(id);
  },

  hideDetailPanel() {
    document.getElementById('detail-overlay')?.classList.remove('active');
    // Fermer aussi les overlays centraux si encore ouverts
    document.querySelectorAll('.center-overlay.active').forEach(o => o.classList.remove('active'));
    document.querySelectorAll('.menu-btn.active').forEach(b => b.classList.remove('active'));
    this._detailId = null;
  },

  showNotification(message, type = 'info') {
    const c = document.getElementById('notifications');
    if (!c) return;
    const n = document.createElement('div');
    n.className = `notification notification-${type} pixel-slide-in`;
    n.textContent = message;
    c.appendChild(n);
    setTimeout(() => { n.classList.add('notification-exit'); setTimeout(() => n.remove(), 400); }, 3000);
  }
};
