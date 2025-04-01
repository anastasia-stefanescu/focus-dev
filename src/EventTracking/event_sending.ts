import { DEFAULT_CHANGE_EMISSION_INTERVAL } from "../Constants";
import { CurrentSessionVariables } from "./event_management";
import { window } from "vscode";
import { FullChangeData, ProjectChangeInfo } from "./event_models";
import { mySnowPlowTracker } from "./SnowPlowTracker";
import { all } from "axios";

export async function emitProjectChangeData() {
    const one_minute_ago: number = new Date().getTime() - DEFAULT_CHANGE_EMISSION_INTERVAL;

    const instance: CurrentSessionVariables = CurrentSessionVariables.getInstance();

    if (instance.getProjectChangeInfo() && instance.getProjectChangeInfo()?.docs_changed) {
        clearTimeout(instance.getTimer());
        instance.setTimer(undefined);

        const payload = instance.getProjectChangeInfo() || null;
        if (payload && payload.docs_changed && Object.keys(payload.docs_changed).length) { // make sure project doc_changes have keystrokes

            window.showInformationMessage('Emitting data');
            getAllProjectDataAndSend(payload); // emitData("user_event", full_project_data);
            // see other checks from editor flow!!!!
        }

        instance.setProjectChangeInfo(undefined);
    }
    instance.setLastEmitTime(new Date().getTime());
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
    
