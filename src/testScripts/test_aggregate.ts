import { group_events_by_time_unit } from "../Aggregation/time_aggregate";
import { EventType } from "../EventTracking";

export function testTimeAggregate() {
    const timeUnit = 'hour';
    const type : EventType = 'userActivity';
    //const projectName = 'CareerQuest';

    const events_by_time_units = group_events_by_time_unit(timeUnit, type);
    console.log(events_by_time_units);
}
