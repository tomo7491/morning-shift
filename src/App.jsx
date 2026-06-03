import { useState, useMemo } from "react";

// ============================================================
// CONSTANTS
// ============================================================
const DEFAULT_PATTERNS = [
  { id: "supervisor", name: "監督", start: "06:00", end: "15:00", hours: 9 },
  { id: "pattern1",   name: "パターン1", start: "06:00", end: "11:00", hours: 5 },
  { id: "pattern2",   name: "パターン2", start: "06:30", end: "11:00", hours: 4.5 },
];

const SKILLS_LIST = [
  { id: "supervisor_cook",  label: "時間帯責任者（調理）" },
  { id: "supervisor_hall",  label: "時間帯責任者（接客）" },
  { id: "cook_main",        label: "調理メイン" },
  { id: "cook_sub",         label: "調理補助" },
  { id: "hall",             label: "ホール" },
];

const WORK_HOUR_LIMITS = [
  { id: "40h", label: "週40時間以下", weeklyMax: 40 },
  { id: "30h", label: "週30時間以下", weeklyMax: 30 },
  { id: "20h", label: "週20時間以下", weeklyMax: 20 },
];

const MEAL_COUNTS = [
  { id: "under100", label: "100食以下", required: 3 },
  { id: "under150", label: "150食以下", required: 4 },
  { id: "under200", label: "200食以下", required: 5 },
  { id: "over200",  label: "200食超",   required: 6 },
];

const INITIAL_STAFF = [
  { id: 1, name: "田中 美咲", patternId: "supervisor", skills: ["supervisor_cook","cook_main"], workLimit: "40h", email: "tanaka@hotel.com" },
  { id: 2, name: "鈴木 健太", patternId: "pattern1",   skills: ["supervisor_hall","hall"],      workLimit: "30h", email: "suzuki@hotel.com" },
  { id: 3, name: "佐藤 花子", patternId: "pattern1",   skills: ["hall"],                        workLimit: "20h", email: "sato@hotel.com" },
  { id: 4, name: "山田 太郎", patternId: "pattern2",   skills: ["cook_main","cook_sub"],        workLimit: "30h", email: "yamada@hotel.com" },
  { id: 5, name: "中村 あかり",patternId: "pattern2",  skills: ["hall","cook_sub"],             workLimit: "20h", email: "nakamura@hotel.com" },
  { id: 6, name: "伊藤 誠",   patternId: "pattern1",   skills: ["cook_main"],                  workLimit: "40h", email: "ito@hotel.com" },
];

const USERS = [
  { id: "admin",    password: "admin123",  role: "admin",  name: "管理者" },
  { id: "tanaka",   password: "pass1",     role: "staff",  staffId: 1, name: "田中 美咲" },
  { id: "suzuki",   password: "pass2",     role: "staff",  staffId: 2, name: "鈴木 健太" },
  { id: "sato",     password: "pass3",     role: "staff",  staffId: 3, name: "佐藤 花子" },
  { id: "yamada",   password: "pass4",     role: "staff",  staffId: 4, name: "山田 太郎" },
  { id: "nakamura", password: "pass5",     role: "staff",  staffId: 5, name: "中村 あかり" },
  { id: "ito",      password: "pass6",     role: "staff",  staffId: 6, name: "伊藤 誠" },
];

const DOW = ["日","月","火","水","木","金","土"];

// ============================================================
// HELPERS
// ============================================================
// 給与期間：11日〜翌10日
function getPayPeriodDays(year, month) {
  // 当月11日〜翌月10日
  const days = [];
  for (let d = 11; d <= 31; d++) {
    const dt = new Date(year, month, d);
    if (dt.getMonth() !== month) break;
    days.push({ year, month, day: d, date: dt });
  }
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear  = month === 11 ? year + 1 : year;
  for (let d = 1; d <= 10; d++) {
    const dt = new Date(nextYear, nextMonth, d);
    days.push({ year: nextYear, month: nextMonth, day: d, date: dt });
  }
  return days;
}

function getPatternById(patterns, id) {
  return patterns.find(p => p.id === id) || patterns[0];
}

// 月の法定労働時間（変形労働時間制）= 40h × 月の週数
function getMonthlyLegalHours(year, month) {
  // 簡易計算：暦日数/7*40
  const days = new Date(year, month + 1, 0).getDate();
  return Math.floor((days / 7) * 40 * 10) / 10;
}

function calcStaffMonthlyHours(staffId, shifts, patterns, payDays) {
  let total = 0;
  payDays.forEach(({ year, month, day }) => {
    const shiftVal = shifts[staffId]?.[`${year}-${month}-${day}`];
    if (shiftVal && shiftVal !== "off") {
      const pat = patterns.find(p => p.id === shiftVal);
      if (pat) total += pat.hours;
    }
  });
  return total;
}

// ============================================================
// CSS
// ============================================================
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&family=DM+Serif+Display:ital@0;1&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Noto Sans JP', sans-serif; background: #f0f4f8; color: #1e293b; }
  .app { min-height: 100vh; display: flex; flex-direction: column; }

  /* LOGIN */
  .login-wrap { min-height:100vh; display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 60%,#0f4c75 100%); }
  .login-card { background:rgba(255,255,255,0.06); backdrop-filter:blur(16px); border:1px solid rgba(255,255,255,0.12); border-radius:20px; padding:48px 40px; width:360px; color:#fff; }
  .login-title { font-family:'DM Serif Display',serif; font-size:26px; margin-bottom:4px; }
  .login-sub { font-size:12px; color:rgba(255,255,255,0.5); margin-bottom:32px; letter-spacing:0.08em; text-transform:uppercase; }
  .login-label { font-size:11px; color:rgba(255,255,255,0.6); letter-spacing:0.06em; margin-bottom:6px; display:block; }
  .login-input { width:100%; padding:10px 14px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); border-radius:8px; color:#fff; font-size:14px; outline:none; margin-bottom:16px; font-family:inherit; }
  .login-input:focus { border-color:#60a5fa; }
  .login-input::placeholder { color:rgba(255,255,255,0.3); }
  .btn-login { width:100%; padding:12px; background:#2563eb; border:none; border-radius:8px; color:#fff; font-size:14px; font-weight:600; cursor:pointer; font-family:inherit; }
  .btn-login:hover { background:#1d4ed8; }
  .login-err { color:#fca5a5; font-size:12px; margin-top:10px; text-align:center; }
  .login-hint { margin-top:24px; padding-top:20px; border-top:1px solid rgba(255,255,255,0.1); font-size:11px; color:rgba(255,255,255,0.4); line-height:1.8; }

  /* TOPBAR */
  .topbar { background:#0f172a; color:#fff; padding:0 20px; display:flex; align-items:center; justify-content:space-between; height:52px; position:sticky; top:0; z-index:100; }
  .topbar-brand { font-family:'DM Serif Display',serif; font-size:17px; }
  .topbar-brand span { color:#60a5fa; }
  .topbar-user { display:flex; align-items:center; gap:12px; font-size:13px; color:rgba(255,255,255,0.7); }
  .btn-logout { background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); color:rgba(255,255,255,0.8); border-radius:6px; padding:5px 12px; font-size:12px; cursor:pointer; font-family:inherit; }
  .btn-logout:hover { background:rgba(255,255,255,0.15); }

  /* NAV */
  .nav { background:#fff; border-bottom:1px solid #e2e8f0; padding:0 20px; display:flex; gap:2px; overflow-x:auto; }
  .nav-btn { padding:12px 14px; font-size:13px; font-weight:500; background:none; border:none; cursor:pointer; color:#64748b; border-bottom:2px solid transparent; white-space:nowrap; font-family:inherit; transition:all 0.15s; }
  .nav-btn.active { color:#2563eb; border-bottom-color:#2563eb; }
  .nav-btn:hover:not(.active) { color:#334155; }

  /* MAIN */
  .main { flex:1; padding:20px; max-width:1200px; margin:0 auto; width:100%; }

  /* SECTION */
  .section-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; flex-wrap:wrap; gap:10px; }
  .section-title { font-size:17px; font-weight:700; color:#0f172a; }
  .section-sub { font-size:12px; color:#94a3b8; margin-top:2px; }

  /* CARD */
  .card { background:#fff; border-radius:12px; border:1px solid #e2e8f0; padding:18px; margin-bottom:14px; }
  .card-title { font-size:12px; font-weight:700; color:#475569; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:12px; }

  /* STATS */
  .stats-row { display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:12px; margin-bottom:16px; }
  .stat-card { background:#fff; border-radius:12px; border:1px solid #e2e8f0; padding:16px; }
  .stat-num { font-family:'DM Serif Display',serif; font-size:28px; color:#0f172a; }
  .stat-label { font-size:11px; color:#94a3b8; margin-top:2px; }

  /* BUTTONS */
  .btn { padding:8px 16px; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; border:none; font-family:inherit; transition:all 0.15s; }
  .btn-primary { background:#2563eb; color:#fff; }
  .btn-primary:hover { background:#1d4ed8; }
  .btn-secondary { background:#f1f5f9; color:#475569; border:1px solid #e2e8f0; }
  .btn-secondary:hover { background:#e2e8f0; }
  .btn-success { background:#16a34a; color:#fff; }
  .btn-success:hover { background:#15803d; }
  .btn-danger { background:#dc2626; color:#fff; }
  .btn-danger:hover { background:#b91c1c; }
  .btn-sm { padding:5px 10px; font-size:12px; }

  /* ALERT */
  .alert { padding:10px 14px; border-radius:8px; font-size:13px; margin-bottom:12px; display:flex; align-items:flex-start; gap:8px; }
  .alert-success { background:#dcfce7; color:#15803d; border:1px solid #86efac; }
  .alert-info    { background:#dbeafe; color:#1e40af; border:1px solid #93c5fd; }
  .alert-warning { background:#fef9c3; color:#854d0e; border:1px solid #fde047; }
  .alert-danger  { background:#fee2e2; color:#991b1b; border:1px solid #fca5a5; }

  /* TABLE */
  .data-table { width:100%; border-collapse:collapse; font-size:13px; }
  .data-table th { padding:9px 12px; text-align:left; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.05em; border-bottom:2px solid #e2e8f0; background:#f8fafc; }
  .data-table td { padding:10px 12px; border-bottom:1px solid #f1f5f9; vertical-align:middle; }
  .data-table tr:hover td { background:#f8fafc; }

  /* SHIFT TABLE */
  .shift-wrap { overflow-x:auto; }
  .shift-table { border-collapse:collapse; font-size:11px; }
  .shift-table th { background:#f8fafc; padding:6px 4px; text-align:center; font-weight:600; color:#64748b; border:1px solid #e2e8f0; white-space:nowrap; position:sticky; top:0; }
  .shift-table td { padding:4px 3px; border:1px solid #e8edf2; text-align:center; vertical-align:middle; }
  .shift-table tr:hover td { background:#f8fafc; }
  .staff-cell { text-align:left !important; padding:6px 8px !important; min-width:90px; white-space:nowrap; }
  .shift-badge { display:inline-block; padding:2px 5px; border-radius:4px; font-size:10px; font-weight:600; cursor:pointer; white-space:nowrap; border:none; font-family:inherit; }
  .day-sat { color:#2563eb; }
  .day-sun { color:#dc2626; }
  .day-separator { background:#e2e8f0 !important; }

  /* BADGE */
  .badge { display:inline-block; padding:2px 8px; border-radius:20px; font-size:11px; font-weight:600; }
  .badge-supervisor { background:#fef3c7; color:#b45309; }
  .badge-pattern1   { background:#dbeafe; color:#1d4ed8; }
  .badge-pattern2   { background:#dcfce7; color:#15803d; }
  .badge-off        { background:#f1f5f9; color:#94a3b8; }
  .tag { display:inline-block; padding:1px 6px; border-radius:4px; font-size:11px; background:#f1f5f9; color:#475569; margin:1px; }

  /* FORM */
  .form-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px; }
  .form-row-3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-bottom:12px; }
  .form-group { display:flex; flex-direction:column; gap:4px; }
  .form-label { font-size:12px; font-weight:600; color:#475569; }
  .form-input { padding:8px 10px; border:1px solid #e2e8f0; border-radius:6px; font-size:13px; font-family:inherit; outline:none; background:#fff; }
  .form-input:focus { border-color:#2563eb; }
  .form-select { padding:8px 10px; border:1px solid #e2e8f0; border-radius:6px; font-size:13px; font-family:inherit; outline:none; background:#fff; cursor:pointer; }
  .checkbox-group { display:flex; flex-wrap:wrap; gap:8px; }
  .checkbox-item { display:flex; align-items:center; gap:6px; font-size:12px; cursor:pointer; padding:4px 8px; border-radius:6px; border:1px solid #e2e8f0; }
  .checkbox-item.checked { background:#eff6ff; border-color:#2563eb; color:#1d4ed8; }

  /* MODAL */
  .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.4); z-index:200; display:flex; align-items:center; justify-content:center; padding:20px; }
  .modal { background:#fff; border-radius:16px; padding:24px; width:100%; max-width:500px; max-height:90vh; overflow-y:auto; }
  .modal-title { font-size:16px; font-weight:700; margin-bottom:16px; color:#0f172a; }
  .modal-footer { display:flex; justify-content:flex-end; gap:10px; margin-top:16px; }

  /* CALENDAR */
  .cal-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:4px; }
  .cal-header { text-align:center; font-size:11px; font-weight:700; color:#94a3b8; padding:4px 0; }
  .cal-day { aspect-ratio:1; display:flex; align-items:center; justify-content:center; border-radius:8px; font-size:13px; cursor:pointer; font-weight:500; border:2px solid transparent; transition:all 0.15s; background:#f8fafc; }
  .cal-day:hover { border-color:#93c5fd; }
  .cal-day.requested { background:#fee2e2; color:#dc2626; border-color:#fca5a5; font-weight:700; }
  .cal-day.empty { background:transparent; cursor:default; }

  /* MEAL COUNT SELECTOR */
  .meal-selector { display:grid; grid-template-columns:repeat(4,1fr); gap:6px; }
  .meal-btn { padding:6px 4px; border-radius:6px; border:2px solid #e2e8f0; background:#fff; font-size:11px; font-weight:600; cursor:pointer; text-align:center; font-family:inherit; transition:all 0.15s; }
  .meal-btn:hover { border-color:#93c5fd; }
  .meal-btn.selected { background:#eff6ff; border-color:#2563eb; color:#1d4ed8; }
  .meal-btn.under100.selected { background:#dcfce7; border-color:#16a34a; color:#15803d; }
  .meal-btn.under150.selected { background:#fef9c3; border-color:#ca8a04; color:#854d0e; }
  .meal-btn.under200.selected { background:#ffedd5; border-color:#ea580c; color:#9a3412; }
  .meal-btn.over200.selected  { background:#fee2e2; border-color:#dc2626; color:#991b1b; }

  /* PROGRESS BAR */
  .progress-bar { height:6px; background:#f1f5f9; border-radius:3px; overflow:hidden; margin-top:4px; }
  .progress-fill { height:100%; border-radius:3px; transition:width 0.3s; }
  .progress-ok      { background:#16a34a; }
  .progress-warning { background:#f59e0b; }
  .progress-over    { background:#dc2626; }

  /* MONTH NAV */
  .month-nav { display:flex; align-items:center; gap:10px; }
  .month-label { font-size:14px; font-weight:700; min-width:100px; text-align:center; }
  .btn-icon { background:#f1f5f9; border:1px solid #e2e8f0; border-radius:6px; width:28px; height:28px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:13px; }
  .btn-icon:hover { background:#e2e8f0; }

  /* PAY PERIOD LABEL */
  .pay-period-label { font-size:12px; color:#64748b; background:#f1f5f9; border-radius:6px; padding:4px 10px; }

  @media (max-width: 640px) {
    .main { padding: 12px; }
    .form-row, .form-row-3 { grid-template-columns: 1fr; }
    .stats-row { grid-template-columns: repeat(2, 1fr); }
    .meal-selector { grid-template-columns: repeat(2, 1fr); }
  }
`;

// ============================================================
// SHIFT COLOR MAP
// ============================================================
const PATTERN_STYLE = {
  supervisor: { bg:"#fef3c7", color:"#b45309", cls:"badge-supervisor" },
  pattern1:   { bg:"#dbeafe", color:"#1d4ed8", cls:"badge-pattern1" },
  pattern2:   { bg:"#dcfce7", color:"#15803d", cls:"badge-pattern2" },
  off:        { bg:"#f1f5f9", color:"#94a3b8", cls:"badge-off" },
};

// ============================================================
// LOGIN
// ============================================================
function LoginScreen({ onLogin }) {
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const handle = () => {
    const u = USERS.find(u => u.id === id && u.password === pw);
    if (u) onLogin(u);
    else setErr("IDまたはパスワードが正しくありません");
  };
  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-title">Morning Shift</div>
        <div className="login-sub">Hotel Breakfast Restaurant</div>
        <label className="login-label">ユーザーID</label>
        <input className="login-input" value={id} onChange={e=>setId(e.target.value)} placeholder="例：admin" />
        <label className="login-label">パスワード</label>
        <input className="login-input" type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handle()} placeholder="パスワードを入力" />
        <button className="btn-login" onClick={handle}>ログイン</button>
        {err && <div className="login-err">{err}</div>}
        <div className="login-hint">管理者：admin / admin123<br/>スタッフ例：tanaka/pass1　suzuki/pass2<br/>sato/pass3　yamada/pass4</div>
      </div>
    </div>
  );
}

// ============================================================
// TOPBAR
// ============================================================
function Topbar({ user, onLogout }) {
  return (
    <div className="topbar">
      <div className="topbar-brand">Morning <span>Shift</span></div>
      <div className="topbar-user">
        <span>{user.role==="admin"?"👑":"👤"} {user.name}</span>
        <button className="btn-logout" onClick={onLogout}>ログアウト</button>
      </div>
    </div>
  );
}

// ============================================================
// STAFF MODAL
// ============================================================
function StaffModal({ staff, onSave, onClose, patterns }) {
  const [form, setForm] = useState(staff || { name:"", patternId:"pattern1", skills:[], workLimit:"40h", email:"" });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const toggleSkill = (sk) => {
    const cur = form.skills||[];
    set("skills", cur.includes(sk)?cur.filter(s=>s!==sk):[...cur,sk]);
  };
  const isEdit = !!staff;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-title">{isEdit?"スタッフ編集":"スタッフ追加（入社）"}</div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">氏名 *</label>
            <input className="form-input" value={form.name} onChange={e=>set("name",e.target.value)} placeholder="例：田中 太郎" />
          </div>
          <div className="form-group">
            <label className="form-label">メールアドレス</label>
            <input className="form-input" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="例：tanaka@hotel.com" />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">デフォルト出勤パターン</label>
            <select className="form-select" value={form.patternId} onChange={e=>set("patternId",e.target.value)}>
              {patterns.map(p=><option key={p.id} value={p.id}>{p.name}（{p.start}〜{p.end}）</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">週の就労時間上限</label>
            <select className="form-select" value={form.workLimit} onChange={e=>set("workLimit",e.target.value)}>
              {WORK_HOUR_LIMITS.map(l=><option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group" style={{marginBottom:14}}>
          <label className="form-label">スキル（複数選択可）</label>
          <div className="checkbox-group" style={{marginTop:6}}>
            {SKILLS_LIST.map(sk=>(
              <label key={sk.id} className={`checkbox-item${form.skills?.includes(sk.id)?" checked":""}`}>
                <input type="checkbox" checked={form.skills?.includes(sk.id)||false} onChange={()=>toggleSkill(sk.id)} style={{display:"none"}} />
                {form.skills?.includes(sk.id)?"✓ ":""}{sk.label}
              </label>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>キャンセル</button>
          <button className="btn btn-primary" onClick={()=>{if(form.name)onSave(form);}}>保存</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PATTERN MODAL
// ============================================================
function PatternModal({ onSave, onClose }) {
  const [form, setForm] = useState({ name:"", start:"06:00", end:"11:00" });
  const calcHours = (s,e) => {
    const [sh,sm]=s.split(":").map(Number);
    const [eh,em]=e.split(":").map(Number);
    return Math.round(((eh*60+em)-(sh*60+sm))/60*10)/10;
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-title">出勤パターン追加</div>
        <div className="form-row-3">
          <div className="form-group">
            <label className="form-label">パターン名</label>
            <input className="form-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="例：中番" />
          </div>
          <div className="form-group">
            <label className="form-label">開始時間</label>
            <input className="form-input" type="time" value={form.start} onChange={e=>setForm(f=>({...f,start:e.target.value}))} />
          </div>
          <div className="form-group">
            <label className="form-label">終了時間</label>
            <input className="form-input" type="time" value={form.end} onChange={e=>setForm(f=>({...f,end:e.target.value}))} />
          </div>
        </div>
        <div style={{fontSize:13,color:"#64748b",marginBottom:8}}>勤務時間：{calcHours(form.start,form.end)}時間</div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>キャンセル</button>
          <button className="btn btn-primary" onClick={()=>{if(form.name)onSave({...form,id:`custom_${Date.now()}`,hours:calcHours(form.start,form.end)});}}>追加</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ADMIN: STAFF MANAGEMENT
// ============================================================
function StaffManagement({ staff, setStaff, patterns, setPatterns }) {
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [editStaff, setEditStaff]       = useState(null);
  const [showAddPattern, setShowAddPattern] = useState(false);
  const [deleteConfirm, setDeleteConfirm]   = useState(null);

  const saveStaff = (form) => {
    if (editStaff) {
      setStaff(s=>s.map(x=>x.id===editStaff.id?{...x,...form}:x));
      setEditStaff(null);
    } else {
      setStaff(s=>[...s,{...form,id:Date.now()}]);
      setShowAddStaff(false);
    }
  };

  const deleteStaff = (id) => { setStaff(s=>s.filter(x=>x.id!==id)); setDeleteConfirm(null); };

  return (
    <div>
      <div className="section-header">
        <div><div className="section-title">スタッフ管理</div></div>
        <button className="btn btn-primary" onClick={()=>setShowAddStaff(true)}>＋ スタッフ追加（入社）</button>
      </div>

      {/* Staff Table */}
      <div className="card" style={{padding:0,overflow:"hidden",marginBottom:20}}>
        <table className="data-table">
          <thead><tr><th>氏名</th><th>パターン</th><th>時間上限</th><th>スキル</th><th>操作</th></tr></thead>
          <tbody>
            {staff.map(s=>{
              const pat = getPatternById(patterns, s.patternId);
              const limit = WORK_HOUR_LIMITS.find(l=>l.id===s.workLimit);
              return (
                <tr key={s.id}>
                  <td style={{fontWeight:600}}>{s.name}</td>
                  <td><span className={`badge badge-${s.patternId}`}>{pat.name}<span style={{fontWeight:400,marginLeft:4,fontSize:10}}>{pat.start}〜{pat.end}</span></span></td>
                  <td style={{fontSize:12,color:"#64748b"}}>{limit?.label}</td>
                  <td>{s.skills?.map(sk=><span key={sk} className="tag">{SKILLS_LIST.find(x=>x.id===sk)?.label}</span>)}</td>
                  <td>
                    <div style={{display:"flex",gap:6}}>
                      <button className="btn btn-secondary btn-sm" onClick={()=>setEditStaff(s)}>編集</button>
                      <button className="btn btn-danger btn-sm" onClick={()=>setDeleteConfirm(s)}>退職</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pattern Management */}
      <div className="section-header">
        <div><div className="section-title" style={{fontSize:15}}>出勤パターン管理</div></div>
        <button className="btn btn-secondary" onClick={()=>setShowAddPattern(true)}>＋ パターン追加</button>
      </div>
      <div className="card" style={{padding:0,overflow:"hidden"}}>
        <table className="data-table">
          <thead><tr><th>パターン名</th><th>開始</th><th>終了</th><th>勤務時間</th><th>操作</th></tr></thead>
          <tbody>
            {patterns.map(p=>(
              <tr key={p.id}>
                <td style={{fontWeight:600}}><span className={`badge badge-${p.id}`}>{p.name}</span></td>
                <td>{p.start}</td><td>{p.end}</td>
                <td>{p.hours}時間</td>
                <td>
                  {!DEFAULT_PATTERNS.find(dp=>dp.id===p.id) &&
                    <button className="btn btn-danger btn-sm" onClick={()=>setPatterns(ps=>ps.filter(x=>x.id!==p.id))}>削除</button>
                  }
                  {DEFAULT_PATTERNS.find(dp=>dp.id===p.id) && <span style={{fontSize:12,color:"#94a3b8"}}>固定</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(showAddStaff||editStaff) && <StaffModal staff={editStaff} onSave={saveStaff} onClose={()=>{setShowAddStaff(false);setEditStaff(null);}} patterns={patterns} />}
      {showAddPattern && <PatternModal onSave={(p)=>{setPatterns(ps=>[...ps,p]);setShowAddPattern(false);}} onClose={()=>setShowAddPattern(false)} />}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={()=>setDeleteConfirm(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-title">退職処理の確認</div>
            <p style={{fontSize:14,color:"#475569",marginBottom:16}}>「{deleteConfirm.name}」を削除します。この操作は取り消せません。</p>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>setDeleteConfirm(null)}>キャンセル</button>
              <button className="btn btn-danger" onClick={()=>deleteStaff(deleteConfirm.id)}>退職処理を実行</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// ADMIN: SHIFT MANAGEMENT
// ============================================================
function ShiftManagement({ staff, shifts, setShifts, patterns, mealCounts, setMealCounts, payYear, payMonth, setPayYear, setPayMonth }) {
  const payDays = useMemo(()=>getPayPeriodDays(payYear, payMonth),[payYear,payMonth]);

  const getKey = (y,m,d) => `${y}-${m}-${d}`;
  const getShift = (staffId, y, m, d) => shifts[staffId]?.[getKey(y,m,d)] || "none";
  const cycleShift = (staffId, y, m, d) => {
    const options = [...patterns.map(p=>p.id), "off"];
    const cur = getShift(staffId,y,m,d);
    const idx = options.indexOf(cur);
    const next = options[(idx+1)%options.length];
    setShifts(prev=>({...prev,[staffId]:{...prev[staffId],[getKey(y,m,d)]:next}}));
  };

  const getMealCount = (y,m,d) => mealCounts[getKey(y,m,d)] || "under100";
  const setMealCount = (y,m,d,val) => setMealCounts(prev=>({...prev,[getKey(y,m,d)]:val}));
  const getRequiredStaff = (y,m,d) => MEAL_COUNTS.find(x=>x.id===getMealCount(y,m,d))?.required || 3;

  const getActualStaff = (y,m,d) => {
    return staff.filter(s=>{
      const sh = getShift(s.id,y,m,d);
      return sh !== "none" && sh !== "off";
    }).length;
  };

  // Alerts
  const alerts = useMemo(()=>{
    const list = [];
    // Staff shortage alerts
    payDays.forEach(({year,month,day})=>{
      const required = getRequiredStaff(year,month,day);
      const actual   = getActualStaff(year,month,day);
      if(actual < required && actual > 0){
        const dow = new Date(year,month,day).getDay();
        list.push({ type:"warning", msg:`${month+1}/${day}（${DOW[dow]}）: 必要${required}名に対し${actual}名（${required-actual}名不足）` });
      }
    });
    // Hours alerts
    staff.forEach(s=>{
      const total = calcStaffMonthlyHours(s.id, shifts, patterns, payDays);
      const legal = getMonthlyLegalHours(payYear, payMonth);
      const limit = WORK_HOUR_LIMITS.find(l=>l.id===s.workLimit);
      if(total > legal) list.push({ type:"danger", msg:`${s.name}：月間法定労働時間（${legal}h）超過（${total}h）` });
      else if(limit && total > limit.weeklyMax * 4.33) list.push({ type:"warning", msg:`${s.name}：月間就労時間上限に近づいています（${total}h）` });
    });
    return list;
  },[payDays,shifts,staff,patterns]);

  const generateShifts = () => {
    const newShifts = {};
    staff.forEach(s=>{
      newShifts[s.id] = {};
      let streak = 0;
      payDays.forEach(({year,month,day})=>{
        const key = getKey(year,month,day);
        const dow = new Date(year,month,day).getDay();
        if(dow===0 || streak>=5){
          newShifts[s.id][key]="off"; streak=0;
        } else {
          newShifts[s.id][key]=s.patternId; streak++;
        }
      });
    });
    setShifts(newShifts);
  };

  const payLabel = `${payYear}年${payMonth+1}月11日〜${payMonth===11?payYear+1:payYear}年${payMonth===11?1:payMonth+2}月10日`;

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title">シフト管理</div>
          <div className="section-sub pay-period-label" style={{display:"inline-block",marginTop:4}}>{payLabel}</div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <div className="month-nav">
            <button className="btn-icon" onClick={()=>setPayMonth(m=>m===0?(setPayYear(y=>y-1),11):m-1)}>‹</button>
            <div className="month-label">{payYear}年{payMonth+1}月〜</div>
            <button className="btn-icon" onClick={()=>setPayMonth(m=>m===11?(setPayYear(y=>y+1),0):m+1)}>›</button>
          </div>
          <button className="btn btn-primary" onClick={generateShifts}>⚡ 自動生成</button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.map((a,i)=>(
        <div key={i} className={`alert alert-${a.type}`}>
          {a.type==="danger"?"🔴":"⚠️"} {a.msg}
        </div>
      ))}
      {alerts.length===0 && Object.keys(shifts).length>0 && (
        <div className="alert alert-success">✓ 現在アラートはありません</div>
      )}

      {/* Shift Table */}
      <div className="card" style={{padding:0}}>
        <div className="shift-wrap">
          <table className="shift-table">
            <thead>
              <tr>
                <th className="staff-cell">スタッフ</th>
                {payDays.map(({year,month,day})=>{
                  const dow = new Date(year,month,day).getDay();
                  const isSep = day===11||day===1;
                  return (
                    <th key={`${year}-${month}-${day}`} className={`${dow===0?"day-sun":dow===6?"day-sat":""}`} style={isSep?{borderLeft:"3px solid #2563eb"}:{}}>
                      {day}<br/><span style={{fontWeight:400,fontSize:9}}>{DOW[dow]}</span>
                    </th>
                  );
                })}
                <th>合計</th>
              </tr>
              {/* Meal count row */}
              <tr>
                <th className="staff-cell" style={{fontSize:10,color:"#94a3b8"}}>客数見込</th>
                {payDays.map(({year,month,day})=>{
                  const mc = getMealCount(year,month,day);
                  const mcDef = MEAL_COUNTS.find(x=>x.id===mc);
                  return (
                    <th key={`meal-${year}-${month}-${day}`} style={{padding:2}}>
                      <select style={{fontSize:9,border:"none",background:"transparent",cursor:"pointer",width:"100%",color:mc==="over200"?"#dc2626":mc==="under200"?"#ea580c":mc==="under150"?"#ca8a04":"#16a34a"}}
                        value={mc} onChange={e=>setMealCount(year,month,day,e.target.value)}>
                        {MEAL_COUNTS.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}
                      </select>
                    </th>
                  );
                })}
                <th></th>
              </tr>
              {/* Required staff row */}
              <tr>
                <th className="staff-cell" style={{fontSize:10,color:"#94a3b8"}}>必要人数</th>
                {payDays.map(({year,month,day})=>{
                  const req = getRequiredStaff(year,month,day);
                  const act = getActualStaff(year,month,day);
                  const isShort = act>0 && act<req;
                  return (
                    <th key={`req-${year}-${month}-${day}`} style={{fontSize:10,color:isShort?"#dc2626":"#16a34a",background:isShort?"#fee2e2":"#dcfce7"}}>
                      {act}/{req}
                    </th>
                  );
                })}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {staff.map(s=>{
                const totalHours = calcStaffMonthlyHours(s.id, shifts, patterns, payDays);
                const legal = getMonthlyLegalHours(payYear, payMonth);
                const isOver = totalHours > legal;
                return (
                  <tr key={s.id}>
                    <td className="staff-cell">
                      <div style={{fontWeight:600,fontSize:12}}>{s.name}</div>
                      <div style={{fontSize:10,color:isOver?"#dc2626":"#64748b"}}>{totalHours}h{isOver?" ⚠️":""}</div>
                    </td>
                    {payDays.map(({year,month,day})=>{
                      const sh = getShift(s.id,year,month,day);
                      const pat = patterns.find(p=>p.id===sh);
                      const style = PATTERN_STYLE[sh] || PATTERN_STYLE.off;
                      return (
                        <td key={`${year}-${month}-${day}`} onClick={()=>cycleShift(s.id,year,month,day)} style={{cursor:"pointer"}}>
                          {sh!=="none"
                            ? <span className="shift-badge" style={{background:style.bg,color:style.color}}>{pat?pat.name:sh==="off"?"休":""}</span>
                            : <span style={{color:"#e2e8f0"}}>—</span>
                          }
                        </td>
                      );
                    })}
                    <td style={{fontWeight:700,fontSize:12,color:isOver?"#dc2626":"#0f172a",whiteSpace:"nowrap"}}>{totalHours}h</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:8}}>
        {patterns.map(p=>{
          const style = PATTERN_STYLE[p.id]||{bg:"#f1f5f9",color:"#475569"};
          return <span key={p.id} className="shift-badge" style={{background:style.bg,color:style.color}}>{p.name}（{p.start}〜{p.end}）</span>;
        })}
        <span className="shift-badge" style={{background:PATTERN_STYLE.off.bg,color:PATTERN_STYLE.off.color}}>休日</span>
      </div>
    </div>
  );
}

// ============================================================
// ADMIN: DASHBOARD
// ============================================================
function Dashboard({ staff, shifts, patterns, payYear, payMonth }) {
  const payDays = useMemo(()=>getPayPeriodDays(payYear,payMonth),[payYear,payMonth]);
  const legal = getMonthlyLegalHours(payYear,payMonth);

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title">ダッシュボード</div>
          <div className="section-sub">{payYear}年{payMonth+1}月11日〜{payMonth===11?payYear+1:payYear}年{payMonth===11?1:payMonth+2}月10日</div>
        </div>
      </div>
      <div className="stats-row">
        <div className="stat-card"><div className="stat-num">{staff.length}</div><div className="stat-label">スタッフ数</div></div>
        <div className="stat-card"><div className="stat-num">{payDays.length}</div><div className="stat-label">給与期間日数</div></div>
        <div className="stat-card"><div className="stat-num">{legal}h</div><div className="stat-label">月間法定労働時間</div></div>
      </div>
      <div className="card">
        <div className="card-title">スタッフ別 月間労働時間</div>
        {staff.map(s=>{
          const total = calcStaffMonthlyHours(s.id,shifts,patterns,payDays);
          const limit = WORK_HOUR_LIMITS.find(l=>l.id===s.workLimit);
          const max   = Math.min(limit?.weeklyMax*4.33||legal, legal);
          const pct   = Math.min((total/max)*100,100);
          const isOver = total>legal;
          const isWarn = limit && total>limit.weeklyMax*4.33;
          return (
            <div key={s.id} style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
                <span style={{fontWeight:600}}>{s.name}</span>
                <span style={{color:isOver?"#dc2626":isWarn?"#f59e0b":"#64748b"}}>{total}h / {legal}h法定{isOver?" 🔴超過":isWarn?" ⚠️":""}
                </span>
              </div>
              <div className="progress-bar">
                <div className={`progress-fill ${isOver?"progress-over":isWarn?"progress-warning":"progress-ok"}`} style={{width:`${pct}%`}} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// ADMIN: REQUESTS VIEW
// ============================================================
function RequestsView({ staff, requests, payYear, payMonth }) {
  const payDays = useMemo(()=>getPayPeriodDays(payYear,payMonth),[payYear,payMonth]);
  return (
    <div>
      <div className="section-header"><div className="section-title">希望休一覧</div></div>
      {staff.map(s=>{
        const reqs = (requests[s.id]||[]).filter(k=>{
          const [y,m]=k.split("-").map(Number);
          return payDays.some(d=>d.year===y&&d.month===m);
        });
        return (
          <div key={s.id} className="card" style={{marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
              <span style={{fontWeight:700}}>{s.name}</span>
              <span style={{fontSize:12,color:"#94a3b8"}}>希望休 {reqs.length}日</span>
            </div>
            {reqs.length===0
              ? <span style={{fontSize:13,color:"#94a3b8"}}>申請なし</span>
              : <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {reqs.sort().map(k=>{
                    const [y,m,d]=k.split("-").map(Number);
                    return <span key={k} className="shift-badge" style={{background:"#fee2e2",color:"#dc2626"}}>{m+1}/{d}</span>;
                  })}
                </div>
            }
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// STAFF: MY SHIFT
// ============================================================
function MyShift({ user, shifts, patterns, payYear, payMonth, setPayYear, setPayMonth }) {
  const payDays = useMemo(()=>getPayPeriodDays(payYear,payMonth),[payYear,payMonth]);
  const payLabel = `${payYear}年${payMonth+1}月11日〜${payMonth===11?payYear+1:payYear}年${payMonth===11?1:payMonth+2}月10日`;

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title">マイシフト</div>
          <div className="pay-period-label">{payLabel}</div>
        </div>
        <div className="month-nav">
          <button className="btn-icon" onClick={()=>setPayMonth(m=>m===0?(setPayYear(y=>y-1),11):m-1)}>‹</button>
          <div className="month-label">{payYear}年{payMonth+1}月〜</div>
          <button className="btn-icon" onClick={()=>setPayMonth(m=>m===11?(setPayYear(y=>y+1),0):m+1)}>›</button>
        </div>
      </div>
      <div className="card">
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:8}}>
          {DOW.map(d=><div key={d} className="cal-header">{d}</div>)}
        </div>
        {/* Week rows */}
        {(() => {
          const rows = [];
          let week = [];
          const firstDow = payDays[0].date.getDay();
          for(let i=0;i<firstDow;i++) week.push(null);
          payDays.forEach(({year,month,day,date})=>{
            week.push({year,month,day,date});
            if(week.length===7){rows.push(week);week=[];}
          });
          if(week.length>0){while(week.length<7)week.push(null);rows.push(week);}
          return rows.map((wk,wi)=>(
            <div key={wi} style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:4}}>
              {wk.map((cell,ci)=>{
                if(!cell) return <div key={ci} />;
                const {year,month,day,date}=cell;
                const sh = shifts[user.staffId]?.[`${year}-${month}-${day}`] || "none";
                const pat = patterns.find(p=>p.id===sh);
                const style = PATTERN_STYLE[sh]||PATTERN_STYLE.off;
                const dow = date.getDay();
                const isSep = day===11||day===1;
                return (
                  <div key={ci} style={{background:sh!=="none"?style.bg:"#f8fafc",border:`2px solid ${sh!=="none"?style.color:"transparent"}${isSep?"":""} `,borderRadius:8,padding:"6px 2px",textAlign:"center",borderLeft:isSep?"3px solid #2563eb":undefined}}>
                    <div style={{fontSize:12,fontWeight:600,color:dow===0?"#dc2626":dow===6?"#2563eb":"#374151"}}>{day}</div>
                    {pat && <div style={{fontSize:10,color:style.color,fontWeight:700}}>{pat.name}</div>}
                    {pat && <div style={{fontSize:9,color:"#94a3b8"}}>{pat.start}〜{pat.end}</div>}
                    {sh==="off" && <div style={{fontSize:10,color:"#94a3b8"}}>休</div>}
                  </div>
                );
              })}
            </div>
          ));
        })()}
      </div>
    </div>
  );
}

// ============================================================
// STAFF: REQUEST FORM
// ============================================================
function RequestForm({ user, requests, setRequests, payYear, payMonth }) {
  const payDays = useMemo(()=>getPayPeriodDays(payYear,payMonth),[payYear,payMonth]);
  const [saved, setSaved] = useState(false);
  const myReqs = requests[user.staffId]||[];

  const toggle = (key) => {
    const cur = requests[user.staffId]||[];
    const next = cur.includes(key)?cur.filter(x=>x!==key):[...cur,key];
    setRequests(prev=>({...prev,[user.staffId]:next}));
    setSaved(false);
  };

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title">希望休申請</div>
          <div className="section-sub">休みたい日をタップで選択</div>
        </div>
        <button className="btn btn-success" onClick={()=>setSaved(true)}>保存する</button>
      </div>
      {saved && <div className="alert alert-success">✓ 希望休を保存しました</div>}
      <div className="card">
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:8}}>
          {DOW.map(d=><div key={d} className="cal-header">{d}</div>)}
        </div>
        {(() => {
          const rows=[];let week=[];
          const firstDow=payDays[0].date.getDay();
          for(let i=0;i<firstDow;i++)week.push(null);
          payDays.forEach(item=>{week.push(item);if(week.length===7){rows.push(week);week=[];}});
          if(week.length>0){while(week.length<7)week.push(null);rows.push(week);}
          return rows.map((wk,wi)=>(
            <div key={wi} style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:4}}>
              {wk.map((cell,ci)=>{
                if(!cell)return<div key={ci}/>;
                const {year,month,day,date}=cell;
                const key=`${year}-${month}-${day}`;
                const isReq=myReqs.includes(key);
                const dow=date.getDay();
                return (
                  <div key={ci} onClick={()=>toggle(key)} style={{background:isReq?"#fee2e2":"#f8fafc",border:`2px solid ${isReq?"#fca5a5":"transparent"}`,borderRadius:8,padding:"8px 2px",textAlign:"center",cursor:"pointer"}}>
                    <div style={{fontSize:13,fontWeight:600,color:isReq?"#dc2626":dow===0?"#dc2626":dow===6?"#2563eb":"#374151"}}>{day}</div>
                    {isReq&&<div style={{fontSize:9,color:"#dc2626"}}>希望休</div>}
                  </div>
                );
              })}
            </div>
          ));
        })()}
        <div style={{marginTop:12,fontSize:13,color:"#64748b"}}>
          選択中：{myReqs.length===0?"なし":myReqs.sort().map(k=>{const[y,m,d]=k.split("-").map(Number);return `${m+1}/${d}`;}).join("、")}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// STAFF: NOTIF SETTINGS
// ============================================================
function NotifSettings({ notifPrefs, setNotifPrefs, staffId }) {
  const prefs=notifPrefs[staffId]||[];
  const [saved,setSaved]=useState(false);
  const options=[
    {key:"email",label:"メール通知",desc:"登録メールアドレスに通知"},
    {key:"line", label:"LINE通知",  desc:"LINEアプリに通知"},
    {key:"app",  label:"アプリ内通知",desc:"ログイン後にお知らせ確認"},
  ];
  const toggle=(k)=>{
    const cur=notifPrefs[staffId]||[];
    setNotifPrefs(prev=>({...prev,[staffId]:cur.includes(k)?cur.filter(x=>x!==k):[...cur,k]}));
    setSaved(false);
  };
  return (
    <div>
      <div className="section-header">
        <div className="section-title">通知設定</div>
        <button className="btn btn-success" onClick={()=>setSaved(true)}>保存する</button>
      </div>
      {saved&&<div className="alert alert-success">✓ 保存しました</div>}
      <div className="card">
        <div className="card-title">シフト確定時の通知方法（複数選択可）</div>
        {options.map(o=>(
          <div key={o.key} onClick={()=>toggle(o.key)} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",borderRadius:8,border:`1px solid ${prefs.includes(o.key)?"#2563eb":"#e2e8f0"}`,background:prefs.includes(o.key)?"#eff6ff":"#fff",cursor:"pointer",marginBottom:8}}>
            <input type="checkbox" checked={prefs.includes(o.key)} onChange={()=>{}} style={{accentColor:"#2563eb"}} />
            <div>
              <div style={{fontSize:13,fontWeight:600}}>{o.label}</div>
              <div style={{fontSize:11,color:"#94a3b8"}}>{o.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const now = new Date();
  const [user,     setUser]     = useState(null);
  const [tab,      setTab]      = useState("dashboard");
  const [staff,    setStaff]    = useState(INITIAL_STAFF);
  const [patterns, setPatterns] = useState(DEFAULT_PATTERNS);
  const [shifts,   setShifts]   = useState({});
  const [requests, setRequests] = useState({});
  const [notifPrefs,setNotifPrefs]=useState({});
  const [mealCounts,setMealCounts]=useState({});
  const [payYear,  setPayYear]  = useState(now.getMonth()>=10?now.getFullYear():now.getFullYear());
  const [payMonth, setPayMonth] = useState(now.getMonth());

  if(!user) return (<><style>{css}</style><LoginScreen onLogin={u=>{setUser(u);setTab(u.role==="admin"?"dashboard":"myshift");}}/></>);

  const adminTabs=[
    {key:"dashboard",label:"ダッシュボード"},
    {key:"shift",    label:"シフト管理"},
    {key:"staff",    label:"スタッフ管理"},
    {key:"requests", label:"希望休一覧"},
  ];
  const staffTabs=[
    {key:"myshift", label:"マイシフト"},
    {key:"request", label:"希望休申請"},
    {key:"notif",   label:"通知設定"},
  ];
  const tabs = user.role==="admin"?adminTabs:staffTabs;
  const staffMember = staff.find(s=>s.id===user.staffId);

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <Topbar user={user} onLogout={()=>{setUser(null);setTab("dashboard");}} />
        <nav className="nav">
          {tabs.map(t=>(
            <button key={t.key} className={`nav-btn${tab===t.key?" active":""}`} onClick={()=>setTab(t.key)}>{t.label}</button>
          ))}
        </nav>
        <main className="main">
          {user.role==="admin"&&tab==="dashboard"&&<Dashboard staff={staff} shifts={shifts} patterns={patterns} payYear={payYear} payMonth={payMonth}/>}
          {user.role==="admin"&&tab==="shift"&&<ShiftManagement staff={staff} shifts={shifts} setShifts={setShifts} patterns={patterns} mealCounts={mealCounts} setMealCounts={setMealCounts} payYear={payYear} payMonth={payMonth} setPayYear={setPayYear} setPayMonth={setPayMonth}/>}
          {user.role==="admin"&&tab==="staff"&&<StaffManagement staff={staff} setStaff={setStaff} patterns={patterns} setPatterns={setPatterns}/>}
          {user.role==="admin"&&tab==="requests"&&<RequestsView staff={staff} requests={requests} payYear={payYear} payMonth={payMonth}/>}
          {user.role==="staff"&&tab==="myshift"&&<MyShift user={user} shifts={shifts} patterns={patterns} payYear={payYear} payMonth={payMonth} setPayYear={setPayYear} setPayMonth={setPayMonth}/>}
          {user.role==="staff"&&tab==="request"&&<RequestForm user={user} requests={requests} setRequests={setRequests} payYear={payYear} payMonth={payMonth}/>}
          {user.role==="staff"&&tab==="notif"&&<NotifSettings notifPrefs={notifPrefs} setNotifPrefs={setNotifPrefs} staffId={user.staffId}/>}
        </main>
      </div>
    </>
  );
}

