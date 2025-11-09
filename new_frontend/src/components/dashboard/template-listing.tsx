"use client"
import { useTemplate } from "@/lib/useTemplate";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Template } from "@/lib/definitions";
import { Item, ItemActions, ItemContent, ItemTitle } from "../ui/item";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";

export default function TemplateListing({ userID }: { userID: string }) {
    const { templates, isLoading, isError } = useTemplate(userID)

    if (isError) return <div>Failed to load templates</div>

    return (
        <>
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle>My Templates</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[300px] w-[340px] rounded-md border p-4">
                        {!isLoading ? templates.length > 0 ? templates.map((template: Template) => (
                            <Item key={template.id}>
                                <ItemContent>
                                    <ItemTitle>{template.title}</ItemTitle>
                                </ItemContent>
                                <ItemActions>
                                    <Button variant="outline" size="sm">
                                        Edit
                                    </Button>
                                    <Button variant="outline" size="sm">
                                        Hide
                                    </Button>
                                </ItemActions>
                            </Item>
                        )) : <p>You have not created templates yet</p>
                    :<p>Loading...</p>}
                    </ScrollArea>
                </CardContent>
            </Card >
        </>
    )
}