import { workspace, window, Uri } from 'vscode';
import * as path from 'path'

// GET THESE UNIVERSALLY ACCROSS OPERATING SYSTEMS??

export function getCurrentWorkspacePathAndName() : { path: string, name: string } | undefined{
    const workspaceFolders = workspace.workspaceFolders;
    const fileUri = window.activeTextEditor?.document.uri;

    if (workspaceFolders && workspaceFolders.length > 0) {
        const rootUri = workspaceFolders[0].uri; // assumes single-root workspace
        const rootFolder = workspaceFolders[0];
        return { "path": rootUri.fsPath, "name": rootFolder.name};
    } else
        return undefined;
}

// pass it fileUri = vscode.window.activeTextEditor?.document.uri;
export function getCurrentFileRelativePath(fileUri : Uri | undefined) : string | undefined {
    const rootData = getCurrentWorkspacePathAndName();
    if (fileUri && rootData) {
        const relativePath = workspace.asRelativePath(fileUri, false);
        return relativePath;
    } else {
        if (fileUri) // nu e deschisa in proiect
            return fileUri.path; // URI path (always with /, even on Windows - as opposed to fsPath).
        else
            return undefined;
    }

}
