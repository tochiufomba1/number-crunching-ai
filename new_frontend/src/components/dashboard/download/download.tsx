'use client'
import useSSE from '@/hooks/useSSE'
import { exportRequest } from '@/lib/actions'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { JobStatus } from '@/lib/definitions'

export default function Download({ userID, file_ext }: { userID: string, file_ext: string }) {
    const { isConnected, messages, error } = useSSE(`/api/sse/${userID}`)
    const [jobID, setJobID] = useState<string | null>(null);
    const [jobError, setJobError] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        const startExport = async () => {
            setIsExporting(true)
            setJobError(null)

            try {
                const jobInfo = await exportRequest(file_ext)
                if (jobInfo?.job_id) {
                    setJobID(jobInfo.job_id)
                } else {
                    throw new Error('No job ID returned')
                }
            } catch (error) {
                console.error('Export request failed:', error)
                setJobError('Failed to start export. Please try again.')
                setIsExporting(false)
            }
        }

        startExport()
    }, [file_ext])

    useEffect(() => {
        if (!jobID) return

        const timeout = setTimeout(() => {
            setJobError('Export is taking longer than expected. Please try again by refreshing the page.')
            setIsExporting(false)
            setJobID(null)
        }, 60000) // 1 minute timeout

        return () => clearTimeout(timeout)
    }, [jobID])

    useEffect(() => {
        if (!jobID || messages.size === 0) return

        const jobStatus = messages.get(jobID) as JobStatus | undefined

        if (!jobStatus) return // job status isn't published yet

        const downloadFile = async (filename: string) => {
            try {
                const response = await fetch(`/api/download/${filename}`)

                if (!response.ok) {
                    throw new Error(`Download failed: ${response.statusText}`)
                }

                const blob = await response.blob()
                const url = URL.createObjectURL(blob)

                // Create and trigger download
                const link = document.createElement('a')
                link.href = url
                link.download = filename
                link.click()

                // Cleanup after download starts
                setTimeout(() => {
                    URL.revokeObjectURL(url)
                }, 1000)

                setIsExporting(false)
                setJobID(null)
            } catch (error) {
                console.error('Download failed:', error)
                setJobError('Failed to download file. Please try again.')
                setIsExporting(false)
                setJobID(null)
            }
        }

        if (jobStatus.success && jobStatus.filename) {
            downloadFile(jobStatus.filename)
        } else {
            setJobError(jobStatus.message || 'Export failed')
            setIsExporting(false)
            setJobID(null)
        }
    }, [jobID, messages])

    return (
        <div>
            {isExporting && <p>Exporting file...</p>}
            {jobError && <p>{jobError}</p>}
            <Link href={'/dashboard/upload'}>Click here to upload more transactions.</Link>
        </div>
    )
}