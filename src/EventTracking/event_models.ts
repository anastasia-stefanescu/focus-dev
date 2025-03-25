export class ProjectChangeInfo {
    docs_changed: any = {}; // dictionary
    project_directory: string = '';
    project_name: string = '';
    identifier: string = ''; // ?
    resource: any = {}; // ?
}

export class Event {
    activityId: string = "";
    activityDuration: number | undefined;
    startTime: string = ""; // nu!
    endTime:string | undefined;
    activityType: string = "";
}

// to add also multi cursor ?
export class DocumentChangeInfo extends Event { 
    start: number = 0; // in seconds
    end: number = 0;
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
    changeType: string = '';
}

// copy - from another window?, paste, cut, delete | save, open, close | git updates
export interface spontaneousEvent {
    activityId: string,
    time: string, 
    activityType: string,
    contentLength: number | undefined
}

// debug, run, shell run | window focus (multiple windows?) 
// document changes (typing, generating code, comments)
export interface continuousEvent {
    activityId: string,
    activityDuration: number | undefined, 
    startTime: string, 
    endTime:string | undefined,
    activityType: string
}


