const cacheId = "$CACHE_ID";
const cacheName = `pwahub-v${cacheId}`;

// Cache all the files to make a PWA
self.addEventListener("install", (event) => {
  console.log("service worker installed.");
  event.waitUntil(
    caches.open(cacheName).then((cache) => {
      // Our application only has two files here index.html and manifest.json
      // but you can add more such as style.css as your app grows
      return cache.addAll([
        "/",
        "/assets/icons/icon-48x48.png",
        "/assets/icons/icon-72x72.png",
        "/assets/icons/icon-96x96.png",
        "/assets/icons/icon-128x128.png",
        "/assets/icons/icon-144x144.png",
        "/assets/icons/icon-152x152.png",
        "/assets/icons/icon-192x192.png",
        "/assets/icons/icon-384x384.png",
        "/assets/icons/icon-512x512.png",
        "/manifest.json",
      ]);
    })
  );
});

self.addEventListener("activate", (event) => {
  console.log("service worker activated.");
  event.waitUntil(
    caches.keys().then((keys) => {
      console.log(keys);

      return Promise.all(
        keys.filter((key) => key !== cacheName).map((key) => caches.delete(key))
      );
    })
  );
});

// Our service worker will intercept all fetch requests
// and check if we have cached the file
// if so it will serve the cached file
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches
      .open(cacheName)
      .then((cache) => cache.match(event.request, { ignoreSearch: true }))
      .then((response) => {
        return response || fetch(event.request);
      })
  );
});
