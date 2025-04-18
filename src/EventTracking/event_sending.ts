import { DEFAULT_CHANGE_EMISSION_INTERVAL } from "../Constants";
import { CurrentSessionVariables } from "./event_management";
import { window } from "vscode";
import { FullChangeData, ProjectChangeInfo, ProjectExecutionInfo, ProjectUserActivityInfo, UserActivityEventInfo } from "./event_models";
import { mySnowPlowTracker } from "./SnowPlowTracker";
import { all } from "axios";

export async function emitFromCacheProjectChangeData() {
}

export async function emitToCacheProjectChangeData() {
    // Checks if we have events of any of the 3 types to send

    const one_minute_ago: number = new Date().getTime() - DEFAULT_CHANGE_EMISSION_INTERVAL;

    const instance: CurrentSessionVariables = CurrentSessionVariables.getInstance();

    const projectChangeInfo = instance.getProjectChangeInfo();
    const projectUserActivityInfo = instance.getProjectUserActivityInfo();
    const projectExecutionInfo = instance.getProjectExecutionInfo();

    const documentChangesExist = !!(projectChangeInfo && projectChangeInfo?.docs_changed);
    const userActivityExists = !!(projectUserActivityInfo && projectUserActivityInfo?.userActivity);
    const executionSessionsExist = !!(projectExecutionInfo && projectExecutionInfo?.execution_sessions);

    if (documentChangesExist || userActivityExists || executionSessionsExist) {
        clearTimeout(instance.getTimer());
        instance.setTimer(undefined);

        if (documentChangesExist) {
            saveToCacheDocumentChanges(projectChangeInfo);
            instance.setProjectChangeInfo(undefined);
        }
        if (userActivityExists && projectUserActivityInfo.userActivity) {
            saveToCacheUserActivity(projectUserActivityInfo.userActivity);
            instance.setProjectUserActivityInfo(undefined);
        }
        if (executionSessionsExist) {
            saveToCacheExecutionSessions(projectExecutionInfo);
            instance.setProjectExecutionInfo(undefined);
        }
    }

    // for each of them separate??? Separate timers for each of them?
    instance.setLastEmitTime(new Date().getTime());
}

export function saveToCacheDocumentChanges(projectChangeInfo: ProjectChangeInfo) {
    const payload = projectChangeInfo; // payload && payload.docs_changed && - already verified
    if (Object.keys(payload.docs_changed).length) { // make sure project doc_changes have keystrokes
        window.showInformationMessage('Sending docs change to cache');

        // here we might not really need full project data!!!
        getAllProjectDataAndSend(payload); // emitData("user_event", full_project_data);
        // see other checks from editor flow!!!!
    }
}

export function saveToCacheUserActivity(userActivity: UserActivityEventInfo) {
    if (userActivity.total_actions > 0) {
        window.showInformationMessage('Sending user activity to cache');
        // emitData("user_event", payload);
    }
}

export function saveToCacheExecutionSessions(executionSessionsInfo: ProjectExecutionInfo) {
    if (executionSessionsInfo.execution_sessions > 0) {
        window.showInformationMessage('Sending execution sessions to cache');
        // emitData("user_event", payload);
    }
}

export function getAllProjectDataAndSend(projectChangeInfo: ProjectChangeInfo) {

    const allChangedFiles = Object.keys(projectChangeInfo.docs_changed);
    for (const file of allChangedFiles) { // WITHOUT AWAIT????
        // check duplicate events from another window

        const allFileData : FullChangeData = {
            projectName: projectChangeInfo.project_name,
            projectDirectory: projectChangeInfo.project_directory,
            fileChangeInfo: projectChangeInfo.docs_changed[file],
            // plugin and repo info
        }

        mySnowPlowTracker.getInstance().trackDocumentChange(allFileData);
    }
}

// set the end of changes if it doesn't exist
// check references??
export function closeOtherFilesInfo(fileName:string) {
    if (CurrentSessionVariables.getInstance().getProjectChangeInfo() && CurrentSessionVariables.getInstance().getProjectChangeInfo()?.docs_changed) {
        const allFiles = Object.keys(CurrentSessionVariables.getInstance().getProjectChangeInfo()?.docs_changed);
        allFiles.forEach((file) => {
            const fileChange = CurrentSessionVariables.getInstance().getProjectChangeInfo()?.docs_changed[file];

            if (file !== fileName && fileChange && !fileChange.end) {
                fileChange.end = new Date().toISOString(); // through references, the initial array is updated too
            }
        });
    }
}

