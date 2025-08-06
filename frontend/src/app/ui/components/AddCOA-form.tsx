'use client'
import { addCOA } from "@/app/lib/actions";
import { stat } from "fs";
import React, { useActionState } from "react"

//Source: https://youtu.be/N_sUsq_y10U?si=XPapFcHR-PX2c1Ot

export default function AddCOAForm() {
    const [state, formAction, pending] = useActionState(addCOA, undefined)

    return (
        <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h1>Add New Chart of Accounts</h1>

            <div>
                <label htmlFor="name">Name: </label>
                <input type="text" name="name" id="name" placeholder="Enter name for chart of accounts here" />
                {state?.errors?.name && <p style={{ color: 'red' }}>{state.errors.name}</p>}
            </div>

            <label htmlFor="coa">Upload file containing chart of accounts here</label>
            <input type="file" id="coa" name="coa" />
            {state?.errors?.file && <p style={{ color: 'red' }}>{state.errors.file}</p>}


            <button disabled={pending}>{pending ? 'Submitting...' : 'Submit'}</button>
            {state?.submissionError && <p style={{ color: 'red' }}>{state.submissionError}</p>}
        </form>
    )
}