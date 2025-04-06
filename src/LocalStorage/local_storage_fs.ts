import path from "path";
import fs from "fs";
import os from "os";
import { DocumentChangeInfo } from "../EventTracking/event_models";
import { window } from "vscode";


const analyticsDir = path.join(os.homedir(), ".vscode-event-aggregation");
const bufferPath = path.join(analyticsDir, "events-buffer.jsonl");


if (!fs.existsSync(analyticsDir)) {
    fs.mkdirSync(analyticsDir, { recursive: true });
}

function saveDocumentChangeEvent(event: DocumentChangeInfo) {
    const line = JSON.stringify({
        ...event,
    }) + "\n";

    fs.appendFile(bufferPath, line, (err) => {
        if (err)
            window.showInformationMessage("Failed to write event:", err.toString());
    });
}

function saveContinuousEvent(event:any) {
}

function

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
