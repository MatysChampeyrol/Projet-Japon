/* ============================================
   search.js — Recherche de lieux + Photos
   Nominatim autocomplete + Wikipedia images
   ============================================ */

const SearchManager = {
  debounceTimer: null,
  abortController: null,

  init() {
    const input = document.getElementById('place-search');
    if (!input) return;

    input.addEventListener('input', (e) => {
      const q = e.target.value.trim();
      if (q.length < 2) { this.clearResults(); return; }
      this.debounceSearch(q);
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-autocomplete-inner')) this.clearResults();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { this.clearResults(); input.blur(); }
    });

    console.log('🔍 Search initialisé');
  },

  debounceSearch(query) {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.search(query), 400);
  },

  async search(query) {
    if (this.abortController) this.abortController.abort();
    this.abortController = new AbortController();
    this.showLoading();

    try {
      // Recherche avec accept-language=fr,en pour forcer les noms en français/anglais
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&countrycodes=jp&limit=6&accept-language=fr,en&addressdetails=1&namedetails=1`;
      const res = await fetch(url, {
        signal: this.abortController.signal,
        headers: { 'User-Agent': 'JapanQuest/1.0' }
      });
      this.renderResults(await res.json(), query);
    } catch (e) {
      if (e.name !== 'AbortError') this.showError();
    }
  },

  /**
   * Extrait le meilleur nom lisible (en caractères latins) depuis le résultat Nominatim.
   * Priorité : namedetails:fr > namedetails:en > namedetails:name:en > nom romain dans display_name > original
   */
  _extractBestName(result) {
    const nd = result.namedetails || {};
    const addr = result.address || {};

    // Priorité 1: nom en français
    if (nd['name:fr'] && this._isLatin(nd['name:fr'])) return nd['name:fr'];
    // Priorité 2: nom en anglais
    if (nd['name:en'] && this._isLatin(nd['name:en'])) return nd['name:en'];
    // Priorité 3: nom international
    if (nd['int_name'] && this._isLatin(nd['int_name'])) return nd['int_name'];
    // Priorité 4: nom principal s'il est en latin
    if (nd.name && this._isLatin(nd.name)) return nd.name;

    // Priorité 5: extraire le premier segment latin du display_name
    const parts = (result.display_name || '').split(',');
    for (const part of parts) {
      const trimmed = part.trim();
      if (this._isLatin(trimmed) && trimmed.length > 1) return trimmed;
    }

    // Priorité 6: essayer le nom du lieu dans address
    const addrFields = ['tourism', 'amenity', 'shop', 'building', 'leisure', 'historic', 'name'];
    for (const field of addrFields) {
      if (addr[field] && this._isLatin(addr[field])) return addr[field];
    }

    // Dernier recours : garder le premier segment du display_name (même en japonais)
    return parts[0]?.trim() || result.display_name;
  },

  /**
   * Vérifie si un texte est principalement en caractères latins (pas de kanji/kana/hangul).
   */
  _isLatin(str) {
    if (!str) return false;
    // Compte les caractères latins vs non-latins
    const latinChars = (str.match(/[a-zA-ZÀ-ÿ0-9\s\-'".()&!?@#]/g) || []).length;
    return latinChars > str.length * 0.5;
  },

  /**
   * Construit l'adresse lisible (ville, préfecture) en évitant le japonais
   */
  _extractAddress(result) {
    const addr = result.address || {};
    const parts = [];

    // Ville
    const city = addr.city || addr.town || addr.village || addr.suburb || '';
    if (city && this._isLatin(city)) parts.push(city);

    // Préfecture / état
    const state = addr.state || addr.province || '';
    if (state && this._isLatin(state)) parts.push(state);

    // Si on a rien, tenter les 2ème et 3ème segments du display_name
    if (parts.length === 0) {
      const displayParts = (result.display_name || '').split(',');
      for (let i = 1; i < Math.min(displayParts.length, 3); i++) {
        const p = displayParts[i]?.trim();
        if (p && this._isLatin(p)) parts.push(p);
      }
    }

    return parts.join(', ') || 'Japon';
  },

  renderResults(results, originalQuery) {
    const container = document.getElementById('search-results');
    if (!container) return;

    if (results.length === 0) {
      container.innerHTML = '<div class="search-no-results">Aucun résultat trouvé</div>';
      container.classList.add('active');
      return;
    }

    container.innerHTML = results.map(r => {
      const cat = this.guessCategory(r);
      const emoji = MapManager.CATEGORY_EMOJIS[cat] || '📍';
      const name = this._extractBestName(r);
      const addr = this._extractAddress(r);
      return `
        <div class="search-result-item" data-lat="${r.lat}" data-lng="${r.lon}"
             data-name="${this.escapeHtml(name)}" data-category="${cat}">
          <span class="search-result-emoji">${emoji}</span>
          <div class="search-result-info">
            <span class="search-result-name">${name}</span>
            <span class="search-result-address">${addr}</span>
          </div>
        </div>`;
    }).join('');

    container.classList.add('active');

    container.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const lat = parseFloat(item.dataset.lat);
        const lng = parseFloat(item.dataset.lng);
        const name = item.dataset.name;
        const category = item.dataset.category;

        MapManager.centerOn(lat, lng, 14);
        POIManager.showAddModal(lat, lng, name, category);
        this.clearResults();
        document.getElementById('place-search').value = '';
        this.fetchAndSetPhoto(name);
      });
    });
  },

  guessCategory(result) {
    const t = (result.type || '').toLowerCase();
    const c = (result.class || '').toLowerCase();
    if (['place_of_worship', 'temple', 'shrine'].some(x => t.includes(x))) return 'temple';
    if (['restaurant', 'cafe', 'fast_food', 'bar', 'food'].some(x => t.includes(x))) return 'restaurant';
    if (['hotel', 'hostel', 'guest_house'].some(x => t.includes(x))) return 'hotel';
    if (['shop', 'mall', 'marketplace'].some(x => t.includes(x) || c.includes(x))) return 'shopping';
    if (['park', 'garden', 'nature', 'mountain', 'lake', 'beach', 'volcano'].some(x => t.includes(x))) return 'nature';
    if (['museum', 'theatre', 'arts_centre', 'castle', 'monument'].some(x => t.includes(x))) return 'culture';
    return 'other';
  },

  async fetchAndSetPhoto(placeName) {
    const photoInput = document.getElementById('poi-photo');
    const photoImg = document.getElementById('photo-preview-img');
    const photoBox = document.getElementById('photo-preview');
    if (!photoInput || !photoImg || !photoBox) return;

    photoBox.className = 'modal-photo-area loading';

    const photoUrl = await this.searchBestPhoto(placeName);

    if (photoUrl) {
      photoInput.value = photoUrl;
      photoImg.src = photoUrl;
      photoImg.onload = () => { photoBox.className = 'modal-photo-area has-photo'; };
      photoImg.onerror = () => { photoBox.className = 'modal-photo-area no-photo'; };
    } else {
      photoBox.className = 'modal-photo-area no-photo';
      photoInput.value = '';
    }
  },

  /**
   * Recherche la meilleure photo pour un lieu.
   * Stratégie améliorée :
   *   1. Wikipedia FR (direct + search) — filtre les logos/petites images
   *   2. Wikipedia EN (direct + search) — filtre les logos/petites images
   *   3. Wikimedia Commons (recherche spécifique)
   *   4. Fallback : aucune image plutôt qu'une image non pertinente
   */
  async searchBestPhoto(placeName) {
    // Essaie avec le nom exact, puis avec "Japan" ajouté
    const searchVariants = [placeName, `${placeName} Japan`];

    for (const query of searchVariants) {
      for (const lang of ['fr', 'en']) {
        const url = await this._tryWikipediaPhoto(query, lang);
        if (url) return url;
      }
    }

    // Fallback : Wikimedia Commons
    const commonsUrl = await this._tryCommonsPhoto(placeName);
    if (commonsUrl) return commonsUrl;

    return null;
  },

  /**
   * Ancienne méthode conservée pour la compatibilité (suggestions.js l'utilise)
   */
  async searchWikipediaPhoto(placeName) {
    return this.searchBestPhoto(placeName);
  },

  async _tryWikipediaPhoto(query, lang) {
    const base = `https://${lang}.wikipedia.org/w/api.php`;

    try {
      // 1. Lookup direct par titre exact
      const directUrl = `${base}?action=query&titles=${encodeURIComponent(query)}&prop=pageimages&pithumbsize=800&format=json&origin=*&pilicense=any`;
      const directData = await (await fetch(directUrl)).json();
      if (directData.query?.pages) {
        for (const page of Object.values(directData.query.pages)) {
          const src = page.thumbnail?.source;
          if (src && this._isRelevantPhoto(src, page.thumbnail)) return src;
        }
      }
    } catch (e) { /* continue */ }

    try {
      // 2. Recherche textuelle + images
      const searchUrl = `${base}?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=5&srnamespace=0`;
      const searchData = await (await fetch(searchUrl)).json();
      if (!searchData.query?.search?.length) return null;

      const titles = searchData.query.search.map(a => a.title).join('|');
      const imgUrl = `${base}?action=query&titles=${encodeURIComponent(titles)}&prop=pageimages&pithumbsize=800&format=json&origin=*&pilicense=any`;
      const imgData = await (await fetch(imgUrl)).json();

      if (imgData.query?.pages) {
        for (const page of Object.values(imgData.query.pages)) {
          const src = page.thumbnail?.source;
          if (src && this._isRelevantPhoto(src, page.thumbnail)) return src;
        }
      }

      // 3. REST summary sur le premier résultat
      const firstTitle = encodeURIComponent(searchData.query.search[0].title);
      const summaryRes = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${firstTitle}`);
      if (summaryRes.ok) {
        const summary = await summaryRes.json();
        const img = summary.originalimage || summary.thumbnail;
        if (img?.source && this._isRelevantPhoto(img.source, img)) return img.source;
      }
    } catch (e) { /* continue */ }

    return null;
  },

  /**
   * Recherche une photo sur Wikimedia Commons
   */
  async _tryCommonsPhoto(placeName) {
    try {
      const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(placeName + ' Japan')}&srnamespace=6&srlimit=5&format=json&origin=*`;
      const searchData = await (await fetch(searchUrl)).json();
      const results = searchData.query?.search || [];

      // Filtrer les résultats pour garder les .jpg/.png, exclure les logos/icônes/cartes
      const validResults = results.filter(r => {
        const title = r.title.toLowerCase();
        return (title.endsWith('.jpg') || title.endsWith('.jpeg') || title.endsWith('.png')) &&
               !title.includes('logo') && !title.includes('icon') && !title.includes('map') &&
               !title.includes('flag') && !title.includes('emblem') && !title.includes('seal');
      });

      if (validResults.length === 0) return null;

      // Récupérer l'URL de l'image
      const title = validResults[0].title;
      const imgUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|size&iiurlwidth=800&format=json&origin=*`;
      const imgData = await (await fetch(imgUrl)).json();

      for (const page of Object.values(imgData.query?.pages || {})) {
        const info = page.imageinfo?.[0];
        if (info) {
          // Vérifier que c'est une vraie photo (pas un logo minuscule)
          if (info.width > 200 && info.height > 150) {
            return info.thumburl || info.url;
          }
        }
      }
    } catch (e) { console.warn('Commons search error:', e); }

    return null;
  },

  /**
   * Vérifie qu'une image est probablement une vraie photo et pas un logo/icône.
   * Filtre basé sur le nom de fichier et les dimensions.
   */
  _isRelevantPhoto(src, thumbInfo) {
    if (!src) return false;
    const lower = src.toLowerCase();

    // Exclure les logos, icônes, drapeaux, blasons, pictogrammes
    const excludePatterns = [
      'logo', 'icon', 'flag', 'emblem', 'seal', 'coa_', 'coat_of_arms',
      'pictogram', 'symbol', '.svg', 'map', 'locator', 'location',
      'diagram', 'chart', 'graph', 'signature', 'autograph', 'ambox',
      'question_book', 'edit-clear', 'crystal_clear', 'nuvola',
      'wikiproject', 'commons-logo', 'wiki', 'stub'
    ];

    for (const pattern of excludePatterns) {
      if (lower.includes(pattern)) return false;
    }

    // Vérifier les dimensions minimum si disponibles
    if (thumbInfo) {
      const w = thumbInfo.width || 0;
      const h = thumbInfo.height || 0;
      // Exclure les images trop petites (probablement des icônes)
      if (w > 0 && h > 0 && (w < 100 || h < 80)) return false;
      // Exclure les images trop carrées et petites (souvent des logos)
      if (w > 0 && h > 0 && w < 200 && Math.abs(w - h) < 20) return false;
    }

    return true;
  },

  clearResults() {
    const c = document.getElementById('search-results');
    if (c) { c.innerHTML = ''; c.classList.remove('active'); }
  },

  showLoading() {
    const c = document.getElementById('search-results');
    if (c) { c.innerHTML = '<div class="search-loading"><span class="loading-dots">⏳</span> Recherche en cours...</div>'; c.classList.add('active'); }
  },

  showError() {
    const c = document.getElementById('search-results');
    if (c) { c.innerHTML = '<div class="search-no-results">❌ Erreur de recherche</div>'; c.classList.add('active'); }
  },

  escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }
};
