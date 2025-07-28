// Background script for TodoMaster v1.1.0
// Enhanced with better persistence and data management

// Extension installation/update handler
browser.runtime.onInstalled.addListener(async (details) => {
  try {
    if (details.reason === "install") {
      console.log("TodoMaster v1.1.0 installed successfully");

      // Initialize storage with empty tasks array if not exists
      const result = await browser.storage.local.get("todoTasks");
      if (!result.todoTasks) {
        await browser.storage.local.set({ todoTasks: [] });
        console.log("Initialized empty tasks storage");
      }

      // Set default settings
      await browser.storage.local.set({
        version: "1.1.0",
        installedAt: new Date().toISOString(),
        timezone: "+06:00", // GMT+6
        features: {
          searchEnabled: true,
          statusTracking: true,
          smartSorting: true,
        },
      });
    } else if (details.reason === "update") {
      console.log("TodoMaster updated to version", browser.runtime.getManifest().version);
      await handleUpdate(details.previousVersion);
    }
  } catch (error) {
    console.error("Error during installation/update:", error);
  }
});

// Handle extension updates and data migration
async function handleUpdate(previousVersion) {
  try {
    const currentVersion = browser.runtime.getManifest().version;

    // Migrate old tasks to new format if needed
    if (compareVersions(previousVersion, "1.1.0") < 0) {
      await migrateToV1_1_0();
    }

    // Update version in storage
    await browser.storage.local.set({
      version: currentVersion,
      updatedAt: new Date().toISOString(),
      previousVersion: previousVersion,
    });

    console.log(`Updated from ${previousVersion} to ${currentVersion}`);
  } catch (error) {
    console.error("Error during update:", error);
  }
}

// Migrate tasks from old format to v1.1.0 format
async function migrateToV1_1_0() {
  try {
    const result = await browser.storage.local.get("todoTasks");
    const tasks = result.todoTasks || [];

    let migrated = 0;
    const updatedTasks = tasks.map((task) => {
      if (!task.status) {
        task.status = task.completed ? "done" : "todo";
        migrated++;
      }
      if (!task.notes) {
        task.notes = "";
      }
      // Remove old 'completed' field if it exists
      if (task.hasOwnProperty("completed")) {
        delete task.completed;
      }
      return task;
    });

    await browser.storage.local.set({ todoTasks: updatedTasks });
    console.log(`Migrated ${migrated} tasks to v1.1.0 format`);
  } catch (error) {
    console.error("Error during migration:", error);
  }
}

// Enhanced storage change listener
browser.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.todoTasks) {
    const oldTasks = changes.todoTasks.oldValue || [];
    const newTasks = changes.todoTasks.newValue || [];

    // Count status changes
    const oldCounts = countTasksByStatus(oldTasks);
    const newCounts = countTasksByStatus(newTasks);

    console.log("Tasks updated:", {
      oldCount: oldTasks.length,
      newCount: newTasks.length,
      statusChanges: {
        todo: newCounts.todo - oldCounts.todo,
        ongoing: newCounts.ongoing - oldCounts.ongoing,
        done: newCounts.done - oldCounts.done,
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// Count tasks by status
function countTasksByStatus(tasks) {
  return tasks.reduce(
    (counts, task) => {
      const status = task.status || "todo";
      counts[status] = (counts[status] || 0) + 1;
      return counts;
    },
    { todo: 0, ongoing: 0, done: 0 }
  );
}

// Enhanced message handling
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background received message:", message);

  switch (message.type) {
    case "GET_VERSION":
      sendResponse({ version: browser.runtime.getManifest().version });
      break;

    case "GET_STATS":
      getTaskStats()
        .then((stats) => sendResponse({ success: true, data: stats }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true;

    case "BACKUP_TASKS":
      handleBackupRequest(message.data)
        .then((result) => sendResponse({ success: true, data: result }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true;

    case "CLEANUP_OLD_TASKS":
      cleanupOldTasks(message.days || 30)
        .then((result) => sendResponse({ success: true, data: result }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true;

    default:
      console.warn("Unknown message type:", message.type);
      sendResponse({ success: false, error: "Unknown message type" });
  }
});

// Get task statistics
async function getTaskStats() {
  try {
    const result = await browser.storage.local.get("todoTasks");
    const tasks = result.todoTasks || [];

    const counts = countTasksByStatus(tasks);
    const dates = tasks.map((t) => new Date(t.createdAt));

    return {
      total: tasks.length,
      counts: counts,
      oldestTask: dates.length > 0 ? new Date(Math.min(...dates)) : null,
      newestTask: dates.length > 0 ? new Date(Math.max(...dates)) : null,
      averageTasksPerDay: calculateAverageTasksPerDay(tasks),
    };
  } catch (error) {
    throw new Error("Failed to get task statistics: " + error.message);
  }
}

// Calculate average tasks created per day
function calculateAverageTasksPerDay(tasks) {
  if (tasks.length === 0) return 0;

  const dates = tasks.map((t) => new Date(t.createdAt).toDateString());
  const uniqueDates = new Set(dates);

  return tasks.length / uniqueDates.size;
}

// Enhanced backup function
async function handleBackupRequest(data) {
  try {
    const result = await browser.storage.local.get(["todoTasks", "version", "timezone"]);
    const settings = await browser.storage.local.get(["features"]);

    return {
      tasks: result.todoTasks || [],
      metadata: {
        version: result.version,
        timezone: result.timezone,
        features: settings.features,
        exportedAt: new Date().toISOString(),
        taskCount: (result.todoTasks || []).length,
        statusCounts: countTasksByStatus(result.todoTasks || []),
      },
    };
  } catch (error) {
    throw new Error("Failed to create backup: " + error.message);
  }
}

// Cleanup old completed tasks
async function cleanupOldTasks(daysOld = 30) {
  try {
    const result = await browser.storage.local.get("todoTasks");
    const tasks = result.todoTasks || [];

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const initialCount = tasks.length;
    const cleanedTasks = tasks.filter((task) => {
      if (task.status === "done") {
        const taskDate = new Date(task.updatedAt || task.createdAt);
        return taskDate > cutoffDate;
      }
      return true; // Keep all non-completed tasks
    });

    const removedCount = initialCount - cleanedTasks.length;

    if (removedCount > 0) {
      await browser.storage.local.set({ todoTasks: cleanedTasks });
    }

    return {
      removedCount,
      remainingCount: cleanedTasks.length,
      cutoffDate: cutoffDate.toISOString(),
    };
  } catch (error) {
    throw new Error("Failed to cleanup old tasks: " + error.message);
  }
}

// Utility function for version comparison
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

// Periodic maintenance (runs when extension starts)
browser.runtime.onStartup.addListener(async () => {
  console.log("TodoMaster extension started - running maintenance");

  try {
    // Auto-cleanup tasks older than 60 days
    const result = await cleanupOldTasks(60);
    if (result.removedCount > 0) {
      console.log(`Auto-cleanup removed ${result.removedCount} old completed tasks`);
    }
  } catch (error) {
    console.error("Error during maintenance:", error);
  }
});

// Error handler for uncaught errors
self.addEventListener("error", (event) => {
  console.error("Background script error:", event.error);
});

// Handle extension shutdown
browser.runtime.onSuspend.addListener(() => {
  console.log("TodoMaster extension suspending");
});

console.log("TodoMaster v1.1.0 background script loaded with enhanced features");
