'use client'
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { useMemo, useState } from "react";
import { createTemplate } from "@/lib/actions";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { TemplateCreationFormScheama } from "@/schemas"
import { Field, FieldError, FieldLabel } from "../ui/field";
import { convertToFormData } from "@/lib/helpers";
import OptionSelect from "../option-select";
import useCOAOptions from "@/hooks/useCOAOptions";
import z from "zod";

export default function TemplateCreationForm({
    userID,
    addJob,
}: {
    userID: string,
    addJob: (jobID: string) => void
}) {
    const { coaOptions, isCOAOptionsLoading } = useCOAOptions(userID)

    const coaOptionsWithGenerate = useMemo(() => {
        const baseOptions = coaOptions || [];
        return [
            ...baseOptions,
            { label: "Generate COA from transactions file", value: "-1" }
        ];
    }, [coaOptions]);

    const [APIFormError, setAPIFormError] = useState<null | any>(null)

    const form = useForm({
        resolver: zodResolver(TemplateCreationFormScheama),
        defaultValues: {
            template_title: "",
            template_coa_group_id: "",
            transactions_file: undefined as any,
        }
    })

    async function onSubmit(data: z.infer<typeof TemplateCreationFormScheama>) {
        setAPIFormError(null)

        const formData = convertToFormData(data)
        const res = await createTemplate(formData)

        if (res.error) {
            setAPIFormError({ message: res.error })
            return
        }

        addJob(res.job_id)
        form.reset()
    }

    return (
        <form id="template-creation-form" onSubmit={form.handleSubmit(onSubmit)}>
            <Controller
                name="template_title"
                control={form.control}
                render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="template_title">
                            Title
                        </FieldLabel>
                        <Input
                            {...field}
                            id="template_title"
                            aria-invalid={fieldState.invalid}
                            placeholder=""
                        />
                        {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                        )}
                    </Field>
                )}
            />

            <OptionSelect
                selectName="template_coa_group_id"
                selectTitle="COA"
                placeholder="Select COA to use for template"
                options={coaOptionsWithGenerate}
                formControl={form.control}
                disabled={isCOAOptionsLoading}
            />

            <Controller
                name="transactions_file"
                control={form.control}
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

            <Field>
                {APIFormError && <FieldError errors={APIFormError} />}
                <Button type="submit" form="template-creation-form" className="w-full mt-2">Submit</Button>
            </Field>
        </form>
    )
}