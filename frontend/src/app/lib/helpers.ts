import { redirect } from "next/navigation";
import z from "zod";
import { success } from "zod/v4";

// https://blog.devgenius.io/async-operations-with-zod-refine-and-superrefine-methods-2b24dafc1d84
export const checkUsernameAvailability = async (username: string): Promise<boolean> => {
    const res = await fetch(`${process.env.EXTERNAL_API_BASE_URL}/api/users/usernames/${username}`)
    const data = await res.json();

    console.log(data.available)
    return data.available;
};

export const validateEmail = async (email: string): Promise<boolean> => {
    return fetch(`${process.env.EXTERNAL_API_BASE_URL}/api/users/emails/${email}`)
        .then(res => res.json())
        .then(data => data.valid);
};

export const registerHelper = async (formData: FormData) => {
    const registrationSchema = z.object({
        email: z.string().email("Provide a valid email"),
        username: z.string().min(1, "Create a username"),
        password: z.string().min(6, "Password must be at least 6 characters"),
        confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
    }).superRefine(async (data, ctx) => {
        const { email, username, password, confirmPassword } = data;

        // Confirm password check
        if (confirmPassword !== password) {
            ctx.addIssue({
                code: "custom",
                message: "The passwords did not match",
                path: ['confirmPassword']
            });
        }

        // Email validation
        const isEmailValid = await validateEmail(email);
        if (!isEmailValid) {
            ctx.addIssue({
                code: "custom",
                message: "Email is not valid",
                path: ["email"],
            });
        }

        // Username validation
        const isUsernameAvailable = await checkUsernameAvailability(username);
        if (!isUsernameAvailable) {
            ctx.addIssue({
                code: "custom",
                path: ['username'],
                message: 'Username is not available',
            });
        }
    });

    const parsedData = await registrationSchema.safeParseAsync({
        email: formData.get("email"),
        username: formData.get("username"),
        password: formData.get("password"),
        confirmPassword: formData.get("confirmPassword"),
    });

    if (!parsedData.success) {
        return {
            success: false,
            message: "Registration failed"
        }

        //throw new Error("Failed to parse data")
        //return parsedData.error.format().toString();
    }

    const object = {};
    formData.forEach((value, key) => object[key] = value);
    const headers: Record<string, string> = {
        'Content-Type': 'application/json'
    };

    const req = await fetch(`${process.env.EXTERNAL_API_BASE_URL}/api/users`, { method: 'POST', headers: headers, body: JSON.stringify(object) })

    if (!req.ok) {
        return {
            success: false,
            message: "Registration failed"
        }
    }

    //redirect('/login');
}