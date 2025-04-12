import path from "path";
import fs from "fs";
import os from "os";
import { DocumentChangeInfo } from "../EventTracking/event_models";
import { window } from "vscode";
import { addChange } from "../EventTracking/event_data_extraction";


const documentAnalyticsDir = path.join(os.homedir(), ".vscode-document-event-aggregation");
const documentBufferPath = path.join(documentAnalyticsDir, "events-buffer.jsonl");

const continAnalyticsDir = path.join(os.homedir(), ".vscode-continuous-event-aggregation");
const continBufferPath = path.join(continAnalyticsDir, "events-buffer.jsonl");

const spontAnalyticsDir = path.join(os.homedir(), ".vscode-spontaneous-event-aggregation");
const spontBufferPath = path.join(spontAnalyticsDir, "events-buffer.jsonl");


if (!fs.existsSync(documentAnalyticsDir)) {
    fs.mkdirSync(documentAnalyticsDir, { recursive: true });
}

if (!fs.existsSync(continAnalyticsDir)) {
    fs.mkdirSync(continAnalyticsDir, { recursive: true });
}

if (!fs.existsSync(spontAnalyticsDir)) {
    fs.mkdirSync(spontAnalyticsDir, { recursive: true });
}

function saveEvent(event: DocumentChangeInfo) {
    let file;

    const data = fs.readFileSync(documentBufferPath, "utf-8").split('\n').filter(Boolean);
    const lastEventData = JSON.parse(data[data.length - 1]);

    if (lastEventData.fileName === event.fileName && lastEventData.changeType === event.changeType) {
        if (Number(event.start) - Number(lastEventData.end) < 60000) { // or 2-3 minutes here??
            event.start = lastEventData.start; // 'concatenate' events
            addChange(event, lastEventData); // add the new event to the last one
            cutLastEvent();
        }
    } // further aggregating just by changeType or just by fileName will be done upon generating the report

    // add the new (possibly concatenated) event to the buffer in any case
    const line = JSON.stringify({
            ...event,
        }) + "\n";

        fs.appendFile(documentAnalyticsDir, line, (err) => {
            if (err)
                window.showInformationMessage("Failed to write event:", err.toString());
        });
}

function saveContinuousEvent(event:any) {

}


function readDocumentChangeEvents(): DocumentChangeInfo[] {
    if (!fs.existsSync(bufferPath)) {
        return [];
    }

    const data = fs.readFileSync(bufferPath, "utf-8");
    const lines = data.split("\n").filter(line => line.trim() !== "");
    const events: DocumentChangeInfo[] = lines.map(line => JSON.parse(line));
    return events;
}

function clearDocumentChangeEvents() {
    if (fs.existsSync(bufferPath)) {
        fs.unlinkSync(bufferPath);
    }
}

function aggregateDocumentChangeEventsPerHour() {
    // sum up the events stats just like before?
    // aggregated per file and per hour
}

function cutLastEvent() {
    const fd = fs.openSync(continBufferPath, "r+");
    const stats = fs.fstatSync(fd);

    const bufferSize = 250; // we estimate an event written in json on average shouldn't be bigger than 250 characters
    let buffer = Buffer.alloc(bufferSize); // read data in chunks;

    let position = stats.size;
    let chunk = "";
    let newlineIndex = -1;

    while (position > 0 && newlineIndex === -1) {
        const readSize = Math.min(bufferSize, position);
        position -= readSize;

        fs.readSync(fd, buffer, 0, readSize, position);
        chunk = buffer.toString("utf8", 0, readSize) + chunk;

        newlineIndex = chunk.lastIndexOf("\n", chunk.length - 2); // ignore final newline
    }

    const truncateAt = newlineIndex !== -1 ? position + newlineIndex + 1 : 0;
    fs.ftruncateSync(fd, truncateAt);
    //fs.writeSync(fd, newLine + "\n", truncateAt); // cut this line?
    fs.closeSync(fd);
}

function getLast
