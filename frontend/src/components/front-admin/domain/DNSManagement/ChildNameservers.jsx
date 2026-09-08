import { NavLink } from "react-router";
import { useCallback, useMemo, useState, useEffect } from "react";
import { useAlert } from "../../../../context/AlertContext";
import { useDomain } from "../../../../hooks/useDomain";
import { useCustomLocation } from "../../../../hooks/useCustomLocation";
import { dnsAPI } from "../../../../api/domains";
import LoadingSpinner from "../../../common/LoadingSpinner";
import { useLanguage } from "../../../../hooks/useLanguage";

const ChildNameservers = ({ domainName }) => {
  const { showAlert } = useAlert();
  const { t } = useLanguage();
  const { viewDomain } = useDomain();
  const locationState = useCustomLocation();

  const activeDomainName = useMemo(() => {
    return (
      domainName ||
      locationState?.currentDomain?.websiteName ||
      viewDomain?.websiteName ||
      ""
    );
  }, [domainName, locationState, viewDomain]);

  // Get provider from domain data
  const provider = useMemo(() => {
    return (
      viewDomain?.provider ||
      locationState?.currentDomain?.provider ||
      "hostbay"
    ).toLowerCase();
  }, [viewDomain, locationState]);

  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [savingRowId, setSavingRowId] = useState(null);
  const [deletingRowId, setDeletingRowId] = useState(null);

  // Fetch existing child nameservers
  const fetchChildNameservers = useCallback(async () => {
    if (!activeDomainName) return;

    setIsLoading(true);
    try {
      const params = {
        websiteName: activeDomainName,
        provider: provider,
      };

      // For HostBay, domainNameId is not required
      if (provider !== "hostbay" && viewDomain?.domainNameId) {
        params.domainNameId = viewDomain.domainNameId;
      }

      const response = await dnsAPI.viewChildNameservers(params);

      if (
        response?.responseData?.childNameservers &&
        response.responseData.childNameservers.length > 0
      ) {
        const nameservers = response.responseData.childNameservers;
        const formattedRows = nameservers.map((ns, index) => {
          const fullHostname = ns.hostname || ns.host || "";
          const hostPart = fullHostname.includes(".")
            ? fullHostname.split(".")[0]
            : fullHostname;
          return {
            id: Date.now() + index,
            host: hostPart,
            ip: ns.ipAddress || ns.ip || "",
            originalHost: fullHostname,
            originalIP: ns.ipAddress || ns.ip,
          };
        });
        setRows(formattedRows);
      } else {
        setRows([
          { id: 1, host: "ns1", ip: "" },
        ]);
      }
    } catch (error) {
      console.error("Error fetching child nameservers:", error);
      setRows([
        { id: 1, host: "ns1", ip: "" },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [activeDomainName, provider, viewDomain]);

  useEffect(() => {
    fetchChildNameservers();
  }, [fetchChildNameservers]);

  const validateIPv4 = (value) => {
    // Basic IPv4 validation
    const ipv4Regex =
      /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/;
    return ipv4Regex.test(value);
  };

  const updateRow = useCallback((id, field, value) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  }, []);

  const handleSave = useCallback(
    async (row) => {
      if (!row.host) {
        showAlert(t.admin.childNameserverHostRequired, { type: "warning" });
        return;
      }
      if (!row.ip || !validateIPv4(row.ip)) {
        showAlert(t.admin.enterValidIpv4Address, { type: "warning" });
        return;
      }

      setSavingRowId(row.id);
      try {
        let hostName = row.host;
        if (!hostName.includes(".")) {
          hostName = `${hostName}.${activeDomainName}`;
        }

        const params = {
          websiteName: activeDomainName,
          hostName: hostName,
          ipAddress: row.ip,
          provider: provider,
        };

        if (provider !== "hostbay" && viewDomain?.domainNameId) {
          params.domainNameId = viewDomain.domainNameId;
        }

        let response;

        if (row.originalHost && row.originalHost !== hostName) {
          response = await dnsAPI.modifyChildNameserverHost({
            ...params,
            oldHostName: row.originalHost,
            newHostName: hostName,
          });
        } else if (
          row.originalHost &&
          row.originalIP &&
          row.originalIP !== row.ip
        ) {
          // IP changed - use modify IP
          response = await dnsAPI.modifyChildNameserverIP({
            ...params,
            oldIpAddress: row.originalIP,
            newIpAddress: row.ip,
          });
        } else if (
          row.originalHost &&
          row.originalIP === row.ip &&
          row.originalHost === hostName
        ) {
          showAlert(t.admin.noChangesDetected, { type: "info" });
          return;
        } else {
          response = await dnsAPI.addChildNameserver(params);
        }

        if (
          response?.responseMsg?.statusCode === 200 ||
          response?.responseData?.statusCode === 200
        ) {
          showAlert(
            response?.responseMsg?.message ||
            response?.responseData?.message ||
            t.admin.childNameserverSavedSuccess,
            { type: "success", duration: 2500 }
          );
          // Refresh the list
          await fetchChildNameservers();
        } else {
          const errorMsg =
            response?.responseMsg?.message ||
            response?.responseData?.message ||
            t.admin.failedToSaveChildNameserver;
          showAlert(errorMsg, { type: "warning" });
        }
      } catch (error) {
        const errorMsg =
          error?.response?.data?.responseMsg?.message ||
          error?.response?.data?.message ||
          error?.message ||
          t.admin.failedToSaveChildNameserver;
        showAlert(errorMsg, { type: "warning" });
        console.error("Error saving child nameserver:", error);
      } finally {
        setSavingRowId(null);
      }
    },
    [activeDomainName, provider, viewDomain, showAlert, fetchChildNameservers]
  );

  const handleRemove = useCallback(
    async (id) => {
      const row = rows.find((r) => r.id === id);
      if (!row || !row.originalHost) {
        setRows((prev) => prev.filter((r) => r.id !== id));
        return;
      }

      setDeletingRowId(id);
      try {
        const hostName =
          row.originalHost ||
          (row.host.includes(".")
            ? row.host
            : `${row.host}.${activeDomainName}`);

        const params = {
          websiteName: activeDomainName,
          hostName: hostName,
          provider: provider,
        };

        if (provider !== "hostbay" && viewDomain?.domainNameId) {
          params.domainNameId = viewDomain.domainNameId;
        }

        const response = await dnsAPI.deleteChildNameserver(params);

        if (
          response?.responseMsg?.statusCode === 200 ||
          response?.responseData?.statusCode === 200
        ) {
          showAlert(
            response?.responseMsg?.message ||
            response?.responseData?.message ||
            t.admin.childNameserverDeletedSuccess,
            { type: "success", duration: 2500 }
          );
          // Refresh the list
          await fetchChildNameservers();
        } else {
          const errorMsg =
            response?.responseMsg?.message ||
            response?.responseData?.message ||
            t.admin.failedToDeleteChildNameserver;
          showAlert(errorMsg, { type: "warning" });
        }
      } catch (error) {
        const errorMsg =
          error?.response?.data?.responseMsg?.message ||
          error?.response?.data?.message ||
          error?.message ||
          t.admin.failedToDeleteChildNameserver;
        showAlert(errorMsg, { type: "warning" });
        console.error("Error deleting child nameserver:", error);
      } finally {
        setDeletingRowId(null);
      }
    },
    [
      rows,
      activeDomainName,
      provider,
      viewDomain,
      showAlert,
      fetchChildNameservers,
    ]
  );

  const handleAddMore = useCallback(() => {
    setRows((prev) => {
      const nextIndex = prev.length + 1;
      return [...prev, { id: Date.now(), host: `ns${nextIndex}`, ip: "" }];
    });
  }, []);

  return (
    <div className="py-7 px-5 space-y-4">
      <div className="flex items-center gap-2 info-detail w-full">
        <span className="text-secondary">
          {t.admin.childNameserversDescription}
        </span>
      </div>

      {rows.map((row, index) => {
        const hostId = `child-host-${row.id}`;
        const ipId = `child-ip-${row.id}`;
        const labelText = `${t.admin.childNameserver} ${index + 1} *`;
        return (
          <div
            key={row.id}
            className="flex lg:flex-row flex-col items-center gap-2"
          >
            <div className={`flex sm:flex-row flex-col w-full lg:w-1/2 `}>
              <div className="relative w-full">
                <input
                  type="text"
                  className="input-field admin-form peer w-full sm:!rounded-e-none max-sm:!rounded-b-none "
                  id={hostId}
                  value={row.host}
                  onChange={(e) => updateRow(row.id, "host", e.target.value)}
                  disabled={savingRowId === row.id || deletingRowId === row.id || isLoading}
                />
                <label
                  htmlFor={hostId}
                  className={`absolute left-5 transition-all font-medium ${row.host
                    ? "top-2 text-xs text-gray-600"
                    : "top-4 text-13 text-primary dark:text-gray-500 "
                    } peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}
                >
                  {labelText}
                </label>
              </div>
              <button
                type="button"
                className="px-5 py-3 bg-mutebg dark:bg-gray-800 flex items-center justify-start text-13 font-medium text-primary dark:text-white border border-darkbtn-200 sm:border-l-0 sm:rounded-r-md  rounded-b-md sm:rounded-l-none whitespace-nowrap"
              >
                {activeDomainName || "example.com"}
              </button>
            </div>

            <div className="relative w-full lg:w-[20%]">
              <input
                type="text"
                className="input-field admin-form peer w-full"
                id={ipId}
                value={row.ip}
                onChange={(e) => updateRow(row.id, "ip", e.target.value)}
                disabled={savingRowId === row.id || deletingRowId === row.id || isLoading}
              />
              <label
                htmlFor={ipId}
                className={`absolute left-5 transition-all font-medium ${row.ip
                  ? "top-2 text-xs text-gray-600"
                  : "top-4 text-13 text-primary dark:text-gray-500 "
                  } peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}
              >
                {t.admin.ipv4Address}
              </label>
            </div>

            <div className="flex items-center admin-btn gap-2 w-full lg:w-[30%]">
              <NavLink
                onClick={() => handleSave(row)}
                className={`add-to-cart !py-7 sm:w-auto !w-full flex items-center justify-center gap-2 ${savingRowId === row.id || deletingRowId === row.id || isLoading ? "disable" : ""
                  }`}
                disabled={savingRowId === row.id || deletingRowId === row.id || isLoading}
              >
                {savingRowId === row.id ? (
                  <>
                    <LoadingSpinner size="sm" text="" />
                    <span>{t.admin.saving}</span>
                  </>
                ) : (
                  t.admin.save
                )}
              </NavLink>
              <NavLink
                onClick={() => handleRemove(row.id)}
                className={`btn-outline !py-7 sm:w-auto !w-full flex items-center justify-center gap-2 ${savingRowId === row.id || deletingRowId === row.id || isLoading ? "disable" : ""
                  }`}
                disabled={savingRowId === row.id || deletingRowId === row.id || isLoading}
              >
                {deletingRowId === row.id ? (
                  <>
                    <LoadingSpinner size="sm" text="" />
                    <span>{t.admin.removing}</span>
                  </>
                ) : (
                  t.admin.remove
                )}
              </NavLink>
            </div>
          </div>
        );
      })}

      <div className="flex items-center admin-btn gap-2">
        <NavLink
          onClick={handleAddMore}
          className={`btn-outline ${savingRowId !== null || deletingRowId !== null || isLoading ? "disable" : ""
            }`}
          disabled={savingRowId !== null || deletingRowId !== null || isLoading}
        >
          {t.admin.addMore}
        </NavLink>
      </div>

      {isLoading && (
        <div className="text-center py-4">
          <div className="text-secondary">{t.admin.loadingChildNameservers}</div>
        </div>
      )}
    </div>
  );
};

export default ChildNameservers;
