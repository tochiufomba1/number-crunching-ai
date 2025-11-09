"use client"

import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { AddCOADialog } from "./add-coa-form";
import { FormEvent, useState } from "react";
import { useTemplate } from "@/lib/useTemplate";
import { Template } from "@/lib/definitions";
import { templates_mock } from "@/lib/example-data";
import { auth } from "../../../auth";
import { Separator } from "../ui/separator";

export default function TemplateCreationForm({ userID }: { userID: string }) {
    // const { templates, isLoading, isError } = useTemplate(userID)

    const handleSubmit = async (formData: FormData) => {
        // 'use server'
        // const session = await auth()
        // const request = await fetch(`${process.env.EXTERNAL_API}/api/users/${userID}/templates`,
        //     {
        //         method: "POST",
        //         headers: {
        //             "Authorization": `Bearer ${session?.user.access_token}`
        //         },
        //         body: formData
        //     }
        // )

        // if(!request.ok){
        //     return
        // }
    }

    return (
        <Card className="w-full max-w-sm">
            <CardHeader>
                <CardTitle>Create New Template</CardTitle>
            </CardHeader>
            <CardContent>
                <form action={handleSubmit}>
                    <div className="flex flex-col gap-6">
                        <div className="grid gap-2">
                            <Label htmlFor="template-name">Template Name</Label>
                            <Input name="template-name" required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="template-name">Chart of Accounts (COA)</Label>
                            <Select>
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
                                <Label htmlFor="transactions">Transaction History</Label>
                                <Input id="transactions" type="file" />
                            </div>
                        </div>
                    </div>
                    <Button type="submit" className="w-full mt-2">Submit</Button>
                </form>
                <Separator className="my-4" />
                 <AddCOADialog />
            </CardContent>
        </Card>
    )
}