import { getData } from "./get_and_group_events";


async function getEvents(start:string, end:string, projectName: string | undefined = undefined) {
    // Fetch all events from the database within the specified time range
    const docChanges = await getData('document', start, end, projectName);
    const executions = await getData('execution', start, end, projectName);
    const userActivities = await getData('userActivity', start, end, projectName);

    
}
