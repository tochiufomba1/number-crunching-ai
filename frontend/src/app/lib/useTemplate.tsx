import useSWR from "swr";

const fetcher = async (url: string) => {
    const response = await fetch(url, { credentials: 'include', headers:{'Accept': "application/json",}});

    if (!response.ok)
        throw new Error("Fetch failed")

    const data = await response.json()
    return data["templates"];
}

export function useTemplate(id: string | null) {
    const { data, error, isLoading } = useSWR(`/api/data/users/${id}/templates`, fetcher)

    return {
        templates: data ?? [],
        isLoading,
        isError: error
    }
}