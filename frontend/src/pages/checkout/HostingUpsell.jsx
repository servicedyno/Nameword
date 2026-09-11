import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { FiArrowRight, FiCheck, FiShield, FiZap } from "react-icons/fi";
import resellerAPI from "../../api/reseller";
import { useCart } from "../../hooks/useCart";
import { useAuth } from "../../hooks/useAuth";
import { usePageMeta } from "../../hooks/usePageMeta";
import CartSummary from "../../components/checkout/CartSummary";
import { money, durationLabel } from "../../utils/checkoutFormat";

const NONE = "__none__";

function PlanOption({ plan, selected, onSelect, popular }) {
  const id = plan.plan_id;
  return (
    <label
      className={`relative block cursor-pointer rounded-xl border p-5 transition-all ${
        selected ? "border-brand ring-4 ring-brand/15 bg-brand-50/40 dark:bg-brand/10" : "border-line dark:border-gray-800 hover:border-brand/40"
      }`}
      data-testid={`hosting-option-${id}`}
    >
      <input type="radio" name="hosting-plan" className="sr-only" checked={selected} onChange={() => onSelect(id)} />
      {popular && <span className="absolute -top-2.5 left-5 nw-badge nw-badge-brand !py-0.5">Most popular</span>}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${selected ? "border-brand bg-brand" : "border-gray-400"}`}>
            {selected && <FiCheck size={12} className="text-white" />}
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-primary dark:text-white">{plan.name}</p>
            <p className="text-xs text-ink-soft dark:text-gray-400 mt-0.5 nw-mono uppercase tracking-wider">
              {plan.tier} · {durationLabel(plan.duration_days)}
            </p>
            {Array.isArray(plan.features) && plan.features.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {plan.features.map((f) => (
                  <li key={f} className="nw-chip !py-0.5 text-xs">{f}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xl font-bold text-primary dark:text-white nw-mono">{money(plan.price_usd)}</p>
          <p className="text-xs text-ink-soft dark:text-gray-400">per {durationLabel(plan.duration_days).replace(/^1 /, "")}</p>
        </div>
      </div>
    </label>
  );
}

export default function HostingUpsell() {
  usePageMeta("Add hosting", "Launch your domain with offshore Anti-Red cPanel hosting, or continue with the domain only.");
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const cart = useCart();
  const { isAuthenticated } = useAuth();

  const domain = (params.get("domain") || cart.nextDomainForHosting || cart.domains[0]?.domain || "").toLowerCase();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(() => cart.hostingFor(domain)?.plan_id || NONE);

  useEffect(() => {
    if (!domain) navigate("/domains", { replace: true });
  }, [domain, navigate]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await resellerAPI.getHostingPlans();
        if (alive) setPlans(Array.isArray(data?.plans) ? data.plans : []);
      } catch {
        if (alive) setPlans([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const selectedPlan = useMemo(() => plans.find((p) => p.plan_id === selected) || null, [plans, selected]);

  // Live preview of the cart including the current selection.
  const previewItems = useMemo(() => {
    const base = cart.items.filter((i) => !(i.type === "hosting" && i.domain === domain));
    if (selectedPlan) {
      base.push({ id: "preview", type: "hosting", domain, plan_name: selectedPlan.name, duration_days: selectedPlan.duration_days, price_usd: selectedPlan.price_usd });
    }
    return base;
  }, [cart.items, selectedPlan, domain]);

  const handleContinue = () => {
    if (selectedPlan) cart.addHosting({ domain, plan: selectedPlan });
    else cart.removeHostingFor(domain);
    navigate(isAuthenticated ? "/cart" : "/checkout/account");
  };

  const popularId = plans.find((p) => p.plan_id === "premium-monthly")?.plan_id || plans[1]?.plan_id;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px]" data-testid="hosting-upsell-page">
      <section>
        <span className="nw-eyebrow mb-4">Step 2 · Hosting</span>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-primary dark:text-white">
          Want to launch <span className="text-brand-700 dark:text-brand-300 break-all">{domain}</span> right away?
        </h1>
        <p className="mt-3 nw-lead max-w-2xl">
          Add offshore Anti-Red cPanel hosting so your site is live the moment the domain registers — or keep it simple and continue with the domain only.
        </p>

        <div className="mt-6 flex flex-wrap gap-4 text-sm text-ink-soft dark:text-gray-400">
          <span className="inline-flex items-center gap-2"><FiShield className="text-brand" /> Anti-Red protection included</span>
          <span className="inline-flex items-center gap-2"><FiZap className="text-brand" /> Instant activation from your wallet</span>
        </div>

        <div className="mt-8 space-y-4" data-testid="hosting-options">
          {loading &&
            [0, 1, 2].map((i) => <div key={i} className="h-28 rounded-xl border border-line dark:border-gray-800 animate-pulse" />)}
          {!loading && plans.map((p) => <PlanOption key={p.plan_id} plan={p} selected={selected === p.plan_id} onSelect={setSelected} popular={p.plan_id === popularId} />)}
          {!loading && plans.length === 0 && (
            <div className="rounded-xl border border-dashed border-line dark:border-gray-800 p-6 text-sm text-ink-soft dark:text-gray-400">
              Hosting plans are unavailable right now — you can still continue with the domain only.
            </div>
          )}

          <label
            className={`block cursor-pointer rounded-xl border p-5 transition-all ${
              selected === NONE ? "border-brand ring-4 ring-brand/15 bg-brand-50/40 dark:bg-brand/10" : "border-line dark:border-gray-800 hover:border-brand/40"
            }`}
            data-testid="hosting-option-none"
          >
            <input type="radio" name="hosting-plan" className="sr-only" checked={selected === NONE} onChange={() => setSelected(NONE)} />
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${selected === NONE ? "border-brand bg-brand" : "border-gray-400"}`}>
                  {selected === NONE && <FiCheck size={12} className="text-white" />}
                </span>
                <div>
                  <p className="font-semibold text-primary dark:text-white">No hosting — domain only</p>
                  <p className="text-xs text-ink-soft dark:text-gray-400 mt-0.5">You can add hosting any time from your dashboard.</p>
                </div>
              </div>
              <p className="text-xl font-bold text-primary dark:text-white nw-mono">$0.00</p>
            </div>
          </label>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button type="button" onClick={handleContinue} className="nw-btn-primary" data-testid="hosting-continue-button">
            Continue <FiArrowRight size={16} />
          </button>
          <Link to={`/domains?value=${encodeURIComponent(domain)}`} className="nw-btn-ghost" data-testid="hosting-back-link">
            Back to search
          </Link>
        </div>
      </section>

      <CartSummary items={previewItems} />
    </div>
  );
}
