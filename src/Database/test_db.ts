import { ExecutionEventInfo } from '../EventTracking/event_models';
import { SQLiteManager } from './sqlite_db';


const testEvent : ExecutionEventInfo= new ExecutionEventInfo({
    start: '2023-10-01T00:00:00Z',
    end: '2023-10-01T01:00:00Z',
    projectName: 'TestProject',
    projectDirectory: '/path/to/project',
    branch: 'main',
    eventType: 'debug',
    sessionId: '12345',
});

export async function testSqliteDatabase() {
    console.log('Testing SQLite database...');
    const instance = SQLiteManager.getInstance();

    console.log("test event", testEvent);

    instance.insertEvent(testEvent)
        .then((id) => {
            console.log('Inserted event with ID:', id);
        })
        .catch((err) => {
            console.error('Error inserting event:', err);
        });

    instance.executeSelect('execution', '2023-10-01T00:00:00Z', '2023-10-01T01:00:00Z')
        .then((rows) => {
            console.log('Selected rows:', rows);
        })
        .catch((err) => {
            console.error('Error selecting rows:', err);
        });
}






