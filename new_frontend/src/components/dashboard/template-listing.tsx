'use client'
import { useTemplate } from "@/hooks/useTemplate";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Template } from "@/lib/definitions";
import { Item, ItemActions, ItemContent, ItemTitle } from "../ui/item";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { useRouter } from "next/navigation";
import DetailedTemplateView from "./detailed-template-view";

export default function TemplateListing({ userID }: { userID: string }) {
    const { templates, isLoading, isError } = useTemplate(userID)
    const router = useRouter()

    if (isError) return <div>Failed to load templates</div>

    return (
        <>
            <Card className="w-full">
                <CardHeader>
                    <CardTitle>My Templates</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[300px] w-[340px] rounded-md border p-4">
                        {!isLoading ? templates ? templates.items.map((template: Template) => (
                            <Item key={template.id}>
                                <ItemContent>
                                    <ItemTitle>{template.title}</ItemTitle>
                                </ItemContent>
                                <ItemActions>
                                    <DetailedTemplateView templateID={template.id} />
                                    <Button variant="outline" size="sm">
                                        Hide
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            sessionStorage.setItem('templateBaseCOA', template.base_coa_group.toString())
                                            router.push(`/dashboard/templates/${template.id}/mappings`)
                                        }}
                                    >
                                        Create Mapping
                                    </Button>
                                </ItemActions>
                            </Item>
                        )) : <p>You have not created templates yet</p>
                            : <p>Loading...</p>}
                    </ScrollArea>
                </CardContent>
            </Card >
        </>
    )
}