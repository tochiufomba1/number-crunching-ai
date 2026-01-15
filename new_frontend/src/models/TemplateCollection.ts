import { Template, Option } from "@/lib/definitions";

export class TemplateCollection {
    public items: Template[]

    public constructor(items: Template[]) {
        this.items = items;
    }

    getSelectOptions(): Option[] {
        const options: Option[] = this.items.map(
            (item: Template) => ({
                label: item.title,
                value: item.id.toString()
            })
        )

        return options
    }
}