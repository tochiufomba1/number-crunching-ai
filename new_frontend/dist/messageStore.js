// https://github.com/socketio/socket.io/blob/main/examples/private-messaging/server/messageStore.js
class MessageStore {
    saveMessage(userID, message) { }
    findMessageForUser(userID) { }
}
export class InMemoryStore extends MessageStore {
    constructor() {
        super();
        this.messages = new Map();
    }
    saveMessage(userID, message) {
        if (!this.messages.has(userID)) {
            this.messages.set(userID, []);
        }
        this.messages.get(userID).push(message);
    }
    pop(userID) {
        var _a;
        (_a = this.messages.get(userID)) === null || _a === void 0 ? void 0 : _a.pop();
    }
    clear(userID) {
        this.messages.set(userID, []);
    }
    findMessageForUser(userID) {
        return this.messages.get(userID) || [];
    }
}
