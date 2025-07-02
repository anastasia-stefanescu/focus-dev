import { DEFAULT_CHANGE_EMISSION_INTERVAL } from "../../Constants";
import { ProjectInfoManager, DocumentChangeInfo, Event } from "../../EventTracking";
import { window } from "vscode";
import { EventCache } from "./node-cache";
import { FullChangeData, ProjectInfo, Source, UserActivityEventInfo, ExecutionEventInfo } from "../../EventTracking";
import { all } from "axios";

import { cacheInstance, sqlInstance } from "../../extension";
import { NodeCacheManager } from "./node-cache_management";


// USE OBJECTS.KEYS EVERYTIME TO VERIFY DICTIONARY IS NOT EMPTY!!!!!


export async function emitToDBCacheData(deactivation: boolean = false) {
    //window.showInformationMessage('Emitting data to cache...');

    if (!cacheInstance || !cacheInstance.getCachesExist()) {
        //window.showInformationMessage('No cache data to send to DB');
        return;
    }

    const userDocChangesExist = !!(cacheInstance.getDocumentCache('user').getCount() > 0);
    const aiDocChangesExist = !!(cacheInstance.getDocumentCache('AI').getCount() > 0);
    const externalDocChangesExist = !!(cacheInstance.getDocumentCache('external').getCount() > 0);
    const userActivityExists = !!(cacheInstance.getUserActivityCache().getCount() > 0);
    const executionSessionsExist = !!(cacheInstance.getExecutionCache().getCount() > 0);

    if (userDocChangesExist || aiDocChangesExist || externalDocChangesExist || userActivityExists || executionSessionsExist) {
        //window.showInformationMessage('Something exists IN CACHE to send to DB!');
        //window.showInformationMessage('Emitting data from cache to DB...');
        clearTimeout(cacheInstance.getTimer());
        cacheInstance.setTimer(undefined);

        await saveToDBDocumentChanges('user');
        await saveToDBDocumentChanges('AI');
        await saveToDBDocumentChanges('external');

        await saveToDBUserActivity();

        await saveToDBExecutionSessions();

        cacheInstance.setCachesExist(false); // reset the flag
    }

    // for each of them separate??? Separate timers for each of them?
    // instance.setLastEmitTime(new Date().getTime());
}

//=====================================================
export async function saveToDBDocumentChanges(source: Source) {
    const events: { [key: string]: DocumentChangeInfo } = cacheInstance.getDocumentCache(source).getAll();

    if (!events || Object.keys(events).length === 0) {
        //window.showInformationMessage(`No ${source} changes to send to DB`);
        return;
    }

    //window.showInformationMessage(`Begin send docs change for ${source} to DB`);   // just send the event which has project name and directory, filename and path set; // here we might not really need full project data!!!

    const allEvents = Object.values(events);

    for (const event of allEvents) {                         // check duplicate events from another window - i don't think we will need this
        const typedEvent: DocumentChangeInfo = DocumentChangeInfo.buildEventFromJson(event) as DocumentChangeInfo; // create a new instance to avoid modifying the original event


        //window.showInformationMessage(`Sending to DB: ${typedEvent.keystrokes} keystrokes, ${typedEvent.charactersAdded}
        //    chars added, ${typedEvent.charactersDeleted} chars deleted, ${typedEvent.multiAdds} multiAdds, ${typedEvent.singleAdds}`);

        if (typedEvent && sqlInstance) {
            console.log("Will send to DB event of type DocumentChange", !!(typedEvent instanceof DocumentChangeInfo));
            //await sqlInstance.executeInsert(typedEvent);
        }
    }
    cacheInstance.getDocumentCache(source).flush();                                                            // see other checks from editor flow!!!!
    //instance.setAllDocChangesForSource(source, {});       // reset it
}

export async function saveToDBUserActivity() {
    const events: { [key: string]: UserActivityEventInfo } = cacheInstance.getUserActivityCache().getAll();

    if (!events || Object.keys(events).length === 0) {
        //window.showInformationMessage(`No user activity to send to DB`);
        return;
    }

    //window.showInformationMessage('Sending user activity to DB');
    const allEvents = Object.values(events);

    for (const event of allEvents) {                         // check duplicate events from another window - i don't think we will need this
        const typedEvent: UserActivityEventInfo = UserActivityEventInfo.buildEventFromJson(event); // create a new instance to avoid modifying the original event

        //window.showInformationMessage(`Sending to DB: ${typedEvent.file_actions} file actions, ${typedEvent.git_actions} git actions
        //    ${typedEvent.window_focus_changes} window focus changes, ${typedEvent.others} others, ${typedEvent.total_actions} total actions`);

        if (typedEvent && sqlInstance) {
            //await sqlInstance.executeInsert(typedEvent);
        }
    }
    cacheInstance.getUserActivityCache().flush();
    console.log("User activity cache flushed: ", cacheInstance.getUserActivityCache().getCount());
    //instance.setUserActivityInfo(undefined); // reset it
}

export async function saveToDBExecutionSessions() {
    const events: { [key: string]: ExecutionEventInfo } = cacheInstance.getExecutionCache().getAll();

    if (!events || Object.keys(events).length === 0) {
        //window.showInformationMessage(`No execution events to send to DB`);
        return;
    }

    //window.showInformationMessage('Sending execution events to DB');
    const allEvents = Object.values(events);

    for (const event of allEvents) {                         // check duplicate events from another window - i don't think we will need this
        const typedEvent: ExecutionEventInfo = ExecutionEventInfo.buildEventFromJson(event); // create a new instance to avoid modifying the original event

        //window.showInformationMessage(`Sending to DB: ${typedEvent.eventType} event type, ${typedEvent.sessionId} session id`);

        if (typedEvent && sqlInstance) {
            //await sqlInstance.executeInsert(typedEvent);
        }
    }
    cacheInstance.getExecutionCache().flush();
    // if (deactivation)
    //     instance.setAllExecutionEvents({}); // reset it
}

//=====================================================

