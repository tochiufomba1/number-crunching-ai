'use client'
import { JobStatus } from "@/lib/definitions"
import { useCallback, useState } from "react"
import { toast } from "sonner"
import TemplateCreationForm from "./template-creation-form"
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card"
import { Separator } from "../ui/separator"
import useMessage from "@/hooks/useMessage"
import { AddCOADialog } from "./add-coa-form"

export default function TemplateCreationCard({ userID }: { userID: string }) {
    const [pendingJobs, setPendingJobs] = useState<Set<string>>(() => new Set())

    const addJob = useCallback((jobID: string) => {
        toast('Processing submission...')
        setPendingJobs((prevJobs) => new Set([...prevJobs, jobID]))
    }, [])

    const onReceiveMessage = useCallback((jobInfo: JobStatus) => {
        if (jobInfo.message){
            toast(jobInfo.message)
        }

        setPendingJobs((prevJobs) => prevJobs.difference(new Set([jobInfo.job_id])))
    }, [])

    const job = pendingJobs.size === 0 ? null : Array.from(pendingJobs)[0]
    const {} = useMessage(userID, job, onReceiveMessage)

    return (
        <>
            <Card className="w-full">
                <CardHeader>
                    <CardTitle>Create New Template</CardTitle>
                </CardHeader>
                <CardContent>
                    <TemplateCreationForm userID={userID} addJob={addJob} />
                    <Separator className="my-4" />
                    <AddCOADialog userID={userID} addJob={addJob} />
                </CardContent>
            </Card>
        </>
    )
}