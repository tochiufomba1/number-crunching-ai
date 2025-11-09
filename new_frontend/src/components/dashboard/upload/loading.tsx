"use client"
import { useEffect, useState } from "react"
import { socket } from "@/app/socket"
import { useRouter } from "next/navigation"

export default function Loading({ userID }: { userID: string }) {
    const router = useRouter()
    const [isConnected, setIsConnected] = useState(false)
    const [transport, setTransport] = useState("N/A")
    const [error, setError] = useState<string | null>(null)

    socket.auth = { userID }
    socket.connect();

    useEffect(() => {
        function onConnect() {
            setIsConnected(true);
            setTransport(socket.io.engine.transport.name);

            socket.io.engine.on("upgrade", (transport) => {
                setTransport(transport.name);
            });
        }

        function onDisconnect() {
            setIsConnected(false);
            setTransport("N/A");
        }

        function onData(payload: any, callback: any) {
            clearInterval(checkInterval);

            const response = payload["status"].split(",")

            if (response[0] !== "Success") {
                // handle
                setError(response[1]);
            }

            else {
                if (payload["job_type"] == "data") {
                    router.push('/dashboard/upload/tables')
                }
            }

            socket.emit('notification_received')
            callback({
                status: 'ok'
            });
        }

        function onDownload(payload: any, callback: any) {
            clearInterval(checkInterval);
            const response = payload["status"].split(",")

            if (response[0] !== "Success") {
                // handle
                setError(response[1])
            }
            else{
                router.push(`/dashboard/download?file=${response[1]}`)
            }

            socket.emit('notification_received')
            callback({
                status: 'ok'
            });
        }

        if (socket.connected) {
            onConnect()
        }

        const checkInterval = setInterval(() => {
            console.log("working")
            socket.emit("check_status");
        }, 2000);

        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);
        socket.on("data", onData)
        socket.on("download", onDownload)

        return () => {
            clearInterval(checkInterval);
            socket.off("connect", onConnect);
            socket.off("disconnect", onDisconnect);
            socket.off('data', onData);
            socket.on("download", onDownload);
        };
    }, [])

    return (
        <div>
            <p>Status: {isConnected ? "connected" : "disconnected"}</p>
            <p>Transport: {transport}</p>
            {error && <p>{error}</p>}
        </div>
    );
}