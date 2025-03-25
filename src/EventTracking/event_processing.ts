
import { hasUncaughtExceptionCaptureCallback } from "process";
import { TextDocumentChangeEvent, TextDocumentContentChangeEvent, TextDocumentChangeReason } from "vscode";
import { window } from "vscode";
import { handleEvent, CurrentSessionVariables} from "./event_management";
import { DocumentChangeInfo, Event, ProjectChangeInfo } from "./event_models";
import { DEFAULT_CHANGE_EMISSION_INTERVAL } from "../Constants";


export function verifyDocumentChange(event: TextDocumentChangeEvent, lastCopiedText:string, eventTime:Date ) { 
    const { contentChanges, document, reason } = event; // de verificat daca documentul exista si fereastra este deschisa si focusata

    if (contentChanges.length === 0) {
      return "nothing"
    } //window.showInformationMessage(` Nr changes: ${contentChanges.length}, First change: ${contentChanges[0].text}, range ${contentChanges[0].range.start.line} - ${contentChanges[0].range.end.line}`);

    let undo_redo: boolean = (reason === TextDocumentChangeReason.Redo || reason === TextDocumentChangeReason.Undo) ? true : false;

    let multiCursorInserts : boolean = (contentChanges.length > 1) ? true : false; // git additions, refactorizations, etc. Code generation (usually?) happens in one place at a time

    const fileName = document.fileName; // aici de verificat daca este fila de care ne intereseaza
    verifyExistingProjectAndFileData(fileName); // verifica daca exista date despre proiect si fisier, daca nu, creeaza-le

    contentChanges.forEach(async change => {
        const { text, range } = change;

        const changeInfo: DocumentChangeInfo = extractChangeData(change); // extracts data and 'analyse' the change
        addChangeDataToDocumentInfo(fileName, changeInfo); // add changes to the file change info

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

export function verifyExistingProjectAndFileData(fileName: string) {
  // vezi ca exista project change info, daca nu, creeaza-l
  if (!CurrentSessionVariables.getInstance().getProjectChangeInfo()) {
    window.showInformationMessage('Project change info intialized');
    CurrentSessionVariables.getInstance().setProjectChangeInfo(new ProjectChangeInfo());
  }

  // porneste timer pentru project change pentru a emite datele colectate despre proiect la anumite intervale de timp
  if (!CurrentSessionVariables.getInstance().getTimer()) {
    window.showInformationMessage('Timer started');
    const timer = setTimeout(() => {
      CurrentSessionVariables.getInstance().emitProjectChangeData(); // EMIT!!!!
    }, DEFAULT_CHANGE_EMISSION_INTERVAL);

    CurrentSessionVariables.getInstance().setTimer(timer);
  }

  // creeaza fila noua de schimbare pentru fisierul in care s-a produs schimbarea daca nu exista
  if (!CurrentSessionVariables.getInstance().getDocumentChangeInfo(fileName)) {
    const docChangeInfo: DocumentChangeInfo = new DocumentChangeInfo();
      docChangeInfo.fileName = fileName;
      //docChangeInfo.file_path = this.getRootPathForFile(fileName);

      docChangeInfo.start = new Date().getTime(); // seteaza timpul de start al schimbarii in fisier

      CurrentSessionVariables.getInstance().setDocumentChangeInfo(fileName, docChangeInfo);
  }

  return CurrentSessionVariables.getInstance().getDocumentChangeInfo(fileName);    
}

export function extractChangeData(change: TextDocumentContentChangeEvent): DocumentChangeInfo {

    const changeInfo = new DocumentChangeInfo();

    changeInfo.linesDeleted = change.range.end.line - change.range.start.line;
    changeInfo.linesAdded = change.text?.match(/[\n\r]/g)?.length || 0;

    changeInfo.charactersDeleted = change.rangeLength - changeInfo.linesDeleted;
    changeInfo.charactersAdded = change.text.length - changeInfo.linesAdded;

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

export function addChangeDataToDocumentInfo(fileName:string, changeInfo: DocumentChangeInfo): DocumentChangeInfo {
  const docChangeInfo = CurrentSessionVariables.getInstance().getDocumentChangeInfo(fileName);

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

  CurrentSessionVariables.getInstance().setDocumentChangeInfo(fileName, docChangeInfo);
  return docChangeInfo;
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