import UpdateMapping from "@/components/dashboard/update-mapping";
import { getCurrentUser } from "@/lib/actions";
import { Suspense } from "react";

export default async function Page({
    params,
}: {
    params: Promise<{ mappingID: string }>
}) {
    const [dynamicSegment, user] = await Promise.all([params, getCurrentUser()])

    return (
        <Suspense>
            <UpdateMapping
                mappingID={Number(dynamicSegment.mappingID)}
                userID={user?.id!}
            />
        </Suspense>
    )
}
