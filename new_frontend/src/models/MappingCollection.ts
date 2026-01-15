import { MappingCollectionItem, Option } from "@/lib/definitions";

export class MappingCollection {
    public items: MappingCollectionItem[]

    public constructor(items: MappingCollectionItem[]) {
        this.items = items;
    }

    getSelectOptions(): Option[] {
        const options: Option[] = this.items.map(
            (item: MappingCollectionItem) => ({
                label: item.name,
                value: item.id.toString()
            })
        )

        return options
    }
}