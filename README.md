# TodoMaster 🚀

A modern, lightweight todo manager Firefox extension with privacy-focused local storage and efficient task management features.

![TodoMaster](https://img.shields.io/badge/version-1.2.0-blue.svg) 
![Firefox](https://img.shields.io/badge/Firefox-88%2B-orange.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 🎨 Screenshots & Demo

<img src="icons/icon-128.png" alt="TodoMaster Icon" width="128" height="128" align="center">

### Main Interface

#### Task Summary Generation
![Task Summary Generation](https://pub-8652c8e95ad6452c85f9643f88d7f8af.r2.dev/screenshots/05-generate-task-summary.png)

#### Task Filtering
![Task Filtering](https://pub-8652c8e95ad6452c85f9643f88d7f8af.r2.dev/screenshots/02-task-filtering-by-status.png)

#### With Tasks
![Main Interface - With Tasks](https://pub-8652c8e95ad6452c85f9643f88d7f8af.r2.dev/screenshots/01-main-interface-with-data.png)

#### Empty State
![Main Interface - Empty](https://pub-8652c8e95ad6452c85f9643f88d7f8af.r2.dev/screenshots/00-main-interface-empty.png)

Watch our demo video [here](https://pub-8652c8e95ad6452c85f9643f88d7f8af.r2.dev/screenshots/04-demo.mp4)

## ✨ Features

### Core Functionality
- **📝 Smart Task Management**: Create, edit, and delete tasks with ease
- **🔄 Three Status System**: Todo → Ongoing → Done workflow
- ** Date Tracking**: GMT+6 timezone support with creation/update timestamps
- **💾 Persistent Storage**: Data survives browser restarts and updates
- **🎨 Modern Design**: Clean, responsive interface built with modern CSS

### Advanced Features
- **⚡ Smart Sorting**: Automatically prioritizes ongoing tasks, moves completed to bottom
- **📊 Live Counters**: Real-time task count by status
- **� Task Summary**: Generate and copy task summary in markdown format
- **⌨️ Keyboard Shortcuts**: Efficient navigation and task management
- **🔐 Privacy First**: All data stored locally, no cloud dependencies
- **🎯 Instant Actions**: Quick status changes and in-place editing

## 🚀 Manual Installation
1. Go to [about:debugging](about:debugging)
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Choose the `manifest.json` file

## 📖 Usage

### Basic Operations
- **Add Task**: Type in the input field and press Enter or click "Add Task"
- **Change Status**: Use the dropdown to move tasks between Todo/Ongoing/Done
- **Edit Task**: Click the edit icon to modify title and notes
- **Delete Task**: Click the delete icon and confirm

### Keyboard Shortcuts
- `Ctrl/Cmd + Enter`: Add new task (when title field is focused)
- `Ctrl/Cmd + N`: Focus quick add input
- `Escape`: Cancel edit mode or close expanded form

### Task Management
- **Task Summary**: Click the summary icon to copy a markdown summary of all tasks
- **Clear Done**: Remove all completed tasks at once
- **Filter Tasks**: Use tabs to filter tasks by status (All/Todo/Ongoing/Done)

## 🎯 Task Workflow

```
📋 Todo → ⚡ Ongoing → ✅ Done
```

- **Todo**: New tasks start here
- **Ongoing**: Tasks you're actively working on
- **Done**: Completed tasks (automatically sorted to bottom)

## 🔧 Technical Details

### Architecture
- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Storage**: Firefox Extension Storage API
- **Security**: CSP compliant, XSS protection
- **Performance**: <1MB total size, <200ms popup load

### Browser Support
- Firefox 88+ (Manifest V2)
- Responsive design for various screen sizes

### Data Format
Tasks are stored locally with the following structure:
```json
{
  "id": "timestamp",
  "title": "Task title",
  "notes": "Optional notes",
  "status": "todo|ongoing|done",
  "createdAt": "ISO timestamp",
  "updatedAt": "ISO timestamp"
}
```

## 🛡️ Privacy & Security

- **100% Local Storage**: No data ever leaves your browser
- **No External APIs**: Completely offline functionality
- **Secure Input**: XSS protection and input sanitization
- **No Tracking**: Zero analytics or user tracking

## 📁 File Structure

```
TodoMaster/
├── manifest.json           # Extension manifest
├── popup.html             # Main popup interface
├── popup.js               # Core application logic
├── styles.css             # Modern styling
├── background.js          # Background processes
├── icons/                 # Extension icons
│   ├── icon-16.png
│   ├── icon-32.png
│   ├── icon-48.png
│   └── icon-128.png
├── screenshots/                  # Documentation assets
└── README.md
```

## 🔄 Changelog

### v1.2.0 (Current)
- ✨ Added task summary generation in markdown format
- 🔄 Simplified interface by removing search functionality
- 📤 Removed import/export in favor of task summary
- 🎨 Improved UI consistency and reliability
- 🐛 Fixed various bug fixes and improvements

### v1.1.0

- ✅ Three-status system (Todo/Ongoing/Done)
- ✅ Advanced search functionality
- ✅ GMT+6 timezone support
- ✅ Smart task sorting
- ✅ Enhanced data persistence
- ✅ Improved responsive design
- ✅ Live task counters

### v1.0.0

- ✅ Basic todo functionality
- ✅ Local storage
- ✅ Export/Import
- ✅ Modern UI


## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 💡 Tips & Tricks

1. **Quick Status Change**: Use the dropdown to rapidly move tasks through workflow
2. **Task Organization**: Use status filters to focus on specific tasks
3. **Bulk Operations**: Use "Clear Done" to remove multiple completed tasks
4. **Task Summary**: Generate task summary for an overview or sharing
5. **Keyboard Navigation**: Use shortcuts for faster task management

---

Made with ❤️ for productivity enthusiasts who value privacy and simplicity.

**Download from Firefox Add-ons Store** (Coming Soon)