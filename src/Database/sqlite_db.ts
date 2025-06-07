import sqlite3 from 'sqlite3';
import path from 'path';
import { window } from 'vscode';
import { executionTableCreation, userActivityTableCreation, documentChangeTableCreation, constructSelect,} from './sql_commands';
import { windowFocusTableCreation, windowFocusInsertion, successIndicatorInsertion, successIndicatorTableCreation } from './sql_commands';
import { executionEventInsertion, userActivityEventInsertion, documentChangeEventInsertion } from './sql_commands';
import { Event, EventType, getEventType } from '../EventTracking/event_models';

const eventTables: { [key in EventType]: TableCommands} = {
    document: {
        name: 'document_change_events',
        create: documentChangeTableCreation,
        insert: documentChangeEventInsertion
    },
    execution: {
        name: 'execution_events',
        create: executionTableCreation,
        insert: executionEventInsertion
    },
    userActivity: {
        name: 'user_activity_events',
        create: userActivityTableCreation,
        insert: userActivityEventInsertion
    },
    successIndicator: {
        name: 'success_indicators',
        create: successIndicatorTableCreation,
        insert: successIndicatorInsertion
    },
    windowFocus: {
        name: 'window_focus',
        create: windowFocusTableCreation,
        insert: windowFocusInsertion
    },
};

interface TableCommands {
    name: string;
    create: string;
    insert: string;
}

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
            for (const table of Object.values(eventTables)) {
                this.db.run(table.create);
            }
        });
    }

    public static getInstance(): SQLiteManager {
        if (!SQLiteManager.instance) {
            SQLiteManager.instance = new SQLiteManager();
        }
        return SQLiteManager.instance;
    }

    public executeInsert(event: Event) {
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

    public clearDatabase() {
        const tableNames = Object.values(eventTables).map(table => table.name);
        tableNames.forEach(table => {
            const query = `DELETE FROM ${table}`;

            this.db.run(query, (err) => {
                if (err) {
                    console.error(`Error clearing table ${table}:`, err);
                } else {
                    console.log(`Table ${table} cleared successfully.`);
                }
            });
        });
    }

    // what type does this return?
    public async executeSelect(eventType: EventType, start: string, end: string,
        project: string | undefined = undefined, branch: string | undefined = undefined,
        source: string | undefined = undefined): Promise<any[]> {

        const table = this.getTableName(eventType);
        const query = constructSelect(table, project, branch, start, end, source);
        console.log("Query", query);

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
        return eventTables[eventType].name;
    }

    private chooseQuery(event: Event): string {
        console.log("Choosing query for event:", event);
        const eventType : EventType = getEventType(event);
        const tableCreate = eventTables[eventType].insert;
        return tableCreate;
    }
}
