
import { hasUncaughtExceptionCaptureCallback } from "process";
import { TextDocumentChangeEvent, TextDocumentContentChangeEvent, TextDocumentChangeReason } from "vscode";
import { window } from "vscode";
import { handleEvent, instance } from "./event_management";
import { DocumentChangeInfo, Event } from "./event_models";


export function verifyDocumentChange(event: TextDocumentChangeEvent, lastCopiedText:string, eventTime:Date ) { 
    const { contentChanges, document, reason } = event;

    if (contentChanges.length === 0) {
        return "nothing"
    }

    window.showInformationMessage(` Nr changes: ${contentChanges.length}, First change: ${contentChanges[0].text}, range ${contentChanges[0].range.start.line} - ${contentChanges[0].range.end.line}`);

    let undo_redo : boolean = false;
    if (reason === TextDocumentChangeReason.Redo || reason === TextDocumentChangeReason.Undo)
        undo_redo = true;

    let multiCursorInserts : boolean = false;
    if (contentChanges.length > 1) // git additions, refactorizations, etc. Code generation (usually?) happens in one place at a time
        multiCursorInserts = true;

    contentChanges.forEach(async change => {
        const { text, range } = change;

        const changeInfo: DocumentChangeInfo = extractChangeData(change);
        // also update new changes to the local changes

        // here we are looking to send 'unusual' events such as generating code, pasting from external sources, etc.
        // normal actions such as typing, deleting, copying, pasting, undo, redo, autocomplete, etc, are not sent immediately, what matters from them is just how much code was written and such.
        if (undo_redo === false) { 
            if (changeInfo.changeType == 'multiAdd' && multiCursorInserts === false) { // not typing, text was added somehow else
                // possible causes: paste, undo/redo, generated code, autocompletion, multi-line code refactorization, git pulls/fetches
                if (lastCopiedText != text) { // not paste
                    
                }
            }
        }


        
        // const numLines = text.split('\n').length;

        // //if (text.length == 0) { // Something else was done, or text was deleted. We're just checking if text appeared.
        //     // const change :Change = { type: "other", noLines:0}
        //     // allChanges.push(change);

        // if (text.length > 0) {
        //     //CHECK RATE OF TYPING!!!!
        //     // save last time of chang + previous last time of change and compare, if we had a text addition!!
        //     if (numLines < 5 ) { // normal typing
        //         //return "coding"
        //         await handleEvent(`Typed ${numLines} lines and ${text.length } length in ${document}`, '', 'coding', 'start', new Date());
        //     }
        //     else { // NOT ACTUALLY TYPED, BUT PASTED/GENERATED
        //         if (numLines > 5) { 
        //             // We already checked pasting cases - here we differentiate between pasting and generating
        //             if (lastCopiedText != text) { 
        //                 //generated. AI-generated code appears almost instantaneously compared to human typing speeds.
        //                 //code appearing from git pulls?
        //                 //return "generating"
        //                 await handleEvent(`Generated ${numLines} lines in ${document}`, '', 'generating', 'start', new Date());
        //             }
        //         }
        //     }
        // } // else it's a deletion
    });
}

export function extractChangeData(change: TextDocumentContentChangeEvent): DocumentChangeInfo {
    const changeInfo = new DocumentChangeInfo();
    changeInfo.linesDeleted = change.range.end.line - change.range.start.line;
    changeInfo.linesAdded = change.text?.match(/[\n\r]/g)?.length || 0;

    changeInfo.charactersDeleted = change.rangeLength - changeInfo.linesDeleted;
    changeInfo.charactersAdded = change.text.length - changeInfo.linesAdded;

    ///////////////////////////////
    if (changeInfo.charactersDeleted > 0 || changeInfo.linesDeleted > 0) {
        if (changeInfo.charactersAdded > 0) {
          changeInfo.changeType = 'replacement';
        } else if (changeInfo.charactersDeleted > 1 || changeInfo.linesDeleted > 1) {
          changeInfo.changeType = 'multiDelete';
        } else if (changeInfo.charactersDeleted === 1 || changeInfo.linesDeleted === 1) {
          changeInfo.changeType = 'singleDelete';
        }
      } else if (changeInfo.charactersAdded > 1 || changeInfo.linesAdded > 1) {
        let hasAutoIndentMatch: boolean = (change.text.match(/^[\n\r]\s*$/)?.length === 1);
        if (hasAutoIndentMatch) {
          // the regex matches a text that is a newline followed by only whitespace
          changeInfo.charactersAdded = 0;
          changeInfo.changeType = 'autoIndent';
        } else {
          changeInfo.changeType = 'multiAdd';
        }
      } else if (changeInfo.charactersAdded === 1 || changeInfo.linesAdded === 1) {
        changeInfo.changeType = 'singleAdd';
      }

    return changeInfo;
}

export async function verifyPaste(clipboardText:string) {
    const lastCopiedText = instance.getCopiedText();
    window.showInformationMessage('Last copied text inside VSCode:', lastCopiedText);

    if (clipboardText != lastCopiedText) { 
        window.showInformationMessage('Pasted code from external source');

        await handleEvent(`Pasted external code`, '', 'coding-external', 'start', new Date());
    } else {
        window.showInformationMessage('Pasted code from internal source');
        await handleEvent(`Pasted internal code`, '', 'coding-external', 'start', new Date());
    }
}