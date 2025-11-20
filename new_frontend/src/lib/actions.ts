"use server"
import RegisterForm from "@/components/auth/register-form"
import { LoginSchema, RegisterSchema } from "@/schemas"
import * as z from "zod"
import { auth, signIn } from "../../auth"
import { DEFAULT_LOGIN_REDIRECT } from "../../routes"
import { AuthError } from "next-auth"
import { redirect } from "next/navigation"

export async function getCurrentUser() {
    const session = await auth();

    return session?.user
}
export const login = async (values: z.infer<typeof LoginSchema>) => {
    // replace with api call
    const validatedFields = LoginSchema.safeParse(values)

    if (!validatedFields.success) {
        return { error: "Invalid fields" }
    }

    const { email, password } = validatedFields.data

    try {
        console.log("email: " + email)
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

export async function createTemplate(previousState: string | null, formData: FormData) {
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

    if (!res.ok) {
        return "Error"
    }
    else {
        return "Success"
    }
}

export const uploadTransactions = async (previousState: string | null, formData: FormData) => {
    const session = await auth()
    if (!session) {
        // error response
        return "You are not signed in"
    }

    const req = await fetch(`${process.env.EXTERNAL_API}/api/users/transactions`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.user.access_token}`
            },
            body: formData
        }
    )

    if (!req.ok) {
        return "Error"
    }

    // return "Success"
    redirect('/dashboard/upload/loading')
}

export const uploadCOA = async (formData: FormData) => {
    const user = await getCurrentUser();

    const req = await fetch(`${process.env.EXTERNAL_API}/api/users/${user?.id}/coa`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${user?.access_token}`
            },
            body: formData
        }
    )

    if (!req.ok) {
        throw new Error("Upload failed")
    }
}

export async function addToCart(prevState: string | null, queryData: FormData) {
    const itemID = queryData.get('itemID');
    if (itemID === "1") {
        return "Added to cart";
    } else {
        // Add a fake delay to make waiting noticeable.
        await new Promise(resolve => {
            setTimeout(resolve, 2000);
        });
        return "Couldn't add to cart: the item is sold out.";
    }
}

export async function exportRequest(exportType: string) {
    const user = await getCurrentUser()

    if (!user) {
        throw new Error("Not signed in")
    }

    await fetch(`${process.env.EXTERNAL_API}/api/users/documents/?export_type=${exportType}`, {
        headers: {
            "Authorization": `Bearer ${user.access_token}`
        }
    });

    redirect('/dashboard/upload/loading')
}

// https://blog.logrocket.com/programmatically-downloading-files-browser/
// https://stackoverflow.com/questions/50694881/how-to-download-file-in-react-js
export async function fileFetcher(file: string) {
    const user = await getCurrentUser()

    if (!user) {
        throw new Error("Not signed in")
    }

    fetch(`${process.env.EXTERNAL_API}/api/users/${user.id}/documents/${file}`, {
        headers: {
            "Authorization": `Bearer ${user.access_token}`
        }
    })
        .then((response) => response.blob())
        .then((fileObject) => {
            const objectURL = URL.createObjectURL(fileObject)
            const link = document.createElement('a');
            link.href = objectURL;
            link.download = file || 'download'

            // Append to html link element page
            //document.body.appendChild(link);

            const clickHandler = () => {
                setTimeout(() => {
                    URL.revokeObjectURL(objectURL);
                    removeEventListener('click', clickHandler);
                }, 150);
            };

            link.addEventListener('click', clickHandler, false);

            link.click();

            return
        })
}