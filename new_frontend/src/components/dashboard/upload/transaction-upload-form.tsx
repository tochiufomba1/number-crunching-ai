'use client'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../../ui/card";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { useTemplate } from "@/hooks/useTemplate";
import { JobStatus } from "@/lib/definitions";
import { useState } from "react";
import { uploadTransactions } from "@/lib/actions";
import { useRouter } from "next/navigation";
import useMappingOptions from "@/hooks/useMappingOptions";
import useMessage from "@/hooks/useMessage";
import OptionSelect from "@/components/option-select";
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { TransactionUploadSchema } from "@/schemas";
import { Controller, useForm } from "react-hook-form";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { convertToFormData } from "@/lib/helpers";

export default function TransactionUploadForm({ userID }: { userID: string }) {
    const router = useRouter()

    const [jobID, setJobID] = useState<string | null>(null)
    const [jobError, setJobError] = useState<null | any>(null)

    const { control, handleSubmit, watch, formState: { errors } } = useForm({
        resolver: zodResolver(TransactionUploadSchema),
        defaultValues: {
            template_id: "0",
            mapping_group_id: "0",
            transactions_file: undefined as any,
        }
    })
    const selectedTemplate = watch("template_id")

    const { templates, isError, isLoading } = useTemplate(userID)
    const { mappingOptions, mappingOptionsLoading, mappingOptionsError } = useMappingOptions(selectedTemplate)

    const onReceiveMessage = (jobInfo: JobStatus) => {
        // if job succeeded, navigate to tables page
        if (jobInfo.success) {
            router.push('/dashboard/upload/tables')
            setJobID(null)
        }
        else {
            setJobError({ message: "Job failed. Try again..." })
            setJobID(null)
        }
    }

    const onSubmit = async (data: z.infer<typeof TransactionUploadSchema>) => {
        const formData = convertToFormData(data)

        const formStatus = await uploadTransactions(formData)

        if (formStatus.job_id) {
            setJobID(formStatus.job_id)
        }

        return formStatus
    }

    const { messageLoading } = useMessage(userID, jobID, onReceiveMessage)

    if (isError)
        return <p>An error occured.</p>

    return (
        <div className="h-full flex items-center justify-center gap-2">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle>Upload Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                    <form id="transaction-upload-form" onSubmit={handleSubmit(onSubmit)}>
                        <FieldGroup>
                            <OptionSelect
                                selectName="template_id"
                                selectTitle="Select a template"
                                placeholder=""
                                options={templates ? templates.getSelectOptions() : []}
                                formControl={control}
                                disabled={isLoading}
                            />
                            <OptionSelect
                                selectName="mapping_group_id"
                                selectTitle="Select a mapping (optional)"
                                placeholder=""
                                options={mappingOptions ? mappingOptions.getSelectOptions() : []}
                                formControl={control}
                                disabled={mappingOptionsLoading || selectedTemplate === "0"}
                                none="0"
                            />
                        </FieldGroup>
                        <FieldGroup>
                            <Controller
                                name="transactions_file"
                                control={control}
                                render={({ field: { value, onChange, ...fieldProps }, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="transactions_file">
                                            Transactions
                                        </FieldLabel>
                                        <Input
                                            {...fieldProps}
                                            id="transactions_file"
                                            aria-invalid={fieldState.invalid}
                                            placeholder="Upload transactions file here"
                                            type="file"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                onChange(file);
                                            }}
                                        />
                                        {fieldState.invalid && (
                                            <FieldError errors={[fieldState.error]} />
                                        )}
                                    </Field>
                                )}
                            />
                        </FieldGroup>
                    </form>
                </CardContent>
                <CardFooter>
                    <Field>
                        {jobError && <FieldError errors={jobError} />}
                        <Button
                            type="submit"
                            form="transaction-upload-form"
                            disabled={messageLoading}
                        >
                            Submit
                        </Button>
                    </Field>
                </CardFooter>
            </Card>
        </div>
    )
}