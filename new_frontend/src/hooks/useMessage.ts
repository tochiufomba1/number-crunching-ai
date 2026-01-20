import { useEffect, useState } from "react";
import useSSE from "./useSSE";
import { JobStatus } from "@/lib/definitions";

export default function useMessage(
    userID: string,
    jobID: string | null,
    onReceiveMessage: (jobInfo: JobStatus) => void
) {
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const { isConnected, messages, error } = useSSE(`/api/sse/${userID}`)

    // Assume jobs take, at most, a minute to complete
    useEffect(() => {
        if (!jobID) {
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        const timeout = setTimeout(() => {
            const jobInfo: JobStatus = { job_id: jobID, success: false, job_type: "unknown", filename: null, message: "Request timed out" }
            onReceiveMessage(jobInfo)
        }, 60000) // 60 second timeout

        return () => clearTimeout(timeout)
    }, [jobID, onReceiveMessage])

    // Execute response to job status
    useEffect(() => {
        // Only process new messages after successful upload
        if (!jobID) {
            setIsLoading(false)
            return
        }

        setIsLoading(true)

        const jobInfo = messages.get(jobID)

        // job status information hasn't been published yet
        if (!jobInfo) return

        onReceiveMessage(jobInfo)
        setIsLoading(false)

    }, [messages, jobID, onReceiveMessage])

    return {
        messageLoading: isLoading,
    }
}