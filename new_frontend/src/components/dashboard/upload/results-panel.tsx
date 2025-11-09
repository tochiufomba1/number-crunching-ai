"use client"
import Table from "@/components/table"
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { ItemizedRecord } from "@/lib/definitions"
import useRecords from "@/lib/useRecords"
import Box from '@mui/material/Box'
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { exportRequest } from "@/lib/actions";

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function a11yProps(index: number) {
    return {
        id: `simple-tab-${index}`,
        'aria-controls': `simple-tabpanel-${index}`,
    };
}

function CustomTabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

export default function ResultsPanel() {
    const { data, isError, isLoading, updateRow }: { data: any, isError: boolean, isLoading: boolean, updateRow: any } = useRecords()
    const [value, setValue] = useState(0);

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setValue(newValue);
    };

    if (isError)
        return <div>Experienced an error fetching your data. Try again.</div>

    if (isLoading)
        return <div>Loading</div>

    return (
        <>
            <div className="w-full flex justify-end gap-3">
                 <form onSubmit={async(e: React.FormEvent) => {
                    e.preventDefault()
                    exportRequest("csv")
                }}>
                    <Button type="submit">Export as CSV</Button>
                </form>
                <form onSubmit={async(e: React.FormEvent) => {
                    e.preventDefault()
                    exportRequest("xlsx")
                }}>
                    <Button type="submit">Export as Excel file</Button>
                </form>
            </div>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={value} onChange={handleChange} aria-label="basic tabs example">
                    <Tab label="Itemized" {...a11yProps(0)} />
                    <Tab label="Summary" {...a11yProps(1)} />
                </Tabs>
            </Box>
            <CustomTabPanel value={value} index={0}>
                <Table initialData={data['itemized']} accountOptions={data["options"]} tableType="itemized" updateRow={updateRow} />
            </CustomTabPanel>
            <CustomTabPanel value={value} index={1}>
                <Table initialData={data['summary']} accountOptions={data["options"]} tableType="summary" updateRow={updateRow} />
            </CustomTabPanel>
        </>
    )
}