import { auth } from "../../../../../auth"

export async function GET(){
    const session = await auth()

    if(!session){
        throw new Error("Not signed in")
    }

    const req = await fetch(`${process.env.EXTERNAL_API}/api/users/tables`,
        {
            headers: {
                "Accept": 'application/json',
                "Authorization": `Bearer ${session.user.access_token}`
            }
        }
    )

    const res = await req.json();
    // console.log(res)

    return Response.json(res)
}