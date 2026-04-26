import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import L from 'leaflet';
import 'leaflet.heat';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { WARDS } from '../../data/wardData';

// Mumbai bounds (for initial fit) - tighter focus on Mumbai city center
const MUMBAI_BOUNDS = [
  [18.92, 72.80],
  [19.25, 72.98]
];

// Wider bounds to allow zooming out slightly while still preventing infinite panning
const MAX_PAN_BOUNDS = [
  [18.85, 72.72], // SouthWest expanded slightly
  [19.35, 73.05]  // NorthEast expanded slightly
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

const CATEGORIES = {
  'mosquito-nuisance':'Mosquito Nuisance','breeding-stagnant':'Stagnant Water',
  'breeding-garbage':'Garbage Breeding','breeding-drain':'Drain Breeding',
  'water-muddy':'Contaminated Water','water-smell':'Bad Water Smell',
  'water-leakage':'Pipeline Leak','sewer-mix':'Sewage Mix',
  'garbage':'Garbage','drain-block':'Blocked Drain',
  'fever-cluster':'Fever Cluster','dengue-case':'Dengue','malaria-case':'Malaria',
};
const SEV_PILL = { critical:'p-crit', severe:'p-sev', moderate:'p-mod', minor:'p-min' };

export default function MapPage({ complaints, onWardClick, fetchComplaintDetail, onOpenReport }) {
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
  // Complaint photo sheet
  const [complaintSheetId,   setComplaintSheetId]   = useState(null);
  const [complaintSheetData, setComplaintSheetData] = useState(null);
  const [loadingSheet,       setLoadingSheet]       = useState(false);
  const layerDDRef = useRef(null);
  // Keep a ref to onWardClick so the map init effect never needs to re-run
  // just because the parent re-renders and passes a new function reference.
  const onWardClickRef = useRef(onWardClick);
  useEffect(() => { onWardClickRef.current = onWardClick; }, [onWardClick]);

  // Single O(N) pass over complaints → per-ward stats map; replaces O(N×26×5) per render
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
      zoomControl: false,   // we'll reposition it
      preferCanvas: true,   // ✅ canvas rendering — far fewer DOM nodes on mobile
      maxBounds: MAX_PAN_BOUNDS,
      maxBoundsViscosity: 0.8,
      minZoom: 11
    });

    // Move zoom control to bottom-right so it's thumb-reachable on mobile
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    
    map.fitBounds(MUMBAI_BOUNDS, { padding: [50, 50], maxZoom: 13 });

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
      if (!map) return;
      const { x: W, y: H } = map.getSize();
      const outer = `M 0 0 L ${W} 0 L ${W} ${H} L 0 ${H} Z`;
      const pts   = outerRingLatLngs.map(([lat, lng]) => {
        try {
          const p = map.latLngToContainerPoint([lat, lng]);
          return `${p.x} ${p.y}`;
        } catch(e) { return "0 0"; }
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
      map._pakdarePopupCleanup?.();
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
        gradient: { 0: 'rgba(254,237,222,0)', 0.2: '#fdbe85', 0.4: '#fd8d3c', 0.6: '#e6550d', 0.8: '#a63603', 1: '#7f2704' }
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
      const isCrit = w.risk >= 80;
      const pulseHtml = isCrit ? `
        <div class="hud-radar" style="color:${col}"></div>
        <div class="hud-dash-ring" style="color:${col}"></div>
        <div class="hud-crosshair" style="color:${col}"></div>
        <div class="marker-anim-pulse"></div>
      ` : '';
      const iconHtml = `
        <div class="map-marker-container">
          <div class="map-marker-glow" style="background:${col}; opacity: ${isCrit ? 0.8 : 0.4}; filter: blur(${isCrit ? 8 : 4}px);"></div>
          ${pulseHtml}
          <div class="map-marker-core" style="width:${sz}px;height:${sz}px;background:${bg};border:2px solid ${col};color:${col};font-size:${r > 28 ? 14 : 12}px;">
            ${cnt}
          </div>
        </div>
      `;

      const icon = L.divIcon({
        className: '',
        html: iconHtml,
        iconSize: [sz, sz], iconAnchor: [r, r], popupAnchor: [0, -r - 4]
      });

      const mk = L.marker([w.lat, w.lng], { icon });
      mk.bindPopup(L.popup({ maxWidth: 270 }).setContent(`
        <div class="pu-hdr" style="background:linear-gradient(135deg, ${col}dd, ${col}); color:#fff; padding:12px 16px;">
          <div class="pu-name" style="font-size:17px;font-weight:700;">${w.full}</div>
          <div class="pu-zone" style="font-size:11px;opacity:0.8;">${w.area} · ${w.zone}</div>
        </div>
        <div class="pu-body" style="padding:12px 16px;">
          <div class="pu-row"><span class="pu-l">M.O.H.</span><span class="pu-v n">${w.wmo}</span></div>
          <div class="pu-row"><span class="pu-l">S.I.</span><span class="pu-v n">${w.siTeam?.[0]?.name || 'N/A'}</span></div>
          <div class="pu-row"><span class="pu-l">Total complaints</span><span class="pu-v r">${st.total}</span></div>
          <div class="pu-row"><span class="pu-l">Unresolved</span><span class="pu-v o">${st.unresolved}</span></div>
          <div class="pu-row"><span class="pu-l">Breeding sites</span><span class="pu-v o">${st.breeding}</span></div>
          <div class="pu-row"><span class="pu-l">Risk index</span><span class="pu-v r">${w.risk}/100</span></div>
        </div>
        <div class="pu-btns" style="display:flex;gap:6px;padding:10px 12px;background:var(--g50);">
          <button class="pu-btn ob" style="flex:1" data-wid="${w.id}">📊 Open Profile</button>
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

    // 3. Rebuild GPS pins (inside-Mumbai bounds only) — tap opens photo sheet
    complaints.forEach(c => {
      if (!c.lat || !c.lng) return;
      if (c.lat < MUMBAI_BOUNDS[0][0] || c.lat > MUMBAI_BOUNDS[1][0] || c.lng < MUMBAI_BOUNDS[0][1] || c.lng > MUMBAI_BOUNDS[1][1]) return;
      const col = c.severity === 'critical' ? '#E31E24' : c.severity === 'severe' ? '#e07820' : c.severity === 'moderate' ? '#c8b800' : '#1a7a6e';
      // Next-level GPS pin with micro-interactions
      const isRes = c.status === 'Resolved';
      const animClass = isRes ? '' : (c.severity === 'critical' ? 'marker-anim-pulse' : 'marker-anim-breathe');
      const rippleHtml = (!isRes && c.severity === 'critical') ? `
        <div class="hud-radar" style="color:${col}"></div>
        <div class="hud-crosshair" style="color:${col}; inset:-8px"></div>
        <div class="marker-anim-ripple" style="color:${col}; opacity: 0.5;"></div>
      ` : '';
      
      const pinHtml = `
        <div class="map-marker-container" style="width:44px; height:44px; cursor:pointer; opacity: ${isRes ? 0.6 : 1};">
          <div class="map-marker-glow" style="background:${col}; width:20px; height:20px; top:12px; left:12px; filter: blur(6px);"></div>
          ${rippleHtml}
          <div class="map-marker-core ${animClass}" style="width:16px;height:16px;background:${col};border:2px solid #fff; position:absolute; top:14px; left:14px;"></div>
        </div>
      `;

      const pinIcon = L.divIcon({
        className: '',
        html: pinHtml,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });
      const pin = L.marker([c.lat, c.lng], { icon: pinIcon });
      pin.bindTooltip('📍 ' + (c.location || 'Citizen report'));
      pin.on('click', () => {
        setComplaintSheetId(c.id);
        setComplaintSheetData(c);
        setLoadingSheet(!!fetchComplaintDetail);
      });
      pin.addTo(layersRef.current.gps);
    });

    // ✅ Event delegation — replaces the XSS-prone window.__onMapClick__ global.
    // All popup "Open Profile" buttons use data-wid="W"; one listener handles all.
    const mapContainer = mapRef.current;
    const handlePopupClick = (e) => {
      const btn = e.target.closest('[data-wid]');
      if (!btn) return;
      const wid = btn.dataset.wid;
      setSelectedWard(wid);
      const w = WARDS.find(x => x.id === wid);
      if (w) onWardClickRef.current?.(w);
    };
    mapContainer.addEventListener('click', handlePopupClick);
    // Store cleanup fn on the map instance so the return() below can access it
    map._pakdarePopupCleanup = () => mapContainer.removeEventListener('click', handlePopupClick);

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

  // Fetch full complaint (with photos) when sheet opens
  useEffect(() => {
    if (!complaintSheetId) return;
    if (!fetchComplaintDetail) { setLoadingSheet(false); return; }
    setLoadingSheet(true);
    fetchComplaintDetail(complaintSheetId).then(full => {
      if (full) setComplaintSheetData(full);
      setLoadingSheet(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complaintSheetId]);

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
    <div className="map-full-wrap">

      <div className="map-wrap">
        <div className="map-hdr" style={{ justifyContent: 'flex-end', padding: '6px 16px', minHeight: 0 }}>

          {/* Layer Dropdown — DESKTOP ONLY */}
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
                    <div style={{ flex: 1, overflowY: 'auto', padding: '6px 12px 12px', WebkitOverflowScrolling: 'touch' }}>
                      {sortedWards.map((w, i) => {
                        const maxTotal = sortedWards[0]?.total || 1;
                        const riskPct  = Math.round((w.total / maxTotal) * 100);
                        const riskColor =
                          riskPct >= 75 ? '#E31E24' :
                          riskPct >= 50 ? '#e07820' :
                          riskPct >= 25 ? '#c8b800' : '#1a7a6e';
                        const riskBg =
                          riskPct >= 75 ? 'rgba(227,30,36,0.08)' :
                          riskPct >= 50 ? 'rgba(224,120,32,0.08)' :
                          riskPct >= 25 ? 'rgba(200,184,0,0.07)' : 'rgba(26,122,110,0.07)';
                        const rankBg =
                          i === 0 ? 'linear-gradient(135deg,#f59e0b,#fbbf24)' :
                          i === 1 ? 'linear-gradient(135deg,#94a3b8,#cbd5e1)' :
                          i === 2 ? 'linear-gradient(135deg,#ea580c,#f97316)' : null;
                        const rankTxt = i < 3 ? (i === 1 ? '#000' : '#fff') : riskColor;
                        return (
                          <button
                            key={w.id}
                            onClick={() => { focusWard(w); }}
                            style={{
                              display: 'flex', alignItems: 'center', width: '100%', gap: 12, padding: '10px 12px',
                              borderRadius: 14,
                              border: `1px solid ${selectedWard === w.id ? riskColor + '55' : 'transparent'}`,
                              background: selectedWard === w.id ? riskBg : (i < 3 ? riskBg : 'transparent'),
                              cursor: 'pointer', textAlign: 'left', marginBottom: 4,
                              transition: 'all 0.18s',
                            }}
                          >
                            {/* Rank badge */}
                            <div style={{
                              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                              background: rankBg || 'rgba(255,255,255,0.06)',
                              border: rankBg ? 'none' : `1.5px solid ${riskColor}44`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, fontWeight: 900, fontFamily: 'var(--ff-mono)',
                              color: rankTxt,
                              boxShadow: rankBg ? `0 2px 10px ${riskColor}40` : 'none',
                            }}>
                              {i + 1}
                            </div>

                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {w.full || w.name}
                              </div>
                              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {w.area}
                              </div>
                              <div style={{ width: '100%', height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ height: '100%', borderRadius: 3, width: `${riskPct}%`, background: `linear-gradient(90deg, ${riskColor}cc, ${riskColor})`, transition: 'width 0.5s ease' }} />
                              </div>
                            </div>

                            {/* Count badge */}
                            <div style={{
                              padding: '3px 9px', borderRadius: 20, flexShrink: 0,
                              background: `${riskColor}22`,
                              border: `1px solid ${riskColor}44`,
                              fontSize: 13, fontWeight: 800, fontFamily: 'var(--ff-mono)',
                              color: riskColor,
                            }}>
                              {w.total}
                            </div>
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

      {/* ── REPORT FAB — always visible on map ──────────────── */}
      {onOpenReport && (
        <button className="map-report-fab" onClick={onOpenReport} aria-label="Report a health issue">
          <span style={{ fontSize: 22 }}>➕</span>
          <span className="map-report-fab-label">Report Issue</span>
        </button>
      )}

      {/* ══════════════════════════════════════════════
          COMPLAINT PHOTO BOTTOM SHEET
          Opens when a GPS pin is tapped on the map
      ══════════════════════════════════════════════ */}
      <AnimatePresence>
        {complaintSheetId && (
          <>
            <div
              onClick={() => { setComplaintSheetId(null); setComplaintSheetData(null); }}
              style={{ position:'fixed', inset:0, zIndex:9997, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(3px)', WebkitBackdropFilter:'blur(3px)' }}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type:'spring', stiffness:380, damping:36 }}
              style={{
                position:'fixed', left:0, right:0, bottom:0, zIndex:9998,
                background:'var(--bg-card2)',
                borderRadius:'24px 24px 0 0',
                boxShadow:'0 -8px 48px rgba(0,0,0,0.55)',
                backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)',
                maxHeight:'88vh', display:'flex', flexDirection:'column',
                paddingBottom:'calc(72px + env(safe-area-inset-bottom,0px))',
              }}
            >
              {/* Drag handle */}
              <div style={{ width:'100%', height:24, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, cursor:'pointer' }}
                onClick={() => { setComplaintSheetId(null); setComplaintSheetData(null); }}>
                <div style={{ width:40, height:5, borderRadius:3, background:'var(--border2)' }} />
              </div>

              {/* Photo */}
              {loadingSheet ? (
                <div style={{ height:160, display:'flex', alignItems:'center', justifyContent:'center', background:'var(--glass-bg)', flexShrink:0 }}>
                  <div className="spinner" style={{ width:28, height:28, borderWidth:3 }} />
                </div>
              ) : complaintSheetData?.photos?.[0] ? (
                <img
                  src={complaintSheetData.photos[0]}
                  alt="Evidence"
                  style={{ width:'100%', height:200, objectFit:'cover', flexShrink:0 }}
                />
              ) : (
                <div style={{ height:110, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'var(--glass-bg)', flexShrink:0, gap:6 }}>
                  <span style={{ fontSize:36 }}>📷</span>
                  <span style={{ fontSize:11, color:'var(--text-muted)' }}>No photo attached</span>
                </div>
              )}

              {/* Content */}
              <div style={{ overflowY:'auto', flex:1, padding:'16px 20px', WebkitOverflowScrolling:'touch' }}>
                {/* Title row */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, marginBottom:10 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:17, fontWeight:800, color:'var(--text-primary)', lineHeight:1.25 }}>
                      {CATEGORIES[complaintSheetData?.category] || 'Health Complaint'}
                    </div>
                    <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>
                      📍 {complaintSheetData?.location || 'Mumbai'}
                    </div>
                  </div>
                  <button
                    onClick={() => { setComplaintSheetId(null); setComplaintSheetData(null); }}
                    style={{ width:32, height:32, borderRadius:'50%', border:'1px solid var(--border2)', background:'var(--glass-bg)', color:'var(--text-muted)', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}
                  >✕</button>
                </div>

                {/* Pills */}
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>
                  <span className={`pill ${SEV_PILL[complaintSheetData?.severity] || 'p-mod'}`}>{complaintSheetData?.severity || 'moderate'}</span>
                  {complaintSheetData?.resolved
                    ? <span className="pill p-done">✅ Resolved</span>
                    : <span className="pill p-prog">⏳ {complaintSheetData?.status || 'Open'}</span>
                  }
                  {complaintSheetData?.gpsVerified && <span className="pill" style={{ background:'rgba(16,185,129,0.12)', color:'var(--green2)', border:'1px solid rgba(16,185,129,0.25)' }}>✓ GPS Verified</span>}
                </div>

                {/* Description */}
                {complaintSheetData?.desc && (
                  <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.65, background:'var(--glass-bg)', borderRadius:'var(--r12)', padding:'12px 14px', border:'1px solid var(--border)', marginBottom:12 }}>
                    {complaintSheetData.desc}
                  </p>
                )}

                {/* Meta */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {[
                    ['Assigned To', complaintSheetData?.assignedTo || 'Pending'],
                    ['ID', complaintSheetData?.id],
                  ].map(([l, v]) => v && (
                    <div key={l} style={{ background:'var(--glass-bg)', borderRadius:'var(--r8)', padding:'8px 10px', border:'1px solid var(--border)' }}>
                      <div style={{ fontSize:9, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:.6, marginBottom:3 }}>{l}</div>
                      <div style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v}</div>
                    </div>
                  ))}
                </div>

                {/* Resolution photo */}
                {complaintSheetData?.resolutionPhoto && (
                  <div style={{ marginTop:12 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:.6, marginBottom:6 }}>Resolution Photo</div>
                    <img src={complaintSheetData.resolutionPhoto} alt="Resolution" style={{ width:'100%', borderRadius:'var(--r12)', maxHeight:160, objectFit:'cover' }} />
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

