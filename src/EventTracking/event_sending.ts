import { DEFAULT_CHANGE_EMISSION_INTERVAL } from "../Constants";
import { CurrentSessionVariables } from "./event_management";
import { window } from "vscode";
import { FullChangeData, ProjectInfo, Source, UserActivityEventInfo } from "./event_models";
import { mySnowPlowTracker } from "./SnowPlowTracker";
import { all } from "axios";

import { instance } from "../extension";

export async function emitFromCacheProjectChangeData() {
}

// emitting Execution events which might be quite long
// send only those already finished every 1 minute (check whether any have finished)
// send all of them only if the application is closed


// USE OBJECTS.KEYS EVERYTIME TO VERIFY DICTIONARY IS NOT EMPTY!!!!!

export async function emitToCacheProjectData(deactivation: boolean = false) {
    // Checks if we have events of any of the 3 types to send

    const one_minute_ago: number = new Date().getTime() - DEFAULT_CHANGE_EMISSION_INTERVAL;

    const projectInfo = instance.getProjectInfo();

    if (!projectInfo) {
        window.showErrorMessage('No project info available');
        return;
    }

    const userDocChangesExist = !!(Object.keys(projectInfo.docs_changed_user).length);
    const aiDocChangesExist = !!(Object.keys(projectInfo.docs_changed_ai).length);
    const externalDocChangesExist = !!(Object.keys(projectInfo.docs_changed_external).length);
    const userActivityExists = !!(projectInfo.userActivity && projectInfo.userActivity.total_actions > 0);

    let sessionsToSendKeys;
    if(deactivation)
        sessionsToSendKeys = Object.keys(projectInfo.execution_sessions)
    else
        sessionsToSendKeys = filterFinishedExecutionSessions(instance);
    const executionSessionsExist = !!(sessionsToSendKeys); // covers undefined / [] cases

    if (userDocChangesExist || aiDocChangesExist || externalDocChangesExist || userActivityExists || executionSessionsExist) {
        window.showInformationMessage('Something exists to be sent to be cache!');

        clearTimeout(instance.getTimer());
        instance.setTimer(undefined);

        saveToCacheDocumentChanges(instance, 'user');
        saveToCacheDocumentChanges(instance, 'AI');
        saveToCacheDocumentChanges(instance, 'external');

        saveToCacheUserActivity(instance);

        saveToCacheExecutionSessions(instance, sessionsToSendKeys, deactivation);

        instance.setProjectInfo(undefined)
    }

    // for each of them separate??? Separate timers for each of them?
    instance.setLastEmitTime(new Date().getTime());
}

//=====================================================
export function saveToCacheDocumentChanges(instance: CurrentSessionVariables, source: Source) {
    const changes_dict = instance.getAllDocChangesForSource(source); // returns dict or undefined

    if (!changes_dict || Object.keys(changes_dict).length === 0) {
        window.showInformationMessage(`No ${source} changes to send to cache`);
        return;
    }

    window.showInformationMessage(`Begin send docs change for ${source} to cache`);   // just send the event which has project name and directory, filename and path set; // here we might not really need full project data!!!

    const allChangedFiles = Object.keys(changes_dict);
    const documentCache = instance.getDocumentCache(source);
    for (const file of allChangedFiles) {                         // check duplicate events from another window - i don't think we will need this
        const event = changes_dict[file];
        if (!event.end)
            event.end = new Date().toISOString(); // through references, the initial array is updated too
        //window.showInformationMessage(`Will call saveEvent for ${file}: ${event.charactersAdded}`);
        documentCache?.saveEvent(event);
    }                                                             // see other checks from editor flow!!!!
    //instance.setAllDocChangesForSource(source, {});       // reset it
}

export function saveToCacheUserActivity(instance: CurrentSessionVariables) {
    const userActivity = instance.getUserActivityInfo();

    if (!userActivity || userActivity.total_actions === 0) {
        window.showInformationMessage('No user activity to send to cache');
        return;
    }

    window.showInformationMessage('Sending user activity to cache');
    const userActivityCache = instance.getUserActivityCache();
    if (!userActivity.end)
        userActivity.end = new Date().toISOString(); // through references, the initial array is updated too
    userActivityCache.saveEvent(userActivity);
    //instance.setUserActivityInfo(undefined); // reset it
}

export function saveToCacheExecutionSessions(instance: CurrentSessionVariables, sessionsToSendKeys: string[] | undefined, deactivation: boolean = false) {
    if (!sessionsToSendKeys) {
        window.showInformationMessage(`No execution sessions to send to cache`);
        return;
    }

    window.showInformationMessage('Sending execution sessions to cache');
    const executionCache = instance.getExecutionCache();
    for (const key of sessionsToSendKeys) {
        const event = instance.getExecutionEventInfo(key);
        executionCache?.saveEvent(event);
        if (!deactivation)
            instance.deleteExecutionEvent(key); // delete it from the cache
    }
    // if (deactivation)
    //     instance.setAllExecutionEvents({}); // reset it
}

//=====================================================

function filterFinishedExecutionSessions(instance: CurrentSessionVariables) {
    const allSessions = instance.getAllExecutionEvents();
    const finishedSessions = Object.keys(allSessions).filter((key) => allSessions[key].end);

    if (finishedSessions.length) {
        window.showInformationMessage('Sending finished execution sessions to cache');
        return finishedSessions;
    }
    return undefined;
}

//=====================================================

export function getAllProjectDataAndSendToCache(changes_dict: any, instance: CurrentSessionVariables) {

    const allChangedFiles = Object.keys(changes_dict);
    for (const file of allChangedFiles) { // WITHOUT AWAIT????
        // check duplicate events from another window

        // just send the event which has project name and directory, filename and path set
        const event = changes_dict[file];


        // const allFileData : FullChangeData = {
        //     projectName: projectInfo.project_name,
        //     projectDirectory: projectInfo.project_directory,
        //     fileChangeInfo: projectInfo.docs_changed[file],
        //     // plugin and repo info
        // }

        // mySnowPlowTracker.getInstance().trackDocumentChange(allFileData);
    }
}

