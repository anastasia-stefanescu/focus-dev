
import fs from 'fs'
import { FileSystemWatcher, RelativePattern, workspace, WorkspaceFolder, Disposable, Uri, window } from 'vscode';

// Watch .git directory changes

export class GitTracking {
    private static instance: GitTracking;

    private _disposable: Disposable;

    private gitFolder: WorkspaceFolder | undefined = undefined;
    private localGitWatcher : FileSystemWatcher | undefined = undefined;
    private remoteGitWatcher : FileSystemWatcher | undefined = undefined;

    // if workspace wasn't opened yet / is changed, can we listen for it so we call this constructor?
    private constructor() {
        // !! Only works if the git directory is in the workspace
        let subscriptions: Disposable[] = [];
        if (workspace && workspace.workspaceFolders) {


            this.gitFolder = workspace.workspaceFolders[0]

            this.localGitWatcher = workspace.createFileSystemWatcher(
                new RelativePattern(this.gitFolder, '{**/.git/refs/heads/**}')
            );
            this.remoteGitWatcher = workspace.createFileSystemWatcher(
                new RelativePattern(this.gitFolder, '{**/.git/refs/remotes/**}')
            );

            // these subscriptions can be handled only in this file
            subscriptions.push(this.localGitWatcher);
            subscriptions.push(this.remoteGitWatcher);
            subscriptions.push(this.localGitWatcher.onDidChange(this.commitHandler, this));
            subscriptions.push(this.remoteGitWatcher.onDidChange(this.commitHandler, this));
            subscriptions.push(this.remoteGitWatcher.onDidCreate(this.branchCreateHandler, this)); // in what cases is onDidCreate activated???
            subscriptions.push(this.remoteGitWatcher.onDidDelete(this.branchDeleteHandler, this));
        }
        this._disposable = Disposable.from(...subscriptions);
    }

    public static getInstance(): GitTracking {
        if (!GitTracking.instance) {
            GitTracking.instance = new GitTracking();
        }
        return GitTracking.instance;
    }

    public commitHandler(event: Uri) {
        if (event.path.includes('/.git/refs/heads/')) { //locals!
            // /.git/refs/heads/<branch_name>
            const branch = event.path.split('.git/')[1]; // 1 or 2? extract branch name
            let commit;
            try {
                commit = fs.readFileSync(event.path, 'utf8').trimEnd();
            } catch (err: any) {
                window.showInformationMessage(`Error reading ${event.path}: ${err.message}`);
            }
            //this.tracker.trackGitLocalEvent('local_commit', branch, commit); // records local commit
        } else if (event.path.includes('/.git/refs/remotes/')) {
            // /.git/refs/remotes/<branch_name>
            //this.tracker.trackGitRemoteEvent(event);
        }
    }

    public branchCreateHandler() {

    }

    public branchDeleteHandler() {

    }
}
