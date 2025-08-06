import { useEffect, useState } from "react";
import "./table.css";

import {
    Column,
    RowData,
    PaginationState,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    ColumnFiltersState,
    getFilteredRowModel,
} from "@tanstack/react-table";

declare module '@tanstack/react-table' {
    //allows us to define custom properties for our columns
    interface ColumnMeta<TData extends RowData, TValue> {
        type?: string;
        required?: boolean; // Ensure other custom properties are included
        editable?: boolean;
        filterVariant?: 'text' | 'range' | 'select' | 'none';
        options?: string[];
        // selectSearch?: () => any;
        setAdd?: boolean;
    }
}

export const Table = ({ data, setData, columns, updateRow }) => {
    const originalData = data;
    const [editedRows, setEditedRows] = useState({});
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    })
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(
        []
    );

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        onPaginationChange: setPagination,
        onColumnFiltersChange: setColumnFilters,
        autoResetPageIndex: false,
        state: {
            pagination,
            columnFilters,
        },
        meta: {
            editedRows,
            setEditedRows,
            revertData: (rowIndex: number) => {
                setData((old) =>
                    old.map((row, index) =>
                        index === rowIndex ? originalData[rowIndex] : row
                    )
                );
            },
            updateRow: (rowIndex: number) => {
                updateRow(data[rowIndex].id, data[rowIndex]);
            },
            updateData: (rowIndex: number, columnId: string, value: string) => {
                setData((old) =>
                    old.map((row, index) => {
                        if (index === rowIndex) {
                            return {
                                ...old[rowIndex],
                                [columnId]: value,
                            };
                        }
                        return row;
                    })
                );
            },
            //selectSearch: () => {},
        },
    });

    return (
        <>
            <table aria-label="custom pagination table">
                <thead>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map((header) => {
                                return (
                                    <th key={header.id} colSpan={header.colSpan}>
                                        {header.isPlaceholder ? null : (
                                            <>
                                                <div
                                                    className={
                                                        header.column.getCanSort()
                                                            ? 'cursor-pointer select-none'
                                                            : ''
                                                    }
                                                    onClick={header.column.getToggleSortingHandler()}
                                                    title={
                                                        header.column.getCanSort()
                                                            ? header.column.getNextSortingOrder() === 'asc'
                                                                ? 'Sort ascending'
                                                                : header.column.getNextSortingOrder() === 'desc'
                                                                    ? 'Sort descending'
                                                                    : 'Clear sort'
                                                            : undefined
                                                    }
                                                >
                                                    {flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                                    {{
                                                        asc: ' 🔼',
                                                        desc: ' 🔽',
                                                    }[header.column.getIsSorted() as string] ?? null}
                                                </div>
                                                {header.column.getCanFilter() ? (
                                                    <div>
                                                        <Filter column={header.column} />
                                                    </div>
                                                ) : null}
                                            </>
                                        )}
                                    </th>

                                )
                            }
                            )}
                        </tr>
                    ))}
                </thead>
                <tbody>
                    {table
                        .getRowModel()
                        .rows
                        .map((row) => (
                            <tr key={row.id}>
                                {row.getVisibleCells().map((cell) => (
                                    <td title={cell.getValue() as string} key={cell.id}>
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                            </tr>
                        ))}
                </tbody>
            </table>
            <div style={{height: '0.5rem'}} />
            <div style={{"display":"flex","gap":"0.2rem","alignItems":"center"}}>
                <button
                    style={{"padding":"0.25rem","borderRadius":"0.25rem","borderWidth":"1px"}}
                    onClick={() => table.firstPage()}
                    disabled={!table.getCanPreviousPage()}
                >
                    {'<<'}
                </button>
                <button
                    style={{"padding":"0.25rem","borderRadius":"0.25rem","borderWidth":"1px"}}
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                >
                    {'<'}
                </button>
                <button
                    style={{"padding":"0.25rem","borderRadius":"0.25rem","borderWidth":"1px"}}
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                >
                    {'>'}
                </button>
                <button
                    style={{"padding":"0.25rem","borderRadius":"0.25rem","borderWidth":"1px"}}
                    onClick={() => table.lastPage()}
                    disabled={!table.getCanNextPage()}
                >
                    {'>>'}
                </button>
                <span style={{"display":"flex","gap":"0.25rem","alignItems":"center"}}>
                    <div>Page</div>
                    <strong>
                        {table.getState().pagination.pageIndex + 1} of{' '}
                        {table.getPageCount().toLocaleString()}
                    </strong>
                </span>
                <span style={{"display":"flex","gap":"0.25rem","alignItems":"center"}}>
                    | Go to page:
                    <input
                        type="number"
                        min="1"
                        max={table.getPageCount()}
                        defaultValue={table.getState().pagination.pageIndex + 1}
                        onChange={e => {
                            const page = e.target.value ? Number(e.target.value) - 1 : 0
                            table.setPageIndex(page)
                        }}
                        style={{"padding":"0.25rem","borderRadius":"0.25rem","borderWidth":"1px","width":"4rem"}}
                    />
                </span>
                <select
                    value={table.getState().pagination.pageSize}
                    onChange={e => {
                        table.setPageSize(Number(e.target.value))
                    }}
                >
                    {[10, 20, 30, 40, 50].map(pageSize => (
                        <option key={pageSize} value={pageSize}>
                            Show {pageSize}
                        </option>
                    ))}
                </select>
            </div>
        </>
    );
};

function Filter({ column }: { column: Column<any, unknown> }) {
    const columnFilterValue = column.getFilterValue();
    const { filterVariant } = column.columnDef.meta ?? {};

    return filterVariant === 'range' ? (
        <div>
            <div className="flex space-x-2">
                {/* See faceted column filters example for min max values functionality */}
                <DebouncedInput
                    type="number"
                    value={(columnFilterValue as [number, number])?.[0] ?? ''}
                    onChange={(value) =>
                        column.setFilterValue((old: [number, number]) => [value, old?.[1]])
                    }
                    placeholder={`Min`}
                    className="w-24 border shadow rounded"
                />
                <DebouncedInput
                    type="number"
                    value={(columnFilterValue as [number, number])?.[1] ?? ''}
                    onChange={(value) =>
                        column.setFilterValue((old: [number, number]) => [old?.[0], value])
                    }
                    placeholder={`Max`}
                    className="w-24 border shadow rounded"
                />
            </div>
            <div className="h-1" />
        </div>
    ) : filterVariant === 'select' ? (
        <select
            onChange={(e) => column.setFilterValue(e.target.value)}
            value={columnFilterValue?.toString()}
        >
            {/* See faceted column filters example for dynamic select options */}
            <option value="">All</option>
            <option value="complicated">complicated</option>
            <option value="relationship">relationship</option>
            <option value="single">single</option>
        </select>
    ) : filterVariant === 'none' ? (
        <div>
        </div>
    ) : (
        <DebouncedInput
            className="w-36 border shadow rounded"
            onChange={(value) => column.setFilterValue(value)}
            placeholder={`Search...`}
            type="text"
            value={(columnFilterValue ?? '') as string}
        />
        // See faceted column filters example for datalist search suggestions
    );
}

// A typical debounced input react component
function DebouncedInput({
    value: initialValue,
    onChange,
    debounce = 500,
    ...props
}: {
    value: string | number;
    onChange: (value: string | number) => void;
    debounce?: number;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>) {
    const [value, setValue] = useState(initialValue);

    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            onChange(value);
        }, debounce);

        return () => clearTimeout(timeout);
    }, [value, debounce, onChange]);

    return (
        <input
            {...props}
            value={value}
            onChange={(e) => setValue(e.target.value)}
        />
    );
}