import { NavLink } from "react-router";
import { useLanguage } from "../../../hooks/useLanguage";

const NA = "N/A";

const HostingDetailsCard = ({ hostingOrder, resolvedPlan }) => {
    const { t } = useLanguage();

    // Prefer plan from API (resolvedPlan has disk_space_gb, bandwidth_gb, etc.); else order snapshot
    const planDetails = hostingOrder?.hostbayResponse?.plan_details || {};
    const planSnapshot = hostingOrder?.planSnapshot || {};
    const plan = resolvedPlan ? { ...resolvedPlan } : { ...planDetails, ...planSnapshot };

    // Disk Space – from API: disk_space_gb (e.g. 50, 100, 200)
    const diskSpaceRaw =
        plan.disk_space_gb ??
        plan.disk_space ??
        plan.disk ??
        plan.storage;
    const diskSpace =
        diskSpaceRaw == null || diskSpaceRaw === ""
            ? NA
            : typeof diskSpaceRaw === "number"
            ? `${diskSpaceRaw} GB`
            : String(diskSpaceRaw);

    // RAM – API doesn't provide; from order only
    const ramRaw = plan.ram ?? plan.memory;
    const ram = ramRaw == null || ramRaw === "" ? NA : String(ramRaw);

    // CPU cores – API doesn't provide
    const cpuRaw = plan.cpu_cores ?? plan.cpu;
    const cpuCores = cpuRaw == null || cpuRaw === "" ? NA : String(cpuRaw);

    // Inodes – API doesn't provide
    const inodesRaw = plan.inodes;
    const inodes = inodesRaw == null || inodesRaw === "" ? NA : String(inodesRaw);

    // Addons / Websites – API has subdomains; use addons/websites if present
    const addonsRaw = plan.addons ?? plan.websites ?? plan.subdomains;
    const addonsWebsites =
        addonsRaw == null || addonsRaw === "" ? NA : String(addonsRaw);

    // Max processes – API doesn't provide
    const maxProcRaw = plan.max_processes;
    const maxProcesses =
        maxProcRaw == null || maxProcRaw === "" ? NA : String(maxProcRaw);

    // PHP workers – API doesn't provide
    const phpRaw = plan.php_workers;
    const phpWorkers =
        phpRaw == null || phpRaw === "" ? NA : String(phpRaw);

    // Bandwidth – from API: bandwidth_gb (e.g. 500, 1000, 2000)
    const bandwidthRaw =
        plan.bandwidth_gb ??
        plan.bandwidth ??
        plan.transfer;

    let bandwidth;
    if (bandwidthRaw == null || bandwidthRaw === "") {
        bandwidth = NA;
    } else if (bandwidthRaw === "Unlimited" || bandwidthRaw === -1) {
        bandwidth = t.admin.unlimited;
    } else if (typeof bandwidthRaw === "number") {
        bandwidth = `${bandwidthRaw} GB`;
    } else {
        bandwidth = String(bandwidthRaw);
    }

    return (
        <div className='table-card'>
            <div className='flex flex-wrap justify-between items-center gap-2 px-5 py-2.5'>
                <p className="info-card-title">{t.admin.hostingDetails}</p>
                <div className="flex gap-1 justify-end">
                    <NavLink to="/renew-plan" className='btn-outline small'>{t.admin.renew}</NavLink>
                    <NavLink to="/upgrade-plan" className='btn-outline small'>{t.admin.upgrade}</NavLink>
                </div>
            </div>
            <hr className='card-divider' />

            <div className="py-7 px-5 space-y-4 card-essential">
                <div className="flex items-center gap-2 info-detail">
                    <p className="text-secondary">{t.admin.diskSpace}</p>
                    <span className="text-primary dark:text-white">{diskSpace}</span>
                </div>
                <div className="flex items-center gap-2 info-detail">
                    <p className="text-secondary">{t.admin.ram}</p>
                    <span className="text-primary dark:text-white">{ram}</span>
                </div>
                <div className="flex items-center gap-2 info-detail">
                    <p className="text-secondary">{t.admin.cpuCores}</p>
                    <span className="text-primary dark:text-white">{cpuCores}</span>
                </div>
                <div className="flex items-center gap-2 info-detail">
                    <p className="text-secondary">{t.admin.inodes}</p>
                    <span className="text-primary dark:text-white">{inodes}</span>
                </div>
                <div className="flex items-center gap-2 info-detail">
                    <p className="text-secondary">{t.admin.addonsWebsites}</p>
                    <span className="text-primary dark:text-white">{addonsWebsites}</span>
                </div>
                <div className="flex items-center gap-2 info-detail">
                    <p className="text-secondary">{t.admin.maxProcesses}</p>
                    <span className="text-primary dark:text-white">{maxProcesses}</span>
                </div>
                <div className="flex items-center gap-2 info-detail">
                    <p className="text-secondary">{t.admin.phpWorkers}</p>
                    <span className="text-primary dark:text-white">{phpWorkers}</span>
                </div>
                <div className="flex items-center gap-2 info-detail">
                    <p className="text-secondary">{t.admin.bandwidth}</p>
                    <span className="text-primary dark:text-white">{bandwidth}</span>
                </div>
            </div>
        </div>
    )
}

export default HostingDetailsCard