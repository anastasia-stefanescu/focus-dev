import { ExecutionEventInfo } from '../EventTracking/event_models';
import { SQLiteManager } from '../Database/sqlite_db';


const testEvent: ExecutionEventInfo = new ExecutionEventInfo({
    start: '2023-10-01T00:00:00Z',
    end: '2023-10-01T01:00:00Z',
    projectName: 'TestProject',
    projectDirectory: '/path/to/project',
    branch: 'main',
    eventType: 'debug',
    sessionId: '12345',
});

export async function testSqliteDatabase() {
    // write separate try-catches for async functions

    console.log('Testing SQLite database...');
    const instance = SQLiteManager.getInstance();

    console.log("test event", testEvent);

    // First, insert the event and wait for it to complete
    try {
        const id = await instance.executeInsert(testEvent);
        console.log('Inserted event with ID:', id);
    } catch (err) {
        console.error('Error inserting event:', err);
    }

    // Then, select the rows after insertion
    try {
        const rows = await instance.executeSelect('execution', '2023-10-01T00:00:00Z', '2023-10-01T02:00:00Z');
        console.log('Selected rows after insertion:', rows);
    } catch (err) {
        console.error('Error selecting rows:', err);
    }

    // Now, clear the database after the event insertion and selection
    try {
        await instance.clearDatabase();
        console.log('Database cleared successfully.');
    }
    catch (err) {
        console.error('Error clearing database', err);
    }

    try {
        // After clearing the database, check if rows exist
        const rowsAfterClear = await instance.executeSelect('execution', '2023-10-01T00:00:00Z', '2023-10-01T02:00:00Z');
        console.log('Selected rows after clearing database:', rowsAfterClear);
    } catch (err) {
        console.error('Error clearing database or selecting rows after clearing:', err);
    }
}






