export type COAOption = {
    group_id: number;
    group_name: string;
};

export type Shared = {
    email: string;
    access_level: string;
    message?: string;
}

export type Template = {
    id: number;
    // author: string;
    title: string;
    // shared: Shared[];
    base_coa_group: number;
}

export type User = {
    id: string;
    username: string;
}

export type ItemizedRecord = {
    date: string;
    number: string;
    payee: string;
    account: string;
    amount: number;
    description: string;
    group: number
    // old_description: string;
    // group: number;
}

export type SummaryRecord = {
    description: string;
    account: string;
    total?: number;
    instances: number;
    prediction_confidence?: string;
    group: number
}

export interface MappingRecord {
    base_coa_id: number
    base_account?: number
    translated_account: string
    translated_coa_id: number
}

export type Option = {
    label: string | number;
    value: string;
};

export type CategoryTotals = {
    index: number;
    Account: string;
    Total: number;
}

export type Message = {
    recipient: string;
    job_type: string;
    status: string;
}

export interface JobStatus {
    job_id: string
    success: boolean
    job_type: string
    filename: string | null
    message: string | null
}

export interface Account {
    id: number
    account: string
}

export interface MappingCollectionItem { 
    id: number, 
    name: string, 
    coa_group_id: number 
}