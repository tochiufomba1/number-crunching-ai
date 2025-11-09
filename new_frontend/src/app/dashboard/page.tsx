import TemplateCreationForm from "@/components/dashboard/template-creation-form";
import TemplateListing from "@/components/dashboard/template-listing";
import { auth } from "../../../auth";

export default async function Dashboard() {
    const session = await auth()

    if(!session){
        return <div>You are not signed in</div>
    }

    const userID = session.user.id as string

    return (
        // <div className="h-full flex items-center justify-center gap-2">
        <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
            <TemplateCreationForm userID={userID} />
            <TemplateListing userID={userID}/>
        </div>

    )
}