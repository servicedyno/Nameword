import React, { useState } from "react";
import { createPortal } from "react-dom";
import { FiX, FiCheckCircle, FiAlertTriangle } from "react-icons/fi";
import resellerAPI from "../../api/reseller";
import WalletNudge from "../reseller/WalletNudge";
import { useAlert } from "../../context/AlertContext";

const money = (n) =>
  n === null || n === undefined || isNaN(Number(n)) ? "—" : `$${Number(n).toFixed(2)}`;

// Self-contained "Register a domain" modal (portaled to document.body). Reused by
// the public landing-page search and the signed-in domains hub. Runs against the
// Nomadly reseller proxy; in dry_run mode it returns a priced preview and never
// charges the wallet.
export default function RegisterDomainModal({ reg, account, onClose, onRegistered }) {
  const { showAlert } = useAlert();
  const [nsChoice, setNsChoice] = useState("cloudflare");
  const [customNs, setCustomNs] = useState("");
  const [registering, setRegistering] = useState(false);
  const [regResult, setRegResult] = useState(null);

  if (!reg) return null;

  const submitRegister = async () => {
    setRegistering(true);
    setRegResult(null);
    try {
      const payload = { domain: reg.domain };
      if (nsChoice === "custom") {
        payload.nameservers = customNs
          .split(/[\s,]+/)
          .map((x) => x.trim())
          .filter(Boolean);
      } else {
        payload.ns_choice = nsChoice;
      }
      const res = await resellerAPI.registerDomain(payload);
      setRegResult(res);
      if (res?.mode === "live" && res?.result?.success) {
        showAlert("Domain registered.", { type: "success" });
        onRegistered && onRegistered();
      }
    } catch (err) {
      const data = err?.response?.data;
      setRegResult({ _error: true, ...(data || { message: "Registration failed." }) });
      showAlert(data?.message || "Registration failed.", { type: "fail" });
    } finally {
      setRegistering(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-lightgray dark:border-gray-800">
          <h3 className="text-lg font-semibold text-primary dark:text-white">Register {reg.domain}</h3>
          <button onClick={onClose} className="text-secondary hover:text-primary dark:hover:text-white" aria-label="Close"><FiX size={22} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="rounded-lg bg-lightgray-200 dark:bg-gray-800 p-4 flex items-center justify-between">
            <span className="font-medium text-primary dark:text-white">{reg.domain}</span>
            <span className="font-bold text-primary dark:text-white">{money(reg.price_usd)}<span className="text-secondary text-sm font-normal">/yr</span></span>
          </div>

          {!regResult && (
            <>
              <div>
                <label className="block text-sm font-medium text-primary dark:text-white mb-1">DNS / Nameservers</label>
                <select value={nsChoice} onChange={(e) => setNsChoice(e.target.value)} className="w-full appearance-none rounded-xl border border-line dark:border-gray-700 bg-white dark:bg-gray-800 text-primary dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/15">
                  <option value="cloudflare">Cloudflare DNS (recommended)</option>
                  <option value="registrar">Registrar default</option>
                  <option value="custom">Custom nameservers</option>
                </select>
              </div>
              {nsChoice === "custom" && (
                <div>
                  <label className="block text-sm font-medium text-primary dark:text-white mb-1">Custom nameservers</label>
                  <textarea value={customNs} onChange={(e) => setCustomNs(e.target.value)} rows={2} placeholder="ns1.example.com, ns2.example.com" className="w-full rounded-xl border border-line dark:border-gray-700 bg-white dark:bg-gray-800 text-primary dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/15" />
                  <p className="text-xs text-secondary dark:text-gray-400 mt-1">Separate with commas or spaces (at least two).</p>
                </div>
              )}
              <WalletNudge balance={account?.wallet_balance_usd} price={reg.price_usd} />
            </>
          )}

          {regResult && !regResult._error && regResult.mode === "dry_run" && (
            <div className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 text-sm">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-semibold mb-2"><FiCheckCircle /> Simulated (test mode)</div>
              <p className="text-amber-800 dark:text-amber-200">Priced at <span className="font-semibold">{money(regResult.price_usd)}</span> and validated. No domain was registered and no funds were charged.</p>
            </div>
          )}
          {regResult && !regResult._error && regResult.mode === "live" && (
            <div className="rounded-lg border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4 text-sm space-y-1">
              <div className="flex items-center gap-2 text-green-800 dark:text-green-200 font-semibold mb-1"><FiCheckCircle /> Registered</div>
              <p className="text-green-800 dark:text-green-200">Charged {money(regResult.charged_usd)}. New balance {money(regResult.wallet_balance_usd)}.</p>
              {Array.isArray(regResult.result?.nameservers) && <p className="text-green-800 dark:text-green-200">Nameservers: <span className="font-mono">{regResult.result.nameservers.join(", ")}</span></p>}
            </div>
          )}
          {regResult && regResult._error && (
            <div className="rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-semibold mb-1"><FiAlertTriangle /> {regResult.error || "Error"}</div>
              <p className="text-red-700 dark:text-red-300">{regResult.message}</p>
              {regResult.shortfall_usd ? <p className="text-red-700 dark:text-red-300 mt-1">Short by {money(regResult.shortfall_usd)} — top up your wallet and retry.</p> : null}
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-lightgray dark:border-gray-800 flex justify-end gap-3">
          {!regResult ? (
            <>
              <button onClick={onClose} className="px-4 py-2 rounded-md border border-lightgray dark:border-gray-800 text-primary dark:text-white text-sm font-medium">Cancel</button>
              <button onClick={submitRegister} disabled={registering} className="px-5 py-2 rounded-md bg-darkbtn hover:bg-darkbtn-hover text-white text-sm font-medium disabled:opacity-60">{registering ? "Processing…" : `Register · ${money(reg.price_usd)}`}</button>
            </>
          ) : (
            <button onClick={onClose} className="px-5 py-2 rounded-md bg-darkbtn hover:bg-darkbtn-hover text-white text-sm font-medium">Done</button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
