'use client'
import { fileFetcher } from '@/lib/actions'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

export default function Download() {
    const searchParams = useSearchParams()

    useEffect(() => {
        const file = searchParams.get('file')

        // fetch file from external backend and download it
        if (!file)
            return

        fetch(`/api/download/${file}`)
            .then((response) => response.blob())
            .then((fileObject) => {
                const objectURL = URL.createObjectURL(fileObject)
                const link = document.createElement('a');
                link.href = objectURL;
                link.download = file || 'download'

                // Append to html link element page
                //document.body.appendChild(link);

                const clickHandler = () => {
                    setTimeout(() => {
                        URL.revokeObjectURL(objectURL);
                        removeEventListener('click', clickHandler);
                    }, 150);
                };

                link.addEventListener('click', clickHandler, false);

                link.click();

                return
            })
    }, [searchParams])

    return (
        <>
            <div>Download Complete</div>
            <Link href={'/dashboard/upload'}>Click here to upload more transactions.</Link>
        </>
    )
}