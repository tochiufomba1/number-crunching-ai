"use client"

import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { AddCOADialog } from "./add-coa-form";
import { useActionState } from "react";
import { Separator } from "../ui/separator";
import { createTemplate } from "@/lib/actions";

export default function TemplateCreationForm({ userID }: { userID: string }) {
    // const { templates, isLoading, isError } = useTemplate(userID)
    const [message, formAction, isPending] = useActionState(createTemplate, null)

    return (
        <Card className="w-full max-w-sm">
            <CardHeader>
                <CardTitle>Create New Template</CardTitle>
            </CardHeader>
            <CardContent>
                <form action={formAction}>
                    <div className="flex flex-col gap-6">
                        <div className="grid gap-2">
                            <Label htmlFor="template_title">Template Name</Label>
                            <Input name="template_title" required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="template_coa_group_id">Chart of Accounts (COA)</Label>
                            <Select name="template_coa_group_id">
                                <SelectTrigger className="w-full max-w-sm">
                                    <SelectValue placeholder="Select a chart of accounts" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="-1">Generate COA from transaction history</SelectItem>
                                    <SelectItem value="0">Generic</SelectItem>
                                    {/* map prev coas here */}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <div className="grid w-full max-w-sm items-center gap-3">
                                <Label htmlFor="transactions_file">Transaction History</Label>
                                <Input id="transactions_file" name="transactions_file" type="file" />
                            </div>
                        </div>
                    </div>
                    {message ? <p>{message}</p> : <></>}
                    <Button type="submit" className="w-full mt-2" disabled={isPending}>Submit</Button>
                </form>
                <Separator className="my-4" />
                 <AddCOADialog />
            </CardContent>
        </Card>
    )
}