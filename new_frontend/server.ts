import { createServer } from "node:http";
import next from "next"
import { Server } from "socket.io"
import { InMemoryStore } from "./messageStore";

const messageStore = new InMemoryStore()

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler()

app.prepare().then(() => {
    const httpServer = createServer(handler)

    const io = new Server(httpServer, {
        cors: {
            origin: "http://localhost:8000"
        }
    });

    io.use(async (socket, next) => {
        const req = socket.request;
        //console.log(`Client connecting from host: ${req.headers.host}`);

        const userID = socket.handshake.auth.userID || "-1"
        socket.data.userID = userID

        next();
    });

    io.on("connection", (socket) => {
        const userID = socket.data.userID;
        socket.join(userID);

        const missedMessages = messageStore.findMessageForUser(userID);
        // console.log(`USER: ${userID} MISSED: ${missedMessages}`);

        if (missedMessages && missedMessages.length > 0) {
            const messageToEmit = missedMessages[missedMessages.length-1];

            socket.to(userID).emit(messageToEmit["job_type"], messageToEmit)
        }

        socket.on("notification_received", () => {
            messageStore.clear(userID);
        });

        socket.on("data", async (payload) => {
            const recipientID = payload["recipient"];
            console.log(`USER: ${userID} | RECIPIENT: ${recipientID}`);

            try {
                await socket.timeout(5000).to(recipientID).emitWithAck("data", payload)

            } catch (err) {
                messageStore.saveMessage(recipientID, payload);
                console.log("svr heh ehe")
            }
        });

        socket.on("download", (payload) => {
            //console.log(payload)
            socket.to(payload["recipient"]).emit("download", payload)
        });

        // Periodic check while client is waiting
        socket.on("check_status", () => {
            const messages = messageStore.findMessageForUser(userID);
            if (messages && messages.length > 0) {
                const notification = messages[messages.length - 1];
                socket.emit(notification["job_type"], notification);
            }
        });
    });

    httpServer
        .once("error", (err) => {
            console.error(err);
            process.exit(1);
        })
        .listen(port, () => {
            console.log(`> Ready on http://${hostname}:${port}`);
        });
})