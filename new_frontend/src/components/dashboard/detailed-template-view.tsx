import { useRouter } from "next/navigation"
import { Button } from "../ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog"
import useSWR from "swr"
import { fetcher } from "@/lib/actions"

interface DetailedTemplateViewProps {
    templateID: number
}

export default function DetailedTemplateView({ templateID }: DetailedTemplateViewProps) {
    const router = useRouter()

    const { data, isLoading, error }: { data: any, isLoading: boolean, error: any } = useSWR(
        `api/users/templates/${templateID}/mappings`,
        fetcher
    )

    return (
        <>
            <Dialog>
                <DialogTrigger asChild>
                    <Button disabled={isLoading} className="w-60px" variant="outline">Details</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Template Details</DialogTitle>
                        <DialogDescription>
                            Review aspects of this template
                        </DialogDescription>
                    </DialogHeader>
                    {isLoading ?
                        <p>Loading...</p> :
                        data.length > 0 ? data.map((mapping: { id: number, name: string, coa_group_id: number }) => (
                            <Button
                                key={mapping.id}
                                onClick={() => {
                                    sessionStorage.setItem('mappingCOAGroup', mapping.coa_group_id.toString())
                                    sessionStorage.setItem('mappingName', mapping.name)
                                    router.push(`dashboard/mappings/${mapping.id}`)
                                }}
                            >
                                Edit &apos;{mapping.name}&apos; Mapping
                            </Button>
                        )) : <p>No mappings</p>
                    }
                    {error && <p>Encountered an error when loading template details.</p>}
                </DialogContent>
            </Dialog>
        </>
    )
}