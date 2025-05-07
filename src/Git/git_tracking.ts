
import fs from 'fs'
import { FileSystemWatcher, RelativePattern, workspace, WorkspaceFolder, Disposable, Uri, window } from 'vscode';
import { getCurrentWorkspacePathAndName } from '../Util/util';

// Watch .git directory changes

export class GitTracking {
    private static instance: GitTracking;

    private _disposable: Disposable;

    private gitFolder: WorkspaceFolder | undefined = undefined;
    private localGitWatcher : FileSystemWatcher | undefined = undefined;
    private remoteGitWatcher : FileSystemWatcher | undefined = undefined;

    private lastLocalCommit: {[key:string] : string} = {};
    private lastRemoteCommit: { [key: string]: string } = {};

    private localChanged : {[key:string]:boolean} = {};
    private remoteChanged: {[key:string]:boolean} = {};

    // if workspace wasn't opened yet / is changed, can we listen for it so we call this constructor?
    private constructor() {
        // !! Only works if the git directory is in the workspace
        let subscriptions: Disposable[] = [];
        if (workspace && workspace.workspaceFolders) {


            this.gitFolder = workspace.workspaceFolders[0]

            // for each branch there is a separate file in heads/remotes with the latest commit
            this.localGitWatcher = workspace.createFileSystemWatcher(
                new RelativePattern(this.gitFolder, '{**/.git/refs/heads/**}')
            );
            this.remoteGitWatcher = workspace.createFileSystemWatcher(
                new RelativePattern(this.gitFolder, '{**/.git/refs/remotes/origin/**}')
            );

            // these subscriptions can be handled only in this file
            subscriptions.push(this.localGitWatcher);
            subscriptions.push(this.remoteGitWatcher);
            // here do we have to use the same commit handler for both watchers?
            subscriptions.push(this.localGitWatcher.onDidChange(() => {
                this.commitChangeHandler;
            }, this));
            subscriptions.push(this.remoteGitWatcher.onDidChange(this.commitChangeHandler, this));
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

    // verify cause for latest commit changing - git pull / fetch / merge / rebase / commit / revert commit
    // git push : remote commit becomes local commit
    // git pull : local commit becomes remote commit - can we get it?
    // git local commit : local commit changes, remote doesn't
    // git revert commit -> goes back to some previous local commit
    // git merge: ?

    // MAYBE EXECUTE A 'GIT FETCH -ALL' TO HAVE LATEST COMMIT DATA!!

    // Also track tags

    // BOTTLENECK??
    public commitChangeHandler(event: Uri) { // uri uses only '/' slashes
        if (event.path.includes('/.git/refs/heads/')) {                                           // /.git/refs/heads/<branch_name>
            const branch = event.path.split('/')[3];                                          // extract branch name
            const commit = this.getCommitFromPath(event.path);
            if (commit) { // commit was made / brought through pull locally
                const remoteCommit = this.checkRemoteBranchCommitExists(branch);
                if (remoteCommit) {
                    if (remoteCommit != this.lastRemoteCommit[branch]) // abia a ajuns pe remote
                        if (remoteCommit == commit) // push
                            window.showInformationMessage('GIT PUSH!');

                }


            }
            //this.tracker.trackGitLocalEvent('local_commit', branch, commit);                    // records local commit
        } else if (event.path.includes('/.git/refs/remotes/')) {
            window.showErrorMessage('Local git listener picked up remote commit');
            // /.git/refs/remotes/<branch_name>
            //this.tracker.trackGitRemoteEvent(event);
        }
    }

    public branchCreateHandler() {

    }

    public branchDeleteHandler() {

    }

    public getCommitFromPath(path: string) {
        let commit = undefined;
        try {
            commit = fs.readFileSync(path, 'utf8').trimEnd();
            window.showInformationMessage('Got commit: ', commit);
        } catch (err: any) {
            window.showErrorMessage(`Error reading ${path} to get commit: ${err.message}`);
        }
        return commit;
    }

    // a remote branch outside of main exists if we have pushed to it from local
    public checkRemoteBranchCommitExists(branch: string) {
        // get current workspace path:
        const workspacePath = getCurrentWorkspacePathAndName();
        if (workspacePath) {
            const path = workspacePath.path + '/.git/refs/remotes/origin/' + branch;
            if (fs.existsSync(path)) {
                const commit = fs.readFileSync(path, 'utf8').trimEnd();
                return commit;
            }
        }
        return undefined;
    }
}
