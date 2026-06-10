# 📋 Join - Kanban Task Manager

A collaborative project management web app inspired by Kanban boards. Built with vanilla JavaScript, HTML, and CSS — featuring real-time data sync via Firebase and a clean, responsive UI.

> Group project – Developer Akademie, January 2026

---

## 🚀 Live Demo

🔗 [Live Demo – join.andreas-huepgen.de](https://join.andreas-huepgen.de/)

---

## 📸 Preview

![App Screenshot](./assets/img/preview.png)

---

## ✨ Features

- 🔐 User login & registration with Firebase Authentication
- 👤 Guest login for quick access
- 📌 Kanban board with drag & drop (To Do, In Progress, Awaiting Feedback, Done)
- ➕ Create, edit & delete tasks with title, description, due date, priority & assignees
- 👥 Contact management – add, edit & delete contacts
- 📊 Summary dashboard with task statistics
- 🔍 Task search & filtering
- 📱 Fully responsive design
- 🔒 Privacy Policy & Legal Notice pages
- 🌐 Multi-page app with dynamic HTML rendering

---

## 🛠️ Technologies

- **Vanilla JavaScript** – no frameworks
- **HTML5 & CSS3** – modular stylesheets per feature
- **Firebase** (v9 compat) – Authentication & Realtime Database
- **JSDoc** – full documentation with `better-docs` theme
- **Splash screen animation** with sessionStorage-based skip logic
- **Responsive layout** for mobile & desktop

---

## 🏗️ Architecture

### Page Structure

The app uses a **multi-page architecture** with shared scripts and modular styles:

- **`index.html`** – Login page with splash animation
- **`sites/sign-up.html`** – Registration page
- **`sites/summary.html`** – Dashboard / overview
- **`sites/taskboard.html`** – Kanban board
- **`sites/task-editor.html`** – Create / edit tasks
- **`sites/contacts.html`** – Contact list & management
- **`sites/help.html`** – Help & instructions
- **`sites/privacy-policy.html`** – Privacy Policy
- **`sites/legal-notice.html`** – Legal Notice
- **`sites/logout-privacy.html`** – Privacy Policy (logged out)
- **`sites/logout-legal.html`** – Legal Notice (logged out)

### Script Modules

- **`script.js`** – App-wide utilities and shared logic
- **`scripts/db.js`** – Firebase configuration *(gitignored, see db.example.js)*
- **`scripts/auth-guard.js`** – Route protection for authenticated pages
- **`scripts/login*.js`** – Login & Firebase Authentication
- **`scripts/sign-up*.js`** – Registration & validation
- **`scripts/summary.js`** – Dashboard data & rendering
- **`scripts/contacts*.js`** – Contact management (data, UI, mobile)
- **`scripts/taskboard*.js`** – Kanban board (core, render, edit)
- **`scripts/taskeditor*.js`** – Task editor (buttons, selections, subtasks)
- **`scripts/user-context.js`** – Current user state

---

## ▶️ Installation

1. Clone repository:

```bash
git clone https://github.com/Hueppi92/join
```

2. Copy the Firebase config template and fill in your own credentials:

```bash
cp scripts/db.example.js scripts/db.js
```

3. Open in browser:

```bash
cd join && open index.html
```

Or use a local server:

```bash
npx serve
```

> **Note:** `scripts/db.js` is gitignored. Use `scripts/db.example.js` as a template and add your own Firebase project credentials.

---

## 📁 Project Structure

```
join/
├── assets/
│   ├── icons/                      # SVG icons (mail, lock, drag handles, etc.)
│   └── img/                        # Logos, avatars, UI images
│
├── scripts/                        # All JavaScript modules
│   ├── db.example.js               # Firebase config template (fill & rename to db.js)
│   ├── auth-guard.js               # Route protection
│   ├── avatar-utils.js             # Avatar helpers
│   ├── login.js / login-auth.js    # Login logic
│   ├── sign-up*.js                 # Registration logic
│   ├── summary.js                  # Dashboard
│   ├── contacts*.js                # Contact management
│   ├── taskboard*.js               # Kanban board
│   ├── taskeditor*.js              # Task editor
│   ├── user-context.js             # User state
│
├── sites/                          # Sub-pages
├── styles/                         # Modular CSS per feature
├── out/                            # Generated JSDoc documentation
├── index.html                      # Entry point (Login)
├── script.js                       # Shared app logic
├── style.css                       # Global stylesheet
├── jsdoc.json                      # JSDoc config
└── package.json                    # Dev dependencies (jsdoc, better-docs)
```

---

## 📖 Documentation

JSDoc documentation can be generated locally:

```bash
npm install
npm run doc
```

The output will be written to the `out/` folder.

---

## 👥 Team

This was a group project built collaboratively in January 2026.

**Hueppi92** 🔗 [GitHub](https://github.com/Hueppi92)

---

## 📝 License

This project was built as part of the **Developer Akademie** curriculum for educational purposes.
