'use client'
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useMemo, useState } from "react";
import useCOAOptions from "@/hooks/useCOAOptions";
import { Account, MappingRecord } from "@/lib/definitions";
import useSWR from "swr";
import Table from "../table";
import { createMapping, fetcher } from "@/lib/actions";
import { useRouter } from "next/navigation";
import OptionSelect from "../option-select";
import { Option } from "@/lib/definitions"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "../ui/field";
import { Controller, useForm } from "react-hook-form";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import useCOAAccounts from "@/hooks/useCOAAccounts";
import { toast } from "sonner";

interface MappingCreationProps {
    userID: string
    templateID: string
}

const formSchema = z.object({
    mapping_name: z.string(),
    coa_group_id: z.coerce.number<string>()
})

export default function CreateMapping({ userID, templateID }: MappingCreationProps) {
    const router = useRouter()

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            mapping_name: "",
            coa_group_id: ""
        }
    })
    const coaGroupID = form.watch("coa_group_id")

    const [err, setError] = useState<null | any>(null)
    const [translations, setTranslations] = useState(new Map<number, any>())

    const { coaOptions, isCOAOptionsLoading } = useCOAOptions(userID);
    const { accounts } = useCOAAccounts(userID, coaGroupID)
    const { data, isLoading, error }: { data: any, isLoading: boolean, error: any } = useSWR(
        `api/users/templates/${templateID}/base-accounts`,
        fetcher
    );

    // prevents self-mappings
    const filtered_coa_options: Option[] = coaOptions ? coaOptions.filter(
        (option) => option.value !== sessionStorage.getItem('templateBaseCOA')
    ) : []

    async function updateRow(id: number, data: MappingRecord, tableType: string) {
        const res = accounts.find((option: Account) => (option.account === data.translated_account))
        res ? data.translated_coa_id = res.id : data.translated_coa_id = -1;

        // user re-selects 'Unassigned'
        if (data.translated_coa_id === -1) {
            // make copy and delete index
            if (translations.has(data.base_coa_id)) {
                const deepCopy = structuredClone(translations);
                const w = deepCopy.delete(data.base_coa_id)
                setTranslations(deepCopy)
                return
            }
        }

        setTranslations(prevMap => new Map([...prevMap.entries(), [data.base_coa_id, data]]))
    }

    async function onSubmit(formValues: z.infer<typeof formSchema>) {
        setError(null)

        if (translations.size < 1) {
            setError({ message: 'You have not created any translations' })
            return
        }

        const mappingInfo = {
            mappingName: formValues.mapping_name,
            templateID: Number(templateID),
            translationCOAGroupID: formValues.coa_group_id,
            translations: [...translations.values()]
        }

        // zod validation + backend communication
        const res = await createMapping(mappingInfo)

        if (res.error) {
            setError({ message: res.error })
            return
        }

        toast('Successfully created mapping!')
        router.push('/dashboard')
    }

    return (
        <div className="grid gap-4">
            <Card className="w-full">
                <CardHeader>
                    <CardTitle>Create a Mapping</CardTitle>
                    <CardDescription>
                        Modify the table below to create mappings between
                        this template&apos;s chart of accounts and another one.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form id="create-mapping-form" onSubmit={form.handleSubmit(onSubmit)}>
                        <FieldGroup>
                            <Controller
                                name="mapping_name"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="mapping-name">Mapping Name</FieldLabel>
                                        <Input
                                            {...field}
                                            id="mapping-name"
                                            aria-invalid={fieldState.invalid}
                                        />
                                        {fieldState.invalid && (
                                            <FieldError errors={[fieldState.error]} />
                                        )}
                                    </Field>
                                )}
                            />
                        </FieldGroup>
                        <OptionSelect
                            selectName="coa_group_id"
                            selectTitle="Chart of Accounts (COA)"
                            placeholder="COA"
                            options={filtered_coa_options}
                            formControl={form.control}
                            disabled={isCOAOptionsLoading}
                        />
                    </form>
                </CardContent>
                <CardFooter>
                    <Field>
                        {/* {err && <FieldError errors={err} />} */}
                        <Button
                            type="submit"
                            form="create-mapping-form"
                        >
                            Submit
                        </Button>
                    </Field>
                </CardFooter>
            </Card>
            {
                data &&
                accounts &&
                <Table
                    initialData={data}
                    accountOptions={[...accounts, { id: -1, account: 'Unassigned' }]}
                    tableType="mapping"
                    updateRow={updateRow}
                />
            }
        </div>
    )
}