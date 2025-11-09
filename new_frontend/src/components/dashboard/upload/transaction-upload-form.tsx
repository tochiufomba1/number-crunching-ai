"use client"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../../ui/card";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Button } from "../../ui/button";
import { useTemplate } from "@/lib/useTemplate";
import { Template } from "@/lib/definitions";
import { useActionState } from "react";
import { addToCart, uploadTransactions } from "@/lib/actions";


export default function TransactionUploadForm({ userID }: { userID: string }) {
    const { templates, isError, isLoading } = useTemplate(userID)
    const [message, formAction, isPending] = useActionState(uploadTransactions, null)

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
                        {message ? <p>{message}</p> : <></>}
                        <Button type="submit" className="w-full" disabled={isPending}>Submit</Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}