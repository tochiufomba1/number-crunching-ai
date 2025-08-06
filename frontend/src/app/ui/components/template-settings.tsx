import { Shared, Template, TemplateRecipient } from "@/app/lib/definitions";
import Button from "./button/button";
import React, { useState } from "react";
import { mutate } from "swr";
import Modal from "./modal/Modal";
import { EllipsisVerticalIcon } from "@heroicons/react/24/outline";
import styles from "../../dashboard/dashboard.module.css";
import Box from '@mui/material/Box';
// import Slider from '@mui/material/Slider';
import TextField from '@mui/material/TextField';
import { z } from "zod";

function TemplateSettingForm({ template }: { template: Template }) {
    const [predictionConfidence, setPredictionConfidence] = useState<number>(0.7);
    const [accessLevel, setAccessLevel] = useState<string>('user');
    const [email, setEmail] = useState<string>('')
    const [shared, setShared] = useState<Shared[]>([])
    const [error, setError] = useState<string>('')

    template['shared'] = [] //Placeholder, remove later

    function valuetext(value: number) {
        return `${value}`;
    }

    function addSharedUser() {
        // validate email and accessLevel
        const result = TemplateRecipient.safeParse({
            email: email,
            accessLevel: accessLevel
        });
        if (!result.success) {
            setError(z.prettifyError(result.error))
            return
        }

        // TODO: check if user attempts to add self to recipient list

        for (let i = 0; i < shared.length; i++) {
            if (email === shared[i].email) {
                setError(`${email} is already in list of proposed recipients`)
                return
            }
        }

        const recipient: Shared = { email: email, access_level: accessLevel}
        setShared(prevItems => [...prevItems, recipient])
        setEmail('')
        setAccessLevel('user')
    }

    const handleSliderChange = (event: Event, newValue: number) => {
        console.log(newValue)
        setPredictionConfidence(newValue);
    };

    const handleEmailChange = (event) => {
        setEmail(event.target.value);
    }

    const handleSelectChange = (event) => {
        setAccessLevel(event.target.value as string);
    };

    const confidenceLevelSubmit = async (event: React.FormEvent) => {
        event.preventDefault()
        const response = await fetch(`/api/data/users/templates/${template.id}/confidence`, { method: 'PUT', body: JSON.stringify({ "confidence": predictionConfidence }) })

        if (!response.ok) {
            const data = await response.json()
            setError(data['message'])
            return
        }

        // update the page to show
    }

    const shareTemplateSubmit = async (event: React.FormEvent) => {
        event.preventDefault()

        if (shared.length == 0) {
            setError('No proposed recipients to add')
            return
        }

        const headers = new Headers();
        headers.append("Content-Type", "application/json");

        const response = await fetch(`/api/data/users/templates/${template.id}/permissions`,
            {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ "recipients": shared })
            }
        )

        if (!response.ok) {
            // TODO: Consider the case when one or more proposed recipients fail? How should UI change?
            const data = await response.json()
            setError(data['message'])
            return
        }

        setShared([])
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#e0dfea' }}>
            <h1 style={{ color: 'black' }}>{template.title}</h1>
            {/* <form onSubmit={confidenceLevelSubmit}>
                <div style={{ display: 'flex', gap: '30px', backgroundColor: '#e0dfea' }}>

                    <h3 style={{ color: 'black' }}>Confidence Level:</h3>
                    <Box sx={{ width: 300 }}>
                        <Slider
                            aria-label="Template Prediction Confidence"
                            defaultValue={0.7}
                            getAriaValueText={valuetext}
                            valueLabelDisplay="auto"
                            shiftStep={0.3}
                            step={0.1}
                            marks={true}
                            min={0.1}
                            max={1.0}
                            value={predictionConfidence}
                            onChange={handleSliderChange}
                        />
                    </Box>
                    <button>Submit</button>
                </div>
            </form> */}

            <div style={{ backgroundColor: '#F9FAFB' }}>
                <h3 style={{ color: 'black' }}>Share Template</h3>
                <hr />
                <Box
                    component="form"
                    sx={{ width: '100' }}
                    noValidate
                    autoComplete="off"
                    onSubmit={shareTemplateSubmit}
                >
                    <div style={{ display: 'flex', gap: '30px' }}>
                        <TextField id="standard-basic" label="Recipient's Email" variant="standard" value={email} onChange={handleEmailChange} />
                        <select onChange={handleSelectChange}>
                            <option>Maintainer</option>
                            <option>User</option>
                        </select>
                        <button type="button" onClick={addSharedUser}>Add</button>
                    </div>
                    <h4 style={{ color: 'black' }}>Proposed Recipients</h4>
                    {shared.length > 0 ? shared.map((item, index) => (<SharedBox key={index} user={item} remove={() => setShared(shared.filter(s => s.email != item.email))} />)) : <p style={{ color: 'black' }}>No entries</p>}
                    <button type="submit">Submit</button>
                    {error && <p style={{ color: 'red' }}>{error}</p>}
                </Box>
            </div>

            <div style={{ backgroundColor: '#e0dfea' }}>
                <h3 style={{ color: 'black' }}>People with Access to Template</h3>
                <hr />
                {template['shared'].length > 0 ? template['shared'].map((item, index) => (<p key={index}>{item.email}</p>)) : <p>No entries</p>}
            </div>
        </div>
    )
}

export default function TemplateSettings({ userID, template }: { userID: number, template: Template }) {
    const [isOpen, setIsOpen] = useState<boolean>(false);

    const removeTemplate = async (templateID: number) => {
        const request = await fetch(`/api/data/users/templates/${templateID}/status`, { method: 'DELETE' })
        //const result = await request.json()
        if (request.ok) {
            mutate(`/api/data/users/${userID}/templates`)
        }

        // Toast for unsucessful deletes
    }

    return (
        <>
            {isOpen &&
                <Modal
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    hasCloseBtn={true}>
                    <TemplateSettingForm template={template} />
                </Modal>
            }

            <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                <h3 style={{ color: 'black', margin: 0 }}>{template.title}</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button>Publish</Button>
                    <button style={{ 'backgroundColor': 'red' }} onClick={() => removeTemplate(template.id)}>Hide</button>
                    <button onClick={() => setIsOpen(true)}><EllipsisVerticalIcon className={styles.linkIcon} /></button>
                </div>
            </div>
        </>
    )
}

function SharedBox({ user, remove }: { user: Shared, remove: () => void }) {

    return (
        <div style={{ display: 'flex', gap: '10px' }}>
            <p style={{ color: 'black' }}>{user.email}</p>
            <button style={{ color: 'red' }} onClick={remove}>x</button>
            {user.message ? <p>Error: {user.message}</p> : <></>}
        </div>
    )
}