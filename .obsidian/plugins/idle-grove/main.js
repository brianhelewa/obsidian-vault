var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => IdleGrovePlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var VIEW_TYPE = "idle-grove-sidebar";
var ICON = "trees";
var DEFAULT_SETTINGS = {
  apiUrl: "https://idlegrove.vercel.app",
  authToken: "",
  autoSync: true,
  syncDebounceMs: 3e3,
  // 3 seconds after last edit
  showStatusBar: true,
  sidebarWidth: 400
};
var IdleGrovePlugin = class extends import_obsidian.Plugin {
  settings = DEFAULT_SETTINGS;
  statusBarEl = null;
  syncQueue = /* @__PURE__ */ new Map();
  debouncedSync;
  async onload() {
    await this.loadSettings();
    this.registerView(VIEW_TYPE, (leaf) => new IdleGroveSidebarView(leaf, this));
    this.addRibbonIcon(ICON, "Open Idle Grove", () => {
      this.toggleSidebar();
    });
    if (this.settings.showStatusBar) {
      this.statusBarEl = this.addStatusBarItem();
      this.updateStatusBar("idle");
    }
    this.addCommand({
      id: "toggle-sidebar",
      name: "Toggle sidebar",
      callback: () => this.toggleSidebar()
    });
    this.addCommand({
      id: "sync-current-note",
      name: "Sync current note to Idle Grove",
      callback: () => this.syncCurrentNote()
    });
    this.addCommand({
      id: "sync-all-notes",
      name: "Sync all notes to Idle Grove",
      callback: () => this.syncAllNotes()
    });
    this.addCommand({
      id: "add-task",
      name: "Quick add task",
      callback: () => this.quickAddTask()
    });
    this.debouncedSync = (0, import_obsidian.debounce)(
      () => this.processSyncQueue(),
      this.settings.syncDebounceMs,
      true
    );
    if (this.settings.autoSync) {
      this.registerEvent(
        this.app.vault.on("modify", (file) => {
          if (file instanceof import_obsidian.TFile && file.extension === "md") {
            this.queueFileSync(file);
          }
        })
      );
      this.registerEvent(
        this.app.vault.on("create", (file) => {
          if (file instanceof import_obsidian.TFile && file.extension === "md") {
            this.queueFileSync(file);
          }
        })
      );
      this.registerEvent(
        this.app.vault.on("delete", (file) => {
          if (file instanceof import_obsidian.TFile && file.extension === "md") {
            this.queueFileDelete(file.path);
          }
        })
      );
      this.registerEvent(
        this.app.vault.on("rename", (file, oldPath) => {
          if (file instanceof import_obsidian.TFile && file.extension === "md") {
            this.queueFileDelete(oldPath);
            this.queueFileSync(file);
          }
        })
      );
    }
    this.addSettingTab(new IdleGroveSettingTab(this.app, this));
  }
  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE);
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  // ─── Sidebar ───────────────────────────────────────────────
  async toggleSidebar() {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    if (existing.length > 0) {
      this.app.workspace.detachLeavesOfType(VIEW_TYPE);
      return;
    }
    const leaf = this.app.workspace.getRightLeaf(false);
    if (leaf) {
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
      this.app.workspace.revealLeaf(leaf);
    }
  }
  // ─── Auto-Sync ─────────────────────────────────────────────
  async queueFileSync(file) {
    try {
      const content = await this.app.vault.cachedRead(file);
      this.syncQueue.set(file.path, content);
      this.updateStatusBar("pending");
      this.debouncedSync();
    } catch {
    }
  }
  queueFileDelete(path) {
    this.syncQueue.set(path, "__DELETE__");
    this.debouncedSync();
  }
  async processSyncQueue() {
    if (this.syncQueue.size === 0) return;
    if (!this.settings.authToken) {
      this.updateStatusBar("no-auth");
      return;
    }
    this.updateStatusBar("syncing");
    const files = [...this.syncQueue.entries()];
    this.syncQueue.clear();
    try {
      const response = await (0, import_obsidian.requestUrl)({
        url: `${this.settings.apiUrl}/api/vault/live-sync`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.settings.authToken}`
        },
        body: JSON.stringify({
          files: files.map(([path, content]) => ({
            path,
            content: content === "__DELETE__" ? null : content,
            deleted: content === "__DELETE__"
          }))
        })
      });
      if (response.status === 200) {
        const data = response.json;
        this.updateStatusBar("synced", data.processed ?? files.length);
        new import_obsidian.Notice(`Idle Grove: Synced ${data.processed ?? files.length} note(s)`);
        this.notifySidebar("vault:synced", { count: files.length });
      } else {
        this.updateStatusBar("error");
        console.error("Idle Grove sync error:", response.status);
      }
    } catch (err) {
      this.updateStatusBar("error");
      console.error("Idle Grove sync error:", err);
    }
  }
  // ─── Commands ──────────────────────────────────────────────
  async syncCurrentNote() {
    const file = this.app.workspace.getActiveFile();
    if (!file || file.extension !== "md") {
      new import_obsidian.Notice("No markdown file open");
      return;
    }
    const content = await this.app.vault.cachedRead(file);
    this.syncQueue.set(file.path, content);
    await this.processSyncQueue();
  }
  async syncAllNotes() {
    const files = this.app.vault.getMarkdownFiles();
    new import_obsidian.Notice(`Idle Grove: Syncing ${files.length} notes...`);
    for (const file of files) {
      const content = await this.app.vault.cachedRead(file);
      this.syncQueue.set(file.path, content);
    }
    await this.processSyncQueue();
  }
  async quickAddTask() {
    const modal = new QuickTaskModal(this.app, async (title) => {
      if (!title.trim()) return;
      try {
        await (0, import_obsidian.requestUrl)({
          url: `${this.settings.apiUrl}/api/nymph/chat`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.settings.authToken}`
          },
          body: JSON.stringify({
            message: `Create a task: ${title}`,
            world: "plant"
          })
        });
        new import_obsidian.Notice(`Task added: ${title}`);
        this.notifySidebar("task:added", { title });
      } catch {
        new import_obsidian.Notice("Failed to add task");
      }
    });
    modal.open();
  }
  // ─── Status Bar ────────────────────────────────────────────
  updateStatusBar(state, count) {
    if (!this.statusBarEl) return;
    const states = {
      "idle": "\u{1F33F} Idle Grove",
      "pending": "\u{1F33F} Changes pending...",
      "syncing": "\u{1F33F} Syncing...",
      "synced": `\u{1F33F} Synced ${count ?? 0} note(s)`,
      "error": "\u{1F33F} Sync error",
      "no-auth": "\u{1F33F} Set auth token in settings"
    };
    this.statusBarEl.setText(states[state] ?? "\u{1F33F} Idle Grove");
  }
  // ─── Sidebar Communication ─────────────────────────────────
  notifySidebar(event, data) {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    for (const leaf of leaves) {
      const view = leaf.view;
      view.postMessage(event, data);
    }
  }
};
var IdleGroveSidebarView = class extends import_obsidian.ItemView {
  iframe = null;
  plugin;
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }
  getViewType() {
    return VIEW_TYPE;
  }
  getDisplayText() {
    return "Idle Grove";
  }
  getIcon() {
    return ICON;
  }
  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("idle-grove-container");
    this.iframe = container.createEl("iframe", {
      attr: {
        src: `${this.plugin.settings.apiUrl}?obsidian=true&token=${this.plugin.settings.authToken}`,
        style: `width: 100%; height: 100%; border: none; border-radius: 0;`,
        allow: "clipboard-write"
      }
    });
    window.addEventListener("message", this.handleMessage);
  }
  async onClose() {
    window.removeEventListener("message", this.handleMessage);
    this.iframe = null;
  }
  postMessage(event, data) {
    if (this.iframe?.contentWindow) {
      this.iframe.contentWindow.postMessage({ type: event, ...data }, "*");
    }
  }
  handleMessage = (event) => {
    const data = event.data;
    if (!data || !data.type) return;
    switch (data.type) {
      case "idle-grove:open-note":
        if (data.filePath) {
          const file = this.app.vault.getAbstractFileByPath(data.filePath);
          if (file instanceof import_obsidian.TFile) {
            this.app.workspace.getLeaf(false).openFile(file);
          }
        }
        break;
      case "idle-grove:create-note":
        if (data.filePath && data.content) {
          this.app.vault.create(data.filePath, data.content).then((file) => {
            this.app.workspace.getLeaf(false).openFile(file);
          });
        }
        break;
      case "idle-grove:request-sync":
        this.plugin.syncAllNotes?.call(this.plugin);
        break;
    }
  };
};
var QuickTaskModal = class extends require("obsidian").Modal {
  onSubmit;
  inputEl;
  constructor(app, onSubmit) {
    super(app);
    this.onSubmit = onSubmit;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: "Quick Add Task" });
    this.inputEl = contentEl.createEl("input", {
      attr: {
        type: "text",
        placeholder: "Task title...",
        style: "width: 100%; padding: 8px; margin: 8px 0; border: 1px solid var(--background-modifier-border); border-radius: 6px; background: var(--background-primary);"
      }
    });
    this.inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        this.onSubmit(this.inputEl.value);
        this.close();
      }
    });
    const btnContainer = contentEl.createEl("div", { attr: { style: "display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px;" } });
    btnContainer.createEl("button", { text: "Cancel" }).addEventListener("click", () => this.close());
    const addBtn = btnContainer.createEl("button", { text: "Add Task", cls: "mod-cta" });
    addBtn.addEventListener("click", () => {
      this.onSubmit(this.inputEl.value);
      this.close();
    });
    this.inputEl.focus();
  }
  onClose() {
    this.contentEl.empty();
  }
};
var IdleGroveSettingTab = class extends import_obsidian.PluginSettingTab {
  plugin;
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Idle Grove Settings" });
    new import_obsidian.Setting(containerEl).setName("API URL").setDesc("Your Idle Grove app URL").addText((text) => text.setPlaceholder("https://idlegrove.vercel.app").setValue(this.plugin.settings.apiUrl).onChange(async (value) => {
      this.plugin.settings.apiUrl = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Auth Token").setDesc("Your Supabase auth token (get from Idle Grove Settings > Account)").addText((text) => text.setPlaceholder("eyJhbG...").setValue(this.plugin.settings.authToken).onChange(async (value) => {
      this.plugin.settings.authToken = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Auto-sync").setDesc("Automatically sync notes when you save them (no manual git push needed)").addToggle((toggle) => toggle.setValue(this.plugin.settings.autoSync).onChange(async (value) => {
      this.plugin.settings.autoSync = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Sync delay").setDesc("Seconds to wait after last edit before syncing (reduces API calls while typing)").addSlider((slider) => slider.setLimits(1, 10, 1).setValue(this.plugin.settings.syncDebounceMs / 1e3).setDynamicTooltip().onChange(async (value) => {
      this.plugin.settings.syncDebounceMs = value * 1e3;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Status bar").setDesc("Show sync status in the Obsidian status bar").addToggle((toggle) => toggle.setValue(this.plugin.settings.showStatusBar).onChange(async (value) => {
      this.plugin.settings.showStatusBar = value;
      await this.plugin.saveSettings();
    }));
  }
};
