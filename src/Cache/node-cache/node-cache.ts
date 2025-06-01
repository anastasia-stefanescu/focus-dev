import NodeCache from 'node-cache';
import { DocumentChangeInfo, Event, ExecutionEventInfo, UserActivityEventInfo } from '../../EventTracking/event_models';
//import { window } from 'vscode';
import { debug_cache } from '../../extension';

type CacheValue = string | number;

function _debug_logs(message: string): void {
    // Uncomment this line to enable debug logs
    // window.showInformationMessage(message);
    if (debug_cache)
        console.log(message);
}

// WHAT HAPPENS WITH CACHE IS VSCODE IS CLOSED? I KNOW WE SEND DATA TO CLOUD BUT STILL
export class EventCache<T> {
    // ARE WE SENDING BY EVENT OR BY BATCH??? - BY BATCH
    // keys of type: event:{eventType}:{timestamp}

    // the types of objects to store in cache: DocumentChangeInfo, ExecutionEventInfo, InstantaneousEventInfo

    // We store the events for about 15 minutes - enough to detect the flow, after which after they 'expire'

    // Node-cache is an unordered hashmap, order is not maintained
    // For fast lookup, we thus maintain an array of keys ordered by time

    // Types of actions we do inside cache:
    // - set/has/get/update/delete/flush
    // - get events by type
    // - get events by timestamp - all events in a timeframe, ordered in ascending order
    // - last event for DocumentChangeInfo, to concatenate the data

    private cache: NodeCache;

    private ttlSeconds: number = 15 * 60; // Default TTL is 16 mins, but we take flush all the data anyway and put it in the database
    private checkEvery: number = 60; // Default check every 1 minute

    private eventsByTime: string[] = []; // array of events ordered by time


    constructor() { // Default TTL is 1 hour
        this.cache = new NodeCache({ stdTTL: this.ttlSeconds, checkperiod: this.checkEvery });

        this.cache.on('expired', (key: string, value: CacheValue) => {
            const firstElement = this.eventsByTime[0];
            if (firstElement === key) {
                this.eventsByTime.shift(); // remove the first element
            }
            // SEND THE EVENT!!!
        });
    }

    set(key: string, value: CacheValue): void {
        this.cache.set(key, value, this.ttlSeconds);
    }

    get<T>(key: string): T | null {
        const value = this.cache.get<T>(key);
        return value === undefined ? null : value;
    }

    getAll<T>(): { [key: string]: T } {
        const keys = this.cache.keys();
        const allValues: { [key: string]: T } = {};

        // or return an array in order of timestamps??, not a dictionary
        for (const key of keys) {
            const value = this.cache.get<T>(key);
            if (value !== undefined) {
                allValues[key] = value;
            }
        }

        return allValues;
    }

    getAllInOrder<T>(): T[] {
        let listOfEvents: T[] = [];
        for (const key of this.eventsByTime) {
            const value = this.cache.get<T>(key);
            if (value !== undefined) {
                listOfEvents.push(value);
            }
        }
        return listOfEvents;
    }

    getCount<T>(): number {
        return this.cache.getStats().keys;
    }

    // has(key: string): boolean {
    //     return this.cache.has(key);
    // }

    del(key: string): void {
        this.cache.del(key);
    }

    flush(): { [key: string]: T } { // called when the extension is deactivated, need to hook this onto extension closing!!!!!!!!
        const allEventsFromCache: { [key: string]: T } = this.getAll<T>();
        this.cache.flushAll();
        this.eventsByTime = [];
        return allEventsFromCache;
    }

    keys(): string[] {
        return this.cache.keys();
    }

    getCorrectKey(event: T): string {
        let key;
        if (event instanceof DocumentChangeInfo) {
            //window.showInformationMessage(`Inisde getCorrect Key for docChange: ${event}`)
            key = `${event.source}:${event.fileName}:${event.start}:${event.end}`;
        } else if (event instanceof ExecutionEventInfo) {
            key = `${event.eventType}:${event.start}:${event.end}`;
        } else if (event instanceof UserActivityEventInfo) {
            key = `${event.start}:${event.end}`;
        } else {
            throw new Error('Unsupported event type');
        }
        return key;
    }

    saveEvent(event: T): void {
        let key;
        try {
            key = this.getCorrectKey(event);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            //window.showInformationMessage('Unsupported event type:', errorMessage);
            return;
        }

        //window.showInformationMessage(`Putting in cache key: ${key}`);
        this.cache.set(key, event);

        //window.showInformationMessage(` We have in cache for key: ${this.cache.get(key)}`);

        // Update array of events keys ordered by time
        //this.eventsByTime.push(key);
        _debug_logs(`Events ordered by time: ${this.eventsByTime}`);

        //window.showInformationMessage( `Events ordered by time: ${this.eventsByTime}`);

        // Concatenate events if they are close enough and of the same type / source
        if (this.eventsByTime.length === 0) {
            this.eventsByTime.push(key);
            _debug_logs(`First event added: ${key}`);
        } else {
            this.groupEvents(event);
        }
    }

    // get
    groupEvents(event: T): void {
        // here we might have different projects, but we'll differentiate btw projects if we will need it for statistics

        // here for better functioning we need to deete the event found in the array and only put it back at the end
        // perhaps by marking it as 'deleted' in the array

        // test this!!!
        _debug_logs(`Grouping event: ${JSON.stringify(event)}`);

        if (event instanceof UserActivityEventInfo) {
            const lastEventKey = this.eventsByTime[this.eventsByTime.length - 1];
            const lastEvent = this.cache.get<UserActivityEventInfo>(lastEventKey)

            if (lastEvent && Number(event.start) - Number(lastEvent.end) < 3 * 60 * 1000) { // 2-3 mins in milliseconds??
                _debug_logs(`Merging UserActivityEventInfo: ${JSON.stringify(event)} with last event: ${JSON.stringify(lastEvent)}`);
                try {
                    this.mergeTwoEvents(lastEvent as T, event, lastEventKey, this.eventsByTime.length - 1);
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    console.error('Error merging events:', errorMessage);
                }
            } else {
                this.eventsByTime.push(this.getCorrectKey(event)); // if the last event is not close enough, just add the new event to the end of the array
            }
            return;
        }

        if (event instanceof ExecutionEventInfo) {
            let index = this.eventsByTime.length - 1;
            while (index >= 0) {
                _debug_logs('New event event Type: ' + event.eventType + ' Last event key: ' + this.eventsByTime[index]);
                if (this.eventsByTime[index].includes(event.eventType?.toString())) {
                    _debug_logs(`Last event at ${index} contains new event's eventType`);
                    const currEventKey = this.eventsByTime[index];
                    const currEvent = this.cache.get<ExecutionEventInfo>(currEventKey);
                    if (currEvent && currEvent.eventType === event.eventType
                        && Number(event.start) - Number(currEvent.end) < 3 * 60 * 1000) { // 2-3 minutes here??
                        _debug_logs(`Merging ExecutionEvents: ${JSON.stringify(event)} with last event: ${JSON.stringify(currEvent)}`);
                        try {
                            this.mergeTwoEvents(currEvent as T, event, currEventKey, index);
                        } catch (error) {
                            const errorMessage = error instanceof Error ? error.message : String(error);
                            console.error('Error merging events:', errorMessage);
                        }
                        return;
                    } else {
                        this.eventsByTime.push(this.getCorrectKey(event)); // if the last event is not close enough, just add the new event to the end of the array
                        return;
                    }
                }
                index--;
            }
        }

        // first find the last event of the same type/source
        if (event instanceof DocumentChangeInfo) {
            let index = this.eventsByTime.length - 1;
            while (index >= 0) {
                if (event.source && this.eventsByTime[index].includes(event.source)) {
                    const currEventKey = this.eventsByTime[index];
                    const currEvent = new DocumentChangeInfo(this.cache.get<DocumentChangeInfo>(currEventKey) as Partial<DocumentChangeInfo>);
                    if (currEvent && currEvent instanceof DocumentChangeInfo && currEvent.source === event.source && currEvent.fileName === event.fileName) {

                        if (Number(event.start) - Number(currEvent.end) < 3 * 60 * 1000) { // 2-3 minutes here??
                            try {
                                this.mergeTwoEvents(currEvent as T, event, currEventKey, index);
                            } catch (error) {
                                const errorMessage = error instanceof Error ? error.message : String(error);
                                //window.showInformationMessage('Error merging events:', errorMessage);
                            }
                            return;
                        } else {
                            this.eventsByTime.push(this.getCorrectKey(event)); // if the last event is not close enough, just add the new event to the end of the array
                            return;
                        }
                    }
                }
                index--;
            }
        }
    }

    // check if typing worked!!!!!!!
    mergeTwoEvents(event1: T, event2: T, key: string, index: number) {
        if (event1 instanceof Event && event2 instanceof Event) { // here make sure the subclasses still remain
            _debug_logs(`Event 1 is of type UserActivityEventInfo: ${!!(event1 instanceof UserActivityEventInfo)}`);
            _debug_logs(`Event 2 is of type UserActivityEventInfo: ${!!(event2 instanceof UserActivityEventInfo)}`);
            event1.concatenateData(event2);
            _debug_logs(`Merged events: ${JSON.stringify(event1)}`);

            const newKey = this.getCorrectKey(event1);

            this.cache.del(key);
            _debug_logs(`After deletion, we have ${this.getCount().toString()} events in cache`);
            this.cache.set(newKey, event1);
            _debug_logs(`After insertion, we have ${this.getCount().toString()} events in cache`);

            this.eventsByTime[index] = newKey; // update the index with the new key
            _debug_logs(`Updated events ordered by time: ${this.eventsByTime}`);
        }
        else {
            console.error('events passed are not of type Event');
        }
    }

}
