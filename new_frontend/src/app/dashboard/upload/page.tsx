import TransactionUploadForm from "@/components/dashboard/upload/transaction-upload-form";
import { auth } from "../../../../auth";

export default async function Upload(){
    const session = await auth()

    return (
        <TransactionUploadForm userID={session?.user.id as string} />
    )
}