
import { emit, hasUncaughtExceptionCaptureCallback } from "process";
import { TextDocumentChangeEvent, TextDocumentChangeReason } from "vscode";
import { window } from "vscode";
import { CurrentSessionVariables} from "./event_management";
import { DocumentChangeInfo, ExecutionEventInfo, ProjectInfo, UserActivityEventInfo } from "./event_models";
import { extractChangeData } from "./event_data_extraction";
import { Source } from "./event_models";

import { instance } from "../extension"; // !!

// DOCUMENT CHANGE
export function verifyDocumentChange(event: TextDocumentChangeEvent, lastCopiedText:string, eventTime:Date ) {
    const { contentChanges, document, reason } = event; // de verificat daca documentul exista si fereastra este deschisa si focusata

    if (contentChanges.length === 0) {
      return "nothing"
    }

    let undo_redo: boolean = (reason === TextDocumentChangeReason.Redo || reason === TextDocumentChangeReason.Undo) ? true : false;

    let multiCursorInserts : boolean = (contentChanges.length > 1) ? true : false; // git additions, refactorizations, etc.

    const fileName = document.fileName;                                       // aici de verificat daca este fila e de un tip care ne intereseaza

    let source: Source = undefined; // I suppose source is the same between the changes?
    contentChanges.forEach(async change => {
        const { text, range } = change;

        const changeInfo: DocumentChangeInfo = extractChangeData(change); // extracts data and 'analyse' the change
        console.log('verifyDocumentChange: extracted change data!');

        // here we are separating between user/AI/external code - to set the 'source' field in the corresponding DocumentChangeInfo object
        if (undo_redo === false) {
            if (changeInfo.changeType == 'multiAdd') {                         // not normal typing, one or more blocks of text were added
                if (multiCursorInserts === false) {                            // only one block of text; possible: paste, generated code, autocompletion
                    if (lastCopiedText != text) {                              // last globally copied text different than text that appeared => not paste
                        window.showInformationMessage('Not paste, generated code/autocompletion!!');          // generated code, autocompletion
                        if (changeInfo.linesAdded > 4) {
                            window.showInformationMessage('Generated code!');
                            source = 'AI';
                        } else {
                            window.showInformationMessage('Autocompletion!');
                            source = 'user';
                        }
                    } else {
                        source = verifyPaste(lastCopiedText);
                    }
                } else {  // mark the activity as 'other' user activity; take into account DocumentChangeInfo or discard it?                                                     // code refactoring, git pulls/fetches
                    window.showInformationMessage('Multi cursor insert, git pull / code refactoring!');
                    // if is git pull
                    const userActivity: UserActivityEventInfo = handleMultipleInserts();
                    instance.addUserActivityData(userActivity);
                }
            } else {                                                           // one single character was added => NORMAL TYPING
                console.log('Normal typing!');
                source = 'user';                                             // normal typing
            }
        } else {
            // Undo/ Redo - it just undoes the last event -> we have to delete the last event; undo from cache? we save it until extension is stopped normally - no because we concatenate events implement sort of a git blame to know for sure?
            // we track what code was written at some point, whether it is deleted later, that doesn't really mean much, an effort was made

            // deletion => handle it as documentChangeInfo delete; addition => userActivity
            if (changeInfo.changeType == 'singleDelete' || changeInfo.changeType == 'multiDelete') {
                source = 'user';
            } else if (changeInfo.changeType == 'singleAdd' || changeInfo.changeType == 'multiAdd') {
                const userActivity: UserActivityEventInfo = new UserActivityEventInfo();
                userActivity.others += 1;
                instance.addUserActivityData(userActivity);
            }
        }

        if (source !== undefined) { // exclude the case when we have a multi cursor insert => not user written
            changeInfo.source = source;
            instance.addDocumentChangeData(fileName, changeInfo);               // verifica daca exista date despre proiect si fisier, daca nu, creeaza-le; add changes to the file change info
        }
    });

    const documentChangeInfo = instance.getDocChangeForSource(source, fileName); // get the document change info for the file and source
    if (documentChangeInfo)
        window.showInformationMessage(`Document change info: ${documentChangeInfo.keystrokes} keystrokes, ${documentChangeInfo.multiAdds} multiadds, ${documentChangeInfo.singleAdds} singleadds, ${documentChangeInfo.autoIndents} autoindents, ${documentChangeInfo.replacements} replacements`);
    else
        window.showInformationMessage(`Document change info: ${fileName} not found!`);
}

// WHEN ARE USER ACTIVITY EVENTS ENDING??? - ending every minute when they are sent to cache

// ======================================================

// CLOSE / SAVE / DELETE FILE
export function handleCloseFile(fileName:string) {
    addFileAction();
    instance.closeFileEvent(fileName);
}

// OPEN / CREATE FILE
export function handleOpenFile(fileName:string) {
    addFileAction();
    instance.closeAllFileEventsExcept(fileName);
    //emitToCacheProjectChangeData(); // why we do this is to set the 'end' of the event
}

export function addFileAction() {
    const userActivity: UserActivityEventInfo = new UserActivityEventInfo();
    userActivity.file_actions += 1;
    instance.addUserActivityData(userActivity);
}

// ======================================================

export function verifyPaste(clipboardText:string) : Source {
    const lastCopiedText = instance.getLastCopiedText();
    window.showInformationMessage('Last copied text inside VSCode:', lastCopiedText);

    if (clipboardText != lastCopiedText) {
        window.showInformationMessage('Pasted code from external source');
        return 'external';
    }

    window.showInformationMessage('Pasted code from internal source');
    return 'user';
}

export function handleMultipleInserts() : UserActivityEventInfo {

    // check git pull / fetch / merge / rebase

    let userActivity: UserActivityEventInfo = new UserActivityEventInfo();
    if (verifyMultipleInserts() === 'git pull')
        userActivity.git_actions += 1;
    else
        userActivity.others += 1;

    return userActivity;
}

function verifyMultipleInserts() {
    return 'git pull';
}

// ======================================================
export function startExecutionSession(session: any, type:string){
    const execSession: ExecutionEventInfo = new ExecutionEventInfo();
    // execSession.sessionId = id;
    // execSession.sessionName = name;
    // execSession.eventType = type;


    instance.verifyExistingProjectData();
    instance.setExecutionEventInfo(execSession); // add the session to the cache
}
