import { Outlet, useLocation } from "react-router";
import { FiCheck } from "react-icons/fi";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";

const STEPS = [
  { key: "domain", label: "Domain", match: ["/domains"] },
  { key: "hosting", label: "Hosting", match: ["/checkout/hosting"] },
  { key: "account", label: "Account", match: ["/checkout/account"] },
  { key: "cart", label: "Cart & pay", match: ["/cart"] },
  { key: "done", label: "Done", match: ["/checkout/success"] },
];

export function CheckoutStepper({ pathname }) {
  const current = Math.max(0, STEPS.findIndex((s) => s.match.some((m) => pathname.startsWith(m))));
  return (
    <ol className="flex items-center gap-2 sm:gap-3 overflow-x-auto" data-testid="checkout-stepper">
      {STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.key} className="flex items-center gap-2 sm:gap-3 shrink-0">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${
                done
                  ? "border-brand bg-brand text-white"
                  : active
                  ? "border-brand text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand/10"
                  : "border-line text-ink-muted dark:border-gray-700 dark:text-gray-500"
              }`}
              data-testid={`checkout-step-${s.key}`}
            >
              {done ? <FiCheck size={14} /> : i + 1}
            </span>
            <span className={`text-sm font-medium ${active ? "text-primary dark:text-white" : "text-ink-soft dark:text-gray-400"} ${i > 0 ? "hidden sm:inline" : ""}`}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && <span className={`h-px w-6 sm:w-10 ${done ? "bg-brand" : "bg-line dark:bg-gray-800"}`} />}
          </li>
        );
      })}
    </ol>
  );
}

export default function CheckoutLayout() {
  const { pathname } = useLocation();
  return (
    <>
      <Navbar />
      <div className="border-b border-line dark:border-white/[0.06] bg-surface-2/60 dark:bg-gray-900/40">
        <div className="nw-container py-3">
          <CheckoutStepper pathname={pathname} />
        </div>
      </div>
      <main className="nw-container py-10 sm:py-14 min-h-[60vh]">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
