/* ============================================
   router.js — Planificateur de Parcours
   Calcul d'itinéraires via OSRM
   ============================================ */

const RouterManager = {
  waypoints: [],        // IDs des POIs dans l'ordre du parcours
  currentRoute: null,   // Données de la route actuelle
  isRouteMode: false,

  init() {
    this.bindEvents();
    console.log('🗺️ Router initialisé');
  },

  bindEvents() {
    // Bouton calculer le parcours
    document.getElementById('calculate-route')?.addEventListener('click', () => {
      this.calculateRoute();
    });

    // Bouton effacer le parcours
    document.getElementById('clear-route')?.addEventListener('click', () => {
      this.clearRoute();
    });

    // Toggle mode parcours
    document.getElementById('toggle-route-mode')?.addEventListener('click', () => {
      this.toggleRouteMode();
    });
  },

  // === Waypoints ===

  toggleWaypoint(poiId) {
    const index = this.waypoints.indexOf(poiId);
    if (index !== -1) {
      this.waypoints.splice(index, 1);
    } else {
      this.waypoints.push(poiId);
    }
    this.renderWaypoints();
    this.updateRouteButtons();
  },

  removeWaypoint(poiId) {
    this.waypoints = this.waypoints.filter(id => id !== poiId);
    this.renderWaypoints();
    this.updateRouteButtons();
  },

  reorderWaypoints(fromIndex, toIndex) {
    const item = this.waypoints.splice(fromIndex, 1)[0];
    this.waypoints.splice(toIndex, 0, item);
    this.renderWaypoints();
  },

  renderWaypoints() {
    const container = document.getElementById('waypoints-list');
    if (!container) return;

    if (this.waypoints.length === 0) {
      container.innerHTML = `
        <div class="waypoints-empty">
          <p>Cochez des lieux dans la liste<br>pour planifier un parcours</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.waypoints.map((id, index) => {
      const poi = POIManager.pois.find(p => p.id === id);
      if (!poi) return '';
      const emoji = MapManager.CATEGORY_EMOJIS[poi.category] || '📍';
      return `
        <div class="waypoint-item" data-id="${id}" data-index="${index}" draggable="true">
          <span class="waypoint-number">${index + 1}</span>
          <span class="waypoint-emoji">${emoji}</span>
          <span class="waypoint-name">${poi.name}</span>
          <button class="waypoint-remove" onclick="RouterManager.toggleWaypoint('${id}'); POIManager.renderSidebar();">✕</button>
        </div>
      `;
    }).join('');

    // Drag & Drop
    this.initDragDrop(container);
  },

  initDragDrop(container) {
    const items = container.querySelectorAll('.waypoint-item');
    let draggedItem = null;

    items.forEach(item => {
      item.addEventListener('dragstart', (e) => {
        draggedItem = item;
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });

      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        draggedItem = null;
        container.querySelectorAll('.waypoint-item').forEach(i => i.classList.remove('drag-over'));
      });

      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        item.classList.add('drag-over');
      });

      item.addEventListener('dragleave', () => {
        item.classList.remove('drag-over');
      });

      item.addEventListener('drop', (e) => {
        e.preventDefault();
        if (draggedItem && draggedItem !== item) {
          const fromIndex = parseInt(draggedItem.dataset.index);
          const toIndex = parseInt(item.dataset.index);
          this.reorderWaypoints(fromIndex, toIndex);
        }
        item.classList.remove('drag-over');
      });
    });
  },

  updateRouteButtons() {
    const calcBtn = document.getElementById('calculate-route');
    const clearBtn = document.getElementById('clear-route');
    const countBadge = document.getElementById('waypoint-count');

    if (calcBtn) {
      calcBtn.disabled = this.waypoints.length < 2;
    }
    if (clearBtn) {
      clearBtn.style.display = this.waypoints.length > 0 ? 'inline-block' : 'none';
    }
    if (countBadge) {
      countBadge.textContent = this.waypoints.length;
      countBadge.style.display = this.waypoints.length > 0 ? 'inline-flex' : 'none';
    }
  },

  toggleRouteMode() {
    this.isRouteMode = !this.isRouteMode;
    const btn = document.getElementById('toggle-route-mode');
    const routeSection = document.getElementById('route-section');

    if (btn) {
      btn.classList.toggle('active', this.isRouteMode);
      btn.textContent = this.isRouteMode ? '🗺️ Mode parcours ON' : '🗺️ Planifier un parcours';
    }
    if (routeSection) {
      routeSection.classList.toggle('expanded', this.isRouteMode);
    }
  },

  // === Calcul de route OSRM ===

  async calculateRoute() {
    if (this.waypoints.length < 2) {
      POIManager.showNotification('⚠ Sélectionnez au moins 2 lieux', 'warning');
      return;
    }

    const pois = this.waypoints
      .map(id => POIManager.pois.find(p => p.id === id))
      .filter(Boolean);

    if (pois.length < 2) return;

    const coords = pois.map(p => `${p.lng},${p.lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=true`;

    const calcBtn = document.getElementById('calculate-route');
    if (calcBtn) {
      calcBtn.disabled = true;
      calcBtn.textContent = '⏳ Calcul...';
    }

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        throw new Error('Aucun itinéraire trouvé');
      }

      this.currentRoute = data.routes[0];

      // Afficher la route sur la carte
      MapManager.drawRoute(this.currentRoute.geometry);

      // Fermer le panneau central
      document.querySelectorAll('.center-overlay.active').forEach(o => o.classList.remove('active'));
      document.querySelectorAll('.menu-btn.active').forEach(b => b.classList.remove('active'));

      // Afficher le bandeau bas
      this.showRouteBar(this.currentRoute);

      POIManager.showNotification('🗺️ Parcours calculé !', 'success');
    } catch (error) {
      console.error('Erreur calcul route:', error);
      POIManager.showNotification('❌ Erreur de calcul d\'itinéraire', 'warning');
    } finally {
      if (calcBtn) {
        calcBtn.disabled = this.waypoints.length < 2;
        calcBtn.textContent = '▶ CALCULER L\'ITINÉRAIRE';
      }
    }
  },

  showRouteBar(route) {
    const bar = document.getElementById('route-bar');
    if (!bar) return;

    const distanceKm = (route.distance / 1000).toFixed(1);
    const carSeconds = route.duration;
    // Estimations basées sur la distance
    const transitSeconds = route.distance / 22.2; // ~80 km/h moyen trains japonais
    const walkSeconds = route.distance / 1.39;     // ~5 km/h à pied

    document.getElementById('rb-distance').textContent = `${distanceKm} km`;
    document.getElementById('rb-car').textContent = this._formatTime(carSeconds);
    document.getElementById('rb-transit').textContent = this._formatTime(transitSeconds);
    document.getElementById('rb-walk').textContent = this._formatTime(walkSeconds);
    document.getElementById('rb-steps').textContent = this.waypoints.length;

    bar.classList.add('active');

    // Bouton fermer
    document.getElementById('route-bar-close')?.addEventListener('click', () => {
      this.hideRouteBar();
    }, { once: true });
  },

  hideRouteBar() {
    document.getElementById('route-bar')?.classList.remove('active');
  },

  _formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}min`;
    return `${m}min`;
  },

  displayRouteInfo(route) {
    const infoContainer = document.getElementById('route-info');
    if (!infoContainer) return;

    const distanceKm = (route.distance / 1000).toFixed(1);
    const hours = Math.floor(route.duration / 3600);
    const minutes = Math.round((route.duration % 3600) / 60);

    let timeStr = '';
    if (hours > 0) timeStr += `${hours}h `;
    timeStr += `${minutes}min`;

    infoContainer.innerHTML = `
      <div class="route-info-card pixel-border">
        <div class="route-info-item">
          <span class="route-info-label">📏 Distance</span>
          <span class="route-info-value">${distanceKm} km</span>
        </div>
        <div class="route-info-item">
          <span class="route-info-label">⏱️ Durée estimée</span>
          <span class="route-info-value">${timeStr}</span>
        </div>
        <div class="route-info-item">
          <span class="route-info-label">📍 Étapes</span>
          <span class="route-info-value">${this.waypoints.length}</span>
        </div>
      </div>
    `;
    infoContainer.style.display = 'block';
  },

  clearRoute() {
    this.waypoints = [];
    this.currentRoute = null;
    MapManager.clearRoute();
    this.renderWaypoints();
    this.updateRouteButtons();
    this.hideRouteBar();

    const infoContainer = document.getElementById('route-info');
    if (infoContainer) {
      infoContainer.innerHTML = '';
      infoContainer.style.display = 'none';
    }

    // Décocher toutes les checkboxes
    POIManager.renderSidebar();
    POIManager.showNotification('🗑️ Parcours effacé', 'info');
  }
};
