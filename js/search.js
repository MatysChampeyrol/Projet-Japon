/* ============================================
   search.js — Recherche de lieux + Moteur Photo
   Géolocalisé, Wikidata, Wikipedia, Commons
   ============================================ */

const SearchManager = {
  debounceTimer: null,
  abortController: null,

  // Cache mémoire session
  _photoCache: new Map(),

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
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&countrycodes=jp&limit=12&accept-language=fr,en&addressdetails=1&namedetails=1&extratags=1`;
      const res = await fetch(url, {
        signal: this.abortController.signal,
        headers: { 'User-Agent': 'JapanQuest/1.0' }
      });
      this.renderResults(await res.json(), query);
    } catch (e) {
      if (e.name !== 'AbortError') this.showError();
    }
  },

  // ============================================================
  //  Scoring & filtrage des résultats Nominatim
  // ============================================================

  _scoreResult(result) {
    let score = parseFloat(result.importance) || 0;
    const t = (result.type || '').toLowerCase();
    const c = (result.class || '').toLowerCase();
    const extra = result.extratags || {};

    const poiClasses = ['tourism', 'historic', 'amenity', 'leisure', 'natural', 'man_made'];
    if (poiClasses.includes(c)) score += 0.35;

    const goodTypes = [
      'temple', 'shrine', 'castle', 'museum', 'park', 'garden', 'monument',
      'restaurant', 'hotel', 'hostel', 'guest_house', 'ryokan',
      'attraction', 'viewpoint', 'artwork', 'ruins', 'archaeological_site',
      'beach', 'hot_spring', 'theme_park', 'zoo', 'aquarium',
      'theatre', 'arts_centre', 'marketplace', 'alpine_hut'
    ];
    if (goodTypes.some(pt => t.includes(pt))) score += 0.2;

    // Bonus fort si le lieu a un lien Wikidata/Wikipedia dans OSM
    if (extra.wikidata) score += 0.2;
    if (extra.wikipedia) score += 0.1;

    const badClasses = ['highway', 'railway', 'waterway', 'landuse', 'boundary'];
    if (badClasses.includes(c)) score -= 0.4;

    const badTypes = ['bus_stop', 'tram_stop', 'residential', 'path', 'track',
                      'service', 'steps', 'crossing', 'platform', 'cycleway'];
    if (badTypes.some(bt => t.includes(bt))) score -= 0.3;

    return Math.max(0, Math.min(1, score));
  },

  _deduplicateResults(results) {
    const unique = [];
    for (const r of results) {
      const isDupe = unique.some(u =>
        Math.abs(parseFloat(u.lat) - parseFloat(r.lat)) < 0.001 &&
        Math.abs(parseFloat(u.lon) - parseFloat(r.lon)) < 0.001
      );
      if (!isDupe) unique.push(r);
    }
    return unique;
  },

  _getTypeLabel(result) {
    const t = (result.type || '').toLowerCase();
    const c = (result.class || '').toLowerCase();
    const typeMap = {
      'temple': '⛩️ Temple', 'shrine': '⛩️ Sanctuaire',
      'castle': '🏯 Château', 'museum': '🏛️ Musée',
      'park': '🌿 Parc', 'garden': '🌸 Jardin',
      'restaurant': '🍜 Restaurant', 'hotel': '🏨 Hôtel',
      'hostel': '🏨 Auberge', 'guest_house': '🏡 Ryokan',
      'attraction': '🎯 Attraction', 'viewpoint': '👁️ Panorama',
      'beach': '🏖️ Plage', 'hot_spring': '♨️ Onsen',
      'ruins': '🏚️ Ruines', 'monument': '🗿 Monument',
      'aquarium': '🐠 Aquarium', 'zoo': '🦊 Zoo',
      'theme_park': '🎡 Parc loisirs', 'arts_centre': '🎭 Centre culturel',
      'city': '🏙️ Ville', 'town': '🏘️ Ville', 'village': '🏡 Village',
      'marketplace': '🛍️ Marché', 'alpine_hut': '🏔️ Refuge'
    };
    for (const [key, label] of Object.entries(typeMap)) {
      if (t.includes(key)) return label;
    }
    if (c === 'tourism') return '🎌 Tourisme';
    if (c === 'historic') return '📜 Historique';
    if (c === 'natural') return '🌿 Nature';
    if (c === 'place') return '📍 Lieu';
    return '';
  },

  renderResults(results, originalQuery) {
    const container = document.getElementById('search-results');
    if (!container) return;

    const scored = results
      .map(r => ({ ...r, _score: this._scoreResult(r) }))
      .filter(r => r._score > 0.05)
      .sort((a, b) => b._score - a._score);

    const deduped = this._deduplicateResults(scored).slice(0, 6);

    if (deduped.length === 0) {
      container.innerHTML = '<div class="search-no-results">Aucun résultat trouvé au Japon</div>';
      container.classList.add('active');
      return;
    }

    container.innerHTML = deduped.map(r => {
      const cat = this.guessCategory(r);
      const emoji = MapManager.CATEGORY_EMOJIS[cat] || '📍';
      const name = this._extractBestName(r);
      const addr = this._extractAddress(r);
      const typeLabel = this._getTypeLabel(r);
      const extra = r.extratags || {};
      // Stocker les données de contexte dans des data-attributes
      return `
        <div class="search-result-item"
             data-lat="${r.lat}" data-lng="${r.lon}"
             data-name="${this.escapeHtml(name)}" data-category="${cat}"
             data-place-id="${r.place_id}"
             data-wikidata="${this.escapeHtml(extra.wikidata || '')}"
             data-wikipedia="${this.escapeHtml(extra.wikipedia || '')}">
          <div class="search-result-thumb" id="thumb-${r.place_id}">
            <span class="search-result-thumb-emoji">${emoji}</span>
          </div>
          <div class="search-result-info">
            <span class="search-result-name">${name}</span>
            <span class="search-result-address">${addr}</span>
            ${typeLabel ? `<span class="search-result-type">${typeLabel}</span>` : ''}
          </div>
        </div>`;
    }).join('');

    container.classList.add('active');

    container.querySelectorAll('.search-result-item').forEach(item => {
      const name = item.dataset.name;
      const category = item.dataset.category;

      // Contexte riche : coordonnées + IDs Wikidata/Wikipedia
      const context = {
        lat: parseFloat(item.dataset.lat),
        lng: parseFloat(item.dataset.lng),
        wikidata: item.dataset.wikidata || null,
        wikipedia: item.dataset.wikipedia || null
      };

      // Prefetch au survol (non-bloquant)
      item.addEventListener('mouseenter', () => {
        this._prefetchPhoto(name, context);
      });

      item.addEventListener('click', () => {
        MapManager.centerOn(context.lat, context.lng, 14);
        POIManager.showAddModal(context.lat, context.lng, name, category);
        this.clearResults();
        document.getElementById('place-search').value = '';
        this.fetchAndSetPhoto(name, context);
      });
    });

    // Charger les miniatures des 3 premiers résultats
    this._loadSearchThumbnails(deduped);
  },

  async _loadSearchThumbnails(results) {
    await Promise.allSettled(results.slice(0, 3).map(async (r) => {
      const name = this._extractBestName(r);
      const extra = r.extratags || {};
      const context = {
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
        wikidata: extra.wikidata || null,
        wikipedia: extra.wikipedia || null
      };
      const photos = await this.getPhotoGallery(name, 1, context);
      const thumbEl = document.getElementById(`thumb-${r.place_id}`);
      if (!thumbEl || photos.length === 0) return;

      const img = document.createElement('img');
      img.alt = '';
      img.loading = 'lazy';
      img.src = photos[0];
      img.onload = () => {
        if (document.getElementById(`thumb-${r.place_id}`)) {
          thumbEl.innerHTML = '';
          thumbEl.appendChild(img);
        }
      };
    }));
  },

  _prefetchPhoto(placeName, context = {}) {
    const key = this._cacheKey(placeName, context);
    if (!this._photoCache.has(key)) {
      this.getPhotoGallery(placeName, 3, context).catch(() => {});
    }
  },

  // ============================================================
  //  Helpers nom / adresse
  // ============================================================

  _extractBestName(result) {
    const nd = result.namedetails || {};
    const addr = result.address || {};

    if (nd['name:fr'] && this._isLatin(nd['name:fr'])) return nd['name:fr'];
    if (nd['name:en'] && this._isLatin(nd['name:en'])) return nd['name:en'];
    if (nd['int_name'] && this._isLatin(nd['int_name'])) return nd['int_name'];
    if (nd.name && this._isLatin(nd.name)) return nd.name;

    const parts = (result.display_name || '').split(',');
    for (const part of parts) {
      const trimmed = part.trim();
      if (this._isLatin(trimmed) && trimmed.length > 1) return trimmed;
    }

    const addrFields = ['tourism', 'amenity', 'shop', 'building', 'leisure', 'historic', 'name'];
    for (const field of addrFields) {
      if (addr[field] && this._isLatin(addr[field])) return addr[field];
    }

    return parts[0]?.trim() || result.display_name;
  },

  _isLatin(str) {
    if (!str) return false;
    const latinChars = (str.match(/[a-zA-ZÀ-ÿ0-9\s\-'".()\&!?@#]/g) || []).length;
    return latinChars > str.length * 0.5;
  },

  _extractAddress(result) {
    const addr = result.address || {};
    const parts = [];

    const city = addr.city || addr.town || addr.village || addr.suburb || '';
    if (city && this._isLatin(city)) parts.push(city);

    const state = addr.state || addr.province || '';
    if (state && this._isLatin(state)) parts.push(state);

    if (parts.length === 0) {
      const displayParts = (result.display_name || '').split(',');
      for (let i = 1; i < Math.min(displayParts.length, 3); i++) {
        const p = displayParts[i]?.trim();
        if (p && this._isLatin(p)) parts.push(p);
      }
    }

    return parts.join(', ') || 'Japon';
  },

  guessCategory(result) {
    const t = (result.type || '').toLowerCase();
    const c = (result.class || '').toLowerCase();
    if (['place_of_worship', 'temple', 'shrine'].some(x => t.includes(x))) return 'temple';
    if (['restaurant', 'cafe', 'fast_food', 'bar', 'food', 'ramen', 'sushi'].some(x => t.includes(x))) return 'restaurant';
    if (['hotel', 'hostel', 'guest_house', 'ryokan', 'motel'].some(x => t.includes(x))) return 'hotel';
    if (['shop', 'mall', 'marketplace', 'market'].some(x => t.includes(x) || c.includes(x))) return 'shopping';
    if (['park', 'garden', 'nature', 'mountain', 'lake', 'beach', 'volcano', 'forest', 'hot_spring'].some(x => t.includes(x) || c === 'natural')) return 'nature';
    if (['museum', 'theatre', 'arts_centre', 'castle', 'monument', 'ruins', 'historic', 'viewpoint'].some(x => t.includes(x) || c === 'historic')) return 'culture';
    return 'other';
  },

  // ============================================================
  //  Point d'entrée principal — Galerie
  // ============================================================

  /**
   * Affiche la galerie de photos dans le modal.
   * context = { lat, lng, wikidata, wikipedia }
   */
  async fetchAndSetPhoto(placeName, context = {}) {
    this._setGalleryState('loading');
    const photos = await this.getPhotoGallery(placeName, 3, context);
    if (photos.length === 0) {
      this._setGalleryState('empty');
    } else {
      this._renderPhotoGallery(photos);
    }
  },

  /**
   * Retourne un tableau d'URLs de photos.
   * Utilise le contexte (coordonnées, IDs Wikidata/Wikipedia) pour être précis.
   */
  async getPhotoGallery(placeName, maxPhotos = 3, context = {}) {
    const key = this._cacheKey(placeName, context);

    // 1. Cache mémoire
    if (this._photoCache.has(key)) {
      return this._photoCache.get(key).slice(0, maxPhotos);
    }

    // 2. Cache localStorage (7 jours)
    const lsCached = this._getLocalCache('jq_photo_' + key);
    if (lsCached) {
      this._photoCache.set(key, lsCached);
      return lsCached.slice(0, maxPhotos);
    }

    // 3. Fetch avec stratégie priorisée
    const photos = await this._fetchPhotosPrioritized(placeName, context);
    this._photoCache.set(key, photos);
    this._setLocalCache('jq_photo_' + key, photos);
    return photos.slice(0, maxPhotos);
  },

  _cacheKey(placeName, context = {}) {
    // Clé unique par lieu : inclut les coordonnées si disponibles
    const base = placeName.toLowerCase().trim();
    if (context.wikidata) return `wd_${context.wikidata}`;
    if (context.lat && context.lng) {
      return `${base}_${parseFloat(context.lat).toFixed(4)}_${parseFloat(context.lng).toFixed(4)}`;
    }
    return base;
  },

  // ============================================================
  //  Stratégie priorisée (du plus précis au moins précis)
  // ============================================================

  async _fetchPhotosPrioritized(placeName, context = {}) {
    const { lat, lng, wikidata, wikipedia } = context;
    const allPhotos = [];

    // ── NIVEAU 1 : Wikidata P18 (photo officielle du lieu) ──────────
    // C'est la source la plus fiable : la photo de la fiche Wikidata
    if (wikidata) {
      const wdPhotos = await this._fetchWikidataPhotos(wikidata);
      allPhotos.push(...wdPhotos);
      if (allPhotos.length >= 3) return this._dedupePhotos(allPhotos);
    }

    // ── NIVEAU 2 : Article Wikipedia direct (depuis le tag OSM) ─────
    // Si on a `wikipedia=fr:Fushimi Inari-taisha`, on va chercher
    // l'article exact, pas une recherche textuelle
    if (wikipedia) {
      const wpPhoto = await this._fetchWikipediaDirectPhoto(wikipedia);
      if (wpPhoto) allPhotos.push(wpPhoto);
    }

    // ── NIVEAU 3 : Wikipedia geosearch aux coordonnées ───────────────
    // Trouve l'article Wikipedia du lieu physiquement à cet endroit
    if (lat && lng) {
      const geoWpPhotos = await this._fetchWikipediaGeoPhotos(lat, lng);
      allPhotos.push(...geoWpPhotos);
    }

    if (allPhotos.length >= 3) return this._dedupePhotos(allPhotos);

    // ── NIVEAU 4 : Commons geosearch aux coordonnées ─────────────────
    // Trouve des photos géolocalisées prises sur place
    if (lat && lng) {
      const geoCommonsPhotos = await this._fetchCommonsGeoPhotos(lat, lng);
      allPhotos.push(...geoCommonsPhotos);
    }

    if (allPhotos.length >= 3) return this._dedupePhotos(allPhotos);

    // ── NIVEAU 5 : Recherche par nom (fallback) ───────────────────────
    const nameTasks = await Promise.allSettled([
      this._fetchCommonsPhotos(placeName),
      this._fetchCommonsPhotos(`${placeName} Japan`),
      this._fetchWikipediaPagePhotos(placeName, 'fr'),
      this._fetchWikipediaPagePhotos(placeName, 'en'),
    ]);

    for (const r of nameTasks) {
      if (r.status === 'fulfilled') {
        const val = r.value;
        if (Array.isArray(val)) allPhotos.push(...val);
        else if (val) allPhotos.push(val);
      }
    }

    return this._dedupePhotos(allPhotos);
  },

  _dedupePhotos(photos) {
    const seen = new Set();
    return photos.filter(url => {
      if (!url || seen.has(url)) return false;
      seen.add(url);
      return true;
    }).slice(0, 3);
  },

  // ============================================================
  //  Niveau 1 : Wikidata — propriété P18 (image officielle)
  // ============================================================

  async _fetchWikidataPhotos(wikidataId) {
    try {
      // Récupère la propriété P18 (image) depuis Wikidata
      const url = `https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${encodeURIComponent(wikidataId)}&property=P18&format=json&origin=*`;
      const data = await (await fetch(url)).json();
      const claims = data.claims?.P18 || [];

      const filenames = claims
        .filter(c => c.mainsnak?.datavalue?.value)
        .slice(0, 3)
        .map(c => c.mainsnak.datavalue.value);

      if (filenames.length === 0) return [];

      // Convertit les noms de fichiers Commons en URLs de miniatures
      const urls = await Promise.all(filenames.map(fn => this._getCommonsThumbUrl(fn)));
      return urls.filter(Boolean);
    } catch { return []; }
  },

  async _getCommonsThumbUrl(filename) {
    try {
      const url = `https://commons.wikimedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(filename)}&prop=imageinfo&iiprop=url|size&iiurlwidth=800&format=json&origin=*`;
      const data = await (await fetch(url)).json();
      for (const page of Object.values(data.query?.pages || {})) {
        const info = page.imageinfo?.[0];
        if (info && this._isRelevantPhoto(info.url || '', info)) {
          return info.thumburl || info.url;
        }
      }
    } catch {}
    return null;
  },

  // ============================================================
  //  Niveau 2 : Wikipedia direct (depuis le tag OSM wikipedia=xx:Titre)
  // ============================================================

  async _fetchWikipediaDirectPhoto(wikipediaTag) {
    try {
      // Format tag OSM : "fr:Nom de l'article" ou "en:Article Name"
      let lang = 'fr';
      let title = wikipediaTag;
      if (wikipediaTag.includes(':')) {
        const colonIdx = wikipediaTag.indexOf(':');
        const potentialLang = wikipediaTag.slice(0, colonIdx);
        if (potentialLang.length <= 3) {
          lang = potentialLang;
          title = wikipediaTag.slice(colonIdx + 1);
        }
      }

      const base = `https://${lang}.wikipedia.org/w/api.php`;
      const url = `${base}?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&pithumbsize=800&format=json&origin=*&pilicense=any`;
      const data = await (await fetch(url)).json();

      for (const page of Object.values(data.query?.pages || {})) {
        const src = page.thumbnail?.source;
        if (src && this._isRelevantPhoto(src, page.thumbnail)) return src;
      }

      // Fallback : REST summary (image originale pleine résolution)
      const summaryRes = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
      if (summaryRes.ok) {
        const summary = await summaryRes.json();
        const img = summary.originalimage || summary.thumbnail;
        if (img?.source && this._isRelevantPhoto(img.source, img)) return img.source;
      }
    } catch {}
    return null;
  },

  // ============================================================
  //  Niveau 3 : Wikipedia geosearch (article du lieu physique)
  // ============================================================

  async _fetchWikipediaGeoPhotos(lat, lng) {
    try {
      // Cherche les articles Wikipedia near ces coordonnées (rayon 300m)
      const url = `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lng}&gsradius=300&gslimit=5&gsprimarycoordonly=1&format=json&origin=*`;
      const data = await (await fetch(url)).json();
      const articles = data.query?.geosearch || [];
      if (!articles.length) return [];

      const titles = articles.slice(0, 3).map(a => a.title).join('|');
      const imgUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(titles)}&prop=pageimages&pithumbsize=800&format=json&origin=*&pilicense=any`;
      const imgData = await (await fetch(imgUrl)).json();

      const photos = [];
      for (const page of Object.values(imgData.query?.pages || {})) {
        const src = page.thumbnail?.source;
        if (src && this._isRelevantPhoto(src, page.thumbnail)) photos.push(src);
      }
      return photos;
    } catch { return []; }
  },

  // ============================================================
  //  Niveau 4 : Commons geosearch (photos prises sur place)
  // ============================================================

  async _fetchCommonsGeoPhotos(lat, lng) {
    try {
      // API generator : récupère photos + URLs en une seule requête
      const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=geosearch&ggsnamespace=6&ggscoord=${lat}|${lng}&ggsradius=150&ggsprimary=all&ggslimit=12&prop=imageinfo&iiprop=url|size&iiurlwidth=800&format=json&origin=*`;
      const data = await (await fetch(url)).json();
      const pages = Object.values(data.query?.pages || {});

      const photos = [];
      for (const page of pages) {
        const info = page.imageinfo?.[0];
        const title = (page.title || '').toLowerCase();
        if (
          info &&
          this._isValidImageDimensions(info.width, info.height) &&
          this._isRelevantPhoto(info.url || '', info) &&
          !title.includes('map') && !title.includes('plan')
        ) {
          photos.push(info.thumburl || info.url);
        }
      }
      // Trier par taille décroissante (les grandes images d'abord)
      return photos.slice(0, 3);
    } catch { return []; }
  },

  // ============================================================
  //  Niveau 5 : Recherche par nom (fallback)
  // ============================================================

  async _fetchCommonsPhotos(query) {
    try {
      const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srnamespace=6&srlimit=8&format=json&origin=*`;
      const searchData = await (await fetch(searchUrl)).json();
      const rawResults = searchData.query?.search || [];

      const validTitles = rawResults
        .filter(r => {
          const t = r.title.toLowerCase();
          return (t.endsWith('.jpg') || t.endsWith('.jpeg') || t.endsWith('.png')) &&
            !t.includes('logo') && !t.includes('icon') && !t.includes('flag') &&
            !t.includes('emblem') && !t.includes('seal') && !t.includes('map') &&
            !t.includes('location') && !t.includes('locator') && !t.includes('stub') &&
            !t.includes('diagram') && !t.includes('template') && !t.includes('blank') &&
            !t.includes('placeholder') && !t.includes('noimage') && !t.includes('symbol');
        })
        .slice(0, 5)
        .map(r => r.title);

      if (validTitles.length === 0) return [];

      const imgUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(validTitles.join('|'))}&prop=imageinfo&iiprop=url|size&iiurlwidth=800&format=json&origin=*`;
      const imgData = await (await fetch(imgUrl)).json();

      const urls = [];
      for (const page of Object.values(imgData.query?.pages || {})) {
        const info = page.imageinfo?.[0];
        if (info && this._isValidImageDimensions(info.width, info.height)) {
          urls.push(info.thumburl || info.url);
        }
      }
      return urls;
    } catch { return []; }
  },

  async _fetchWikipediaPagePhotos(query, lang) {
    const base = `https://${lang}.wikipedia.org/w/api.php`;
    try {
      const searchUrl = `${base}?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=3&srnamespace=0`;
      const searchData = await (await fetch(searchUrl)).json();
      if (!searchData.query?.search?.length) return null;

      const titles = searchData.query.search.map(a => a.title).join('|');
      const imgUrl = `${base}?action=query&titles=${encodeURIComponent(titles)}&prop=pageimages&pithumbsize=800&format=json&origin=*&pilicense=any`;
      const imgData = await (await fetch(imgUrl)).json();

      for (const page of Object.values(imgData.query?.pages || {})) {
        const src = page.thumbnail?.source;
        if (src && this._isRelevantPhoto(src, page.thumbnail)) return src;
      }

      const firstTitle = encodeURIComponent(searchData.query.search[0].title);
      const summaryRes = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${firstTitle}`);
      if (summaryRes.ok) {
        const summary = await summaryRes.json();
        const img = summary.originalimage || summary.thumbnail;
        if (img?.source && this._isRelevantPhoto(img.source, img)) return img.source;
      }
    } catch {}
    return null;
  },

  // ============================================================
  //  Filtres qualité
  // ============================================================

  _isRelevantPhoto(src, info) {
    if (!src) return false;
    const lower = src.toLowerCase();

    const excludePatterns = [
      'logo', 'icon', 'flag', 'emblem', 'seal', 'coa_', 'coat_of_arms',
      'pictogram', 'symbol', '.svg', 'locator', 'location',
      'diagram', 'chart', 'graph', 'signature', 'autograph', 'ambox',
      'question_book', 'edit-clear', 'crystal_clear', 'nuvola',
      'wikiproject', 'commons-logo', 'stub', 'blank',
      'placeholder', 'noimage', 'template', 'generic', 'thumb_'
    ];
    // Note: 'map' retiré du filtre car des noms de fichiers légitimes peuvent le contenir
    for (const p of excludePatterns) {
      if (lower.includes(p)) return false;
    }

    if (info) {
      return this._isValidImageDimensions(info.width, info.height);
    }
    return true;
  },

  _isValidImageDimensions(w, h) {
    if (!w || !h || w <= 0 || h <= 0) return true;
    if (w < 200 || h < 150) return false;
    const ratio = w / h;
    if (ratio < 0.3 || ratio > 5) return false;
    if (w < 300 && Math.abs(w - h) < 30) return false; // petit carré = logo
    return true;
  },

  // ============================================================
  //  Cache localStorage (7 jours)
  // ============================================================

  _getLocalCache(key) {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      const { data, expires } = JSON.parse(item);
      if (Date.now() > expires) { localStorage.removeItem(key); return null; }
      return data;
    } catch { return null; }
  },

  _setLocalCache(key, data) {
    try {
      const expires = Date.now() + 7 * 24 * 60 * 60 * 1000;
      localStorage.setItem(key, JSON.stringify({ data, expires }));
    } catch { /* quota dépassé */ }
  },

  // ============================================================
  //  Galerie de photos dans le modal
  // ============================================================

  _renderPhotoGallery(photos) {
    const galleryEl = document.getElementById('photo-gallery');
    const previewBox = document.getElementById('photo-preview');
    const previewImg = document.getElementById('photo-preview-img');
    const photoInput = document.getElementById('poi-photo');

    if (photos[0] && previewImg && previewBox && photoInput) {
      photoInput.value = photos[0];
      previewImg.src = photos[0];
      previewImg.onload = () => { previewBox.className = 'modal-photo-area has-photo'; };
      previewImg.onerror = () => { previewBox.className = 'modal-photo-area no-photo'; };
    }

    if (galleryEl) {
      if (photos.length > 1) {
        galleryEl.innerHTML = photos.map((url, i) => `
          <div class="gallery-item ${i === 0 ? 'selected' : ''}" data-url="${this.escapeHtml(url)}">
            <img src="${url}" alt="Photo ${i + 1}" loading="lazy">
            <div class="gallery-check">✓</div>
          </div>
        `).join('');
        galleryEl.style.display = 'grid';

        galleryEl.querySelectorAll('.gallery-item').forEach(item => {
          item.addEventListener('click', () => {
            const url = item.dataset.url;
            if (photoInput) photoInput.value = url;
            if (previewImg && previewBox) {
              previewImg.src = url;
              previewImg.onload = () => { previewBox.className = 'modal-photo-area has-photo'; };
              previewImg.onerror = () => { previewBox.className = 'modal-photo-area no-photo'; };
            }
            galleryEl.querySelectorAll('.gallery-item').forEach(el => {
              el.classList.toggle('selected', el.dataset.url === url);
            });
          });
        });
      } else {
        galleryEl.style.display = 'none';
      }
    }
  },

  _setGalleryState(state) {
    const previewBox = document.getElementById('photo-preview');
    const galleryEl = document.getElementById('photo-gallery');
    if (previewBox) {
      if (state === 'loading') previewBox.className = 'modal-photo-area loading';
      else if (state === 'empty') previewBox.className = 'modal-photo-area no-photo';
    }
    if (galleryEl) galleryEl.style.display = 'none';
  },

  // ============================================================
  //  Compatibilité (suggestions.js, poi.js bouton "Chercher")
  // ============================================================

  async searchWikipediaPhoto(placeName) {
    const photos = await this.getPhotoGallery(placeName, 1);
    return photos[0] || null;
  },

  async searchBestPhoto(placeName) {
    const photos = await this.getPhotoGallery(placeName, 1);
    return photos[0] || null;
  },

  // ============================================================
  //  Utilitaires UI
  // ============================================================

  clearResults() {
    const c = document.getElementById('search-results');
    if (c) { c.innerHTML = ''; c.classList.remove('active'); }
  },

  showLoading() {
    const c = document.getElementById('search-results');
    if (c) {
      c.innerHTML = '<div class="search-loading">⏳ Recherche en cours...</div>';
      c.classList.add('active');
    }
  },

  showError() {
    const c = document.getElementById('search-results');
    if (c) {
      c.innerHTML = '<div class="search-no-results">❌ Erreur de connexion</div>';
      c.classList.add('active');
    }
  },

  escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }
};
