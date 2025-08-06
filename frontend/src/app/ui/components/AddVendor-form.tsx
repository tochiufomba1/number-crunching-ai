'use client'
import React, { FormEvent, useState } from "react"
import { z } from "zod";

export default function AddVendorForm({ value }) {
    const [widelyKnown, setWidelyKnown] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const vendorSchema = z.object({
        vendor: z.string().min(1, "Provide a vendor name"),
        // checkbox: z.boolean(),
    });

    const handleChange = () => {
        setWidelyKnown((widelyKnown) => !widelyKnown)
    }

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget);

        if (!formData.has('public')) {
            formData.append('public', 'off');
        }

        try {
            // Validate using Zod
            const parsedData = vendorSchema.safeParse({
                vendor: formData.get("vendor"),
                // checkbox: formData.get("public"),
            });

            if (!parsedData.success) {
                setError("Validation failed. Check the required fields.")
                console.log(parsedData.error.format());
                return
            }

            const response = await fetch(`/api/data/vendors`, {
                method: 'POST',
                credentials: 'include',
                body: formData,
            });

            //const data = await response.json()

            if (!response.ok) {
                setError("There was a problem on our end. Please try again...")
                return
            }

            //closeForm()
        } catch (error: unknown) {
            setError((error as Error).message)
            console.error(error)
        }
    }

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap:'10px' }}>
            <h1>Add New Vendor</h1>

            <div>
                <label htmlFor="description" title={value}>Transction: </label>
                <input style={{ width: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} type="text" id="description" name="description" value={value} readOnly />
            </div>
            <div>
                <label htmlFor="vendor">Vendor: </label>
                <input type="text" name="vendor" id="vendor" placeholder="Enter vendor here" />
            </div>
            <div>
                <input type="checkbox" id="public" name="public" onChange={handleChange} checked={widelyKnown} />
                <label htmlFor="public">Widely known vendor (e.g. Walmart)</label>
            </div>

            <button>Submit</button>
            {error && <p>{error}</p>}
        </form>
    )
}