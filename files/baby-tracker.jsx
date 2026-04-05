import { useState, useEffect } from "react";

const EVENTS = [
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

const INTERVALS = {
  feed: { label: "próxima mamada", minutes: 180, warn: 150 },
  diaper: { label: "próxima troca", minutes: 120, warn: 90 },
  bath: { label: "próximo banho", minutes: 1440, warn: 1200 },
  sleep: { label: "próximo soninho", minutes: 90, warn: 60 },
};

function formatTime(date) {
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
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

function getNextProjection(logs, category) {
  const relevant = logs.filter(l => {
    const ev = EVENTS.find(e => e.id === l.eventId);
    return ev?.category === category;
  });
  if (!relevant.length) return null;
  const last = relevant[relevant.length - 1];
  const interval = INTERVALS[category];
  const nextTime = new Date(last.timestamp + interval.minutes * 60000);
  const warnTime = new Date(last.timestamp + interval.warn * 60000);
  const now = Date.now();
  const isOverdue = nextTime.getTime() < now;
  const isWarning = warnTime.getTime() < now && !isOverdue;
  return {
    label: interval.label,
    time: nextTime,
    isOverdue,
    isWarning,
    lastEvent: EVENTS.find(e => e.id === last.eventId)?.label,
    lastTime: new Date(last.timestamp),
  };
}

export default function BabyTracker() {
  const [logs, setLogs] = useState(() => {
    try { return JSON.parse(localStorage.getItem("babylogs") || "[]"); } catch { return []; }
  });
  const [now, setNow] = useState(Date.now());
  const [bottleAmount, setBottleAmount] = useState("60");
  const [showBottleInput, setShowBottleInput] = useState(false);
  const [pendingBottle, setPendingBottle] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    localStorage.setItem("babylogs", JSON.stringify(logs.slice(-200)));
  }, [logs]);

  function logEvent(eventId, extra = {}) {
    const ev = EVENTS.find(e => e.id === eventId);
    const entry = { id: Date.now(), eventId, timestamp: Date.now(), ...extra };
    setLogs(prev => [...prev, entry]);
    setToast(`${ev.icon} ${ev.label} registrado às ${formatTime(new Date())}`);
    setTimeout(() => setToast(null), 2500);
  }

  function handleEventTap(ev) {
    if (ev.hasAmount) {
      setPendingBottle(true);
      setShowBottleInput(true);
    } else {
      logEvent(ev.id);
    }
  }

  function confirmBottle() {
    logEvent("bottle", { ml: parseInt(bottleAmount) || 0 });
    setShowBottleInput(false);
    setPendingBottle(false);
  }

  const projections = ["feed", "diaper", "sleep", "bath"]
    .map(cat => getNextProjection(logs, cat))
    .filter(Boolean);

  const filteredLogs = activeCategory === "all"
    ? [...logs].reverse().slice(0, 20)
    : [...logs].reverse().filter(l => {
        const ev = EVENTS.find(e => e.id === l.eventId);
        return ev?.category === activeCategory;
      }).slice(0, 20);

  const categories = [
    { id: "all", label: "Tudo" },
    { id: "feed", label: "Mamadas" },
    { id: "sleep", label: "Sono" },
    { id: "diaper", label: "Fralda" },
    { id: "care", label: "Cuidados" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #0f0c29, #1a1040, #24243e)",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      color: "#f0eeff",
      padding: "0 0 80px",
      position: "relative",
      overflowX: "hidden",
    }}>
      {/* Decorative blobs */}
      <div style={{
        position: "fixed", top: -80, right: -80, width: 300, height: 300,
        background: "radial-gradient(circle, rgba(167,139,250,0.15) 0%, transparent 70%)",
        borderRadius: "50%", pointerEvents: "none",
      }} />
      <div style={{
        position: "fixed", bottom: 100, left: -60, width: 250, height: 250,
        background: "radial-gradient(circle, rgba(249,168,212,0.12) 0%, transparent 70%)",
        borderRadius: "50%", pointerEvents: "none",
      }} />

      {/* Header */}
      <div style={{ padding: "28px 20px 16px", textAlign: "center" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "#a78bfa", textTransform: "uppercase", marginBottom: 4 }}>
          registro do bebê
        </div>
        <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.5px" }}>
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "short" })}
        </div>
        <div style={{ fontSize: 38, fontWeight: 800, color: "#c4b5fd", letterSpacing: "-1px", lineHeight: 1 }}>
          {formatTime(new Date(now))}
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div style={{ padding: "8px 16px 0" }}>
        <div style={{ fontSize: 11, color: "#a78bfa", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12 }}>
          registrar agora
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {EVENTS.map(ev => (
            <button
              key={ev.id}
              onClick={() => handleEventTap(ev)}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: `1.5px solid rgba(255,255,255,0.1)`,
                borderRadius: 16,
                padding: "14px 8px",
                color: "#f0eeff",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                transition: "all 0.15s",
                backdropFilter: "blur(10px)",
              }}
              onMouseDown={e => e.currentTarget.style.transform = "scale(0.95)"}
              onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
              onTouchStart={e => e.currentTarget.style.transform = "scale(0.95)"}
              onTouchEnd={e => e.currentTarget.style.transform = "scale(1)"}
            >
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: `${ev.color}22`,
                border: `2px solid ${ev.color}66`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16,
              }}>
                {ev.icon}
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, textAlign: "center", lineHeight: 1.2 }}>
                {ev.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Bottle input modal */}
      {showBottleInput && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 100, backdropFilter: "blur(4px)",
        }}>
          <div style={{
            background: "#1e1540", border: "1.5px solid rgba(167,139,250,0.3)",
            borderRadius: 24, padding: 28, width: 280, textAlign: "center",
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🍼</div>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>Quanto mamou?</div>
            <div style={{ color: "#a78bfa", fontSize: 13, marginBottom: 20 }}>Volume em ml</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 16 }}>
              {[30, 60, 90, 120].map(ml => (
                <button key={ml} onClick={() => setBottleAmount(String(ml))} style={{
                  padding: "8px 12px", borderRadius: 10,
                  background: bottleAmount === String(ml) ? "#7c3aed" : "rgba(255,255,255,0.07)",
                  border: `1.5px solid ${bottleAmount === String(ml) ? "#7c3aed" : "rgba(255,255,255,0.1)"}`,
                  color: "#f0eeff", cursor: "pointer", fontWeight: 600, fontSize: 14,
                }}>
                  {ml}
                </button>
              ))}
            </div>
            <input
              type="number"
              value={bottleAmount}
              onChange={e => setBottleAmount(e.target.value)}
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 12,
                background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.15)",
                color: "#f0eeff", fontSize: 16, textAlign: "center", marginBottom: 16,
                outline: "none",
              }}
              placeholder="outro valor"
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setShowBottleInput(false); setPendingBottle(false); }} style={{
                flex: 1, padding: "12px", borderRadius: 12,
                background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.1)",
                color: "#f0eeff", cursor: "pointer", fontWeight: 600,
              }}>Cancelar</button>
              <button onClick={confirmBottle} style={{
                flex: 1, padding: "12px", borderRadius: 12,
                background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                border: "none", color: "#fff", cursor: "pointer", fontWeight: 700,
              }}>Registrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Projections */}
      {projections.length > 0 && (
        <div style={{ padding: "20px 16px 0" }}>
          <div style={{ fontSize: 11, color: "#a78bfa", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12 }}>
            previsão para hoje
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {projections.map((p, i) => (
              <div key={i} style={{
                background: p.isOverdue
                  ? "rgba(239,68,68,0.12)"
                  : p.isWarning
                  ? "rgba(251,191,36,0.1)"
                  : "rgba(255,255,255,0.04)",
                border: `1.5px solid ${p.isOverdue ? "rgba(239,68,68,0.35)" : p.isWarning ? "rgba(251,191,36,0.3)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 14, padding: "12px 16px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 2 }}>
                    Último: {p.lastEvent} às {formatTime(p.lastTime)}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {p.label.charAt(0).toUpperCase() + p.label.slice(1)}
                  </div>
                </div>
                <div style={{
                  fontWeight: 700, fontSize: 13,
                  color: p.isOverdue ? "#f87171" : p.isWarning ? "#fbbf24" : "#a78bfa",
                  textAlign: "right",
                }}>
                  <div>{formatTime(p.time)}</div>
                  <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.8 }}>
                    {formatRelative(p.time.getTime() - now)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Log history */}
      <div style={{ padding: "20px 16px 0" }}>
        <div style={{ fontSize: 11, color: "#a78bfa", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12 }}>
          histórico
        </div>
        {/* Category filter */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto", paddingBottom: 4 }}>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)} style={{
              padding: "6px 14px", borderRadius: 20, whiteSpace: "nowrap",
              background: activeCategory === cat.id ? "#7c3aed" : "rgba(255,255,255,0.07)",
              border: `1.5px solid ${activeCategory === cat.id ? "#7c3aed" : "rgba(255,255,255,0.1)"}`,
              color: "#f0eeff", cursor: "pointer", fontSize: 12, fontWeight: 600,
            }}>
              {cat.label}
            </button>
          ))}
        </div>

        {filteredLogs.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "40px 20px",
            color: "#475569", fontSize: 14,
          }}>
            Nenhum registro ainda.<br />
            <span style={{ color: "#a78bfa" }}>Toque em um botão acima para começar.</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filteredLogs.map(log => {
              const ev = EVENTS.find(e => e.id === log.eventId);
              if (!ev) return null;
              return (
                <div key={log.id} style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1.5px solid rgba(255,255,255,0.07)",
                  borderRadius: 12, padding: "10px 14px",
                  display: "flex", alignItems: "center", gap: 12,
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: "50%",
                    background: `${ev.color}18`, border: `1.5px solid ${ev.color}44`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 15, flexShrink: 0,
                  }}>
                    {ev.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{ev.label}</div>
                    {log.ml && (
                      <div style={{ fontSize: 12, color: "#a78bfa" }}>{log.ml} ml</div>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#c4b5fd" }}>
                      {formatTime(new Date(log.timestamp))}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>
                      {formatRelative(log.timestamp - now)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Clear data */}
      {logs.length > 0 && (
        <div style={{ textAlign: "center", marginTop: 28 }}>
          <button
            onClick={() => { if (confirm("Limpar todo o histórico?")) setLogs([]); }}
            style={{
              background: "none", border: "1px solid rgba(239,68,68,0.25)",
              color: "#f87171", borderRadius: 10, padding: "8px 20px",
              cursor: "pointer", fontSize: 12,
            }}
          >
            Limpar histórico
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: "#1e1540", border: "1.5px solid rgba(167,139,250,0.4)",
          borderRadius: 14, padding: "12px 20px", fontSize: 14, fontWeight: 600,
          color: "#f0eeff", zIndex: 200, whiteSpace: "nowrap",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          animation: "fadeIn 0.2s ease",
        }}>
          {toast}
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(167,139,250,0.3); border-radius: 4px; }
      `}</style>
    </div>
  );
}
