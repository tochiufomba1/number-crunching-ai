'use client'
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation'

export default function LoadingPage() {
    const router = useRouter();
    const searchParams = useSearchParams()
    const pollingUrl = searchParams.get('pollingUrl')
    const onSuccess = searchParams.get('onSuccess')
    const download = searchParams.get('download')
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!pollingUrl) return;

        // let attempts = 0;
        let pollingInterval = 5000; // Start with 5 seconds

        const pollTaskStatus = async () => {
            try {
                const response = await fetch("/api/data" + decodeURIComponent(pollingUrl).slice(4,), {
                    credentials: 'include',
                });

                if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

                if (response.status === 200) { //(data.status === 'success')
                    clearInterval(interval);

                    if (download) {
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);

                        const link = document.createElement('a');
                        link.href = url;
                        // link.download = 'file.pdf'; // Optional: Rename the file
                        link.click();

                        window.URL.revokeObjectURL(url); // Clean up
                    }

                    router.push(decodeURIComponent(onSuccess as string)); // Redirect when task is done
                    return
                }
            } catch (err) {
                console.error('Polling error:', err);
                setError('Something went wrong. Retrying...');
                clearInterval(interval);
                return
            }

            // Exponential backoff to prevent excessive polling
            // attempts++;
            pollingInterval = Math.min(15000, pollingInterval * 3); // Cap at 15s
        };

        const interval = setInterval(pollTaskStatus, pollingInterval);
        return () => clearInterval(interval);
    }, [pollingUrl, download, onSuccess, router]);

    if (error) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <div style={{ color: 'black', justifyContent: 'center', alignSelf: 'center' }}>
                    Something went wrong.
                </div>
            </div>
        )
    }

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <div style={{ color: 'black', justifyContent: 'center', alignSelf: 'center' }}>
                Loading...
            </div>
        </div>
    )
}
