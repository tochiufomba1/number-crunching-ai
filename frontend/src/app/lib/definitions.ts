import z from "zod";

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
    shared: Shared[];
    // coa_group: string;
}

export type User = {
    id: string;
    username: string;
}

export type ItemizedRecord = {
    id: number;
    date: string;
    number: string;
    payee: string;
    account: string;
    amount: number;
    description: string;
    old_description: string;
    group: number;
}

export type SummaryRecord = {
    id: number;
    description: string;
    account: string;
    total: number;
    instances: number;
    prediction_confidence: string;
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

export const coaSchema = z.object({
    name: z.string().min(1, "Provide a name for the chart of accounts"),
    file: z.instanceof(File),
});

export const TemplateRecipient = z.object({
    email: z.string().email(),
    accessLevel: z.string(),
}).refine((data) =>["maintainer", "user"].includes(data.accessLevel.toLowerCase()), {
    message: "Passwords don't match",
    path: ["accessLevel"], // path of error
  });