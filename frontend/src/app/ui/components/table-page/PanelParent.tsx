'use client'
import { useRouter } from 'next/navigation';
import { Box } from '@mui/material';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { useEffect, useState } from 'react';
import { ItemizedRecord, SummaryRecord, UnresolvedRecord } from '@/app/lib/definitions';
import useRecords from '@/app/lib/useRecords';
// import "../css/PanelParent.css";
import { Table } from "@/app/ui/components/table";
import { SortingFn, createColumnHelper } from "@tanstack/react-table";
import { TableCell } from '@/app/ui/components/table/TableCell';
import { EditCell } from '@/app/ui/components/table/EditCell';
import Modal from '@/app/ui/components/modal/Modal';
import BasicTable from '@/app/ui/components/basic-table/BasicTable';
// import { User } from 'next-auth';
import { Template, User } from '@/app/lib/definitions';

//custom sorting logic for one of our enum columns
const sortStatusFn: SortingFn<SummaryRecord> = (rowA, rowB) => { //_columnID
    const statusA = rowA.original.prediction_confidence
    const statusB = rowB.original.prediction_confidence
    const statusOrder = ['Low', 'Medium', 'High']
    return statusOrder.indexOf(statusA) - statusOrder.indexOf(statusB)
}

const summaryColumnHelper = createColumnHelper<SummaryRecord>();
const itemizedColumnHelper = createColumnHelper<ItemizedRecord>();
const unresolvedColumnsHelper = createColumnHelper<UnresolvedRecord>();

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
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

function a11yProps(index: number) {
    return {
        id: `simple-tab-${index}`,
        'aria-controls': `simple-tabpanel-${index}`,
    };
}

export default function PanelParent() {
    const router = useRouter()
    const { data: originalData, isValidating, updateSummaryRow, updateTableRow, updateUnresolvedRow } = useRecords();
    const [dataFrame, setDataFrame] = useState<ItemizedRecord[]>([]);
    const [dataFrame2, setDataFrame2] = useState<SummaryRecord[]>([]);
    const [dataFrame3, setDataFrame3] = useState<UnresolvedRecord[]>([]);
    const [options, setOptions] = useState<string[]>([]);
    const [vendors, setVendors] = useState<string[]>([]);
    const [isCategoryTotalModalOpen, setCategoryTotalModalOpen] = useState<boolean>(false);
    // const [addVendorModalOpen, setAddVendorModalOpen] = useState<boolean>(false);
    const [value, setValue] = useState(0);

    const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
        setValue(newValue);
    };

    const handleExport = async () => {
        // api request (fetch)
        const response = await fetch('/api/data/export', {
            credentials: 'include',
        })

        if (!response.ok) {
            throw new Error("Fetch failed")
        }

        const res = await response.json()
        const pollingUrl = res['url']
        router.replace(`/dashboard/upload/loading?pollingUrl=${encodeURIComponent(pollingUrl)}&onSuccess=${encodeURIComponent("/dashboard/upload/download")}&download=1`);
    }

    useEffect(() => {
        if (isValidating) {
            return;
        }

        setDataFrame(originalData["table"])
        setDataFrame2(originalData["summary"])
        setDataFrame3(originalData["unresolved"])
        setOptions(originalData["options"])
        setVendors(originalData["vendors"])

    }, [originalData, isValidating]);


    if (dataFrame && dataFrame2 && dataFrame3 && options && vendors && originalData["category_totals"]) {
        // console.log(originalData["category_totals"])
        //let selectOptions: Option[];
        //let vendorOptions: Option[];
        const selectOptions = options//options.map((item) => ({ value: item, label: item }))
        const vendorOptions = vendors//vendors.map((item) => ({ value: item, label: item }))
        // console.log(`Options: ${selectOptions}`)
        const summaryColumns = [
            summaryColumnHelper.accessor("description", {
                header: "Description",
                sortingFn: 'alphanumeric',
                cell: TableCell,
                meta: {
                    type: "text",
                    required: true,
                    editable: false
                }
            }),
            summaryColumnHelper.accessor("account", {
                header: "Account",
                sortingFn: 'alphanumeric',
                cell: TableCell,
                meta: {
                    type: "search",
                    options: selectOptions,
                    required: false,
                    // selectSearch: () => { },
                }
            }),
            summaryColumnHelper.accessor("total", {
                header: "Total",
                cell: TableCell,
                meta: {
                    type: "number",
                    filterVariant: 'range',
                    required: false,
                    editable: false
                }
            }),
            summaryColumnHelper.accessor("instances", {
                header: "Instances",
                cell: TableCell,
                meta: {
                    type: "number",
                    filterVariant: 'range',
                    required: false,
                    editable: false
                }
            }),
            summaryColumnHelper.accessor("prediction_confidence", {
                header: "Prediction Confidence",
                sortingFn: sortStatusFn,
                cell: TableCell,
                meta: {
                    type: "text",
                    required: true,
                    editable: false
                }
            }),
            summaryColumnHelper.display({
                id: "edit",
                cell: EditCell,
            }),
        ];

        const itemizedColumns = [
            itemizedColumnHelper.accessor("date", {
                header: "Date",
                cell: TableCell,
                meta: {
                    type: "date",
                    filterVariant: 'none',
                    required: true,
                    editable: false
                }
            }),
            itemizedColumnHelper.accessor("number", {
                header: "Number",
                cell: TableCell,
                meta: {
                    type: "number",
                    required: false,
                    editable: false
                }
            }),
            itemizedColumnHelper.accessor("payee", {
                header: "Payee",
                cell: TableCell,
                meta: {
                    type: "text",
                    required: false,
                    editable: false
                }
            }),
            itemizedColumnHelper.accessor("account", {
                header: "Account",
                cell: TableCell,
                meta: {
                    type: "search",
                    options: selectOptions,
                    required: true,
                }
            }),
            itemizedColumnHelper.accessor("amount", {
                header: "Amount ($)",
                cell: TableCell,
                meta: {
                    type: "number",
                    filterVariant: 'range',
                    required: false,
                    editable: false
                }
            }),
            itemizedColumnHelper.accessor("description", {
                header: "Description",
                cell: TableCell,
                meta: {
                    type: "text",
                    required: true,
                    editable: false
                }
            }),
            itemizedColumnHelper.display({
                id: "edit",
                cell: EditCell
            })
        ];

        const unresolvedColumns = [
            unresolvedColumnsHelper.accessor("description", {
                header: "Description",
                sortingFn: 'alphanumeric',
                cell: TableCell,
                meta: {
                    type: "text",
                    required: true,
                    editable: false
                }
            }),
            unresolvedColumnsHelper.accessor("vendor", {
                header: "Vendor",
                sortingFn: 'alphanumeric',
                cell: TableCell,
                meta: {
                    type: "search",
                    setAdd: true,
                    filterVariant: 'none',
                    options: vendorOptions,
                    required: false,
                }
            }),
            // unresolvedColumnsHelper.accessor("Account", {
            //     header: "Account",
            //     sortingFn: 'alphanumeric',
            //     cell: TableCell,
            //     meta: {
            //         type: "select",
            //         filterVariant: 'none',
            //         options: selectOptions,
            //         required: false,
            //     }
            // }),
            // unresolvedColumnsHelper.accessor("Group", {
            //     header: "Group",
            //     cell: TableCell,
            //     meta: {
            //         type: "number",
            //         required: false,
            //         editable: false
            //     }
            // }),
            unresolvedColumnsHelper.display({
                id: "edit",
                cell: EditCell,
            }),
        ];

        return (
            <div style={{ padding: '0' }}>
                {isCategoryTotalModalOpen &&
                    <Modal
                        isOpen={isCategoryTotalModalOpen}
                        onClose={() => setCategoryTotalModalOpen(false)}
                        hasCloseBtn={true}>
                        <BasicTable data={originalData["category_totals"]} />
                    </Modal>
                }
                <Box sx={{ width: '100%' }}>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <Tabs value={value} onChange={handleChange} aria-label="basic tabs example">
                            <Tab label="Itemized" {...a11yProps(0)} />
                            <Tab label="Unresolved" {...a11yProps(1)} />
                            <Tab label="Summary" {...a11yProps(2)} />
                        </Tabs>
                    </Box>
                    <div style={{display:'flex', gap: '10px'}}>
                        <button onClick={() => setCategoryTotalModalOpen(true)}>View Category Totals</button>
                        <button onClick={handleExport}>Download CSV</button>
                        {/* <Modal
                            isOpen={isCategoryTotalModalOpen}
                            onClose={() => setCategoryTotalModalOpen(false)}
                            hasCloseBtn={true}>
                            <BasicTable data={originalData["category_totals"]} />
                        </Modal> */}
                    </div>
                    <CustomTabPanel value={value} index={0}>
                        <Table data={dataFrame} setData={setDataFrame} columns={itemizedColumns} updateRow={updateTableRow} />
                    </CustomTabPanel>
                    <CustomTabPanel value={value} index={1}>
                        <Table data={dataFrame3} setData={setDataFrame3} columns={unresolvedColumns} updateRow={updateUnresolvedRow} />
                    </CustomTabPanel>
                    <CustomTabPanel value={value} index={2}>
                        <Table data={dataFrame2} setData={setDataFrame2} columns={summaryColumns} updateRow={updateSummaryRow} />
                    </CustomTabPanel>
                </Box>
            </div>
        )
    }
}