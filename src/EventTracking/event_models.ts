export class ProjectInfo {
    project_directory: string = '';
    project_name: string = '';
    identifier: string = ''; // ?
    resource: any = {}; // ?
}
export class ProjectChangeInfo extends ProjectInfo{
    docs_changed: any = {}; // dictionary
}

export class ProjectExecutionInfo {
    execution_sessions: any = {}; // dictionary
}

export class DocumentInfo {
    fileName: string = "";
    filePath: string = "";
    language: string = "";
    lineCount: number = 0;
    characterCount: number = 0;
}

export class Event {
    start: string = ''; // in seconds or actual Date in string
    end: string = '';
    projectName: string = '';
    projectDirectory: string = '';

    constructor();
    constructor(cacheEvent: Partial<Event>);

    // Single implementation
    constructor(cacheEvent?: Partial<Event>) {
        if (cacheEvent) {
            this.start = cacheEvent.start ?? '';
            this.end = cacheEvent.end ?? '';
            this.projectName = cacheEvent.projectName ?? '';
            this.projectDirectory = cacheEvent.projectDirectory ?? '';
        }
    }

    concatenateData(cacheEvent: Event) { // always earlier event!!!
        // also check if the project is the same??
        this.start = cacheEvent.start;
    }
}


export class ExecutionEventInfo extends Event {
    eventType: string = '';

    // Overload signatures
    constructor();
    constructor(cacheEvent: Partial<ExecutionEventInfo>);

    // Implementation
    constructor(cacheEvent?: Partial<ExecutionEventInfo>) {
        super(cacheEvent as Partial<Event>); // this works fine even if cacheEvent is undefined

        if (cacheEvent) {
            this.eventType = cacheEvent.eventType ?? '';
        }
    }

    concatenateData(cacheEvent: ExecutionEventInfo): void {
        super.concatenateData(cacheEvent);
    }
}

// a class where we store the aggregated DocumentChangeInfo - which should have the number of events in an interval
// if this class exists for a timeframe, that means enough events were done in this timeframe, and they were also
// well distributed, because we only aggregated events that were quite close to each other

// per project, and per timeframe
export class UserActivityEventInfo extends Event{

    file_actions: number = 0; // open, close, save, delete, create
    git_actions: number = 0; // commit, push, pull, etc
    window_focus_changes: number = 0;
    // deployment actions??
    total_actions: number = 0; // all actions??

    constructor();
    constructor(cacheEvent: Partial<UserActivityEventInfo>);
    constructor(cacheEvent?: Partial<UserActivityEventInfo>) {
        super(cacheEvent as Partial<Event>);
        this.file_actions = cacheEvent?.file_actions ?? 0;
        this.git_actions = cacheEvent?.git_actions ?? 0;
        this.window_focus_changes = cacheEvent?.window_focus_changes ?? 0;
        this.total_actions = cacheEvent?.total_actions ?? 0;
    }

    concatenateData(cacheEvent: UserActivityEventInfo) {
        super.concatenateData(cacheEvent);
        this.file_actions += cacheEvent.file_actions;
        this.git_actions += cacheEvent.git_actions;
        this.window_focus_changes += cacheEvent.window_focus_changes;
        this.total_actions += cacheEvent.total_actions;
    }
}

// events of type DocumentChangeInfo are aggregated also in a DocumentChangeInfo object (first locally over a minute)
// and then sent to cloud, and then further aggregated over a longer period of time when returned from cloud
// The reason we keep the same class for aggregation is because we are interested to see the actual stats of the written code
// to add also multi cursor ?
export class DocumentChangeInfo extends Event {
    // add source??? user / AI / other
    fileName: string = "";
    filePath: string = "";
    lineCount: number = 0;
    characterCount: number = 0;
    linesAdded: number = 0;
    linesDeleted: number = 0;
    charactersAdded: number = 0;
    charactersDeleted: number = 0;
    singleDeletes: number = 0;
    multiDeletes: number = 0; // !!
    singleAdds: number = 0;
    multiAdds: number = 0; // !!
    autoIndents: number = 0;
    replacements: number = 0;
    keystrokes: number = 0; // aici cate tastari efective s-au facut - poate fi util pt detectie
    changeType: string = ''; // this becomes obsolete when we start aggregating, because multiple changes are aggregated
    source: string = ''; // user, AI, external, other

    constructor();
    constructor(cacheEvent: Partial<DocumentChangeInfo>);
    constructor(arg?: Partial<DocumentChangeInfo>) {
        super(arg as Partial<Event>);
        this.fileName = arg?.fileName ?? "";
        this.filePath = arg?.filePath ?? "";
        this.lineCount = arg?.lineCount ?? 0;
        this.characterCount = arg?.characterCount ?? 0;
        this.linesAdded = arg?.linesAdded ?? 0;
        this.linesDeleted = arg?.linesDeleted ?? 0;
        this.charactersAdded = arg?.charactersAdded ?? 0;
        this.charactersDeleted = arg?.charactersDeleted ?? 0;
        this.singleDeletes = arg?.singleDeletes ?? 0;
        this.multiDeletes = arg?.multiDeletes ?? 0;
        this.singleAdds = arg?.singleAdds ?? 0;
        this.multiAdds = arg?.multiAdds ?? 0;
        this.autoIndents = arg?.autoIndents ?? 0;
        this.replacements = arg?.replacements ?? 0;
        this.keystrokes = arg?.keystrokes ?? 0;
        this.changeType = arg?.changeType ?? '';
        this.source = arg?.source ?? '';
    }

    concatenateData(cacheEvent: DocumentChangeInfo) { // has to have the same source!!
        super.concatenateData(cacheEvent);
        this.linesAdded += cacheEvent.linesAdded;
        this.linesDeleted += cacheEvent.linesDeleted;
        this.charactersAdded += cacheEvent.charactersAdded;
        this.charactersDeleted += cacheEvent.charactersDeleted;
        this.singleDeletes += cacheEvent.singleDeletes;
        this.multiDeletes += cacheEvent.multiDeletes;
        this.singleAdds += cacheEvent.singleAdds;
        this.multiAdds += cacheEvent.multiAdds;
        this.autoIndents += cacheEvent.autoIndents;
        this.replacements += cacheEvent.replacements;
        this.keystrokes += cacheEvent.keystrokes;
    }
}

export class FullChangeData {
    projectName: string = '';
    projectDirectory: string = '';
    fileChangeInfo: DocumentChangeInfo | undefined = undefined;
    // repoInfo: any = {};
    // pluginInfo: any = {};
}

// // copy - from another window?, paste, cut, delete | save, open, close | git updates
// export interface spontaneousEvent {
//     activityId: string,
//     time: string,
//     activityType: string,
//     contentLength: number | undefined
// }

// // debug, run, shell run | window focus (multiple windows?)
// // document changes (typing, generating code, comments)
// export interface continuousEvent {
//     activityId: string,
//     activityDuration: number | undefined,
//     startTime: string,
//     endTime:string | undefined,
//     activityType: string
// }


