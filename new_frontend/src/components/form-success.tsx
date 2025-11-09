import { EarthIcon } from "lucide-react"

interface FormSuccessProps {
    message?: string;
}

export default function FormError({message}:FormSuccessProps){
    if (!message) return null;

    return (
       <div className="bg-emerald/15 p-3 round-md flex items-center gap-x-2 text-sm text-emerald">
            <EarthIcon className="h-4 w-4" />
            <p>{message}</p>
        </div>
    )
}