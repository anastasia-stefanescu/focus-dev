
import { emit, hasUncaughtExceptionCaptureCallback } from "process";
import { TextDocumentChangeEvent, TextDocumentChangeReason } from "vscode";
import { window } from "vscode";
import { ProjectInfoManager } from "./event_management";
import { DocumentChangeInfo, ExecutionEventInfo, ExecutionType, ProjectInfo, UserActivityEventInfo, UserActivityType } from "./event_models";
import { extractChangeData } from "./event_data_extraction";
import { Source } from "./event_models";

import { instance } from "../extension"; // !!
import { getCurrentFileRelativePath } from "../Util/util";

// DOCUMENT CHANGE
export function verifyDocumentChange(event: TextDocumentChangeEvent) {
    const { contentChanges, document, reason } = event; // de verificat daca documentul exista si fereastra este deschisa si focusata

    const now = new Date();

    if (contentChanges.length === 0) {
        return "nothing"
    }

    let undo_redo: boolean = (reason === TextDocumentChangeReason.Redo || reason === TextDocumentChangeReason.Undo) ? true : false;

    let multiCursorInserts: boolean = (contentChanges.length > 1) ? true : false; // git additions, refactorizations, etc.

    // relative filePath
    const fileUri = window.activeTextEditor?.document.uri;
    const fileName = getCurrentFileRelativePath(fileUri);//document.fileName; // RETURNEAZA PATH (RELATIV); aici de verificat daca este fila e de un tip care ne intereseaza
    if (!fileName) return;

    let source: Source = undefined; // I suppose source is the same between the changes?
    contentChanges.forEach(async change => {
        const { text, range } = change;

        const changeInfo: DocumentChangeInfo = extractChangeData(change); // extracts data and 'analyse' the change
        //window.showInformationMessage(`Extracted: ${changeInfo.charactersAdded} characters, ${changeInfo.singleAdds} singleAdds,  ${changeInfo.lineCount} line count, ${changeInfo.linesAdded} lines added, ${changeInfo.multiAdds} multiAdds `);

        //window.showInformationMessage(`Processing change: ${changeInfo.linesAdded} lines Added, with ${changeInfo.changeType} change type, ${changeInfo.multiAdds} multiAdds`);
        // here we are separating between user/AI/external code - to set the 'source' field in the corresponding DocumentChangeInfo object
        if (undo_redo === false) {
            if (changeInfo.changeType == 'multiAdd' || changeInfo.charactersAdded> 100) {                         // not normal typing, one or more blocks of text were added
                if (multiCursorInserts === false) {                            // only one block of text; possible: paste, generated code, autocompletion
                    const lastCopiedText = instance.getLastCopiedText();
                    if (lastCopiedText != text) {                              // last globally copied text different than text that appeared => not paste
                        //window.showInformationMessage('Not paste, generated code/autocompletion!!');          // generated code, autocompletion
                        if (changeInfo.linesAdded > 4 || changeInfo.charactersAdded > 100) { // if more than one line or more than 100 characters, we consider it generated code
                            window.showInformationMessage('Generated code!');
                            source = 'AI';
                        } else {
                            if (changeInfo.charactersAdded > 5) {
                                window.showInformationMessage('Autocompletion!');
                                source = 'user';
                            }
                        }
                    } else {
                        source = verifyPaste();
                    }
                } else {  // code refactoring, git pulls/fetches/merges/branch changes, etc.
                    window.showInformationMessage('Multi cursor insert, is code refactoring!'); // git pull / 
                    handleMultipleInserts(now);
                }
            } else { // normal typing
                //window.showInformationMessage('Normal typing!');                                                     // one single character was added => NORMAL TYPING
                source = 'user';
            }
        } else {
            // Undo/ Redo - it just undoes the last event -> we have to delete the last event; undo from cache? we save it until extension is stopped normally - no because we concatenate events implement sort of a git blame to know for sure?
            // we track what code was written at some point, whether it is deleted later, that doesn't really mean much, an effort was made

            // deletion => handle it as documentChangeInfo delete; addition => userActivity
            if (changeInfo.changeType == 'singleDelete' || changeInfo.changeType == 'multiDelete') {
                source = 'user';
            } else if (changeInfo.changeType == 'singleAdd' || changeInfo.changeType == 'multiAdd') {
                createAndSaveUserActivityEvent('others'); // cursor change, user activity
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

export function verifyPaste(): Source {
    const lastInternalCopiedText = instance.getLastInternalCopiedText();
    const lastCopiedText = instance.getLastCopiedText();

    //window.showInformationMessage('Last copied text inside VSCode:', lastInternalCopiedText);

    if (lastCopiedText != lastInternalCopiedText) {
        window.showInformationMessage('Pasted code from external source');
        return 'external';
    }

    window.showInformationMessage('Pasted code from internal source');
    return 'user';
}

// ======================================================

// CLOSE / SAVE / DELETE FILE
export function handleCloseFile(fileName: string) {
    createAndSaveUserActivityEvent('file');
    instance.closeFileEvent(fileName); // close file's document change events
}

// OPEN / CREATE FILE
// what happens if file reopens in the same minute before sending to cache?
export function handleOpenFile(fileName: string) {
    createAndSaveUserActivityEvent('file');
    instance.closeAllFileEventsExcept(fileName);
}

// ======================================================

// WE TRACK WINDOW FOCUS BY THE USER ACTIVITY EVENT IN PROJECT INFO
export function handleWindowFocusChange(window_id: string, focused: boolean) {
    createAndSaveUserActivityEvent('window');
    // if (!focused) {
    //     instance.closeProjectUserActivity();
    // }
}


// check git pull / fetch / merge / rebase
export function handleMultipleInserts(now: Date) {
    if (verifyMultipleInserts(now) in ['git pull', 'git merge', 'branch change'])
        createAndSaveUserActivityEvent('git');
    else
        createAndSaveUserActivityEvent('others');
}

function verifyMultipleInserts(now: Date): string {
    const pullDate: Date = instance.getLastTimeofPull();
    const mergeDate: Date = instance.getLastTimeofMerge();
    const branchChangeDate: Date = instance.getLastTimeofBranchChange();

    const FIVE_SECONDS = 5 * 1000;

    if (Math.abs(now.getTime() - pullDate.getTime()) < FIVE_SECONDS) { // 5 seconds
        window.showInformationMessage('Multiple inserts detected because of git pull');
        return 'git pull';
    }
    if (Math.abs(now.getTime() - mergeDate.getTime()) < FIVE_SECONDS) { // 5 seconds
        window.showInformationMessage('Multiple inserts detected because of git merge');
        return 'git merge';
    }
    if (Math.abs(now.getTime() - branchChangeDate.getTime()) < FIVE_SECONDS) { // 5 seconds
        window.showInformationMessage('Multiple inserts detected because of branch change');
        return 'branch change';
    }
    return 'other';
}

export function createAndSaveUserActivityEvent(eventType: UserActivityType) {
    let userActivity: UserActivityEventInfo = new UserActivityEventInfo();

    switch (eventType) {
        case 'file':
            userActivity.file_actions += 1;
            break;
        case 'git':
            userActivity.git_actions += 1;
            break;
        case 'window':
            userActivity.window_focus_changes += 1;
            break;
        case 'cursor':
            userActivity.cursor_changes += 1;
            break;
        case 'others':
            userActivity.others += 1;
            break;
        default:
            window.showErrorMessage(`Unknown user activity type: ${eventType}`);
            throw new Error(`Unknown user activity type: ${eventType}`);
    }

    userActivity.total_actions += 1;

    instance.addUserActivityData(userActivity);
}


// ======================================================
export function startExecutionSession(session: any, type: ExecutionType) {
    instance.returnOrCreateExecution(session, type);
}

export function endExecutionSession(session: any) {
    const execSession = instance.getExecutionEventInfo(session.id);
    if (execSession) {
        execSession.end = new Date().getTime().toString();
        instance.setExecutionEventInfo(execSession);
    } else
        window.showErrorMessage('Try to end execution session that does not exist or type is not the same');
}
