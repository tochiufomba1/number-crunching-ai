import useSWR, {mutate} from 'swr';
import { SummaryRecord, ItemizedRecord, UnresolvedRecord, CategoryTotals } from '@/app/lib/definitions';
// import { getCSRFToken } from './helpers';
const url = '/api/data/tables';

async function updateSummaryItemRequest(id: number, data: SummaryRecord) {
  const response2 = await fetch(`/api/data/tables/summary/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      Accept: "application/json", 
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return response2.json();
}

async function updateItemRequest(id: number, data: ItemizedRecord) {
  const response = await fetch(`/api/data/tables/item/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      Accept: "application/json", 
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

async function updateUnresolvedItemRequest(id: number, data: UnresolvedRecord){
  const response = await fetch(`/api/data/tables/resolve/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      Accept: "application/json", 
      "Content-Type": "application/json",
      // "X-CSRFToken": getCSRFToken()
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

const updateSummaryRow = async (id: number, postData: SummaryRecord) => {
  await updateSummaryItemRequest(id, postData);
  mutate(url);
};


const updateTableRow = async (id: number, postData: ItemizedRecord) => {
  await updateItemRequest(id, postData);
  mutate(url);
};

const updateUnresolvedRow = async (id: number, postData: UnresolvedRecord) => {
  await updateUnresolvedItemRequest(id, postData);
  mutate(url);
};

async function getRequest() {
  const response = await fetch(url, { credentials: 'include' })
  const result = await response.json();

  const table:ItemizedRecord[] = JSON.parse(result.table)

  const summary: SummaryRecord[] = JSON.parse(result.summary)

  const unresolved: UnresolvedRecord[] = JSON.parse(result.unresolved)

  const options: string[] = JSON.parse(result.options)

  const vendors: string[] = JSON.parse(result.vendors)

  const category_totals: CategoryTotals[] = JSON.parse(result.category_totals)

  const data =  {
    table: table,
    summary: summary,
    unresolved: unresolved,
    options: options,
    vendors: vendors,
    category_totals: category_totals,
  }

  return data;
}

export default function useRecords() {
  const { data, isValidating } = useSWR(url, getRequest);
  return {
    data: data ?? [],
    isValidating,
    updateSummaryRow,
    updateTableRow,
    updateUnresolvedRow
  };
}