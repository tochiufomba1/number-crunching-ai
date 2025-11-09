import Download from "@/components/dashboard/download/download";
import { Suspense } from "react";

export default function Page(){

    return (
        <Suspense>
            <Download />
        </Suspense>
    )
}