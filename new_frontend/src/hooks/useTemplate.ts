'use client'
import useSWR from 'swr'
import { Template } from '../lib/definitions'
import { TemplateCollection } from '@/models/TemplateCollection'
import { fetcher } from '@/lib/actions'

const getTemplates = async (query: string) => {
    const templates: Template[] = await fetcher(query)
    
    return new TemplateCollection(templates)
}

export  function useTemplate(userID:string){
    const { data, error, isLoading } = useSWR(`api/users/${userID}/templates`,
        getTemplates
    )

    return {
        templates: data,
        isLoading,
        isError: error
    }
}