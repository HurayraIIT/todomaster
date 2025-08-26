class TodoMaster {
  constructor() {
    this.tasks = [];
    this.currentFilter = "all";
    this.editingTask = null;
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

  // Updated bindEvents method - replace the existing one
  bindEvents() {
    // Quick add functionality
    const quickInput = document.getElementById("quickTaskInput");
    quickInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.quickAddTask();
      }
    });

    // Expand form button
    document.getElementById("expandFormBtn").addEventListener("click", () => {
      this.showExpandedForm();
    });

    // Cancel form button
    document.getElementById("cancelFormBtn").addEventListener("click", () => {
      this.hideExpandedForm();
    });

    // Add task form (expanded)
    document.getElementById("addTaskForm").addEventListener("submit", (e) => {
      e.preventDefault();
      this.addTaskFromForm();
    });

    // Filter tabs
    document.getElementById("allTab").addEventListener("click", () => this.setFilter("all"));
    document.getElementById("todoTab").addEventListener("click", () => this.setFilter("todo"));
    document.getElementById("ongoingTab").addEventListener("click", () => this.setFilter("ongoing"));
    document.getElementById("doneTab").addEventListener("click", () => this.setFilter("done"));

    // Header buttons
    document.getElementById("summaryBtn").addEventListener("click", () => this.copyTaskSummary());
    document.getElementById("clearDoneBtn").addEventListener("click", () => this.clearDone());

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => this.handleKeyboard(e));
  }

  // Quick add task from the compact input
  async quickAddTask() {
    const quickInput = document.getElementById("quickTaskInput");
    const title = quickInput.value.trim();

    if (!title) {
      this.showNotification("Task title is required", "error");
      quickInput.classList.add("shake");
      setTimeout(() => quickInput.classList.remove("shake"), 600);
      return;
    }

    const task = {
      id: Date.now().toString(),
      title: this.sanitizeInput(title),
      notes: "",
      status: "todo", // Default status for quick add
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.tasks.unshift(task);
    await this.saveTasks();

    // Clear input
    quickInput.value = "";

    this.renderTasks();
    this.updateTaskCounters();
    this.showNotification("Task added successfully", "success");
  }

  // Show expanded form
  showExpandedForm() {
    const expandedForm = document.getElementById("expandedForm");
    const quickInput = document.getElementById("quickTaskInput");
    const taskTitleInput = document.getElementById("taskTitle");

    // Pre-fill title if there's text in quick input
    if (quickInput.value.trim()) {
      taskTitleInput.value = quickInput.value.trim();
      quickInput.value = "";
    }

    expandedForm.style.display = "block";
    taskTitleInput.focus();
  }

  // Hide expanded form
  hideExpandedForm() {
    const expandedForm = document.getElementById("expandedForm");
    const form = document.getElementById("addTaskForm");

    expandedForm.style.display = "none";
    form.reset();
  }

  // Add task from expanded form
  async addTaskFromForm() {
    const titleInput = document.getElementById("taskTitle");
    const notesInput = document.getElementById("taskNotes");
    const statusSelect = document.getElementById("taskStatus");

    const title = titleInput.value.trim();
    const notes = notesInput.value.trim();
    const status = statusSelect.value;

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
      status: status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.tasks.unshift(task);
    await this.saveTasks();

    // Hide form and clear inputs
    this.hideExpandedForm();

    this.renderTasks();
    this.updateTaskCounters();
    this.showNotification("Task added successfully", "success");
  }

  // Escape HTML to prevent XSS
  escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Add new method to generate and copy task summary
  async copyTaskSummary() {
    try {
      const summary = this.generateTaskSummary();
      await navigator.clipboard.writeText(summary);
      this.showNotification("Task summary copied to clipboard", "success");
    } catch (error) {
      console.error("Error copying summary:", error);
      this.showNotification("Error copying summary", "error");
    }
  }

  // Add new method to generate task summary in markdown
  generateTaskSummary() {
    const date = new Date().toLocaleDateString("en-US", {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let summary = `# Task Summary (${date})\n\n`;
    
    // Add statistics
    const todoCount = this.tasks.filter(t => t.status === "todo").length;
    const ongoingCount = this.tasks.filter(t => t.status === "ongoing").length;
    const doneCount = this.tasks.filter(t => t.status === "done").length;
    
    summary += `## Statistics\n`;
    summary += `- Total Tasks: ${this.tasks.length}\n`;
    summary += `- Todo: ${todoCount}\n`;
    summary += `- Ongoing: ${ongoingCount}\n`;
    summary += `- Completed: ${doneCount}\n\n`;

    // Add tasks by status
    const statuses = ["ongoing", "todo", "done"];
    
    statuses.forEach(status => {
      const statusTasks = this.tasks.filter(t => t.status === status);
      if (statusTasks.length > 0) {
        summary += `## ${status.charAt(0).toUpperCase() + status.slice(1)} Tasks\n\n`;
        statusTasks.forEach(task => {
          summary += `### ${task.title}\n`;
          if (task.notes) {
            summary += `${task.notes}\n`;
          }
          summary += `- Created: ${this.formatDate(task.createdAt)}\n`;
          if (task.updatedAt !== task.createdAt) {
            summary += `- Updated: ${this.formatDate(task.updatedAt)}\n`;
          }
          summary += '\n';
        });
      }
    });

    return summary;
  }

  // Updated keyboard handler to include new shortcuts
  handleKeyboard(event) {
    // Ctrl/Cmd + Enter to add task when focus is on quick input
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      const quickInput = document.getElementById("quickTaskInput");
      const titleInput = document.getElementById("taskTitle");

      if (document.activeElement === quickInput) {
        event.preventDefault();
        this.quickAddTask();
      } else if (document.activeElement === titleInput) {
        event.preventDefault();
        this.addTaskFromForm();
      }
    }

    // Escape to cancel expanded form, edit, or clear search
    if (event.key === "Escape") {
      const expandedForm = document.getElementById("expandedForm");
      if (expandedForm.style.display === "block") {
        this.hideExpandedForm();
      } else if (this.editingTask) {
        this.cancelEdit();
      }
    }

    // Ctrl/Cmd + N to focus quick add input
    if ((event.ctrlKey || event.metaKey) && event.key === "n") {
      event.preventDefault();
      document.getElementById("quickTaskInput").focus();
    }
  }

  // Remove the old addTask method and replace with quickAddTask and addTaskFromForm
  // The rest of your existing methods remain the same


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

    emptyState.style.display = "none";

    const filteredTasks = this.getFilteredTasks();

    if (filteredTasks.length === 0) {
      emptyState.style.display = "block";
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
      div.innerHTML = this.getEditTaskHTML(task); // safe
    } else {
      div.innerHTML = this.getTaskHTML(task); // safe
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

    return `
      <div class="task-content">
        <div class="task-main">
          <div class="task-header">
            <h3 class="task-title">${this.escapeHTML(task.title)}</h3>
            <span class="task-status-badge ${task.status}">${statusLabels[task.status]}</span>
          </div>
          ${task.notes ? `<p class="task-notes">${this.escapeHTML(task.notes)}</p>` : ""}
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
              <svg viewBox="0 0 91 91" enable-background="new 0 0 91 91" xmlns="http://www.w3.org/2000/svg" width="15" height="15">
                <polygon fill="#6EC4A7" points="8.015,63.352 0.8,90.053 27.767,83.105 12.858,68.197 "></polygon>
                <path d="M10.585,57.832l11.373,11.373l11.377,11.373L79.69,34.22L56.944,11.478L10.585,57.832z" fill="#647F94"></path>
                <path d="M61.302,29.813c1.117,1.117,1.117,2.93,0,4.047L35.239,59.924c-0.559,0.559-1.291,0.838-2.023,0.838 s-1.465-0.279-2.021-0.838c-1.119-1.119-1.119-2.93,0-4.047l26.059-26.064C58.372,28.696,60.185,28.696,61.302,29.813z" fill="#95AEC2"></path>
                <path d="M87.704,13.612L77.558,3.459c-1.68-1.683-3.918-2.608-6.299-2.608c-2.377,0-4.615,0.925-6.295,2.607 l-3.973,3.973l22.744,22.742l3.969-3.968c1.684-1.682,2.609-3.917,2.609-6.295C90.313,17.53,89.388,15.295,87.704,13.612z" fill="#95AEC2"></path>
              </svg>
            </button>
            <button class="task-btn delete-btn" data-task-id="${task.id}" title="Delete task">
              <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" fill="currentColor" width="20" height="20">
                <path d="M160 256H96a32 32 0 0 1 0-64h256V95.936a32 32 0 0 1 32-32h256a32 32 0 0 1 32 32V192h256a32 32 0 1 1 0 64h-64v672a32 32 0 0 1-32 32H192a32 32 0 0 1-32-32V256zm448-64v-64H416v64h192zM224 896h576V256H224v640zm192-128a32 32 0 0 1-32-32V416a32 32 0 0 1 64 0v320a32 32 0 0 1-32 32zm192 0a32 32 0 0 1-32-32V416a32 32 0 0 1 64 0v320a32 32 0 0 1-32 32z"></path>
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
    if (this.currentFilter === "all") {
      return this.tasks;
    }
    return this.tasks.filter((task) => task.status === this.currentFilter);
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
