/* ============================================
   map.js — Gestion de la carte Leaflet
   Carte, marqueurs pixelisés, geocoder, routes
   ============================================ */

const MapManager = {
  map: null,
  markers: {},
  routeLayer: null,
  contextMenu: null,

  CATEGORY_COLORS: {
    temple: '#fb923c', restaurant: '#f87171', nature: '#4ade80',
    shopping: '#a78bfa', culture: '#ff6b9d', hotel: '#38bdf8', other: '#fbbf24'
  },
  CATEGORY_EMOJIS: {
    temple: '⛩️', restaurant: '🍜', nature: '🌸',
    shopping: '🛍️', culture: '🎌', hotel: '🏨', other: '📍'
  },

  init() {
    this.map = L.map('map', { center: [36.5, 138.0], zoom: 6, zoomControl: false, attributionControl: true });
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd', maxZoom: 19
    }).addTo(this.map);

    this.map.on('contextmenu', (e) => this.showContextMenu(e));
    this.map.on('click', () => this.hideContextMenu());
    console.log('🗺️ Carte initialisée');
  },

  showContextMenu(e) {
    this.hideContextMenu();
    const c = document.createElement('div');
    c.className = 'map-context-menu pixel-border';
    c.innerHTML = '<button class="context-menu-item" id="ctx-add-poi">✦ Ajouter un lieu ici</button>';
    c.style.cssText = 'position:absolute;z-index:10000;';
    const r = this.map.getContainer().getBoundingClientRect();
    c.style.left = (e.originalEvent.clientX - r.left) + 'px';
    c.style.top = (e.originalEvent.clientY - r.top) + 'px';
    this.map.getContainer().appendChild(c);
    this.contextMenu = c;
    document.getElementById('ctx-add-poi').addEventListener('click', () => {
      POIManager.showAddModal(e.latlng.lat, e.latlng.lng);
      this.hideContextMenu();
    });
  },

  hideContextMenu() { if (this.contextMenu) { this.contextMenu.remove(); this.contextMenu = null; } },

  createMarkerIcon(poi) {
    const color = this.CATEGORY_COLORS[poi.category] || this.CATEGORY_COLORS.other;
    const emoji = this.CATEGORY_EMOJIS[poi.category] || this.CATEGORY_EMOJIS.other;
    const vis = poi.status === 'visited';
    return L.divIcon({
      className: 'pixel-marker-container',
      html: `<div class="pixel-marker ${vis ? 'visited' : 'to-visit'}" style="--marker-color: ${color}">
        <span class="marker-emoji">${emoji}</span>
        <div class="marker-status">${vis ? '✓' : '★'}</div>
      </div><div class="marker-pointer" style="--marker-color: ${color}"></div>`,
      iconSize: [40, 52], iconAnchor: [20, 52], popupAnchor: [0, -52]
    });
  },

  addMarker(poi) {
    if (this.markers[poi.id]) this.removeMarker(poi.id);
    const marker = L.marker([poi.lat, poi.lng], { icon: this.createMarkerIcon(poi) }).addTo(this.map);
    marker.bindPopup(() => this.createPopupContent(poi));
    marker.on('click', () => {
      POIManager.showDetailPanel(poi.id);
      POIManager.highlightInSidebar(poi.id);
    });
    this.markers[poi.id] = marker;
  },

  createPopupContent(poi) {
    const p = Storage.getPOI(poi.id) || poi;
    const catLabel = POIManager.CATEGORY_LABELS[p.category] || p.category;
    const sLabel = p.status === 'visited' ? '✅ Visité' : '⭐ À visiter';
    const div = document.createElement('div');
    div.className = 'poi-popup';
    div.innerHTML = `
      ${p.photo ? `<div class="popup-photo"><img src="${p.photo}" alt="${p.name}"></div>` : ''}
      <h3 class="popup-title">${p.name}</h3>
      <span class="popup-category">${this.CATEGORY_EMOJIS[p.category] || '📍'} ${catLabel}</span>
      <span class="popup-status ${p.status}">${sLabel}</span>
      ${p.notes ? `<p class="popup-notes">${p.notes}</p>` : ''}
      <div class="popup-actions">
        <button class="pixel-btn pixel-btn-small pixel-btn-green popup-toggle-btn">${p.status === 'visited' ? '⭐ À visiter' : '✅ Visité'}</button>
        <button class="pixel-btn pixel-btn-small pixel-btn-blue popup-edit-btn">✎ Modifier</button>
        <button class="pixel-btn pixel-btn-small pixel-btn-red popup-delete-btn">✕ Supprimer</button>
      </div>`;
    div.querySelector('.popup-toggle-btn').addEventListener('click', async () => { await POIManager.toggleStatus(p.id); this.map.closePopup(); });
    div.querySelector('.popup-edit-btn').addEventListener('click', () => { POIManager.showEditModal(p.id); this.map.closePopup(); });
    div.querySelector('.popup-delete-btn').addEventListener('click', async () => { if (confirm('Supprimer ce lieu ?')) { await POIManager.deletePOI(p.id); this.map.closePopup(); } });
    return div;
  },

  removeMarker(id) { if (this.markers[id]) { this.map.removeLayer(this.markers[id]); delete this.markers[id]; } },
  updateMarker(poi) { this.addMarker(poi); },
  centerOn(lat, lng, zoom = 15) { this.map.setView([lat, lng], zoom, { animate: true }); },

  fitAllMarkers() {
    const ids = Object.keys(this.markers);
    if (ids.length === 0) return;
    this.map.fitBounds(L.featureGroup(Object.values(this.markers)).getBounds().pad(0.1), { animate: true });
  },

  drawRoute(geojson, color = '#ff6b9d') {
    this.clearRoute();
    this.routeLayer = L.geoJSON(geojson, {
      style: { color, weight: 5, opacity: 0.8, dashArray: '10, 8', lineCap: 'square', lineJoin: 'miter' }
    }).addTo(this.map);
    this.map.fitBounds(this.routeLayer.getBounds().pad(0.1), { animate: true });
  },

  clearRoute() { if (this.routeLayer) { this.map.removeLayer(this.routeLayer); this.routeLayer = null; } },
  invalidateSize() { setTimeout(() => this.map.invalidateSize(), 300); }
};
