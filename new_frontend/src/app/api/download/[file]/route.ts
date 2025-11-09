import { auth } from "@/../auth"
import { NextRequest } from "next/server";

export async function GET(
    req: NextRequest,
    {params}: {params: Promise<{file: string}>}
){
    const { file } = await params;
    const session = await auth()

    if(!session || !session.user){
        throw new Error("Not signed in")
    }

    const user = session.user

    const res = await fetch(`${process.env.EXTERNAL_API}/api/users/${user.id}/documents/${file}`, {
            headers: {
                "Authorization": `Bearer ${user.access_token}`
            }
        }
    )

    if(!res.ok){
        throw new Error("Download failed")
    }

    const fileObject = await res.blob();

    return new Response(fileObject)
}