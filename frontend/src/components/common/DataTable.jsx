// components/DataTable.jsx
import React, { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
} from "@tanstack/react-table";
import { TbSearch, TbArrowDown, TbArrowUp } from "react-icons/tb";
import { useLanguage } from "../../hooks/useLanguage";

const DataTable = ({
  data = [],
  columns=[],
  enableSearch = false,
  searchPlaceholder = '',
  children,
  rowSelection,
  setRowSelection,
  notFoundMessage
}) => {
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const { t } = useLanguage();

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
      rowSelection,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: "includesString",
    enableSorting: data.length > 1,
    onRowSelectionChange: setRowSelection,
  });

  return (
    <div>
      {enableSearch && (
        <div className="searchbar-table flex items-center gap-2.5 w-full border-0 px-6 py-4">
          <TbSearch className="text-secondary" />
          <input
            type="text"
            className="search-table focus:outline-0"
            placeholder={searchPlaceholder || t.common.dataTable.searchPlaceholder}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
        </div>
      )}
      {children && children}
      <div className="table-auto md:table-fixed w-full overflow-auto">
        <table className="table-main">
          <thead className="table-thead">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isSortable =
                    !("enableSorting" in header.column.columnDef) ||
                    header.column.columnDef.enableSorting !== false;
                  const sortDirection = header.column.getIsSorted();

                  return (
                    <th key={header.id} className={header.column.columnDef.meta?.className}>
                      <div
                        className={`icon-head flex items-center gap-1 ${
                          isSortable
                            ? "cursor-pointer select-none hover:opacity-80"
                            : ""
                        }`}
                        onClick={
                          isSortable
                            ? header.column.getToggleSortingHandler()
                            : undefined
                        }
                      >
                        <span>
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                        </span>
                          {isSortable && (
                            <span className="flex items-center">
                              {sortDirection === "asc" ? (
                                <TbArrowUp
                                  size={16}
                                  className="text-primary dark:text-gray-400 font-bold"
                                  strokeWidth={2.5}
                                />
                                ) : sortDirection === "desc" ? (
                                  <TbArrowDown
                                    size={16}
                                    className="text-primary dark:text-gray-400 font-bold"
                                    strokeWidth={2.5}
                                  />
                                ) : (
                                  <TbArrowDown
                                    size={16}
                                    strokeWidth={2.5}
                                    className="text-secondary dark:text-gray-400 opacity-40"
                                  />
                              )}
                            </span>
                          )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="table-body">
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
                      <div className="icon-head">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={table.getAllColumns().length}
                  className="text-center py-4 text-secondary"
                >
                  {notFoundMessage || t.common.dataTable.noRecordsFound}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;
