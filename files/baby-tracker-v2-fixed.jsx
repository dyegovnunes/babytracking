import { useState, useEffect } from "react";

const DEFAULT_EVENTS = [
  { id: "breast_left", label: "Peito Esq.", icon: "◑", color: "#f9a8d4", category: "feed" },
  { id: "breast_right", label: "Peito Dir.", icon: "◐", color: "#f9a8d4", category: "feed" },
  { id: "breast_both", label: "Ambos", icon: "●", color: "#ec4899", category: "feed" },
  { id: "bottle", label: "Mamadeira", icon: "🍼", color: "#a78bfa", category: "feed", hasAmount: true },
  { id: "diaper_wet", label: "Fralda Xixi", icon: "💧", color: "#60a5fa", category: "diaper" },
  { id: "diaper_dirty", label: "Fralda Cocô", icon: "🟤", color: "#92400e", category: "diaper" },
  { id: "bath", label: "Banho", icon: "🛁", color: "#34d399", category: "care" },
  { id: "sleep", label: "Dormiu", icon: "🌙", color: "#818cf8", category: "sleep" },
  { id: "wake", label: "Acordou", icon: "☀️", color: "#fbbf24", category: "sleep" },
];

const DEFAULT_INTERVALS = {
  feed:   { label: "próxima mamada",  minutes: 180, warn: 150 },
  diaper: { label: "próxima troca",   minutes: 120, warn: 90  },
  bath:   { label: "próximo banho",   minutes: 1440, warn: 1200 },
  sleep:  { label: "próximo soninho", minutes: 90,  warn: 60  },
};

const INTERVAL_LABELS = {
  feed:   "Intervalo entre mamadas",
  diaper: "Intervalo entre trocas",
  bath:   "Intervalo entre banhos",
  sleep:  "Intervalo entre sonos",
};

function formatTime(date) {
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
function formatDate(date) {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
function formatRelative(ms) {
  const minutes = Math.round(ms / 60000);
  if (minutes < 0) return `há ${Math.abs(minutes)}min`;
  if (minutes === 0) return "agora";
  if (minutes < 60) return `em ${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `em ${h}h${m}min` : `em ${h}h`;
}

function getNextProjection(logs, category, intervals) {
  const relevant = logs.filter(l => DEFAULT_EVENTS.find(e => e.id === l.eventId)?.category === category);
  if (!relevant.length) return null;
  const last = relevant[relevant.length - 1];
  const interval = intervals[category];
  const nextTime = new Date(last.timestamp + interval.minutes * 60000);
  const warnTime = new Date(last.timestamp + interval.warn * 60000);
  const now = Date.now();
  return {
    label: interval.label,
    time: nextTime,
    isOverdue: nextTime.getTime() < now,
    isWarning: warnTime.getTime() < now && nextTime.getTime() >= now,
    lastEvent: DEFAULT_EVENTS.find(e => e.id === last.eventId)?.label,
    lastTime: new Date(last.timestamp),
  };
}

const S = {
  input: {
    padding: "10px 14px", borderRadius: 12,
    background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.15)",
    color: "#f0eeff", fontSize: 15, outline: "none", width: "100%",
  },
  btnBase: {
    padding: "11px 0", borderRadius: 12, cursor: "pointer",
    fontWeight: 700, fontSize: 14, border: "none",
  },
};

function Overlay({ children, onClose }) {
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 200, backdropFilter: "blur(4px)", padding: 20,
      }}
    >
      <div style={{
        background: "#1e1540", border: "1.5px solid rgba(167,139,250,0.3)",
        borderRadius: 24, padding: 24, width: "100%", maxWidth: 340,
      }}>
        {children}
      </div>
    </div>
  );
}

function BottleModal({ onConfirm, onClose }) {
  const [amount, setAmount] = useState("60");
  return (
    <Overlay onClose={onClose}>
      <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>🍼 Quanto mamou?</div>
      <div style={{ color: "#a78bfa", fontSize: 13, marginBottom: 16 }}>Volume em ml</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {[30, 60, 90, 120].map(ml => (
          <button key={ml} onClick={() => setAmount(String(ml))} style={{
            flex: 1, padding: "8px 0", borderRadius: 10,
            background: amount === String(ml) ? "#7c3aed" : "rgba(255,255,255,0.07)",
            border: `1.5px solid ${amount === String(ml) ? "#7c3aed" : "rgba(255,255,255,0.1)"}`,
            color: "#f0eeff", cursor: "pointer", fontWeight: 600, fontSize: 13,
          }}>{ml}</button>
        ))}
      </div>
      <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
        style={{ ...S.input, textAlign: "center", marginBottom: 16 }} placeholder="outro valor" />
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onClose} style={{ ...S.btnBase, flex: 1, background: "rgba(255,255,255,0.07)", color: "#f0eeff", border: "1.5px solid rgba(255,255,255,0.1)" }}>Cancelar</button>
        <button onClick={() => onConfirm(parseInt(amount) || 0)} style={{ ...S.btnBase, flex: 2, background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff" }}>Registrar</button>
      </div>
    </Overlay>
  );
}

function EditModal({ log, onSave, onDelete, onClose }) {
  const ev = DEFAULT_EVENTS.find(e => e.id === log.eventId);
  const d = new Date(log.timestamp);
  const [time, setTime] = useState(`${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`);
  const [date, setDate] = useState(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`);
  const [ml, setMl] = useState(log.ml || "");
  const [confirmDel, setConfirmDel] = useState(false);

  function save() {
    const [h, m] = time.split(":").map(Number);
    const [y, mo, day] = date.split("-").map(Number);
    onSave({ ...log, timestamp: new Date(y, mo - 1, day, h, m).getTime(), ml: ml ? parseInt(ml) : undefined });
  }

  return (
    <Overlay onClose={onClose}>
      <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 18 }}>{ev?.icon} Editar — {ev?.label}</div>
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "#a78bfa", marginBottom: 6 }}>DATA</div>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={S.input} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "#a78bfa", marginBottom: 6 }}>HORÁRIO</div>
          <input type="time" value={time} onChange={e => setTime(e.target.value)} style={S.input} />
        </div>
      </div>
      {ev?.hasAmount && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: "#a78bfa", marginBottom: 6 }}>VOLUME (ml)</div>
          <input type="number" value={ml} onChange={e => setMl(e.target.value)} style={S.input} placeholder="ex: 60" />
        </div>
      )}
      {!confirmDel ? (
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button onClick={() => setConfirmDel(true)} style={{ ...S.btnBase, flex: 1, background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1.5px solid rgba(239,68,68,0.3)" }}>Excluir</button>
          <button onClick={onClose} style={{ ...S.btnBase, flex: 1, background: "rgba(255,255,255,0.07)", color: "#f0eeff", border: "1.5px solid rgba(255,255,255,0.1)" }}>Cancelar</button>
          <button onClick={save} style={{ ...S.btnBase, flex: 2, background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff" }}>Salvar</button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button onClick={onClose} style={{ ...S.btnBase, flex: 1, background: "rgba(255,255,255,0.07)", color: "#f0eeff", border: "1.5px solid rgba(255,255,255,0.1)" }}>Cancelar</button>
          <button onClick={() => onDelete(log.id)} style={{ ...S.btnBase, flex: 2, background: "linear-gradient(135deg,#dc2626,#ef4444)", color: "#fff" }}>Confirmar exclusão</button>
        </div>
      )}
    </Overlay>
  );
}

function IntervalsModal({ intervals, onSave, onClose }) {
  const [vals, setVals] = useState(() => JSON.parse(JSON.stringify(intervals)));
  function set(cat, field, val) {
    setVals(prev => ({ ...prev, [cat]: { ...prev[cat], [field]: Number(val) } }));
  }
  return (
    <Overlay onClose={onClose}>
      <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>⏱ Intervalos esperados</div>
      <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 18 }}>Ajuste conforme a rotina do bebê.</div>
      {Object.entries(vals).map(([cat, v]) => (
        <div key={cat} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: "#a78bfa", fontWeight: 700, marginBottom: 8 }}>{INTERVAL_LABELS[cat]}</div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>ALERTA (min)</div>
              <input type="number" value={v.warn} onChange={e => set(cat, "warn", e.target.value)} style={S.input} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>LIMITE (min)</div>
              <input type="number" value={v.minutes} onChange={e => set(cat, "minutes", e.target.value)} style={S.input} />
            </div>
          </div>
        </div>
      ))}
      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        <button onClick={onClose} style={{ ...S.btnBase, flex: 1, background: "rgba(255,255,255,0.07)", color: "#f0eeff", border: "1.5px solid rgba(255,255,255,0.1)" }}>Cancelar</button>
        <button onClick={() => onSave(vals)} style={{ ...S.btnBase, flex: 2, background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff" }}>Salvar</button>
      </div>
    </Overlay>
  );
}

function LogRow({ log, ev, now, onEdit }) {
  return (
    <div onClick={onEdit} style={{
      background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.07)",
      borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center",
      gap: 12, cursor: "pointer",
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
        background: `${ev.color}18`, border: `1.5px solid ${ev.color}44`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15,
      }}>{ev.icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{ev.label}</div>
        {log.ml && <div style={{ fontSize: 12, color: "#a78bfa" }}>{log.ml} ml</div>}
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#c4b5fd" }}>{formatTime(new Date(log.timestamp))}</div>
        <div style={{ fontSize: 10, color: "#64748b" }}>{formatDate(new Date(log.timestamp))} · {formatRelative(log.timestamp - now)}</div>
      </div>
      <div style={{ color: "#475569", fontSize: 13 }}>✏️</div>
    </div>
  );
}

export default function App() {
  const [logs, setLogs] = useState([]);
  const [intervals, setIntervals] = useState(DEFAULT_INTERVALS);
  const [now, setNow] = useState(Date.now());
  const [tab, setTab] = useState("home");
  const [catFilter, setCatFilter] = useState("all");
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null); // null | "bottle" | "intervals" | {log}

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);

  function toast_(msg) { setToast(msg); setTimeout(() => setToast(null), 2500); }

  function logEvent(eventId, extra = {}) {
    const ev = DEFAULT_EVENTS.find(e => e.id === eventId);
    setLogs(prev => [...prev, { id: Date.now() + Math.random(), eventId, timestamp: Date.now(), ...extra }]);
    toast_(`${ev.icon} ${ev.label} registrado às ${formatTime(new Date())}`);
  }

  const projections = ["feed","diaper","sleep","bath"].map(c => getNextProjection(logs, c, intervals)).filter(Boolean);
  const sorted = [...logs].sort((a, b) => b.timestamp - a.timestamp);
  const filtered = sorted.filter(l => catFilter === "all" || DEFAULT_EVENTS.find(e => e.id === l.eventId)?.category === catFilter).slice(0, 40);

  const cats = [
    { id: "all", label: "Tudo" },
    { id: "feed", label: "Mamadas" },
    { id: "sleep", label: "Sono" },
    { id: "diaper", label: "Fralda" },
    { id: "care", label: "Cuidados" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#0f0c29,#1a1040,#24243e)", fontFamily: "'DM Sans','Segoe UI',sans-serif", color: "#f0eeff", paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ padding: "28px 20px 12px", textAlign: "center" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "#a78bfa", textTransform: "uppercase", marginBottom: 4 }}>registro do bebê</div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "short" })}</div>
        <div style={{ fontSize: 38, fontWeight: 800, color: "#c4b5fd", letterSpacing: "-1px", lineHeight: 1.1 }}>{formatTime(new Date(now))}</div>
      </div>

      {/* Tab bar top */}
      <div style={{ display: "flex", margin: "0 16px 16px", background: "rgba(255,255,255,0.05)", borderRadius: 14, padding: 4 }}>
        {[{ id: "home", label: "Início" }, { id: "history", label: "Histórico" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "9px 0", borderRadius: 10, border: "none", cursor: "pointer",
            background: tab === t.id ? "rgba(124,58,237,0.6)" : "transparent",
            color: tab === t.id ? "#fff" : "#94a3b8", fontWeight: tab === t.id ? 700 : 500, fontSize: 14,
          }}>{t.label}</button>
        ))}
      </div>

      {/* HOME */}
      {tab === "home" && (
        <div style={{ padding: "0 16px" }}>
          <div style={{ fontSize: 11, color: "#a78bfa", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12 }}>registrar agora</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
            {DEFAULT_EVENTS.map(ev => (
              <button key={ev.id} onClick={() => ev.hasAmount ? setModal("bottle") : logEvent(ev.id)} style={{
                background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.1)",
                borderRadius: 16, padding: "14px 8px", color: "#f0eeff", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${ev.color}22`, border: `2px solid ${ev.color}66`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{ev.icon}</div>
                <span style={{ fontSize: 11, fontWeight: 600, textAlign: "center", lineHeight: 1.2 }}>{ev.label}</span>
              </button>
            ))}
          </div>

          {projections.length > 0 && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: "#a78bfa", letterSpacing: "0.15em", textTransform: "uppercase" }}>previsão do dia</div>
                <button onClick={() => setModal("intervals")} style={{ background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)", borderRadius: 8, padding: "4px 12px", color: "#c4b5fd", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>⚙ Ajustar</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                {projections.map((p, i) => (
                  <div key={i} style={{
                    background: p.isOverdue ? "rgba(239,68,68,0.12)" : p.isWarning ? "rgba(251,191,36,0.1)" : "rgba(255,255,255,0.04)",
                    border: `1.5px solid ${p.isOverdue ? "rgba(239,68,68,0.35)" : p.isWarning ? "rgba(251,191,36,0.3)" : "rgba(255,255,255,0.08)"}`,
                    borderRadius: 14, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <div>
                      <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 2 }}>Último: {p.lastEvent} às {formatTime(p.lastTime)}</div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{p.label.charAt(0).toUpperCase() + p.label.slice(1)}</div>
                    </div>
                    <div style={{ color: p.isOverdue ? "#f87171" : p.isWarning ? "#fbbf24" : "#a78bfa", textAlign: "right" }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{formatTime(p.time)}</div>
                      <div style={{ fontSize: 11, opacity: 0.8 }}>{formatRelative(p.time.getTime() - now)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {logs.length > 0 && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: "#a78bfa", letterSpacing: "0.15em", textTransform: "uppercase" }}>últimos registros</div>
                <button onClick={() => setTab("history")} style={{ background: "none", border: "none", color: "#a78bfa", fontSize: 12, cursor: "pointer" }}>ver tudo →</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {sorted.slice(0, 5).map(log => {
                  const ev = DEFAULT_EVENTS.find(e => e.id === log.eventId);
                  return ev ? <LogRow key={log.id} log={log} ev={ev} now={now} onEdit={() => setModal(log)} /> : null;
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* HISTORY */}
      {tab === "history" && (
        <div style={{ padding: "0 16px" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto", paddingBottom: 4 }}>
            {cats.map(c => (
              <button key={c.id} onClick={() => setCatFilter(c.id)} style={{
                padding: "6px 14px", borderRadius: 20, whiteSpace: "nowrap",
                background: catFilter === c.id ? "#7c3aed" : "rgba(255,255,255,0.07)",
                border: `1.5px solid ${catFilter === c.id ? "#7c3aed" : "rgba(255,255,255,0.1)"}`,
                color: "#f0eeff", cursor: "pointer", fontSize: 12, fontWeight: 600,
              }}>{c.label}</button>
            ))}
          </div>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#475569", fontSize: 14 }}>
              Nenhum registro ainda.<br /><span style={{ color: "#a78bfa" }}>Vá para Início e registre algo.</span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.map(log => {
                const ev = DEFAULT_EVENTS.find(e => e.id === log.eventId);
                return ev ? <LogRow key={log.id} log={log} ev={ev} now={now} onEdit={() => setModal(log)} /> : null;
              })}
            </div>
          )}
          {logs.length > 0 && (
            <div style={{ textAlign: "center", marginTop: 24 }}>
              <button onClick={() => { if (window.confirm("Limpar todo o histórico?")) setLogs([]); }} style={{
                background: "none", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171",
                borderRadius: 10, padding: "8px 20px", cursor: "pointer", fontSize: 12,
              }}>Limpar histórico</button>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {modal === "bottle" && <BottleModal onConfirm={ml => { logEvent("bottle", { ml }); setModal(null); }} onClose={() => setModal(null)} />}
      {modal === "intervals" && <IntervalsModal intervals={intervals} onSave={v => { setIntervals(v); setModal(null); toast_("✅ Intervalos atualizados"); }} onClose={() => setModal(null)} />}
      {modal && modal.eventId && (
        <EditModal
          log={modal}
          onSave={updated => { setLogs(prev => prev.map(l => l.id === updated.id ? updated : l)); setModal(null); toast_("✅ Registro atualizado"); }}
          onDelete={id => { setLogs(prev => prev.filter(l => l.id !== id)); setModal(null); toast_("🗑 Registro excluído"); }}
          onClose={() => setModal(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)",
          background: "#1e1540", border: "1.5px solid rgba(167,139,250,0.4)",
          borderRadius: 14, padding: "12px 20px", fontSize: 14, fontWeight: 600,
          color: "#f0eeff", zIndex: 300, whiteSpace: "nowrap", boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}>{toast}</div>
      )}

      {/* Bottom nav */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "rgba(15,12,41,0.95)", backdropFilter: "blur(12px)",
        borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", padding: "10px 0 16px",
      }}>
        {[{ id: "home", icon: "🏠", label: "Início" }, { id: "history", icon: "📋", label: "Histórico" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, background: "none", border: "none", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            color: tab === t.id ? "#a78bfa" : "#475569",
          }}>
            <span style={{ fontSize: 20 }}>{t.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 600 }}>{t.label}</span>
          </button>
        ))}
      </div>

      <style>{`* { box-sizing: border-box; }`}</style>
    </div>
  );
}
