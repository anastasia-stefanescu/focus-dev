import sqlite3 from 'sqlite3';
import path from 'path';
import { executionTableCreation, userActivityTableCreation, documentChangeTableCreation, constructSelect } from './sql_commands';
import { executionEventInsertion, userActivityEventInsertion, documentChangeEventInsertion } from './sql_commands';
import { Event, EventType, DocumentChangeInfo, ExecutionEventInfo, UserActivityEventInfo} from '../EventTracking/event_models';


export class SQLiteManager {
    private static instance: SQLiteManager;
    private db: sqlite3.Database;

    // Private constructor ensures that the class can't be instantiated directly
    private constructor() {
        const dbPath = path.resolve(__dirname, 'database.db');
        this.db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Failed to open the database:', err);
            } else {
                console.log('Database connected successfully!');
            }
        });

        this.db.serialize(() => {
            this.db.run(executionTableCreation);
            this.db.run(userActivityTableCreation);
            this.db.run(documentChangeTableCreation);
        });
    }

    public static getInstance(): SQLiteManager {
        if (!SQLiteManager.instance) {
            SQLiteManager.instance = new SQLiteManager();
        }
        return SQLiteManager.instance;
    }

    public insertEvent(event: Event) {
        const query = this.chooseQuery(event);
        const params = Object.values(event);

        return new Promise((resolve, reject) => {
            this.db.run(query, params, function (this: sqlite3.RunResult, err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID); // Return the ID of the newly inserted user
                }
            });
        });

    }

    public async executeSelect(eventType: EventType, start: string, end: string,
                project: string|undefined=undefined, branch: string|undefined=undefined,
                source: string|undefined=undefined): Promise<any[]> {

        const table = this.getTableName(eventType);
        const query = constructSelect(table, project, branch, start, end, source);

        return new Promise((resolve, reject) => {
            this.db.all(query, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows); // Return all objects
                }
            });
        });
    }

    private getTableName(eventType: EventType): string {
        if (eventType === 'document') {
            return 'document_change_events';
        } else if (eventType === 'execution') {
            return 'execution_events';
        } else if (eventType === 'userActivity') {
            return 'user_activity_events';
        }
        throw new Error('Unknown event type');
    }

    private chooseQuery(event: Event): string {
        if (event instanceof DocumentChangeInfo) {
            return documentChangeEventInsertion;
        } else if (event instanceof ExecutionEventInfo) {
            return executionEventInsertion;
        } else if (event instanceof UserActivityEventInfo) {
            return userActivityEventInsertion;
        }
        throw new Error('Unknown event type');
    }
}
