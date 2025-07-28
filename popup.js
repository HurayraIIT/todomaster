class TodoMaster {
  constructor() {
    this.tasks = [];
    this.currentFilter = "all";
    this.editingTask = null;
    this.searchQuery = "";
    this.timezone = "+06:00"; // GMT+6
    this.init();
  }

  async init() {
    await this.loadTasks();
    this.bindEvents();
    this.renderTasks();
    this.updateTaskCounters();
  }

  // Load tasks from Firefox storage with persistence
  async loadTasks() {
    try {
      const result = await browser.storage.local.get("todoTasks");
      this.tasks = result.todoTasks || [];
      console.log("Tasks loaded:", this.tasks.length);
    } catch (error) {
      console.error("Error loading tasks:", error);
      this.showNotification("Error loading tasks", "error");
      this.tasks = [];
    }
  }

  // Save tasks to Firefox storage
  async saveTasks() {
    try {
      await browser.storage.local.set({ todoTasks: this.tasks });
      console.log("Tasks saved:", this.tasks.length);
    } catch (error) {
      console.error("Error saving tasks:", error);
      this.showNotification("Error saving tasks", "error");
    }
  }

  // Bind event listeners
  bindEvents() {
    // Add task form
    document.getElementById("addTaskForm").addEventListener("submit", (e) => {
      e.preventDefault();
      this.addTask();
    });

    // Filter tabs
    document.getElementById("allTab").addEventListener("click", () => this.setFilter("all"));
    document.getElementById("todoTab").addEventListener("click", () => this.setFilter("todo"));
    document.getElementById("ongoingTab").addEventListener("click", () => this.setFilter("ongoing"));
    document.getElementById("doneTab").addEventListener("click", () => this.setFilter("done"));

    // Header buttons
    document.getElementById("exportBtn").addEventListener("click", () => this.exportTasks());
    document.getElementById("importBtn").addEventListener("click", () => this.importTasks());
    document.getElementById("clearDoneBtn").addEventListener("click", () => this.clearDone());

    // Search functionality
    const searchInput = document.getElementById("searchInput");
    const clearSearch = document.getElementById("clearSearch");

    searchInput.addEventListener("input", (e) => this.handleSearch(e.target.value));
    clearSearch.addEventListener("click", () => this.clearSearch());

    // Import file handler
    document.getElementById("importFile").addEventListener("change", (e) => this.handleImportFile(e));

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => this.handleKeyboard(e));
  }

  // Add new task
  async addTask() {
    const titleInput = document.getElementById("taskTitle");
    const notesInput = document.getElementById("taskNotes");

    const title = titleInput.value.trim();
    const notes = notesInput.value.trim();

    if (!title) {
      this.showNotification("Task title is required", "error");
      titleInput.classList.add("shake");
      setTimeout(() => titleInput.classList.remove("shake"), 600);
      return;
    }

    const task = {
      id: Date.now().toString(),
      title: this.sanitizeInput(title),
      notes: this.sanitizeInput(notes),
      status: "todo", // Default status
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.tasks.unshift(task);
    await this.saveTasks();

    // Clear form
    titleInput.value = "";
    notesInput.value = "";

    this.renderTasks();
    this.updateTaskCounters();
    this.showNotification("Task added successfully", "success");
  }

  // Update task status
  async updateTaskStatus(taskId, newStatus) {
    const task = this.tasks.find((t) => t.id === taskId);
    if (task) {
      task.status = newStatus;
      task.updatedAt = new Date().toISOString();
      await this.saveTasks();
      this.renderTasks();
      this.updateTaskCounters();
    }
  }

  // Delete task
  async deleteTask(taskId) {
    if (confirm("Are you sure you want to delete this task?")) {
      this.tasks = this.tasks.filter((t) => t.id !== taskId);
      await this.saveTasks();
      this.renderTasks();
      this.updateTaskCounters();
      this.showNotification("Task deleted", "success");
    }
  }

  // Edit task
  editTask(taskId) {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return;

    this.editingTask = taskId;
    this.renderTasks();
  }

  // Save edited task
  async saveEdit(taskId) {
    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
    const titleInput = taskElement.querySelector(".edit-title");
    const notesInput = taskElement.querySelector(".edit-notes");

    const title = titleInput.value.trim();
    const notes = notesInput.value.trim();

    if (!title) {
      this.showNotification("Task title is required", "error");
      titleInput.focus();
      return;
    }

    const task = this.tasks.find((t) => t.id === taskId);
    if (task) {
      task.title = this.sanitizeInput(title);
      task.notes = this.sanitizeInput(notes);
      task.updatedAt = new Date().toISOString();
      await this.saveTasks();
    }

    this.editingTask = null;
    this.renderTasks();
    this.showNotification("Task updated", "success");
  }

  // Cancel edit
  cancelEdit() {
    this.editingTask = null;
    this.renderTasks();
  }

  // Handle search
  handleSearch(query) {
    this.searchQuery = query.toLowerCase().trim();
    const clearSearch = document.getElementById("clearSearch");

    if (this.searchQuery) {
      clearSearch.style.display = "block";
    } else {
      clearSearch.style.display = "none";
    }

    this.renderTasks();
  }

  // Clear search
  clearSearch() {
    document.getElementById("searchInput").value = "";
    this.searchQuery = "";
    document.getElementById("clearSearch").style.display = "none";
    this.renderTasks();
  }

  // Set filter
  setFilter(filter) {
    this.currentFilter = filter;

    // Update tab states
    document.querySelectorAll(".tab-button").forEach((tab) => {
      tab.classList.remove("active");
    });
    document.getElementById(`${filter}Tab`).classList.add("active");

    this.renderTasks();
  }

  // Render tasks with smart sorting
  renderTasks() {
    const taskList = document.getElementById("taskList");
    const emptyState = document.getElementById("emptyState");
    const noResults = document.getElementById("noResults");

    const filteredTasks = this.getFilteredTasks();

    // Hide both empty states initially
    emptyState.style.display = "none";
    noResults.style.display = "none";

    if (filteredTasks.length === 0) {
      if (this.searchQuery) {
        noResults.style.display = "block";
      } else {
        emptyState.style.display = "block";
      }
      // Remove existing task elements
      const existingTasks = taskList.querySelectorAll(".task-item");
      existingTasks.forEach((task) => task.remove());
      return;
    }

    // Smart sorting: ongoing first, then todo, then done at bottom (for "all" tab)
    if (this.currentFilter === "all") {
      filteredTasks.sort((a, b) => {
        const statusOrder = { ongoing: 0, todo: 1, done: 2 };
        if (statusOrder[a.status] !== statusOrder[b.status]) {
          return statusOrder[a.status] - statusOrder[b.status];
        }
        // If same status, sort by updated time (newest first)
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      });
    } else {
      // For specific status tabs, sort by updated time (newest first)
      filteredTasks.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }

    // Clear existing tasks
    const existingTasks = taskList.querySelectorAll(".task-item");
    existingTasks.forEach((task) => task.remove());

    // Render filtered and sorted tasks
    filteredTasks.forEach((task) => {
      const taskElement = this.createTaskElement(task);
      taskList.appendChild(taskElement);
    });
  }

  // Create task element with new design
  createTaskElement(task) {
    const div = document.createElement("div");
    div.className = `task-item status-${task.status} fade-in`;
    div.setAttribute("data-task-id", task.id);
    div.setAttribute("tabindex", "0");

    if (this.editingTask === task.id) {
      div.innerHTML = this.getEditTaskHTML(task);
    } else {
      div.innerHTML = this.getTaskHTML(task);
    }

    this.bindTaskEvents(div, task);
    return div;
  }

  // Get task HTML with status badges
  getTaskHTML(task) {
    const statusLabels = {
      todo: "Todo",
      ongoing: "Ongoing",
      done: "Done",
    };

    let titleHTML = this.highlightSearchText(task.title);
    let notesHTML = task.notes ? this.highlightSearchText(task.notes) : "";

    return `
      <div class="task-content">
        <div class="task-main">
          <div class="task-header">
            <h3 class="task-title">${titleHTML}</h3>
            <span class="task-status-badge ${task.status}">${statusLabels[task.status]}</span>
          </div>
          ${task.notes ? `<p class="task-notes">${notesHTML}</p>` : ""}
          <div class="task-meta">
            <span>Created: ${this.formatDate(task.createdAt)}</span>
            ${task.updatedAt !== task.createdAt ? `<span>Updated: ${this.formatDate(task.updatedAt)}</span>` : ""}
          </div>
        </div>
        <div class="task-actions">
          <select class="status-selector" data-task-id="${task.id}">
            <option value="todo" ${task.status === "todo" ? "selected" : ""}>Todo</option>
            <option value="ongoing" ${task.status === "ongoing" ? "selected" : ""}>Ongoing</option>
            <option value="done" ${task.status === "done" ? "selected" : ""}>Done</option>
          </select>
          <div class="action-buttons">
            <button class="task-btn edit-btn" data-task-id="${task.id}" title="Edit task">
              <svg class="icon" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path>
              </svg>
            </button>
            <button class="task-btn delete-btn" data-task-id="${task.id}" title="Delete task">
              <svg class="icon" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clip-rule="evenodd"></path>
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 012 0v4a1 1 0 11-2 0V7zM12 7a1 1 0 10-2 0v4a1 1 0 002 0V7z" clip-rule="evenodd"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // Get edit task HTML
  getEditTaskHTML(task) {
    return `
      <div class="edit-mode">
        <input type="text" value="${task.title}" 
               class="edit-title"
               maxlength="200">
        <textarea class="edit-notes"
                  rows="2" maxlength="500">${task.notes}</textarea>
        <div class="edit-actions">
          <button class="btn-save save-btn">Save</button>
          <button class="btn-cancel cancel-btn">Cancel</button>
        </div>
      </div>
    `;
  }

  // Bind task-specific events
  bindTaskEvents(element, task) {
    // Status selector
    const statusSelector = element.querySelector(".status-selector");
    if (statusSelector) {
      statusSelector.addEventListener("change", (e) => {
        this.updateTaskStatus(task.id, e.target.value);
      });
    }

    // Edit button
    const editBtn = element.querySelector(".edit-btn");
    if (editBtn) {
      editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.editTask(task.id);
      });
    }

    // Delete button
    const deleteBtn = element.querySelector(".delete-btn");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.deleteTask(task.id);
      });
    }

    // Save edit button
    const saveBtn = element.querySelector(".save-btn");
    if (saveBtn) {
      saveBtn.addEventListener("click", () => this.saveEdit(task.id));
    }

    // Cancel edit button
    const cancelBtn = element.querySelector(".cancel-btn");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => this.cancelEdit());
    }

    // Enter key to save edit
    const editTitle = element.querySelector(".edit-title");
    if (editTitle) {
      editTitle.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.saveEdit(task.id);
        }
      });
    }
  }

  // Get filtered tasks with search
  getFilteredTasks() {
    let filtered = this.tasks;

    // Apply status filter
    if (this.currentFilter !== "all") {
      filtered = filtered.filter((task) => task.status === this.currentFilter);
    }

    // Apply search filter
    if (this.searchQuery) {
      filtered = filtered.filter((task) => {
        const titleMatch = task.title.toLowerCase().includes(this.searchQuery);
        const notesMatch = task.notes.toLowerCase().includes(this.searchQuery);
        return titleMatch || notesMatch;
      });
    }

    return filtered;
  }

  // Highlight search text
  highlightSearchText(text) {
    if (!this.searchQuery) return text;

    const regex = new RegExp(`(${this.escapeRegExp(this.searchQuery)})`, "gi");
    return text.replace(regex, '<span class="search-highlight">$1</span>');
  }

  // Escape regex special characters
  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // Update task counters
  updateTaskCounters() {
    const todoCount = this.tasks.filter((task) => task.status === "todo").length;
    const ongoingCount = this.tasks.filter((task) => task.status === "ongoing").length;
    const doneCount = this.tasks.filter((task) => task.status === "done").length;

    document.getElementById("todoCounter").textContent = todoCount;
    document.getElementById("ongoingCounter").textContent = ongoingCount;
    document.getElementById("doneCounter").textContent = doneCount;
  }

  // Format date to GMT+6 timezone
  formatDate(isoString) {
    const date = new Date(isoString);

    // Convert to GMT+6
    const offset = 6 * 60; // 6 hours in minutes
    const utc = date.getTime() + date.getTimezoneOffset() * 60000;
    const localTime = new Date(utc + offset * 60000);

    const options = {
      month: "short",
      day: "2-digit",
      year: "numeric",
    };

    return localTime.toLocaleDateString("en-US", options);
  }

  // Export tasks
  exportTasks() {
    try {
      const exportData = {
        tasks: this.tasks,
        exportedAt: new Date().toISOString(),
        version: "1.1.0",
        timezone: this.timezone,
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `todomaster-backup-${new Date().toISOString().split("T")[0]}.json`;
      link.click();

      URL.revokeObjectURL(url);
      this.showNotification("Tasks exported successfully", "success");
    } catch (error) {
      console.error("Export error:", error);
      this.showNotification("Error exporting tasks", "error");
    }
  }

  // Import tasks
  importTasks() {
    document.getElementById("importFile").click();
  }

  // Handle import file
  async handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importedData = JSON.parse(text);

      // Handle both old and new format
      let importedTasks = [];
      if (Array.isArray(importedData)) {
        // Old format - direct array
        importedTasks = importedData;
      } else if (importedData.tasks && Array.isArray(importedData.tasks)) {
        // New format - with metadata
        importedTasks = importedData.tasks;
      } else {
        throw new Error("Invalid file format");
      }

      // Validate and sanitize task structure
      const validTasks = importedTasks
        .filter((task) => {
          return task.id && task.title && ["todo", "ongoing", "done"].includes(task.status || "todo");
        })
        .map((task) => ({
          ...task,
          status: task.status || "todo", // Default to 'todo' for old tasks
          notes: task.notes || "",
          createdAt: task.createdAt || new Date().toISOString(),
          updatedAt: task.updatedAt || new Date().toISOString(),
        }));

      if (validTasks.length === 0) {
        throw new Error("No valid tasks found");
      }

      // Merge with existing tasks (avoid duplicates)
      const existingIds = new Set(this.tasks.map((t) => t.id));
      const newTasks = validTasks.filter((task) => !existingIds.has(task.id));

      this.tasks = [...this.tasks, ...newTasks];
      await this.saveTasks();

      this.renderTasks();
      this.updateTaskCounters();
      this.showNotification(`Imported ${newTasks.length} tasks`, "success");
    } catch (error) {
      console.error("Import error:", error);
      this.showNotification("Error importing tasks. Please check file format.", "error");
    }

    // Reset file input
    event.target.value = "";
  }

  // Clear completed tasks
  async clearDone() {
    const doneCount = this.tasks.filter((task) => task.status === "done").length;

    if (doneCount === 0) {
      this.showNotification("No completed tasks to clear", "error");
      return;
    }

    if (confirm(`Are you sure you want to delete ${doneCount} completed task(s)?`)) {
      this.tasks = this.tasks.filter((task) => task.status !== "done");
      await this.saveTasks();
      this.renderTasks();
      this.updateTaskCounters();
      this.showNotification(`Cleared ${doneCount} completed tasks`, "success");
    }
  }

  // Handle keyboard shortcuts
  handleKeyboard(event) {
    // Ctrl/Cmd + Enter to add task when focus is on title input
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      const titleInput = document.getElementById("taskTitle");
      if (document.activeElement === titleInput) {
        event.preventDefault();
        this.addTask();
      }
    }

    // Escape to cancel edit or clear search
    if (event.key === "Escape") {
      if (this.editingTask) {
        this.cancelEdit();
      } else if (this.searchQuery) {
        this.clearSearch();
      }
    }

    // Ctrl/Cmd + F to focus search
    if ((event.ctrlKey || event.metaKey) && event.key === "f") {
      event.preventDefault();
      document.getElementById("searchInput").focus();
    }
  }

  // Sanitize input to prevent XSS
  sanitizeInput(input) {
    const div = document.createElement("div");
    div.textContent = input;
    return div.innerHTML;
  }

  // Show notification
  showNotification(message, type = "success") {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// Initialize the app when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new TodoMaster();
});
