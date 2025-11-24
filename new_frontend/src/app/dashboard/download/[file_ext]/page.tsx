import Download from "@/components/dashboard/download/download";
import { getCurrentUser } from "@/lib/actions";
import { Suspense } from "react";

export default async function Page({
    params,
}: {
    params: Promise<{file_ext:string}>
}){
    const [dynamicSegment, user] = await Promise.all(
        [params,
        getCurrentUser()]
    )

    if(!user)
        return <p>Error: Not signed in</p>

    return (
        <Suspense>
            <Download userID={user.id as string} file_ext={dynamicSegment.file_ext} />
        </Suspense>
    )
}