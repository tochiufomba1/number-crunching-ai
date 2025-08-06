import useSWR from "swr";

export function useCOA_Options({id,}:{id:number}){
    const {data, error, isLoading} = useSWR(`/api/users/${id}/coa`)

    return {
        coa_options: data,
        isLoading,
        isError: error
    }
}