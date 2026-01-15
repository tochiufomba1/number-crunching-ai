'use client'
import { Account, MappingRecord } from "@/lib/definitions";
import useCOAAccounts from "@/hooks/useCOAAccounts";
import useSWR, { mutate } from "swr";
import Table from "../table";
import { fetcher, updateMapping } from "@/lib/actions";
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { toast } from "sonner";
import { useSessionStorage } from "@/hooks/useSessionStorage";

interface UpdateMappingProps {
    userID: string
    mappingID: number
}

export default function UpdateMapping({ userID, mappingID }: UpdateMappingProps) {
    const [mappingCOAGroup, _setMappingCOAGroup] = useSessionStorage("mappingCOAGroup")
    const [mappingName, _setMappingName] = useSessionStorage("mappingName")

    const { accounts, isAccountsLoading, isAccountsError } = useCOAAccounts(userID, mappingCOAGroup)
    const { data, isLoading, error }: { data: any, isLoading: boolean, error: any } = useSWR(
        `api/users/${userID}/mappings/${mappingID}/translations`,
        fetcher
    )

    if (error) return <div>Failed to load</div>;
    if (!data) return <div>Loading...</div>;

    async function updateRow(id: number, data: MappingRecord, tableType: string) {
        const account = accounts.find((option: Account) => (option.account === data.translated_account))
        account ? data.translated_coa_id = account.id : data.translated_coa_id = -1;

        const result = await updateMapping(mappingID, data)
        mutate(`api/users/${userID}/mappings/${mappingID}/translations`)

        toast(result.message)
    }

    return (
        <div className="grid gap-4">
            <Card className="w-full">
                <CardHeader>
                    <CardTitle>{mappingName}</CardTitle>
                    <CardDescription>
                        Modify the table below to update this mapping.
                    </CardDescription>
                </CardHeader>
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