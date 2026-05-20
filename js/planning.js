/* ============================================
   planning.js — Planning semainier
   Glisser-déposer de lieux sur les jours
   ============================================ */

const PlanningManager = {
  DAYS: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'],
  DAY_LABELS: {
    lundi: '月 LUN', mardi: '火 MAR', mercredi: '水 MER',
    jeudi: '木 JEU', vendredi: '金 VEN', samedi: '土 SAM', dimanche: '日 DIM'
  },

  // { lundi: ['poi-id-1', ...], mardi: [...], ... }
  planning: {},

  init() {
    this.DAYS.forEach(d => { if (!this.planning[d]) this.planning[d] = []; });
    this.load();
    console.log('📅 Planning initialisé');
  },

  // === Persistence ===
  save() {
    try {
      localStorage.setItem('japan-planning', JSON.stringify(this.planning));
    } catch (e) { console.warn('Erreur sauvegarde planning', e); }
  },

  load() {
    try {
      const data = localStorage.getItem('japan-planning');
      if (data) {
        const parsed = JSON.parse(data);
        this.DAYS.forEach(d => { this.planning[d] = parsed[d] || []; });
      }
    } catch (e) { console.warn('Erreur lecture planning', e); }
  },

  // === Render ===
  render() {
    const overlay = document.getElementById('center-planning');
    if (!overlay) return;

    const body = overlay.querySelector('.center-panel-body');
    if (!body) return;

    // Pool de lieux non planifiés
    const plannedIds = new Set(Object.values(this.planning).flat());
    const unplanned = POIManager.pois.filter(p => !plannedIds.has(p.id));

    body.innerHTML = `
      <div class="planning-pool">
        <div class="planning-pool-header">
          <span class="center-section-title">📍 Lieux disponibles</span>
          <span class="planning-pool-count">${unplanned.length}</span>
        </div>
        <div class="planning-pool-list" id="planning-pool"
             ondragover="PlanningManager.onDragOver(event)"
             ondrop="PlanningManager.onDropPool(event)">
          ${unplanned.length === 0 ? '<p class="planning-pool-empty">Tous les lieux sont planifiés !</p>' :
            unplanned.map(poi => this._renderDraggablePoi(poi)).join('')}
        </div>
      </div>

      <div class="planning-week" id="planning-week">
        ${this.DAYS.map(day => this._renderDay(day)).join('')}
      </div>
    `;

    // Rendre les items draggables
    this._bindDragEvents();
  },

  _renderDraggablePoi(poi) {
    const emoji = MapManager.CATEGORY_EMOJIS[poi.category] || '📍';
    return `
      <div class="planning-poi" draggable="true" data-poi-id="${poi.id}">
        <span class="planning-poi-emoji">${emoji}</span>
        <span class="planning-poi-name">${poi.name}</span>
      </div>
    `;
  },

  _renderDay(day) {
    const pois = this.planning[day]
      .map(id => POIManager.pois.find(p => p.id === id))
      .filter(Boolean);

    return `
      <div class="planning-day" data-day="${day}">
        <div class="planning-day-header">
          <span class="planning-day-label">${this.DAY_LABELS[day]}</span>
          <span class="planning-day-count">${pois.length}</span>
        </div>
        <div class="planning-day-slots" data-day="${day}"
             ondragover="PlanningManager.onDragOver(event)"
             ondrop="PlanningManager.onDropDay(event, '${day}')">
          ${pois.length === 0 ? '<div class="planning-day-empty">Glissez des lieux ici</div>' :
            pois.map((poi, i) => `
              <div class="planning-poi in-day" draggable="true" data-poi-id="${poi.id}" data-day="${day}" data-index="${i}">
                <span class="planning-poi-num">${i + 1}</span>
                <span class="planning-poi-emoji">${MapManager.CATEGORY_EMOJIS[poi.category] || '📍'}</span>
                <span class="planning-poi-name">${poi.name}</span>
                <button class="planning-poi-remove" onclick="PlanningManager.removeFromDay('${day}', '${poi.id}')">✕</button>
              </div>
            `).join('')}
        </div>
        ${pois.length >= 2 ? `
          <button class="planning-route-btn pixel-btn pixel-btn-orange pixel-btn-tiny" onclick="PlanningManager.calculateDayRoute('${day}')">
            ▶ ITINÉRAIRE DU JOUR
          </button>
        ` : ''}
      </div>
    `;
  },

  // === Drag & Drop ===
  _dragData: null,

  _bindDragEvents() {
    document.querySelectorAll('.planning-poi[draggable]').forEach(el => {
      el.addEventListener('dragstart', (e) => {
        this._dragData = {
          poiId: el.dataset.poiId,
          fromDay: el.dataset.day || null,
          fromIndex: el.dataset.index != null ? parseInt(el.dataset.index) : null
        };
        el.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', el.dataset.poiId);
      });
      el.addEventListener('dragend', () => {
        el.classList.remove('dragging');
        document.querySelectorAll('.drag-hover').forEach(d => d.classList.remove('drag-hover'));
        this._dragData = null;
      });
    });

    // Highlight des zones de drop
    document.querySelectorAll('.planning-day-slots, #planning-pool').forEach(zone => {
      zone.addEventListener('dragenter', () => zone.classList.add('drag-hover'));
      zone.addEventListener('dragleave', (e) => {
        if (!zone.contains(e.relatedTarget)) zone.classList.remove('drag-hover');
      });
    });
  },

  onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  },

  onDropDay(e, day) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-hover');
    if (!this._dragData) return;

    const { poiId, fromDay } = this._dragData;

    // Retirer de l'ancien jour si déplacement entre jours
    if (fromDay) {
      this.planning[fromDay] = this.planning[fromDay].filter(id => id !== poiId);
    }

    // Ajouter au nouveau jour (si pas déjà dedans)
    if (!this.planning[day].includes(poiId)) {
      this.planning[day].push(poiId);
    }

    this.save();
    this.render();
  },

  onDropPool(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-hover');
    if (!this._dragData) return;

    const { poiId, fromDay } = this._dragData;

    // Retirer du jour
    if (fromDay) {
      this.planning[fromDay] = this.planning[fromDay].filter(id => id !== poiId);
      this.save();
      this.render();
    }
  },

  removeFromDay(day, poiId) {
    this.planning[day] = this.planning[day].filter(id => id !== poiId);
    this.save();
    this.render();
  },

  // === Calcul d'itinéraire pour un jour ===
  async calculateDayRoute(day) {
    const poiIds = this.planning[day];
    if (!poiIds || poiIds.length < 2) {
      POIManager.showNotification('⚠ Il faut au moins 2 lieux pour un itinéraire', 'warning');
      return;
    }

    // Passer les waypoints au routeur
    RouterManager.waypoints = [...poiIds];
    RouterManager.renderWaypoints();
    RouterManager.updateRouteButtons();

    // Fermer le panneau planning
    document.querySelectorAll('.center-overlay.active').forEach(o => o.classList.remove('active'));
    document.querySelectorAll('.menu-btn.active').forEach(b => b.classList.remove('active'));

    // Lancer le calcul
    await RouterManager.calculateRoute();
  },

  // === Reset ===
  clearAll() {
    this.DAYS.forEach(d => { this.planning[d] = []; });
    this.save();
    this.render();
    POIManager.showNotification('📅 Planning vidé', 'info');
  }
};
