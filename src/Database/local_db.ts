import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import { ExecutionEventInfo, UserActivityEventInfo, DocumentChangeInfo, EventType, Event } from '../EventTracking/event_models'

type DBData = {
    documentEvents: DocumentChangeInfo[];
    executionEvents: ExecutionEventInfo[];
    userActivityEvents: UserActivityEventInfo[];
}

export class EventDatabase {
    private static instance: EventDatabase;
    private db: Low<DBData>;

    private constructor() {
        const adapter = new JSONFile<DBData>('events.json');
        this.db = new Low<DBData>(adapter, {
            documentEvents: [],
            executionEvents: [],
            userActivityEvents: [],
        });
    }

    // Get the singleton instance
    public static getInstance(): EventDatabase {
        if (!EventDatabase.instance) {
            EventDatabase.instance = new EventDatabase();
        }
        return EventDatabase.instance;
    }

    public async isDbLoaded(): Promise<boolean> {
        // This will check if the data has been successfully read
        await this.db.read();
        return this.db.data != null;
    }

    // Add an event to the database
    public async addEventToDb(event: Event): Promise<void> {
        if (event instanceof DocumentChangeInfo) {
            this.db.data.documentEvents.push(event);
        } else if (event instanceof ExecutionEventInfo) {
            this.db.data.executionEvents.push(event);
        } else if (event instanceof UserActivityEventInfo) {
            this.db.data.userActivityEvents.push(event);
        }
        await this.db.write();
    }

    // Get events from the database by event type
    public async getEventsFromDb(eventType: EventType): Promise<Event[]> {
        await this.db.read();
        let events: Event[];
        if (eventType === 'document') {
            const json_events = this.db.data.documentEvents;
            events = json_events.map((jsonEvent) => DocumentChangeInfo.buildEventFromJson(jsonEvent));
        } else if (eventType === 'execution') {
            const json_events = this.db.data.executionEvents;
            events = json_events.map((jsonEvent) => ExecutionEventInfo.buildEventFromJson(jsonEvent));
        } else if (eventType === 'userActivity') {
            const json_events = this.db.data.userActivityEvents;
            events = json_events.map((jsonEvent) => UserActivityEventInfo.buildEventFromJson(jsonEvent));
        } else {
            throw new Error('Invalid event type');
        }

        return events;
    }
}

export default EventDatabase;
