// Check whether the total amount of events of any type of the three in [timeframe] exceeds [threshold]
// also check if flow period stops

import { exec } from "child_process";
import { CurrentSessionVariables } from "../EventTracking/event_management";
import { DocumentChangeInfo, ExecutionEventInfo, UserActivityEventInfo } from "../EventTracking/event_models";

// automatically mark the period as focus
// in another cache!!!

export function getRealTimeFlow() {
    const executionCache = CurrentSessionVariables.getInstance().getExecutionCache();
    const userActivityCache = CurrentSessionVariables.getInstance().getUserActivityCache();
    const documentCache = CurrentSessionVariables.getInstance().getDocumentCache();

    const executionEvents = executionCache.getAll<ExecutionEventInfo>();
    const userActivityEvents = userActivityCache.getAll<UserActivityEventInfo>();
    const documentEvents = documentCache.getAll<DocumentChangeInfo>();
}
