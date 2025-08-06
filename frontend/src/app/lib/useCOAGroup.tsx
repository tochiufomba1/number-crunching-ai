import useSWR from "swr";

const fetcher = async (url: string) => {
    const response = await fetch(url, { credentials: 'include', headers: {'Accept': "application/json",}});

    if (!response.ok)
        throw new Error("Fetch failed")

    const data = await response.json()

    return data['coa_groups'];
}

export function useCOAGroup(id: string) {
    const { data, error, isLoading } = useSWR(`/api/data/users/${id}/coa`, fetcher)

    return {
        groups: data ?? [],
        isLoading,
        isError: error
    }
}