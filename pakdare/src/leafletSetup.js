import L from 'leaflet';
// Expose L as a browser global so UMD plugins (leaflet.heat, leaflet.markercluster)
// can find it. Vite bundles Leaflet as an ES module and never sets window.L,
// causing "L is not defined" in production builds.
if (typeof window !== 'undefined') window.L = L;
export { L };
