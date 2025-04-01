import { TextDocumentContentChangeEvent } from "vscode";
import { DocumentChangeInfo } from "./event_models";

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