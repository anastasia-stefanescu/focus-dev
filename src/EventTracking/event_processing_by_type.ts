
import { hasUncaughtExceptionCaptureCallback } from "process";
import { TextDocumentChangeEvent, TextDocumentContentChangeEvent, TextDocumentChangeReason } from "vscode";
import { window } from "vscode";
import { CurrentSessionVariables} from "./event_management";
import { DocumentChangeInfo, ProjectChangeInfo } from "./event_models";
import { DEFAULT_CHANGE_EMISSION_INTERVAL } from "../Constants";
import { closeOtherFilesInfo, emitProjectChangeData } from "./event_sending";
import { extractChangeData } from "./event_data_extraction";

// DOCUMENT CHANGE
export function verifyDocumentChange(event: TextDocumentChangeEvent, lastCopiedText:string, eventTime:Date ) { 
    const { contentChanges, document, reason } = event; // de verificat daca documentul exista si fereastra este deschisa si focusata

    if (contentChanges.length === 0) {
      return "nothing"
    } //window.showInformationMessage(` Nr changes: ${contentChanges.length}, First change: ${contentChanges[0].text}, range ${contentChanges[0].range.start.line} - ${contentChanges[0].range.end.line}`);

    let undo_redo: boolean = (reason === TextDocumentChangeReason.Redo || reason === TextDocumentChangeReason.Undo) ? true : false;

    let multiCursorInserts : boolean = (contentChanges.length > 1) ? true : false; // git additions, refactorizations, etc. Code generation (usually?) happens in one place at a time

    const fileName = document.fileName; // aici de verificat daca este fila de care ne intereseaza
    CurrentSessionVariables.getInstance().verifyExistingProjectAndFileData(fileName); // verifica daca exista date despre proiect si fisier, daca nu, creeaza-le

    contentChanges.forEach(async change => {
        const { text, range } = change;

        const changeInfo: DocumentChangeInfo = extractChangeData(change); // extracts data and 'analyse' the change
        CurrentSessionVariables.getInstance().addChangeDataToDocumentInfo(fileName, changeInfo); // add changes to the file change info

        // here we are looking to send 'unusual' events such as generating code, pasting from external sources, etc.
        // normal actions such as typing, deleting, copying, pasting, undo, redo, autocomplete, etc, are not sent immediately, what matters from them is just how much code was written and such.
        // we are especially looking at multiAdd changes => paste, undo/redo, generated code, autocompletion, multi-line code refactorization, git pulls/fetches
        
        if (undo_redo === false) { 
            if (changeInfo.changeType == 'multiAdd' && multiCursorInserts === false) { // not normal typing, one block of text was added; possible causes: paste, generated code, autocompletion
                if (lastCopiedText != text) { // last globally copied text different than text that appeared => not paste
                    window.showInformationMessage('Not paste!!'); // generated code, autocompletion
                } else {
                  verifyPaste(lastCopiedText);
                }
            } // else, multi-line code refactorization, git pulls/fetches
        }

        // daca e schimbare generata de ceva extern, trebuie trimisa imediat??
        // de adaugat author la schimbare !!! (in viitor asta se va integra si cu git)
        // se emit datele!!
    });

    const documentChangeInfo = CurrentSessionVariables.getInstance().getDocumentChangeInfo(fileName);
    window.showInformationMessage(`Document change info: ${documentChangeInfo.keystrokes} keystrokes, ${documentChangeInfo.multiAdds} multiadds, ${documentChangeInfo.singleAdds} singleadds, ${documentChangeInfo.autoIndents} autoindents, ${documentChangeInfo.replacements} replacements`);
}

// CLOSE / SAVE FILE
export function handleCloseFile(fileName:string) {
    closeOtherFilesInfo(fileName);
}

// OPEN FILE 
export function handleOpenFile(fileName:string) {
    closeOtherFilesInfo(fileName);
}

export async function verifyPaste(clipboardText:string) {
    const lastCopiedText = CurrentSessionVariables.getInstance().getLastCopiedText();
    window.showInformationMessage('Last copied text inside VSCode:', lastCopiedText);

    if (clipboardText != lastCopiedText) { 
        window.showInformationMessage('Pasted code from external source');

        //await handleEvent(`Pasted external code`, '', 'coding-external', 'start', new Date());
    } else {
        window.showInformationMessage('Pasted code from internal source');
        //await handleEvent(`Pasted internal code`, '', 'coding-external', 'start', new Date());
    }
}