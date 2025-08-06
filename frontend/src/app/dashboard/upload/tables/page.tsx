import { auth } from "@/../auth";
import PanelParent from "@/app/ui/components/table-page/PanelParent";

export default async function Page(){
    const session = await auth()

    if(!session?.user)
        return <p>Couldn&apos;t load your data...</p>
    
    const user = {id: session.user.id as string, username: session.user.name as string}

    return(
        <PanelParent />
        // <SessionProvider>
        //     <Upload />
        // </SessionProvider>
    )
}