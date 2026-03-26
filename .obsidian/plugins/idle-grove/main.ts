/**
 * Idle Grove — Obsidian Plugin
 *
 * Features:
 *   1. Sidebar view that embeds the Idle Grove app (iframe)
 *   2. Auto-sync: watches vault file changes and pushes directly to the API
 *      (NO manual git push needed — syncs within seconds of saving a note)
 *   3. Quick commands: add task, open calendar, trigger AI schedule
 *   4. Status bar showing sync state and world levels
 *   5. Ribbon icon to toggle the sidebar
 *
 * How auto-sync works:
 *   Instead of: Save note → manual git push → GitHub webhook → API processes
 *   Now:        Save note → plugin detects change → POST /api/vault/live-sync → instant update
 *
 * Install: Copy main.js, manifest.json, styles.css to .obsidian/plugins/idle-grove/
 */

import { Plugin, WorkspaceLeaf, ItemView, Notice, requestUrl, TFile, debounce, PluginSettingTab, App, Setting } from 'obsidian';

// ─── Constants ─────────────────────────────────────────────────

const VIEW_TYPE = 'idle-grove-sidebar';
const ICON = 'trees';

interface IdleGroveSettings {
  apiUrl: string;
  authToken: string;
  autoSync: boolean;
  syncDebounceMs: number;
  showStatusBar: boolean;
  sidebarWidth: number;
}

const DEFAULT_SETTINGS: IdleGroveSettings = {
  apiUrl: 'https://idlegrove.vercel.app',
  authToken: '',
  autoSync: true,
  syncDebounceMs: 3000, // 3 seconds after last edit
  showStatusBar: true,
  sidebarWidth: 400,
};

// ─── Plugin ────────────────────────────────────────────────────

export default class IdleGrovePlugin extends Plugin {
  settings: IdleGroveSettings = DEFAULT_SETTINGS;
  statusBarEl: HTMLElement | null = null;
  private syncQueue: Map<string, string> = new Map();
  private debouncedSync: ReturnType<typeof debounce>;

  async onload() {
    await this.loadSettings();

    // Register the sidebar view
    this.registerView(VIEW_TYPE, (leaf) => new IdleGroveSidebarView(leaf, this));

    // Ribbon icon — toggle sidebar
    this.addRibbonIcon(ICON, 'Open Idle Grove', () => {
      this.toggleSidebar();
    });

    // Status bar
    if (this.settings.showStatusBar) {
      this.statusBarEl = this.addStatusBarItem();
      this.updateStatusBar('idle');
    }

    // Commands
    this.addCommand({
      id: 'toggle-sidebar',
      name: 'Toggle sidebar',
      callback: () => this.toggleSidebar(),
    });

    this.addCommand({
      id: 'sync-current-note',
      name: 'Sync current note to Idle Grove',
      callback: () => this.syncCurrentNote(),
    });

    this.addCommand({
      id: 'sync-all-notes',
      name: 'Sync all notes to Idle Grove',
      callback: () => this.syncAllNotes(),
    });

    this.addCommand({
      id: 'add-task',
      name: 'Quick add task',
      callback: () => this.quickAddTask(),
    });

    // Auto-sync: watch for file changes
    this.debouncedSync = debounce(
      () => this.processSyncQueue(),
      this.settings.syncDebounceMs,
      true,
    );

    if (this.settings.autoSync) {
      this.registerEvent(
        this.app.vault.on('modify', (file) => {
          if (file instanceof TFile && file.extension === 'md') {
            this.queueFileSync(file);
          }
        }),
      );

      this.registerEvent(
        this.app.vault.on('create', (file) => {
          if (file instanceof TFile && file.extension === 'md') {
            this.queueFileSync(file);
          }
        }),
      );

      this.registerEvent(
        this.app.vault.on('delete', (file) => {
          if (file instanceof TFile && file.extension === 'md') {
            this.queueFileDelete(file.path);
          }
        }),
      );

      this.registerEvent(
        this.app.vault.on('rename', (file, oldPath) => {
          if (file instanceof TFile && file.extension === 'md') {
            this.queueFileDelete(oldPath);
            this.queueFileSync(file);
          }
        }),
      );
    }

    // Settings tab
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

  private async queueFileSync(file: TFile) {
    try {
      const content = await this.app.vault.cachedRead(file);
      this.syncQueue.set(file.path, content);
      this.updateStatusBar('pending');
      this.debouncedSync();
    } catch {
      // File read failed — skip
    }
  }

  private queueFileDelete(path: string) {
    this.syncQueue.set(path, '__DELETE__');
    this.debouncedSync();
  }

  private async processSyncQueue() {
    if (this.syncQueue.size === 0) return;
    if (!this.settings.authToken) {
      this.updateStatusBar('no-auth');
      return;
    }

    this.updateStatusBar('syncing');

    const files = [...this.syncQueue.entries()];
    this.syncQueue.clear();

    try {
      const response = await requestUrl({
        url: `${this.settings.apiUrl}/api/vault/live-sync`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.settings.authToken}`,
        },
        body: JSON.stringify({
          files: files.map(([path, content]) => ({
            path,
            content: content === '__DELETE__' ? null : content,
            deleted: content === '__DELETE__',
          })),
        }),
      });

      if (response.status === 200) {
        const data = response.json;
        this.updateStatusBar('synced', data.processed ?? files.length);
        new Notice(`Idle Grove: Synced ${data.processed ?? files.length} note(s)`);

        // Notify the sidebar iframe to refresh
        this.notifySidebar('vault:synced', { count: files.length });
      } else {
        this.updateStatusBar('error');
        console.error('Idle Grove sync error:', response.status);
      }
    } catch (err) {
      this.updateStatusBar('error');
      console.error('Idle Grove sync error:', err);
    }
  }

  // ─── Commands ──────────────────────────────────────────────

  private async syncCurrentNote() {
    const file = this.app.workspace.getActiveFile();
    if (!file || file.extension !== 'md') {
      new Notice('No markdown file open');
      return;
    }

    const content = await this.app.vault.cachedRead(file);
    this.syncQueue.set(file.path, content);
    await this.processSyncQueue();
  }

  private async syncAllNotes() {
    const files = this.app.vault.getMarkdownFiles();
    new Notice(`Idle Grove: Syncing ${files.length} notes...`);

    for (const file of files) {
      const content = await this.app.vault.cachedRead(file);
      this.syncQueue.set(file.path, content);
    }

    await this.processSyncQueue();
  }

  private async quickAddTask() {
    // Prompt for task title
    const modal = new QuickTaskModal(this.app, async (title: string) => {
      if (!title.trim()) return;

      try {
        await requestUrl({
          url: `${this.settings.apiUrl}/api/nymph/chat`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.settings.authToken}`,
          },
          body: JSON.stringify({
            message: `Create a task: ${title}`,
            world: 'plant',
          }),
        });
        new Notice(`Task added: ${title}`);
        this.notifySidebar('task:added', { title });
      } catch {
        new Notice('Failed to add task');
      }
    });
    modal.open();
  }

  // ─── Status Bar ────────────────────────────────────────────

  private updateStatusBar(state: string, count?: number) {
    if (!this.statusBarEl) return;

    const states: Record<string, string> = {
      'idle': '🌿 Idle Grove',
      'pending': '🌿 Changes pending...',
      'syncing': '🌿 Syncing...',
      'synced': `🌿 Synced ${count ?? 0} note(s)`,
      'error': '🌿 Sync error',
      'no-auth': '🌿 Set auth token in settings',
    };

    this.statusBarEl.setText(states[state] ?? '🌿 Idle Grove');
  }

  // ─── Sidebar Communication ─────────────────────────────────

  private notifySidebar(event: string, data: any) {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    for (const leaf of leaves) {
      const view = leaf.view as IdleGroveSidebarView;
      view.postMessage(event, data);
    }
  }
}

// ─── Sidebar View ──────────────────────────────────────────────

class IdleGroveSidebarView extends ItemView {
  private iframe: HTMLIFrameElement | null = null;
  private plugin: IdleGrovePlugin;

  constructor(leaf: WorkspaceLeaf, plugin: IdleGrovePlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string { return VIEW_TYPE; }
  getDisplayText(): string { return 'Idle Grove'; }
  getIcon(): string { return ICON; }

  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass('idle-grove-container');

    // Create iframe
    this.iframe = container.createEl('iframe', {
      attr: {
        src: `${this.plugin.settings.apiUrl}?obsidian=true&token=${this.plugin.settings.authToken}`,
        style: `width: 100%; height: 100%; border: none; border-radius: 0;`,
        allow: 'clipboard-write',
      },
    });

    // Listen for messages from the iframe
    window.addEventListener('message', this.handleMessage);
  }

  async onClose() {
    window.removeEventListener('message', this.handleMessage);
    this.iframe = null;
  }

  postMessage(event: string, data: any) {
    if (this.iframe?.contentWindow) {
      this.iframe.contentWindow.postMessage({ type: event, ...data }, '*');
    }
  }

  private handleMessage = (event: MessageEvent) => {
    const data = event.data;
    if (!data || !data.type) return;

    // Handle messages from the Idle Grove app
    switch (data.type) {
      case 'idle-grove:open-note':
        // Open a vault note from the app
        if (data.filePath) {
          const file = this.app.vault.getAbstractFileByPath(data.filePath);
          if (file instanceof TFile) {
            this.app.workspace.getLeaf(false).openFile(file);
          }
        }
        break;

      case 'idle-grove:create-note':
        // Create a new note from the app
        if (data.filePath && data.content) {
          this.app.vault.create(data.filePath, data.content).then((file) => {
            this.app.workspace.getLeaf(false).openFile(file);
          });
        }
        break;

      case 'idle-grove:request-sync':
        // App requests a full sync
        this.plugin.syncAllNotes?.call(this.plugin);
        break;
    }
  };
}

// ─── Quick Task Modal ──────────────────────────────────────────

class QuickTaskModal extends (require('obsidian') as any).Modal {
  private onSubmit: (title: string) => void;
  private inputEl: HTMLInputElement;

  constructor(app: App, onSubmit: (title: string) => void) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h3', { text: 'Quick Add Task' });

    this.inputEl = contentEl.createEl('input', {
      attr: {
        type: 'text',
        placeholder: 'Task title...',
        style: 'width: 100%; padding: 8px; margin: 8px 0; border: 1px solid var(--background-modifier-border); border-radius: 6px; background: var(--background-primary);',
      },
    });

    this.inputEl.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        this.onSubmit(this.inputEl.value);
        this.close();
      }
    });

    const btnContainer = contentEl.createEl('div', { attr: { style: 'display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px;' } });
    btnContainer.createEl('button', { text: 'Cancel' }).addEventListener('click', () => this.close());
    const addBtn = btnContainer.createEl('button', { text: 'Add Task', cls: 'mod-cta' });
    addBtn.addEventListener('click', () => {
      this.onSubmit(this.inputEl.value);
      this.close();
    });

    this.inputEl.focus();
  }

  onClose() {
    this.contentEl.empty();
  }
}

// ─── Settings Tab ──────────────────────────────────────────────

class IdleGroveSettingTab extends PluginSettingTab {
  plugin: IdleGrovePlugin;

  constructor(app: App, plugin: IdleGrovePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Idle Grove Settings' });

    new Setting(containerEl)
      .setName('API URL')
      .setDesc('Your Idle Grove app URL')
      .addText((text) => text
        .setPlaceholder('https://idlegrove.vercel.app')
        .setValue(this.plugin.settings.apiUrl)
        .onChange(async (value) => {
          this.plugin.settings.apiUrl = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Auth Token')
      .setDesc('Your Supabase auth token (get from Idle Grove Settings > Account)')
      .addText((text) => text
        .setPlaceholder('eyJhbG...')
        .setValue(this.plugin.settings.authToken)
        .onChange(async (value) => {
          this.plugin.settings.authToken = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Auto-sync')
      .setDesc('Automatically sync notes when you save them (no manual git push needed)')
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.autoSync)
        .onChange(async (value) => {
          this.plugin.settings.autoSync = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Sync delay')
      .setDesc('Seconds to wait after last edit before syncing (reduces API calls while typing)')
      .addSlider((slider) => slider
        .setLimits(1, 10, 1)
        .setValue(this.plugin.settings.syncDebounceMs / 1000)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.syncDebounceMs = value * 1000;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Status bar')
      .setDesc('Show sync status in the Obsidian status bar')
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.showStatusBar)
        .onChange(async (value) => {
          this.plugin.settings.showStatusBar = value;
          await this.plugin.saveSettings();
        }));
  }
}
