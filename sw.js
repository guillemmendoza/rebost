const CACHE = 'rebost-v1';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('supabase.co')) return; // mai cachegem dades, sempre en directe
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request).catch(() => cached))
  );
});

const SUPABASE_URL = 'https://ohdlepatzsraorbvjrgv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oZGxlcGF0enNyYW9yYnZqcmd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MjA5NDksImV4cCI6MjA5OTA5Njk0OX0.gahxia4ClG9_PETysANESh1cW_eoRNlH01Camnir_7Y';
const EXPIRY_WARN_DAYS = 5;

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'rebost-check') event.waitUntil(checkStock());
});

async function checkStock(){
  try{
    const res = await fetch(`${SUPABASE_URL}/rest/v1/items?select=name,quantity,min_threshold,expiry_date`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    const items = await res.json();
    const today = new Date(); today.setHours(0,0,0,0);
    const low = items.filter((i) => i.min_threshold > 0 && i.quantity <= i.min_threshold);
    const expiring = items.filter((i) => {
      if (!i.expiry_date) return false;
      const d = new Date(i.expiry_date + 'T00:00:00');
      const days = Math.round((d - today) / 86400000);
      return days <= EXPIRY_WARN_DAYS;
    });
    if (low.length === 0 && expiring.length === 0) return;
    const parts = [];
    if (low.length) parts.push(`${low.length} per reposar`);
    if (expiring.length) parts.push(`${expiring.length} que caduquen aviat`);
    self.registration.showNotification('Rebost', { body: parts.join(' · '), icon: 'icon-192.png', badge: 'icon-192.png' });
  }catch(e){}
}
