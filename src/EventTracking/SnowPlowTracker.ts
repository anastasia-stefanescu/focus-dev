
import { Disposable } from "vscode";
import { workspace, window, debug, commands } from "vscode";

// https://docs.snowplow.io/docs/sources/trackers/javascript-trackers/node-js-tracker/node-js-tracker-v4/initialization/

import { newTracker, buildSelfDescribingEvent } from '@snowplow/node-tracker';


export class mySnowPlowTracker {
    private static instance : mySnowPlowTracker;
    private isTrackerReady : boolean = false;
    public tracker: any;
    //private disposable: Disposable;

    // storage manager for caching???

    constructor() {
        let subscriptions: Disposable[] = [];

        this.tracker = newTracker({
            namespace: "my-tracker", // Namespace to identify the tracker instance. It will be attached to all events which the tracker fires.
            appId: "my-app", // Application identifier
            encodeBase64: false, // Whether to use base64 encoding for the self-describing JSON. Defaults to true.
          }, {
            endpoint: "https://collector.mydomain.net", // Collector endpoint
            eventMethod: "post", // Method - defaults to POST
            bufferSize: 1, // Only send events once n are buffered. Defaults to 1 for GET requests and 10 for POST requests.
          });
        this.isTrackerReady = true; // check some type of connection status
        // this.tracker.setUserId(''); ??
        // this.tracker.setSessionId(''); ??

        // this.setTrackingEvents();
    }

    static getInstance(): mySnowPlowTracker {
        if (!mySnowPlowTracker.instance) {
          mySnowPlowTracker.instance = new mySnowPlowTracker();
        }
    
        return mySnowPlowTracker.instance;
      }

    private setTrackingEvents() {
        // this.trackFileEvents(); // ✅ save, close files => save is done even when Autosave is on
                                    // see what was changed? otherwise we don't need to track them
        this.trackExecution(); // ✅ debug starting & stopping, code execution, also terminal shell execution? (needs shell integration)
        this.trackVSCWindowFocus(); // ✅ vsc window loses or gains focus
        // ✅ actual typing; 
        // ✅ copy, pasting (verify what was copied was pasted) 
        // extract comments
        // extract git commit messages
        // ✅ detect copilot/ other extension generating 
        
    }

    private trackFileEvents() {
        // open, close, save files
        // opening might not provide data
        workspace.onDidOpenTextDocument((document) => {
            this.tracker.track(buildSelfDescribingEvent({
                event: {
                    schema: "iglu:com.example/file_opened/jsonschema/1-0-0",
                    data: {
                        fileName: document.fileName,
                        language: document.languageId,
                        timestamp: new Date().toISOString(),
                    }
                }
            }), []); // timestamp is by default current time
        });

        // save => verify changes??
        workspace.onDidSaveTextDocument((document) => {
            this.tracker.trackSelfDescribingEvent({
                event: {
                    schema: "iglu:com.example/file_saved/jsonschema/1-0-0",
                    data: {
                        fileName: document.fileName,
                        language: document.languageId,
                        timestamp: new Date().toISOString(),
                    }
                }
            });
        });

        // close => verify changes??
        workspace.onDidCloseTextDocument((document) => {
            this.tracker.trackSelfDescribingEvent({
                event: {
                    schema: "iglu:com.example/file_closed/jsonschema/1-0-0",
                    data: {
                        fileName: document.fileName,
                        language: document.languageId,
                        timestamp: new Date().toISOString(),
                    }
                }
            });
        });
    }

    private trackExecution() {
        // commands.onDidExecuteCommand((command) => {
        //     this.tracker.trackSelfDescribingEvent({
        //         event: {
        //             schema: "iglu:com.example/command_executed/jsonschema/1-0-0",
        //             data: {
        //                 command: command.command, // Command name (e.g., "workbench.action.debug.start")
        //                 timestamp: new Date().toISOString(),
        //             }
        //         }
        //     });
        // });

        debug.onDidStartDebugSession((session) => {
            this.tracker.trackSelfDescribingEvent({
                event: {
                    schema: "iglu:com.example/debug_started/jsonschema/1-0-0",
                    data: {
                        debugType: session.type,
                        name: session.name,
                        timestamp: new Date().toISOString(),
                    }
                }
            });
        });

        debug.onDidTerminateDebugSession((session) => {
            this.tracker.trackSelfDescribingEvent({
                event: {
                    schema: "iglu:com.example/debug_stopped/jsonschema/1-0-0",
                    data: {
                        debugType: session.type,
                        name: session.name,
                        timestamp: new Date().toISOString(),
                    }
                }
            });
        });
    }

    private trackVSCWindowFocus() {
        window.onDidChangeWindowState((state) => {
            this.tracker.trackSelfDescribingEvent({
                event: {
                    schema: "iglu:com.example/window_focus_changed/jsonschema/1-0-0",
                    data: {
                        focused: state.focused, // true if VSCode is in focus, false otherwise
                        timestamp: new Date().toISOString(),
                    }
                }
            });
        });
    }
}


// const tracker = newTracker({
//     namespace: "my-tracker", // Namespace to identify the tracker instance. It will be attached to all events which the tracker fires.
//     appId: "my-app", // Application identifier
//     encodeBase64: false, // Whether to use base64 encoding for the self-describing JSON. Defaults to true.
//   }, {
//     endpoint: "https://collector.mydomain.net", // Collector endpoint
//     eventMethod: "post", // Method - defaults to POST
//     bufferSize: 1, // Only send events once n are buffered. Defaults to 1 for GET requests and 10 for POST requests.
//   });

