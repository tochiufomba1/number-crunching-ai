import { NextRequest } from "next/server";
import { auth } from "../../../../../../auth";

export async function GET(
    req: NextRequest,
    {params}: {params: Promise<{userID: string}>}
) {
    const { userID } = await params;

    const session = await auth()
    if (!session){
        // error response
        return
    }

    const res = await fetch(`${process.env.EXTERNAL_API}/api/users/${userID}/templates`, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.user.access_token}`
        },
    })

    const data = await res.json()
    console.log("rxw" + JSON.stringify(data))
    
    return Response.json(data)
}