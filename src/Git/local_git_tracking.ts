
import fs from 'fs'
import { FileSystemWatcher, RelativePattern, workspace, WorkspaceFolder, Disposable, Uri, window } from 'vscode';
import { getCurrentWorkspacePathAndName } from '../Util/util';
import { LOCAL_REFS_PATH, REMOTE_REFS_PATH } from '../Constants';
import { CommitData, getBranch, getBranchLastCommitData } from './git_api';
import { getRepoCredentials } from './repo_stats';
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

    private projectName: string | undefined = undefined;
    private owner: string | undefined = undefined;

    // if workspace wasn't opened yet / is changed, can we listen for it so we call this constructor?
    private constructor() {
        // !! Only works if the git directory is in the workspace
        let subscriptions: Disposable[] = [];
        if (workspace && workspace.workspaceFolders) {

            this.gitFolder = workspace.workspaceFolders[0]

            // for each branch there is a separate file in heads/remotes with the latest commit
            this.localGitWatcher = workspace.createFileSystemWatcher(
                new RelativePattern(this.gitFolder, '{**' + LOCAL_REFS_PATH + '**}')
            );

            // these subscriptions can be handled only in this file
            subscriptions.push(this.localGitWatcher);

            subscriptions.push(this.localGitWatcher.onDidChange(this.localCommitHandler, this));
            subscriptions.push(this.localGitWatcher.onDidCreate(this.localBranchCreateHandler, this));
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

    //==================FLOW
    // Local commit is made on a branch
    // Maybe sleep for a seconds while eventual changes can propagate to remote
    // Check for remote latest commit date
    // if remote_commit == local_commit:
    //      if remote_date < local_date:
    //         pull
    //      else:
    //         push
    // else
    //      local change (can be revert commit as well, can we detect this?)

    public async localCommitHandler(event: Uri) { // uri uses only '/' slashes
        const localCommitDate = new Date();
        // sleep here?
        if (event.path.includes(LOCAL_REFS_PATH)) {
            const branch = event.path.split('/')[3];
            const localCommitId = this.getCommitFromPath(event.path);

            if (localCommitId) {
                const commit : CommitData = {
                    id: localCommitId,
                    author: '',
                    date: localCommitDate.toISOString(),
                    branch: branch,
                }
                // these variables have to be set once somewhere
                const { owner, repoName } = await getRepoCredentials();
                const lastRemoteBranchCommit : CommitData | null = await getBranchLastCommitData(repoName, owner, branch);
                if (lastRemoteBranchCommit) {
                    if (commit.id === lastRemoteBranchCommit.id) {
                        if (commit.date > lastRemoteBranchCommit.date) {
                            window.showInformationMessage('GIT PULL!');
                            // register this somewhere globally
                        } else {
                            window.showInformationMessage('GIT PUSH!');
                            // create a success indicator and send it to cloud
                        }
                    } else {
                        window.showInformationMessage('LOCAL COMMIT/REVERT!');
                        // create success indicator
                    }
                } // else, branch does not exist remotely or there was an error
            }
        }
    }

    // Local branch is created
    // if remote branch exists:
    //     this means the branch was just imported
    //     check date of first commit => save in cloud memory
    // else:
    //     this means the branch was created locally
    //      save current date in cloud memory
    public async localBranchCreateHandler(event: Uri) {
        if (event.path.includes(LOCAL_REFS_PATH)) {
            const branch = event.path.split('/')[3];

            const { owner, repoName } = await getRepoCredentials();
            const remoteBranch = await getBranch(repoName, owner, branch);
            if (remoteBranch) {
                window.showInformationMessage('GIT BRANCH IMPORTED!');
                // fetch start date and save it in cloud memory?
            } else {
                window.showInformationMessage('GIT BRANCH CREATED LOCALLY!');
                // create success indicator
                // save current date in cloud memory
            }
        }
    } // mark current commit?

    public async localBranchDeleteHandler(event: Uri) {
        if (event.path.includes(LOCAL_REFS_PATH)) {
            const branch = event.path.split('/')[3];
            window.showInformationMessage('GIT BRANCH DELETED LOCALLY!');
            // create success indicator
            // delete from cloud memory ? -> mark as stale
        }
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
}
