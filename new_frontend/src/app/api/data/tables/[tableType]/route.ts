import { NextRequest } from "next/server";
import { auth } from "../../../../../../auth";

export async function PUT(
    req: NextRequest,
    {params}: {params: Promise<{tableType: string}>}
) {
    const { tableType } = await params;

    const session = await auth()
    if (!session){
        // error response
        return
    }

    const reqData = await req.json()

    const res = await fetch(`${process.env.EXTERNAL_API}/api/users/tables/${tableType}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.user.access_token}`
        },
        body: JSON.stringify(reqData)
    })

    const data = await res.json()
    console.log("PUT REQUEST " + JSON.stringify(data))
    
    return Response.json(data)
}