// Background script for TodoMaster
// Handles extension installation and updates

// Extension installation/update handler
browser.runtime.onInstalled.addListener(async (details) => {
  try {
    if (details.reason === "install") {
      console.log("TodoMaster installed successfully");

      // Initialize storage with empty tasks array if not exists
      const result = await browser.storage.local.get("todoTasks");
      if (!result.todoTasks) {
        await browser.storage.local.set({ todoTasks: [] });
        console.log("Initialized empty tasks storage");
      }

      // Set default settings
      await browser.storage.local.set({
        version: "1.0.0",
        installedAt: new Date().toISOString(),
      });
    } else if (details.reason === "update") {
      console.log("TodoMaster updated to version", browser.runtime.getManifest().version);

      // Handle any migration logic for future updates
      await handleUpdate(details.previousVersion);
    }
  } catch (error) {
    console.error("Error during installation/update:", error);
  }
});

// Handle extension updates and data migration
async function handleUpdate(previousVersion) {
  try {
    // Get current version
    const currentVersion = browser.runtime.getManifest().version;

    // Update version in storage
    await browser.storage.local.set({
      version: currentVersion,
      updatedAt: new Date().toISOString(),
      previousVersion: previousVersion,
    });

    // Future migration logic would go here
    // Example:
    // if (compareVersions(previousVersion, '1.1.0') < 0) {
    //     await migrateToV1_1_0();
    // }

    console.log(`Updated from ${previousVersion} to ${currentVersion}`);
  } catch (error) {
    console.error("Error during update:", error);
  }
}

// Storage change listener (for debugging and monitoring)
browser.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.todoTasks) {
    const oldTasks = changes.todoTasks.oldValue || [];
    const newTasks = changes.todoTasks.newValue || [];

    console.log("Tasks updated:", {
      oldCount: oldTasks.length,
      newCount: newTasks.length,
      timestamp: new Date().toISOString(),
    });
  }
});

// Handle browser action click (in case popup fails to open)
browser.browserAction.onClicked.addListener((tab) => {
  console.log("Browser action clicked, popup should have opened");
  // This event typically doesn't fire when popup is set,
  // but it's good to have for debugging
});

// Cleanup function for when extension is disabled/uninstalled
browser.runtime.onSuspend.addListener(() => {
  console.log("TodoMaster extension suspending");
  // Perform any necessary cleanup
});

// Error handler for uncaught errors
self.addEventListener("error", (event) => {
  console.error("Background script error:", event.error);
});

// Handle extension startup
browser.runtime.onStartup.addListener(() => {
  console.log("TodoMaster extension started");
});

// Message handling for future features
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background received message:", message);

  // Handle different message types
  switch (message.type) {
    case "GET_VERSION":
      sendResponse({ version: browser.runtime.getManifest().version });
      break;

    case "BACKUP_TASKS":
      // Future feature: automatic backup
      handleBackupRequest(message.data)
        .then((result) => sendResponse({ success: true, data: result }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true; // Keep message channel open for async response

    default:
      console.warn("Unknown message type:", message.type);
      sendResponse({ success: false, error: "Unknown message type" });
  }
});

// Future function for handling backup requests
async function handleBackupRequest(data) {
  try {
    // This could be enhanced to handle automatic backups
    const result = await browser.storage.local.get("todoTasks");
    return {
      tasks: result.todoTasks || [],
      timestamp: new Date().toISOString(),
      version: browser.runtime.getManifest().version,
    };
  } catch (error) {
    throw new Error("Failed to create backup: " + error.message);
  }
}

// Utility function for version comparison (for future updates)
function compareVersions(v1, v2) {
  const parts1 = v1.split(".").map(Number);
  const parts2 = v2.split(".").map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;

    if (part1 < part2) return -1;
    if (part1 > part2) return 1;
  }

  return 0;
}

console.log("TodoMaster background script loaded");
