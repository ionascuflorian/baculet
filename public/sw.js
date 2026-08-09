self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {
    title: "Baculet",
    body: "",
    url: "/dashboard",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
  };
  try {
    data = { ...data, ...(event.data ? event.data.json() : {}) };
  } catch {
    /* payload corupt — folosim valorile implicite */
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      data: { url: data.url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/dashboard";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of all) {
        if ("focus" in client) {
          if ("navigate" in client) {
            client.navigate(url);
          }
          await client.focus();
          return;
        }
      }
      await self.clients.openWindow(url);
    })()
  );
});
