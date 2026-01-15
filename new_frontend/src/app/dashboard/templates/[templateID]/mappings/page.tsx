import CreateMapping from "@/components/dashboard/create-mapping";
import { getCurrentUser } from "@/lib/actions";
import { Suspense } from "react";

export default async function Page({
    params,
}: {
    params: Promise<{ templateID: string }>
}) {
    const [dynamicSegment, user] = await Promise.all([params, getCurrentUser()])

    return (
        <Suspense>
            <CreateMapping
                templateID={dynamicSegment.templateID}
                userID={user?.id!}
            />
        </Suspense>
    )
}
