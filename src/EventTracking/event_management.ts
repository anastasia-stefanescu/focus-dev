import { TextEditor, window } from "vscode";
import { post_to_services } from "../API/api_wrapper";
import { v4 as uuidv4 } from 'uuid'; 
import { start } from "repl";
import { DocumentChangeInfo, FullChangeData, ProjectChangeInfo } from "./event_models";
import { DEFAULT_CHANGE_EMISSION_INTERVAL } from "../Constants";
import { mySnowPlowTracker } from "./SnowPlowTracker";
import { emitProjectChangeData } from "./event_sending";


// should also add window id here - there might be multiple windows open
//      and the user might copy-paste from another one of his windows 
// Add content length? -> for spontaneous activities such as typing, pasting, cutting, deleting, etc
//      To obtain statistics for how much code was generated, from external sources, etc

export class CurrentSessionVariables {

    private static instance : CurrentSessionVariables;

    private projectChangeInfo: ProjectChangeInfo | undefined = undefined;
    private projectChangeInfoTimer: NodeJS.Timeout | undefined = undefined;
    private lastEmitTime: number = 0;

    // multiple debug sessions can be active at the same time
    private crt_debug_sessions: { [key: string]: Event} = {};
    private crt_exec_sessions: { [key: string]: Event} = {};

    // By design, the VS Code API only works within a single instance (or window).
    //private opened_windows : { [key: string]: boolean} = {};

    // !! current primary window !!

    // what were we using these for??
    private crt_is_in_focus : boolean = true;
    private last_came_in_focus : Date = new Date();

    private last_time_of_paste : Date = new Date();
    private last_time_of_undo_redo: Date = new Date();

    private last_copied_text: string = '';
    
    public CurrentSessionVariables() {

        //this.opened_windows = window.visibleTextEditors;
    }

    public static getInstance() {
        if (!CurrentSessionVariables.instance)
            CurrentSessionVariables.instance = new CurrentSessionVariables();
        return CurrentSessionVariables.instance;
    }

    public getProjectChangeInfo() { return this.projectChangeInfo; }
    public setProjectChangeInfo(projectChangeInfo: ProjectChangeInfo | undefined) { this.projectChangeInfo = projectChangeInfo; }
    public getTimer() { return this.projectChangeInfoTimer; }
    public setTimer(timer: NodeJS.Timeout | undefined) { this.projectChangeInfoTimer = timer; }
    public getLastEmitTime() { return this.lastEmitTime; }
    public setLastEmitTime(time: number) { this.lastEmitTime = time; }

    public getDocumentChangeInfo(fileName:string) { 
        if(this.projectChangeInfo && this.projectChangeInfo.docs_changed[fileName]) 
            return this.projectChangeInfo.docs_changed[fileName]; 
        return undefined;
    }
    public setDocumentChangeInfo(fileName:string, documentChangeInfo: DocumentChangeInfo) {
        if (this.projectChangeInfo) {
            this.projectChangeInfo.docs_changed[fileName] = documentChangeInfo;
        }
    }
    

    public getLastTimeofPaste() { return this.last_time_of_paste; }
    public setLastTimeofPaste(date:Date) { this.last_time_of_paste = date; }

    public getLastCopiedText() { return this.last_copied_text;}
    public setLastCopiedText(text:string) { this.last_copied_text = text; }

    public getLastTimeofUndoRedo() { return this.last_time_of_undo_redo;}
    public setLastTimeofUndoRedo(date: Date) { this.last_time_of_undo_redo = date; }

    public getLastCameInFocus() { return this.last_came_in_focus; }

    public verifyExistingProjectAndFileData(fileName: string) {
        // vezi ca exista project change info, daca nu, creeaza-l
        if (!this.projectChangeInfo) {
          window.showInformationMessage('Project change info intialized');
          this.projectChangeInfo = new ProjectChangeInfo();
        }
      
        // porneste timer pentru project change pentru a emite datele colectate despre proiect la anumite intervale de timp
        if (!this.projectChangeInfoTimer) {
          window.showInformationMessage('Timer started');
          const timer = setTimeout(() => {
            emitProjectChangeData(); // EMIT!!!!
          }, DEFAULT_CHANGE_EMISSION_INTERVAL);
      
          this.projectChangeInfoTimer = timer;
        }
      
        // creeaza fila noua de schimbare pentru fisierul in care s-a produs schimbarea daca nu exista
        if (!this.projectChangeInfo.docs_changed[fileName]) {
          const docChangeInfo: DocumentChangeInfo = new DocumentChangeInfo();
            docChangeInfo.fileName = fileName; 
            //docChangeInfo.file_path = this.getRootPathForFile(fileName);
      
            docChangeInfo.start = new Date().toISOString(); // seteaza timpul de start al schimbarii in fisier
      
            this.projectChangeInfo.docs_changed[fileName] = docChangeInfo;
        }
      
        return this.projectChangeInfo.docs_changed[fileName];    
      }

      public addChangeDataToDocumentInfo(fileName:string, changeInfo: DocumentChangeInfo) {
        if (this.projectChangeInfo) {
            const docChangeInfo = this.projectChangeInfo?.docs_changed[fileName];
        
            docChangeInfo.linesAdded += changeInfo.linesAdded;
            docChangeInfo.linesDeleted += changeInfo.linesDeleted;
            docChangeInfo.charactersAdded += changeInfo.charactersAdded;
            docChangeInfo.charactersDeleted += changeInfo.charactersDeleted;
            docChangeInfo.changeType = changeInfo.changeType; // should remain the same!
        
            switch (changeInfo.changeType) {
            case 'singleDelete': {
                docChangeInfo.singleDeletes += 1;
                docChangeInfo.keystrokes += 1;
                break;
            }
            case 'multiDelete': {
                docChangeInfo.multiDeletes += 1;
                docChangeInfo.keystrokes += 1;
                break;
            }
            case 'singleAdd': {
                docChangeInfo.singleAdds += 1;
                docChangeInfo.keystrokes += 1;
                break;
            }
            case 'multiAdd': {
                docChangeInfo.multiAdds += 1;
                docChangeInfo.keystrokes += 1;
                break;
            }
            case 'autoIndent': {
                docChangeInfo.autoIndents += 1;
                docChangeInfo.keystrokes += 1;
                break;
            }
            case 'replacement': {
                docChangeInfo.replacements += 1;
                docChangeInfo.keystrokes += 1;
                break;
            }
            }
        
            this.projectChangeInfo.docs_changed[fileName] = docChangeInfo;
            //return docChangeInfo;
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
}