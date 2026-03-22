import { useState, useRef, useCallback, useEffect } from "react";

const BLUE = "#1D9BF0", PURPLE = "#7c3aed", PINK = "#F91880";

const LS = {
  get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};

const BAD = ["fuck","shit","bitch","asshole","dick","pussy","cunt","bastard","crap","piss","cock","damn","hell","wtf","ass"];
const hasBad = t => { if (!t) return false; return BAD.some(w => t.toLowerCase().includes(w)); };
const censor = t => {
  if (!t) return t;
  let r = t;
  BAD.forEach(w => { r = r.replace(new RegExp(w, "gi"), w[0] + "*".repeat(w.length - 1)); });
  return r;
};
const ago = iso => {
  const d = new Date(iso), now = new Date(), ms = now - d;
  if (ms < 60000) return "just now";
  if (ms < 3600000) return Math.floor(ms / 60000) + "m";
  if (ms < 86400000) return Math.floor(ms / 3600000) + "h";
  return Math.floor(ms / 86400000) + "d";
};

// 100 bot users with pravatar avatars
const SU = Array.from({ length: 100 }, (_, i) => ({
  id: `bot_${String(i).padStart(3, "0")}`,
  username: ["alex_rivera","maya_chen","jordan_lee","sam_torres","riley_kim","casey_morgan","drew_patel","taylor_wu","morgan_james","jamie_silva","avery_brooks","jordan_hayes","quinn_foster","reese_santos","blake_nguyen","cameron_price","dakota_ross","emery_bell","finley_cox","harley_ward","indigo_scott","jaden_flores","kendall_gray","logan_hill","maxwell_cooper","nolan_reed","olive_bass","parker_hunt","quinn_james","remy_walsh","sage_baker","sloane_perry","sterling_cole","sutton_kelly","tatum_shaw","theo_hayes","trinity_cook","tyler_ross","val_knight","vivian_chen","wes_morgan","willow_fox","xander_price","yasmine_bell","zane_ford","zoe_hart","atlas_lee","beau_stone","cedar_brooks","delaney_marsh","eden_cross","ember_sky","falcon_reed","gray_wolf","haven_sea","iris_bloom","jasper_stone","june_lake","kira_moon","lake_blue","lena_star","leo_gold","liam_ash","lily_rose","luna_silver","mars_red","mia_sun","miles_jazz","nico_wave","nova_bright","oak_strong","ocean_deep","pearl_white","pine_tall","rain_soft","river_bold","robin_free","rose_wild","ruby_dark","sage_green","sandy_shore","sierra_peak","sky_high","sol_warm","storm_dark","sunny_bay","terra_firm","thorn_sharp","tide_low","trace_light","twig_thin","umbra_shadow","vale_quiet","vine_climb","volt_spark","wade_deep","wave_crash","whit_pure","wind_swift","wolf_lone","yew_old","zest_bright"][i] || `user_${i}`,
  avatar: `https://i.pravatar.cc/150?img=${(i % 70) + 1}`,
  bio: ["Coffee first, everything else second","Living my best digital life","Just here for the vibes","Making things, breaking things","Tech nerd + outdoor enthusiast","Night owl 🦉","Chasing sunsets and good code","Words are my superpower","Amateur chef, professional overthinker","Exploring one city at a time"][i % 10],
  isBot: true,
  village: [],
  joinedAt: new Date(Date.now() - Math.random() * 1e10).toISOString()
}));

// Seeded posts from bots
const SP = [
  { id: "cpost_1143", userId: "bot_050", username: "thorn_sharp", content: "Hot take: chronological feeds are superior in every way. Stop trying to guess what I want to see.", likes: ["bot_001","bot_002","bot_003","bot_010","bot_020"], reposts: ["bot_005","bot_015"], createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), replyCount: 3 },
  { id: "cpost_1144", userId: "bot_001", username: "alex_rivera", content: "Just discovered the best taco truck in the city. Life is good 🌮", likes: ["bot_002","bot_004","bot_006","bot_008"], reposts: ["bot_003"], createdAt: new Date(Date.now() - 3600000 * 4).toISOString(), replyCount: 2 },
  { id: "cpost_1145", userId: "bot_020", username: "nolan_reed", content: "AI isn't going to take your job. Someone using AI better than you will. Adapt or get left behind.", likes: ["bot_001","bot_003","bot_005","bot_007","bot_009","bot_011"], reposts: ["bot_002","bot_004","bot_006"], createdAt: new Date(Date.now() - 3600000 * 6).toISOString(), replyCount: 5 },
  { id: "cpost_1146", userId: "bot_035", username: "sage_baker", content: "Morning run complete ✅ 5 miles before coffee hits different when the city is still quiet", likes: ["bot_001","bot_010","bot_020","bot_030"], reposts: [], createdAt: new Date(Date.now() - 3600000 * 8).toISOString(), replyCount: 1 },
  { id: "cpost_1147", userId: "bot_060", username: "iris_bloom", content: "The fact that we all just collectively agreed to pretend email is fine is the biggest lie of the modern era", likes: ["bot_002","bot_012","bot_022","bot_032","bot_042"], reposts: ["bot_007","bot_017"], createdAt: new Date(Date.now() - 3600000 * 10).toISOString(), replyCount: 4 },
  { id: "cpost_1148", userId: "bot_075", username: "river_bold", content: "Built something cool today. Shipping it tomorrow. No screenshots until it works properly.", likes: ["bot_005","bot_015","bot_025"], reposts: ["bot_035"], createdAt: new Date(Date.now() - 3600000 * 12).toISOString(), replyCount: 2 },
  { id: "cpost_1149", userId: "bot_010", username: "morgan_james", content: "Reading a physical book for the first time in months. My attention span feels… restored?", likes: ["bot_001","bot_002","bot_003","bot_004","bot_006","bot_008"], reposts: ["bot_011","bot_013"], createdAt: new Date(Date.now() - 3600000 * 14).toISOString(), replyCount: 6 },
  { id: "cpost_1150", userId: "bot_045", username: "parker_hunt", content: "Reminder that most 'networking' is just vibes. Be a person, not a LinkedIn robot.", likes: ["bot_001","bot_003","bot_005","bot_007"], reposts: ["bot_002"], createdAt: new Date(Date.now() - 3600000 * 16).toISOString(), replyCount: 3 },
  { id: "cpost_1151", userId: "bot_080", username: "sandy_shore", content: "The city is different at 3am. Quieter. Yours.", likes: ["bot_001","bot_011","bot_021","bot_031","bot_041"], reposts: ["bot_051","bot_061"], createdAt: new Date(Date.now() - 3600000 * 20).toISOString(), replyCount: 2 },
  { id: "cpost_1152", userId: "bot_015", username: "blake_nguyen", content: "Unpopular opinion: 8 hours of sleep is not optional. It's the one biohack that actually works.", likes: ["bot_001","bot_002","bot_003","bot_004","bot_005","bot_006","bot_007"], reposts: ["bot_008","bot_009"], createdAt: new Date(Date.now() - 3600000 * 24).toISOString(), replyCount: 7 },
];

// Seeded clicks (communities)
const SC = [
  { id: "click_nyc", name: "New York City 🗽", image: null, members: ["bot_001","bot_005","bot_010","bot_020","bot_030"], ownerId: "bot_001", createdAt: new Date(Date.now() - 86400000 * 10).toISOString() },
  { id: "click_nba", name: "NBA 🏀", image: null, members: ["bot_002","bot_006","bot_011","bot_021","bot_031","bot_041"], ownerId: "bot_002", createdAt: new Date(Date.now() - 86400000 * 8).toISOString() },
  { id: "click_ai", name: "AI & Tech 🤖", image: null, members: ["bot_003","bot_007","bot_012","bot_022","bot_032","bot_042","bot_052"], ownerId: "bot_003", createdAt: new Date(Date.now() - 86400000 * 6).toISOString() },
  { id: "click_music", name: "Music Vibes 🎵", image: null, members: ["bot_004","bot_008","bot_013","bot_023","bot_033"], ownerId: "bot_004", createdAt: new Date(Date.now() - 86400000 * 4).toISOString() },
  { id: "click_food", name: "Foodies 🍜", image: null, members: ["bot_005","bot_009","bot_014","bot_024","bot_034","bot_044"], ownerId: "bot_005", createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
];

// 15 default profile pics (SVG data URIs)
const DEFS = [
  { id: "d0", label: "Ocean Wave", url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%231D9BF0'/%3E%3Ctext x='50' y='65' text-anchor='middle' font-size='45' fill='white'%3E🌊%3C/text%3E%3C/svg%3E" },
  { id: "d1", label: "Fire", url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23F91880'/%3E%3Ctext x='50' y='65' text-anchor='middle' font-size='45' fill='white'%3E🔥%3C/text%3E%3C/svg%3E" },
  { id: "d2", label: "Star", url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%237c3aed'/%3E%3Ctext x='50' y='65' text-anchor='middle' font-size='45' fill='white'%3E⭐%3C/text%3E%3C/svg%3E" },
  { id: "d3", label: "Lightning", url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23f59e0b'/%3E%3Ctext x='50' y='65' text-anchor='middle' font-size='45' fill='white'%3E⚡%3C/text%3E%3C/svg%3E" },
  { id: "d4", label: "Moon", url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%230f172a'/%3E%3Ctext x='50' y='65' text-anchor='middle' font-size='45' fill='white'%3E🌙%3C/text%3E%3C/svg%3E" },
  { id: "d5", label: "Robot", url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%2306b6d4'/%3E%3Ctext x='50' y='65' text-anchor='middle' font-size='45' fill='white'%3E🤖%3C/text%3E%3C/svg%3E" },
  { id: "d6", label: "Dragon", url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23dc2626'/%3E%3Ctext x='50' y='65' text-anchor='middle' font-size='45' fill='white'%3E🐉%3C/text%3E%3C/svg%3E" },
  { id: "d7", label: "Plant", url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%2316a34a'/%3E%3Ctext x='50' y='65' text-anchor='middle' font-size='45' fill='white'%3E🌿%3C/text%3E%3C/svg%3E" },
  { id: "d8", label: "Diamond", url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%230ea5e9'/%3E%3Ctext x='50' y='65' text-anchor='middle' font-size='45' fill='white'%3E💎%3C/text%3E%3C/svg%3E" },
  { id: "d9", label: "Crown", url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23d97706'/%3E%3Ctext x='50' y='65' text-anchor='middle' font-size='45' fill='white'%3E👑%3C/text%3E%3C/svg%3E" },
  { id: "d10", label: "Ghost", url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%236366f1'/%3E%3Ctext x='50' y='65' text-anchor='middle' font-size='45' fill='white'%3E👻%3C/text%3E%3C/svg%3E" },
  { id: "d11", label: "Phoenix", url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23ea580c'/%3E%3Ctext x='50' y='65' text-anchor='middle' font-size='45' fill='white'%3E🦅%3C/text%3E%3C/svg%3E" },
  { id: "d12", label: "Ninja", url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23111827'/%3E%3Ctext x='50' y='65' text-anchor='middle' font-size='45' fill='white'%3E🥷%3C/text%3E%3C/svg%3E" },
  { id: "d13", label: "Alien", url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%234ade80'/%3E%3Ctext x='50' y='65' text-anchor='middle' font-size='45' fill='white'%3E👽%3C/text%3E%3C/svg%3E" },
  { id: "d14", label: "Space", url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23312e81'/%3E%3Ctext x='50' y='65' text-anchor='middle' font-size='45' fill='white'%3E🚀%3C/text%3E%3C/svg%3E" },
];

const LOGO = "data:image/png;base64,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";

// ── ICONS ─────────────────────────────────────────────────────────────────────
const Ic = (d, s = 20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>;
const HomeI  = () => Ic("M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10");
const SrchI  = () => Ic("M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z");
const GrpI   = () => Ic("M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8z M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75");
const UserI  = () => Ic("M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 11a4 4 0 100-8 4 4 0 000 8z");
const BellI  = () => Ic("M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 01-3.46 0");
const GearI  = () => Ic("M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z");
const ImgI   = () => Ic("M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2z M8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3z M21 15l-5-5L5 21");
const XI     = () => Ic("M18 6L6 18M6 6l12 12", 18);
const SunI   = () => Ic("M12 17A5 5 0 1012 7a5 5 0 000 10zM12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42", 18);
const MoonI  = () => Ic("M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z", 18);
const PlusI  = () => Ic("M12 5v14M5 12h14", 20);
const SparkI = () => Ic("M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z");
const ReplyI = () => Ic("M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z", 18);
const BackI  = () => Ic("M19 12H5M12 5l-7 7 7 7");
const LockI  = () => Ic("M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z M7 11V7a5 5 0 0110 0v4");
const MsgI   = () => Ic("M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z");
const SendI  = () => Ic("M22 2L11 13 M22 2L15 22 8 13 2 2z", 18);
const FlagI  = () => Ic("M4 15s1-1 4-1 4 2 8 2 4-1 4-1V3s-1 1-4 1-4-2-8-2-4 1-4 1z M4 22v-7", 18);
const HrtI   = ({ on }) => <svg width="18" height="18" viewBox="0 0 24 24" fill={on ? PINK : "none"} stroke={on ? PINK : "currentColor"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>;
const RtI    = ({ on }) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={on ? "#00BA7C" : "currentColor"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14 M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>;

// ── AVATAR ────────────────────────────────────────────────────────────────────
const Av = ({ user, sz = 40, onClick }) => {
  const [err, setErr] = useState(false);
  const cols = [BLUE, PURPLE, PINK, "#ea580c", "#16a34a", "#0891b2"];
  const bg = cols[((user?.username || "?").charCodeAt(0) || 0) % cols.length];
  const s = { width: sz, height: sz, borderRadius: "50%", flexShrink: 0, cursor: onClick ? "pointer" : "default", objectFit: "cover" };
  if (user?.avatar && !err) return <img src={user.avatar} alt="" onError={() => setErr(true)} style={s} onClick={onClick} />;
  return <div onClick={onClick} style={{ ...s, background: bg, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: sz * 0.4 }}>{(user?.username || "?")[0].toUpperCase()}</div>;
};

// ── RICH TEXT ─────────────────────────────────────────────────────────────────
const Rich = ({ text, users, onUser }) => {
  if (!text) return null;
  return <>{text.split(/(@\w+)/g).map((p, i) => {
    if (p.startsWith("@")) {
      const n = p.slice(1).toLowerCase();
      const u = users.find(x => x.username.toLowerCase() === n);
      if (u || n === "claude") return <span key={i} onClick={() => u && onUser && onUser(u)} style={{ color: BLUE, cursor: "pointer", fontWeight: 600 }}>{p}</span>;
    }
    return <span key={i}>{p}</span>;
  })}</>;
};

// ── MENTION PICKER ────────────────────────────────────────────────────────────
const MentionPicker = ({ q, users, onPick, T }) => {
  const m = q != null ? ["claude", ...users.map(u => u.username)].filter(n => n.toLowerCase().startsWith(q.toLowerCase())).slice(0, 5) : [];
  if (!m.length) return null;
  return <div style={{ position: "absolute", bottom: "100%", left: 0, right: 0, background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden", zIndex: 999, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
    {m.map(name => {
      const u = users.find(x => x.username === name);
      return <div key={name} onMouseDown={e => { e.preventDefault(); onPick(name); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer" }}>
        {name === "claude" ? <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${BLUE}, ${PURPLE})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>✨</div> : <Av user={u} sz={32} />}
        <div><div style={{ fontWeight: 700, fontSize: 13, color: T.text }}>@{name}</div>{u?.bio && <div style={{ fontSize: 11, color: T.sub }}>{u.bio}</div>}</div>
      </div>;
    })}
  </div>;
};

// ── REPORT MODAL ──────────────────────────────────────────────────────────────
const ReportModal = ({ post, onClose, T }) => {
  const [reason, setReason] = useState("");
  const [done, setDone] = useState(false);
  const reasons = ["Spam or misleading", "Harassment or hate speech", "Violent or dangerous content", "Misinformation", "Copyright violation", "Other"];
  const submit = () => {
    if (!reason) return;
    const reports = LS.get("reports") || [];
    reports.push({ postId: post.id, reason, ts: new Date().toISOString() });
    LS.set("reports", reports);
    setDone(true);
  };
  return <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
    <div style={{ background: T.card, borderRadius: 16, padding: 24, width: "100%", maxWidth: 420, border: `1px solid ${T.border}` }}>
      {done ? <>
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <div style={{ fontWeight: 800, fontSize: 18, color: T.text, marginBottom: 8 }}>Report submitted</div>
          <div style={{ fontSize: 14, color: T.sub, marginBottom: 20 }}>Thanks for helping keep Scrypt safe.</div>
          <button onClick={onClose} style={{ background: BLUE, color: "white", border: "none", borderRadius: 9999, padding: "10px 24px", fontWeight: 700, cursor: "pointer" }}>Done</button>
        </div>
      </> : <>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontWeight: 800, fontSize: 17, color: T.text }}>Report Scrypt</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.text }}><XI /></button>
        </div>
        <div style={{ fontSize: 13, color: T.sub, marginBottom: 14 }}>Why are you reporting this post?</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
          {reasons.map(r => <button key={r} onClick={() => setReason(r)} style={{ background: reason === r ? BLUE : T.input, color: reason === r ? "white" : T.text, border: "none", borderRadius: 10, padding: "11px 14px", textAlign: "left", cursor: "pointer", fontWeight: 500, fontSize: 14 }}>{r}</button>)}
        </div>
        <button onClick={submit} disabled={!reason} style={{ background: PINK, color: "white", border: "none", borderRadius: 9999, padding: "11px", width: "100%", fontWeight: 700, cursor: reason ? "pointer" : "not-allowed", opacity: reason ? 1 : 0.5, fontSize: 15 }}>Submit Report</button>
      </>}
    </div>
  </div>;
};

// ── PIC PICKER ────────────────────────────────────────────────────────────────
const PicPicker = ({ onPick, onClose, T }) => <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
  <div style={{ background: T.card, borderRadius: 16, padding: 24, width: "100%", maxWidth: 440, border: `1px solid ${T.border}` }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
      <span style={{ fontWeight: 800, fontSize: 17, color: T.text }}>Choose a profile pic</span>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.text }}><XI /></button>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12 }}>
      {DEFS.map(d => <div key={d.id} onClick={() => onPick(d.url)} style={{ cursor: "pointer", textAlign: "center" }}>
        <img src={d.url} style={{ width: 54, height: 54, borderRadius: "50%", border: `2px solid ${T.border}` }} alt={d.label} />
        <div style={{ fontSize: 9, color: T.sub, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.label}</div>
      </div>)}
    </div>
  </div>
</div>;

// ── TERMS ─────────────────────────────────────────────────────────────────────
const Terms = ({ onAccept, T }) => <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
  <div style={{ background: T.card, borderRadius: 16, maxWidth: 520, width: "100%", maxHeight: "85vh", overflow: "auto", padding: 28, border: `1px solid ${T.border}` }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
      <div style={{ background: BLUE, borderRadius: 14, padding: "6px 10px" }}><img src={LOGO} style={{ width: 32, height: 32, objectFit: "contain" }} alt="logo" /></div>
      <span style={{ fontWeight: 800, fontSize: 20, color: BLUE }}>Scrypt</span>
    </div>
    <h2 style={{ margin: "0 0 12px", fontSize: 17, fontWeight: 700, color: T.text }}>Terms of Service</h2>
    <div style={{ fontSize: 13, lineHeight: 1.7, color: T.sub }}>
      <p><strong style={{ color: T.text }}>1. User Responsibility</strong> — You are solely responsible for content you post. Do not post content that violates any law.</p>
      <p><strong style={{ color: T.text }}>2. Prohibited Content</strong> — No illegal content, no harassment, no spam, no impersonation of others.</p>
      <p><strong style={{ color: T.text }}>3. Section 230</strong> — Scrypt operates under 47 U.S.C. § 230. We are not liable for user-generated content.</p>
      <p><strong style={{ color: T.text }}>4. AI Features</strong> — Claude (Anthropic) powers AI features. AI responses are not legal, medical, or financial advice.</p>
      <p><strong style={{ color: T.text }}>5. Reporting</strong> — Use the flag button to report content that violates these terms.</p>
      <p><strong style={{ color: T.text }}>6. Disclaimer</strong> — PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND. Use at your own risk.</p>
    </div>
    <button onClick={onAccept} style={{ width: "100%", padding: 14, background: BLUE, color: "white", border: "none", borderRadius: 9999, fontWeight: 800, fontSize: 16, cursor: "pointer", marginTop: 16 }}>I Agree — Create Account</button>
  </div>
</div>;

// ── CLAUDE CHAT ───────────────────────────────────────────────────────────────
const ClaudeChat = ({ T, onClose, init }) => {
  const [msgs, setMsgs] = useState([{ role: "assistant", content: "Hi! I'm Claude, your AI assistant on Scrypt. What's on your mind?" }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef();
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [msgs]);

  const send = async txt => {
    const text = (txt || input).trim();
    if (!text || busy) return;
    const next = [...msgs, { role: "user", content: text }];
    setMsgs(next); setInput(""); setBusy(true);
    try {
      const api = next.slice(next[0].role === "assistant" ? 1 : 0).map(m => ({ role: m.role, content: m.content }));
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": "YOUR_API_KEY_HERE", "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: "You are Claude, an AI assistant integrated into Scrypt — a Twitter-like social platform. Be helpful, concise, and friendly. Keep responses brief unless asked for detail.", messages: api })
      });
      const d = await r.json();
      setMsgs(p => [...p, { role: "assistant", content: d.content?.[0]?.text || "Sorry, try again." }]);
    } catch {
      setMsgs(p => [...p, { role: "assistant", content: "Connection error. Try again!" }]);
    }
    setBusy(false);
  };
  useEffect(() => { if (init) send(init); }, []);

  return <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 8900, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
    <div style={{ background: T.card, borderRadius: "16px 16px 0 0", width: "100%", maxWidth: 600, height: "75vh", display: "flex", flexDirection: "column", border: `1px solid ${T.border}` }}>
      <div style={{ padding: "13px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${BLUE}, ${PURPLE})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>✨</div>
        <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 15, color: T.text }}>Claude AI</div><div style={{ fontSize: 12, color: T.sub }}>Powered by Anthropic</div></div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.text }}><XI /></button>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {msgs.map((m, i) => <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", gap: 8, alignItems: "flex-end" }}>
          {m.role === "assistant" && <div style={{ width: 26, height: 26, borderRadius: "50%", background: `linear-gradient(135deg, ${BLUE}, ${PURPLE})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>✨</div>}
          <div style={{ maxWidth: "78%", padding: "9px 13px", borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: m.role === "user" ? BLUE : T.input, color: m.role === "user" ? "white" : T.text, fontSize: 14, lineHeight: 1.5 }}>{m.content}</div>
        </div>)}
        {busy && <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: `linear-gradient(135deg, ${BLUE}, ${PURPLE})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>✨</div>
          <div style={{ padding: "9px 13px", background: T.input, borderRadius: "14px 14px 14px 4px", display: "flex", gap: 4, alignItems: "center" }}>
            {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: T.sub, animation: `dot${i} 1s ${i * 0.2}s ease-in-out infinite alternate` }} />)}
          </div>
        </div>}
        <div ref={endRef} />
      </div>
      <div style={{ padding: "10px 14px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()} placeholder="Ask Claude anything..." style={{ flex: 1, background: T.input, border: "none", borderRadius: 9999, padding: "10px 16px", color: T.text, fontSize: 14, outline: "none" }} />
        <button onClick={() => send()} disabled={!input.trim() || busy} style={{ background: BLUE, color: "white", border: "none", borderRadius: "50%", width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: input.trim() && !busy ? "pointer" : "not-allowed", opacity: input.trim() && !busy ? 1 : 0.5 }}><SendI /></button>
      </div>
      <style>{`@keyframes dot0{from{transform:translateY(0)}to{transform:translateY(-5px)}} @keyframes dot1{from{transform:translateY(0)}to{transform:translateY(-5px)}} @keyframes dot2{from{transform:translateY(0)}to{transform:translateY(-5px)}}`}</style>
    </div>
  </div>;
};

// ── PROFILE MODAL ─────────────────────────────────────────────────────────────
const ProfileModal = ({ user, me, onClose, onVillage, T, posts }) => {
  const myV = me.village || [];
  const inV = myV.includes(user.id);
  const isMe = user.id === me.id;
  const theirV = user.village || [];
  const mutual = inV && theirV.includes(me.id);
  const pub = posts.filter(p => p.userId === user.id && !p.parentId && !p.villageOnly);
  return <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 8800, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
    <div style={{ background: T.card, borderRadius: "16px 16px 0 0", width: "100%", maxWidth: 600, maxHeight: "80vh", overflow: "auto", border: `1px solid ${T.border}` }} onClick={e => e.stopPropagation()}>
      <div style={{ padding: "14px 16px 12px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Av user={user} sz={44} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: T.text }}>{user.username}</div>
            <div style={{ fontSize: 12, color: T.sub }}>@{user.username.toLowerCase()}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {!isMe && mutual && <button style={{ background: T.input, color: T.text, border: `1px solid ${T.border}`, borderRadius: 9999, padding: "7px 14px", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>💬 IM</button>}
          {!isMe && <button onClick={() => onVillage(user.id)} style={{ background: inV ? "transparent" : BLUE, color: inV ? T.text : "white", border: `1px solid ${inV ? T.border : BLUE}`, borderRadius: 9999, padding: "7px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{inV ? "In Village ✓" : "+ Village"}</button>}
          <button onClick={onClose} style={{ background: T.input, border: "none", cursor: "pointer", color: T.text, borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}><XI /></button>
        </div>
      </div>
      <div style={{ padding: "14px 20px 20px" }}>
        {user.bio && <div style={{ fontSize: 14, color: T.text, marginBottom: 12 }}>{user.bio}</div>}
        <div style={{ display: "flex", gap: 20, marginBottom: 14 }}>
          <span style={{ fontSize: 14, color: T.sub }}><strong style={{ color: T.text }}>{pub.length}</strong> Scrypts</span>
          <span style={{ fontSize: 14, color: T.sub }}><strong style={{ color: T.text }}>{(user.village || []).length}</strong> Village</span>
          <span style={{ fontSize: 14, color: T.sub }}><strong style={{ color: T.text }}>{pub.reduce((s, p) => s + (p.likes?.length || 0), 0)}</strong> Likes</span>
        </div>
        {pub.slice(0, 5).map(p => <div key={p.id} style={{ padding: "8px 0", borderTop: `1px solid ${T.border}` }}>
          <p style={{ margin: 0, fontSize: 14, color: T.text, lineHeight: 1.5 }}>{censor(p.content)}</p>
          <div style={{ fontSize: 11, color: T.sub, marginTop: 3 }}>{ago(p.createdAt)} · {p.likes?.length || 0} likes</div>
        </div>)}
        {pub.length === 0 && <p style={{ textAlign: "center", color: T.sub, padding: "14px 0", fontSize: 14 }}>No public posts yet.</p>}
      </div>
    </div>
  </div>;
};

// ── DM VIEW (1-on-1) ─────────────────────────────────────────────────────────
const DMView = ({ me, other, users, T, onBack, onCall }) => {
  const key = `dm_${[me.id, other.id].sort().join("_")}`;
  const [msgs, setMsgs] = useState(() => LS.get(key) || []);
  const [input, setInput] = useState("");
  const endRef = useRef();
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [msgs]);
  const send = () => {
    if (!input.trim()) return;
    const m = { id: Date.now().toString(), from: me.id, text: input, ts: new Date().toISOString() };
    const next = [...msgs, m];
    setMsgs(next); LS.set(key, next); setInput("");
  };
  return <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)" }}>
    <div style={{ padding: "11px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10 }}>
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: T.text, marginRight: 4 }}><BackI /></button>
      <Av user={other} sz={36} />
      <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 15, color: T.text }}>{other.username}</div><div style={{ fontSize: 12, color: T.sub }}>@{other.username.toLowerCase()}</div></div>
      <button onClick={onCall} style={{ background: "#00BA7C", border: "none", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18 }}>📞</button>
    </div>
    <div style={{ flex: 1, overflow: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
      {msgs.length === 0 && <p style={{ textAlign: "center", color: T.sub, fontSize: 13, marginTop: 40 }}>Start a conversation with {other.username} 👋</p>}
      {msgs.map(m => {
        const mine = m.from === me.id;
        return <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", gap: 8, alignItems: "flex-end" }}>
          {!mine && <Av user={other} sz={28} />}
          <div style={{ maxWidth: "72%" }}>
            <div style={{ padding: "9px 13px", borderRadius: mine ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: mine ? BLUE : T.input, color: mine ? "white" : T.text, fontSize: 14 }}>{m.text}</div>
            <div style={{ fontSize: 10, color: T.sub, marginTop: 2, textAlign: mine ? "right" : "left" }}>{ago(m.ts)}</div>
          </div>
        </div>;
      })}
      <div ref={endRef} />
    </div>
    <div style={{ padding: "10px 14px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 8 }}>
      <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder={`Message ${other.username}...`} style={{ flex: 1, background: T.input, border: "none", borderRadius: 9999, padding: "10px 16px", color: T.text, fontSize: 14, outline: "none" }} />
      <button onClick={send} disabled={!input.trim()} style={{ background: BLUE, color: "white", border: "none", borderRadius: "50%", width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: input.trim() ? "pointer" : "not-allowed", opacity: input.trim() ? 1 : 0.5 }}><SendI /></button>
    </div>
  </div>;
};

// ── GROUP CHAT VIEW ───────────────────────────────────────────────────────────
const GroupChatView = ({ me, group, users, T, onBack, onCall, onUpdateGroup }) => {
  const key = `gc_${group.id}`;
  const [msgs, setMsgs] = useState(() => LS.get(key) || []);
  const [input, setInput] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const endRef = useRef();
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [msgs]);

  const send = () => {
    if (!input.trim()) return;
    const m = { id: Date.now().toString(), from: me.id, text: input, ts: new Date().toISOString() };
    const next = [...msgs, m];
    setMsgs(next); LS.set(key, next); setInput("");
  };

  const addMember = uid => {
    if (group.members.includes(uid)) return;
    const updated = { ...group, members: [...group.members, uid] };
    onUpdateGroup(updated);
    setAddSearch("");
  };

  const members = group.members.map(id => users.find(u => u.id === id)).filter(Boolean);
  const searchable = users.filter(u => !group.members.includes(u.id) && u.username.toLowerCase().includes(addSearch.toLowerCase()) && !u.isBot).slice(0, 5);

  return <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)" }}>
    <div style={{ padding: "11px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10 }}>
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: T.text, marginRight: 4 }}><BackI /></button>
      <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg,${BLUE},${PURPLE})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>👥</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: T.text }}>{group.name}</div>
        <div style={{ fontSize: 12, color: T.sub }}>{members.length} members</div>
      </div>
      <button onClick={onCall} style={{ background: "#00BA7C", border: "none", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, flexShrink: 0 }}>📞</button>
      <button onClick={() => setShowAdd(v => !v)} style={{ background: T.input, border: "none", borderRadius: 9999, padding: "6px 12px", fontSize: 12, color: T.text, cursor: "pointer", fontWeight: 600 }}>+ Add</button>
    </div>

    {showAdd && <div style={{ padding: "10px 16px", borderBottom: `1px solid ${T.border}`, background: T.card }}>
      <input value={addSearch} onChange={e => setAddSearch(e.target.value)} placeholder="Search to add members..." style={{ width: "100%", background: T.input, border: "none", borderRadius: 9999, padding: "8px 14px", color: T.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
      {addSearch.length >= 1 && searchable.map(u => <div key={u.id} onClick={() => addMember(u.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 4px", cursor: "pointer" }}>
        <Av user={u} sz={32} />
        <span style={{ fontSize: 14, color: T.text, flex: 1 }}>{u.username}</span>
        <span style={{ fontSize: 12, color: BLUE, fontWeight: 700 }}>Add</span>
      </div>)}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
        {members.map(u => <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 4, background: T.input, borderRadius: 9999, padding: "3px 10px 3px 4px" }}>
          <Av user={u} sz={20} />
          <span style={{ fontSize: 12, color: T.text }}>{u.username}</span>
        </div>)}
      </div>
    </div>}

    <div style={{ flex: 1, overflow: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
      {msgs.length === 0 && <p style={{ textAlign: "center", color: T.sub, fontSize: 13, marginTop: 40 }}>Group chat created! Say hi 👋</p>}
      {msgs.map(m => {
        const mine = m.from === me.id;
        const sender = users.find(u => u.id === m.from);
        return <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", gap: 8, alignItems: "flex-end" }}>
          {!mine && <Av user={sender} sz={28} />}
          <div style={{ maxWidth: "72%" }}>
            {!mine && <div style={{ fontSize: 11, color: T.sub, marginBottom: 2, marginLeft: 2 }}>{sender?.username}</div>}
            <div style={{ padding: "9px 13px", borderRadius: mine ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: mine ? BLUE : T.input, color: mine ? "white" : T.text, fontSize: 14 }}>{m.text}</div>
            <div style={{ fontSize: 10, color: T.sub, marginTop: 2, textAlign: mine ? "right" : "left" }}>{ago(m.ts)}</div>
          </div>
        </div>;
      })}
      <div ref={endRef} />
    </div>
    <div style={{ padding: "10px 14px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 8 }}>
      <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Message group..." style={{ flex: 1, background: T.input, border: "none", borderRadius: 9999, padding: "10px 16px", color: T.text, fontSize: 14, outline: "none" }} />
      <button onClick={send} disabled={!input.trim()} style={{ background: BLUE, color: "white", border: "none", borderRadius: "50%", width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: input.trim() ? "pointer" : "not-allowed", opacity: input.trim() ? 1 : 0.5 }}><SendI /></button>
    </div>
  </div>;
};

// ── NOTIFICATIONS + TRENDING ──────────────────────────────────────────────────
const NotifTab = ({ me, users, posts, T }) => {
  const [trending, setTrending] = useState(null);
  const [tBusy, setTBusy] = useState(false);
  const myPosts = posts.filter(p => p.userId === me.id);
  const notifs = [];
  myPosts.forEach(p => {
    (p.likes || []).forEach(uid => { if (uid !== me.id) { const u = users.find(x => x.id === uid); if (u) notifs.push({ id: `lk_${p.id}_${uid}`, type: "like", user: u, post: p, ts: p.createdAt }); } });
    (p.reposts || []).forEach(uid => { if (uid !== me.id) { const u = users.find(x => x.id === uid); if (u) notifs.push({ id: `rt_${p.id}_${uid}`, type: "repost", user: u, post: p, ts: p.createdAt }); } });
  });
  posts.filter(p => p.parentId && myPosts.find(x => x.id === p.parentId) && p.userId !== me.id).forEach(p => {
    const u = users.find(x => x.id === p.userId);
    if (u) notifs.push({ id: `rp_${p.id}`, type: "reply", user: u, post: p, ts: p.createdAt });
  });
  notifs.sort((a, b) => new Date(b.ts) - new Date(a.ts));

  const loadTrending = async () => {
    setTBusy(true);
    const sample = posts.slice(0, 40).map(p => p.content).join(" | ");
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": "YOUR_API_KEY_HERE", "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 200, messages: [{ role: "user", content: `From these posts, identify 5 trending topics as short hashtag-style labels (2-3 words max each). Return ONLY a JSON array of strings, nothing else: ${sample}` }] })
      });
      const d = await r.json();
      const txt = d.content?.[0]?.text || "[]";
      setTrending(JSON.parse(txt.replace(/```json|```/g, "").trim()));
    } catch {
      setTrending(["AI & Tech", "Sports Talk", "City Life", "Music Vibes", "Daily Thoughts"]);
    }
    setTBusy(false);
  };
  useEffect(() => { loadTrending(); }, []);

  return <div>
    <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: T.text }}>Trending on Scrypt</div>
        <div onClick={loadTrending} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: BLUE, cursor: "pointer" }}>✨ Refresh</div>
      </div>
      {tBusy && <div style={{ color: T.sub, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 14, height: 14, border: `2px solid ${T.border}`, borderTopColor: BLUE, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /> Loading trending topics...
      </div>}
      {trending && !tBusy && <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {trending.map((t, i) => <div key={i} style={{ background: T.input, borderRadius: 9999, padding: "5px 14px", fontSize: 13, color: BLUE, fontWeight: 600, cursor: "pointer" }}>#{t}</div>)}
      </div>}
    </div>
    <div style={{ padding: "9px 16px", fontSize: 12, fontWeight: 700, color: T.sub, borderBottom: `1px solid ${T.border}` }}>ACTIVITY</div>
    {notifs.length === 0 && <p style={{ textAlign: "center", color: T.sub, padding: "32px 16px", fontSize: 14 }}>No activity yet. Post something!</p>}
    {notifs.slice(0, 60).map(n => <div key={n.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderBottom: `1px solid ${T.border}` }}>
      <Av user={n.user} sz={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontWeight: 700, color: T.text }}>{n.user.username}</span>
        <span style={{ color: T.sub, fontSize: 14 }}> {n.type === "like" ? "liked your Scrypt" : n.type === "repost" ? "reposted your Scrypt" : "replied to your Scrypt"}</span>
        {n.post.content && <div style={{ fontSize: 12, color: T.sub, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.post.content}</div>}
      </div>
      <div style={{ fontSize: 16, flexShrink: 0 }}>{n.type === "like" ? "❤️" : n.type === "repost" ? "🔁" : "💬"}</div>
    </div>)}
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>;
};

// ── COMPOSE ───────────────────────────────────────────────────────────────────
const Compose = ({ me, onPost, T, users, placeholder, clickId, parentId, onCancel, compact }) => {
  const [text, setText] = useState("");
  const [img, setImg] = useState(null);
  const [vill, setVill] = useState(false);
  const [mq, setMq] = useState(null);
  const fRef = useRef();
  const taRef = useRef();
  const onChange = e => {
    setText(e.target.value);
    const b = e.target.value.slice(0, e.target.selectionStart);
    const m = b.match(/@(\w*)$/);
    setMq(m ? m[1] : null);
  };
  const pickM = name => {
    const pos = taRef.current?.selectionStart || text.length;
    setText(text.slice(0, pos).replace(/@\w*$/, `@${name} `) + text.slice(pos));
    setMq(null);
  };
  const submit = () => {
    if (!text.trim() && !img) return;
    onPost({ content: text, image: img, clickId, parentId, villageOnly: vill });
    setText(""); setImg(null); setVill(false);
  };
  const pickImg = e => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = x => setImg(x.target.result);
    r.readAsDataURL(f);
  };
  return <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: compact ? "9px 14px" : "14px 16px" }}>
    <div style={{ display: "flex", gap: 10 }}>
      <Av user={me} sz={compact ? 34 : 42} />
      <div style={{ flex: 1, position: "relative" }}>
        {mq !== null && <MentionPicker q={mq} users={users} onPick={pickM} T={T} />}
        <textarea ref={taRef} value={text} onChange={onChange} placeholder={placeholder || (vill ? "Village-only post... 🔒" : "What's happening?")} style={{ width: "100%", background: "transparent", border: "none", outline: "none", resize: "none", fontSize: compact ? 14 : 16, color: T.text, fontFamily: "inherit", lineHeight: 1.5, minHeight: compact ? 44 : 64, boxSizing: "border-box" }} />
        {img && <div style={{ position: "relative", display: "inline-block", marginBottom: 8 }}>
          <img src={img} alt="" style={{ maxHeight: 200, borderRadius: 12, maxWidth: "100%" }} />
          <button onClick={() => setImg(null)} style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%", width: 24, height: 24, cursor: "pointer", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}><XI /></button>
        </div>}
        {vill && !compact && <div style={{ fontSize: 11, color: PURPLE, marginBottom: 5, display: "flex", alignItems: "center", gap: 4 }}><LockI /> Village members only</div>}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", gap: 2 }}>
            <button onClick={() => fRef.current.click()} style={{ background: "none", border: "none", cursor: "pointer", color: BLUE, padding: 6, borderRadius: 8 }}><ImgI /></button>
            <input ref={fRef} type="file" accept="image/*" style={{ display: "none" }} onChange={pickImg} />
            {!compact && !parentId && <button onClick={() => setVill(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", color: vill ? PURPLE : BLUE, padding: 6, borderRadius: 8 }}><LockI /></button>}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: text.length > 260 ? PINK : T.sub }}>{280 - text.length}</span>
            {onCancel && <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: T.sub, fontSize: 13 }}>Cancel</button>}
            <button onClick={submit} disabled={!text.trim() && !img} style={{ background: vill ? PURPLE : BLUE, color: "white", border: "none", borderRadius: 9999, padding: compact ? "7px 16px" : "9px 18px", fontWeight: 700, fontSize: 14, cursor: (!text.trim() && !img) ? "not-allowed" : "pointer", opacity: (!text.trim() && !img) ? 0.5 : 1 }}>Scrypt</button>
          </div>
        </div>
      </div>
    </div>
  </div>;
};

// ── POST CARD ─────────────────────────────────────────────────────────────────
const Post = ({ p, me, users, all, onLike, onRt, onReply, onThread, onUser, T }) => {
  const author = users.find(u => u.id === p.userId) || { username: p.username || "anon" };
  const liked = p.likes?.includes(me?.id);
  const rted = p.reposts?.includes(me?.id);
  const rCount = all.filter(x => x.parentId === p.id).length || p.replyCount || 0;
  const [showR, setShowR] = useState(false);
  const [showRep, setShowRep] = useState(false);
  if (p.villageOnly && p.userId !== me?.id && !(me?.village || []).includes(p.userId)) return null;
  return <div style={{ background: T.card, borderBottom: `1px solid ${T.border}` }}>
    {showRep && <ReportModal post={p} onClose={() => setShowRep(false)} T={T} />}
    <div style={{ padding: "12px 16px", display: "flex", gap: 10 }}>
      <Av user={author} sz={42} onClick={() => onUser && onUser(author)} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 5, alignItems: "baseline", flexWrap: "wrap", marginBottom: 2 }}>
          <div style={{ display: "flex", gap: 5, alignItems: "baseline", flexWrap: "wrap", flex: 1 }}>
            <span onClick={() => onUser && onUser(author)} style={{ fontWeight: 700, fontSize: 15, color: T.text, cursor: "pointer" }}>{author.username}</span>
            <span style={{ fontSize: 13, color: T.sub }}>@{author.username.toLowerCase()} · {ago(p.createdAt)}</span>
            {p.villageOnly && <span style={{ fontSize: 10, color: PURPLE, background: T.input, borderRadius: 4, padding: "1px 5px" }}>🔒 Village</span>}
          </div>
          {p.userId !== me?.id && <button onClick={e => { e.stopPropagation(); setShowRep(true); }} style={{ background: "none", border: "none", cursor: "pointer", color: T.sub, padding: 2, opacity: 0.6 }}><FlagI /></button>}
        </div>
        <div style={{ fontSize: 15, lineHeight: 1.6, color: T.text, marginBottom: 8, wordBreak: "break-word" }}>
          <Rich text={censor(p.content)} users={users} onUser={onUser} />
        </div>
        {p.image && <img src={p.image} alt="" style={{ borderRadius: 12, maxWidth: "100%", maxHeight: 300, objectFit: "cover", marginBottom: 8 }} />}
        <div style={{ display: "flex", alignItems: "center", marginLeft: -6 }}>
          <button onClick={() => setShowR(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", color: T.sub, display: "flex", alignItems: "center", gap: 5, padding: "6px 8px", borderRadius: 9999, fontSize: 13 }}><ReplyI />{rCount > 0 && rCount}</button>
          <button onClick={() => onLike(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: liked ? PINK : T.sub, display: "flex", alignItems: "center", gap: 5, padding: "6px 8px", borderRadius: 9999, fontSize: 13 }}><HrtI on={liked} />{(p.likes?.length || 0) > 0 && p.likes.length}</button>
          <button onClick={() => onRt(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: rted ? "#00BA7C" : T.sub, display: "flex", alignItems: "center", gap: 5, padding: "6px 8px", borderRadius: 9999, fontSize: 13 }}><RtI on={rted} />{(p.reposts?.length || 0) > 0 && p.reposts.length}</button>
          {rCount > 0 && <button onClick={() => onThread(p)} style={{ background: "none", border: "none", cursor: "pointer", color: T.sub, padding: "6px 8px", borderRadius: 9999, fontSize: 12 }}>View thread →</button>}
        </div>
      </div>
    </div>
    {showR && <Compose me={me} onPost={pp => { onReply(pp); setShowR(false); }} T={T} users={users} compact parentId={p.id} clickId={p.clickId} onCancel={() => setShowR(false)} />}
  </div>;
};

// ── THREAD ────────────────────────────────────────────────────────────────────
const Thread = ({ p, me, users, all, onLike, onRt, onReply, onBack, onUser, T }) => {
  const replies = all.filter(x => x.parentId === p.id).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  return <div>
    <div style={{ padding: "10px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10 }}>
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: T.text }}><BackI /></button>
      <span style={{ fontWeight: 700, fontSize: 16, color: T.text }}>Thread</span>
    </div>
    <Post p={p} me={me} users={users} all={all} onLike={onLike} onRt={onRt} onReply={r => onReply({ ...r, parentId: p.id })} onThread={() => {}} onUser={onUser} T={T} />
    <Compose me={me} onPost={onReply} T={T} users={users} compact parentId={p.id} clickId={p.clickId} />
    {replies.map(r => <Post key={r.id} p={r} me={me} users={users} all={all} onLike={onLike} onRt={onRt} onReply={rr => onReply({ ...rr, parentId: r.id })} onThread={() => {}} onUser={onUser} T={T} />)}
    {replies.length === 0 && <p style={{ textAlign: "center", color: T.sub, padding: "24px 0", fontSize: 14 }}>No replies yet. Start the conversation!</p>}
  </div>;
};

// ── AUTH ──────────────────────────────────────────────────────────────────────
const Login = ({ onLogin, onSignup, dark, setDark, T }) => {
  const [u, setU] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const go = () => {
    setErr("");
    const all = LS.get("su") || [];
    const f = all.find(x => x.username === u && x.password === pw);
    if (!f) { setErr("Invalid username or password."); return; }
    onLogin(f);
  };
  const s = { width: "100%", background: T.input, border: "none", borderRadius: 14, padding: "16px 18px", color: T.text, fontSize: 16, outline: "none", boxSizing: "border-box" };
  return <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
    <div style={{ maxWidth: 420, width: "100%" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 14, background: BLUE, padding: "14px 32px", borderRadius: 9999, boxShadow: "0 8px 32px rgba(29,155,240,0.35)" }}>
          <img src={LOGO} style={{ width: 72, height: 40, objectFit: "contain" }} alt="logo" />
          <span style={{ fontWeight: 900, fontSize: 32, color: "white", letterSpacing: -0.5 }}>Scrypt</span>
        </div>
        <p style={{ marginTop: 12, color: T.sub, fontSize: 14 }}>Powered by <strong style={{ color: BLUE }}>Claude</strong> · <strong style={{ color: BLUE }}>Anthropic</strong></p>
      </div>
      <div style={{ background: T.card, borderRadius: 20, padding: "28px 24px", boxShadow: dark ? "0 4px 32px rgba(0,0,0,0.4)" : "0 4px 32px rgba(0,0,0,0.08)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input value={u} onChange={e => setU(e.target.value)} placeholder="Username" style={s} onKeyDown={e => e.key === "Enter" && go()} />
          <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Password" style={s} onKeyDown={e => e.key === "Enter" && go()} />
          {err && <div style={{ fontSize: 13, color: PINK, padding: "8px 12px", background: dark ? "#1a0810" : "#fff0f5", borderRadius: 8 }}>{err}</div>}
          <button onClick={go} style={{ background: BLUE, color: "white", border: "none", borderRadius: 9999, padding: "16px", fontWeight: 800, fontSize: 16, cursor: "pointer", marginTop: 2 }}>Sign In</button>
          <button onClick={onSignup} style={{ background: "transparent", color: T.text, border: `2px solid ${T.border}`, borderRadius: 9999, padding: "15px", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>Create Account</button>
        </div>
      </div>
      <div style={{ textAlign: "center", marginTop: 20 }}>
        <button onClick={() => setDark(d => !d)} style={{ background: "none", border: "none", cursor: "pointer", color: T.sub, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14 }}>{dark ? <SunI /> : <MoonI />} {dark ? "Light mode" : "Dark mode"}</button>
      </div>
    </div>
  </div>;
};

const Signup = ({ onDone, onBack, dark, setDark, T }) => {
  const [u, setU] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [bio, setBio] = useState("");
  const [av, setAv] = useState(null);
  const [err, setErr] = useState("");
  const [terms, setTerms] = useState(false);
  const [showPP, setShowPP] = useState(false);
  const fRef = useRef();

  const go = () => {
    setErr("");
    const t = u.trim();
    const all = LS.get("su") || [];
    if (t.length < 3) { setErr("Username must be at least 3 characters."); return; }
    if (all.find(x => x.username === t)) { setErr("Username already taken."); return; }
    if (pw.length < 6) { setErr("Password must be at least 6 characters."); return; }
    if (pw !== pw2) { setErr("Passwords don't match."); return; }
    setTerms(true);
  };
  const confirm = () => {
    const all = LS.get("su") || [];
    const nu = { id: Date.now().toString(), username: u.trim(), password: pw, bio, avatar: av, village: [], joinedAt: new Date().toISOString() };
    LS.set("su", [...all, nu]);
    onDone(nu);
  };
  const doAv = e => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = x => setAv(x.target.result);
    r.readAsDataURL(f);
  };
  const s = { width: "100%", background: T.input, border: "none", borderRadius: 10, padding: "12px 14px", color: T.text, fontSize: 15, outline: "none", boxSizing: "border-box" };
  return <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
    {terms && <Terms onAccept={confirm} T={T} />}
    {showPP && <PicPicker onPick={url => { setAv(url); setShowPP(false); }} onClose={() => setShowPP(false)} T={T} />}
    <div style={{ maxWidth: 380, width: "100%" }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: BLUE, padding: "10px 18px", borderRadius: 16 }}>
          <img src={LOGO} style={{ width: 72, height: 40, objectFit: "contain" }} alt="logo" />
          <span style={{ fontWeight: 900, fontSize: 28, color: "white" }}>Scrypt</span>
        </div>
      </div>
      <div style={{ background: T.card, borderRadius: 16, padding: "24px 20px", border: `1px solid ${T.border}` }}>
        <h2 style={{ margin: "0 0 18px", fontSize: 20, fontWeight: 800, color: T.text }}>Create account</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          {av ? <img src={av} style={{ width: 58, height: 58, borderRadius: "50%", objectFit: "cover", border: `2px solid ${T.border}` }} alt="avatar" /> : <div style={{ width: 58, height: 58, borderRadius: "50%", background: T.input, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, border: `2px dashed ${T.border}` }}>👤</div>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => setShowPP(true)} style={{ background: T.input, color: T.text, border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 13, cursor: "pointer" }}>Choose avatar</button>
            <button onClick={() => fRef.current.click()} style={{ background: T.input, color: T.text, border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 13, cursor: "pointer" }}>Upload photo</button>
            <input ref={fRef} type="file" accept="image/*" style={{ display: "none" }} onChange={doAv} />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <input value={u} onChange={e => setU(e.target.value)} placeholder="Username" style={s} />
          <input value={bio} onChange={e => setBio(e.target.value)} placeholder="Bio (optional)" style={s} />
          <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Password" style={s} />
          <input type="password" value={pw2} onChange={e => setPw2(e.target.value)} placeholder="Confirm password" style={s} />
          {err && <div style={{ fontSize: 13, color: PINK, padding: "8px 12px", background: dark ? "#1a0810" : "#fff0f5", borderRadius: 8 }}>{err}</div>}
          <button onClick={go} style={{ background: BLUE, color: "white", border: "none", borderRadius: 9999, padding: 14, fontWeight: 800, fontSize: 15, cursor: "pointer" }}>Continue</button>
          <button onClick={onBack} style={{ background: "transparent", color: T.text, border: `2px solid ${T.border}`, borderRadius: 9999, padding: 13, fontWeight: 700, fontSize: 15, cursor: "pointer" }}>Back to Login</button>
        </div>
      </div>
    </div>
  </div>;
};

// ── VOICE CALL ────────────────────────────────────────────────────────────────
const VoiceCall = ({ me, participants, users, T, onEnd }) => {
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [duration, setDuration] = useState(0);
  const [stream, setStream] = useState(null);
  const [peerStreams, setPeerStreams] = useState({});
  const audioRefs = useRef({});

  useEffect(() => {
    const t = setInterval(() => setDuration(d => d + 1), 1000);
    navigator.mediaDevices?.getUserMedia({ audio: true }).then(s => {
      setStream(s);
    }).catch(() => {});
    return () => { clearInterval(t); stream?.getTracks().forEach(t => t.stop()); };
  }, []);

  useEffect(() => {
    if (stream) stream.getAudioTracks().forEach(t => { t.enabled = !muted; });
  }, [muted, stream]);

  const fmt = s => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  const members = participants.map(id => users.find(u => u.id === id)).filter(Boolean);

  return <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 9800, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}>
    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", letterSpacing: 2 }}>VOICE CALL · {fmt(duration)}</div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 20, justifyContent: "center", maxWidth: 400 }}>
      {[me, ...members.filter(u => u.id !== me.id)].map(u => u && <div key={u.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <div style={{ position: "relative" }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", border: `3px solid ${u.id === me.id && muted ? "rgba(255,255,255,0.2)" : "#00BA7C"}`, padding: 3 }}>
            <Av user={u} sz={74} />
          </div>
          {u.id === me.id && muted && <div style={{ position: "absolute", bottom: 0, right: 0, background: PINK, borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>🔇</div>}
        </div>
        <span style={{ fontSize: 12, color: "white", fontWeight: 600 }}>{u.id === me.id ? "You" : u.username}</span>
      </div>)}
    </div>
    <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
      <button onClick={() => setMuted(v => !v)} style={{ width: 56, height: 56, borderRadius: "50%", background: muted ? PINK : "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{muted ? "🔇" : "🎤"}</button>
      <button onClick={() => setDeafened(v => !v)} style={{ width: 56, height: 56, borderRadius: "50%", background: deafened ? PINK : "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{deafened ? "🔕" : "🔊"}</button>
      <button onClick={() => { stream?.getTracks().forEach(t => t.stop()); onEnd(); }} style={{ width: 56, height: 56, borderRadius: "50%", background: "#e53e3e", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>📵</button>
    </div>
    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>Up to 4 participants · WebRTC</div>
  </div>;
};

// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [dark, setDark] = useState(false);
  const [pg, setPg] = useState("login");
  const [tab, setTab] = useState("home");
  const [me, setMe] = useState(null);
  const [users, setUsers] = useState(() => LS.get("su") || []);
  const [posts, setPosts] = useState(() => LS.get("sp") || []);
  const [clicks, setClicks] = useState(() => LS.get("sc") || []);
  const [thread, setThread] = useState(null);
  const [openClick, setOpenClick] = useState(null);
  const [openUser, setOpenUser] = useState(null);
  const [dmUser, setDmUser] = useState(null);
  const [claudeInit, setClaudeInit] = useState(null);
  const [showClaude, setShowClaude] = useState(false);
  const [groupChats, setGroupChats] = useState(() => LS.get("gchat") || []);
  const [activeGroup, setActiveGroup] = useState(null);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupMembers, setNewGroupMembers] = useState([]);
  const [voiceCall, setVoiceCall] = useState(null); // { participants: [ids] }
  const [showCompose, setShowCompose] = useState(false);
  const [showNewClick, setShowNewClick] = useState(false);
  const [showPP, setShowPP] = useState(false);
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [sf, setSf] = useState({ u: "", pw: "", pw2: "", bio: "" });
  const [serr, setSerr] = useState("");
  const [cName, setCName] = useState("");
  const [cImg, setCImg] = useState(null);
  const avRef = useRef();
  const avRef2 = useRef();
  const cImgRef = useRef();

  useEffect(() => {
    const V = "v16";
    if (LS.get("dv") !== V) {
      const h = (LS.get("su") || []).filter(u => !u.isBot);
      const m = [...h, ...SU];
      LS.set("su", m); setUsers(m);
      LS.set("sp", SP); setPosts(SP);
      LS.set("sc", SC); setClicks(SC);
      LS.set("dv", V);
    }
  }, []);

  const T = {
    bg: dark ? "#000" : "#F7F9F9",
    card: dark ? "#16181C" : "#fff",
    text: dark ? "#E7E9EA" : "#0F1419",
    sub: dark ? "#71767B" : "#536471",
    border: dark ? "#2F3336" : "#EFF3F4",
    input: dark ? "#202327" : "#EFF3F4"
  };

  const notify = m => { setToast(m); setTimeout(() => setToast(""), 3000); };
  const sv = (k, v, s) => { LS.set(k, v); s(v); };

  const checkClaude = useCallback(txt => {
    if (/@claude\b/i.test(txt)) {
      const q = txt.replace(/@claude\b/i, "").trim();
      setClaudeInit(q || "Someone mentioned you on Scrypt! What would you like to say?");
      setShowClaude(true);
    }
  }, []);

  const doPost = useCallback(({ content, image, clickId, parentId, villageOnly }) => {
    const cur = LS.get("sp") || [];
    const p = {
      id: Date.now().toString(),
      userId: me.id, username: me.username, content, image, clickId, parentId, villageOnly,
      likes: [], reposts: [],
      createdAt: new Date().toISOString(),
      replyCount: 0
    };
    const upd = parentId ? cur.map(x => x.id === parentId ? { ...x, replyCount: (x.replyCount || 0) + 1 } : x) : cur;
    sv("sp", [p, ...upd], setPosts);
    notify(villageOnly ? "Posted to Village! 🔒" : parentId ? "Reply posted!" : "Scrypt posted!");
    checkClaude(content);
    if (!villageOnly && !parentId) {
      const bots = (LS.get("su") || []).filter(u => u.isBot);
      const sh = [...bots].sort(() => Math.random() - 0.5);
      const lc = Math.floor(Math.random() * 7) + 1;
      const rc = Math.random() < 0.18 ? Math.floor(Math.random() * 3) + 1 : 0;
      sh.slice(0, lc).forEach((b, i) => setTimeout(() => {
        const c = LS.get("sp") || [];
        const u = c.map(x => x.id === p.id ? { ...x, likes: [...(x.likes || []), b.id] } : x);
        LS.set("sp", u); setPosts(u);
      }, (i + 1) * 800 + Math.random() * 1200));
      sh.slice(lc, lc + rc).forEach((b, i) => setTimeout(() => {
        const c = LS.get("sp") || [];
        const u = c.map(x => x.id === p.id ? { ...x, reposts: [...(x.reposts || []), b.id] } : x);
        LS.set("sp", u); setPosts(u);
      }, (i + 1) * 2000 + Math.random() * 2000));
    }
  }, [me, checkClaude]);

  const doLike = id => sv("sp", posts.map(p => p.id !== id ? p : { ...p, likes: p.likes?.includes(me.id) ? p.likes.filter(x => x !== me.id) : [...(p.likes || []), me.id] }), setPosts);
  const doRt = id => sv("sp", posts.map(p => p.id !== id ? p : { ...p, reposts: p.reposts?.includes(me.id) ? p.reposts.filter(x => x !== me.id) : [...(p.reposts || []), me.id] }), setPosts);
  const doJoin = id => sv("sc", clicks.map(c => c.id !== id ? c : { ...c, members: c.members?.includes(me.id) ? c.members.filter(x => x !== me.id) : [...(c.members || []), me.id] }), setClicks);
  const doVillage = uid => {
    const v = me.village || [];
    const has = v.includes(uid);
    const nv = has ? v.filter(x => x !== uid) : [...v, uid];
    const nu = users.map(u => u.id === me.id ? { ...u, village: nv } : u);
    sv("su", nu, setUsers);
    setMe(p => ({ ...p, village: nv }));
    notify(has ? "Removed from Village" : "Added to Village! 🏘️");
  };
  const doAvatar = e => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = x => {
      const nu = users.map(u => u.id === me.id ? { ...u, avatar: x.target.result } : u);
      sv("su", nu, setUsers); setMe(p => ({ ...p, avatar: x.target.result }));
    };
    r.readAsDataURL(f);
  };
  const doPickDef = url => {
    const nu = users.map(u => u.id === me.id ? { ...u, avatar: url } : u);
    sv("su", nu, setUsers); setMe(p => ({ ...p, avatar: url })); setShowPP(false);
  };
  const doSave = () => {
    setSerr("");
    const upd = {};
    if (sf.u && sf.u.trim() !== me.username) {
      const t = sf.u.trim();
      if (t.length < 3) { setSerr("Min 3 characters."); return; }
      if (users.find(u => u.username === t && u.id !== me.id)) { setSerr("Username taken."); return; }
      upd.username = t;
    }
    if (sf.pw) {
      if (sf.pw.length < 6) { setSerr("Password min 6."); return; }
      if (sf.pw !== sf.pw2) { setSerr("Passwords don't match."); return; }
      upd.password = sf.pw;
    }
    if (sf.bio) upd.bio = sf.bio;
    sv("su", users.map(u => u.id === me.id ? { ...u, ...upd } : u), setUsers);
    setMe(p => ({ ...p, ...upd }));
    setSf({ u: "", pw: "", pw2: "", bio: "" });
    notify("Profile saved! ✓");
  };

  if (pg === "login") return <Login onLogin={u => { setMe({ ...u, village: u.village || [] }); setPg("app"); setTab("home"); }} onSignup={() => setPg("signup")} dark={dark} setDark={setDark} T={T} />;
  if (pg === "signup") return <Signup onDone={u => { setMe(u); setPg("app"); setTab("home"); notify("Welcome to Scrypt! 🎉"); }} onBack={() => setPg("login")} dark={dark} setDark={setDark} T={T} />;

  const myV = me?.village || [];
  const feed = posts.filter(p => !p.parentId && (!p.villageOnly || (p.userId === me.id || myV.includes(p.userId)))).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const mine = posts.filter(p => p.userId === me.id && !p.parentId);
  const villagers = users.filter(u => myV.includes(u.id));
  const mutuals = users.filter(u => myV.includes(u.id) && (u.village || []).includes(me.id));
  const notifCount = posts.filter(p => p.userId === me.id && (((p.likes || []).filter(x => x !== me.id).length > 0) || (p.reposts || []).filter(x => x !== me.id).length > 0)).length;

  const inp = { width: "100%", background: T.input, border: "none", borderRadius: 10, padding: "10px 14px", color: T.text, fontSize: 14, outline: "none", boxSizing: "border-box" };

  const Nav = ({ id, icon, label, badge }) => <button onClick={() => { setTab(id); setThread(null); setDmUser(null); setActiveGroup(null); setOpenUser(null); }} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: "none", border: "none", cursor: "pointer", color: tab === id ? T.text : T.sub, padding: "8px 4px", position: "relative" }}>
    {icon}
    {badge > 0 && <div style={{ position: "absolute", top: 4, right: "calc(50% - 14px)", background: PINK, color: "white", borderRadius: 9999, minWidth: 16, height: 16, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, padding: "0 3px" }}>{badge}</div>}
    <span style={{ fontSize: 10, fontWeight: tab === id ? 700 : 500 }}>{label}</span>
  </button>;

  return <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "'Segoe UI',sans-serif", color: T.text }}>
    {toast && <div style={{ position: "fixed", top: 18, left: "50%", transform: "translateX(-50%)", background: T.text, color: T.bg, padding: "10px 20px", borderRadius: 9999, fontSize: 14, fontWeight: 600, zIndex: 9999, whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>{toast}</div>}
    {voiceCall && <VoiceCall me={me} participants={voiceCall.participants} users={users} T={T} onEnd={() => { setVoiceCall(null); notify("Call ended"); }} />}
    {showClaude && <ClaudeChat T={T} onClose={() => { setShowClaude(false); setClaudeInit(null); }} init={claudeInit} />}}
    {openUser && <ProfileModal user={openUser} me={me} onClose={() => setOpenUser(null)} onVillage={doVillage} T={T} posts={posts} />}
    {showPP && <PicPicker onPick={doPickDef} onClose={() => setShowPP(false)} T={T} />}

    {/* Compose Modal */}
    {showCompose && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 8500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: T.card, borderRadius: 16, width: "100%", maxWidth: 560, border: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: `1px solid ${T.border}` }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: T.text }}>New Scrypt</span>
          <button onClick={() => setShowCompose(false)} style={{ background: "none", border: "none", cursor: "pointer", color: T.text }}><XI /></button>
        </div>
        <Compose me={me} onPost={p => { doPost(p); setShowCompose(false); }} T={T} users={users} />
      </div>
    </div>}

    {/* New Click Modal */}
    {showNewClick && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 8500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: T.card, borderRadius: 16, padding: 22, width: "100%", maxWidth: 400, border: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontWeight: 800, fontSize: 17, color: T.text }}>Create a Click</span>
          <button onClick={() => setShowNewClick(false)} style={{ background: "none", border: "none", cursor: "pointer", color: T.text }}><XI /></button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div onClick={() => cImgRef.current.click()} style={{ height: 86, borderRadius: 10, border: `2px dashed ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden" }}>
            {cImg ? <img src={cImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: T.sub, fontSize: 13 }}>+ Add cover image</span>}
          </div>
          <input ref={cImgRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = x => setCImg(x.target.result); r.readAsDataURL(f); }} />
          <input value={cName} onChange={e => setCName(e.target.value)} placeholder="Click name..." style={{ ...inp }} />
          <button onClick={() => {
            if (!cName.trim()) return;
            sv("sc", [{ id: Date.now().toString(), name: cName.trim(), image: cImg, members: [me.id], ownerId: me.id, createdAt: new Date().toISOString() }, ...clicks], setClicks);
            setCName(""); setCImg(null); setShowNewClick(false); notify("Click created! 🎉");
          }} style={{ background: BLUE, color: "white", border: "none", borderRadius: 9999, padding: 13, fontWeight: 700, cursor: "pointer" }}>Create Click</button>
        </div>
      </div>
    </div>}

    {/* Click Modal */}
    {openClick && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 8000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ background: T.card, borderRadius: "16px 16px 0 0", width: "100%", maxWidth: 600, height: "85vh", overflow: "auto", border: `1px solid ${T.border}` }}>
        <div style={{ position: "sticky", top: 0, background: T.card, padding: "11px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg, ${BLUE}, ${PURPLE})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, overflow: "hidden" }}>
            {openClick.image ? <img src={openClick.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "🏘️"}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: T.text }}>{openClick.name}</div>
            <div style={{ fontSize: 11, color: T.sub }}>{openClick.members?.length || 0} members</div>
          </div>
          <button onClick={() => doJoin(openClick.id)} style={{ background: openClick.members?.includes(me.id) ? T.input : BLUE, color: openClick.members?.includes(me.id) ? T.text : "white", border: "none", borderRadius: 9999, padding: "7px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{openClick.members?.includes(me.id) ? "Joined ✓" : "Join"}</button>
          <button onClick={() => setOpenClick(null)} style={{ background: "none", border: "none", cursor: "pointer", color: T.text }}><XI /></button>
        </div>
        <Compose me={me} onPost={doPost} T={T} users={users} placeholder={`Post in ${openClick.name}...`} clickId={openClick.id} />
        {posts.filter(p => p.clickId === openClick.id && !p.parentId).map(p => <Post key={p.id} p={p} me={me} users={users} all={posts} onLike={doLike} onRt={doRt} onReply={r => doPost({ ...r, parentId: p.id })} onThread={setThread} onUser={setOpenUser} T={T} />)}
        {posts.filter(p => p.clickId === openClick.id && !p.parentId).length === 0 && <p style={{ textAlign: "center", color: T.sub, padding: "32px 16px" }}>No posts yet. Be the first!</p>}
      </div>
    </div>}

    {/* HEADER */}
    <div style={{ position: "sticky", top: 0, zIndex: 100, background: dark ? "rgba(0,0,0,0.92)" : "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${T.border}` }}>
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "8px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div onClick={() => setShowCompose(true)} style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <img src={LOGO} style={{ width: 36, height: 20, objectFit: "contain" }} alt="logo" />
          <span style={{ fontWeight: 900, fontSize: 20, color: BLUE }}>Scrypt</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => { setClaudeInit(null); setShowClaude(true); }} style={{ background: `linear-gradient(135deg, ${BLUE}, ${PURPLE})`, color: "white", border: "none", borderRadius: 9999, padding: "7px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <SparkI /> Ask @Claude
          </button>
          <button onClick={() => setDark(d => !d)} style={{ background: "none", border: "none", cursor: "pointer", color: T.sub }}>{dark ? <SunI /> : <MoonI />}</button>
          <div onClick={() => setOpenUser(me)} style={{ cursor: "pointer" }}><Av user={me} sz={32} /></div>
        </div>
      </div>
    </div>

    {/* CONTENT */}
    <div style={{ maxWidth: 600, margin: "0 auto", paddingBottom: 76 }}>
      {thread && <Thread p={thread} me={me} users={users} all={posts} onLike={doLike} onRt={doRt} onReply={doPost} onBack={() => setThread(null)} onUser={setOpenUser} T={T} />}

      {!thread && tab === "home" && <>
        <div style={{ padding: "8px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: T.sub, display: "flex", alignItems: "center", gap: 4 }}>📅 Chronological · No algorithm</span>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: T.sub }}>{feed.length} posts</div>
        </div>
        <Compose me={me} onPost={doPost} T={T} users={users} />
        {feed.map(p => <Post key={p.id} p={p} me={me} users={users} all={posts} onLike={doLike} onRt={doRt} onReply={r => doPost({ ...r, parentId: p.id })} onThread={setThread} onUser={setOpenUser} T={T} />)}
        {feed.length === 0 && <p style={{ textAlign: "center", color: T.sub, padding: "40px 16px" }}>No posts yet. Say something! 👋</p>}
      </>}

      {!thread && tab === "search" && <div>
        <div style={{ padding: "10px 16px", borderBottom: `1px solid ${T.border}` }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search people & posts..." style={{ ...inp, borderRadius: 9999 }} />
        </div>
        {search.length >= 2 && <>
          {users.filter(u => u.username.toLowerCase().includes(search.toLowerCase())).slice(0, 5).map(u => <div key={u.id} onClick={() => setOpenUser(u)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: `1px solid ${T.border}`, cursor: "pointer" }}>
            <Av user={u} sz={44} />
            <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 15, color: T.text }}>{u.username}</div><div style={{ fontSize: 13, color: T.sub }}>{u.bio || `@${u.username.toLowerCase()}`}</div></div>
            <button onClick={e => { e.stopPropagation(); doVillage(u.id); }} style={{ background: myV.includes(u.id) ? T.input : BLUE, color: myV.includes(u.id) ? T.text : "white", border: "none", borderRadius: 9999, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{myV.includes(u.id) ? "In Village" : "Add"}</button>
          </div>)}
          {posts.filter(p => !p.parentId && censor(p.content).toLowerCase().includes(search.toLowerCase())).slice(0, 10).map(p => <Post key={p.id} p={p} me={me} users={users} all={posts} onLike={doLike} onRt={doRt} onReply={r => doPost({ ...r, parentId: p.id })} onThread={setThread} onUser={setOpenUser} T={T} />)}
        </>}
        {search.length < 2 && <p style={{ textAlign: "center", color: T.sub, padding: "32px 16px", fontSize: 14 }}>Type to search people and posts</p>}
      </div>}

      {!thread && tab === "clicks" && <div>
        <div style={{ padding: "11px 16px", borderBottom: `1px solid ${T.border}` }}>
          <button onClick={() => setShowNewClick(true)} style={{ background: BLUE, color: "white", border: "none", borderRadius: 9999, padding: "9px 18px", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><PlusI /> New Click</button>
        </div>
        {clicks.map(c => <div key={c.id} onClick={() => setOpenClick(c)} style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
          <div style={{ width: 46, height: 46, borderRadius: 11, background: `linear-gradient(135deg, ${BLUE}, ${PURPLE})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, overflow: "hidden", flexShrink: 0 }}>
            {c.image ? <img src={c.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "🏘️"}
          </div>
          <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 15, color: T.text }}>{c.name}</div><div style={{ fontSize: 12, color: T.sub }}>{c.members?.length || 0} members</div></div>
          <button onClick={e => { e.stopPropagation(); doJoin(c.id); }} style={{ background: c.members?.includes(me.id) ? T.input : BLUE, color: c.members?.includes(me.id) ? T.text : "white", border: "none", borderRadius: 9999, padding: "7px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{c.members?.includes(me.id) ? "Joined" : "Join"}</button>
        </div>)}
      </div>}

      {!thread && tab === "notif" && <NotifTab me={me} users={users} posts={posts} T={T} />}

      {!thread && tab === "dms" && !dmUser && !activeGroup && <div>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: T.text, marginBottom: 3 }}>Instant Messages</div>
            <div style={{ fontSize: 13, color: T.sub }}>Mutuals can IM · Anyone can group chat</div>
          </div>
          <button onClick={() => setShowNewGroup(true)} style={{ background: BLUE, color: "white", border: "none", borderRadius: 9999, padding: "8px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}><PlusI /> Group</button>
        </div>

        {/* New Group Modal */}
        {showNewGroup && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 8500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: T.card, borderRadius: 16, padding: 22, width: "100%", maxWidth: 400, border: `1px solid ${T.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontWeight: 800, fontSize: 17, color: T.text }}>New Group Chat</span>
              <button onClick={() => { setShowNewGroup(false); setNewGroupName(""); setNewGroupMembers([]); }} style={{ background: "none", border: "none", cursor: "pointer", color: T.text }}><XI /></button>
            </div>
            <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Group name..." style={{ width: "100%", background: T.input, border: "none", borderRadius: 10, padding: "11px 14px", color: T.text, fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 12 }} />
            <div style={{ fontSize: 12, color: T.sub, marginBottom: 8 }}>Add members from your Village:</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflow: "auto", marginBottom: 14 }}>
              {villagers.map(u => {
                const selected = newGroupMembers.includes(u.id);
                return <div key={u.id} onClick={() => setNewGroupMembers(p => selected ? p.filter(x => x !== u.id) : [...p, u.id])} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, background: selected ? (dark ? "#1a2a3a" : "#e8f4fd") : T.input, cursor: "pointer" }}>
                  <Av user={u} sz={32} />
                  <span style={{ fontSize: 14, color: T.text, flex: 1 }}>{u.username}</span>
                  {selected && <span style={{ color: BLUE, fontWeight: 700, fontSize: 13 }}>✓</span>}
                </div>;
              })}
            </div>
            <button onClick={() => {
              if (!newGroupName.trim() || newGroupMembers.length === 0) return;
              const g = { id: Date.now().toString(), name: newGroupName.trim(), members: [me.id, ...newGroupMembers], createdBy: me.id, createdAt: new Date().toISOString() };
              const updated = [g, ...groupChats];
              LS.set("gchat", updated); setGroupChats(updated);
              setShowNewGroup(false); setNewGroupName(""); setNewGroupMembers([]);
              setActiveGroup(g); notify("Group created! 🎉");
            }} disabled={!newGroupName.trim() || newGroupMembers.length === 0} style={{ background: BLUE, color: "white", border: "none", borderRadius: 9999, padding: 13, width: "100%", fontWeight: 700, cursor: "pointer", opacity: (!newGroupName.trim() || newGroupMembers.length === 0) ? 0.5 : 1 }}>Create Group ({newGroupMembers.length} members)</button>
          </div>
        </div>}

        {/* Group Chats */}
        {groupChats.filter(g => g.members.includes(me.id)).length > 0 && <>
          <div style={{ padding: "8px 16px", fontSize: 11, fontWeight: 700, color: T.sub, borderBottom: `1px solid ${T.border}` }}>GROUP CHATS</div>
          {groupChats.filter(g => g.members.includes(me.id)).map(g => {
            const gMembers = g.members.map(id => users.find(u => u.id === id)).filter(Boolean);
            return <div key={g.id} onClick={() => setActiveGroup(g)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: `1px solid ${T.border}`, cursor: "pointer" }}>
              <div style={{ width: 46, height: 46, borderRadius: "50%", background: `linear-gradient(135deg,${BLUE},${PURPLE})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>👥</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: T.text }}>{g.name}</div>
                <div style={{ fontSize: 12, color: T.sub }}>{gMembers.map(u => u.username).join(", ")}</div>
              </div>
            </div>;
          })}
        </>}

        {/* Direct Messages */}
        {mutuals.length > 0 && <div style={{ padding: "8px 16px", fontSize: 11, fontWeight: 700, color: T.sub, borderBottom: `1px solid ${T.border}` }}>DIRECT MESSAGES</div>}
        {mutuals.length === 0 && groupChats.filter(g => g.members.includes(me.id)).length === 0 && <div style={{ padding: "32px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>💬</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: T.text, marginBottom: 6 }}>No messages yet</div>
          <div style={{ fontSize: 14, color: T.sub }}>Create a group chat or add mutual villagers to DM.</div>
        </div>}
        {mutuals.map(u => <div key={u.id} onClick={() => setDmUser(u)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: `1px solid ${T.border}`, cursor: "pointer" }}>
          <Av user={u} sz={46} />
          <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 15, color: T.text }}>{u.username}</div><div style={{ fontSize: 13, color: T.sub }}>@{u.username.toLowerCase()}</div></div>
          <div style={{ color: T.sub, opacity: 0.6 }}><MsgI /></div>
        </div>)}
      </div>}

      {!thread && tab === "dms" && dmUser && <DMView me={me} other={dmUser} users={users} T={T} onBack={() => setDmUser(null)} onCall={() => setVoiceCall({ participants: [me.id, dmUser.id] })} />}
      {!thread && tab === "dms" && activeGroup && !dmUser && <GroupChatView me={me} group={activeGroup} users={users} T={T} onBack={() => setActiveGroup(null)} onCall={() => setVoiceCall({ participants: activeGroup.members.slice(0, 4) })} onUpdateGroup={g => { const updated = groupChats.map(x => x.id === g.id ? g : x); LS.set("gchat", updated); setGroupChats(updated); setActiveGroup(g); }} />}}

      {!thread && tab === "profile" && <div>
        <div style={{ height: 96, background: `linear-gradient(135deg,${BLUE},${PURPLE})`, position: "relative", overflow: "hidden", flexShrink: 0 }}>
          <div style={{ position: "absolute", bottom: -28, left: 16, border: `4px solid ${T.card}`, borderRadius: "50%", zIndex: 2 }}><Av user={me} sz={64} /></div>
        </div>
        <div style={{ padding: "36px 16px 14px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 10 }}>
            <button onClick={() => setShowPP(true)} style={{ background: T.input, color: T.text, border: "none", borderRadius: 9999, padding: "7px 14px", fontSize: 13, cursor: "pointer" }}>Choose pic</button>
            <button onClick={() => avRef.current.click()} style={{ background: T.input, color: T.text, border: "none", borderRadius: 9999, padding: "7px 14px", fontSize: 13, cursor: "pointer" }}>Upload photo</button>
            <input ref={avRef} type="file" accept="image/*" style={{ display: "none" }} onChange={doAvatar} />
          </div>
          <div style={{ fontWeight: 800, fontSize: 20, color: T.text }}>{me.username}</div>
          <div style={{ fontSize: 13, color: T.sub }}>@{me.username.toLowerCase()}</div>
          {me.bio && <div style={{ fontSize: 14, color: T.text, marginTop: 5 }}>{me.bio}</div>}
          <div style={{ display: "flex", gap: 20, marginTop: 10 }}>
            <span style={{ fontSize: 14, color: T.sub }}><strong style={{ color: T.text }}>{mine.length}</strong> Scrypts</span>
            <span style={{ fontSize: 14, color: T.sub }}><strong style={{ color: T.text }}>{myV.length}</strong> Village</span>
            <span style={{ fontSize: 14, color: T.sub }}><strong style={{ color: T.text }}>{mutuals.length}</strong> Mutuals</span>
          </div>
        </div>
        <div style={{ padding: 14, borderBottom: `1px solid ${T.border}`, background: T.card }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: T.text, marginBottom: 10 }}>🏘️ My Village</div>
          {villagers.length === 0 && <p style={{ fontSize: 12, color: T.sub, margin: 0 }}>No villagers yet. Search for people to add!</p>}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {villagers.map(v => {
              const isMutual = (v.village || []).includes(me.id);
              return <div key={v.id} onClick={() => setOpenUser(v)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer" }}>
                <div style={{ position: "relative" }}>
                  <Av user={v} sz={44} />
                  {isMutual && <div style={{ position: "absolute", bottom: 0, right: 0, background: "#00BA7C", borderRadius: "50%", width: 14, height: 14, border: `2px solid ${T.card}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8 }}>✓</div>}
                </div>
                <span style={{ fontSize: 9, color: T.sub, maxWidth: 44, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.username}</span>
              </div>;
            })}
          </div>
        </div>
        {mine.filter(p => p.villageOnly).length > 0 && <>
          <div style={{ padding: "8px 16px", fontSize: 12, fontWeight: 700, color: PURPLE, borderBottom: `1px solid ${T.border}` }}>🔒 VILLAGE POSTS</div>
          {mine.filter(p => p.villageOnly).map(p => <Post key={p.id} p={p} me={me} users={users} all={posts} onLike={doLike} onRt={doRt} onReply={r => doPost({ ...r, parentId: p.id })} onThread={setThread} onUser={setOpenUser} T={T} />)}
        </>}
        <div style={{ padding: "8px 16px", fontSize: 12, fontWeight: 700, color: T.sub, borderBottom: `1px solid ${T.border}` }}>MY SCRYPTS</div>
        {mine.filter(p => !p.villageOnly).map(p => <Post key={p.id} p={p} me={me} users={users} all={posts} onLike={doLike} onRt={doRt} onReply={r => doPost({ ...r, parentId: p.id })} onThread={setThread} onUser={setOpenUser} T={T} />)}
        {mine.filter(p => !p.villageOnly).length === 0 && <p style={{ textAlign: "center", color: T.sub, padding: "24px 16px", fontSize: 14 }}>No posts yet. Start Scrypting!</p>}
      </div>}

      {!thread && tab === "settings" && <div style={{ padding: 16, paddingBottom: 90 }}>
        <div style={{ background: T.card, borderRadius: 14, padding: 18, marginBottom: 12, border: `1px solid ${T.border}` }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: T.text, marginBottom: 14 }}>Profile</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <Av user={me} sz={50} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => setShowPP(true)} style={{ background: T.input, color: T.text, border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 13, cursor: "pointer" }}>Choose pic</button>
              <button onClick={() => avRef2.current.click()} style={{ background: T.input, color: T.text, border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 13, cursor: "pointer" }}>Upload photo</button>
              <input ref={avRef2} type="file" accept="image/*" style={{ display: "none" }} onChange={doAvatar} />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            <div><label style={{ fontSize: 11, color: T.sub, display: "block", marginBottom: 3 }}>USERNAME</label><input value={sf.u} onChange={e => setSf(p => ({ ...p, u: e.target.value }))} placeholder={me.username} style={{ width: "100%", background: T.input, border: "none", borderRadius: 10, padding: "10px 14px", color: T.text, fontSize: 14, outline: "none", boxSizing: "border-box" }} /></div>
            <div><label style={{ fontSize: 11, color: T.sub, display: "block", marginBottom: 3 }}>BIO</label><input value={sf.bio} onChange={e => setSf(p => ({ ...p, bio: e.target.value }))} placeholder={me.bio || "Tell us about yourself..."} style={{ width: "100%", background: T.input, border: "none", borderRadius: 10, padding: "10px 14px", color: T.text, fontSize: 14, outline: "none", boxSizing: "border-box" }} /></div>
          </div>
        </div>
        <div style={{ background: T.card, borderRadius: 14, padding: 18, marginBottom: 12, border: `1px solid ${T.border}` }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: T.text, marginBottom: 12 }}>Password</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            <input type="password" value={sf.pw} onChange={e => setSf(p => ({ ...p, pw: e.target.value }))} placeholder="New password" style={{ width: "100%", background: T.input, border: "none", borderRadius: 10, padding: "10px 14px", color: T.text, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            <input type="password" value={sf.pw2} onChange={e => setSf(p => ({ ...p, pw2: e.target.value }))} placeholder="Confirm new password" style={{ width: "100%", background: T.input, border: "none", borderRadius: 10, padding: "10px 14px", color: T.text, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>
        </div>
        {serr && <div style={{ fontSize: 13, color: PINK, padding: "8px 12px", background: dark ? "#1a0810" : "#fff0f5", borderRadius: 8, marginBottom: 12 }}>{serr}</div>}
        <button onClick={doSave} style={{ background: BLUE, color: "white", border: "none", borderRadius: 9999, padding: 13, width: "100%", fontWeight: 800, cursor: "pointer", fontSize: 15, marginBottom: 10 }}>Save Changes</button>
        <button onClick={() => { setMe(null); setPg("login"); }} style={{ background: "transparent", color: PINK, border: `2px solid ${PINK}`, borderRadius: 9999, padding: 13, width: "100%", fontWeight: 700, cursor: "pointer", fontSize: 15 }}>Sign Out</button>
        <div style={{ marginTop: 18, padding: 12, background: dark ? "#1a1400" : "#fffbeb", borderRadius: 10, border: `1px solid ${dark ? "#3a3000" : "#fde68a"}` }}>
          <p style={{ fontSize: 11, color: T.sub, margin: 0, lineHeight: 1.7 }}>
            <strong style={{ color: T.text }}>⚠️ Important:</strong> Add your Anthropic API key where it says <code style={{ background: T.input, padding: "1px 5px", borderRadius: 4 }}>YOUR_API_KEY_HERE</code> to enable Claude AI.
          </p>
        </div>
      </div>}
    </div>

    {/* BOTTOM NAV */}
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: dark ? "rgba(0,0,0,0.95)" : "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", borderTop: `1px solid ${T.border}` }}>
      <div style={{ maxWidth: 600, margin: "0 auto", display: "flex" }}>
        <Nav id="home"     icon={<HomeI />}  label="Home" />
        <Nav id="search"   icon={<SrchI />}  label="Search" />
        <Nav id="clicks"   icon={<GrpI />}   label="Clicks" />
        <Nav id="notif"    icon={<BellI />}  label="Activity" badge={notifCount} />
        <Nav id="dms"      icon={<MsgI />}   label="IMs" />
        <Nav id="profile"  icon={<UserI />}  label="Profile" />
        <Nav id="settings" icon={<GearI />}  label="Settings" />
      </div>
    </div>
  </div>;
}
