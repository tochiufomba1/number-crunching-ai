'use client'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../../ui/card";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Button } from "../../ui/button";
import { useTemplate } from "@/lib/useTemplate";
import { Template } from "@/lib/definitions";
import { useActionState, useEffect, useState } from "react";
import { uploadTransactions } from "@/lib/actions";
import useSSE from "@/hooks/useSSE";
import { useRouter } from "next/navigation";
import FormError from "@/components/form-error";

export default function TransactionUploadForm({ userID }: { userID: string }) {
    const { templates, isError, isLoading } = useTemplate(userID)
    const { isConnected, messages, error } = useSSE(`/api/sse/${userID}`)
    const [formStatus, formAction, isPending] = useActionState(uploadTransactions, null)
    const [jobError, setJobError] = useState<string | null>(null)
    const [jobID, setJobID] = useState<string | null>(null)
    const router = useRouter()

    // When form submits successfully, store the job ID
    useEffect(() => {
        if (formStatus?.job_id) {
            setJobID(formStatus.job_id)
        }
    }, [formStatus])

    useEffect(() => {
        if (!jobID) return

        const timeout = setTimeout(() => {
            setJobError("Job is taking longer than expected. Please check back later.")
            setJobID(null)
        }, 60000) // 60 second timeout

        return () => clearTimeout(timeout)
    }, [jobID])

    useEffect(() => {
        // Only process new messages after successful upload
        if (!jobID || messages.size === 0) return

        try {
            const jobInfo = messages.get(jobID)

            // job status information hasn't been published yet
            if (!jobInfo) return

            // if job succeeded, navigate to tables page
            if (jobInfo.success) {
                router.push('/dashboard/upload/tables')
                setJobID(null)
            }
            else {
                setJobError("Job failed. Try again...")
                setJobID(null)
            }
        } catch (err) {
            console.error('Failed to parse SSE message:', err)
            setJobError("Failed to process job status. Please refresh the page.")
            setJobID(null)
        }

    }, [messages, jobID, router])

    if(isLoading)
        return <p>Loading...</p>

    if(isError)
        return <p>An error occured.</p>

    return (
        <div className="h-full flex items-center justify-center gap-2">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle>Upload Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                    <form action={formAction}>
                        <div className="flex flex-col gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="template-name">Select a template</Label>
                                <Select name="template_id">
                                    <SelectTrigger className="w-[200px]">
                                        <SelectValue placeholder="Select a template" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {/* <SelectItem value="1">Generic</SelectItem> */}
                                        {templates.length > 0 &&
                                            templates.map((template: Template) => (
                                                <SelectItem key={template.id} id={template.id.toString()} value={template.id.toString()}>{template.title}</SelectItem>
                                            ))
                                        }
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <div className="grid w-full max-w-sm items-center gap-3">
                                    <Label htmlFor="transactions_file">Upload Uncategorized Transactions</Label>
                                    <Input name="transactions_file" id="transactions_file" type="file" />
                                </div>
                            </div>
                        </div>
                        <Button type="submit" className="w-full" disabled={isPending || jobID !== null}>Submit</Button>
                        {(isPending || jobID !== null) && <p>Processing...</p>}
                        <FormError message={formStatus?.error} />
                        <FormError message={jobError || undefined} />
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}