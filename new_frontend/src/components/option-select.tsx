import { Option } from "@/lib/definitions";
import { Control, Controller } from "react-hook-form"
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "./ui/select";
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from "./ui/field";

interface OptionSelect {
    selectName: string
    selectTitle?: string
    selectDescription?: string
    placeholder: string
    options: Option[]
    formControl: Control<any, any, any>
    disabled?: boolean
    none?: string
}

export default function OptionSelect({
    selectName,
    selectTitle,
    selectDescription,
    placeholder,
    options,
    formControl,
    disabled,
    none
}: OptionSelect) {

    return (
        <Controller
            name={selectName}
            control={formControl}
            render={({ field, fieldState }) => (
                <Field
                    orientation="responsive"
                    data-invalid={fieldState.invalid}
                >
                    <FieldContent>
                        <FieldLabel htmlFor={selectName}>
                            {selectTitle}
                        </FieldLabel>
                        <FieldDescription>
                            {selectDescription ? selectDescription : ""}
                        </FieldDescription>
                        {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                        )}
                    </FieldContent>
                    <Select
                        name={field.name}
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={disabled}
                    >
                        <SelectTrigger
                            id={selectName}
                            aria-invalid={fieldState.invalid}
                            className="w-full max-w-sm"
                        >
                            <SelectValue placeholder={placeholder} />
                        </SelectTrigger>
                        <SelectContent>
                            {none &&
                                <>
                                    <SelectItem value={none}>None</SelectItem>
                                    <SelectSeparator />
                                </>
                            }
                            {options.map((option) => (
                                <SelectItem
                                    key={option.label}
                                    id={option.label.toString()}
                                    value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>
            )}
        />
    )
}