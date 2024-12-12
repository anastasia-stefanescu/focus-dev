import { ExtensionContext, Memento } from 'vscode';

export class LocalStorageManager {
    private static instance: LocalStorageManager;
    private storage: Memento;

    private constructor(context: ExtensionContext) {
        this.storage = context.globalState; // or context.workspaceState for workspace-specific storage
    }

    public static getInstance(context: ExtensionContext): LocalStorageManager {
        if (!LocalStorageManager.instance) {
            LocalStorageManager.instance = new LocalStorageManager(context);
        }
        return LocalStorageManager.instance;
    }

    // Set a value in storage
    public async setItem<T>(key: string, value: T): Promise<void> {
        await this.storage.update(key, value);
    }

    // Get a value from storage
    public getItem<T>(key: string): T | undefined {
        return this.storage.get<T>(key);
    }

    // Remove a specific key
    public async removeItem(key: string): Promise<void> {
        await this.storage.update(key, undefined);
    }

    // Clear all keys (requires explicit key tracking)
    public async clear(keys: string[]): Promise<void> {
        for (const key of keys) {
            await this.removeItem(key);
        }
    }
}
