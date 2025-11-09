// https://github.com/socketio/socket.io/blob/main/examples/private-messaging/server/messageStore.js

import { Message } from "@/lib/definitions";

class MessageStore {
    saveMessage(userID: string, message: any) { }
    findMessageForUser(userID: string) { }
}

export class InMemoryStore extends MessageStore {
    messages: Map<string, Message[]>;

    constructor() {
        super();
        this.messages = new Map<string, Message[]>();
    }

    saveMessage(userID: string, message: Message) {
        if (!this.messages.has(userID)) {
            this.messages.set(userID, []);
        }

        this.messages.get(userID)!.push(message)
    }

    pop(userID: string) {
        this.messages.get(userID)?.pop()
    }

    clear(userID: string){
        this.messages.set(userID, []);
    }

    findMessageForUser(userID: any) {
        return this.messages.get(userID) || []
    }
}