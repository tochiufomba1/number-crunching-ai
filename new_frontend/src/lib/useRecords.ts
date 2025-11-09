import useSWR, { mutate } from "swr";
import { ItemizedRecord, SummaryRecord } from "./definitions";

async function fetcher() {
  const req = await fetch('/api/data/tables')

  if (!req.ok) {
    throw new Error("Couldn't fetch data")
  }

  const res = await req.json()

  return res
}

async function updateRequest(
  id: number,
  data: ItemizedRecord | SummaryRecord,
  tableType: string
) {
  let res = {}
  switch (tableType) {
    case "itemized": {
      const response = await fetch(`/api/data/tables/itemized`, {
        method: 'PUT',
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      })

      res = await response.json()
      break;
    }
    case "summary": {
      const response = await fetch(`/api/data/tables/summary`, {
        method: 'PUT',
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "account": data.account,
          "group": data.group
        })
      })

      res = response.json()
      break;
    }
    default: {
      throw new Error("Invalid table type")
    }
  }

  return res
}

export default function useRecords() {
  const { data, error, isLoading } = useSWR('/api/data/tables', fetcher);

  const updateRow = async (id: number, data: any, tableType: string) => {
    console.log('DATAFF: ' + JSON.stringify(data))
    updateRequest(id, data, tableType)
    mutate('/api/data/tables')
  }

  return {
    data: data ?? [],
    isError: error,
    isLoading: isLoading,
    updateRow
  };
}