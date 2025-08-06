import LoadingPage from "@/app/ui/dashboard/upload/loading-page";
import { Suspense } from "react";

export default function Page() {

    return (
        <div>
            <Suspense>
                <LoadingPage />
            </Suspense>
        </div>
    )
}