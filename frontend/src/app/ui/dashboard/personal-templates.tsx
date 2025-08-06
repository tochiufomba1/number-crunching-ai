'use client'
import { User } from "@/app/lib/definitions"
import { useTemplate } from "@/app/lib/useTemplate";
import Button from "../components/button/button";
import { mutate } from "swr";
import { useState } from "react";
import Modal from "../components/modal/Modal";
// import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';
// import styles from "./ui_dashboard.module.css";
import TemplateSettings from "../components/template-settings";


export default function PersonalTemplateForm({ user }: { user: User }) {
    const { templates, isLoading, isError } = useTemplate(user.id)
    const [isOpen, setIsOpen] = useState<boolean>(false);

    const removeTemplate = async (templateID: number) => {
        const request = await fetch(`/api/data/users/templates/${templateID}/status`, { method: 'DELETE' })
        //const result = await request.json()
        if (request.ok) {
            mutate(`/api/data/users/${user.id}/templates`)
        }

        // Toast for unsucessful deletes
    }

    if (isLoading) {
        return <p>Loading your templates...</p>
    }

    if (isError) {
        return <p>Failed to fetch your data...</p>
    }

    return (
        <>
            {isOpen &&
                <Modal
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    hasCloseBtn={true}>
                    <div></div>
                </Modal>
            }

            <div style={{ overflowY: 'auto', maxHeight: '33vh' }}>
                {Object.keys(templates).length > 0 ? <table style={{ tableLayout: 'fixed', width: '100%' }}>
                    <tbody>
                        {templates.map((template, index) => (
                            <tr key={index}>
                                <td style={{ width: '100%' }}>
                                    <TemplateSettings userID={Number(user.id)} template={template} />
                                    {/* <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                                        <h3 style={{ color: 'black', margin: 0 }}>{template.title}</h3>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <Button>Publish</Button>
                                            <button style={{ 'backgroundColor': 'red' }} onClick={() => removeTemplate(template.id)}>Hide</button>
                                            <button onClick={() => setIsOpen(true)}><EllipsisVerticalIcon className={styles.linkIcon}/></button>
                                        </div>
                                    </div> */}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table> : <div>No available templates</div>}
            </div>
        </>
    )
}
