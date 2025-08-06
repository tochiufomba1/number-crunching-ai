'use client'
import React, { FormEvent, FormEventHandler, useState } from 'react';
import { useTemplate } from '@/app/lib/useTemplate';
import { useRouter } from 'next/navigation';
import { z } from "zod";
import { Template, User } from '@/app/lib/definitions';
import Link from 'next/link';
import Button from '../../components/button/button';
import { UserCircleIcon } from '@heroicons/react/24/solid';



export default function Upload({ user }: { user: User }) {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null)
    const { templates, isLoading, isError }: { templates: Template[], isLoading: boolean, isError: Error } = useTemplate(user.id)

    const uploadSchema = z.object({
        template: z.string().min(1, "Select a template"),
        file: z.instanceof(File),
    });

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setError(null);

        try {
            // Validate using Zod
            const parsedData = uploadSchema.safeParse({
                template: formData.get("template"),
                file: formData.get("file"),
            });

            if (!parsedData.success) {
                setError("Validation failed. Check the required fields.")
                console.error(parsedData.error.format());
                return
            }

            const response = await fetch(`/api/data/users/transactions`, {
                method: 'POST',
                credentials: 'include',
                body: formData,
            });

            const data = await response.json()

            if (!response.ok) {
                if (response.status === 500)
                    setError("There was a problem on our end. Please try again...")
                else
                    setError(data['message'])

                return
            }

            const pollingUrl = data['url']

            // Redirect to the loading page with the polling URL //encodeURIComponent(session?.user.id ? session?.user.id : false)
            router.replace(`/dashboard/upload/loading?pollingUrl=${encodeURIComponent(pollingUrl)}&onSuccess=${encodeURIComponent("/dashboard/upload/tables")}`);
        } catch (error: unknown) {
            setError((error as Error).message)
            console.error(error)
        }
    }

    if (isLoading)
        return <div>Loading your data...</div>

    if (isError)
        return <div>Couldn&apos;t fetch your data...</div>

    return (
        <div>
            <Form2 templates={templates} onSubmit={handleSubmit} error={error} />
        </div>
    )
}

// function Form({ user, onSubmit, error }: { user: User, onSubmit: FormEventHandler, error: string | null }) {
//     const { templates, isLoading, isError } = useTemplate(user.id)

//     if (isLoading)
//         return <div>Loading your data...</div>

//     if (isError)
//         return <div>Couldn't fetch your data...</div>

//     return (
//         <div style={{ display: "flex", flexDirection: "column" }}>
//             <div style={{ "display": "flex", "padding": "1rem", "flexDirection": "column", "justifyContent": "space-between", "borderRadius": "0.75rem", "backgroundColor": "#F9FAFB" }}>
//                 <h2 style={{ color: '#101217' }}>Upload Uncategorized Transactions</h2>
//                 <div style={{ "paddingLeft": "1.5rem", "paddingRight": "1.5rem", "backgroundColor": "#ffffff", "color": 'black' }}>
//                     <form onSubmit={onSubmit} encType="multipart/form-data" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
//                         <label htmlFor="file">Submit file containing transactions (csv, xlsx)</label>
//                         <input type="file" name="file" id="file" accept=".csv, .xlsx" required />
//                         <label htmlFor="template">Select Template</label>
//                         <select name="template" id="template">
//                             {templates.map((item, index) => (
//                                 <option key={index} value={item.id}>{item.title}</option>
//                             ))}
//                         </select>

//                         <button type="submit">Submit</button>
//                         {error && <p color='red'>{error}</p>}
//                     </form>
//                 </div>
//             </div>
//         </div>
//     )
// }

function Form2({ templates, onSubmit, error }: { templates: Template[], onSubmit: FormEventHandler, error: string | null }) {
    return (
        <form onSubmit={onSubmit} encType="multipart/form-data">
            <h2 style={{ color: '#101217' }}>Upload Uncategorized Transactions</h2>
            <div style={{ "padding": "1rem", "borderRadius": "0.375rem", "backgroundColor": "#F9FAFB" }}> {/* "@media (min-width: 768px)":{"padding":"1.5rem" */}
                {/* Template */}
                <div style={{ "marginBottom": "1rem" }}>
                    <label htmlFor="customer" style={{ color: '#101217', "display": "block", "fontSize": "0.875rem", "lineHeight": "1.25rem" }}>
                        Choose Template
                    </label>
                    <div style={{ "position": "relative" }}>
                        <select
                            id="template"
                            name="template"
                            style={{ "display": "block", "paddingTop": "0.5rem", "paddingBottom": "0.5rem", "paddingLeft": "2.5rem", "borderRadius": "0.375rem", "borderWidth": "1px", "borderColor": "#E5E7EB", "outlineWidth": "2px", "width": "100%", "fontSize": "0.875rem", "lineHeight": "1.25rem", "cursor": "pointer" }}
                            defaultValue=""
                        >
                            <option value="" disabled>
                                Select a template
                            </option>
                            {templates.map((item, index) => (
                                <option key={index} value={item.id}>{item.title}</option>
                            ))}
                        </select>
                        <UserCircleIcon style={{ "position": "absolute", "left": "0.75rem", "top": "50%", "color": "#6B7280", "pointerEvents": "none", "height": "18px", "width": "18px" }} />
                    </div>
                </div>

                {/* File */}
                <div style={{ "position": "relative" }}>
                    <label htmlFor="amount" style={{ color: '#101217', "display": "block", "fontSize": "0.875rem", "lineHeight": "1.25rem" }}>
                        Submit file containing transactions (csv, xlsx)
                    </label>
                    <div style={{ "position": "relative", "marginTop": "0.5rem", "borderRadius": "0.375rem" }}>
                        <div style={{ "position": "relative", color: '#101217' }}>
                            <input type="file" name="file" id="file" accept=".csv, .xlsx" required />
                        </div>
                    </div>
                </div>
            </div>
            <div style={{ "display": "flex", "marginTop": "1.5rem", "gap": "1rem", "justifyContent": "flex-end" }}>
                <Link
                    href="/dashboard"
                    style={{ "paddingLeft": "1rem", "paddingRight": "1rem", "alignItems": "center", "borderRadius": "0.5rem", "height": "2.5rem", "fontSize": "0.875rem", "lineHeight": "1.25rem", "fontWeight": 500, "color": "#4B5563", "backgroundColor": "#F3F4F6", "transitionProperty": "color, background-color, border-color, text-decoration-color, fill, stroke", "transitionTimingFunction": "cubic-bezier(0.4, 0, 0.2, 1)", "transitionDuration": "300ms" }}
                >
                    Cancel
                </Link>
                <Button type="submit">Submit</Button>
            </div>
            {error && <p>{error}</p>}
        </form>
    )
}