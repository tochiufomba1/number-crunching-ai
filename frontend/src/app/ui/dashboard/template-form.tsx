'use client'
import { z } from "zod";
import React, { FormEvent, FormEventHandler, useEffect, useState } from "react";
import { useCOAGroup } from "@/app/lib/useCOAGroup";
import { mutate } from "swr";
import { User } from "@/app/lib/definitions";
import AddCOAForm from "../components/AddCOA-form";
import Modal from "../components/modal/Modal";

export default function TemplateForm({ user }: { user: User }) {
    const [submissionLoading, setsubmissionLoading] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)
    const [pollingURL, setPollingURL] = useState<string | null>(null);

    const templateSchema = z.object({
        title: z.string().min(1, "Title is required"),
        coa_group_id: z.string().min(1, "Select a chart of accounts"),
        file: z.instanceof(File),
    });

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const formData = new FormData(event.currentTarget)
        setsubmissionLoading(true)
        setError(null) // suppose user failed to submit once before

        try {
            // Validate using Zod
            const parsedData = templateSchema.safeParse({
                title: formData.get("title"),
                coa_group_id: formData.get("coa_group_id"),
                file: formData.get("file"),
            });

            if (!parsedData.success) {
                setError("Validation failed. Check the required fields.")
                console.error(parsedData.error.format());
                return
            }

            const response = await fetch(`/api/data/users/templates`, {
                method: 'POST',
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

            setPollingURL(`/api/data/users/templates/${data['result_id']}`)
        } catch (error) {
            setError((error as Error).message)
            console.error(error)
        } finally {
            setsubmissionLoading(false)
        }
    }

    useEffect(() => {
        if (pollingURL && user?.id) {
            let intervalID: NodeJS.Timeout;

            // let attempts = 0;
            let delay = 3000; // Start with 2 seconds

            const pollTaskStatus = async () => {
                try {
                    const response = await fetch(pollingURL);

                    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

                    if (response.status === 200) {
                        clearInterval(intervalID);
                        setPollingURL(null)
                        setError(null)
                        mutate(`/api/data/users/${user.id}/templates`)  // OLD: `/api/users/${user.id}/templates`
                        return
                    }

                } catch (err) {
                    console.error('Polling error:', err);
                    setError('Something went wrong. Retrying...');
                }

                // Exponential backoff to prevent excessive polling
                // attempts++;
                delay = Math.min(15000, delay * 1.5); // Cap at 15s
            };

            const startPolling = () => {
                pollTaskStatus();
                intervalID = setInterval(pollTaskStatus, delay);
            };

            startPolling();
            return () => clearInterval(intervalID);
        }
    }, [pollingURL, user?.id]);

    return (
        <div style={{ maxHeight: '33vh' }}>
            {pollingURL
                ? <div>Processing data...</div>
                : <Form user={user} onSubmit={onSubmit} error={error} submissionState={submissionLoading} />
            }
        </div>
    )
}

function Form({ user, onSubmit, error, submissionState }:
    { user: User, onSubmit: FormEventHandler, error: string | null, submissionState: boolean }) {
    const { groups, isLoading, isError } = useCOAGroup(user.id)
    const [isOpen, setIsOpen] = useState<boolean>(false);

    const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        if(event.target.value === 'openModal'){
            setIsOpen(true)
            event.target.value = ''
        }
    }

    if (isError) {
        return <p>Failed to fetch your data...</p>
    }

    if (isLoading === true) {
        return <p>Loading...</p>;
    }

    return (
        <>
            {isOpen &&
                <Modal
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    hasCloseBtn={true}>
                    <AddCOAForm />
                </Modal>
            }

            <form onSubmit={onSubmit} style={{ 'display': "flex", flexDirection: "column", gap: '8px' }}>
                <div style={{ 'display': "flex", flexDirection: "column" }}>
                    <label style={{ color: 'black' }} htmlFor="title">Template Title</label>
                    <input name="title" id="title" type="text"></input>
                </div>
                <div style={{ 'display': "flex", flexDirection: "column" }}>
                    <label style={{ color: 'black' }} htmlFor="coa_options">Select Chart of Accounts</label>
                    <select name="coa_group_id" id="coa_group_id" defaultValue="" onChange={handleChange}>
                        <option value="" disabled>
                            Select a chart of accounts
                        </option>
                        {groups.map((option, index) => (
                            <option key={index} value={option.group_id}>{option.group_name}</option>
                        ))}
                        <option key={Object.keys(groups).length} value="openModal">Add a Chart of Accounts</option>

                    </select>
                </div>
                <div style={{ 'display': "flex", flexDirection: "column" }}>
                    <label style={{ color: 'black' }} htmlFor="file">Upload Transaction History</label>
                    <input type="file" name="file" id="file" accept=".csv, .xlsx" required />
                </div>
                <button type="submit" disabled={submissionState}>Submit</button>
                {error && <p color="red">{error}</p>}
            </form>
        </>
    )
}