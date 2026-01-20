"use client"
import { JobStatus } from "@/lib/definitions";
import { useEffect, useRef, useState } from "react";
import { success } from "zod";

// Source: https://github.com/felixiho/next-js-streaming/blob/main/src/app/hooks/useSSE.ts
const useSSE = (url: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Map<string, any>>(new Map()); // Array to store messages
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
      reconnectAttemptsRef.current = 0;
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        setMessages(prev => {
          const newMap = new Map(prev).set(data.job_id, {
            job_id: data.job_id,
            success: data.success,
            job_type: data.job_type,
            filename: data.filename || null,
            message: data.message || null,
          } as JobStatus)
          return newMap;
        }); // Append new message to the array
      } catch (err) {
        console.error("Failed to parse message:", err);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      setError("Connection lost, attempting to reconnect...");
      eventSource.close();
      handleReconnect();
    };
  };

  const handleReconnect = () => {
    if (reconnectAttemptsRef.current < maxReconnectAttempts) {
      const retryTimeout = 1000 * Math.pow(2, reconnectAttemptsRef.current); // Exponential backoff
      setTimeout(() => {
        reconnectAttemptsRef.current += 1;
        connect();
      }, retryTimeout);
    } else {
      setError("Maximum reconnect attempts reached.");
    }
  };

  useEffect(() => {
    connect();

    return () => {
      eventSourceRef.current?.close(); // Clean up connection on unmount
    };
  }, [url]);

  return { isConnected, messages, error };
};

export default useSSE;