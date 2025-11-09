import { Button } from "@/components/ui/button"
import { auth, signOut } from "../../../../auth"


export default async function SettingsPage(){
    const session = await auth()

    return(
        <>
            <div>Settings: {JSON.stringify(session)}</div>
            <form action={async() => {
                "use server"
                await signOut({
                    redirectTo: '/auth/login'
                })
            }}>
                <Button type="submit">Sign Out</Button>
            </form>
        </>
    )
}