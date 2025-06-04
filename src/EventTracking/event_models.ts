export class ProjectInfo {
    project_directory: string = ''; // Negative value: 'None'
    project_name: string = '';
    identifier: string = ''; // ?
    resource: any = {}; // ?
    // branch?
    docs_changed_user: any = {}; // dictionary
    docs_changed_ai: any = {}; // dictionary
    docs_changed_external: any = {}; // dictionary

    execution_sessions: any = {}; // dictionary

    userActivity: UserActivityEventInfo | undefined= undefined; // dictionary
}

export class DocumentInfo {
    fileName: string = "";
    filePath: string = "";
    language: string = "";
    lineCount: number = 0;
    characterCount: number = 0;
}


export type EventType = 'document' | 'userActivity' | 'execution' | 'successIndicator' | 'other';
export class Event {
    start: string = ''; // in seconds !! or actual Date in string
    end: string = '';
    projectName: string = '';
    projectDirectory: string = '';
    branch: string = ''; // optional -> this is important for the efficiency only

    constructor();
    constructor(cacheEvent: Partial<Event>);

    // Single implementation
    constructor(cacheEvent?: Partial<Event>) {
        if (cacheEvent) {
            this.start = cacheEvent.start ?? '';
            this.end = cacheEvent.end ?? '';
            this.projectName = cacheEvent.projectName ?? '';
            this.projectDirectory = cacheEvent.projectDirectory ?? '';
            this.branch = cacheEvent.branch ?? '';
        }
    }

    concatenateData(cacheEvent: Event) { // cacheEvent is later event!!!
        // also check if the project is the same??
        this.end = cacheEvent.end;
    }

    static buildEventFromJson(data: any) : Event {
        const event = new Event();
        event.start = data.start;
        event.end = data.end;
        event.projectName = data.projectName;
        event.projectDirectory = data.projectDirectory;

        return event;
    }

    computeRateOfEvent() :number {
        return 0;
    }
}

export function getNewEvent(type: EventType): Event | undefined {
    if (type == 'document')
        return new DocumentChangeInfo();
    if (type == 'execution')
        return new ExecutionEventInfo();
    if (type == 'userActivity')
        return new UserActivityEventInfo();
    return undefined;
}


export type ExecutionType = 'debug' | 'run' | 'test' | 'deploy' | ''
export class ExecutionEventInfo extends Event {
    eventType: ExecutionType = ''; // debug, run(from shell), testing, deployment
    sessionId: string = '';
    //sessionName: string = '';

    constructor();
    constructor(cacheEvent: Partial<ExecutionEventInfo>);

    constructor(cacheEvent?: Partial<ExecutionEventInfo>) {
        super(cacheEvent as Partial<Event>); // this works fine even if cacheEvent is undefined

        if (cacheEvent) {
            this.eventType = cacheEvent.eventType ?? ''; // why is this and do we have to update it???
            this.sessionId = cacheEvent.sessionId ?? '';
        }
    }

    concatenateData(cacheEvent: ExecutionEventInfo): void {
        super.concatenateData(cacheEvent);
    }

    static buildEventFromJson(data: any): ExecutionEventInfo{
        const event = new ExecutionEventInfo();

        event.start = data.start;
        event.end = data.end;
        event.projectName = data.projectName;
        event.projectDirectory = data.projectDirectory;
        event.branch = data.branch;

        event.eventType = data.eventType;
        event.sessionId = data.sessionId;
        return event;
    }

    computeRateOfEvent() : number{
        //super.computeRateOfEvent();
        const duration = new Date(this.end).getTime() - new Date(this.start).getTime();
        return 1 / duration;
    }
}

// a class where we store the aggregated DocumentChangeInfo - which should have the number of events in an interval
// if this class exists for a timeframe, that means enough events were done in this timeframe, and they were also
// well distributed, because we only aggregated events that were quite close to each other

// I don't think we need Window focus info

export type UserActivityType = 'file' | 'git' | 'window' | 'document' | 'terminal' | undefined;
// per project, and per timeframe
export class UserActivityEventInfo extends Event{

    file_actions: number = 0; // open, close, save, delete, create
    git_actions: number = 0; // commit, push, pull, etc
    window_focus_changes: number = 0;
    // deployment actions??
    total_actions: number = 0; // all actions??
    others: number = 0; // irrelevant stuff such as undo, redo, copy, paste, etc

    constructor();
    constructor(cacheEvent: Partial<UserActivityEventInfo>);
    constructor(cacheEvent?: Partial<UserActivityEventInfo>) {
        super(cacheEvent as Partial<Event>);
        this.file_actions = cacheEvent?.file_actions ?? 0;
        this.git_actions = cacheEvent?.git_actions ?? 0;
        this.window_focus_changes = cacheEvent?.window_focus_changes ?? 0;
        this.total_actions = cacheEvent?.total_actions ?? 0;
        this.others = cacheEvent?.others ?? 0;
    }

    concatenateData(cacheEvent: UserActivityEventInfo) {
        super.concatenateData(cacheEvent);

        this.file_actions += cacheEvent.file_actions;
        this.git_actions += cacheEvent.git_actions;
        this.window_focus_changes += cacheEvent.window_focus_changes;
        this.others += cacheEvent.others;

        this.total_actions += cacheEvent.file_actions + cacheEvent.git_actions + cacheEvent.window_focus_changes + cacheEvent.others;
    }

    static buildEventFromJson(data: any): UserActivityEventInfo {
        const event = new UserActivityEventInfo();

        event.start = data.start;
        event.end = data.end;
        event.projectName = data.projectName;
        event.projectDirectory = data.projectDirectory;
        event.branch = data.branch;

        event.file_actions = data.file_actions;
        event.git_actions = data.git_actions;
        event.window_focus_changes = data.window_focus_changes;
        event.total_actions = data.total_actions;
        event.others = data.others;
        return event;
    }

    computeRateOfEvent() : number {
        const duration = new Date(this.end).getTime() - new Date(this.start).getTime();
        if (duration == 0)
            return this.total_actions;
        return this.total_actions / duration;
    }
}

export type SuccessType = 'commit' | 'push' | 'run' | 'test' | 'tag' | undefined

export class SuccessIndicator extends Event { // can be about git commits / other actions or comments or some kind of execution
    type: SuccessType = undefined
    status: string = ''; // optional - execution/deployment : success, failure
    message: string = ''; // optional - commit message: positive / negative / neutral

    constructor();

    constructor(cacheEvent: Partial<SuccessIndicator>);

    constructor(cacheEvent?: Partial<SuccessIndicator>) {
        super(cacheEvent as Partial<Event>);
        this.type = cacheEvent?.type ?? undefined;
        this.status = cacheEvent?.status ?? '';
        this.message = cacheEvent?.message ?? '';
    }

    concatenateData(cacheEvent: SuccessIndicator) {
        super.concatenateData(cacheEvent);
        // we don't concatenate anything else, because this is a single event
    }

    static buildEventFromJson(data: any): SuccessIndicator {
        const event = new SuccessIndicator();

        event.start = data.start;
        event.end = data.end;
        event.projectName = data.projectName;
        event.projectDirectory = data.projectDirectory;
        event.branch = data.branch;

        event.type = data.type;
        event.status = data.status;
        event.message = data.message;

        return event;
    }

    computeRateOfEvent() : number {
        // this is a single event, so we don't compute a rate
        return 1; // or 0?
    }
}

export class GitEvent {

}

// events of type DocumentChangeInfo are aggregated also in a DocumentChangeInfo object (first locally over a minute)
// and then sent to cloud, and then further aggregated over a longer period of time when returned from cloud
// The reason we keep the same class for aggregation is because we are interested to see the actual stats of the written code
// to add also multi cursor ?

export type Source = "user" | "AI" | "external" | undefined;
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

    changeType: string = ''; // only the new doc changeType matters

    source: Source = undefined; // user, AI, external, other

    // writtenWithAI: AIinFile[] = []; // here we store the lines that were written with AI - this is a list of objects with start and end line numbers

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

        this.source = arg?.source;
    }

    displayData(message: string) : string {
        return message + `${this.charactersAdded} characters added,  ${this.linesAdded} lines added, ${this.singleAdds} singleadds, ${this.multiAdds} multiadds,
                ${this.charactersDeleted} characters deleted, ${this.linesDeleted} lines deleted, ${this.singleDeletes} single deletes, ${this.multiDeletes} multi deletes,
                ${this.keystrokes} keystrokes, ${this.autoIndents} autoindents, ${this.replacements} replacements`
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

    static buildEventFromJson(data: any): DocumentChangeInfo {
        const event = new DocumentChangeInfo();

        event.start = data.start;
        event.end = data.end;
        event.projectName = data.projectName;
        event.projectDirectory = data.projectDirectory;
        event.branch = data.branch;

        event.fileName = data.fileName;
        event.filePath = data.filePath;
        event.lineCount = data.lineCount;
        event.characterCount = data.characterCount;
        event.linesAdded = data.linesAdded;
        event.linesDeleted = data.linesDeleted;
        event.charactersAdded = data.charactersAdded;
        event.charactersDeleted = data.charactersDeleted;
        event.singleDeletes = data.singleDeletes;
        event.multiDeletes = data.multiDeletes;
        event.singleAdds = data.singleAdds;
        event.multiAdds = data.multiAdds;
        event.autoIndents = data.autoIndents;
        event.replacements = data.replacements;
        event.keystrokes = data.keystrokes;
        event.changeType = data.changeType;

        event.source = data.source;

        return event;
    }

    computeRateOfEvent() :number {
        const duration = new Date(this.end).getTime() - new Date(this.start).getTime();

        let noActions = 0;
        if (this.source === 'user') {
            noActions = this.keystrokes;
        } else if (this.source === 'AI' || this.source === 'external') {
            noActions = this.singleAdds + this.multiAdds;
        }

        if (duration == 0)
            return noActions;
        return noActions / duration;
    }
}

export class FullChangeData {
    projectName: string = '';
    projectDirectory: string = '';
    fileChangeInfo: DocumentChangeInfo | undefined = undefined;
    // repoInfo: any = {};
    // pluginInfo: any = {};
}

// export class AIinFile {
//     fileName: string = '';
//     filePath: string = '';
//     startLine: number = 0;
//     endLine: number = 0;
// }

