import { UserActivityEventInfo, DocumentChangeInfo } from "../EventTracking/event_models";
import { EventCache } from "../LocalStorage/local_storage_node-cache";

const ev = new UserActivityEventInfo();
ev.file_actions = 5;
ev.git_actions = 3;
ev.window_focus_changes = 7;
ev.others = 9;
ev.total_actions = 24;
//ev.start = '2025-04-25T'



const DocCache = new EventCache<DocumentChangeInfo>();

