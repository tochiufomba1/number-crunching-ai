import * as z from "zod";

export const LoginSchema = z.object({
    email: z.email(),
    password: z.string()
})

export const RegisterSchema = z.object({
    name: z.string(),
    email: z.email(),
    password: z.string().min(8)
})

export const TranslationInputSchema = z.object({
    base_coa_id: z.number(),
    translated_coa_id: z.number()
})

export const CreateMappingRequestSchema = z.object({
    templateID: z.number().gt(0),
    mappingName: z.string().min(1),
    translationCOAGroupID: z.number().gt(0),
    translations: z.array(TranslationInputSchema).min(1)
})

export const TransactionUploadSchema = z.object({
    template_id: z.coerce.number<string>("Select a template").gt(0),
    mapping_group_id: z.coerce.number<string>(),
    transactions_file: z.file("Upload a file").mime(['text/csv'])
})

export const AddCOADialogForm = z.object({
    coa_group_name: z.string().min(1, "Please provide a name for this chart of accounts"),
    coa_file: z.file("Upload a file").mime(['text/csv'])
})

export const TemplateCreationFormScheama = z.object({
    template_title: z.string().min(1, "Title must have at least one character"),
    template_coa_group_id: z.coerce.number<string>(),
    transactions_file: z.file("Upload a file").mime(['text/csv']),
})