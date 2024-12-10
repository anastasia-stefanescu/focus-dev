import { ExtensionContext, Memento } from 'vscode';



export class LocalStorageManager {
    private static instance: LocalStorageManager;
    private storage: Memento;

    private constructor(context: ExtensionContext) {
        this.storage = context.globalState; // or ctx.workspaceState for workspace-specific data
    }

    public static getInstance(context: ExtensionContext): LocalStorageManager {
        if (!LocalStorageManager.instance) {
            LocalStorageManager.instance = new LocalStorageManager(context);
        }
        return LocalStorageManager.instance;
    }

    public setItem(key: string, value: any) {
        this.storage.update(key, value);
    }

    public getItem(key: string): any | undefined {
        return this.storage.get(key) as string; // ??
    }

    public removeItem(key: string){
        this.storage.update(key, undefined);
    }

    public clear(){
        const keys = Object.keys(this.storage);
        for (const key of keys) {
            this.removeItem(key);
        }
    }

    public clearDuplicates(){
        const keys = Object.keys(this.storage);
        const uniqueKeys = Array.from(new Set(keys));
        for (const key of keys) {
            if (!uniqueKeys.includes(key)) {
                this.removeItem(key);
            }
        }
    }


}