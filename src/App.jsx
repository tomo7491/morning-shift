import { useState, useMemo } from "react";

// ============================================================
// MOCK DATA
// ============================================================
const INITIAL_STAFF = [
  { id: 1, name: "田中 美咲", role: "調理", skills: ["調理", "接客"], email: "tanaka@hotel.com" },
  { id: 2, name: "鈴木 健太", role: "接客", skills: ["接客", "フロア"], email: "suzuki@hotel.com" },
  { id: 3, name: "佐藤 花子", role: "接客", skills: ["接客"], email: "sato@hotel.com" },
  { id: 4, name: "山田 太郎", role: "調理", skills: ["調理"], email: "yamada@hotel.com" },
  { id: 5, name: "中村 あかり", role: "フロア", skills: ["接客", "フロア"], email: "nakamura@hotel.com" },
  { id: 6, name: "伊藤 誠", role: "調理", skills: ["調理", "接客"], email: "ito@hotel.com" },
];

const USERS = [
  { id: "admin", password: "admin123", role: "admin", name: "管理者" },
  { id: "tanaka", password: "pass1", role: "staff", staffId: 1, name: "田中 美咲" },
  { id: "suzuki", password: "pass2", role: "staff", staffId: 2, name: "鈴木 健太" },
  { id: "sato",   password: "pass3", role: "staff", staffId: 3, name: "佐藤 花子" },
  { id: "yamada", password: "pass4", role: "staff", staffId: 4, name: "山田 太郎" },
  { id: "nakamura",password:"pass5", role: "staff", staffId: 5, name: "中村 あかり" },
  { id: "ito",    password: "pass6", role: "staff", staffId: 6, name: "伊藤 誠" },
];

const SHIFT_TYPES = {
  early:  { label: "早番", time: "6:00〜14:00", color: "#f59e0b", bg: "#fef3c7" },
  late:   { label: "遅番", time: "10:00〜18:00", color: "#3b82f6", bg: "#dbeafe" },
  off:    { label: "休日", time: "",             color: "#94a3b8", bg: "#f1f5f9" },
  none:   { label: "未設定", time: "",           color: "#e2e8f0", bg: "#f8fafc" },
};

// ============================================================
// HELPERS
// ============================================================
function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfWeek(year, month) {
  return new Date(year, month, 1).getDay();
}
const DOW = ["日", "月", "火", "水", "木", "金", "土"];

function generateShifts(staff, year, month, requests) {
  const days = getDaysInMonth(year, month);
  const shifts = {};
  staff.forEach(s => {
    shifts[s.id] = {};
    let workCount = 0;
    let streak = 0;
    for (let d = 1; d <= days; d++) {
      const dow = new Date(year, month, d).getDay();
      const isRequested = requests[s.id]?.includes(d);
      if (isRequested) {
        shifts[s.id][d] = "off";
        streak = 0;
        continue;
      }
      // Sundays → rest, limit streak
      if (dow === 0 || streak >= 5 || workCount >= 20) {
        shifts[s.id][d] = "off";
        streak = 0;
      } else {
        // alternate early/late by staff role
        shifts[s.id][d] = s.role === "調理" ? "early" : (d % 2 === 0 ? "early" : "late");
        workCount++;
        streak++;
      }
    }
  });
  return shifts;
}

// ============================================================
// STYLES
// ============================================================
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&family=DM+Serif+Display:ital@0;1&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body { font-family: 'Noto Sans JP', sans-serif; background: #f0f4f8; color: #1e293b; }

  .app { min-height: 100vh; display: flex; flex-direction: column; }

  /* LOGIN */
  .login-wrap {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #0f4c75 100%);
  }
  .login-card {
    background: rgba(255,255,255,0.06); backdrop-filter: blur(16px);
    border: 1px solid rgba(255,255,255,0.12); border-radius: 20px;
    padding: 48px 40px; width: 360px; color: #fff;
  }
  .login-title {
    font-family: 'DM Serif Display', serif; font-size: 26px; margin-bottom: 4px; letter-spacing: 0.02em;
  }
  .login-sub { font-size: 12px; color: rgba(255,255,255,0.5); margin-bottom: 32px; letter-spacing: 0.08em; text-transform: uppercase; }
  .login-label { font-size: 11px; color: rgba(255,255,255,0.6); letter-spacing: 0.06em; margin-bottom: 6px; display: block; }
  .login-input {
    width: 100%; padding: 10px 14px; background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: #fff;
    font-size: 14px; outline: none; margin-bottom: 16px; font-family: inherit;
  }
  .login-input:focus { border-color: #60a5fa; background: rgba(255,255,255,0.12); }
  .login-input::placeholder { color: rgba(255,255,255,0.3); }
  .btn-login {
    width: 100%; padding: 12px; background: #2563eb; border: none; border-radius: 8px;
    color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit;
    transition: background 0.2s;
  }
  .btn-login:hover { background: #1d4ed8; }
  .login-err { color: #fca5a5; font-size: 12px; margin-top: 10px; text-align: center; }
  .login-hint { margin-top: 24px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 11px; color: rgba(255,255,255,0.4); line-height: 1.8; }

  /* TOPBAR */
  .topbar {
    background: #0f172a; color: #fff; padding: 0 28px;
    display: flex; align-items: center; justify-content: space-between; height: 56px;
    position: sticky; top: 0; z-index: 100;
  }
  .topbar-brand { font-family: 'DM Serif Display', serif; font-size: 18px; letter-spacing: 0.02em; }
  .topbar-brand span { color: #60a5fa; }
  .topbar-user { display: flex; align-items: center; gap: 14px; font-size: 13px; color: rgba(255,255,255,0.7); }
  .btn-logout { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: rgba(255,255,255,0.8); border-radius: 6px; padding: 5px 12px; font-size: 12px; cursor: pointer; font-family: inherit; transition: background 0.2s; }
  .btn-logout:hover { background: rgba(255,255,255,0.15); }

  /* NAV */
  .nav { background: #fff; border-bottom: 1px solid #e2e8f0; padding: 0 28px; display: flex; gap: 4px; }
  .nav-btn { padding: 14px 18px; font-size: 13px; font-weight: 500; background: none; border: none; cursor: pointer; color: #64748b; border-bottom: 2px solid transparent; transition: all 0.15s; font-family: inherit; }
  .nav-btn.active { color: #2563eb; border-bottom-color: #2563eb; }
  .nav-btn:hover:not(.active) { color: #334155; }

  /* MAIN */
  .main { flex: 1; padding: 28px; max-width: 1100px; margin: 0 auto; width: 100%; }

  /* SECTION HEADER */
  .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
  .section-title { font-size: 18px; font-weight: 700; color: #0f172a; }
  .section-sub { font-size: 12px; color: #94a3b8; margin-top: 2px; }

  /* CARDS */
  .card { background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 20px; margin-bottom: 16px; }
  .card-title { font-size: 13px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 12px; }

  /* STATS ROW */
  .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 20px; }
  .stat-card { background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 18px 20px; }
  .stat-num { font-family: 'DM Serif Display', serif; font-size: 32px; color: #0f172a; }
  .stat-label { font-size: 12px; color: #94a3b8; margin-top: 2px; }

  /* SHIFT CALENDAR TABLE */
  .shift-table-wrap { overflow-x: auto; }
  .shift-table { border-collapse: collapse; width: 100%; font-size: 12px; }
  .shift-table th { background: #f8fafc; padding: 8px 6px; text-align: center; font-weight: 600; color: #64748b; border: 1px solid #e2e8f0; position: sticky; top: 0; white-space: nowrap; }
  .shift-table td { padding: 5px 4px; border: 1px solid #e8edf2; text-align: center; vertical-align: middle; }
  .shift-table tr:hover td { background: #f8fafc; }
  .staff-name-cell { text-align: left !important; padding: 6px 10px !important; font-weight: 500; white-space: nowrap; min-width: 100px; }
  .shift-badge {
    display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 11px; font-weight: 500; cursor: pointer;
    transition: opacity 0.15s; white-space: nowrap;
  }
  .shift-badge:hover { opacity: 0.75; }
  .day-sat { color: #2563eb; }
  .day-sun { color: #dc2626; }

  /* STAFF TABLE */
  .staff-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .staff-table th { padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #e2e8f0; }
  .staff-table td { padding: 12px 14px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
  .role-badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; }
  .role-調理 { background: #fef3c7; color: #b45309; }
  .role-接客 { background: #dbeafe; color: #1d4ed8; }
  .role-フロア { background: #dcfce7; color: #15803d; }

  /* BUTTONS */
  .btn { padding: 9px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; font-family: inherit; transition: all 0.15s; }
  .btn-primary { background: #2563eb; color: #fff; }
  .btn-primary:hover { background: #1d4ed8; }
  .btn-secondary { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
  .btn-secondary:hover { background: #e2e8f0; }
  .btn-success { background: #16a34a; color: #fff; }
  .btn-success:hover { background: #15803d; }

  /* CALENDAR (request view) */
  .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
  .cal-header { text-align: center; font-size: 11px; font-weight: 700; color: #94a3b8; padding: 4px 0; }
  .cal-day {
    aspect-ratio: 1; display: flex; align-items: center; justify-content: center;
    border-radius: 8px; font-size: 13px; cursor: pointer; font-weight: 500;
    border: 2px solid transparent; transition: all 0.15s; background: #f8fafc;
  }
  .cal-day:hover { border-color: #93c5fd; }
  .cal-day.requested { background: #fee2e2; color: #dc2626; border-color: #fca5a5; font-weight: 700; }
  .cal-day.empty { background: transparent; cursor: default; }
  .cal-day.today { border-color: #2563eb; color: #2563eb; }

  /* ALERT */
  .alert { padding: 12px 16px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; }
  .alert-success { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
  .alert-info { background: #dbeafe; color: #1e40af; border: 1px solid #93c5fd; }

  /* MONTH NAV */
  .month-nav { display: flex; align-items: center; gap: 12px; }
  .month-label { font-size: 15px; font-weight: 700; min-width: 90px; text-align: center; }
  .btn-icon { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 14px; }
  .btn-icon:hover { background: #e2e8f0; }

  /* NOTIFICATION SETTINGS */
  .notif-options { display: flex; flex-direction: column; gap: 10px; }
  .notif-option { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 8px; border: 1px solid #e2e8f0; cursor: pointer; transition: all 0.15s; }
  .notif-option:hover { border-color: #93c5fd; background: #eff6ff; }
  .notif-option.selected { border-color: #2563eb; background: #eff6ff; }
  .notif-checkbox { width: 16px; height: 16px; accent-color: #2563eb; cursor: pointer; }
  .notif-name { font-size: 13px; font-weight: 600; color: #1e293b; }
  .notif-desc { font-size: 11px; color: #94a3b8; }

  .empty-state { text-align: center; padding: 48px 20px; color: #94a3b8; font-size: 14px; }
  .tag { display: inline-block; padding: 1px 7px; border-radius: 4px; font-size: 11px; background: #f1f5f9; color: #475569; margin-right: 4px; }

  select.select-input {
    padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 12px;
    background: #fff; font-family: inherit; cursor: pointer; color: #374151;
  }
`;

// ============================================================
// COMPONENTS
// ============================================================

function LoginScreen({ onLogin }) {
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");

  const handle = () => {
    const user = USERS.find(u => u.id === id && u.password === pw);
    if (user) { onLogin(user); setErr(""); }
    else setErr("IDまたはパスワードが正しくありません");
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-title">Morning Shift</div>
        <div className="login-sub">Hotel Breakfast Restaurant</div>
        <label className="login-label">ユーザーID</label>
        <input className="login-input" value={id} onChange={e => setId(e.target.value)} placeholder="例：admin" />
        <label className="login-label">パスワード</label>
        <input className="login-input" type="password" value={pw} onChange={e => setPw(e.target.value)}
          placeholder="パスワードを入力" onKeyDown={e => e.key === "Enter" && handle()} />
        <button className="btn-login" onClick={handle}>ログイン</button>
        {err && <div className="login-err">{err}</div>}
        <div className="login-hint">
          管理者：admin / admin123<br />
          スタッフ例：tanaka / pass1　suzuki / pass2<br />
          　　　　　　sato / pass3　yamada / pass4
        </div>
      </div>
    </div>
  );
}

function Topbar({ user, onLogout }) {
  return (
    <div className="topbar">
      <div className="topbar-brand">Morning <span>Shift</span></div>
      <div className="topbar-user">
        <span>{user.role === "admin" ? "👑" : "👤"} {user.name}</span>
        <button className="btn-logout" onClick={onLogout}>ログアウト</button>
      </div>
    </div>
  );
}

// ---- ADMIN VIEWS ----

function AdminDashboard({ staff, shifts, year, month }) {
  const days = getDaysInMonth(year, month);
  let totalWork = 0, totalOff = 0;
  staff.forEach(s => {
    for (let d = 1; d <= days; d++) {
      const t = shifts[s.id]?.[d];
      if (t === "early" || t === "late") totalWork++;
      if (t === "off") totalOff++;
    }
  });

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title">ダッシュボード</div>
          <div className="section-sub">{year}年{month + 1}月のシフト状況</div>
        </div>
      </div>
      <div className="stats-row">
        <div className="stat-card"><div className="stat-num">{staff.length}</div><div className="stat-label">スタッフ数</div></div>
        <div className="stat-card"><div className="stat-num">{totalWork}</div><div className="stat-label">今月の総勤務コマ数</div></div>
        <div className="stat-card"><div className="stat-num">{totalOff}</div><div className="stat-label">今月の総休日コマ数</div></div>
      </div>
      <div className="card">
        <div className="card-title">スタッフ別 今月の勤務日数</div>
        {staff.map(s => {
          const work = Object.values(shifts[s.id] || {}).filter(v => v === "early" || v === "late").length;
          const pct = Math.round((work / days) * 100);
          return (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <div style={{ width: 90, fontSize: 13, fontWeight: 500 }}>{s.name}</div>
              <div style={{ flex: 1, background: "#f1f5f9", borderRadius: 4, height: 8 }}>
                <div style={{ width: `${pct}%`, background: "#2563eb", borderRadius: 4, height: "100%" }} />
              </div>
              <div style={{ fontSize: 12, color: "#64748b", width: 60, textAlign: "right" }}>{work}日 / {days}日</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ShiftCalendar({ staff, shifts, setShifts, year, month, setYear, setMonth, requests, onGenerate }) {
  const days = getDaysInMonth(year, month);
  const cycleShift = (staffId, day) => {
    const types = ["early", "late", "off"];
    const cur = shifts[staffId]?.[day] || "none";
    const idx = types.indexOf(cur);
    const next = types[(idx + 1) % types.length];
    setShifts(prev => ({ ...prev, [staffId]: { ...prev[staffId], [day]: next } }));
  };

  const dayHeaders = [];
  for (let d = 1; d <= days; d++) {
    const dow = new Date(year, month, d).getDay();
    dayHeaders.push({ d, dow });
  }

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title">シフト管理</div>
          <div className="section-sub">セルをクリックして早番/遅番/休日を切り替えられます</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div className="month-nav">
            <button className="btn-icon" onClick={() => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }}>‹</button>
            <div className="month-label">{year}年{month + 1}月</div>
            <button className="btn-icon" onClick={() => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }}>›</button>
          </div>
          <button className="btn btn-primary" onClick={onGenerate}>⚡ 自動生成</button>
        </div>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div className="shift-table-wrap">
          <table className="shift-table">
            <thead>
              <tr>
                <th className="staff-name-cell">スタッフ</th>
                {dayHeaders.map(({ d, dow }) => (
                  <th key={d} className={dow === 0 ? "day-sun" : dow === 6 ? "day-sat" : ""}>
                    {d}<br /><span style={{ fontWeight: 400, fontSize: 10 }}>{DOW[dow]}</span>
                  </th>
                ))}
                <th>勤務日数</th>
              </tr>
            </thead>
            <tbody>
              {staff.map(s => {
                const workDays = Object.values(shifts[s.id] || {}).filter(v => v === "early" || v === "late").length;
                return (
                  <tr key={s.id}>
                    <td className="staff-name-cell">
                      <div style={{ fontWeight: 600 }}>{s.name}</div>
                      <span className={`role-badge role-${s.role}`}>{s.role}</span>
                    </td>
                    {dayHeaders.map(({ d }) => {
                      const type = shifts[s.id]?.[d] || "none";
                      const st = SHIFT_TYPES[type];
                      const isReq = requests[s.id]?.includes(d);
                      return (
                        <td key={d} onClick={() => cycleShift(s.id, d)} style={{ cursor: "pointer" }}>
                          {type !== "none" ? (
                            <span className="shift-badge" style={{ background: isReq && type === "off" ? "#fecaca" : st.bg, color: st.color }}>
                              {st.label}
                            </span>
                          ) : <span style={{ color: "#e2e8f0", fontSize: 16 }}>—</span>}
                        </td>
                      );
                    })}
                    <td style={{ fontWeight: 700, color: "#0f172a", fontSize: 13 }}>{workDays}日</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
        {Object.entries(SHIFT_TYPES).filter(([k]) => k !== "none").map(([k, v]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748b" }}>
            <span className="shift-badge" style={{ background: v.bg, color: v.color }}>{v.label}</span>
            {v.time && <span>{v.time}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function StaffList({ staff }) {
  return (
    <div>
      <div className="section-header">
        <div className="section-title">スタッフ管理</div>
      </div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="staff-table">
          <thead>
            <tr>
              <th>名前</th><th>役割</th><th>スキル</th><th>メール</th>
            </tr>
          </thead>
          <tbody>
            {staff.map(s => (
              <tr key={s.id}>
                <td style={{ fontWeight: 600 }}>{s.name}</td>
                <td><span className={`role-badge role-${s.role}`}>{s.role}</span></td>
                <td>{s.skills.map(sk => <span key={sk} className="tag">{sk}</span>)}</td>
                <td style={{ color: "#64748b", fontSize: 12 }}>{s.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RequestsView({ staff, requests, year, month }) {
  return (
    <div>
      <div className="section-header">
        <div className="section-title">希望休一覧</div>
        <div className="section-sub">{year}年{month + 1}月</div>
      </div>
      {staff.map(s => {
        const reqs = requests[s.id] || [];
        return (
          <div key={s.id} className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{s.name}</span>
              <span className={`role-badge role-${s.role}`}>{s.role}</span>
              <span style={{ fontSize: 12, color: "#94a3b8" }}>希望休：{reqs.length}日</span>
            </div>
            {reqs.length === 0
              ? <span style={{ fontSize: 13, color: "#94a3b8" }}>希望休の申請なし</span>
              : <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {reqs.sort((a,b)=>a-b).map(d => (
                    <span key={d} className="shift-badge" style={{ background: "#fee2e2", color: "#dc2626" }}>{month + 1}/{d}</span>
                  ))}
                </div>
            }
          </div>
        );
      })}
    </div>
  );
}

// ---- STAFF VIEWS ----

function MyShift({ staffMember, shifts, year, month, setYear, setMonth }) {
  const days = getDaysInMonth(year, month);
  const firstDow = getFirstDayOfWeek(year, month);
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);

  return (
    <div>
      <div className="section-header">
        <div className="section-title">マイシフト</div>
        <div className="month-nav">
          <button className="btn-icon" onClick={() => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }}>‹</button>
          <div className="month-label">{year}年{month + 1}月</div>
          <button className="btn-icon" onClick={() => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }}>›</button>
        </div>
      </div>
      <div className="card">
        <div className="cal-grid" style={{ marginBottom: 12 }}>
          {DOW.map(d => <div key={d} className="cal-header">{d}</div>)}
          {cells.map((d, i) => {
            if (!d) return <div key={`e${i}`} className="cal-day empty" />;
            const type = shifts[staffMember.staffId]?.[d] || "none";
            const st = SHIFT_TYPES[type];
            const dow = new Date(year, month, d).getDay();
            return (
              <div key={d} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 6, borderRadius: 8, background: st.bg, border: `2px solid ${type !== "none" ? st.color : "transparent"}` }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: dow === 0 ? "#dc2626" : dow === 6 ? "#2563eb" : "#374151" }}>{d}</div>
                {type !== "none" && <div style={{ fontSize: 10, color: st.color, fontWeight: 700, marginTop: 2 }}>{st.label}</div>}
                {SHIFT_TYPES[type]?.time && <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 1 }}>{st.time}</div>}
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", paddingTop: 12, borderTop: "1px solid #f1f5f9" }}>
          {Object.entries(SHIFT_TYPES).filter(([k]) => k !== "none").map(([k, v]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748b" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: v.color, display: "inline-block" }} />
              {v.label}{v.time ? `（${v.time}）` : ""}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RequestForm({ staffMember, requests, setRequests, year, month }) {
  const days = getDaysInMonth(year, month);
  const firstDow = getFirstDayOfWeek(year, month);
  const myReqs = requests[staffMember.staffId] || [];
  const [saved, setSaved] = useState(false);

  const toggle = (d) => {
    const cur = requests[staffMember.staffId] || [];
    const next = cur.includes(d) ? cur.filter(x => x !== d) : [...cur, d];
    setRequests(prev => ({ ...prev, [staffMember.staffId]: next }));
    setSaved(false);
  };

  const save = () => { setSaved(true); };

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);

  const today = new Date();

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title">希望休申請</div>
          <div className="section-sub">{year}年{month + 1}月 — 休みたい日をタップして選択</div>
        </div>
        <button className="btn btn-success" onClick={save}>保存する</button>
      </div>
      {saved && <div className="alert alert-success">✓ 希望休を保存しました。管理者に申請されます。</div>}
      <div className="card">
        <div className="cal-grid" style={{ marginBottom: 16 }}>
          {DOW.map(d => <div key={d} className="cal-header">{d}</div>)}
          {cells.map((d, i) => {
            if (!d) return <div key={`e${i}`} className="cal-day empty" />;
            const isReq = myReqs.includes(d);
            const dow = new Date(year, month, d).getDay();
            const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
            return (
              <div key={d}
                className={`cal-day${isReq ? " requested" : ""}${isToday ? " today" : ""}`}
                style={{ color: !isReq ? (dow === 0 ? "#dc2626" : dow === 6 ? "#2563eb" : "#374151") : undefined }}
                onClick={() => toggle(d)}>
                {d}
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 13, color: "#64748b" }}>
          選択中の希望休：{myReqs.length === 0 ? "なし" : myReqs.sort((a,b)=>a-b).map(d => `${month+1}/${d}`).join("、")}
        </div>
      </div>
    </div>
  );
}

function NotifSettings({ notifPrefs, setNotifPrefs, staffId }) {
  const prefs = notifPrefs[staffId] || [];
  const options = [
    { key: "email", label: "メール通知", desc: "登録メールアドレスに通知を送信します" },
    { key: "line",  label: "LINE通知",  desc: "LINEアプリに通知を送信します" },
    { key: "app",   label: "アプリ内通知", desc: "ログイン後にアプリ内でお知らせを確認できます" },
  ];
  const [saved, setSaved] = useState(false);

  const toggle = (k) => {
    const cur = notifPrefs[staffId] || [];
    const next = cur.includes(k) ? cur.filter(x => x !== k) : [...cur, k];
    setNotifPrefs(prev => ({ ...prev, [staffId]: next }));
    setSaved(false);
  };

  return (
    <div>
      <div className="section-header">
        <div className="section-title">通知設定</div>
        <button className="btn btn-success" onClick={() => setSaved(true)}>保存する</button>
      </div>
      {saved && <div className="alert alert-success">✓ 通知設定を保存しました。</div>}
      <div className="card">
        <div className="card-title">シフト確定時の通知方法（複数選択可）</div>
        <div className="notif-options">
          {options.map(o => (
            <div key={o.key} className={`notif-option${prefs.includes(o.key) ? " selected" : ""}`} onClick={() => toggle(o.key)}>
              <input type="checkbox" className="notif-checkbox" checked={prefs.includes(o.key)} onChange={() => {}} />
              <div>
                <div className="notif-name">{o.label}</div>
                <div className="notif-desc">{o.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const now = new Date();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [staff] = useState(INITIAL_STAFF);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [shifts, setShifts] = useState({});
  const [requests, setRequests] = useState({});
  const [notifPrefs, setNotifPrefs] = useState({});
  const [generated, setGenerated] = useState(false);

  const handleGenerate = () => {
    const s = generateShifts(staff, year, month, requests);
    setShifts(s);
    setGenerated(true);
  };

  const staffMember = user?.role === "staff" ? staff.find(s => s.id === user.staffId) : null;

  if (!user) return (
    <>
      <style>{css}</style>
      <LoginScreen onLogin={u => { setUser(u); setTab(u.role === "admin" ? "dashboard" : "myshift"); }} />
    </>
  );

  const adminTabs = [
    { key: "dashboard", label: "ダッシュボード" },
    { key: "shift",     label: "シフト管理" },
    { key: "staff",     label: "スタッフ管理" },
    { key: "requests",  label: "希望休一覧" },
  ];
  const staffTabs = [
    { key: "myshift",   label: "マイシフト" },
    { key: "request",   label: "希望休申請" },
    { key: "notif",     label: "通知設定" },
  ];
  const tabs = user.role === "admin" ? adminTabs : staffTabs;

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <Topbar user={user} onLogout={() => { setUser(null); setTab("dashboard"); }} />
        <nav className="nav">
          {tabs.map(t => (
            <button key={t.key} className={`nav-btn${tab === t.key ? " active" : ""}`} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </nav>
        <main className="main">
          {/* ADMIN */}
          {user.role === "admin" && tab === "dashboard" &&
            <AdminDashboard staff={staff} shifts={shifts} year={year} month={month} />}
          {user.role === "admin" && tab === "shift" && (
            <>
              {!generated && (
                <div className="alert alert-info">まだシフトが生成されていません。「⚡ 自動生成」ボタンを押すとシフト案が作成されます。</div>
              )}
              <ShiftCalendar staff={staff} shifts={shifts} setShifts={setShifts}
                year={year} month={month} setYear={setYear} setMonth={setMonth}
                requests={requests} onGenerate={handleGenerate} />
            </>
          )}
          {user.role === "admin" && tab === "staff" && <StaffList staff={staff} />}
          {user.role === "admin" && tab === "requests" && <RequestsView staff={staff} requests={requests} year={year} month={month} />}

          {/* STAFF */}
          {user.role === "staff" && tab === "myshift" &&
            <MyShift staffMember={user} shifts={shifts} year={year} month={month} setYear={setYear} setMonth={setMonth} />}
          {user.role === "staff" && tab === "request" &&
            <RequestForm staffMember={user} requests={requests} setRequests={setRequests} year={year} month={month} />}
          {user.role === "staff" && tab === "notif" &&
            <NotifSettings notifPrefs={notifPrefs} setNotifPrefs={setNotifPrefs} staffId={user.staffId} />}
        </main>
      </div>
    </>
  );
}
