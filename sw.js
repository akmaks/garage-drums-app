// Offline support for the home-screen app.
// Pages: network first (new versions arrive as soon as you are online), cache as fallback.
// Everything else (hashed JS/CSS, sounds, icons): cache first.
const CACHE = 'garage-drums-v2'
/** Android "Share → Garage Drums" (Web Share Target): the shared file waits here until the app picks it up. */
const SHARED = 'garage-drums-shared'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method === 'POST' && new URL(req.url).pathname.endsWith('/share-target')) {
    e.respondWith(
      (async () => {
        const form = await req.formData()
        const file = form.get('file')
        // The name travels too: a shared .mid becomes a project named after its file.
        if (file) await (await caches.open(SHARED)).put('shared-file', new Response(file, { headers: { 'x-file-name': encodeURIComponent(file.name ?? '') } }))
        return Response.redirect('./?shared=1', 303)
      })(),
    )
    return
  }
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(req, copy))
          return res
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./'))),
    )
    return
  }
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copy))
          }
          return res
        }),
    ),
  )
})
