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
