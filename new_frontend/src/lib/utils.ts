import { createColumnHelper } from "@tanstack/react-table"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { ItemizedRecord, MappingRecord, SummaryRecord } from "./definitions"
import { TableCell } from "@/components/table/TableCell"
import { EditCell } from "@/components/table/EditCell"


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getColumns(tableType: string, selectOptions: any[]) {
  let columns: any = []
  if (tableType == "itemized") {
    const columnHelper = createColumnHelper<ItemizedRecord>()
    columns = [
      columnHelper.accessor('date', {
        cell: TableCell,
      }),
      columnHelper.accessor('number', {
        cell: TableCell,
        meta: {
          type: "number",
        }
      }),
      columnHelper.accessor('payee', {
        cell: TableCell,
        meta: {
          type: "text",
        }
      }),
      columnHelper.accessor('description', {
        cell: TableCell,
        meta: {
          type: "text",
        }
      }),
      columnHelper.accessor('amount', {
       cell: TableCell,
       meta: {
          type: "number",
        }
      }),
      columnHelper.accessor('account', {
        cell: TableCell,
        meta: {
          type: "search",
          options: selectOptions,
        }
      }),
      columnHelper.display({
        id: "edit",
        cell: EditCell 
      }),
    ]
  }

  else if(tableType == "summary"){
    const columnHelper = createColumnHelper<SummaryRecord>()
    columns = [
      columnHelper.accessor('description', {
        cell: TableCell,
        meta: {
          type: "text",
        }
      }),
      columnHelper.accessor('instances', {
        cell: TableCell,
        meta: {
          type: "number",
        }
      }),
      columnHelper.accessor('account', {
        cell: TableCell,
        meta: {
          type: "search",
          options: selectOptions,
        }
      }),
      columnHelper.display({
        id: "edit",
        cell: EditCell 
      }),
    ]
  }

  else if(tableType == 'mapping'){
    const columnHelper = createColumnHelper<MappingRecord>()
    columns = [
      // columnHelper.accessor('id', {
      //   cell: TableCell,
      //   meta: {
      //     type: "text",
      //   }
      // }),
      columnHelper.accessor('base_account', {
        cell: TableCell,
        header: 'Original Account',
        meta: {
          type: "text",
        }
      }),
      columnHelper.accessor('translated_account', {
        cell: TableCell,
        header: 'Translated Account',
        meta: {
          type: "search",
          options: selectOptions,
        }
      }),
      columnHelper.display({
        id: "edit",
        cell: EditCell 
      }),
    ]
  }

  return columns
}
