import { DocumentChangeInfo, Event, EventType, ExecutionEventInfo, getNewEvent, UserActivityEventInfo } from "../EventTracking/event_models";
import { sqlInstance } from "../extension";

import { instance } from "../extension";
import { window } from 'vscode';

export async function getData(type: EventType, start: string, end: string, projectName: string | undefined = undefined): Promise<Event[]> {
    //const response = await fetch('/api/users/timeInterval').then(res => res.json())

    const response = await sqlInstance.executeSelect(type, start, end, projectName);
    console.log(' SQL select response: ', response);

    // MAY NEED TO SORT BECAUSE WE'RE INSERTING DATA FROM MULTIPLE CACHES!!!!!
    // We will get events from one single database, be it JSONL based or SQL based

    const events: Event[] = [];
    for (const elem of response) {
        let event;
        if (type === 'document')
            event = DocumentChangeInfo.buildEventFromJson(elem);
        else if (type === 'execution')
            event = ExecutionEventInfo.buildEventFromJson(elem);
        else if (type === 'userActivity')
            event = UserActivityEventInfo.buildEventFromJson(elem);
        else
            event = Event.buildEventFromJson(elem); // this should not happen, but just in case
        events.push(event); // add the event to the new events array
         // put data in it - this could be improved, as in python
        // if ((projectName && event.projectName == projectName) || !projectName) {
        //     newEvents = groupEvents(events, event);
        // }
    }

    // how is data from multiple event types handled here? Or document changes from different sources?
    return events;
    //return newEvents; // return the new events array
}


export function groupEvents(events: Event[], event: Event): Event[] {
    let index = events.length - 1;
    while (index >= 0) {
        const crtEvent = events[index];

        if (crtEvent && checkEventDifferences(event, crtEvent)) { // 3 minutes difference
            if (checkEventTypeConditions(event, crtEvent)) {
                try {
                    crtEvent.concatenateData(event); // is this the correct funtion?
                    events[index] = crtEvent;
                    event = crtEvent; // !!
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    window.showInformationMessage('Error merging events:', errorMessage);
                }

            }
        }
        else {
            events.push(event); // add the event to the end of the array
            break; // ne oprim daca ajungem la element cu diferenta prea mare
        }
        index--;
    }
    return events;
}

function checkEventTypeConditions(event: Event, crtEvent: Event): boolean {
    if (event instanceof DocumentChangeInfo && crtEvent instanceof DocumentChangeInfo) {
        return (crtEvent.source === event.source && crtEvent.fileName === event.fileName);
    }
    if (event instanceof ExecutionEventInfo && crtEvent instanceof ExecutionEventInfo) {
        return (crtEvent.eventType === event.eventType);
    }
    if (event instanceof UserActivityEventInfo && crtEvent instanceof UserActivityEventInfo) {
        return true;
    }
    return false;
}

function checkEventDifferences(event: Event, crtEvent: Event): boolean {
    const ALLOWED_DIFFERENCE = 3 * 60; // 3 minutes
    const eventStart = new Date(event.start).getTime();
    const eventEnd = new Date(event.end).getTime();
    const crtEventStart = new Date(crtEvent.start).getTime();
    const crtEventEnd = new Date(crtEvent.end).getTime();

    const eventsDif = eventStart - crtEventEnd;
    const eventDuration = eventEnd - eventStart;
    const crtEventDuration = crtEventEnd - crtEventStart;

    if (eventsDif < ALLOWED_DIFFERENCE && eventDuration + crtEventDuration >= ALLOWED_DIFFERENCE) // 3 minutes difference
        return true;
    return false;
}
