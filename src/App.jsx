import { useState, useEffect, useMemo } from "react";
import {
  Plus, X, TrendingUp, TrendingDown, Utensils, Car, Home, Film, HeartPulse,
  ShoppingBag, Zap, MoreHorizontal, ChevronLeft, ChevronRight, Trash2,
  Download, Wallet, Repeat, Check
} from "lucide-react";

const ICONS = { Utensils, Car, Home, Film, HeartPulse, ShoppingBag, Zap, MoreHorizontal, Wallet };

const DEFAULT_CATEGORIES = [
  { id: "alimentacion", name: "Alimentación", color: "#B3413E", icon: "Utensils" },
  { id: "transporte", name: "Transporte", color: "#C97A2B", icon: "Car" },
  { id: "vivienda", name: "Vivienda", color: "#7A6C53", icon: "Home" },
  { id: "ocio", name: "Ocio", color: "#8B5FA3", icon: "Film" },
  { id: "salud", name: "Salud", color: "#3A7D5C", icon: "HeartPulse" },
  { id: "compras", name: "Compras", color: "#3D6E8F", icon: "ShoppingBag" },
  { id: "servicios", name: "Servicios", color: "#A3A24A", icon: "Zap" },
  { id: "otros", name: "Otros", color: "#6B6F76", icon: "MoreHorizontal" },
];

const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const DIAS = ["dom","lun","mar","mié","jue","vie","sáb"];

function CatIcon({ name, size = 16, color }) {
  const Ico = ICONS[name] || MoreHorizontal;
  return <Ico size={size} color={color} strokeWidth={2} />;
}

function fmt(n) {
  return new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n || 0));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

const STORAGE_KEY = "finanzas-data-v1";

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [categories] = useState(DEFAULT_CATEGORIES);
  const [budgets, setBudgets] = useState({});
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [detailTx, setDetailTx] = useState(null);
  const [budgetEdit, setBudgetEdit] = useState(null);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const data = JSON.parse(saved);
          setTransactions(data.transactions || []);
          setBudgets(data.budgets || {});
        }
      } catch (e) {
        // no hay datos guardados todavía
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  async function persist(next) {
    try {
      const payload = {
        transactions: next.transactions ?? transactions,
        budgets: next.budgets ?? budgets,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      setSaveError(false);
    } catch (e) {
      setSaveError(true);
    }
  }

  function addTransaction(tx) {
    const next = [{ ...tx, id: uid() }, ...transactions];
    setTransactions(next);
    persist({ transactions: next });
    setSheetOpen(false);
  }

  function deleteTransaction(id) {
    const next = transactions.filter((t) => t.id !== id);
    setTransactions(next);
    persist({ transactions: next });
    setDetailTx(null);
  }

  function setBudget(catId, amount) {
    const next = { ...budgets, [catId]: amount };
    setBudgets(next);
    persist({ budgets: next });
    setBudgetEdit(null);
  }

  const monthTx = useMemo(() => {
    return transactions.filter((t) => {
      const d = new Date(t.date + "T00:00:00");
      return d.getFullYear() === monthCursor.y && d.getMonth() === monthCursor.m;
    });
  }, [transactions, monthCursor]);

  const totals = useMemo(() => {
    let ingresos = 0, gastos = 0;
    monthTx.forEach((t) => (t.type === "income" ? (ingresos += t.amount) : (gastos += t.amount)));
    return { ingresos, gastos, balance: ingresos - gastos };
  }, [monthTx]);

  const byCategory = useMemo(() => {
    const map = {};
    categories.forEach((c) => (map[c.id] = 0));
    monthTx.forEach((t) => {
      if (t.type === "expense") map[t.category] = (map[t.category] || 0) + t.amount;
    });
    return map;
  }, [monthTx, categories]);

  const grouped = useMemo(() => {
    const g = {};
    monthTx
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .forEach((t) => {
        g[t.date] = g[t.date] || [];
        g[t.date].push(t);
      });
    return Object.entries(g).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [monthTx]);

  function changeMonth(delta) {
    setMonthCursor((c) => {
      let m = c.m + delta, y = c.y;
      if (m < 0) { m = 11; y -= 1; }
      if (m > 11) { m = 0; y += 1; }
      return { y, m };
    });
  }

  function exportCSV() {
    const rows = [["fecha", "tipo", "categoria", "descripcion", "monto"]];
    monthTx.forEach((t) => {
      const catName = t.type === "expense" ? (categories.find((c) => c.id === t.category)?.name || t.category) : "Ingreso";
      rows.push([t.date, t.type === "income" ? "ingreso" : "gasto", catName, t.description || "", t.amount.toFixed(2)]);
    });
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gastos-${MESES[monthCursor.m]}-${monthCursor.y}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ background: "var(--paper)", minHeight: "100vh" }} className="flex justify-center">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
        :root {
          --paper: #EFEDE6;
          --surface: #FFFFFF;
          --ink: #211F1C;
          --ink-soft: #7A7770;
          --line: #D8D3C4;
          --expense: #AD3E3B;
          --income: #3A7D5C;
          --warn: #B8792A;
        }
        * { font-family: 'IBM Plex Sans', sans-serif; box-sizing: border-box; }
        .mono { font-family: 'IBM Plex Mono', monospace; }
        .torn-bottom {
          position: relative;
          padding-bottom: 14px;
        }
        .torn-bottom::after {
          content: '';
          position: absolute;
          left: 0; right: 0; bottom: -1px;
          height: 14px;
          background:
            linear-gradient(135deg, var(--paper) 50%, transparent 50%),
            linear-gradient(-135deg, var(--paper) 50%, transparent 50%);
          background-size: 14px 14px;
          background-position: bottom left;
          background-repeat: repeat-x;
        }
        .dotted-leader {
          flex: 1;
          border-bottom: 1.5px dotted var(--line);
          margin: 0 6px;
          transform: translateY(-4px);
        }
        .cat-row:active { background: #F5F3EC; }
        .fab:active { transform: scale(0.94); }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      <div className="w-full max-w-md pb-28" style={{ minHeight: "100vh" }}>
        {/* Encabezado tipo recibo */}
        <div className="surface torn-bottom" style={{ background: "var(--surface)" }}>
          <div className="px-5 pt-6 pb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="mono text-xs tracking-widest" style={{ color: "var(--ink-soft)" }}>MIS FINANZAS</span>
              <button onClick={exportCSV} className="flex items-center gap-1 text-xs mono px-2 py-1 rounded" style={{ color: "var(--ink-soft)", border: "1px solid var(--line)" }}>
                <Download size={12} /> CSV
              </button>
            </div>

            <div className="flex items-center justify-between mt-3 mb-4">
              <button onClick={() => changeMonth(-1)} className="p-2" style={{ color: "var(--ink)" }}><ChevronLeft size={20} /></button>
              <span className="mono text-lg font-semibold capitalize" style={{ color: "var(--ink)" }}>
                {MESES[monthCursor.m]} {monthCursor.y}
              </span>
              <button onClick={() => changeMonth(1)} className="p-2" style={{ color: "var(--ink)" }}><ChevronRight size={20} /></button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center mono">
              <div>
                <div className="text-[10px] tracking-wide" style={{ color: "var(--ink-soft)" }}>INGRESOS</div>
                <div className="text-base font-semibold" style={{ color: "var(--income)" }}>{fmt(totals.ingresos)}</div>
              </div>
              <div style={{ borderLeft: "1px dashed var(--line)", borderRight: "1px dashed var(--line)" }}>
                <div className="text-[10px] tracking-wide" style={{ color: "var(--ink-soft)" }}>GASTOS</div>
                <div className="text-base font-semibold" style={{ color: "var(--expense)" }}>{fmt(totals.gastos)}</div>
              </div>
              <div>
                <div className="text-[10px] tracking-wide" style={{ color: "var(--ink-soft)" }}>BALANCE</div>
                <div className="text-base font-semibold" style={{ color: totals.balance >= 0 ? "var(--ink)" : "var(--expense)" }}>
                  {totals.balance < 0 ? "-" : ""}{fmt(totals.balance)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Desglose por categoría */}
        <div className="px-5 mt-5">
          <div className="text-xs mono tracking-widest mb-2" style={{ color: "var(--ink-soft)" }}>CATEGORÍAS</div>
          <div className="rounded-lg overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
            {categories.map((c, i) => {
              const spent = byCategory[c.id] || 0;
              const budget = budgets[c.id];
              const pct = budget ? Math.min(100, (spent / budget) * 100) : 0;
              const over = budget && spent > budget;
              const isEditing = budgetEdit === c.id;
              return (
                <div key={c.id} className="cat-row px-4 py-3" style={{ borderTop: i === 0 ? "none" : "1px solid var(--line)" }}>
                  <div className="flex items-center gap-3" onClick={() => setBudgetEdit(isEditing ? null : c.id)}>
                    <div className="flex items-center justify-center rounded-full" style={{ width: 30, height: 30, background: c.color + "20" }}>
                      <CatIcon name={c.icon} size={15} color={c.color} />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm" style={{ color: "var(--ink)" }}>{c.name}</div>
                      {budget ? (
                        <div className="h-1.5 rounded-full mt-1" style={{ background: "var(--paper)" }}>
                          <div className="h-1.5 rounded-full" style={{ width: pct + "%", background: over ? "var(--expense)" : c.color }} />
                        </div>
                      ) : null}
                    </div>
                    <div className="text-right mono text-sm" style={{ color: over ? "var(--expense)" : "var(--ink)" }}>
                      {fmt(spent)}
                      {budget ? <div className="text-[10px]" style={{ color: "var(--ink-soft)" }}>de {fmt(budget)}</div> : null}
                    </div>
                  </div>
                  {isEditing && (
                    <BudgetInput
                      initial={budget || ""}
                      onSave={(val) => setBudget(c.id, val)}
                      onClear={() => setBudget(c.id, undefined)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Lista de movimientos */}
        <div className="px-5 mt-6">
          <div className="text-xs mono tracking-widest mb-2" style={{ color: "var(--ink-soft)" }}>MOVIMIENTOS</div>
          {grouped.length === 0 && (
            <div className="text-center py-10 text-sm" style={{ color: "var(--ink-soft)" }}>
              Todavía no hay movimientos este mes.<br />Tocá el botón + para añadir el primero.
            </div>
          )}
          {grouped.map(([date, txs]) => {
            const d = new Date(date + "T00:00:00");
            return (
              <div key={date} className="mb-4 rounded-lg overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
                <div className="px-4 pt-2 pb-1 mono text-[11px]" style={{ color: "var(--ink-soft)" }}>
                  {DIAS[d.getDay()]} {d.getDate()} de {MESES[d.getMonth()]}
                </div>
                {txs.map((t) => {
                  const cat = categories.find((c) => c.id === t.category);
                  return (
                    <div key={t.id} onClick={() => setDetailTx(t)} className="cat-row flex items-center px-4 py-2" style={{ borderTop: "1px dashed var(--line)" }}>
                      {t.type === "expense" ? (
                        <div className="flex items-center justify-center rounded-full mr-2" style={{ width: 22, height: 22, background: (cat?.color || "#999") + "20" }}>
                          <CatIcon name={cat?.icon} size={12} color={cat?.color} />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center rounded-full mr-2" style={{ width: 22, height: 22, background: "var(--income)20" }}>
                          <TrendingUp size={12} color="var(--income)" />
                        </div>
                      )}
                      <span className="text-sm truncate" style={{ color: "var(--ink)" }}>{t.description || (t.type === "income" ? "Ingreso" : cat?.name)}</span>
                      {t.recurring && <Repeat size={11} className="ml-1 shrink-0" style={{ color: "var(--ink-soft)" }} />}
                      <span className="dotted-leader" />
                      <span className="mono text-sm shrink-0" style={{ color: t.type === "income" ? "var(--income)" : "var(--ink)" }}>
                        {t.type === "income" ? "+" : "-"}{fmt(t.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {saveError && (
          <div className="mx-5 mt-2 text-xs px-3 py-2 rounded" style={{ background: "#F4E4E0", color: "var(--expense)" }}>
            No se pudo guardar. Revisá tu conexión e intentá de nuevo.
          </div>
        )}
      </div>

      {/* Botón flotante */}
      <button
        onClick={() => setSheetOpen(true)}
        className="fab fixed rounded-full flex items-center justify-center shadow-lg"
        style={{ right: 20, bottom: 24, width: 56, height: 56, background: "var(--ink)", color: "var(--paper)" }}
      >
        <Plus size={26} />
      </button>

      {sheetOpen && <AddSheet categories={categories} onClose={() => setSheetOpen(false)} onSave={addTransaction} />}
      {detailTx && (
        <DetailSheet
          tx={detailTx}
          category={categories.find((c) => c.id === detailTx.category)}
          onClose={() => setDetailTx(null)}
          onDelete={() => deleteTransaction(detailTx.id)}
        />
      )}
    </div>
  );
}

function BudgetInput({ initial, onSave, onClear }) {
  const [val, setVal] = useState(initial);
  return (
    <div className="flex items-center gap-2 mt-2 pl-11" onClick={(e) => e.stopPropagation()}>
      <span className="mono text-xs" style={{ color: "var(--ink-soft)" }}>Presupuesto:</span>
      <input
        type="number"
        inputMode="decimal"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="0.00"
        className="mono text-sm px-2 py-1 rounded w-24"
        style={{ border: "1px solid var(--line)", background: "var(--paper)", color: "var(--ink)" }}
      />
      <button onClick={() => onSave(parseFloat(val) || undefined)} className="p-1.5 rounded" style={{ background: "var(--ink)" }}>
        <Check size={13} color="var(--paper)" />
      </button>
      {initial ? (
        <button onClick={onClear} className="text-xs mono underline" style={{ color: "var(--ink-soft)" }}>quitar</button>
      ) : null}
    </div>
  );
}

function AddSheet({ categories, onClose, onSave }) {
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(categories[0].id);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayISO());
  const [recurring, setRecurring] = useState(false);

  const valid = parseFloat(amount) > 0;

  function submit() {
    if (!valid) return;
    onSave({
      type,
      amount: parseFloat(amount),
      category: type === "expense" ? category : null,
      description: description.trim(),
      date,
      recurring,
    });
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center" style={{ background: "rgba(30,28,25,0.4)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl p-5 pb-8" style={{ background: "var(--surface)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <span className="mono text-sm tracking-widest" style={{ color: "var(--ink-soft)" }}>NUEVO MOVIMIENTO</span>
          <button onClick={onClose}><X size={20} color="var(--ink)" /></button>
        </div>

        <div className="flex rounded-lg overflow-hidden mb-4" style={{ border: "1px solid var(--line)" }}>
          <button
            onClick={() => setType("expense")}
            className="flex-1 py-2 text-sm flex items-center justify-center gap-1"
            style={{ background: type === "expense" ? "var(--expense)" : "transparent", color: type === "expense" ? "#fff" : "var(--ink)" }}
          >
            <TrendingDown size={14} /> Gasto
          </button>
          <button
            onClick={() => setType("income")}
            className="flex-1 py-2 text-sm flex items-center justify-center gap-1"
            style={{ background: type === "income" ? "var(--income)" : "transparent", color: type === "income" ? "#fff" : "var(--ink)" }}
          >
            <TrendingUp size={14} /> Ingreso
          </button>
        </div>

        <input
          type="number" inputMode="decimal" autoFocus placeholder="0.00" value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mono w-full text-3xl font-semibold text-center py-2 mb-4 bg-transparent outline-none"
          style={{ color: "var(--ink)" }}
        />

        {type === "expense" && (
          <div className="grid grid-cols-4 gap-2 mb-4">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className="flex flex-col items-center gap-1 py-2 rounded-lg"
                style={{ background: category === c.id ? c.color + "20" : "transparent", border: category === c.id ? `1px solid ${c.color}` : "1px solid var(--line)" }}
              >
                <CatIcon name={c.icon} size={16} color={c.color} />
                <span className="text-[9px] text-center leading-tight" style={{ color: "var(--ink)" }}>{c.name}</span>
              </button>
            ))}
          </div>
        )}

        <input
          type="text" placeholder="Descripción (opcional)" value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full text-sm px-3 py-2 rounded-lg mb-3"
          style={{ border: "1px solid var(--line)", background: "var(--paper)", color: "var(--ink)" }}
        />

        <div className="flex items-center gap-3 mb-4">
          <input
            type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="flex-1 text-sm px-3 py-2 rounded-lg mono"
            style={{ border: "1px solid var(--line)", background: "var(--paper)", color: "var(--ink)" }}
          />
          <button
            onClick={() => setRecurring((r) => !r)}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs"
            style={{ border: "1px solid var(--line)", background: recurring ? "var(--ink)" : "var(--paper)", color: recurring ? "var(--paper)" : "var(--ink)" }}
          >
            <Repeat size={13} /> Recurrente
          </button>
        </div>

        <button
          onClick={submit}
          disabled={!valid}
          className="w-full py-3 rounded-lg text-sm font-semibold mono"
          style={{ background: valid ? "var(--ink)" : "var(--line)", color: "var(--paper)" }}
        >
          GUARDAR
        </button>
      </div>
    </div>
  );
}

function DetailSheet({ tx, category, onClose, onDelete }) {
  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center" style={{ background: "rgba(30,28,25,0.4)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl p-5 pb-8" style={{ background: "var(--surface)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <span className="mono text-sm tracking-widest" style={{ color: "var(--ink-soft)" }}>DETALLE</span>
          <button onClick={onClose}><X size={20} color="var(--ink)" /></button>
        </div>
        <div className="text-center mb-4">
          <div className="mono text-3xl font-semibold" style={{ color: tx.type === "income" ? "var(--income)" : "var(--expense)" }}>
            {tx.type === "income" ? "+" : "-"}{fmt(tx.amount)}
          </div>
          <div className="text-sm mt-1" style={{ color: "var(--ink-soft)" }}>
            {tx.description || (tx.type === "income" ? "Ingreso" : category?.name)}
          </div>
        </div>
        <div className="text-sm mb-1" style={{ color: "var(--ink)" }}>Fecha: <span className="mono">{tx.date}</span></div>
        {tx.type === "expense" && <div className="text-sm mb-1" style={{ color: "var(--ink)" }}>Categoría: {category?.name}</div>}
        {tx.recurring && <div className="text-sm mb-1" style={{ color: "var(--ink)" }}>Movimiento recurrente</div>}
        <button
          onClick={onDelete}
          className="w-full py-3 rounded-lg text-sm font-semibold mono flex items-center justify-center gap-2 mt-4"
          style={{ background: "var(--expense)", color: "#fff" }}
        >
          <Trash2 size={15} /> ELIMINAR
        </button>
      </div>
    </div>
  );
}
