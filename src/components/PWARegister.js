"use client";

import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("Service Worker registered successfully:", reg);
          
          // Request permission for push notifications
          if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission().then((permission) => {
              if (permission === "granted") {
                console.log("Notification permission granted!");
                // Trigger a welcome notification
                reg.showNotification("Boxing Center", {
                  body: "Notifications de planning activées !",
                  icon: "/logo.png",
                  badge: "/logo.png",
                  vibrate: [100, 50, 100],
                });
              }
            });
          }
        })
        .catch((err) => {
          console.error("Service Worker registration failed:", err);
        });
    }
  }, []);

  return null;
}

// Helper to trigger notification from anywhere in client code
export function triggerLocalNotification(title, body) {
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, {
          body,
          icon: "/logo.png",
          badge: "/logo.png",
          vibrate: [100, 50, 100],
        });
      });
    } else {
      new Notification(title, { body, icon: "/logo.png" });
    }
  }
}
