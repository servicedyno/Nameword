import React, { useState } from "react";
import { NavLink } from "react-router";
import { useDomain } from "../../../hooks/useDomain";
import ManagePrivacyProtection from "../../../components/modals/selected-row/privacy-protection/manage-privacy-protection";
import ManageAutoRenewal from "../../../components/modals/selected-row/manage-auto-renewal";
import ManageDomainLock from "../../../components/modals/selected-row/domain-lock/manage-domain-lock";
import ChangeNameServer from "../../../components/modals/selected-row/change-nameserver/change-nameserver";
import ManageDomainForwarding from "../../../components/modals/selected-row/domain-forwarding/manage-domain-forwarding";
import RenewDomainModal from "../../../components/modals/renew-domain-modal";
import { IoClose } from "react-icons/io5";
import DataTable from "../../../components/common/DataTable";
import { TbDots } from "react-icons/tb";
import { FiCheck } from "react-icons/fi";
import useDropdown from "../../../hooks/useDropdown";
import { useLanguage } from "../../../hooks/useLanguage";

const DomainList = () => {
  const { t } = useLanguage();

  const [isOpen, setIsOpen] = useState(false);
  const [isSingleAutoRenewOpen, setIsSingleAutoRenewOpen] = useState(false);
  const [selectedSingleDomain, setSelectedSingleDomain] = useState(null);
  const [isPrivacyProtection, setIsPrivacyProtection] = useState(false);
  const [isDomain, setIsDomain] = useState(false);
  const [isSingleDomainLockOpen, setIsSingleDomainLockOpen] = useState(false);
  const [selectedSingleDomainLock, setSelectedSingleDomainLock] =
    useState(null);
  const [isNameServer, setIsNameServer] = useState(false);
  const [isDomainForwarding, setIsDomainForwarding] = useState(false);
  const [rowSelection, setRowSelection] = useState({});
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [selectedDomainForRenew, setSelectedDomainForRenew] = useState(null);

  const { domains, fetchDomains, removeDomain } = useDomain();

  // Map raw status values from API to translated labels
  const getStatusLabel = (status) => {
    if (!status) return "";

    const normalized = status.toString().trim().toLowerCase();

    const statusMap = {
      active:
        t.admin?.statusActive ||
        t.admin?.status ||
        "Active",
      successful:
        t.admin?.statusSuccessful ||
        t.admin?.status ||
        "Successful",
      success:
        t.admin?.statusSuccess ||
        t.admin?.status ||
        "Success",
      expired:
        t.admin?.statusExpired ||
        t.admin?.status ||
        "Expired",
      "expiring soon":
        t.admin?.statusExpiringSoon ||
        t.admin?.status ||
        "Expiring Soon",
      pending:
        t.admin?.statusPending ||
        t.admin?.status ||
        "Pending",
      "on hold":
        t.admin?.statusOnHold ||
        t.admin?.status ||
        "On Hold",
      "renewal due":
        t.admin?.statusRenewalDue ||
        t.admin?.status ||
        "Renewal Due",
      requested:
        t.admin?.statusRequested ||
        t.admin?.status ||
        "Requested",
      inactive:
        t.admin?.statusInactive ||
        t.admin?.status ||
        "Inactive",
    };

    return statusMap[normalized] || status;
  };

  // Get selected domains from rowSelection
  const getSelectedDomains = React.useCallback(() => {
    if (!domains || !Array.isArray(domains)) return [];
    const selectedIndices = Object.keys(rowSelection).map(Number);
    return domains.filter((_, index) => selectedIndices.includes(index));
  }, [domains, rowSelection]);

  // Auto-renewal toggle component
  const AutoRenewToggle = ({ domain }) => {
    const normalizeAutoRenew = (value) => {
      if (typeof value === "boolean") return value;
      if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        return (
          normalized === "enabled" ||
          normalized === "true" ||
          normalized === "yes" ||
          normalized === "active"
        );
      }
      return false;
    };

    const isAutoRenew = normalizeAutoRenew(domain?.autorenew);

    const handleToggle = () => {
      setSelectedSingleDomain(domain);
      setIsSingleAutoRenewOpen(true);
    };

    return (
      <button
        onClick={handleToggle}
        className={`w-12 h-6 flex items-center rounded-full border border-active-border p-1.5 transition-colors duration-300 bg-white cursor-pointer`}
      >
        <span
          className={`w-4 h-4 rounded-full shadow-md transform transition-transform ${
            isAutoRenew
              ? "translate-x-5 bg-indigo-800"
              : "-translate-x-0.5 bg-secondary"
          }`}
        ></span>
      </button>
    );
  };

  const RowActions = ({ row }) => {
    const dropdown = useDropdown();

    const handleRenewClick = () => {
      setSelectedDomainForRenew(row.original);
      setIsRenewModalOpen(true);
    };

    return (
      <>
        <button className="btn-outline" onClick={handleRenewClick}>
          {t.admin?.domainList?.rowActions?.renew || t.admin?.renew || "Renew"}
        </button>
        <NavLink
          to={`/domain-overview/${encodeURIComponent(
            row.original.websiteName
          )}`}
          className={"btn-outline"}
        >
          {t.admin?.domainList?.rowActions?.manage || t.admin?.websites || "Manage"}
        </NavLink>
        <div ref={dropdown.ref} className="relative">
          <button onClick={dropdown.toggle} className="btn-outline btn-icon">
            <TbDots />
          </button>
          {dropdown.isOpen && (
            <div
              className={`user-dropdown !border-darkbtn-200 dark:!border-gray-900 ${
                dropdown.isPositioned ? "show" : ""
              }`}
              style={dropdown.positionStyle}
            >
              <div className="p-3">
                <NavLink
                  to={`/domain-overview/${encodeURIComponent(
                    row.original.websiteName
                  )}`}
                  className="user-menu hover:!bg-hover"
                >
                  {t.admin?.domainList?.rowActions?.managePlan ||
                    t.admin?.managePlan ||
                    "Manage Plan"}
                </NavLink>
                <button
                  type="button"
                  onClick={() => removeDomain(row.original.id)}
                  className="user-menu red-color hover:!bg-hover"
                >
                  {t.admin?.domainList?.rowActions?.delete ||
                    t.pages?.websites?.websitesList?.delete ||
                    "Delete"}
                </button>
              </div>
            </div>
          )}
        </div>
      </>
    );
  };

  const columns = [
    {
      id: "select",
      meta: {
        className: "w-14"
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
      accessorKey: "websiteName",
      header:
        t.admin?.domainList?.columns?.domainName ||
        t.admin?.domainName ||
        "Domain Name",
    },
    {
      accessorKey: "status",
      header:
        t.admin?.domainList?.columns?.status ||
        t.admin?.status ||
        "Status",
      cell: ({ row }) => (
        <p className="flex items-center gap-1 text-sucess-400">
          <FiCheck /> {getStatusLabel(row.original.status)}
        </p>
      ),
    },
    {
      accessorFn: (row) => {
        const dateObj = new Date(row.expirationDate);
        return `${dateObj.toLocaleDateString("en-CA")}`;
      },
      header:
        t.admin?.domainList?.columns?.expires ||
        "Expires",
      cell: ({ row }) => {
        const dateObj = new Date(row.original?.expirationDate);
        const date = dateObj.toLocaleDateString("en-CA");

        return (
          <div className="flex flex-col">
            <p>{date}</p>
          </div>
        );
      },
    },
    {
      header:
        t.admin?.domainList?.columns?.autoRenewal ||
        t.admin?.autoRenewal ||
        "Auto-renewal",
      enableSorting: false,
      cell: ({ row }) => <AutoRenewToggle domain={row.original} />,
    },
    {
      id: "actions",
      header:
        t.admin?.domainList?.columns?.actions ||
        t.admin?.actions ||
        "Actions",
      enableSorting: false,
      // cell: ({ row }) => (
      //   <>
      //     <button className="btn-outline">Renew</button>
      //     <NavLink
      //       to={`/domain-overview`}
      //       state={{ currentDomain: row.original }}
      //       className={"btn-outline"}
      //     >
      //       Manage
      //     </NavLink>
      //     <div ref={actionDropDown.ref} className="relative">
      //       <button
      //         onClick={actionDropDown.toggle}
      //         className="btn-outline btn-icon"
      //       >
      //         <TbDots />
      //       </button>
      //       {actionDropDown.isOpen && (
      //         <div
      //           className={`user-dropdown !border-darkbtn-200 dark:!border-gray-900 ${
      //             actionDropDown.dropUp ? "" : ""
      //           }`}
      //           style={actionDropDown.positionStyle}
      //         >
      //           <div className="p-3">
      //             <NavLink
      //               to={`/domain-overview`}
      //               state={{ currentDomain: row.original }}
      //               className="user-menu hover:!bg-hover"
      //             >
      //               Manage Plan
      //             </NavLink>
      //             <NavLink
      //               to={""}
      //               className="user-menu red-color hover:!bg-hover"
      //             >
      //               Delete
      //             </NavLink>
      //           </div>
      //         </div>
      //       )}
      //     </div>
      //   </>
      // ),

      cell: ({ row }) => <RowActions row={row} />,
    },
  ];

  return (
    <>
      <div>
        <p className="card-admin-title">
          {t.admin?.domainList?.title || t.admin?.domainPortfolio || "Domain List"}
        </p>
        <div className="table-card">
          <DataTable
            data={domains}
            // data={tableData}
            columns={columns}
            enableSearch={true}
            searchPlaceholder={
              t.admin?.domainList?.searchPlaceholder ||
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
                      {" "}
                      {Object.keys(rowSelection).length}{" "}
                      {t.admin?.domainList?.bulkBar?.selectedDomains ||
                        "domains selected"}
                    </p>
                  </div>

                  {/* buttons */}
                  <div className="flex gap-2.5 items-center flex-wrap">
                    <button
                      className="selected-items-buttons"
                      onClick={() => setIsOpen(true)}
                    >
                      {t.admin?.domainList?.bulkBar?.autoRenew ||
                        t.admin?.autoRenew ||
                        "Auto-renew"}
                    </button>
                    {/* Auto-renew Modal */}
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
                      {t.admin?.domainList?.bulkBar?.privacyProtection ||
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
                      {t.admin?.domainList?.bulkBar?.domainLock ||
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
                      {t.admin?.domainList?.bulkBar?.changeNameservers ||
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
                      {t.admin?.domainList?.bulkBar?.domainForwarding ||
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

      {/* Single Domain Auto-Renewal Modal */}
      {isSingleAutoRenewOpen && selectedSingleDomain && (
        <ManageAutoRenewal
          selectedDomains={[selectedSingleDomain]}
          onClose={() => {
            setIsSingleAutoRenewOpen(false);
            setSelectedSingleDomain(null);
            if (fetchDomains) fetchDomains();
          }}
        />
      )}

      {/* Single Domain Lock Modal */}
      {isSingleDomainLockOpen && selectedSingleDomainLock && (
        <ManageDomainLock
          selectedDomains={[selectedSingleDomainLock]}
          onClose={() => {
            setIsSingleDomainLockOpen(false);
            setSelectedSingleDomainLock(null);
            if (fetchDomains) fetchDomains();
          }}
        />
      )}

      {/* Renew Domain Modal */}
      {isRenewModalOpen && selectedDomainForRenew && (
        <RenewDomainModal
          onClose={() => {
            setIsRenewModalOpen(false);
            setSelectedDomainForRenew(null);
            if (fetchDomains) fetchDomains();
          }}
          domainName={selectedDomainForRenew.websiteName}
          pricingProvider={
            selectedDomainForRenew.provider?.toLowerCase() === "hostbay"
              ? "openprovider"
              : selectedDomainForRenew.provider?.toLowerCase() || "openprovider"
          }
          currentExpiration={selectedDomainForRenew.expirationDate}
          domainNameId={
            selectedDomainForRenew.domainNameId ||
            selectedDomainForRenew.id ||
            null
          }
        />
      )}
    </>
  );
};

export default DomainList;

// status pending design

/*<div className='icon-head'>
                                            <p className='flex items-center gap-1 text-indigo-400 tooltip-container'>
                                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <g clip-path="url(#clip0_963_4783)">
                                                        <path d="M7 0.875C5.78859 0.875 4.60439 1.23423 3.59713 1.90725C2.58988 2.58027 1.80483 3.53687 1.34124 4.65606C0.877654 5.77526 0.756358 7.00679 0.992693 8.19493C1.22903 9.38306 1.81238 10.4744 2.66897 11.331C3.52557 12.1876 4.61694 12.771 5.80507 13.0073C6.99321 13.2436 8.22474 13.1223 9.34394 12.6588C10.4631 12.1952 11.4197 11.4101 12.0928 10.4029C12.7658 9.39562 13.125 8.21141 13.125 7C13.1231 5.37612 12.4772 3.81928 11.329 2.67102C10.1807 1.52276 8.62389 0.876853 7 0.875ZM7 12.25C5.60762 12.25 4.27226 11.6969 3.28769 10.7123C2.30313 9.72774 1.75 8.39239 1.75 7C1.75 5.60761 2.30313 4.27226 3.28769 3.28769C4.27226 2.30312 5.60762 1.75 7 1.75V7L10.7104 10.7104C10.2239 11.1988 9.64561 11.5863 9.00885 11.8505C8.37209 12.1147 7.6894 12.2505 7 12.25Z" fill="#6C83F2" />
                                                    </g>
                                                    <defs>
                                                        <clipPath id="clip0_963_4783">
                                                            <rect width="14" height="14" fill="white" />
                                                        </clipPath>
                                                    </defs>
                                                </svg>
                                                Pending <FiInfo className="text-primary dark:text-gray-300" data-tooltip-id="tooltip-finish" data-tooltip-place="bottom" />
                                                <Tooltip id="tooltip-finish" clickable className="tooltip">
                                                    <div>
                                                        <div className="flex flex-col gap-2.5 text-center">
                                                            <span>Finish setup by entering domain contact info</span>
                                                        </div>
                                                    </div>
                                                </Tooltip>
                                            </p>
                                        </div> */
