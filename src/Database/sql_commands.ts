export function constructSelect(table: string, project: string|undefined, branch: string|undefined, a: string, b: string, source: string|undefined): string {
    let query = `SELECT * FROM ${table}
                   WHERE ((start BETWEEN '${a}' AND '${b}') OR (end BETWEEN '${a}' AND '${b}'))`;
    if (project)
        query += ` AND projectName = ${project}`;
    if (branch)
        query += ` AND branch = ${branch}`;
    if (source)
        query += ` AND source = ${source}`;
    query += ` ORDER BY start ASC`;
    return query;
}

export const successIndicatorTableCreation = `CREATE TABLE IF NOT EXISTS success_indicators(
    id INTEGER PRIMARY KEY,
    projectName TEXT,
    projectDirectory TEXT,
    branch TEXT,
    type TEXT,
    status TEXT,
    message REAL,
);`

export const executionTableCreation = `CREATE TABLE IF NOT EXISTS execution_events(
    id INTEGER PRIMARY KEY,
    start TEXT,
    end TEXT,
    projectName TEXT,
    projectDirectory TEXT,
    branch TEXT,
    eventType TEXT,
    sessionId TEXT
);`

export const userActivityTableCreation = `CREATE TABLE IF NOT EXISTS user_activity_events(
    id INTEGER PRIMARY KEY,
    start TEXT,
    end TEXT,
    projectName TEXT,
    projectDirectory TEXT,
    branch TEXT,
    file_actions INTEGER,
    git_actions INTEGER,
    window_focus_changes INTEGER,
    total_actions INTEGER,
    others INTEGER
);`

export const documentChangeTableCreation = `CREATE TABLE IF NOT EXISTS document_change_events(
    id INTEGER PRIMARY KEY,
    start TEXT,
    end TEXT,
    projectName TEXT,
    projectDirectory TEXT,
    branch TEXT,
    event_id INTEGER,
    fileName TEXT,
    filePath TEXT,
    lineCount INTEGER,
    characterCount INTEGER,
    linesAdded INTEGER,
    linesDeleted INTEGER,
    charactersAdded INTEGER,
    charactersDeleted INTEGER,
    singleDeletes INTEGER,
    multiDeletes INTEGER,
    singleAdds INTEGER,
    multiAdds INTEGER,
    autoIndents INTEGER,
    replacements INTEGER,
    keystrokes INTEGER,
    changeType TEXT,
    source TEXT
);`

export const successIndicatorInsertion = `INSERT INTO success_indicators (
    start,
    end,
    projectName,
    projectDirectory,
    branch,
    type,
    status,
    message
) VALUES(
    ?, ?, ?, ?, ?, ?, ?, ?
);`

export const executionEventInsertion = `INSERT INTO execution_events (
    start,
    end,
    projectName,
    projectDirectory,
    branch,
    eventType,
    sessionId
) VALUES(
    ?, ?, ?, ?, ?, ?, ?
);`

export const userActivityEventInsertion = `INSERT INTO user_activity_events (
    start,
    end,
    projectName,
    projectDirectory,
    branch,
    file_actions,
    git_actions,
    window_focus_changes,
    total_actions,
    others
) VALUES(
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
);`

export const documentChangeEventInsertion = `INSERT INTO document_change_events (
    start,
    end,
    projectName,
    projectDirectory,
    branch,
    event_id,
    fileName,
    filePath,
    lineCount,
    characterCount,
    linesAdded,
    linesDeleted,
    charactersAdded,
    charactersDeleted,
    singleDeletes,
    multiDeletes,
    singleAdds,
    multiAdds,
    autoIndents,
    replacements,
    keystrokes,
    changeType,
    source
) VALUES( ?, ?, ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);`
