'use client'
import useSWR from 'swr'
import { fetcher } from '../lib/actions'
import { COAOption, Option } from '../lib/definitions'

const getCOAOptions = async (query: string) => {
    const coa_options: COAOption[] = await fetcher(query)

    const selectOptions: Option[] = coa_options.map(
        (option: COAOption) => ({
            label: option.group_name,
            value: option.group_id.toString()
        })
    )

    return selectOptions
}

export default function useCOAOptions(userID: string) {
    const { data, error, isLoading } = useSWR(`api/users/${userID}/coas`,
        getCOAOptions
    );

    return {
        coaOptions: data ?? [],
        isCOAOptionsLoading: isLoading,
        isCOAOptionsError: error
    }
}