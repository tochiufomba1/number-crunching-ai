"use client"
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
import { Label } from "@/components/ui/label"
import { uploadCOA } from "@/lib/actions"

export function AddCOADialog() {


  return (
    <Dialog>
      <form action={uploadCOA}>
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
          <div className="grid gap-4">
            <div className="grid gap-3">
              <Label htmlFor="name-1">COA Name</Label>
              <Input id="name-1" name="name" placeholder="COA Name" />
            </div>
            <div className="grid gap-3">
               <Label htmlFor="coa_file">File</Label>
               <Input id="coa_file" type="file" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit">Upload</Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  )
}
