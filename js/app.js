/* ============================================
   app.js — Point d'entrée (async init)
   ============================================ */

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🎌 Japan Quest — Initialisation...');

  // Init storage (détecte API ou localStorage)
  await Storage.init();

  // Init modules
  MapManager.init();
  POIManager.init();
  RouterManager.init();
  SearchManager.init();
  SuggestionsManager.init();
  PlanningManager.init();

  // === Sidebar Toggle ===
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('sidebar-toggle');
  const settings = Storage.getSettings();
  if (!settings.sidebarOpen) sidebar?.classList.add('collapsed');

  toggleBtn?.addEventListener('click', () => {
    sidebar?.classList.toggle('collapsed');
    Storage.saveSettings({ ...Storage.getSettings(), sidebarOpen: !sidebar?.classList.contains('collapsed') });
    MapManager.invalidateSize();
  });

  // === Center Panel Management ===
  const menuBtns = document.querySelectorAll('.menu-btn');
  const centerOverlays = document.querySelectorAll('.center-overlay');

  function closeCenterPanels() {
    centerOverlays.forEach(o => o.classList.remove('active'));
    menuBtns.forEach(b => b.classList.remove('active'));
  }

  function openCenterPanel(panelId) {
    // Suggestions uses its own overlay system
    if (panelId === 'center-suggestions') {
      closeCenterPanels();
      SuggestionsManager.toggle();
      return;
    }

    const overlay = document.getElementById(panelId);
    if (!overlay) return;

    const isOpen = overlay.classList.contains('active');
    closeCenterPanels();

    if (!isOpen) {
      overlay.classList.add('active');
      const btn = document.querySelector(`[data-panel="${panelId}"]`);
      btn?.classList.add('active');

      // Focus search input
      if (panelId === 'center-search') {
        setTimeout(() => document.getElementById('place-search')?.focus(), 150);
      }
      // Render planning when opening
      if (panelId === 'center-planning') {
        PlanningManager.render();
      }
    }
  }

  // Menu buttons
  menuBtns.forEach(btn => {
    btn.addEventListener('click', () => openCenterPanel(btn.dataset.panel));
  });

  // Close buttons (✕)
  document.querySelectorAll('.center-close').forEach(btn => {
    btn.addEventListener('click', () => closeCenterPanels());
  });

  // Click overlay background to close
  centerOverlays.forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeCenterPanels();
    });
  });

  // === Raccourcis clavier ===
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      POIManager.hideModal();
      POIManager.hideDetailPanel();
      SuggestionsManager.close();
      closeCenterPanels();
      document.getElementById('lightbox-overlay')?.classList.remove('active');
    }
    if (e.ctrlKey && e.key === 'e') { e.preventDefault(); Storage.exportData(); }
  });

  // Mode indicator
  const modeEl = document.getElementById('mode-indicator');
  if (modeEl) modeEl.textContent = Storage._useAPI ? '📡 EN LIGNE' : '💾 HORS LIGNE';

  console.log('🎌 Japan Quest — Prêt !');
});
