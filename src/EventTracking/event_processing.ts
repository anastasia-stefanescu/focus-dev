
import { hasUncaughtExceptionCaptureCallback } from "process";
import { TextDocumentChangeEvent, TextDocumentContentChangeEvent, TextDocumentChangeReason } from "vscode";
import { window } from "vscode";
import { handleEvent, instance } from "./event_management";

interface Change {
    type: string,
    noLines: number
}

const normalNoLines = 5 // change when in flow??

// onDidChangeTextDocument is triggered when:
    // the user types something
    // Undo and Redo, save, formatters are fired
    // discarding changes with Git
export function verifyDocumentChange(event: TextDocumentChangeEvent, lastCopiedText:string ) { //  Change[]
    const { contentChanges, document, reason } = event;

    // if (reason == 1 || reason == 2) ??
    if (contentChanges.length === 0) {
        return "nothing"
        // const change :Change = { type: "nothing", noLines:0}
        // return [change];
    }

    // const allChanges : Change[] = [];
    // Each change is stored in event.contentChanges, which contains:
    // range → The affected range (start & end positions before the change).
    // text → The new text that replaced the range (empty if deleted).  
    contentChanges.forEach(async change => {
        const { text, range } = change;
        const numLines = text.split('\n').length;

        //if (text.length == 0) { // Something else was done, or text was deleted. We're just checking if text appeared.
            // const change :Change = { type: "other", noLines:0}
            // allChanges.push(change);

        if (text.length > 0) {
            //CHECK RATE OF TYPING!!!!
            // save last time of chang + previous last time of change and compare, if we had a text addition!!
            if (numLines < 5 ) { // normal typing
                //return "coding"
                await handleEvent(`Typed ${numLines} lines in ${document}`, '', 'coding', 'start', new Date());
            }
            else { // NOT ACTUALLY TYPED, BUT PASTED/GENERATED
                if (numLines > 5) { 
                    // We already checked pasting cases - here we differentiate between pasting and generating
                    if (lastCopiedText != text) { 
                        //generated. AI-generated code appears almost instantaneously compared to human typing speeds.
                        //code appearing from git pulls?
                        //return "generating"
                        await handleEvent(`Generated ${numLines} lines in ${document}`, '', 'generating', 'start', new Date());
                    }
                }
            }
        }
    });
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