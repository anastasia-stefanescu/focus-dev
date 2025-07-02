
import fs from 'fs'
import { FileSystemWatcher, RelativePattern, workspace, WorkspaceFolder, Disposable, Uri, window } from 'vscode';
import { getCurrentWorkspacePathAndName } from '../Util/util';
import { LOCAL_REFLOG_PATH, LOCAL_REFS_PATH, REMOTE_REFS_PATH } from '../Constants';
import { getBranch, getBranchLastCommitData } from './git_api';
import { CommitData } from './git_models';
import { getGitBranchReflogs, getGitCredentials, getRepoCredentials } from './local_repo_stats';
import { SuccessIndicator } from '../EventTracking';
import { instance } from '../extension';
import { sendEventsToAWSDB } from '../API/api_wrapper';
// Watch .git directory changes

export class GitTracking {
    private static instance: GitTracking;

    private _disposable: Disposable;

    private gitFolder: WorkspaceFolder | undefined = undefined;
    private localGitWatcher : FileSystemWatcher | undefined = undefined;
    private localReflogWatcher : FileSystemWatcher | undefined = undefined;

    private localBranches: {[key:string]:string} = {};
    private currentBranch: string | undefined = undefined;

    public readonly username: string;
    public readonly projectName: string;
    public readonly gitOwner: string;
    public readonly gitToken: string;

    // if workspace wasn't opened yet / is changed, can we listen for it so we call this constructor?
    private constructor(accountLabel: string, gitToken: string, gitOwner: string, repoName: string) {
        // !! Only works if the git directory is in the workspace
        let subscriptions: Disposable[] = [];
        if (workspace && workspace.workspaceFolders) {

            this.gitFolder = workspace.workspaceFolders[0]

            this.localReflogWatcher = workspace.createFileSystemWatcher(
                new RelativePattern(this.gitFolder, '{**' + LOCAL_REFLOG_PATH + '**}')
            );
            // for each branch there is a separate file in heads/remotes with the latest commit
            this.localGitWatcher = workspace.createFileSystemWatcher(
                new RelativePattern(this.gitFolder, '{**' + LOCAL_REFS_PATH + '**}')
            );

            // these subscriptions can be handled only in this file
            subscriptions.push(this.localGitWatcher);

            subscriptions.push(this.localReflogWatcher.onDidCreate(this.reflogChangeHandler, this));
            subscriptions.push(this.localGitWatcher.onDidCreate(this.localBranchCreateHandler, this));
            subscriptions.push(this.localGitWatcher.onDidDelete(this.localBranchDeleteHandler, this));
            console.log('Local git watcher created', this.localGitWatcher);
        }

        this.username = accountLabel;
        this.gitToken = gitToken;
        this.gitOwner = gitOwner;
        this.projectName = repoName;
        this._disposable = Disposable.from(...subscriptions);

        this.getAllLocalBranches();

        console.log('Git token:', this.gitToken);
        console.log('Git owner:', this.gitOwner);
        console.log('Git project name:', this.projectName);
        console.log('Git username:', this.username);
    }

    public static async getInstance(): Promise<GitTracking | undefined> {
        if (!GitTracking.instance) {
            console.log('Trying to create new GitTracking instance');
            const { accountLabel, token, owner, repoName } = await getGitCredentials();
            if (!token || !owner || !repoName) {
                window.showInformationMessage('Git token or repo not found! Please log in to GitHub for a better experience');
                return undefined;
            }

            GitTracking.instance = new GitTracking(accountLabel, token, owner, repoName);
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

    public async reflogChangeHandler(event: Uri) {
    }

    public async localCommitHandler(eventPath: string, branchName: string) { // uri uses only '/' slashes
        console.log('Local commit handler triggered');
        const localCommitDate = new Date();
        const localCommitId = this.getCommitFromPath(eventPath);

        // sleep here?
        if (localCommitId) {
            console.log('Event uri is valid');

            const commit : CommitData = {
                id: localCommitId,
                title: '',
                author: '',
                date: localCommitDate.toISOString(),
                branch: branchName,
            }

            const branchReflogs = await getGitBranchReflogs(branchName);
            const lastReflog = branchReflogs[0];
            const reflogParts = lastReflog.split(':');
            const actionName = reflogParts[1].trim();

            console.log('Last reflog:', actionName.toUpperCase());

            switch (actionName.toUpperCase()) {
                case 'COMMIT':
                    commit.author = this.username;
                    window.showInformationMessage('LOCAL COMMIT!');
                    // create success indicator
                    const successIndicator: SuccessIndicator = new SuccessIndicator({
                        start: new Date().getTime().toString(),
                        end : new Date().getTime().toString(),
                        projectDirectory: this.gitFolder?.uri.fsPath || '', // modify this
                        projectName: this.projectName,
                        branch: branchName,
                        type: "commit",
                        status: 'SUCCESS',
                        message: 'something' // get message from anywhere?
                    });
                    // send to cloud success indicators
                    break;
                case 'RESET':
                    commit.author = this.username;
                    window.showInformationMessage('LOCAL REVERT COMMIT!');
                    const failIndicator: SuccessIndicator = new SuccessIndicator({
                        start: new Date().getTime().toString(),
                        end: new Date().getTime().toString(),
                        projectDirectory: this.gitFolder?.uri.fsPath || '', // modify this
                        projectName: this.projectName,
                        branch: branchName,
                        type: "commit",
                        status: 'FAIL',
                        message: 'something' // get message from anywhere?
                    });
                    break;
                case 'PULL':
                    // get more information about the pull
                    window.showInformationMessage('LOCAL PULL!');
                    instance.setLastTimeofPull(new Date());
                    break;
                case 'MERGE':
                    // get more information about the merge
                    window.showInformationMessage('LOCAL MERGE COMMIT!');
                    instance.setLastTimeofMerge(new Date());
                    break;
                case 'BRANCH':
                    //created new branch?
                    break;
                case 'CHECKOUT':
                    // changed to new branch
                    this.currentBranch = ''; // extract new branch name
                    break;
                case 'UPDATE BY PUSH':
                    // what does this mean?
                    break;
                default:
                    console.log('Unknown action:', actionName);
            }

            const lastRemoteBranchCommit : CommitData | null = await getBranchLastCommitData(this.projectName, this.gitOwner, branchName);
            console.log('Last remote branch commit:', lastRemoteBranchCommit);
            if (lastRemoteBranchCommit) {
                if (commit.id === lastRemoteBranchCommit.id) {
                    if (commit.date > lastRemoteBranchCommit.date) {
                        console.log('GIT PULL!');
                        window.showInformationMessage('GIT PULL!');
                        // register this somewhere globally, but we don't save it in cloud
                        //sendEventsToAWSDB('success_indicators', [commit]);
                    } else { // there is no way of knowing this
                        console.log('GIT PUSH!');
                        window.showInformationMessage('GIT PUSH!');
                        // create a success indicator and send it to cloud
                    }
                } else {
                    console.log('LOCAL COMMIT/REVERT!'); // how to detect merge?
                    commit.author = this.username;
                    window.showInformationMessage('LOCAL COMMIT/REVERT!');
                    // create success indicator
                }
            } // else, branch does not exist remotely or there was an error
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
        console.log('Local branch create handler triggered');
        console.log('Event path:', event.path);

        const branchName = this.getBranchFromPath(event.path);
        if (branchName) {
            if (this.localBranches[branchName]) {
                this.localCommitHandler(event.path, branchName);
            } else {
                this.localBranches[branchName] = branchName;

                const remoteBranch = await getBranch(this.projectName, this.gitOwner, branchName);
                if (remoteBranch) {
                    window.showInformationMessage('GIT BRANCH IMPORTED!');
                    // fetch start date and save it in cloud memory?
                } else {
                    window.showInformationMessage('GIT BRANCH CREATED LOCALLY!');
                    // create success indicator
                    // save current date in cloud memory
                }
            }
        }
    } // mark current commit?

    public async localBranchDeleteHandler(event: Uri) {
        console.log('Local branch delete handler triggered');
        console.log('Event path:', event.path);

        const branchName = this.getBranchFromPath(event.path);
        if (branchName && !branchName.includes('.lock')) {
            console.log('Local branch deleted');
            window.showInformationMessage('GIT BRANCH DELETED LOCALLY!');
            delete this.localBranches[branchName];
            // create success indicator
            // delete from cloud memory ? -> mark as stale
        }
    }

    public getBranchFromPath(path: string) : string | undefined {
        if (path.includes(LOCAL_REFS_PATH)) {
            const branchPathParts = path.split('/');
            const branchName = branchPathParts[branchPathParts.length - 1];
            return branchName;
        } else {
            console.log('Path does not contain local refs');
            return undefined;
        }
    }

    public getCommitFromPath(path: string) {
        let commit = undefined;
        try {
            commit = fs.readFileSync(path, 'utf8').trimEnd();
        } catch (err: any) {
            window.showErrorMessage(`Error reading ${path} to get commit: ${err.message}`);
        }
        return commit;
    }

    public getAllLocalBranches() {
        const localRefsPath = this.gitFolder?.uri.fsPath + LOCAL_REFS_PATH;

        const files = fs.readdirSync(localRefsPath);
        for (const file of files) {
            const branchName = file.replace('refs/heads/', '');
            this.localBranches[branchName] = branchName;
        }
    }
}
