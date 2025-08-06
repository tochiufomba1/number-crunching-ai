'use client'
import {
    AtSymbolIcon,
    KeyIcon,
    ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { ArrowRightIcon } from '@heroicons/react/20/solid';
import Button from '../components/button/button';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from "zod";

export default function LoginFormAlt() {
    const router = useRouter()
    const [isPending, setIsPending] = useState<boolean>(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const loginSchema = z.object({
        email: z.string().email("Provide valid email address"),
        password: z.string().min(6, "Provide password"),
    });

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsPending(true);

        const formData = new FormData(event.currentTarget);
        console.log(formData.get("email"))
        console.log(formData.get("password"))

        const parsedData = loginSchema.safeParse({
            email: formData.get("email"),
            password: formData.get("password"),
        });

        if (!parsedData.success) {
            setErrorMessage("Validation failed. Check the required fields.")
            console.error(parsedData.error.format());
            return
        }

        try {
            // Encode email:password using Base64.
            const credentials = btoa(`${formData.get("email")}:${formData.get("password")}`);

            // Send a fetch request with the Basic Auth header.
            const response = await fetch('http://127.0.0.1:5000/api/tokens', {
                method: 'POST',
                headers: {
                    'Authorization': 'Basic ' + credentials,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Login failed');
            }

            // Parse the JSON response.
            const data = await response.json();

            // Store the authentication data in localStorage.
            // Alternatively, you could use sessionStorage if you prefer!
            localStorage.setItem('authData', JSON.stringify(data));

            // Optionally redirect or update global state here.
            router.push('../dashboard')

        } catch (err) {
            setErrorMessage((err as Error).message);
        }
    };

    return (
        <form onSubmit={onSubmit} style={{marginTop: "0.75rem"}}>
            <div style={{ "paddingLeft": "1.5rem", "paddingRight": "1.5rem", "paddingBottom": "1rem", "paddingTop": "2rem", "flex": "1 1 0%", "borderRadius": "0.5rem", "backgroundColor": "#F9FAFB" }}>
                <h1 style={{ "marginBottom": "0.75rem", "fontSize": "1.5rem", "lineHeight": "2rem", "color": "#111827" }}>
                    Please log in to continue.
                </h1>
                <div style={{ "width": "100%" }}>
                    <div>
                        <label
                            style={{ "display": "block", "marginBottom": "0.75rem", "marginTop": "1.25rem", "fontSize": "0.75rem", "lineHeight": "1rem", "fontWeight": 500, "color": "#111827" }}
                            htmlFor="email"
                        >
                            Email
                        </label>
                        <div style={{ "position": "relative" }}>
                            <input
                                style={{ "display": "block", "paddingLeft": "2.5rem", "borderRadius": "0.375rem", "borderWidth": "1px", "borderColor": "#E5E7EB", "outlineWidth": "2px", "width": "100%", "fontSize": "0.875rem", "lineHeight": "1.25rem" }}
                                id="email"
                                type="email"
                                name="email"
                                placeholder="Enter your email address"
                                required
                            />
                            <AtSymbolIcon style={{ "position": "absolute", "left": "0.75rem", "top": "50%", "color": "#6B7280", "pointerEvents": "none", "height": "18px", "width": "18px" }} />
                        </div>
                    </div>
                    <div style={{ "marginTop": "1rem" }}>
                        <label
                            style={{ "display": "block", "marginBottom": "0.75rem", "marginTop": "1.25rem", "fontSize": "0.75rem", "lineHeight": "1rem", "fontWeight": 500, "color": "#111827" }}
                            htmlFor="password"
                        >
                            Password
                        </label>
                        <div style={{ "position": "relative" }}>
                            <input
                                style={{ "display": "block", "paddingLeft": "2.5rem", "borderRadius": "0.375rem", "borderWidth": "1px", "borderColor": "#E5E7EB", "outlineWidth": "2px", "width": "100%", "fontSize": "0.875rem", "lineHeight": "1.25rem" }}
                                id="password"
                                type="password"
                                name="password"
                                placeholder="Enter password"
                                required
                                minLength={6}
                            />
                            <KeyIcon style={{ "position": "absolute", "left": "0.75rem", "top": "50%", "color": "#6B7280", "pointerEvents": "none", "height": "18px", "width": "18px" }} />
                        </div>
                    </div>
                </div>
                <Button style={{ "marginTop": "1rem", "width": "100%" }} aria-disabled={isPending}>
                    Log in <ArrowRightIcon style={{ "width": "1.25rem", "height": "1.25rem", "color": "#F9FAFB" }} />
                </Button>
                <div
                    style={{ "display": "flex", "marginLeft": "0.25rem", "alignItems": "flex-end", "height": "2rem" }}
                    aria-live="polite"
                    aria-atomic="true"
                >
                    {errorMessage && (
                        <>
                            <ExclamationCircleIcon style={{ "width": "1.25rem", "height": "1.25rem", "color": "#EF4444" }} />
                            <p style={{ "fontSize": "0.875rem", "lineHeight": "1.25rem", "color": "#EF4444" }}>{errorMessage}</p>
                        </>
                    )}
                </div>
            </div>
        </form>
    )
}