import { DocumentChangeInfo, Event, EventType, ExecutionEventInfo, getNewEvent, UserActivityEventInfo } from "../EventTracking/event_models";
import { instance } from "../extension";
import { window } from 'vscode';
import { getData } from "./get_and_group_events";
import { debug_time_aggregate } from "../extension";

export class BucketEvent {
    event : Event | undefined = undefined; // is the type here kept?
    percentage : number = 0;
    bucketStart: Date | undefined = undefined; // when the event started
    bucketEnd: Date | undefined = undefined; // when the event ended

    constructor(ev: Event, prc: number, start?: Date, end?: Date) {
        this.event = ev; // instantiate new event? copy? deep copy?
        this.percentage = prc;
        this.bucketStart = start;
        this.bucketEnd = end;
    }
}

const NO_SECONDS_IN_DAY = 60 * 60 * 24;
const NO_SECONDS_IN_HOUR = 60 * 60;

function _debug_logs(message: string) {
    if (debug_time_aggregate) {
        console.log(message);
    }
}

// used for events ordering

// number of minutes doing a certain activity
// percentage of various activities (document changes, user activity, execution)
export async function group_events_by_time_unit(time_unit : 'hour' | 'day', type: EventType, projectName: string | undefined = undefined) {
    // get last week dates
    const time_units_events: { [key: string]: BucketEvent[] } = {}; // number of minutes
    //const time_units : string[] = [];

    const crtDate = new Date().getTime(); // current date
    const startDate = new Date(crtDate - 24 * 60 * 60 * 1000).getTime(); // 24 hours ago

    const events: Event[] = await getData(type, startDate.toString(), crtDate.toString(), projectName); // ordered

    const time_unit_seconds = time_unit === 'hour' ? NO_SECONDS_IN_HOUR : NO_SECONDS_IN_DAY;
    const no_units = time_unit === 'hour' ? 24 : 7;


    let index = 0;
    for(let i = no_units; i>= 1; i--) {
        const begin_interval :Date = new Date(crtDate - i * time_unit_seconds);
        const next_interval_begin:Date= new Date(crtDate - (i-1) * time_unit_seconds);
        //time_units.push(begin_string);
        _debug_logs(`Processing time unit ${i}: ${begin_interval.toISOString()} - ${next_interval_begin.toISOString()}`);

        let startEvent : Date = new Date(Number(events[index].start));
        let endEvent : Date = new Date(Number(events[index].end));
        _debug_logs(`At event ${index} - Start: ${startEvent.toISOString()}, End: ${endEvent.toISOString()}`);
        while (begin_interval <= startEvent &&  startEvent < next_interval_begin) // it just has to begin in current time unit
        {
            let percentage = 1;
            if (endEvent > next_interval_begin)  { // we have to cut the event
                const seconds_in_unit = next_interval_begin.getTime() - startEvent.getTime();
                const seconds_event = endEvent.getTime() - startEvent.getTime();
                percentage = seconds_in_unit / seconds_event;

                time_units_events[begin_interval.toString()].push(new BucketEvent(events[index], 1 - percentage));
            }
            time_units_events[begin_interval.toString()].push(new BucketEvent(events[index], percentage));
            _debug_logs(`Added event: ${index} with percentage: ${percentage} to time unit: ${begin_interval.toString()}`);
            index++;
            startEvent = new Date(Number(events[index].start));
            endEvent = new Date(Number(events[index].end));
        }
    }

    // from the aggregated events, get those that
    return time_units_events;
}

// are types of events kept inside BucketEvent[]?
// is called with events of a single type returned by group_events_by_time_unit, we don't need to check type inside
export function percentage_of_type_bucket(time_unit: 'hour' | 'day', bucket_events : BucketEvent[], eventType: EventType) :number {
    let percentage_of_event_type = 0

    for (const bucket_event of bucket_events) {
        percentage_of_event_type += bucket_event.percentage;
    }
    return percentage_of_event_type
}

// extract_data_from_bucket function????
