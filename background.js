// Background script for Firefox extension
// Handles extension lifecycle events

browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("TodoMaster extension installed successfully");

    // Initialize default data structure
    browser.storage.local.set({
      todos: [],
      history: [],
      settings: {
        notifications: true,
      },
    });
  }
});

// Handle storage quota exceeded
browser.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local") {
    // Monitor storage usage
    browser.storage.local.getBytesInUse().then((bytesInUse) => {
      const maxBytes = 5242880; // 5MB limit for local storage
      if (bytesInUse > maxBytes * 0.9) {
        console.warn("Storage usage is high:", bytesInUse, "bytes");
      }
    });
  }
});
