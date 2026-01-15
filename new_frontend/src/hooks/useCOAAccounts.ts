'use client'
import useSWR from 'swr'
import { fetcher } from '../lib/actions'

export default function useCOAAccounts(userID:string, coaGroupID: string | null){
    const { data, error, isLoading } = useSWR( 
        coaGroupID ? `api/users/coas/${coaGroupID}/accounts` : null,
        fetcher
    );

    return {
        accounts: data ?? [],
        isAccountsLoading: isLoading,
        isAccountsError: error
    }

}