import { TextEditor, window } from "vscode";
import { post_to_services } from "../API/api_wrapper";
import { v4 as uuidv4 } from 'uuid';
import { start } from "repl";
import { DocumentChangeInfo, ExecutionEventInfo, ExecutionType, FullChangeData, ProjectInfo, Source, UserActivityEventInfo } from "./event_models";
import { DEFAULT_CHANGE_EMISSION_INTERVAL } from "../Constants";
import { mySnowPlowTracker } from "./SnowPlowTracker";
import { emitToCacheProjectData } from "./event_sending";
import { addChange } from "./event_data_extraction";
import { EventCache } from "../LocalStorage/local_storage_node-cache";
import { emit } from "process";
import { getCurrentWorkspacePathAndName } from "../Util/util";


// should also add window id here - there might be multiple windows open
//      and the user might copy-paste from another one of his windows
// Add content length? -> for spontaneous activities such as typing, pasting, cutting, deleting, etc
//      To obtain statistics for how much code was generated, from external sources, etc

// manage initialization of the CurrentSessionVariables per window
// when window closes / loses focus => send all to cache
// therefore, when each event is created, it should have the project set?
export class CurrentSessionVariables {
    // By design, the VS Code API only works within a single instance (or window).
    // Is this the information for only one window?
    // - yes, because we also have the project info which is basically the window
    // Theoretically, no, only node-cache is per process and thus per window.
    // What do we do about this then?
    private static instance: CurrentSessionVariables;

    // also add different cache instances here!!!
    private executionCache: EventCache<ExecutionEventInfo> | undefined = undefined;
    private userActivityCache: EventCache<UserActivityEventInfo> | undefined = undefined;
    private userDocumentCache: EventCache<DocumentChangeInfo> | undefined = undefined;
    private aiDocumentCache: EventCache<DocumentChangeInfo> | undefined = undefined;
    private externalDocumentCache: EventCache<DocumentChangeInfo> | undefined = undefined;

    private projectInfo: ProjectInfo | undefined = undefined;

    private projectChangeInfoTimer: NodeJS.Timeout | undefined = undefined;
    private lastEmitTime: number = 0;


    //private opened_windows : { [key: string]: boolean} = {};

    // !! current primary window !!

    // what were we using these for??
    private crt_is_in_focus: boolean = true;
    private last_came_in_focus: Date = new Date();

    private last_time_of_paste: Date = new Date();
    private last_time_of_undo_redo: Date = new Date();

    private last_internal_copied_text: string = '';
    private last_copied_text: string = '';

    public CurrentSessionVariables() { }

    public static getInstance() {
        if (!CurrentSessionVariables.instance)
            CurrentSessionVariables.instance = new CurrentSessionVariables();
        return CurrentSessionVariables.instance;
    }

    // ==============================================================================
    public getExecutionCache() {
        if (!this.executionCache) {
            this.executionCache = new EventCache<ExecutionEventInfo>();
        }
        return this.executionCache;
    }
    public getUserActivityCache() {
        if (!this.userActivityCache) {
            this.userActivityCache = new EventCache<UserActivityEventInfo>();
        }
        return this.userActivityCache;
    }
    public getDocumentCache(source: Source): EventCache<DocumentChangeInfo> | undefined {
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
        return undefined; // if source is not user/AI/external, return undefined
    }

    //===============================================================================

    public getProjectInfo() { return this.projectInfo; }
    public setProjectInfo(projectInfo: ProjectInfo | undefined) { this.projectInfo = projectInfo; }

    // get doc changes

    public getTimer() { return this.projectChangeInfoTimer; }
    public setTimer(timer: NodeJS.Timeout | undefined) { this.projectChangeInfoTimer = timer; }

    public getLastEmitTime() { return this.lastEmitTime; }
    public setLastEmitTime(time: number) { this.lastEmitTime = time; }

    //===============================================================================

    public getExecutionEventInfo(sessionId: string) {
        if (this.projectInfo && this.projectInfo.execution_sessions && this.projectInfo.execution_sessions[sessionId])
            return this.projectInfo.execution_sessions[sessionId];
        return undefined;
    }
    public setExecutionEventInfo(executionEventInfo: ExecutionEventInfo) {
        const sessionId = executionEventInfo.sessionId;
        if (this.projectInfo) {
            this.projectInfo.execution_sessions[sessionId] = executionEventInfo;
        }
    }

    public getAllExecutionEvents() {
        if (this.projectInfo && this.projectInfo.execution_sessions)
            return this.projectInfo.execution_sessions;
        return undefined;
    }

    public setAllExecutionEvents(executionInfo: { [key: string]: ExecutionEventInfo }) {
        if (this.projectInfo) {
            this.projectInfo.execution_sessions = executionInfo;
        }
    }

    public deleteExecutionEvent(sessionId: string) {
        if (this.projectInfo && this.projectInfo.execution_sessions && this.projectInfo.execution_sessions[sessionId])
            delete this.projectInfo.execution_sessions[sessionId];
        else
            window.showInformationMessage(`Execution event with sessionId ${sessionId} not found for deletion`);
    }

    // aici vom concatena mai multe eventuri, dar daca vrem doar unul?
    public getUserActivityInfo() {
        if (this.projectInfo && this.projectInfo.userActivity)
            return this.projectInfo.userActivity;
        return undefined;
    }
    public setUserActivityInfo(userActivity: UserActivityEventInfo | undefined) {
        if (this.projectInfo) {
            this.projectInfo.userActivity = userActivity;
        }
    }

    // returns undefined if key for dict doesn't exist
    public getDocChangeForSource(source: Source, fileName: string): DocumentChangeInfo | undefined {
        console.log('Inside getDocChangeForSource', source, fileName);
        if (this.projectInfo) {
            if (source === 'user' && this.projectInfo.docs_changed_user && this.projectInfo.docs_changed_user[fileName]) {
                return this.projectInfo.docs_changed_user[fileName];
            } else if (source === 'AI' && this.projectInfo.docs_changed_ai && this.projectInfo.docs_changed_ai[fileName]) {
                return this.projectInfo.docs_changed_ai[fileName];
            } else if (source === 'external' && this.projectInfo.docs_changed_external && this.projectInfo.docs_changed_external[fileName]) {
                return this.projectInfo.docs_changed_external[fileName];
            }
        }
        return undefined;
    }

    public setDocChangeForSource(source: Source, docChangeInfo: DocumentChangeInfo, fileName: string) {
        if (this.projectInfo) { // the dictionary has to exist if the project change info exists
            if (source === 'user') {
                this.projectInfo.docs_changed_user[fileName] = docChangeInfo;
                //window.showInformationMessage(this.projectInfo.docs_changed_user[fileName].displayData(`Document set for ${source} source`));
            } else if (source === 'AI') {
                this.projectInfo.docs_changed_ai[fileName] = docChangeInfo;
                //window.showInformationMessage(this.projectInfo.docs_changed_ai[fileName].displayData(`Document set for ${source} source`));
            } else if (source === 'external') {
                this.projectInfo.docs_changed_external[fileName] = docChangeInfo;
                //window.showInformationMessage(this.projectInfo.docs_changed_external[fileName].displayData(`Document set for ${source} source`));
            }
        }
    }

    // this.projectInfo.docs_changed_user -> dict de any,
    public setAllDocChangesForSource(source: Source, allDocChangeInfo: { [key: string]: DocumentChangeInfo }) {
        if (this.projectInfo) {
            if (source === 'user') {
                this.projectInfo.docs_changed_user = allDocChangeInfo;
            } else if (source === 'AI') {
                this.projectInfo.docs_changed_ai = allDocChangeInfo;
            } else if (source === 'external') {
                this.projectInfo.docs_changed_external = allDocChangeInfo;
            }
        }
    }

    public getAllDocChangesForSource(source: Source) {
        if (this.projectInfo) {
            if (source === 'user') {
                return this.projectInfo.docs_changed_user;
            } else if (source === 'AI') {
                return this.projectInfo.docs_changed_ai;
            } else if (source === 'external') {
                return this.projectInfo.docs_changed_external;
            }
        }
        return undefined;
    }

    //===============================================================================


    public getLastTimeofPaste() { return this.last_time_of_paste; }
    public setLastTimeofPaste(date: Date) { this.last_time_of_paste = date; }

    public getLastInternalCopiedText() { return this.last_internal_copied_text; }
    public setLastInternalCopiedText(text: string) { this.last_internal_copied_text = text; }

    public getLastCopiedText() { return this.last_copied_text;}
    public setLastCopiedText(text:string) { this.last_copied_text = text; }

    public getLastTimeofUndoRedo() { return this.last_time_of_undo_redo; }
    public setLastTimeofUndoRedo(date: Date) { this.last_time_of_undo_redo = date; }

    public getLastCameInFocus() { return this.last_came_in_focus; }

    //===============================================================================

    // ALSO SET A LISTENER FOR WHEN THE EXTENSION WINDOW CLOSES TO SEND THE COLLECTED DATA!!!!!!

    public startProjectTimer() {
        // porneste timer pentru project change pentru a emite datele colectate despre proiect la anumite intervale de timp
        if (!this.projectChangeInfoTimer) {
            window.showInformationMessage('Timer started');
            const timer = setTimeout(() => {
                emitToCacheProjectData(); // send the data to cache
            }, DEFAULT_CHANGE_EMISSION_INTERVAL);

            this.projectChangeInfoTimer = timer;
        }
    }

    public verifyExistingProjectData() {
        console.log('Inside verifyExistingProjectData');
        if (!this.projectInfo) {
            this.projectInfo = new ProjectInfo();

            const workspaceData = getCurrentWorkspacePathAndName();
            if (workspaceData) {
                this.projectInfo.project_name = workspaceData.name;
                this.projectInfo.project_directory = workspaceData.path;
            } else {
                this.projectInfo.project_name = 'None';
                this.projectInfo.project_directory = 'None';
            }

            this.startProjectTimer(); // ar trebui aici
            window.showInformationMessage(`Project info initialized: ${this.projectInfo.project_name}, ${this.projectInfo.project_directory}`);
            console.log('Started project timer');
        }
    }
    //===============================================================================

    // is the dictionary also modified???
    public returnOrCreateDocumentChange(fileName: string, source: Source): DocumentChangeInfo {
        this.verifyExistingProjectData();

        if (this.projectInfo && this.getDocChangeForSource(source, fileName) === undefined) {
            const docChangeInfo: DocumentChangeInfo = new DocumentChangeInfo();
            docChangeInfo.fileName = fileName;
            //docChangeInfo.file_path = this.getRootPathForFile(fileName);
            docChangeInfo.projectName = this.projectInfo.project_name;
            docChangeInfo.projectDirectory = this.projectInfo.project_directory;

            docChangeInfo.start = new Date().toISOString();                        // seteaza timpul de start al schimbarii in fisier

            this.setDocChangeForSource(source, docChangeInfo, fileName);
        }
        return this.getDocChangeForSource(source, fileName) as DocumentChangeInfo; // to exclude the undefined case
    }

    public returnOrCreateUserActivity(): UserActivityEventInfo {
        this.verifyExistingProjectData();

        if (this.getUserActivityInfo() === undefined) {
            const userActivity: UserActivityEventInfo = new UserActivityEventInfo();
            userActivity.start = new Date().toISOString();
            this.setUserActivityInfo(userActivity);
        }
        return this.getUserActivityInfo() as UserActivityEventInfo; // to exclude the undefined case
    }

    public returnOrCreateExecution(sessionId: string, type: ExecutionType): ExecutionEventInfo {
        this.verifyExistingProjectData();

        if (this.getExecutionEventInfo(sessionId) === undefined) {
            const executionEventInfo: ExecutionEventInfo = new ExecutionEventInfo();
            executionEventInfo.start = new Date().toISOString();                        // seteaza timpul de start al activitatii in fisier
            executionEventInfo.sessionId = sessionId;
            executionEventInfo.eventType = type;
            this.setExecutionEventInfo(executionEventInfo);
        }
        return this.getExecutionEventInfo(sessionId) as ExecutionEventInfo; // to exclude the undefined case
    }

    //===============================================================================

    public addDocumentChangeData(fileName: string, changeInfo: DocumentChangeInfo) {
        const docChangeInfo: DocumentChangeInfo = this.returnOrCreateDocumentChange(fileName, changeInfo.source); // verifica daca exista date, daca nu, creeaza-le

        addChange(docChangeInfo, changeInfo); // docChangeInfo is modified, RIGHT?

        this.setDocChangeForSource(changeInfo.source, docChangeInfo, fileName);
        // I think here we will use concatenate because we're not interested in the type of event
        //addChange(docChangeInfo, changeInfo); // docChangeInfo is modified, RIGHT?
    }

    public addUserActivityData(userActivity: UserActivityEventInfo) {
        const userActivityInfo: UserActivityEventInfo = this.returnOrCreateUserActivity();

        userActivityInfo.concatenateData(userActivity); // this updates the total_actions
        this.setUserActivityInfo(userActivityInfo);
    }

    // For execution it's not used because we don't need to concatenate session data, they are independent - even when grouping we use concatenation!!!

    //=========================================================

    // set the end of changes if it doesn't exist
    // onlyThisFile - if true, close only this file event, otherwise close all events except for this file
    public closeAllFileEventsExcept(fileName: string) {
        if (!this.projectInfo) {
            window.showErrorMessage('Could not close file event info, no project info available');
            return;
        }

        for (const source of ['user', 'AI', 'external'] as Source[]) {
            const changes_dict = this.getAllDocChangesForSource(source);

            const allFiles = Object.keys(changes_dict);
            for (const file of allFiles) {
                if (file !== fileName) {
                    const fileChange = changes_dict[file];
                    if (fileChange && !fileChange.end) {
                        fileChange.end = new Date().toISOString(); // through references, the initial array is updated too
                        this.setDocChangeForSource(source, fileChange, file); // update the change info
                    }
                }
            }
        }
    }

    public closeFileEvent(fileName: string) {
        for (const source of ['user', 'AI', 'external'] as Source[]) {
            const doc_change = this.getDocChangeForSource(source, fileName);

            if (doc_change && !doc_change.end) {
                doc_change.end = new Date().toISOString(); // through references, the initial array is updated too - but let's not risk it
                this.setDocChangeForSource(source, doc_change, fileName); // update the change info
            }
        }
    }
}








































// function timeDifference(date1:Date, date2:Date):number {
//     const diffInMs = Math.abs(date1.getTime() - date2.getTime());
//     return Math.floor(diffInMs / 1000);
// }



// export async function sendEvent(event:Event) {
//     window.showInformationMessage(`${event.activityType}`);
//     //await post_to_services('/activity', event);
// }


// public getDict(type:string): { [key: string]: Event} {
//     switch(type) {
//         case "debug": {
//             return this.crt_debug_sessions;
//         }
//         case "exec": {
//             return this.crt_exec_sessions;
//         }
//         default:
//             return {}
//     }
// }

// public startSession(id:string, startTime:Date, type:string) {
//     let dict : { [key: string]: Event} = this.getDict(type); // returns reference

//     const new_session: Event = this.createEvent(undefined, startTime, undefined, type)

//     dict[id] = new_session;
// }

// public stopSession(id:string, endTime: Date, type:string) : Event {
//     let dict : { [key: string]: Event} = this.getDict(type); // returns reference

//     const prev_session = dict[id];

//     const start_date = new Date(prev_session.startTime)
//     const seconds: number = timeDifference(start_date, endTime)

//     const updated_debug_session : Event = this.createEvent(seconds, start_date, endTime, prev_session.activityType);

//     delete dict[id];

//     return updated_debug_session;
// }

// public createEvent(duration:number|undefined, start: Date, end: Date|undefined, type: string): Event {
//     let end_string = undefined;
//     if (end!=undefined)
//         end_string = end.toISOString();

//     const event : Event = {
//         activityId: uuidv4(), // uuid for storing in database
//         activityDuration: duration,
//         startTime: start.toISOString(),
//         endTime: end_string,
//         activityType: type
//     }

//     return event;
// }

// export async function handleEvent(message:string, local_session_id: string, activityName:string, activityType: string, activityTime:Date) {
//     window.showInformationMessage(message);

//     // !! check what is name exactly
//     const list = ["debug", "exec"];

//     let event : Event|undefined = undefined;
//     if (activityType in list) {
//         if (activityType == "start") { // just started debug session
//             CurrentSessionVariables.getInstance().startSession(local_session_id, activityTime, activityName);
//         }
//         else {
//             event = CurrentSessionVariables.getInstance().stopSession(local_session_id, activityTime, activityName);
//         }
//     }
//     else {

//         event = CurrentSessionVariables.getInstance().createEvent(undefined, activityTime, undefined, activityName)
//     }

//     if (event != undefined)
//         await sendEvent(event);
