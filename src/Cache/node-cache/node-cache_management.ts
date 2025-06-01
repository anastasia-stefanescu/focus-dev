import { EventCache } from './node-cache';
import { window } from 'vscode';
import { DocumentChangeInfo, ExecutionEventInfo, UserActivityEventInfo, Source} from '../../EventTracking/event_models';
import { DEFAULT_CACHE_EMISSION_INTERVAL } from '../../Constants';
import { emitToDBCacheData } from './send_cache_to_db';

export class NodeCacheManager {
    // By design, the VS Code API only works within a single instance (or window).
    // Is this the information for only one window?
    // - yes, because we also have the project info which is basically the window
    // Theoretically, no, only node-cache is per process and thus per window.
    // What do we do about this then?
    private static instance: NodeCacheManager;

    // also add different cache instances here!!!
    private executionCache: EventCache<ExecutionEventInfo> | undefined = undefined;
    private userActivityCache: EventCache<UserActivityEventInfo> | undefined = undefined;
    private userDocumentCache: EventCache<DocumentChangeInfo> | undefined = undefined;
    private aiDocumentCache: EventCache<DocumentChangeInfo> | undefined = undefined;
    private externalDocumentCache: EventCache<DocumentChangeInfo> | undefined = undefined;

    private projectChangeInfoTimer: NodeJS.Timeout | undefined = undefined;
    private cachesExist: boolean = false; // if we have any caches to send to DB

    public static getInstance() {
        if (!NodeCacheManager.instance)
            NodeCacheManager.instance = new NodeCacheManager();
        return NodeCacheManager.instance;
    }

    // ==============================================================================
    public getTimer() { return this.projectChangeInfoTimer; }
    public setTimer(timer: NodeJS.Timeout | undefined) { this.projectChangeInfoTimer = timer; }

    public getCachesExist() { return this.cachesExist; }
    public setCachesExist(exists: boolean) { this.cachesExist = exists; }

    public startProjectTimer() {
        // porneste timer pentru project change pentru a emite datele colectate despre proiect la anumite intervale de timp
        if (!this.projectChangeInfoTimer) {
            window.showInformationMessage('Timer started');
            const timer = setTimeout(() => {
                emitToDBCacheData();
                this.cachesExist = false; // reset the flag
                // also delete the caches? -> this inside sending?
            }, DEFAULT_CACHE_EMISSION_INTERVAL);

            this.projectChangeInfoTimer = timer;
            window.showInformationMessage('Project change timer started, will emit data to DB every 30 seconds');
        }
    }

    public verifyExistingCaches() {
        if (!this.cachesExist) {
            this.cachesExist = true;
            this.startProjectTimer();
        }
    }

    // ==============================================================================

    public getExecutionCache() : EventCache<ExecutionEventInfo> {
        this.verifyExistingCaches();
        if (!this.executionCache) {
            this.executionCache = new EventCache<ExecutionEventInfo>();
        }
        return this.executionCache;
    }
    public getUserActivityCache() : EventCache<UserActivityEventInfo> {
        this.verifyExistingCaches();
        if (!this.userActivityCache) {
            this.userActivityCache = new EventCache<UserActivityEventInfo>();
        }
        return this.userActivityCache;
    }
    public getDocumentCache(source: Source): EventCache<DocumentChangeInfo> {
        this.verifyExistingCaches();
        if (source === 'user') {
            if (!this.userDocumentCache)
                this.userDocumentCache = new EventCache<DocumentChangeInfo>();
            return this.userDocumentCache;
        }
        if (source === 'AI') {
            if (!this.aiDocumentCache)
                this.aiDocumentCache = new EventCache<DocumentChangeInfo>();
            return this.aiDocumentCache;
        }
        if (source === 'external') {
            if (!this.externalDocumentCache)
                this.externalDocumentCache = new EventCache<DocumentChangeInfo>();
            return this.externalDocumentCache;
        }
        throw Error; // if source is not user/AI/external, return undefined
    }


}
