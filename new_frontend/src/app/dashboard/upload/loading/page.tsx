import { auth } from "@/../auth"
import Loading from "@/components/dashboard/upload/loading";

export default async function Page(){
    const session = await auth();

    if(!session || !session.user?.id){
        return <p>Error</p>
    }
    
    return <Loading userID={session.user.id} />
}