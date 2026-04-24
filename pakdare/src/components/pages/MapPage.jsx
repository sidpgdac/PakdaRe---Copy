import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import L from 'leaflet';
import 'leaflet.heat';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { WARDS } from '../../data/wardData';

// Mumbai bounds (for initial fit)
const MUMBAI_BOUNDS = [
  [18.85, 72.75],
  [19.35, 73.05]
];

// Wider bounds to allow zooming out slightly while still preventing infinite panning
const MAX_PAN_BOUNDS = [
  [18.50, 72.00], // SouthWest expanded
  [19.80, 74.00]  // NorthEast expanded
];

// ── Fallback polygon used only if all network fetches fail ──
const MUMBAI_FALLBACK_LATLNGS = [
  [19.280, 72.780], [19.270, 73.010], [19.190, 73.040],
  [18.970, 73.040], [18.880, 72.980], [18.850, 72.850],
  [18.900, 72.770], [19.050, 72.740], [19.180, 72.770],
];

const BMC_BOUNDARY_CACHE_KEY = 'pakdare-bmc-boundary-v2';

async function fetchBMCBoundaryNetwork() {
  // ── Attempt 1: Nominatim ────────────────────────────────────────
  try {
    const res = await fetch(
      'https://nominatim.openstreetmap.org/search?' +
      'q=Brihanmumbai+Municipal+Corporation&format=json' +
      '&polygon_geojson=1&limit=5&addressdetails=0',
      { headers: { 'Accept-Language': 'en-US,en', 'User-Agent': 'PakdaRe/1.0' } }
    );
    if (res.ok) {
      const data = await res.json();
      const item = data.find(d =>
        d.geojson &&
        (d.geojson.type === 'Polygon' || d.geojson.type === 'MultiPolygon') &&
        d.class === 'boundary'
      );
      if (item?.geojson) {
        console.log('[PakdaRe] BMC boundary loaded from Nominatim');
        return item.geojson;
      }
    }
  } catch (_) {}

  // ── Attempt 2: Overpass API (relation 7888990 = BMC) ────────────
  try {
    const query = encodeURIComponent(
      '[out:json][timeout:25];relation(7888990);out geom;'
    );
    const res = await fetch(
      `https://overpass-api.de/api/interpreter?data=${query}`
    );
    if (res.ok) {
      const data = await res.json();
      const rel = data.elements?.[0];
      if (rel?.members) {
        // Convert Overpass way geometries to a MultiPolygon
        const coords = rel.members
          .filter(m => m.type === 'way' && m.geometry?.length)
          .map(m => [m.geometry.map(pt => [pt.lon, pt.lat])]);
        if (coords.length) {
          console.log('[PakdaRe] BMC boundary loaded from Overpass');
          return { type: 'MultiPolygon', coordinates: coords };
        }
      }
    }
  } catch (_) {}

  // ── Fallback: manually drawn boundary ───────────────────────────
  console.warn('[PakdaRe] Using fallback Mumbai boundary polygon');
  return {
    type: 'Polygon',
    coordinates: [
      [...MUMBAI_FALLBACK_LATLNGS.map(([lat, lng]) => [lng, lat]),
       [MUMBAI_FALLBACK_LATLNGS[0][1], MUMBAI_FALLBACK_LATLNGS[0][0]]]
    ]
  };
}

// sessionStorage cache so the boundary fetch only happens once per browser session
async function fetchBMCBoundary() {
  try {
    const cached = sessionStorage.getItem(BMC_BOUNDARY_CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch (_) {}

  const geojson = await fetchBMCBoundaryNetwork();

  try {
    sessionStorage.setItem(BMC_BOUNDARY_CACHE_KEY, JSON.stringify(geojson));
  } catch (_) {}

  return geojson;
}

/**
 * Given a GeoJSON Geometry (Polygon or MultiPolygon),
 * returns the largest outer ring as [[lat,lng],...] (Leaflet order),
 * downsampled to ≤120 points for clip-path performance.
 */
function extractOuterRing(geojson) {
  let rings = [];
  if (geojson.type === 'Polygon') {
    rings = [geojson.coordinates[0]];
  } else if (geojson.type === 'MultiPolygon') {
    rings = geojson.coordinates.map(p => p[0]);
  }
  if (!rings.length) return MUMBAI_FALLBACK_LATLNGS;

  // Pick the longest ring (most likely the outer city boundary)
  const ring = rings.reduce((a, b) => (a.length >= b.length ? a : b));
  // Downsample to max 120 pts for SVG clip-path performance
  const step = Math.max(1, Math.floor(ring.length / 120));
  return ring
    .filter((_, i) => i % step === 0)
    .map(([lng, lat]) => [lat, lng]); // GeoJSON [lng,lat] → Leaflet [lat,lng]
}

/**
 * Build a GeoJSON "donut" Feature:
 * world bounding box with the Mumbai boundary cut out as a hole.
 */
function buildDonutFeature(geojson) {
  // Outer ring: world bbox (GeoJSON winding)
  const outerRing = [[-180,-90],[180,-90],[180,90],[-180,90],[-180,-90]];
  // Hole: first outer ring of the BMC boundary (GeoJSON [lng,lat])
  let hole = [];
  if (geojson.type === 'Polygon') {
    hole = [...geojson.coordinates[0]];
  } else if (geojson.type === 'MultiPolygon') {
    const ring = geojson.coordinates
      .map(p => p[0])
      .reduce((a, b) => (a.length >= b.length ? a : b));
    hole = [...ring];
  }
  // Close the hole ring
  if (hole.length && (
    hole[0][0] !== hole[hole.length-1][0] ||
    hole[0][1] !== hole[hole.length-1][1]
  )) hole.push(hole[0]);

  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [outerRing, hole] }
  };
}

export default function MapPage({ complaints, onWardClick }) {
  const mapRef = useRef(null);
  const mapInst = useRef(null);
  const layersRef = useRef({
    heat: null,
    bubble: null,
    dengue: null,
    malaria: null,
    water: null,
    gps: null
  });

  const [activeLayers, setActiveLayers] = useState(new Set(['bubbles', 'heatmap', 'dengue', 'malaria', 'water', 'realgps']));
  const [basemap, setBasemap]           = useState('light');
  const [selectedWard, setSelectedWard] = useState(null);
  const [layerDDOpen, setLayerDDOpen]   = useState(false);
  const [mobileLyrOpen, setMobileLyrOpen] = useState(false);
  const [riskOpen, setRiskOpen] = useState(true);
  // Sprint 2 — mobile ward bottom sheet snap state: 'peek' | 'half' | 'full'
  const [wardSnap, setWardSnap]         = useState('peek');
  const [wardSheetOpen, setWardSheetOpen] = useState(false);
  // Sprint 2 — My Location FAB state
  const [locState, setLocState]         = useState('idle'); // idle | loading | ok | err
  const layerDDRef = useRef(null);

  // Single O(N) pass over complaints → per-ward stats map; replaces O(N×27×5) per render
  const wardStatsMap = useMemo(() => {
    const map = {};
    WARDS.forEach(w => { map[w.id] = { total: 0, unresolved: 0, resolved: 0, clusters: 0, breeding: 0 }; });
    complaints.forEach(c => {
      const wid = c.ward || c.ward_id;
      const s = map[wid];
      if (!s) return;
      s.total++;
      if (c.resolved) s.resolved++; else s.unresolved++;
      if (c.category === 'fever-cluster' || c.severity === 'critical') s.clusters++;
      if ((c.category || '').toLowerCase().includes('breeding')) s.breeding++;
    });
    return map;
  }, [complaints]);

  const wardStats = useCallback((wardId) => wardStatsMap[wardId] || { total: 0, unresolved: 0, resolved: 0, clusters: 0, breeding: 0 }, [wardStatsMap]);
  const sortedWards = useMemo(() => [...WARDS].map(w => ({ ...w, ...wardStatsMap[w.id] })).sort((a, b) => b.total - a.total), [wardStatsMap]);

  // Initialize Map Once
  useEffect(() => {
    if (mapInst.current) return;

    // Build the container arrays once
    layersRef.current = {
      heat: L.layerGroup(),
      bubble: L.layerGroup(),
      dengue: L.layerGroup(),
      malaria: L.layerGroup(),
      water: L.layerGroup(),
      gps: L.markerClusterGroup({
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        maxClusterRadius: 50,
        animate: true,
        iconCreateFunction: function(cluster) {
          const count = cluster.getChildCount();
          // Dynamic sizing and coloring based on density
          const r = Math.max(18, Math.min(38, 14 + count * 1.5));
          const sz = r * 2;
          
          let col = '#1a7a6e'; // default safe/low density
          let bg = 'rgba(26,122,110,.15)';
          if (count >= 15) { col = '#E31E24'; bg = 'rgba(227,30,36,.18)'; }
          else if (count >= 8) { col = '#e07820'; bg = 'rgba(224,120,32,.18)'; }
          else if (count >= 4) { col = '#c8b800'; bg = 'rgba(200,184,0,.15)'; }

          const pulse = count >= 15 ? `<div style="position:absolute;inset:0;border-radius:50%;border:2px solid ${col};animation:ripple 2.5s ease-out infinite;pointer-events:none"></div>` : '';
          
          return L.divIcon({
            className: 'marker-cluster-custom',
            html: `<div style="width:${sz}px;height:${sz}px;border-radius:50%;background:${bg};border:2.5px solid ${col};display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:${r > 24 ? 13 : 11}px;font-weight:700;color:${col};box-shadow:0 3px 18px rgba(0,0,0,.28);position:relative;backdrop-filter:blur(4px);">${count}${pulse}</div>`,
            iconSize: [sz, sz],
            iconAnchor: [r, r]
          });
        }
      })
    };

    const map = L.map(mapRef.current, {
      zoomControl: true,
      maxBounds: MAX_PAN_BOUNDS,
      maxBoundsViscosity: 0.8,
      minZoom: 9
    });
    
    map.fitBounds(MUMBAI_BOUNDS);

    const tileLyr = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    layersRef.current.tile = tileLyr;

    // Initial layer add
    activeLayers.forEach(l => {
      const key = l === 'heatmap' ? 'heat' : l === 'bubbles' ? 'bubble' : l === 'realgps' ? 'gps' : l;
      if (layersRef.current[key]) layersRef.current[key].addTo(map);
    });

    mapInst.current = map;

    // ── PANES ──────────────────────────────────────────────────────
    const maskPane   = map.createPane('maskPane');   maskPane.style.zIndex   = '350'; maskPane.style.pointerEvents = 'none';
    const borderPane = map.createPane('borderPane'); borderPane.style.zIndex = '370'; borderPane.style.pointerEvents = 'none';

    // ── BLUR DIV (clip-path updated per map move) ──────────────────
    const mapContainer = mapRef.current;
    const blurDiv = document.createElement('div');
    blurDiv.id = 'mumbai-blur-div';
    blurDiv.style.cssText = [
      'position:absolute','inset:0','z-index:360',
      'pointer-events:none',
      'background:rgba(0,8,32,0.48)',
      'backdrop-filter:blur(5px)',
      '-webkit-backdrop-filter:blur(5px)',
    ].join(';');
    mapContainer.appendChild(blurDiv);

    // Inline SVG clip-path (evenodd = hole = Mumbai shows through)
    const svgNS = 'http://www.w3.org/2000/svg';
    const svgEl = document.createElementNS(svgNS, 'svg');
    svgEl.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
    const defs    = document.createElementNS(svgNS, 'defs');
    const clip    = document.createElementNS(svgNS, 'clipPath');
    clip.id = 'outside-mumbai-clip';
    clip.setAttribute('clipPathUnits', 'userSpaceOnUse');
    const clipPathEl = document.createElementNS(svgNS, 'path');
    clipPathEl.setAttribute('clip-rule',   'evenodd');
    clipPathEl.setAttribute('fill-rule',   'evenodd');
    clip.appendChild(clipPathEl); defs.appendChild(clip); svgEl.appendChild(defs);
    mapContainer.appendChild(svgEl);
    blurDiv.style.clipPath = 'url(#outside-mumbai-clip)';
    blurDiv.style.webkitClipPath = 'url(#outside-mumbai-clip)';

    // Current outer ring in [lat,lng] — starts as fallback, updated after fetch
    let outerRingLatLngs = MUMBAI_FALLBACK_LATLNGS;

    const updateBlur = () => {
      const { x: W, y: H } = map.getSize();
      const outer = `M 0 0 L ${W} 0 L ${W} ${H} L 0 ${H} Z`;
      const pts   = outerRingLatLngs.map(([lat, lng]) => {
        const p = map.latLngToContainerPoint([lat, lng]);
        return `${p.x} ${p.y}`;
      });
      clipPathEl.setAttribute('d', `${outer} M ${pts.join(' L ')} Z`);
    };
    map.on('move zoom moveend zoomend', updateBlur);
    setTimeout(updateBlur, 60);

    // Refs to the border layers so we can clear & redraw after fetch
    let maskLayer   = null;
    let borderLayers = [];

    const drawBoundary = (geojson) => {
      // Remove old layers
      if (maskLayer)   { map.removeLayer(maskLayer);   maskLayer = null; }
      borderLayers.forEach(l => map.removeLayer(l));
      borderLayers = [];

      // Update clip-path outer ring
      outerRingLatLngs = extractOuterRing(geojson);
      updateBlur();

      // Dark donut overlay
      maskLayer = L.geoJSON(buildDonutFeature(geojson), {
        pane: 'maskPane',
        style: { fillColor: '#000820', fillOpacity: 0.50, stroke: false },
      }).addTo(map);

      // ── 3-layer glowing border ──────────────────────────────────
      // Layer 1: wide outer glow
      borderLayers.push(
        L.geoJSON(geojson, {
          pane: 'borderPane',
          style: { fill: false, color: '#00d4ff', weight: 8, opacity: 0.20, className: 'mumbai-glow-ring' },
        }).addTo(map)
      );
      // Layer 2: mid glow
      borderLayers.push(
        L.geoJSON(geojson, {
          pane: 'borderPane',
          style: { fill: false, color: '#00d4ff', weight: 4, opacity: 0.50 },
        }).addTo(map)
      );
      // Layer 3: sharp animated line
      borderLayers.push(
        L.geoJSON(geojson, {
          pane: 'borderPane',
          style: { fill: false, color: '#00ffff', weight: 1.5, opacity: 1.0,
                   dashArray: '14 7', className: 'mumbai-border-anim' },
        }).addTo(map)
      );
    };

    // Draw with fallback immediately (instant render, no wait)
    drawBoundary({
      type: 'Polygon',
      coordinates: [
        [...MUMBAI_FALLBACK_LATLNGS.map(([lat, lng]) => [lng, lat]),
         [MUMBAI_FALLBACK_LATLNGS[0][1], MUMBAI_FALLBACK_LATLNGS[0][0]]]
      ]
    });

    // Then fetch real boundary and upgrade
    fetchBMCBoundary().then(geojson => {
      if (mapInst.current) drawBoundary(geojson);
    });

    return () => {
      map.remove();
      mapInst.current = null;
      blurDiv.remove();
      svgEl.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update Basemap URL
  useEffect(() => {
    if (!layersRef.current.tile) return;
    const urls = {
      dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      street: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    };
    layersRef.current.tile.setUrl(urls[basemap]);
  }, [basemap]);

  // Sync Layers visibility
  useEffect(() => {
    if (!mapInst.current) return;
    const map = mapInst.current;
    
    const layerMap = {
      heatmap: layersRef.current.heat,
      bubbles: layersRef.current.bubble,
      dengue: layersRef.current.dengue,
      malaria: layersRef.current.malaria,
      water: layersRef.current.water,
      realgps: layersRef.current.gps
    };

    Object.keys(layerMap).forEach(key => {
      const lyr = layerMap[key];
      if (!lyr) return;
      if (activeLayers.has(key)) {
        if (!map.hasLayer(lyr)) map.addLayer(lyr);
      } else {
        if (map.hasLayer(lyr)) map.removeLayer(lyr);
      }
    });
  }, [activeLayers]);

  // Rebuild markers only when complaint data changes (NOT on layer toggle)
  useEffect(() => {
    if (!mapInst.current) return;
    const map = mapInst.current;

    // Clear dynamic data layers
    ['bubble', 'dengue', 'malaria', 'water', 'gps'].forEach(k => {
      if (layersRef.current[k]?.clearLayers) layersRef.current[k].clearLayers();
    });
    if (layersRef.current.heat) {
      map.removeLayer(layersRef.current.heat);
      layersRef.current.heat = null;
    }

    // 1. Rebuild Heatmap
    const heatData = WARDS.map(w => [w.lat, w.lng, w.risk / 100]);
    if (L.heatLayer) {
      const heatL = L.heatLayer(heatData, {
        radius: 45, blur: 35, maxZoom: 15, max: 1,
        gradient: { 0: 'rgba(26,122,110,0)', .2: 'rgba(26,122,110,.5)', .4: 'rgba(200,184,0,.7)', .6: 'rgba(224,120,32,.85)', .8: 'rgba(227,30,36,.9)', 1: '#c00' }
      });
      layersRef.current.heat = heatL;
      if (activeLayers.has('heatmap')) heatL.addTo(map);
    }

    // 2. Rebuild Bubbles and Dots using pre-computed wardStatsMap
    WARDS.forEach(w => {
      const st = wardStatsMap[w.id] || { total: 0, unresolved: 0, resolved: 0, clusters: 0, breeding: 0 };
      const cnt = Math.max(st.total, 1);
      const col = w.risk >= 80 ? '#E31E24' : w.risk >= 60 ? '#e07820' : w.risk >= 40 ? '#c8b800' : '#1a7a6e';
      const bg = w.risk >= 80 ? 'rgba(227,30,36,.18)' : w.risk >= 60 ? 'rgba(224,120,32,.18)' : w.risk >= 40 ? 'rgba(200,184,0,.15)' : 'rgba(26,122,110,.15)';
      const r = Math.max(18, Math.min(44, 14 + cnt * 0.9));
      const sz = r * 2;
      const pulse = w.risk >= 80 ? `<div style="position:absolute;inset:0;border-radius:50%;border:2px solid ${col};animation:ripple 2.5s ease-out infinite;pointer-events:none"></div>` : '';

      const icon = L.divIcon({
        className: '',
        html: `<div style="width:${sz}px;height:${sz}px;border-radius:50%;background:${bg};border:2.5px solid ${col};display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:${r > 28 ? 13 : 11}px;font-weight:700;color:${col};box-shadow:0 3px 18px rgba(0,0,0,.28);cursor:pointer;position:relative;">${cnt}${pulse}</div>`,
        iconSize: [sz, sz], iconAnchor: [r, r], popupAnchor: [0, -r - 4]
      });

      const mk = L.marker([w.lat, w.lng], { icon });
      mk.bindPopup(L.popup({ maxWidth: 270 }).setContent(`
        <div class="pu-hdr" style="background:linear-gradient(135deg, ${col}dd, ${col}); color:#fff; padding:12px 16px;">
          <div class="pu-name" style="font-size:17px;font-weight:700;">${w.full}</div>
          <div class="pu-zone" style="font-size:11px;opacity:0.8;">${w.area} · ${w.zone}</div>
        </div>
        <div class="pu-body" style="padding:12px 16px;">
          <div class="pu-row"><span class="pu-l">WMO</span><span class="pu-v n">${w.wmo}</span></div>
          <div class="pu-row"><span class="pu-l">Total complaints</span><span class="pu-v r">${st.total}</span></div>
          <div class="pu-row"><span class="pu-l">Unresolved</span><span class="pu-v o">${st.unresolved}</span></div>
          <div class="pu-row"><span class="pu-l">Breeding sites</span><span class="pu-v o">${st.breeding}</span></div>
          <div class="pu-row"><span class="pu-l">Risk index</span><span class="pu-v r">${w.risk}/100</span></div>
        </div>
        <div class="pu-btns" style="display:flex;gap:6px;padding:10px 12px;background:var(--g50);">
          <button class="pu-btn ob" style="flex:1" onclick="window.__onMapClick__('${w.id}')">📊 Open Profile</button>
        </div>`));

      layersRef.current.bubble.addLayer(mk);

      if (st.clusters > 0) {
        [[.004, .003], [-.003, .005]].slice(0, Math.min(2, st.clusters)).forEach(([dl, dn]) => {
          L.circleMarker([w.lat + dl, w.lng + dn], { radius: 5, fillColor: '#E31E24', color: '#fff', weight: 1.5, fillOpacity: .85 })
            .bindTooltip('Disease cluster · ' + w.area).addTo(layersRef.current.dengue);
        });
      }
      if (st.breeding > 1) {
        L.circleMarker([w.lat - .003, w.lng + .004], { radius: 5, fillColor: '#e07820', color: '#fff', weight: 1.5, fillOpacity: .85 })
          .bindTooltip('Malaria risk · ' + w.area).addTo(layersRef.current.malaria);
      }
      if (st.total > 2) {
        L.circleMarker([w.lat + .002, w.lng - .005], { radius: 5, fillColor: '#1a7a6e', color: '#fff', weight: 1.5, fillOpacity: .85 })
          .bindTooltip('Water issue · ' + w.area).addTo(layersRef.current.water);
      }
    });

    // 3. Rebuild GPS pins (inside-Mumbai bounds only)
    complaints.forEach(c => {
      if (!c.lat || !c.lng) return;
      if (c.lat < MUMBAI_BOUNDS[0][0] || c.lat > MUMBAI_BOUNDS[1][0] || c.lng < MUMBAI_BOUNDS[0][1] || c.lng > MUMBAI_BOUNDS[1][1]) return;
      const col = c.severity === 'critical' ? '#E31E24' : c.severity === 'severe' ? '#e07820' : c.severity === 'moderate' ? '#c8b800' : '#1a7a6e';
      L.circleMarker([c.lat, c.lng], { radius: 8, fillColor: col, color: '#fff', weight: 2.5, fillOpacity: .92 })
        .bindTooltip('📍 ' + (c.location || 'Real submission') + ' — ' + (c.severity || ''))
        .addTo(layersRef.current.gps);
    });

    window.__onMapClick__ = (wid) => {
      setSelectedWard(wid);
      const w = WARDS.find(x => x.id === wid);
      if (w && onWardClick) onWardClick(w);
    };

    setTimeout(() => map.invalidateSize(), 300);
  // wardStatsMap changes only when complaints change, so this is effectively [complaints, onWardClick]
  }, [wardStatsMap, complaints, onWardClick]);

  const toggleLayer = (key) => {
    setActiveLayers(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const focusWard = (w) => {
    if (mapInst.current) mapInst.current.flyTo([w.lat, w.lng], 14, { duration: 1.2 });
    setSelectedWard(w.id);
  };

  // Sprint 2 — My Location FAB handler
  const locateUser = () => {
    if (!navigator.geolocation) return;
    setLocState('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setLocState('ok');
        if (mapInst.current) {
          mapInst.current.flyTo([lat, lng], 15, { duration: 1.2 });
          const icon = L.divIcon({
            className: '',
            html: `<div style="width:18px;height:18px;border-radius:50%;background:#3b82f6;border:3px solid #fff;box-shadow:0 0 0 4px rgba(59,130,246,0.4)"></div>`,
            iconSize: [18, 18], iconAnchor: [9, 9]
          });
          L.marker([lat, lng], { icon }).addTo(mapInst.current)
            .bindPopup('📍 Your Location').openPopup();
        }
        setTimeout(() => setLocState('idle'), 3000);
      },
      () => { setLocState('err'); setTimeout(() => setLocState('idle'), 3000); },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Sprint 2 — cycle ward sheet snap on pill tap
  const cycleWardSnap = () => {
    if (!wardSheetOpen) { setWardSheetOpen(true); setWardSnap('half'); return; }
    if (wardSnap === 'half') { setWardSnap('full'); return; }
    if (wardSnap === 'full') { setWardSheetOpen(false); setWardSnap('peek'); }
  };

  // Force map to resize when sheet opens/closes
  useEffect(() => {
    setTimeout(() => mapInst.current?.invalidateSize(), 320);
  }, [wardSheetOpen, wardSnap]);

  // Optional: Mumbai Boundary Polygon
  // Simply draw a red hollow rectangle to show the geofenced area.
  useEffect(() => {
    if (!mapInst.current) return;
    const rect = L.rectangle(MUMBAI_BOUNDS, {
      color: 'var(--navy)',
      weight: 2,
      fill: false,
      dashArray: '8, 8',
      opacity: 0.5
    });
    rect.addTo(mapInst.current);
    
    return () => { if (mapInst.current) mapInst.current.removeLayer(rect); };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (layerDDRef.current && !layerDDRef.current.contains(e.target)) {
        setLayerDDOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="page active">
      <div className="page-hdr">
        <div className="page-hdr-row">
          <div>
            <h1 className="page-title">Live Ward Map — Mumbai</h1>
            <p className="page-sub">Real-time Leaflet map · Heatmap + bubble clusters · Click any bubble for ward profile · Geofenced to Mumbai</p>
          </div>
        </div>
      </div>

      <div className="map-wrap">
        <div className="map-hdr">
          <div>
            <div className="map-hdr-t">Mumbai · 27 BMC Wards · Public Health Surveillance</div>
            <div className="map-hdr-s">Live tiles · Leaflet.js + CartoDB Voyager · Real-time Filtering</div>
          </div>

          {/* Layer Dropdown — DESKTOP ONLY (hidden on mobile via inline media query style) */}
          <div className="map-layer-dd-wrap" ref={layerDDRef} style={{ display: 'var(--desktop-show, flex)' }}>
            <button
              className={`map-layer-btn ${layerDDOpen ? 'open' : ''}`}
              onClick={() => setLayerDDOpen(o => !o)}
            >
              <span style={{ fontSize: 14 }}>🗂️</span>
              <span>Layers</span>
              <span style={{ fontSize: 9, marginLeft: 2, opacity: .7 }}>{activeLayers.size}/6 active</span>
              <span className="map-layer-btn-caret">{layerDDOpen ? '▲' : '▼'}</span>
            </button>

            {layerDDOpen && (
              <div className="map-layer-dd-panel" style={{ width: 280 }}>
                <div className="mldp-title">Map Style</div>
                <div style={{ display: 'flex', gap: 6, padding: '0 12px 12px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'light', lbl: 'Light' },
                    { id: 'dark', lbl: 'Dark' },
                    { id: 'street', lbl: 'Street' },
                    { id: 'satellite', lbl: 'Sat' }
                  ].map(b => (
                    <button
                      key={b.id}
                      onClick={() => setBasemap(b.id)}
                      style={{
                        padding: '4px 10px', fontSize: 11, fontWeight: 600, borderRadius: 'var(--r-full)',
                        border: '1px solid var(--border2)', cursor: 'pointer',
                        background: basemap === b.id ? 'var(--blue)' : 'var(--glass-bg)',
                        color: basemap === b.id ? '#fff' : 'var(--text-secondary)'
                      }}
                    >{b.lbl}</button>
                  ))}
                </div>

                <div className="mldp-title" style={{ marginTop: 4 }}>Data Layers</div>
                {[
                  { key: 'bubbles', icon: '🔵', label: 'Bubbles',  desc: 'Ward complaint clusters' },
                  { key: 'heatmap', icon: '🔥', label: 'Heatmap',  desc: 'Risk intensity overlay' },
                  { key: 'dengue',  icon: '🦟', label: 'Dengue',   desc: 'Disease cluster markers' },
                  { key: 'malaria', icon: '🦠', label: 'Malaria',  desc: 'Malaria risk zones' },
                  { key: 'water',   icon: '💧', label: 'Water',    desc: 'Water issue points' },
                  { key: 'realgps', icon: '📍', label: 'GPS Pins', desc: 'Real citizen reports' },
                ].map(l => {
                  const on = activeLayers.has(l.key);
                  return (
                    <div
                      key={l.key}
                      className={`mldp-row ${on ? 'on' : ''}`}
                      onClick={() => toggleLayer(l.key)}
                    >
                      <span className="mldp-ico">{l.icon}</span>
                      <div className="mldp-info">
                        <div className="mldp-label">{l.label}</div>
                        <div className="mldp-desc">{l.desc}</div>
                      </div>
                      <div className={`mldp-toggle ${on ? 'on' : ''}`}>
                        <div className="mldp-thumb" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="map-body">
          {/* ── Map canvas ── */}
          <div style={{ position: 'relative', flex: 1 }}>
            <div id="leaflet-map" ref={mapRef} style={{ width: '100%', height: '100%' }}></div>

            {/* ── DESKTOP Legend ── */}
            <div className="map-legend">
              <div className="leg-t">Cluster severity</div>
              <div className="leg-r"><div className="leg-d" style={{ background: '#E31E24' }}></div>Critical</div>
              <div className="leg-r"><div className="leg-d" style={{ background: '#e07820' }}></div>High</div>
              <div className="leg-r"><div className="leg-d" style={{ background: '#c8b800' }}></div>Moderate</div>
              <div className="leg-r"><div className="leg-d" style={{ background: '#1a7a6e' }}></div>Safe</div>
            </div>

            {/* ── MOBILE: floating Layers pill ── */}
            <button
              className="map-mob-layer-pill"
              onClick={() => setMobileLyrOpen(true)}
              style={{ display: 'var(--mobile-show, none)' }}
            >
              <span style={{ fontSize: 15 }}>🗂️</span>
              <span>Layers</span>
              <span className="map-mob-pill-badge">{activeLayers.size}</span>
            </button>

            {/* ════════════════════════════════════════
                SPRINT 2 — Mobile FABs (bottom-right)
                Hidden on desktop via CSS
            ════════════════════════════════════════ */}
            <div className="map-fab-group">
              {/* My Location FAB */}
              <motion.button
                className={`map-fab map-fab-loc ${locState}`}
                onClick={locateUser}
                title="My Location"
                whileTap={{ scale: 0.92 }}
                aria-label="Go to my location"
              >
                {locState === 'loading' ? (
                  <span className="map-fab-spinner" />
                ) : locState === 'ok' ? '✓' : locState === 'err' ? '✕' : '📍'}
              </motion.button>

              {/* Ward Risk Sheet toggle FAB */}
              <motion.button
                className={`map-fab map-fab-wards ${wardSheetOpen ? 'active' : ''}`}
                onClick={cycleWardSnap}
                title="Ward Risk Rankings"
                whileTap={{ scale: 0.92 }}
                aria-label="Toggle ward risk rankings"
                aria-expanded={wardSheetOpen}
              >
                ⚠️
              </motion.button>
            </div>

            {/* ════════════════════════════════════════
                SPRINT 2 — Mobile Ward Risk Bottom Sheet
                3 snap positions: peek (80px) | half (45vh) | full (88vh)
                Desktop: completely hidden
            ════════════════════════════════════════ */}
            <AnimatePresence>
              {wardSheetOpen && (
                <>
                  {/* Scrim */}
                  <div
                    onClick={() => { setWardSheetOpen(false); setWardSnap('peek'); }}
                    style={{
                      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                      zIndex: 9998, backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)'
                    }}
                  />
                  <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', stiffness: 360, damping: 34 }}
                    style={{
                      position: 'fixed', left: 0, right: 0, bottom: 0,
                      zIndex: 9999,
                      background: 'var(--bg-card2)',
                      borderTop: '1px solid var(--border)',
                      borderRadius: '24px 24px 0 0',
                      boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
                      backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
                      display: 'flex', flexDirection: 'column',
                      height: wardSnap === 'peek' ? '140px' : wardSnap === 'half' ? '45vh' : '82vh',
                      paddingBottom: 'calc(76px + env(safe-area-inset-bottom, 0px))',
                      transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  >
                    {/* Drag handle */}
                    <div
                      onClick={cycleWardSnap}
                      style={{ width: '100%', height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'grab', flexShrink: 0 }}
                    >
                      <div style={{ width: 40, height: 5, borderRadius: 3, background: 'var(--border2)' }} />
                    </div>

                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0 20px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>⚠️ Ward Risk Rankings</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sortedWards.length} wards · tap to fly map</div>
                      </div>
                      <button
                        onClick={() => { setWardSheetOpen(false); setWardSnap('peek'); }}
                        style={{
                          width: 40, height: 40, borderRadius: '50%', background: 'var(--glass-bg)',
                          border: 'none', color: 'var(--text-muted)', fontSize: 18,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0
                        }}
                        aria-label="Close ward panel"
                      >✕</button>
                    </div>

                    {/* Scrollable ward list */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px', WebkitOverflowScrolling: 'touch' }}>
                      {sortedWards.map((w, i) => {
                        const maxTotal = sortedWards[0]?.total || 1;
                        const riskPct  = Math.round((w.total / maxTotal) * 100);
                        const riskColor =
                          riskPct >= 75 ? '#E31E24' :
                          riskPct >= 50 ? '#e07820' :
                          riskPct >= 25 ? '#c8b800' : '#1a7a6e';
                        const medals = ['🥇', '🥈', '🥉'];
                        return (
                          <button
                            key={w.id}
                            onClick={() => { focusWard(w); }}
                            style={{
                              display: 'flex', alignItems: 'center', width: '100%', gap: 12, padding: 12,
                              borderRadius: 16, border: selectedWard === w.id ? '1px solid var(--border)' : '1px solid transparent',
                              background: selectedWard === w.id ? 'var(--glass-bg)' : 'transparent',
                              cursor: 'pointer', textAlign: 'left', marginBottom: 2, transition: 'all 0.2s'
                            }}
                          >
                            <span style={{ fontSize: 16, fontWeight: 900, width: 28, textAlign: 'center', color: riskColor }}>
                              {i < 3 ? medals[i] : `#${i + 1}`}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{w.full || w.name}</div>
                              <div style={{ width: '100%', height: 6, background: 'var(--glass-bg2)', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ height: '100%', borderRadius: 3, width: `${riskPct}%`, background: riskColor }} />
                              </div>
                            </div>
                            <span style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--ff-mono)', color: riskColor }}>{w.total}</span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* ── MOBILE: Layer bottom sheet overlay ── */}
            <AnimatePresence>
              {mobileLyrOpen && (
                <>
                  {/* Full-screen scrim */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setMobileLyrOpen(false)}
                    style={{
                      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                      zIndex: 9998, backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)'
                    }}
                  />
                  {/* Bottom sheet drawer */}
                  <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', stiffness: 360, damping: 34 }}
                    style={{
                      position: 'fixed', left: 0, right: 0, bottom: 0,
                      zIndex: 9999,
                      background: 'var(--bg-card2)',
                      borderTop: '1px solid var(--border)',
                      borderRadius: '24px 24px 0 0',
                      boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
                      backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
                      display: 'flex', flexDirection: 'column',
                      maxHeight: '75vh',
                      paddingBottom: 'calc(76px + env(safe-area-inset-bottom, 0px))',
                    }}
                  >
                    {/* Handle */}
                    <div style={{ width: '100%', height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <div style={{ width: 40, height: 5, borderRadius: 3, background: 'var(--border2)' }} />
                    </div>

                    {/* Header with close */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                      <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>🗂️ Map Settings</span>
                      <button
                        onClick={() => setMobileLyrOpen(false)}
                        style={{
                          width: 40, height: 40, borderRadius: '50%', background: 'var(--glass-bg)',
                          border: 'none', color: 'var(--text-muted)', fontSize: 18,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                        }}
                      >✕</button>
                    </div>

                    {/* Scrollable content */}
                    <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                      {/* Map Style */}
                      <div style={{ padding: '16px 16px 4px' }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10 }}>Map Style</div>
                        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                          {[
                            { id: 'light', lbl: 'Light', icon: '☀️' },
                            { id: 'dark',  lbl: 'Dark',  icon: '🌙' },
                            { id: 'street',lbl: 'Street',icon: '🛣️' },
                            { id: 'satellite',lbl: 'Sat', icon: '🛰️' }
                          ].map(b => (
                            <button key={b.id} onClick={() => setBasemap(b.id)}
                              style={{
                                padding: '8px 14px', fontSize: 12, fontWeight: 700, borderRadius: 999,
                                border: '1px solid var(--border2)', cursor: 'pointer', whiteSpace: 'nowrap',
                                display: 'flex', alignItems: 'center', gap: 6,
                                background: basemap === b.id ? 'var(--blue)' : 'var(--glass-bg)',
                                color: basemap === b.id ? '#fff' : 'var(--text-secondary)'
                              }}>
                              <span>{b.icon}</span><span>{b.lbl}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Data Layers */}
                      <div style={{ padding: '12px 16px 0', fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>Data Layers</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '12px 16px' }}>
                        {[
                          { key: 'bubbles', icon: '🔵', label: 'Bubbles',  color: '#3b82f6' },
                          { key: 'heatmap', icon: '🔥', label: 'Heatmap',  color: '#ef4444' },
                          { key: 'dengue',  icon: '🦟', label: 'Dengue',   color: '#e07820' },
                          { key: 'malaria', icon: '🦠', label: 'Malaria',  color: '#f59e0b' },
                          { key: 'water',   icon: '💧', label: 'Water',    color: '#1a7a6e' },
                          { key: 'realgps', icon: '📍', label: 'GPS Pins', color: '#8b5cf6' },
                        ].map(l => {
                          const on = activeLayers.has(l.key);
                          return (
                            <button key={l.key}
                              onClick={() => toggleLayer(l.key)}
                              style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6,
                                padding: '12px 14px', borderRadius: 16,
                                border: on ? `1.5px solid ${l.color}` : '1.5px solid var(--border)',
                                background: on ? `${l.color}12` : 'var(--glass-bg)',
                                position: 'relative', overflow: 'hidden', cursor: 'pointer', textAlign: 'left'
                              }}
                            >
                              <div style={{ fontSize: 22 }}>{l.icon}</div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{l.label}</div>
                              <div style={{
                                position: 'absolute', top: 12, right: 12, width: 8, height: 8,
                                borderRadius: '50%', background: on ? l.color : 'var(--border2)',
                                boxShadow: on ? `0 0 8px ${l.color}` : 'none'
                              }} />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Footer actions */}
                    <div style={{ display: 'flex', gap: 10, padding: 16, borderTop: '1px solid var(--border)', flexShrink: 0 }}>
                      <button
                        onClick={() => setActiveLayers(new Set(['bubbles','heatmap','dengue','malaria','water','realgps']))}
                        style={{ flex: 1, padding: 10, borderRadius: 12, fontSize: 13, fontWeight: 700, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}
                      >✅ All On</button>
                      <button
                        onClick={() => setActiveLayers(new Set())}
                        style={{ flex: 1, padding: 10, borderRadius: 12, fontSize: 13, fontWeight: 700, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}
                      >⛔ All Off</button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>


          {/* Redesigned Ward Risk Panel */}
          {riskOpen ? (
            <div className="map-side">
              <div className="wrs-hdr" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="wrs-title">⚠️ Risk Rankings</div>
                  <div className="wrs-sub">{sortedWards.length} active wards</div>
                </div>
                <button 
                  className="wrs-close-mob" 
                  onClick={() => setRiskOpen(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 20, padding: '0 8px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>
              <div className="wrl" id="map-wrl">
                {sortedWards.map((w, i) => {
                  const maxTotal = sortedWards[0]?.total || 1;
                  const riskPct = Math.round((w.total / maxTotal) * 100);
                  const riskColor =
                    riskPct >= 75 ? '#E31E24' :
                    riskPct >= 50 ? '#e07820' :
                    riskPct >= 25 ? '#c8b800' : '#1a7a6e';
                  const rankCls = i === 0 ? 'wrs-rank-1' : i === 1 ? 'wrs-rank-2' : i === 2 ? 'wrs-rank-3' : 'wrs-rank-n';
                  return (
                    <div
                      key={w.id}
                      className={`wrs-row ${selectedWard === w.id ? 'sel' : ''}`}
                      onClick={() => focusWard(w)}
                    >
                      <div className={`wrs-rank ${rankCls}`}>{i + 1}</div>
                      <div className="wrs-info">
                        <div className="wrs-name">{w.full}</div>
                        <div className="wrs-area">{w.area}</div>
                        <div className="wrs-bar-wrap">
                          <div className="wrs-bar" style={{ width: `${riskPct}%`, background: riskColor }} />
                        </div>
                      </div>
                      <div className="wrs-count" style={{ color: riskColor }}>{w.total}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <button
              className="map-mob-risk-pill"
              onClick={cycleWardSnap}
              style={{
                position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 1000,
                padding: '8px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 'var(--r-full)', color: 'var(--text-primary)', fontSize: 13, fontWeight: 700,
                boxShadow: 'var(--s2)', display: 'var(--mobile-show, none)', alignItems: 'center', gap: 6, cursor: 'pointer'
              }}
            >
              <span>⚠️</span> Show Risk Rankings
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

