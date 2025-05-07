import NodeCache from 'node-cache';
import { DocumentChangeInfo, Event, ExecutionEventInfo, UserActivityEventInfo } from '../EventTracking/event_models';
//import { window } from 'vscode';

type CacheValue = string | number;

// WHAT HAPPENS WITH CACHE IS VSCODE IS CLOSED? I KNOW WE SEND DATA TO CLOUD BUT STILL
export class EventCache<T> {
    // ARE WE SENDING BY EVENT OR BY BATCH??? - BY EVENT
    // keys of type: event:{eventType}:{timestamp}

    // the types of objects to store in cache: DocumentChangeInfo, ExecutionEventInfo, InstantaneousEventInfo
    // the objects are aggregated over a minute!!!!! - so we don't have too many events stored

    // We store the events for about 15 minutes - enough to detect the flow, after which after they 'expire'
    // they are removed from the cache and sent to the cloud - BUT CAN WE DO THAT AUTOMATICALLY?
    //  OR DO WE HAVE TO DO IT MANUALLY, SEND ENTIRE BATCHES FROM TIME TO TIME?

    // Node-cache is an unordered hashmap, order is not maintained
    // For fast lookup, we thus maintain an array of keys ordered by time

    // Types of actions we do inside cache:
    // - set/has/get/update/delete/flush
    // - get events by type
    // - get events by timestamp - all events in a timeframe, ordered in ascending order
    // - last event for DocumentChangeInfo, to concatenate the data

    private cache: NodeCache;

    private ttlSeconds: number = 15*60; // Default TTL is 15 mins
    private checkEvery: number = 60; // Default check every 1 minute

    private eventsByTime : string[] = []; // array of events ordered by time


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

    getAll<T>() : { [key: string]: T } {
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

    // has(key: string): boolean {
    //     return this.cache.has(key);
    // }

    del(key: string): void {
        this.cache.del(key);
    }

    flush(): { [key: string]: T } { // called when the extension is deactivated, need to hook this onto extension closing!!!!!!!!
        const allEventsFromCache : { [key:string] : T}= this.getAll<T>();
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
        this.eventsByTime.push(key);

        //window.showInformationMessage( `Events ordered by time: ${this.eventsByTime}`);

        // Concatenate events if they are close enough and of the same type / source
        this.groupEvents(event);
    }

    // get
    groupEvents(event: T): void {
        // here we might have different projects, but we'll differentiate btw projects if we will need it for statistics

        // here for better functioning we need to deete the event found in the array and only put it back at the end
        // perhaps by marking it as 'deleted' in the array

        // test this!!!
        if (event instanceof UserActivityEventInfo) {
            const lastEventKey = this.eventsByTime[this.eventsByTime.length - 1];
            const lastEvent = new UserActivityEventInfo(this.cache.get<UserActivityEventInfo>(lastEventKey) as Partial<UserActivityEventInfo>); // T or UserActivityEventInfo???????

            if (lastEvent && Number(event.start) - Number(lastEvent.end) < 3* 60) { // 2-3 mins??
                try {
                    this.mergeTwoEvents(event, lastEvent as T, lastEventKey, this.eventsByTime.length - 1);
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    //window.showInformationMessage('Error merging events:', errorMessage);
                }
            }
            return;
        }

        if (event instanceof ExecutionEventInfo) {
            let index = this.eventsByTime.length - 1;
            while (index >= 0) {
                if (this.eventsByTime[index].includes(event.eventType?.toString())) {
                    const currEventKey = this.eventsByTime[index];
                    const currEvent = new ExecutionEventInfo(this.cache.get<ExecutionEventInfo>(currEventKey) as Partial<ExecutionEventInfo>);
                    if (currEvent && currEvent.eventType === event.eventType
                        && Number(event.start) - Number(currEvent.end) < 3 * 60) { // 2-3 minutes here??
                        try {
                            this.mergeTwoEvents(event, currEvent as T, currEventKey, index);
                        } catch (error) {
                            const errorMessage = error instanceof Error ? error.message : String(error);
                            //window.showInformationMessage('Error merging events:', errorMessage);
                        }
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
                    if (currEvent && currEvent instanceof DocumentChangeInfo && currEvent.source === event.source
                        && currEvent.fileName === event.fileName
                        && Number(event.start) - Number(currEvent.end) < 3* 60)
                    { // 2-3 minutes here??
                        try {
                            this.mergeTwoEvents(event, currEvent as T, currEventKey, index);
                        } catch (error) {
                            const errorMessage = error instanceof Error ? error.message : String(error);
                            //window.showInformationMessage('Error merging events:', errorMessage);
                        }
                        return;
                    }
                }
                index--;
            }
        }
    }

    // check if typing worked!!!!!!!
    mergeTwoEvents(event1: T, event2: T, key:string, index:number) {
        if (event1 instanceof Event && event2 instanceof Event) { // here make sure the subclasses still remain
            event1.concatenateData(event2);

            const newKey = this.getCorrectKey(event1);

            this.cache.del(key);
            this.cache.set(newKey, event1);

            this.eventsByTime[index] = newKey; // update the index with the new key
        }
        else {
            throw new Error('events passed are not of type Event');
        }
    }

}
