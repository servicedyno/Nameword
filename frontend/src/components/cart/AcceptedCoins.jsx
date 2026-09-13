import { useEffect, useState } from "react";
import { FaBitcoin, FaEthereum } from "react-icons/fa6";
import { SiTether, SiLitecoin, SiDogecoin, SiBitcoincash, SiSolana, SiPolygon, SiRipple } from "react-icons/si";
import { LuCoins } from "react-icons/lu";
import { walletAPI } from "../../api/walletApi";

// Coin icon + brand colour + name, keyed by base ticker (USDT-TRC20 → USDT).
const COIN_ICONS = {
  BTC: { icon: FaBitcoin, color: "#f7931a", name: "Bitcoin" },
  ETH: { icon: FaEthereum, color: "#627eea", name: "Ethereum" },
  LTC: { icon: SiLitecoin, color: "#345d9d", name: "Litecoin" },
  DOGE: { icon: SiDogecoin, color: "#c2a633", name: "Dogecoin" },
  BCH: { icon: SiBitcoincash, color: "#0ac18e", name: "Bitcoin Cash" },
  SOL: { icon: SiSolana, color: "#9945ff", name: "Solana" },
  POLYGON: { icon: SiPolygon, color: "#8247e5", name: "Polygon" },
  MATIC: { icon: SiPolygon, color: "#8247e5", name: "Polygon" },
  XRP: { icon: SiRipple, color: "#00aae4", name: "XRP" },
  TRX: { icon: LuCoins, color: "#eb0029", name: "Tron" },
  USDT: { icon: SiTether, color: "#26a17b", name: "Tether" },
  USDC: { icon: LuCoins, color: "#2775ca", name: "USD Coin" },
};
const baseTicker = (code) => {
  const c = String(code || "").toUpperCase();
  return c.includes("-") ? c.split("-")[0] : c;
};

// Shown if the live fetch fails / for guests (the coins configured on DynoPay).
const FALLBACK = ["BTC", "ETH", "USDT-TRC20", "USDC-ERC20", "LTC", "SOL", "BCH", "DOGE", "POLYGON", "TRX", "XRP"];

let cache = null; // module-level cache so we fetch the live list only once per session

export default function AcceptedCoins({ max = 7, className = "" }) {
  const [coins, setCoins] = useState(cache);

  useEffect(() => {
    if (cache) return;
    let alive = true;
    (async () => {
      try {
        const res = await walletAPI.getSupportedCurrencies();
        const list = res?.data?.currencies || res?.data?.all_supported || res?.data || [];
        const arr = Array.isArray(list) && list.length ? list.map(String) : FALLBACK;
        cache = arr;
        if (alive) setCoins(arr);
      } catch {
        if (alive) setCoins(FALLBACK);
      }
    })();
    return () => { alive = false; };
  }, []);

  const source = coins || FALLBACK;
  const seen = new Set();
  const bases = [];
  for (const c of source) {
    const b = baseTicker(c);
    if (b && !seen.has(b)) { seen.add(b); bases.push(b); }
  }
  const shown = bases.slice(0, max);
  const more = bases.length - shown.length;

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`} data-testid="accepted-coins">
      <span className="text-[11px] font-medium text-ink-soft dark:text-gray-400">We accept</span>
      <div className="flex items-center gap-1.5">
        {shown.map((b) => {
          const m = COIN_ICONS[b] || { icon: LuCoins, color: "#6366f1", name: b };
          const Icon = m.icon;
          return (
            <span
              key={b}
              title={m.name}
              data-testid={`accepted-coin-${b}`}
              className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-surface-2 ring-1 ring-line dark:bg-white/[0.06] dark:ring-white/[0.08]"
            >
              <Icon size={13} style={{ color: m.color }} />
            </span>
          );
        })}
        {more > 0 && (
          <span className="text-[11px] font-semibold text-ink-soft dark:text-gray-400" data-testid="accepted-coins-more">
            +{more} more
          </span>
        )}
      </div>
    </div>
  );
}
