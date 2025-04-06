import { ExtensionContext, Memento } from 'vscode';

export class MementoLocalStorage {
    private static instance: MementoLocalStorage;
    private storage: Memento;

    private constructor(context: ExtensionContext) {
        this.storage = context.globalState; // or context.workspaceState for workspace-specific storage
    }

    public static getInstance(context: ExtensionContext): MementoLocalStorage {
        if (!MementoLocalStorage.instance) {
            MementoLocalStorage.instance = new MementoLocalStorage(context);
        }
        return MementoLocalStorage.instance;
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
