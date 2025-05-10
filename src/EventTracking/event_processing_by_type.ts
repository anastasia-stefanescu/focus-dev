
import { emit, hasUncaughtExceptionCaptureCallback } from "process";
import { TextDocumentChangeEvent, TextDocumentChangeReason } from "vscode";
import { window } from "vscode";
import { CurrentSessionVariables} from "./event_management";
import { DocumentChangeInfo, ExecutionEventInfo, ExecutionType, ProjectInfo, UserActivityEventInfo } from "./event_models";
import { extractChangeData } from "./event_data_extraction";
import { Source } from "./event_models";

import { instance } from "../extension"; // !!
import { getCurrentFileRelativePath } from "../Util/util";

// DOCUMENT CHANGE
export function verifyDocumentChange(event: TextDocumentChangeEvent) {
    const { contentChanges, document, reason } = event; // de verificat daca documentul exista si fereastra este deschisa si focusata

    if (contentChanges.length === 0) {
      return "nothing"
    }

    let undo_redo: boolean = (reason === TextDocumentChangeReason.Redo || reason === TextDocumentChangeReason.Undo) ? true : false;

    let multiCursorInserts : boolean = (contentChanges.length > 1) ? true : false; // git additions, refactorizations, etc.

    // relative filePath
    const fileUri = window.activeTextEditor?.document.uri;
    const fileName = getCurrentFileRelativePath(fileUri);//document.fileName; // RETURNEAZA PATH (RELATIV); aici de verificat daca este fila e de un tip care ne intereseaza
    if (!fileName) return;

    let source: Source = undefined; // I suppose source is the same between the changes?
    contentChanges.forEach(async change => {
        const { text, range } = change;

        const changeInfo: DocumentChangeInfo = extractChangeData(change); // extracts data and 'analyse' the change
        //window.showInformationMessage(`Extracted: ${changeInfo.charactersAdded} characters, ${changeInfo.singleAdds} singleAdds,  ${changeInfo.lineCount} line count, ${changeInfo.linesAdded} lines added, ${changeInfo.multiAdds} multiAdds `);

        // here we are separating between user/AI/external code - to set the 'source' field in the corresponding DocumentChangeInfo object
        if (undo_redo === false) {
            if (changeInfo.changeType == 'multiAdd') {                         // not normal typing, one or more blocks of text were added
                if (multiCursorInserts === false) {                            // only one block of text; possible: paste, generated code, autocompletion
                    const lastCopiedText = instance.getLastCopiedText();
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
                        source = verifyPaste();
                    }
                } else {  // mark the activity as 'other' user activity; take into account DocumentChangeInfo or discard it?                                                     // code refactoring, git pulls/fetches
                    window.showInformationMessage('Multi cursor insert, is git pull / code refactoring!');
                    // if is git pull
                    const userActivity: UserActivityEventInfo = handleMultipleInserts();
                    instance.addUserActivityData(userActivity);
                }
            } else {
                //window.showInformationMessage('Normal typing!');                                                     // one single character was added => NORMAL TYPING
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

    // for verifying the data
    // const documentChangeInfo = instance.getDocChangeForSource(source, fileName); // get the document change info for the file and source
    // if (documentChangeInfo)
    //     window.showInformationMessage(documentChangeInfo.displayData('After processing_by_type: '));
    // else
    //     window.showInformationMessage(`After processing_by_type: Document change: ${fileName} not found!`);
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

export function verifyPaste() : Source {
    const lastInternalCopiedText = instance.getLastInternalCopiedText();
    const lastCopiedText = instance.getLastCopiedText();

    window.showInformationMessage('Last copied text inside VSCode:', lastInternalCopiedText);

    if (lastCopiedText != lastInternalCopiedText) {
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
export function startExecutionSession(session: any, type:ExecutionType){
    instance.returnOrCreateExecution(session, type);
}

export function endExecutionSession(session:any) {
    const execSession = instance.getExecutionEventInfo(session.id);
    if (execSession){
        execSession.end = new Date().toISOString();
        instance.setExecutionEventInfo(execSession);
    } else
        window.showErrorMessage('Try to end execution session that does not exist or type is not the same');
}
