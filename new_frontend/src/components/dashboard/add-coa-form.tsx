'use client'
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { uploadCOA } from "@/lib/actions"
import { AddCOADialogForm } from "@/schemas"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import z from "zod"
import { FieldGroup, Field, FieldLabel, FieldError } from "../ui/field"
import { convertToFormData } from "@/lib/helpers"
import { useState } from "react"

export function AddCOADialog({
  userID,
  addJob,
}: {
  userID:string,
  addJob: (jobID: string) => void
}) {
  const [open, setOpen] = useState(false);
  const [APIFormError, setAPIFormError] = useState<any|null>(null)

  const form = useForm({
    resolver: zodResolver(AddCOADialogForm),
    defaultValues: {
      coa_group_name: "",
      coa_file: undefined as any,
    },
  })

  async function onSubmit(formValues: z.infer<typeof AddCOADialogForm>) {
    const formData = convertToFormData(formValues)
    const formStatus = await uploadCOA(formData)

    if(formStatus.error){
      setAPIFormError({message: formStatus.error})
      return
    }

    addJob(formStatus.job_id)
    setOpen(false)
    form.reset()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <form id="coa_upload" onSubmit={form.handleSubmit(onSubmit)}>
        <DialogTrigger asChild>
          <Button className="w-full" variant="outline">Add new chart of accounts</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add a new chart of accounts</DialogTitle>
            <DialogDescription>
              Provide information about the new chart of accounts here. Click upload when you&apos;re
              done.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Controller
              name="coa_group_name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="coa_group_name">COA Name</FieldLabel>
                  <Input
                    {...field}
                    id="coa_group_name"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="coa_file"
              control={form.control}
              render={({ field: { value, onChange, ...fieldProps }, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="coa_file">
                    Upload
                  </FieldLabel>
                  <Input
                    {...fieldProps}
                    id="coa_file"
                    aria-invalid={fieldState.invalid}
                    placeholder="Upload COA file here"
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      onChange(file);
                    }}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            { APIFormError && <Field> <FieldError  errors={APIFormError}/></Field> }
          </FieldGroup>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" form="coa_upload">Upload</Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  )
}