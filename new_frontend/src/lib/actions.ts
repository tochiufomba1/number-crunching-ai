'use server'
import { CreateMappingRequestSchema, LoginSchema, RegisterSchema } from "@/schemas"
import * as z from "zod"
import { auth, signIn } from "../../auth"
import { DEFAULT_LOGIN_REDIRECT } from "../../routes"
import { AuthError } from "next-auth"
import { MappingRecord } from "./definitions"

export async function getCurrentUser() {
    const session = await auth();

    return session?.user
}

export const login = async (values: z.infer<typeof LoginSchema>) => {
    const validatedFields = LoginSchema.safeParse(values)

    if (!validatedFields.success) {
        return { error: "Invalid fields" }
    }

    const { email, password } = validatedFields.data

    try {
        await signIn("credentials", {
            email,
            password,
            redirectTo: DEFAULT_LOGIN_REDIRECT
        })
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case "CredentialsSignin":
                    return { error: "Invalid credentials" }
                default:
                    return { error: "Something went wrong" }
            }
        }

        throw error;
    }
}

export const register = async (values: z.infer<typeof RegisterSchema>) => {
    const validatedFields = RegisterSchema.safeParse(values)

    if (!validatedFields.success) {
        return { error: "Invalid fields" }
    }

    const { name, email, password } = validatedFields.data

    // send fetch request that registers user
    const response = await fetch(`${process.env.EXTERNAL_API}/api/auth/users`,
        {
            method: "POST",
            headers: {
                'Accept': 'application/json',
                "Content-Type": "application/json"
            },
            body: JSON.stringify(
                {
                    name: name,
                    email: email,
                    password: password
                }
            ),
        }
    )

    if (!response.ok) {
        return { error: "Invalid fields" }
    }

    return { success: "Account successfully created! Please log in." }
}

export async function createTemplate(formData: FormData) {
    const user = await getCurrentUser()

    const res = await fetch(`${process.env.EXTERNAL_API}/api/users/${user!.id}/templates`,
        {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${user!.access_token}`
            },
            body: formData
        }
    )

    if (!res.ok)
        return {error: "Error encountered when creating template"}

    const jobID = await res.json()
    return jobID
}

export const uploadTransactions = async (formData: FormData) => {
    const user = await getCurrentUser()
    if (!user) {
        return { error: "You are not signed in" }
    }

    const res = await fetch(`${process.env.EXTERNAL_API}/api/users/transactions`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${user.access_token}`
            },
            body: formData
        }
    )

    if (!res.ok) {
        return { error: "Error occured" }
    }

    const jobID = await res.json();
    return jobID;
}

export const uploadCOA = async (formData: FormData) => {
    const user = await getCurrentUser();

    const res = await fetch(`${process.env.EXTERNAL_API}/api/users/${user?.id}/coa`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${user?.access_token}`
            },
            body: formData
        }
    )

    if (!res.ok) {
        return {error: "Encountered an error. Please try again."}
    }

    const jobID = await res.json();
    return jobID;
}

export async function exportRequest(exportType: string) {
    const user = await getCurrentUser()

    if (!user) {
        throw new Error("Not signed in")
    }

    const res = await fetch(`${process.env.EXTERNAL_API}/api/users/documents/?export_type=${exportType}`, {
        headers: {
            "Authorization": `Bearer ${user.access_token}`
        }
    });

    if (!res.ok) {
        return { error: "Server error. Try again..." }
    }

    const jobID = await res.json()
    return jobID;
}

export async function fetcher(url: string,) {
    const user = await getCurrentUser();

    const req = await fetch(`${process.env.EXTERNAL_API}/${url}`,
        {
            headers: {
                'Authorization': `Bearer ${user?.access_token}`
            },
        }
    )

    if (!req.ok)
        throw new Error('Failed to fetch account options')

    const res = await req.json()

    return res
}

export const createMapping = async (values: z.infer<typeof CreateMappingRequestSchema>) => {
    const validatedFields = CreateMappingRequestSchema.safeParse(values)
    if (!validatedFields.success) {
        return { error: z.prettifyError(validatedFields.error) }
    }
    const { templateID, mappingName, translationCOAGroupID, translations } = validatedFields.data

    const user = await getCurrentUser()
    const res = await fetch(`${process.env.EXTERNAL_API}/api/users/mappings`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${user?.access_token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                template_id: templateID,
                mapping_name: mappingName,
                coa_group_id: translationCOAGroupID,
                translations: translations
            })
        }
    )

    if (!res.ok) {
        const q = await res.json()
        return { error: "failed" }
    }

    return { success: "success" }
}

export async function updateMapping(mappingID: number, data: MappingRecord) {
    const user = await getCurrentUser()

    if (!user)
        return {message: "You are not signed in"}

    const response = await fetch(`${process.env.EXTERNAL_API}/api/users${user.id}/mappings/${mappingID}/${data.base_coa_id}`, {
        method: 'PUT',
        headers: {
                'Authorization': `Bearer ${user.access_token}`,
                "Content-Type": "application/json"
            },
        body: JSON.stringify({
            "translated_coa_id": data.translated_coa_id,
        })
    })

    if(!response.ok)
        return {message: "Update failed"}
    
    return {message: "Mapping was succesfully updated!"}
}