
import { hasUncaughtExceptionCaptureCallback } from "process";
import { TextDocumentChangeEvent, TextDocumentContentChangeEvent, TextDocumentChangeReason } from "vscode";
import { window } from "vscode";
import { handleEvent, instance } from "./event_management";

// onDidChangeTextDocument is triggered when:
    // the user types something
    // Undo and Redo, save, formatters are fired
    // discarding changes with Git
export async function verifyDocumentChange(event: TextDocumentChangeEvent ):string {
    const { contentChanges, document, reason } = event;

    if (reason == 1 || reason == 2) 
    if (contentChanges.length === 0) return 'nothing';

    // Each change is stored in event.contentChanges, which contains:
    // range → The affected range (start & end positions before the change).
    // text → The new text that replaced the range (empty if deleted).  
    contentChanges.forEach(async change => {
        const { text, range } = change;
        const numLines = text.split('\n').length;

        if (text.length <5 ) { // normal typing
            await handleEvent(`Typed ${text.length} lines in ${document}`, '', 'coding', 'start', new Date());
        }
        else {
            if (numLines > 5) { // text was either pasted or generated
                const last_copy = instance.getCopiedText();
                if (last_copy == text) { // text was copied
                    await handleEvent(`Copy-pasted ${text.length} lines in ${document}`, '', 'copy-paste', 'start', new Date());
                } 
                else { // imported from somewhere else or generated
                    // window unfocused + immediate apparition of code => pasted from external sources, not generated


                    // AI-generated code appears almost instantaneously compared to human typing speeds.
                    // Might be accompanied by 'Enter' to accept a generation of code
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