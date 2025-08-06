import Upload from "@/app/ui/dashboard/upload/upload";
import { auth } from "../../../../auth";

export default async function Page(){
    const session = await auth()

    if(!session?.user)
        return <p>Couldn&apos;t load your data...</p>
    
    const user = {id: session.user.id as string, username: session.user.name as string}

    return(
        <Upload user={user}  />
        // <SessionProvider>
        //     <Upload />
        // </SessionProvider>
    )
}