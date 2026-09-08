import React, { useState } from "react";
import { FiInfo } from "react-icons/fi";
import { NavLink } from "react-router";
import DataTable from "../../../components/common/DataTable";
import { Tooltip } from "react-tooltip";
import { IoClose } from "react-icons/io5";
import { useDomain } from "../../../hooks/useDomain";
import ManageAutoRenewal from "../../../components/modals/selected-row/manage-auto-renewal";
import ManagePrivacyProtection from "../../../components/modals/selected-row/privacy-protection/manage-privacy-protection";
import ManageDomainLock from "../../../components/modals/selected-row/domain-lock/manage-domain-lock";
import ChangeNameServer from "../../../components/modals/selected-row/change-nameserver/change-nameserver";
import ManageDomainForwarding from "../../../components/modals/selected-row/domain-forwarding/manage-domain-forwarding";
import { useLanguage } from "../../../hooks/useLanguage";

const ExternalDomain = () => {
  const { t } = useLanguage();
  const [rowSelection, setRowSelection] = useState({});
  const [externalDomains] = useState([
    {
      id: "1",
      domainName: "nordify.com",
    },
    {
      id: "2",
      domainName: "specify.com",
    },
  ]);
  const [isOpen, setIsOpen] = useState(false);
  const [isPrivacyProtection, setIsPrivacyProtection] = useState(false);
  const [isDomain, setIsDomain] = useState(false);
  const [isNameServer, setIsNameServer] = useState(false);
  const [isDomainForwarding, setIsDomainForwarding] = useState(false);
  const { domains, fetchDomains } = useDomain();

  const columns = [
    {
      id: "select",
      meta: {
        className: "w-14",
      },
      header: ({ table }) => (
        <div className="text-center w-14">
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            className="cursor-pointer"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-center w-14">
          <input
            type="checkbox"
            className="cursor-pointer"
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onChange={row.getToggleSelectedHandler()}
          />
        </div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "domainName",
      header:
        t.admin?.externalDomains?.columns?.domainName ||
        t.admin?.domainList?.columns?.domainName ||
        "Domain Name",
    },
    {
      id: "actions",
      header:
        t.admin?.externalDomains?.columns?.actions ||
        t.admin?.actions ||
        "Actions",
      enableSorting: false,
      meta: {
        className: "lg:w-xs",
      },
      cell: () => (
        <>
          <NavLink to={`/dns-management`} className="btn-outline">
            {t.admin?.externalDomains?.rowActions?.editDns ||
              t.admin?.dns ||
              "Edit DNS"}
          </NavLink>
        </>
      ),
    },
  ];

  const getSelectedDomains = React.useCallback(() => {
      if (!domains || !Array.isArray(domains)) return [];
      const selectedIndices = Object.keys(rowSelection).map(Number);
      return domains.filter((_, index) => selectedIndices.includes(index));
    }, [domains, rowSelection]);

  return (
    <>
      <div>
        <p className="card-admin-title flex gap-2 items-center">
          {t.admin?.externalDomains?.title || "External Domains"}
          <FiInfo data-tooltip-id="control-panel" data-tooltip-place="right" />
        </p>
        <Tooltip id="control-panel" clickable className="tooltip">
          <div>
            <div className="flex flex-col gap-2.5 text-left">
              <span>
                {t.admin?.externalDomains?.tooltipDescription ||
                  "Websites hosted outside your organization's network or security perimeter. These may have different security policies and compliance standards."}
              </span>
            </div>
          </div>
        </Tooltip>
        <div className="table-card">
          <DataTable
            data={externalDomains}
            columns={columns}
            enableSearch={true}
            searchPlaceholder={
              t.admin?.externalDomains?.searchPlaceholder ||
              t.common?.dataTable?.searchPlaceholder ||
              "Search domains"
            }
            rowSelection={rowSelection}
            setRowSelection={setRowSelection}
          >
            {Object.keys(rowSelection).length > 0 && (
              <div className="w-full py-2.5 md:px-7 px-3 bg-active-border dark:bg-gray-700 text-light-purple dark:text-gray-200">
                <div className="flex flex-wrap gap-4 lg:gap-7">
                  
                  {/* selected items */}
                  <div className="flex items-center gap-2.5">
                    <IoClose
                      size={20}
                      className="cursor-pointer"
                      onClick={() => setRowSelection({})}
                    />
                    <p className="font-13 font-medium">
                      {Object.keys(rowSelection).length}{" "}
                      {t.admin?.externalDomains?.bulkBar?.selectedDomains ||
                        t.admin?.domainList?.bulkBar?.selectedDomains ||
                        "domains selected"}
                    </p>
                  </div>

                  {/* buttons */}
                  <div className="flex gap-2.5 items-center flex-wrap">
                    <button
                      className="selected-items-buttons"
                      onClick={() => setIsOpen(true)}
                    >
                      {t.admin?.externalDomains?.bulkBar?.autoRenew ||
                        t.admin?.domainList?.bulkBar?.autoRenew ||
                        t.admin?.autoRenew ||
                        "Auto-renew"}
                    </button>

                    {isOpen && (
                      <ManageAutoRenewal
                        selectedDomains={getSelectedDomains()}
                        onClose={() => {
                          setIsOpen(false);
                          setRowSelection({});
                          if (fetchDomains) fetchDomains();
                        }}
                      />
                    )}

                    <button
                      className="selected-items-buttons"
                      onClick={() => setIsPrivacyProtection(true)}
                    >
                      {t.admin?.externalDomains?.bulkBar?.privacyProtection ||
                        t.admin?.domainList?.bulkBar?.privacyProtection ||
                        t.admin?.whoisProtection ||
                        "Privacy protection"}
                    </button>

                    {isPrivacyProtection && (
                      <ManagePrivacyProtection
                        onClose={() => setIsPrivacyProtection(false)}
                      />
                    )}

                    <button
                      className="selected-items-buttons"
                      onClick={() => setIsDomain(true)}
                    >
                      {t.admin?.externalDomains?.bulkBar?.domainLock ||
                        t.admin?.domainList?.bulkBar?.domainLock ||
                        t.admin?.domainLock ||
                        "Domain lock"}
                    </button>

                    {isDomain && (
                      <ManageDomainLock
                        selectedDomains={getSelectedDomains()}
                        onClose={() => {
                          setIsDomain(false);
                          setRowSelection({});
                          if (fetchDomains) fetchDomains();
                        }}
                      />
                    )}

                    <button
                      className="selected-items-buttons"
                      onClick={() => setIsNameServer(true)}
                    >
                      {t.admin?.externalDomains?.bulkBar?.changeNameservers ||
                        t.admin?.domainList?.bulkBar?.changeNameservers ||
                        t.admin?.changeNameservers ||
                        "Change nameservers"}
                    </button>

                    {isNameServer && (
                      <ChangeNameServer
                        selectedDomains={getSelectedDomains()}
                        onClose={() => {
                          setIsNameServer(false);
                          setRowSelection({});
                          if (fetchDomains) fetchDomains();
                        }}
                      />
                    )}

                    <button
                      className="selected-items-buttons"
                      onClick={() => setIsDomainForwarding(true)}
                    >
                      {t.admin?.externalDomains?.bulkBar?.domainForwarding ||
                        t.admin?.domainList?.bulkBar?.domainForwarding ||
                        t.admin?.manageDomainForwarding ||
                        "Domain forwarding"}
                    </button>

                    {isDomainForwarding && (
                      <ManageDomainForwarding
                        selectedDomains={getSelectedDomains()}
                        onClose={() => {
                          setIsDomainForwarding(false);
                          setRowSelection({});
                          if (fetchDomains) fetchDomains();
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </DataTable>
        </div>

      </div>
    </>
  );
};

export default ExternalDomain;
