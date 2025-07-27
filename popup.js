const storage = browser.storage.local;

class TodoManager {
  constructor() {
    this.todos = [];
    this.history = [];
    this.settings = {};
    this.currentFilter = "all";
    this.init();
  }

  async init() {
    await this.loadData();
    this.bindEvents();
    this.render();
  }

  async loadData() {
    try {
      const result = await storage.get(["todos", "history", "settings"]);
      this.todos = result.todos || [];
      this.history = result.history || [];
      this.settings = result.settings || { theme: "light", currentFilter: "all" };
      this.currentFilter = this.settings.currentFilter;
      this.applyTheme();
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }

  async saveData() {
    try {
      await storage.set({
        todos: this.todos,
        history: this.history,
      });
    } catch (error) {
      console.error("Error saving data:", error);
    }
  }

  async saveSettings() {
    try {
      await storage.set({ settings: this.settings });
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  }

  bindEvents() {
    // Add todo
    document.getElementById("addBtn").addEventListener("click", () => this.addTodo());
    document.getElementById("todoInput").addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.addTodo();
    });

    // Filter buttons
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
        e.target.classList.add("active");
        this.currentFilter = e.target.dataset.filter;
        this.settings.currentFilter = this.currentFilter;
        this.saveSettings();
        this.render();
      });
    });

    // History modal
    document.getElementById("historyBtn").addEventListener("click", () => this.showHistory());
    document.getElementById("clearHistoryBtn").addEventListener("click", () => this.clearHistory());
    document.querySelector(".close-btn").addEventListener("click", () => this.hideHistory());
    document.getElementById("historyModal").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) this.hideHistory();
    });

    // No theme toggle or export/import needed
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  addTodo() {
    const input = document.getElementById("todoInput");
    const title = input.value.trim();

    if (!title) return;

    const todo = {
      id: this.generateId(),
      title: title,
      status: "pending",
      notes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.todos.unshift(todo);
    input.value = "";
    this.saveData();
    this.render();
  }

  updateTodoStatus(id, status) {
    const todo = this.todos.find((t) => t.id === id);
    if (!todo) return;

    const oldStatus = todo.status;
    todo.status = status;
    todo.updatedAt = new Date().toISOString();

    // Move to history if completed
    if (status === "completed") {
      this.history.unshift({
        ...todo,
        completedAt: new Date().toISOString(),
      });
      this.todos = this.todos.filter((t) => t.id !== id);
    }

    this.saveData();
    this.render();
  }

  deleteTodo(id) {
    if (confirm("Are you sure you want to delete this todo?")) {
      this.todos = this.todos.filter((t) => t.id !== id);
      this.saveData();
      this.render();
    }
  }

  addNote(id, noteText) {
    const todo = this.todos.find((t) => t.id === id);
    if (!todo || !noteText.trim()) return;

    todo.notes.push({
      id: this.generateId(),
      text: noteText.trim(),
      createdAt: new Date().toISOString(),
    });

    todo.updatedAt = new Date().toISOString();
    this.saveData();
    this.render();
  }

  editTodo(id) {
    const todoEl = document.querySelector(`[data-id='${id}']`).closest('.todo-item');
    const titleEl = todoEl.querySelector('.todo-title');
    const oldTitle = this.todos.find(t => t.id === id).title;

    titleEl.innerHTML = `<input type="text" class="edit-input" value="${this.escapeHtml(oldTitle)}">`;
    const input = titleEl.querySelector('input');
    input.focus();

    const save = () => {
      const newTitle = input.value.trim();
      if (newTitle && newTitle !== oldTitle) {
        const todo = this.todos.find(t => t.id === id);
        todo.title = newTitle;
        todo.updatedAt = new Date().toISOString();
        this.saveData();
      }
      this.render(); // Re-render to show the updated title
    };

    input.addEventListener('blur', save);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        save();
      }
    });
  }

  getFilteredTodos() {
    if (this.currentFilter === "completed") {
      return this.history;
    }
    if (this.currentFilter === "all") return this.todos;
    return this.todos.filter((todo) => todo.status === this.currentFilter);
  }

  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  createTodoElement(todo) {
    const todoEl = document.createElement("div");
    todoEl.className = "todo-item";
    todoEl.innerHTML = `
      <div class="todo-header">
        <div class="todo-content">
          <div class="todo-title">${this.escapeHtml(todo.title)}</div>
          <div class="todo-meta">
            <span class="status ${todo.status}">${todo.status}</span>
            <span style="margin-left: 8px;">Created ${this.formatDate(todo.createdAt)}</span>
          </div>
        </div>
        <div class="todo-actions">
          ${
            todo.status !== "completed"
              ? `
            <button class="action-btn status-pending" data-action="pending" data-id="${todo.id}" title="Mark Pending">⏸️</button>
            <button class="action-btn status-ongoing" data-action="ongoing" data-id="${todo.id}" title="Mark Ongoing">▶️</button>
            <button class="action-btn status-completed" data-action="completed" data-id="${todo.id}" title="Mark Complete">✅</button>
            <button class="action-btn edit-btn" data-action="edit" data-id="${todo.id}" title="Edit">✏️</button>
          `
              : "<button class=\"action-btn delete-btn\" data-action=\"delete\" data-id=\"${todo.id}\" title=\"Delete\">🗑️</button>"
          }
        </div>
      </div>
      
      <div class="notes-section">
        <div class="notes-header">
          <div class="notes-title">Notes (${todo.notes.length})</div>
          <button class="action-btn add-note-btn" data-action="add-note" data-id="${todo.id}">+ Note</button>
        </div>
        <div class="notes-list">
          ${todo.notes
            .map(
              (note) => `
            <div class="note-item">
              <div>${this.escapeHtml(note.text)}</div>
              <small style="color: #888;">${this.formatDate(note.createdAt)}</small>
            </div>
          `
            )
            .join("")}
        </div>
        <textarea class="note-input" placeholder="Add a note..." data-todo-id="${
          todo.id
        }" style="display: none;"></textarea>
      </div>
    `;

    // Bind action events
    todoEl.addEventListener("click", (e) => {
      const action = e.target.dataset.action;
      const todoId = e.target.dataset.id;

      switch (action) {
        case "pending":
        case "ongoing":
        case "completed":
          this.updateTodoStatus(todoId, action);
          break;
        case "edit":
          this.editTodo(todoId);
          break;
        case "delete":
          this.deleteTodo(todoId);
          break;
        case "add-note":
          this.toggleNoteInput(todoId);
          break;
      }
    });

    return todoEl;
  }

  toggleNoteInput(todoId) {
    const noteInput = document.querySelector(`textarea[data-todo-id="${todoId}"]`);
    if (!noteInput) return;

    if (noteInput.style.display === "none") {
      noteInput.style.display = "block";
      noteInput.focus();

      const addNote = () => {
        if (noteInput.value.trim()) {
          this.addNote(todoId, noteInput.value.trim());
          noteInput.value = "";
        }
        noteInput.style.display = "none";
      };

      noteInput.onblur = addNote;
      noteInput.onkeypress = (e) => {
        if (e.key === "Enter" && e.ctrlKey) {
          e.preventDefault();
          addNote();
        }
      };
    } else {
      noteInput.style.display = "none";
    }
  }

  render() {
    const todoList = document.getElementById("todoList");
    const filteredTodos = this.getFilteredTodos();

    // Set active filter button
    document.querySelectorAll(".filter-btn").forEach(btn => {
      btn.classList.remove("active");
      if (btn.dataset.filter === this.currentFilter) {
        btn.classList.add("active");
      }
    });

    if (filteredTodos.length === 0) {
      todoList.innerHTML = `
        <div class="empty-state">
          <span class="icon">📝</span>
          <div>No todos found</div>
          <small>Add a new todo to get started!</small>
        </div>
      `;
    } else {
      todoList.innerHTML = "";
      filteredTodos.forEach((todo) => {
        todoList.appendChild(this.createTodoElement(todo));
      });
    }

    // Update stats
    document.getElementById("totalTasks").textContent = this.todos.length + this.history.length;
  }

  toggleTheme() {
    const newTheme = document.body.classList.contains("dark-mode") ? "light" : "dark";
    this.settings.theme = newTheme;
    this.applyTheme();
    this.saveSettings();
  }

  applyTheme() {
    if (this.settings.theme === "dark") {
      document.body.classList.add("dark-mode");
      document.getElementById("themeToggleBtn").querySelector(".icon").textContent = "☀️";
    } else {
      document.body.classList.remove("dark-mode");
      document.getElementById("themeToggleBtn").querySelector(".icon").textContent = "🌙";
    }
  }

  showHistory() {
    const modal = document.getElementById("historyModal");
    const historyList = document.getElementById("historyList");

    if (this.history.length === 0) {
      historyList.innerHTML = `
        <div class="empty-state">
          <span class="icon">🕒</span>
          <div>No completed tasks</div>
        </div>
      `;
    } else {
      historyList.innerHTML = this.history
        .map(
          (task) => `
        <div class="todo-item">
          <div class="todo-header">
            <div class="todo-content">
              <div class="todo-title">${this.escapeHtml(task.title)}</div>
              <div class="todo-meta">
                <span class="status completed">completed</span>
                <span style="margin-left: 8px;">Completed ${this.formatDate(task.completedAt)}</span>
              </div>
            </div>
          </div>
          ${
            task.notes.length > 0
              ? `
            <div class="notes-section">
              <div class="notes-title">Notes (${task.notes.length})</div>
              <div class="notes-list">
                ${task.notes
                  .map(
                    (note) => `
                  <div class="note-item">${this.escapeHtml(note.text)}</div>
                `
                  )
                  .join("")}
              </div>
            </div>
          `
              : ""
          }
        </div>
      `
        )
        .join("");
    }

    modal.style.display = "block";
  }

  hideHistory() {
    document.getElementById("historyModal").style.display = "none";
  }

  async clearHistory() {
    if (confirm("Are you sure you want to clear all history? This action cannot be undone.")) {
      this.history = [];
      await this.saveData();
      this.hideHistory();
      this.render();
    }
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  exportData() {
    const data = {
      todos: this.todos,
      history: this.history,
      settings: this.settings
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type : 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'todomaster_backup.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.todos && data.history && data.settings) {
          if (confirm("Are you sure you want to import this data? This will overwrite your current data.")) {
            this.todos = data.todos;
            this.history = data.history;
            this.settings = data.settings;
            await this.saveData();
            await this.saveSettings();
            this.applyTheme();
            this.render();
          }
        }
      } catch (error) {
        console.error("Error importing data:", error);
        alert("Invalid backup file.");
      }
    };
    reader.readAsText(file);
  }
}

// Initialize the app
document.addEventListener("DOMContentLoaded", () => {
  new TodoManager();
});
