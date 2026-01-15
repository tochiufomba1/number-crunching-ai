import { MappingCollection } from "@/models/MappingCollection";
import { fetcher } from "../lib/actions";
import { MappingCollectionItem } from "../lib/definitions"
import useSWR from "swr";

const getMappingOptions = async (url: string) => {
    const mappingOptions: MappingCollectionItem[] =  await fetcher(url)

    return new MappingCollection(mappingOptions)
}

export default function useMappingOptions(templateID: string) {
    const { data, error, isLoading } = useSWR(
        templateID !== "0" ? `api/users/templates/${templateID}/mappings` : null,
        getMappingOptions
    )

    return {
        mappingOptions: data,
        mappingOptionsError: error,
        mappingOptionsLoading: isLoading,
    }
}