"use client"
import useSWR from 'swr'
import { auth } from '../../auth'

const getTemplates = async (query: string) => {
    const response = await fetch(query)

    if (!response.ok)
        throw new Error("Failed to fetch templates")

    const res = await response.json()
    return res["templates"]
}

export  function useTemplate(userID:string){
    const { data, error, isLoading } = useSWR(`/api/data/${userID}/templates`,
        getTemplates
    )

    return {
        templates: data ?? [],
        isLoading,
        isError: error
    }

}