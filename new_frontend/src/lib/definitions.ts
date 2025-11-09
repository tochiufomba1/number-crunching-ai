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
    // coa_group: string;
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

export type UnresolvedRecord = {
    id: number;
    description: string;
    vendor: string;
    group: number;
}

export type Option = {
    label: string;
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