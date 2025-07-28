class TodoMaster {
  constructor() {
    this.tasks = [];
    this.currentFilter = "all";
    this.editingTask = null;
    this.init();
  }

  async init() {
    await this.loadTasks();
    this.bindEvents();
    this.renderTasks();
    this.updateTaskCounter();
  }

  // Load tasks from Firefox storage
  async loadTasks() {
    try {
      const result = await browser.storage.local.get("todoTasks");
      this.tasks = result.todoTasks || [];
    } catch (error) {
      console.error("Error loading tasks:", error);
      this.showNotification("Error loading tasks", "error");
    }
  }

  // Save tasks to Firefox storage
  async saveTasks() {
    try {
      await browser.storage.local.set({ todoTasks: this.tasks });
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
    document.getElementById("pendingTab").addEventListener("click", () => this.setFilter("pending"));
    document.getElementById("completedTab").addEventListener("click", () => this.setFilter("completed"));

    // Header buttons
    document.getElementById("exportBtn").addEventListener("click", () => this.exportTasks());
    document.getElementById("importBtn").addEventListener("click", () => this.importTasks());
    document.getElementById("clearCompletedBtn").addEventListener("click", () => this.clearCompleted());

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
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.tasks.unshift(task);
    await this.saveTasks();

    // Clear form
    titleInput.value = "";
    notesInput.value = "";

    this.renderTasks();
    this.updateTaskCounter();
    this.showNotification("Task added successfully", "success");
  }

  // Toggle task completion
  async toggleTask(taskId) {
    const task = this.tasks.find((t) => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      task.updatedAt = new Date().toISOString();
      await this.saveTasks();
      this.renderTasks();
      this.updateTaskCounter();
    }
  }

  // Delete task
  async deleteTask(taskId) {
    if (confirm("Are you sure you want to delete this task?")) {
      this.tasks = this.tasks.filter((t) => t.id !== taskId);
      await this.saveTasks();
      this.renderTasks();
      this.updateTaskCounter();
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

  // Render tasks
  renderTasks() {
    const taskList = document.getElementById("taskList");
    const emptyState = document.getElementById("emptyState");

    const filteredTasks = this.getFilteredTasks();

    if (filteredTasks.length === 0) {
      emptyState.style.display = "block";
      // Remove existing task elements
      const existingTasks = taskList.querySelectorAll(".task-item");
      existingTasks.forEach((task) => task.remove());
      return;
    }

    emptyState.style.display = "none";

    // Clear existing tasks
    const existingTasks = taskList.querySelectorAll(".task-item");
    existingTasks.forEach((task) => task.remove());

    // Render filtered tasks
    filteredTasks.forEach((task) => {
      const taskElement = this.createTaskElement(task);
      taskList.appendChild(taskElement);
    });
  }

  // Create task element
  createTaskElement(task) {
    const div = document.createElement("div");
    div.className = `task-item ${task.completed ? "task-completed" : ""} fade-in`;
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

  // Get task HTML
  getTaskHTML(task) {
    return `
            <div class="task-content">
                <input type="checkbox" ${task.completed ? "checked" : ""} 
                       class="custom-checkbox task-checkbox" 
                       data-task-id="${task.id}">
                <div class="task-main">
                    <h3 class="task-title">${task.title}</h3>
                    ${task.notes ? `<p class="task-notes">${task.notes}</p>` : ""}
                    <p class="task-meta">
                        Created: ${new Date(task.createdAt).toLocaleString()}
                    </p>
                </div>
                <div class="task-actions">
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
    // Checkbox toggle
    const checkbox = element.querySelector(".task-checkbox");
    if (checkbox) {
      checkbox.addEventListener("change", () => this.toggleTask(task.id));
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

  // Get filtered tasks
  getFilteredTasks() {
    switch (this.currentFilter) {
      case "pending":
        return this.tasks.filter((task) => !task.completed);
      case "completed":
        return this.tasks.filter((task) => task.completed);
      default:
        return this.tasks;
    }
  }

  // Update task counter
  updateTaskCounter() {
    const pendingCount = this.tasks.filter((task) => !task.completed).length;
    document.getElementById("taskCounter").textContent = pendingCount;
  }

  // Export tasks
  exportTasks() {
    try {
      const dataStr = JSON.stringify(this.tasks, null, 2);
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
      const importedTasks = JSON.parse(text);

      if (!Array.isArray(importedTasks)) {
        throw new Error("Invalid file format");
      }

      // Validate task structure
      const validTasks = importedTasks.filter((task) => task.id && task.title && typeof task.completed === "boolean");

      if (validTasks.length === 0) {
        throw new Error("No valid tasks found");
      }

      // Merge with existing tasks (avoid duplicates)
      const existingIds = new Set(this.tasks.map((t) => t.id));
      const newTasks = validTasks.filter((task) => !existingIds.has(task.id));

      this.tasks = [...this.tasks, ...newTasks];
      await this.saveTasks();

      this.renderTasks();
      this.updateTaskCounter();
      this.showNotification(`Imported ${newTasks.length} tasks`, "success");
    } catch (error) {
      console.error("Import error:", error);
      this.showNotification("Error importing tasks. Please check file format.", "error");
    }

    // Reset file input
    event.target.value = "";
  }

  // Clear completed tasks
  async clearCompleted() {
    const completedCount = this.tasks.filter((task) => task.completed).length;

    if (completedCount === 0) {
      this.showNotification("No completed tasks to clear", "error");
      return;
    }

    if (confirm(`Are you sure you want to delete ${completedCount} completed task(s)?`)) {
      this.tasks = this.tasks.filter((task) => !task.completed);
      await this.saveTasks();
      this.renderTasks();
      this.updateTaskCounter();
      this.showNotification(`Cleared ${completedCount} completed tasks`, "success");
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

    // Escape to cancel edit
    if (event.key === "Escape" && this.editingTask) {
      this.cancelEdit();
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
