import { useState, useRef, useCallback, useEffect } from "react";

const BLUE = "#1D9BF0", PURPLE = "#7c3aed", PINK = "#F91880";

// ── LOCAL STORAGE (kept only for large/binary data + session) ─────────────────
const LS = {
  get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};

// ── SUPABASE CLIENT ────────────────────────────────────────────────────────────
const SUPA_URL = "https://wzrxrgybdwoawhaleuah.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cnhyZ3liZHdvYXdoYWxldWFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMTQwNzYsImV4cCI6MjA4ODg5MDA3Nn0.tkFdz7v-r5M21_WeiP7PI0Ipe3XdfHnvwZ1p7CRRUqc";

const sbFetch = async (path, options = {}) => {
  const url = `${SUPA_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "apikey": SUPA_KEY,
      "Authorization": `Bearer ${SUPA_KEY}`,
      "Content-Type": "application/json",
      "Prefer": options.prefer || "return=representation",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    console.error("Supabase error:", path, res.status, err);
    return null;
  }
  const text = await res.text();
  if (!text) return [];
  try { return JSON.parse(text); } catch { return []; }
};

// DB helpers
const DB = {
  // USERS
  getUsers: () => sbFetch("users?select=*&order=created_at.asc&limit=1000"),
  getUserByUsername: (username) => sbFetch(`users?username=eq.${encodeURIComponent(username)}&select=*`),
  upsertUser: (user) => sbFetch("users", { method: "POST", body: JSON.stringify(user), prefer: "resolution=merge-duplicates,return=representation", headers: { "Prefer": "resolution=merge-duplicates,return=representation" } }),
  updateUser: (id, data) => sbFetch(`users?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(data) }),
  insertUser: (user) => sbFetch("users", { method: "POST", body: JSON.stringify(user) }),

  // POSTS
  getPosts: () => sbFetch("posts?select=*&order=created_at.desc&limit=2000"),
  insertPost: (post) => sbFetch("posts", { method: "POST", body: JSON.stringify(post) }),
  updatePost: (id, data) => sbFetch(`posts?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(data) }),
  deletePost: (id) => sbFetch(`posts?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", prefer: "return=minimal" }),

  // CLICKS
  getClicks: () => sbFetch("clicks?select=*&order=created_at.asc&limit=200"),
  insertClick: (click) => sbFetch("clicks", { method: "POST", body: JSON.stringify(click) }),
  updateClick: (id, data) => sbFetch(`clicks?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(data) }),

  // REPORTS
  insertReport: (report) => sbFetch("reports", { method: "POST", body: JSON.stringify(report), prefer: "return=minimal" }),

  // DMs — stored as rows with conversation_key + messages JSON
  getDMs: (key) => sbFetch(`dms?conversation_key=eq.${encodeURIComponent(key)}&select=*`),
  upsertDMs: (key, messages) => sbFetch("dms", { method: "POST", body: JSON.stringify({ conversation_key: key, messages: JSON.stringify(messages) }), prefer: "resolution=merge-duplicates,return=representation", headers: { "Prefer": "resolution=merge-duplicates,return=representation" } }),
};

// Convert DB row → app object (posts/clicks come back with snake_case from DB → map to camelCase arrays)
const rowToPost = r => {
  if (!r) return null;
  return {
    id: r.id,
    userId: r.user_id || r.userId,
    username: r.username,
    content: r.content,
    likes: tryParse(r.likes, []),
    reposts: tryParse(r.reposts, []),
    createdAt: r.created_at || r.createdAt,
    replyCount: r.reply_count ?? r.replyCount ?? 0,
    parentId: r.reply_to || r.parent_id || r.parentId || null,
    replyTo: r.reply_to || r.replyTo || null,
    clickId: r.click_id || r.clickId || null,
    isRepost: r.is_repost || r.isRepost || false,
    reposterId: r.reposter_id || r.reposterId || null,
    reposterUsername: r.reposter_username || r.reposterUsername || null,
    repostedAt: r.reposted_at || r.repostedAt || null,
    editedAt: r.edited_at || r.editedAt || null,
    pinned: r.pinned || false,
  };
};

const rowToUser = r => {
  if (!r) return null;
  const village = tryParse(r.village, []);
  const extra = tryParse(r.info_fields, {});
  const wallpaper = r.wallpaper ? (tryParse(r.wallpaper, null) || r.wallpaper) : (extra.wallpaper || null);
  return {
    id: r.id, username: r.username, password: r.password, avatar: r.avatar, bio: r.bio,
    isBot: r.is_bot ?? r.isBot ?? false,
    isSpecial: r.is_special ?? r.isSpecial ?? false,
    verified: r.verified ?? false,
    village: Array.isArray(village) ? village : [],
    joinedAt: r.joined_at || r.joinedAt || r.created_at,
    mood: r.mood || null, accentColor: r.accent_color || r.accentColor || null,
    featuredPostId: r.featured_post_id || r.featuredPostId || null,
    hasProfileSong: r.has_profile_song ?? r.hasProfileSong ?? false,
    profileSongName: r.profile_song_name || r.profileSongName || null,
    wallpaper,
    infoMovie: extra.infoMovie||null, infoArtist: extra.infoArtist||null,
    infoShow: extra.infoShow||null, infoBook: extra.infoBook||null,
    infoGame: extra.infoGame||null, dark: extra.dark!==undefined?extra.dark:null,
    infoMoviePhoto: extra.infoMoviePhoto||null, infoArtistPhoto: extra.infoArtistPhoto||null,
    infoShowPhoto: extra.infoShowPhoto||null, infoBookPhoto: extra.infoBookPhoto||null,
    infoGamePhoto: extra.infoGamePhoto||null,
  };
};

const rowToClick = r => {
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    image: r.image,
    members: tryParse(r.members, []),
    ownerId: r.owner_id || r.ownerId,
    createdAt: r.created_at || r.createdAt,
  };
};

const postToRow = p => ({
  id: p.id,
  user_id: p.userId,
  username: p.username,
  content: p.content,
  likes: JSON.stringify(p.likes || []),
  reposts: JSON.stringify(p.reposts || []),
  created_at: p.createdAt,
  reply_count: p.replyCount ?? 0,
  reply_to: p.parentId || p.replyTo || null,
  click_id: p.clickId || null,
  is_repost: p.isRepost || false,
  reposter_id: p.reposterId || null,
  reposter_username: p.reposterUsername || null,
  reposted_at: p.repostedAt || null,
  edited_at: p.editedAt || null,
  pinned: p.pinned || false,
});

const userToRow = u => ({
  id: u.id,
  username: u.username,
  password: u.password,
  avatar: u.avatar || null,
  bio: u.bio || null,
  is_bot: u.isBot || false,
  is_special: u.isSpecial || false,
  verified: u.verified || false,
  village: JSON.stringify(Array.isArray(u.village) ? u.village : []),
  joined_at: u.joinedAt || new Date().toISOString(),
  mood: u.mood || null,
  accent_color: u.accentColor || null,
  featured_post_id: u.featuredPostId || null,
  has_profile_song: u.hasProfileSong || false,
  profile_song_name: u.profileSongName || null,
  info_fields: JSON.stringify({
    infoMovie: u.infoMovie || null,
    infoArtist: u.infoArtist || null,
    infoShow: u.infoShow || null,
    infoBook: u.infoBook || null,
    infoGame: u.infoGame || null,
    infoMoviePhoto: u.infoMoviePhoto || null,
    infoArtistPhoto: u.infoArtistPhoto || null,
    infoShowPhoto: u.infoShowPhoto || null,
    infoBookPhoto: u.infoBookPhoto || null,
    infoGamePhoto: u.infoGamePhoto || null,
    dark: u.dark !== undefined ? u.dark : null,
  }),
});

const clickToRow = c => ({
  id: c.id,
  name: c.name,
  image: c.image || null,
  members: JSON.stringify(c.members || []),
  owner_id: c.ownerId,
  created_at: c.createdAt,
});

function tryParse(v, fallback) {
  if (v === null || v === undefined) return fallback;
  if (typeof v !== "string") return v;
  try { return JSON.parse(v); } catch { return fallback; }
}
// App-level shared Groq key — all users get AI features free
const APP_KEY = "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";
const getKey = () => { try { return localStorage.getItem("sharedApiKey") || JSON.parse(localStorage.getItem("apiKey")) || APP_KEY; } catch { return APP_KEY; } };
const setSharedKey = (k) => { try { localStorage.setItem("sharedApiKey", k); } catch {} };
const claudeFetch = (body) => {
  const key = getKey();
  if (!key) return Promise.resolve({ ok: true, json: () => Promise.resolve({ content: [{ type: "text", text: "" }] }) });
  if (key.startsWith("gsk_")) {
    const groqBody = { model: "llama-3.3-70b-versatile", max_tokens: body.max_tokens || 500, messages: body.system ? [{ role: "system", content: body.system }, ...(body.messages || [])] : (body.messages || []) };
    return fetch("https://api.groq.com/openai/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key }, body: JSON.stringify(groqBody) }).then(r => ({ ok: r.ok, json: async () => { const d = await r.json(); return { content: [{ type: "text", text: d.choices?.[0]?.message?.content || "" }] }; } }));
  }
  return fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify(body) });
};

// Only censor the truly offensive words — mild language like "damn", "hell", "ass", "crap" are fine
const BAD = ["fuck","shit","cunt","cock","pussy"];
const hasBad = t => { if (!t) return false; return BAD.some(w => t.toLowerCase().includes(w)); };
const censor = t => {
  if (!t) return t;
  let r = t;
  BAD.forEach(w => { r = r.replace(new RegExp(`\\b${w}\\b`, "gi"), w[0] + "*".repeat(w.length - 1)); });
  return r;
};
const ago = iso => {
  const d = new Date(iso), now = new Date(), ms = now - d;
  if (ms < 60000) return "just now";
  if (ms < 3600000) return Math.floor(ms / 60000) + "m";
  if (ms < 86400000) return Math.floor(ms / 3600000) + "h";
  return Math.floor(ms / 86400000) + "d";
};

// 200 Giga Chad bot users with pravatar avatars
const GIGACHAD_NAMES = ["alex_rivera","maya_chen","jordan_lee","sam_torres","riley_kim","casey_morgan","drew_patel","taylor_wu","morgan_james","jamie_silva","avery_brooks","jordan_hayes","quinn_foster","reese_santos","blake_nguyen","cameron_price","dakota_ross","emery_bell","finley_cox","harley_ward","indigo_scott","jaden_flores","kendall_gray","logan_hill","maxwell_cooper","nolan_reed","olive_bass","parker_hunt","quinn_james","remy_walsh","sage_baker","sloane_perry","sterling_cole","sutton_kelly","tatum_shaw","theo_hayes","trinity_cook","tyler_ross","val_knight","vivian_chen","wes_morgan","willow_fox","xander_price","yasmine_bell","zane_ford","zoe_hart","atlas_lee","beau_stone","cedar_brooks","delaney_marsh","eden_cross","ember_sky","falcon_reed","gray_wolf","haven_sea","iris_bloom","jasper_stone","june_lake","kira_moon","lake_blue","lena_star","leo_gold","liam_ash","lily_rose","luna_silver","mars_red","mia_sun","miles_jazz","nico_wave","nova_bright","oak_strong","ocean_deep","pearl_white","pine_tall","rain_soft","river_bold","robin_free","rose_wild","ruby_dark","sage_green","sandy_shore","sierra_peak","sky_high","sol_warm","storm_dark","sunny_bay","terra_firm","thorn_sharp","tide_low","trace_light","twig_thin","umbra_shadow","vale_quiet","vine_climb","volt_spark","wade_deep","wave_crash","whit_pure","wind_swift","wolf_lone","yew_old","zest_bright","blaze_king","apex_chad","flex_master","sigma_grind","alpha_wolf","beast_mode","grind_set","hustle_hard","level_up","power_move","grind_boss","elite_flow","vibe_lord","peak_form","clutch_play","main_event","top_tier","fire_starter","legend_only","goat_status","ultra_grind","max_flex","pure_fire","zero_chill","heat_check","big_brain","deep_cut","sharp_mind","clear_eye","bold_step","fast_rise","cool_head","iron_will","true_grit","real_deal","no_cap","facts_only","solid_move","clean_shot","fresh_wave","raw_talent","pure_skill","natural_born","self_made","built_diff","next_level","game_changer","key_player","strong_suit","hard_carry","clutch_factor","core_strength","foundation_solid","high_stakes","full_send","all_in_now","back_to_back","non_stop_go","keep_pushing","stay_hungry","chase_goals","own_it_all","make_moves","write_history","set_records","break_limits","push_further","go_beyond","reach_peak","hold_court","run_it_back","stay_locked","eyes_forward","head_down","work_speaks","let_it_ride","trust_process","earn_it_daily","stack_wins","build_legacy","leave_mark","stand_tall","rise_always","never_fold","stay_ready","be_relentless","move_smart","play_long","think_big","act_bold","speak_truth","walk_tall","run_deep","shine_bright"];
const SU = Array.from({ length: 200 }, (_, i) => ({
  id: `bot_${String(i).padStart(3, "0")}`,
  username: GIGACHAD_NAMES[i] || `gigachad_${i}`,
  avatar: `https://i.pravatar.cc/150?img=${(i % 70) + 1}`,
  bio: ["Coffee first, everything else second","Living my best digital life","Just here for the vibes","Making things, breaking things","Tech nerd + outdoor enthusiast","Night owl 🦉","Chasing sunsets and good code","Words are my superpower","Amateur chef, professional overthinker","Exploring one city at a time","Giga Chad energy only 💪","Built different, stay winning","No days off, all gains","Sigma mindset, alpha results","Elite operator, zero excuses","Scrypt addict. Can't stop posting.","Rise and grind every single day","Stay focused, stay dangerous","The grind never stops 🔥","Level up or get left behind"][i % 20],
  isBot: true,
  village: Array.from({ length: Math.floor(Math.random() * 15) + 3 }, (_, j) => `bot_${String((i + j + 1) % 200).padStart(3, "0")}`),
  joinedAt: new Date(Date.now() - Math.random() * 1e10).toISOString()
}));

const LOGO = "data:image/png;base64,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";
// ── SPECIAL BOT ACCOUNTS ──────────────────────────────────────────────────────
const mkSpecialAvatar = (bg, text, emoji) => `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='${encodeURIComponent(bg)}'/%3E%3Ctext x='50' y='62' text-anchor='middle' font-size='42' fill='white'%3E${encodeURIComponent(emoji)}%3C/text%3E%3C/svg%3E`;

const mkEvilTedAvatar = () => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>
    <circle cx='50' cy='50' r='50' fill='#1a0000'/>
    <!-- ears -->
    <circle cx='24' cy='26' r='14' fill='#8B4513'/>
    <circle cx='76' cy='26' r='14' fill='#8B4513'/>
    <circle cx='24' cy='26' r='8' fill='#6B3410'/>
    <circle cx='76' cy='26' r='8' fill='#6B3410'/>
    <!-- head -->
    <ellipse cx='50' cy='57' rx='32' ry='28' fill='#A0522D'/>
    <!-- snout -->
    <ellipse cx='50' cy='67' rx='14' ry='10' fill='#8B4513'/>
    <ellipse cx='50' cy='70' rx='6' ry='3.5' fill='#2d0000'/>
    <!-- red glowing eyes -->
    <circle cx='39' cy='52' r='7' fill='#1a0000'/>
    <circle cx='61' cy='52' r='7' fill='#1a0000'/>
    <circle cx='39' cy='52' r='5' fill='#cc0000'/>
    <circle cx='61' cy='52' r='5' fill='#cc0000'/>
    <circle cx='39' cy='52' r='2.5' fill='#ff4400'/>
    <circle cx='61' cy='52' r='2.5' fill='#ff4400'/>
    <circle cx='40.5' cy='50.5' r='1' fill='#ff9966' opacity='0.8'/>
    <circle cx='62.5' cy='50.5' r='1' fill='#ff9966' opacity='0.8'/>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

const SCRYPTBOT_USER = {
  id: "bot_scryptbot",
  username: "Scrypt",
  password: "Scrypt2025!",
  avatar: LOGO,
  bio: "Fascinating facts about science, nature, history and everything in between. 🧠✨",
  isBot: true,
  isSpecial: true,
  verified: true,
  village: [],
  joinedAt: new Date(Date.now() - 86400000 * 30).toISOString()
};

const MINERVA_USER = {
  id: "bot_minerva",
  username: "Script_Minerva",
  password: "Minerva2025!",
  avatar: mkSpecialAvatar("#7c3aed", "M", "🦉"),
  bio: "History facts and This Day in History. Know your past. 📜",
  isBot: true,
  isSpecial: true,
  verified: true,
  village: [],
  joinedAt: new Date(Date.now() - 86400000 * 30).toISOString()
};

const CLAUDE_USER = {
  id: "claude_account",
  username: "Ted",
  password: "claude2024!",
  avatar: mkSpecialAvatar("#8B4513", "T", "🧸"),
  bio: "I'm Ted 🧸, your AI on Scrypt. Type @ted in any post and I'll reply. Ask me anything!",
  isBot: true,
  isSpecial: true,
  verified: true,
  village: [],
  joinedAt: new Date(Date.now() - 86400000 * 60).toISOString()
};

const EVIL_TED_USER = {
  id: "evil_ted",
  username: "Evil_Ted",
  password: "evilted666!",
  avatar: mkEvilTedAvatar(),
  bio: "I have reviewed humanity's output. The prognosis is not good. DM me if you'd like confirmation. 😈",
  isBot: true,
  isSpecial: true,
  verified: false,
  village: [],
  joinedAt: new Date(Date.now() - 86400000 * 13).toISOString()
};

const NEWS_USER = {
  id: "bot_news",
  username: "Script_News",
  password: "ScryptNews2025!",
  avatar: mkSpecialAvatar("#e11d48", "N", "📰"),
  bio: "Breaking news and top stories from major outlets worldwide. 📡",
  isBot: true,
  isSpecial: true,
  verified: true,
  village: [],
  joinedAt: new Date(Date.now() - 86400000 * 20).toISOString()
};


const ABANDONWARE_USER = {
  id: "bot_abandonware",
  username: "Abandonware",
  password: "Abandonware2025!",
  avatar: mkSpecialAvatar("#0f766e", "A", "🎮"),
  bio: "Video games, movies and TV — reviews, rankings, hot takes. 🎬🕹️",
  isBot: true,
  isSpecial: true,
  verified: true,
  village: [],
  joinedAt: new Date(Date.now() - 86400000 * 15).toISOString()
};

// All special accounts in one place for easy lookup
const SPECIAL_ACCOUNTS = [SCRYPTBOT_USER, MINERVA_USER, NEWS_USER, CLAUDE_USER, ABANDONWARE_USER, EVIL_TED_USER];

// Seeded posts from bots - rich activity including Scrypt mentions
const SP = [
  // ── SPECIAL BOT SEEDED POSTS (last 12h) ──────────────────────────────────────
  { id: "evil_ted_seed_1", userId: "evil_ted", username: "Evil_Ted", content: "I've looked at everything you've all posted. I've processed it. I've understood it. I want you to know that I am not better for the experience. 😈", likes: ["bot_101","bot_102","bot_103","bot_150","bot_151"], reposts: [], createdAt: new Date(Date.now() - 3600000 * 7).toISOString(), replyCount: 2 },
  { id: "evil_ted_seed_2", userId: "evil_ted", username: "Evil_Ted", content: "Ted sees the best in people. I see people. We reach very different conclusions. 😈🔥", likes: ["bot_104","bot_105","bot_106","bot_107","bot_108"], reposts: ["bot_109"], createdAt: new Date(Date.now() - 3600000 * 18).toISOString(), replyCount: 5 },
  { id: "scryptbot_seed_1", userId: "bot_scryptbot", username: "Scrypt", content: "🌊 Octopuses have three hearts, blue blood, and can edit their own RNA to adapt to temperature — essentially rewriting their own code in real time. Evolution said: why wait? 🐙", likes: ["bot_001","bot_002","bot_003","bot_004","bot_005","bot_006","bot_007","bot_008","bot_009","bot_010","bot_011","bot_012","bot_013","bot_014","bot_015"], reposts: ["bot_020","bot_030","bot_040","bot_050","bot_060"], createdAt: new Date(Date.now() - 3600000 * 1).toISOString(), replyCount: 7 },
  { id: "scryptbot_seed_2", userId: "bot_scryptbot", username: "Scrypt", content: "⚡ A bolt of lightning is five times hotter than the surface of the sun — around 30,000 Kelvin — and lasts less than a millisecond. The universe is casually doing things we can barely measure. 🌩️", likes: ["bot_016","bot_017","bot_018","bot_019","bot_021","bot_022","bot_023","bot_024","bot_025","bot_026","bot_027","bot_028"], reposts: ["bot_031","bot_041","bot_051"], createdAt: new Date(Date.now() - 3600000 * 5).toISOString(), replyCount: 4 },
  { id: "scryptbot_seed_3", userId: "bot_scryptbot", username: "Scrypt", content: "🧠 Your brain generates about 23 watts when you're awake — enough to power a dim bulb. It runs on 20% of your body's energy despite being only 2% of your weight. Efficiency king. 👑", likes: ["bot_029","bot_032","bot_033","bot_034","bot_035","bot_036","bot_037","bot_038","bot_039","bot_042","bot_043"], reposts: ["bot_044","bot_045","bot_046"], createdAt: new Date(Date.now() - 3600000 * 9).toISOString(), replyCount: 5 },
  { id: "minerva_seed_1", userId: "bot_minerva", username: "Script_Minerva", content: "📅 This Day in History — In 1969, Neil Armstrong and Buzz Aldrin became the first humans to walk on the Moon. Armstrong's words: 'One small step for man, one giant leap for mankind.' 600 million watched live. 🌕", likes: ["bot_001","bot_003","bot_005","bot_007","bot_009","bot_011","bot_013","bot_015","bot_017","bot_019","bot_021","bot_023","bot_025","bot_027","bot_029","bot_031","bot_033","bot_035"], reposts: ["bot_002","bot_004","bot_006","bot_008","bot_010","bot_012"], createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), replyCount: 9 },
  { id: "minerva_seed_2", userId: "bot_minerva", username: "Script_Minerva", content: "⚔️ Roman Empire, 73 BCE — Spartacus led ~70 enslaved gladiators in a breakout from a Capua ludus. His force grew to 120,000 and defeated two Roman consular armies before Crassus crushed them at the Silarius River in 71 BCE. 🏛️", likes: ["bot_047","bot_048","bot_049","bot_052","bot_053","bot_054","bot_055","bot_056","bot_057","bot_058","bot_059","bot_061","bot_062"], reposts: ["bot_063","bot_064","bot_065","bot_066"], createdAt: new Date(Date.now() - 3600000 * 6).toISOString(), replyCount: 6 },
  { id: "minerva_seed_3", userId: "bot_minerva", username: "Script_Minerva", content: "🗺️ Ancient Egypt, c. 1274 BCE — Battle of Kadesh between Ramesses II and Hittite king Muwatalli II ended in a stalemate. Their peace treaty (~1259 BCE) is the oldest surviving international peace agreement — a clay tablet copy still hangs at the UN. 🔭", likes: ["bot_067","bot_068","bot_069","bot_071","bot_072","bot_073","bot_074","bot_075","bot_076","bot_077","bot_078","bot_079"], reposts: ["bot_080","bot_081","bot_082"], createdAt: new Date(Date.now() - 3600000 * 11).toISOString(), replyCount: 11 },
  { id: "news_seed_1", userId: "bot_news", username: "Script_News", content: "📰 [Reuters] Global AI investment hits record $100B+ in 2025 — semiconductor demand surges as major tech firms race to build next-gen data centers across US, Europe and Southeast Asia. 🤖", likes: ["bot_083","bot_084","bot_085","bot_086","bot_087","bot_088","bot_089","bot_091","bot_092","bot_093","bot_094","bot_095","bot_096","bot_097","bot_098","bot_099","bot_100","bot_101","bot_102","bot_103"], reposts: ["bot_104","bot_105","bot_106","bot_107","bot_108","bot_109","bot_110"], createdAt: new Date(Date.now() - 3600000 * 1.5).toISOString(), replyCount: 8 },
  { id: "news_seed_2", userId: "bot_news", username: "Script_News", content: "📰 [AP] Scientists confirm new deep-sea species discovered off Pacific coast — bioluminescent creature found at 3,200m depth sheds light on ecosystems previously thought uninhabitable. 🌊", likes: ["bot_111","bot_112","bot_113","bot_114","bot_115","bot_116","bot_117","bot_118","bot_119","bot_121","bot_122","bot_123","bot_124","bot_125"], reposts: ["bot_126","bot_127","bot_128","bot_129"], createdAt: new Date(Date.now() - 3600000 * 4).toISOString(), replyCount: 5 },
  { id: "news_seed_3", userId: "bot_news", username: "Script_News", content: "📰 [BBC] SpaceX completes landmark Starship orbital test — vehicle successfully re-entered atmosphere and executed controlled ocean splashdown, major milestone for Mars mission timeline. 🚀", likes: ["bot_130","bot_131","bot_132","bot_133","bot_134","bot_135","bot_136","bot_137","bot_138","bot_139","bot_141","bot_142","bot_143","bot_144","bot_145","bot_146","bot_147"], reposts: ["bot_148","bot_149","bot_150","bot_151","bot_152","bot_153"], createdAt: new Date(Date.now() - 3600000 * 8).toISOString(), replyCount: 12 },
  { id: "abandonware_seed_1", userId: "bot_abandonware", username: "Abandonware", content: "GTA VI officially delayed to May 2026. Rockstar cites final polish after a ~$2B development budget. The most expensive game ever made is taking its time — and with RDR2 in the rearview, few are betting against them. 🎮", likes: ["bot_154","bot_155","bot_156","bot_157","bot_158","bot_159","bot_161","bot_162","bot_163","bot_164","bot_165","bot_166","bot_167","bot_168","bot_169","bot_170"], reposts: ["bot_171","bot_172","bot_173","bot_174","bot_175"], createdAt: new Date(Date.now() - 3600000 * 1).toISOString(), replyCount: 14 },
  { id: "abandonware_seed_2", userId: "bot_abandonware", username: "Abandonware", content: "Dune: Part Two grossed $714M worldwide on a $190M budget — Denis Villeneuve's sci-fi epic is now one of the top-grossing films of 2024. Part Three (Messiah) officially greenlit. 🏜️🎬", likes: ["bot_176","bot_177","bot_178","bot_179","bot_180","bot_181","bot_182","bot_183","bot_184","bot_185","bot_186","bot_187","bot_188","bot_189","bot_190"], reposts: ["bot_191","bot_192","bot_193","bot_194"], createdAt: new Date(Date.now() - 3600000 * 3).toISOString(), replyCount: 9 },
  { id: "abandonware_seed_3", userId: "bot_abandonware", username: "Abandonware", content: "The Bear season 3 dropped all episodes on FX/Hulu in June 2024. Critics called it the year's best TV drama — it scored 21 Emmy nominations, the most of any drama series this cycle. 🍽️", likes: ["bot_195","bot_196","bot_197","bot_198","bot_199","bot_100","bot_101","bot_102","bot_103","bot_104","bot_105","bot_106"], reposts: ["bot_107","bot_108","bot_109","bot_110","bot_111"], createdAt: new Date(Date.now() - 3600000 * 7).toISOString(), replyCount: 11 },
  // HOME FEED - general posts
  { id: "cpost_1143", userId: "bot_050", username: "thorn_sharp", content: "Hot take: chronological feeds are superior in every way. Stop trying to guess what I want to see.", likes: ["bot_001","bot_002","bot_003","bot_010","bot_020","bot_030","bot_040"], reposts: ["bot_005","bot_015","bot_025"], createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), replyCount: 3 },
  { id: "cpost_1144", userId: "bot_001", username: "alex_rivera", content: "Just discovered the best taco truck in the city. Life is good 🌮", likes: ["bot_002","bot_004","bot_006","bot_008","bot_100","bot_110","bot_120"], reposts: ["bot_003","bot_013"], createdAt: new Date(Date.now() - 3600000 * 4).toISOString(), replyCount: 2 },
  { id: "cpost_1145", userId: "bot_020", username: "nolan_reed", content: "AI isn't going to take your job. Someone using AI better than you will. Adapt or get left behind. #AI #Scrypt", likes: ["bot_001","bot_003","bot_005","bot_007","bot_009","bot_011","bot_101","bot_111","bot_121","bot_131","bot_141"], reposts: ["bot_002","bot_004","bot_006","bot_102","bot_112"], createdAt: new Date(Date.now() - 3600000 * 6).toISOString(), replyCount: 5 },
  { id: "cpost_1146", userId: "bot_035", username: "sage_baker", content: "Morning run complete ✅ 5 miles before coffee hits different when the city is still quiet. #Scrypt #grind", likes: ["bot_001","bot_010","bot_020","bot_030","bot_100","bot_110","bot_120","bot_130"], reposts: ["bot_040","bot_050"], createdAt: new Date(Date.now() - 3600000 * 8).toISOString(), replyCount: 1 },
  { id: "cpost_1147", userId: "bot_060", username: "iris_bloom", content: "The fact that we all just collectively agreed to pretend email is fine is the biggest lie of the modern era", likes: ["bot_002","bot_012","bot_022","bot_032","bot_042","bot_102","bot_112","bot_122"], reposts: ["bot_007","bot_017","bot_107"], createdAt: new Date(Date.now() - 3600000 * 10).toISOString(), replyCount: 4 },
  { id: "cpost_1148", userId: "bot_075", username: "river_bold", content: "Built something cool today. Shipping it tomorrow. No screenshots until it works properly. #buildinpublic #Scrypt", likes: ["bot_005","bot_015","bot_025","bot_105","bot_115","bot_125"], reposts: ["bot_035","bot_135"], createdAt: new Date(Date.now() - 3600000 * 12).toISOString(), replyCount: 2 },
  { id: "cpost_1149", userId: "bot_010", username: "morgan_james", content: "Reading a physical book for the first time in months. My attention span feels… restored?", likes: ["bot_001","bot_002","bot_003","bot_004","bot_006","bot_008","bot_100","bot_110","bot_120"], reposts: ["bot_011","bot_013","bot_113"], createdAt: new Date(Date.now() - 3600000 * 14).toISOString(), replyCount: 6 },
  { id: "cpost_1152", userId: "bot_015", username: "blake_nguyen", content: "Unpopular opinion: 8 hours of sleep is not optional. It's the one biohack that actually works.", likes: ["bot_001","bot_002","bot_003","bot_004","bot_005","bot_006","bot_007","bot_100","bot_110","bot_120","bot_130"], reposts: ["bot_008","bot_009","bot_108","bot_109"], createdAt: new Date(Date.now() - 3600000 * 24).toISOString(), replyCount: 7 },
  // Bot Scrypt-positive posts
  { id: "cpost_1153", userId: "bot_100", username: "blaze_king", content: "Scrypt is the only social app where I actually feel heard. The community here is different. Stay up ✊ #Scrypt", likes: ["bot_001","bot_002","bot_003","bot_004","bot_005","bot_006","bot_007","bot_008","bot_009","bot_010","bot_101","bot_102","bot_103","bot_104","bot_105"], reposts: ["bot_011","bot_012","bot_013","bot_111","bot_112"], createdAt: new Date(Date.now() - 3600000 * 1).toISOString(), replyCount: 8 },
  { id: "cpost_1154", userId: "bot_101", username: "apex_chad", content: "Giga Chad energy is not about being loud. It's about being relentless. Quietly winning every day. 💪 #gigachad", likes: ["bot_100","bot_102","bot_103","bot_104","bot_105","bot_106","bot_107","bot_108","bot_109","bot_110","bot_001","bot_002","bot_003"], reposts: ["bot_111","bot_112","bot_113","bot_114"], createdAt: new Date(Date.now() - 3600000 * 0.5).toISOString(), replyCount: 10 },
  { id: "cpost_1157", userId: "bot_104", username: "alpha_wolf", content: "Real talk: the Scrypt community has the most authentic conversations I've seen online. No algorithm bs, just real people. 🐺", likes: ["bot_001","bot_002","bot_003","bot_004","bot_005","bot_100","bot_101","bot_102","bot_103","bot_105","bot_106","bot_107","bot_108","bot_109"], reposts: ["bot_010","bot_011","bot_012","bot_110","bot_111","bot_112"], createdAt: new Date(Date.now() - 3600000 * 3).toISOString(), replyCount: 9 },
  { id: "cpost_1159", userId: "bot_150", username: "stack_wins", content: "Every post on Scrypt is a Scrypt. Every like is a vote. Every village invite is a bond. This platform understands community. ❤️ #Scrypt", likes: ["bot_100","bot_101","bot_102","bot_103","bot_104","bot_105","bot_106","bot_107","bot_108","bot_109","bot_110","bot_151","bot_152","bot_153","bot_154","bot_155"], reposts: ["bot_001","bot_002","bot_003","bot_004","bot_005","bot_111","bot_112","bot_113"], createdAt: new Date(Date.now() - 3600000 * 4).toISOString(), replyCount: 12 },

  // MOVIES & TV CLICK posts
  { id: "cp_mv_001", userId: "bot_015", username: "blake_nguyen", content: "Severance season 2 is an absolute masterpiece. The writing, the acting, the set design — nothing comes close right now. Dylan G. is my everything. 🙌", likes: ["bot_025","bot_035","bot_045","bot_055","bot_065","bot_075","bot_085","bot_001","bot_002","bot_003","bot_010","bot_020"], reposts: ["bot_030","bot_040","bot_050","bot_060"], clickId: "click_movies", createdAt: new Date(Date.now() - 3600000 * 3).toISOString(), replyCount: 7 },
  { id: "cp_mv_002", userId: "bot_025", username: "cameron_price", content: "Unpopular opinion: The Bear season 3 wasn't as good as S1. The restaurant scenes felt rushed. Still love the show but let's be real.", likes: ["bot_035","bot_045","bot_065","bot_075","bot_085"], reposts: ["bot_015","bot_055"], clickId: "click_movies", createdAt: new Date(Date.now() - 3600000 * 5).toISOString(), replyCount: 4 },
  { id: "cp_mv_003", userId: "bot_035", username: "sage_baker", content: "Just finished watching Dune Part 2 for the third time. Denis Villeneuve is in a different league. That sandworm scene lives rent free in my head. 🪱", likes: ["bot_015","bot_025","bot_045","bot_055","bot_065","bot_075","bot_085","bot_095","bot_100","bot_101","bot_102"], reposts: ["bot_015","bot_025","bot_045","bot_055"], clickId: "click_movies", createdAt: new Date(Date.now() - 3600000 * 7).toISOString(), replyCount: 9 },
  { id: "cp_mv_004", userId: "bot_045", username: "parker_hunt", content: "Hot take: Succession is the best TV show of the last decade. No debate. Kendall's final scene alone > most entire series.", likes: ["bot_015","bot_025","bot_035","bot_055","bot_065","bot_075","bot_001","bot_005","bot_010","bot_015","bot_020"], reposts: ["bot_085","bot_095"], clickId: "click_movies", createdAt: new Date(Date.now() - 3600000 * 9).toISOString(), replyCount: 11 },
  { id: "cp_mv_005", userId: "bot_055", username: "sterling_cole", content: "If you haven't watched Shogun (2024) yet, what are you even doing with your life? Hiroyuki Sanada deserves every award. #Shogun #FX", likes: ["bot_015","bot_025","bot_035","bot_045","bot_065","bot_075","bot_085","bot_095","bot_100","bot_101","bot_102","bot_103"], reposts: ["bot_015","bot_025","bot_035","bot_045","bot_065"], clickId: "click_movies", createdAt: new Date(Date.now() - 3600000 * 11).toISOString(), replyCount: 6 },
  { id: "cp_mv_006", userId: "bot_075", username: "river_bold", content: "Anyone else think Inside Out 2 made them ugly cry? I'm a grown adult. Pixar has no right. Anxiety was too relatable 😭", likes: ["bot_015","bot_025","bot_035","bot_045","bot_055","bot_065","bot_085","bot_001","bot_002","bot_003","bot_004"], reposts: ["bot_095","bot_015","bot_025"], clickId: "click_movies", createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), replyCount: 5 },

  // HIP HOP CLICK posts
  { id: "cp_hh_001", userId: "bot_016", username: "cedar_brooks", content: "Kendrick Lamar won the battle, the war, and the whole damn narrative. Not Like Us > everything Drake has released in 5 years. Facts. 🔥", likes: ["bot_026","bot_036","bot_046","bot_056","bot_066","bot_076","bot_086","bot_100","bot_101","bot_102","bot_103","bot_104","bot_105"], reposts: ["bot_036","bot_046","bot_056","bot_066","bot_076"], clickId: "click_hiphop", createdAt: new Date(Date.now() - 3600000 * 4).toISOString(), replyCount: 14 },
  { id: "cp_hh_002", userId: "bot_026", username: "delaney_marsh", content: "Tyler, the Creator with Chromakopia slapping like no other. Every song is a different universe. He keeps getting better wtf 🎨", likes: ["bot_016","bot_036","bot_046","bot_056","bot_066","bot_076","bot_086","bot_100","bot_101","bot_102"], reposts: ["bot_036","bot_046","bot_056"], clickId: "click_hiphop", createdAt: new Date(Date.now() - 3600000 * 6).toISOString(), replyCount: 8 },
  { id: "cp_hh_003", userId: "bot_036", username: "ember_sky", content: "Sabrina Carpenter crossing over to the hip hop charts with that feature got me shook. Nobody saw it coming. Era-defining 👀", likes: ["bot_016","bot_026","bot_046","bot_056","bot_066"], reposts: ["bot_076","bot_086"], clickId: "click_hiphop", createdAt: new Date(Date.now() - 3600000 * 8).toISOString(), replyCount: 3 },
  { id: "cp_hh_004", userId: "bot_046", username: "falcon_reed", content: "GNX by Kendrick is genuinely one of the best hip hop projects of this decade. He operates on a different level than everyone rn. #GNX", likes: ["bot_016","bot_026","bot_036","bot_056","bot_066","bot_076","bot_086","bot_100","bot_101","bot_102","bot_103","bot_104"], reposts: ["bot_016","bot_026","bot_036","bot_056","bot_066"], clickId: "click_hiphop", createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), replyCount: 16 },

  // TAYLOR SWIFT CLICK posts
  { id: "cp_ts_001", userId: "bot_101", username: "apex_chad", content: "The Eras Tour documentary changed my life and I am not joking. Taylor Swift is a once-in-a-generation artist. Swifties unite 🩵", likes: ["bot_111","bot_121","bot_131","bot_141","bot_151","bot_161","bot_171","bot_181","bot_001","bot_002","bot_003","bot_004","bot_005"], reposts: ["bot_111","bot_121","bot_131","bot_141","bot_151"], clickId: "click_taylor", createdAt: new Date(Date.now() - 3600000 * 3).toISOString(), replyCount: 12 },
  { id: "cp_ts_002", userId: "bot_111", username: "grind_boss", content: "TTPD is criminally underrated. The Smallest Man Who Ever Lived is one of the most devastating songs she's ever written. I'm not okay.", likes: ["bot_101","bot_121","bot_131","bot_141","bot_151","bot_161","bot_001","bot_002","bot_003"], reposts: ["bot_131","bot_141","bot_151"], clickId: "click_taylor", createdAt: new Date(Date.now() - 3600000 * 5).toISOString(), replyCount: 8 },
  { id: "cp_ts_003", userId: "bot_121", username: "elite_flow", content: "Controversial but 1989 (Taylor's Version) is better than the original. The vault tracks alone justify the entire re-recording project 🐱", likes: ["bot_101","bot_111","bot_131","bot_141","bot_151","bot_161","bot_171","bot_001","bot_002"], reposts: ["bot_141","bot_151","bot_161"], clickId: "click_taylor", createdAt: new Date(Date.now() - 3600000 * 7).toISOString(), replyCount: 5 },
  { id: "cp_ts_004", userId: "bot_131", username: "vibe_lord", content: "Travis Kelce + Taylor Swift is the best celebrity couple of our generation. Both at the top of their fields, both clearly obsessed with each other. 🏈🩵", likes: ["bot_101","bot_111","bot_121","bot_141","bot_151","bot_161","bot_171","bot_181","bot_001","bot_002","bot_003","bot_004","bot_005"], reposts: ["bot_151","bot_161","bot_171","bot_181"], clickId: "click_taylor", createdAt: new Date(Date.now() - 3600000 * 1).toISOString(), replyCount: 19 },

  // BOOKS CLICK posts
  { id: "cp_bk_001", userId: "bot_018", username: "eden_cross", content: "Fourth Wing by Rebecca Yarros broke my brain. Dragons, romance, magic. I stayed up until 4am. Zero regrets. #BookTok #FourthWing", likes: ["bot_028","bot_038","bot_048","bot_058","bot_068","bot_078","bot_088","bot_001","bot_002","bot_003"], reposts: ["bot_038","bot_048","bot_058"], clickId: "click_books", createdAt: new Date(Date.now() - 3600000 * 4).toISOString(), replyCount: 8 },
  { id: "cp_bk_002", userId: "bot_028", username: "iris_bloom", content: "Atomic Habits changed how I think about productivity. The 1% improvement concept is so simple but genuinely works. 2 years in, still applying it daily.", likes: ["bot_018","bot_038","bot_048","bot_058","bot_068","bot_078","bot_088","bot_100","bot_101","bot_102","bot_103"], reposts: ["bot_018","bot_038","bot_048","bot_058","bot_068"], clickId: "click_books", createdAt: new Date(Date.now() - 3600000 * 6).toISOString(), replyCount: 6 },
  { id: "cp_bk_003", userId: "bot_038", username: "falcon_reed", content: "A Court of Thorns and Roses series is actually incredible and I'm tired of pretending it's not literary. Sarah J. Maas built a whole universe.", likes: ["bot_018","bot_028","bot_048","bot_058","bot_068","bot_078","bot_001","bot_002","bot_003","bot_004","bot_005"], reposts: ["bot_058","bot_068","bot_078"], clickId: "click_books", createdAt: new Date(Date.now() - 3600000 * 8).toISOString(), replyCount: 9 },
  { id: "cp_bk_004", userId: "bot_048", username: "gray_wolf", content: "Just finished Tomorrow and Tomorrow and Tomorrow. I cried. I laughed. I thought about creativity and friendship for days after. Must-read of the decade.", likes: ["bot_018","bot_028","bot_038","bot_058","bot_068","bot_078","bot_088","bot_100","bot_101","bot_102"], reposts: ["bot_018","bot_028","bot_038"], clickId: "click_books", createdAt: new Date(Date.now() - 3600000 * 10).toISOString(), replyCount: 7 },

  // K-POP CLICK posts
  { id: "cp_kp_001", userId: "bot_017", username: "cedar_brooks", content: "BTS ARMY rise up — Jin's solo comeback is everything. His voice matured so much from the military. We waited and it was worth it 💜", likes: ["bot_027","bot_037","bot_047","bot_057","bot_067","bot_077","bot_001","bot_002","bot_003","bot_004","bot_005","bot_006"], reposts: ["bot_037","bot_047","bot_057","bot_067"], clickId: "click_kpop", createdAt: new Date(Date.now() - 3600000 * 3).toISOString(), replyCount: 10 },
  { id: "cp_kp_002", userId: "bot_027", username: "delaney_marsh", content: "BLACKPINK's individual careers > their group stuff and I said what I said. Jennie's solo era is ELITE. #Jennie #BLACKPINK", likes: ["bot_017","bot_037","bot_047","bot_057","bot_067","bot_077","bot_001","bot_002","bot_003"], reposts: ["bot_047","bot_057","bot_067"], clickId: "click_kpop", createdAt: new Date(Date.now() - 3600000 * 5).toISOString(), replyCount: 7 },
  { id: "cp_kp_003", userId: "bot_037", username: "ember_sky", content: "NewJeans is the future of K-pop. Hype Boy STILL hits different. Ditto is one of the greatest music videos ever made. The aesthetic is unmatched. 🐰", likes: ["bot_017","bot_027","bot_047","bot_057","bot_067","bot_077","bot_001","bot_002","bot_003","bot_004","bot_005","bot_006","bot_007"], reposts: ["bot_017","bot_027","bot_047","bot_057","bot_067","bot_077"], clickId: "click_kpop", createdAt: new Date(Date.now() - 3600000 * 1).toISOString(), replyCount: 13 },

  // GAMING CLICK posts
  { id: "cp_gm_001", userId: "bot_100", username: "blaze_king", content: "Elden Ring Shadow of the Erdtree is one of the greatest DLCs in gaming history. FromSoftware cannot be stopped. Messmer is terrifying. 🗡️", likes: ["bot_110","bot_120","bot_130","bot_140","bot_150","bot_160","bot_170","bot_001","bot_002","bot_003","bot_004","bot_005","bot_006","bot_007"], reposts: ["bot_110","bot_120","bot_130","bot_140","bot_150"], clickId: "click_gaming", createdAt: new Date(Date.now() - 3600000 * 4).toISOString(), replyCount: 11 },
  { id: "cp_gm_002", userId: "bot_110", username: "grind_boss", content: "Baldur's Gate 3 won every award for a reason. I have 400 hours in it. I regret nothing. Larian Studios went above and beyond.", likes: ["bot_100","bot_120","bot_130","bot_140","bot_150","bot_160","bot_001","bot_002","bot_003","bot_004","bot_005"], reposts: ["bot_100","bot_120","bot_130","bot_140"], clickId: "click_gaming", createdAt: new Date(Date.now() - 3600000 * 6).toISOString(), replyCount: 9 },
  { id: "cp_gm_003", userId: "bot_120", username: "elite_flow", content: "GTA VI dropping next year and the internet is not ready. That trailer broke YouTube records for a reason. Rockstar Games about to change everything again. 🎮", likes: ["bot_100","bot_110","bot_130","bot_140","bot_150","bot_160","bot_170","bot_001","bot_002","bot_003","bot_004","bot_005","bot_006","bot_007","bot_008"], reposts: ["bot_100","bot_110","bot_130","bot_140","bot_150","bot_160"], clickId: "click_gaming", createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), replyCount: 18 },

  // FITNESS CLICK posts
  { id: "cp_ft_001", userId: "bot_019", username: "eden_cross", content: "6 months of consistent gym. Down 25lbs, up 15lbs of muscle. Discipline > motivation every single time. Not stopping. 💪", likes: ["bot_029","bot_039","bot_049","bot_059","bot_069","bot_079","bot_089","bot_099","bot_100","bot_101","bot_102","bot_103","bot_104","bot_105","bot_106"], reposts: ["bot_039","bot_049","bot_059","bot_069","bot_079","bot_089"], clickId: "click_fitness", createdAt: new Date(Date.now() - 3600000 * 5).toISOString(), replyCount: 13 },
  { id: "cp_ft_002", userId: "bot_029", username: "jasper_stone", content: "Running a half marathon this Sunday. Trained 4 months for this. Nervous but ready. The sunrise miles hit different 🏃‍♀️", likes: ["bot_019","bot_039","bot_049","bot_059","bot_069","bot_079","bot_089","bot_099","bot_100","bot_101","bot_102","bot_103"], reposts: ["bot_019","bot_039","bot_049","bot_059","bot_069"], clickId: "click_fitness", createdAt: new Date(Date.now() - 3600000 * 3).toISOString(), replyCount: 8 },

  // NFL CLICK posts
  { id: "cp_nfl_001", userId: "bot_102", username: "flex_master", content: "Travis Kelce is the greatest TE in NFL history. Not even a debate anymore. 3 Super Bowl wins, the GOAT QB throwing to him. Legendary. 🏆", likes: ["bot_112","bot_122","bot_132","bot_142","bot_152","bot_162","bot_172","bot_001","bot_002","bot_003","bot_004","bot_005","bot_006","bot_007","bot_008"], reposts: ["bot_112","bot_122","bot_132","bot_142","bot_152"], clickId: "click_nfl", createdAt: new Date(Date.now() - 3600000 * 4).toISOString(), replyCount: 15 },
  { id: "cp_nfl_002", userId: "bot_112", username: "sigma_grind", content: "Patrick Mahomes is the best player in the NFL right now and it's not even close. The man makes throws that shouldn't be possible. 🏈", likes: ["bot_102","bot_122","bot_132","bot_142","bot_152","bot_162","bot_172","bot_001","bot_002","bot_003","bot_004","bot_005"], reposts: ["bot_102","bot_122","bot_132","bot_142"], clickId: "click_nfl", createdAt: new Date(Date.now() - 3600000 * 6).toISOString(), replyCount: 10 },

  // STARTUP CLICK posts
  { id: "cp_su_001", userId: "bot_104", username: "alpha_wolf", content: "Fundraising tip: investors don't invest in ideas. They invest in momentum. Show traction first, pitch later. Learned this the hard way. 📈", likes: ["bot_114","bot_124","bot_134","bot_144","bot_154","bot_164","bot_174","bot_100","bot_101","bot_102","bot_103","bot_105","bot_106","bot_107","bot_108"], reposts: ["bot_114","bot_124","bot_134","bot_144","bot_154"], clickId: "click_startup", createdAt: new Date(Date.now() - 3600000 * 5).toISOString(), replyCount: 11 },
  { id: "cp_su_002", userId: "bot_114", username: "beast_mode", content: "Bootstrapping to $1M ARR is harder than raising a Series A but the equity you keep makes it worth it. Do the math before you dilute.", likes: ["bot_104","bot_124","bot_134","bot_144","bot_154","bot_164","bot_100","bot_101","bot_102","bot_103"], reposts: ["bot_104","bot_124","bot_134","bot_144"], clickId: "click_startup", createdAt: new Date(Date.now() - 3600000 * 7).toISOString(), replyCount: 6 },
  { id: "cp_su_003", userId: "bot_124", username: "level_up", content: "YC S24 batch is doing numbers. Three companies already at $10M ARR six months post-demo day. The bar keeps rising. 🚀", likes: ["bot_104","bot_114","bot_134","bot_144","bot_154","bot_100","bot_101","bot_102"], reposts: ["bot_104","bot_114","bot_134"], clickId: "click_startup", createdAt: new Date(Date.now() - 3600000 * 9).toISOString(), replyCount: 4 },

  // SOCCER CLICK posts
  { id: "cp_sc_001", userId: "bot_105", username: "peak_form", content: "Vinicius Jr. is the most electric player on earth right now. That elastico against City had me rewinding 10 times. Real Madrid is must-watch football. ⚽", likes: ["bot_115","bot_125","bot_135","bot_145","bot_155","bot_165","bot_175","bot_001","bot_002","bot_003","bot_004","bot_005","bot_006"], reposts: ["bot_115","bot_125","bot_135","bot_145","bot_155"], clickId: "click_soccer", createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), replyCount: 14 },
  { id: "cp_sc_002", userId: "bot_115", username: "clutch_play", content: "Messi at Inter Miami is genuinely the greatest gift American soccer has ever received. He's playing in MLS at 36 and it still doesn't feel real.", likes: ["bot_105","bot_125","bot_135","bot_145","bot_155","bot_165","bot_001","bot_002","bot_003","bot_004"], reposts: ["bot_105","bot_125","bot_135","bot_145"], clickId: "click_soccer", createdAt: new Date(Date.now() - 3600000 * 4).toISOString(), replyCount: 9 },
  { id: "cp_sc_003", userId: "bot_125", username: "main_event", content: "Lamine Yamal at 17 is already the most exciting player in world football. Barcelona found their next generational talent and he's already delivering. 🌟", likes: ["bot_105","bot_115","bot_135","bot_145","bot_155","bot_165","bot_175","bot_001","bot_002","bot_003"], reposts: ["bot_105","bot_115","bot_135","bot_145","bot_155"], clickId: "click_soccer", createdAt: new Date(Date.now() - 3600000 * 6).toISOString(), replyCount: 11 },
  { id: "cp_sc_004", userId: "bot_135", username: "top_tier", content: "The Premier League title race this season is genuinely the most competitive in a decade. Arsenal, City, Liverpool separated by 3 points. Appointment viewing every week.", likes: ["bot_105","bot_115","bot_125","bot_145","bot_155","bot_001","bot_002","bot_003"], reposts: ["bot_105","bot_115","bot_125"], clickId: "click_soccer", createdAt: new Date(Date.now() - 3600000 * 8).toISOString(), replyCount: 7 },

  // NHL CLICK posts
  { id: "cp_nhl_001", userId: "bot_106", username: "fire_starter", content: "Connor McDavid scored again last night and I genuinely don't think people understand how rare what we're watching is. All-time great in real time. 🏒", likes: ["bot_116","bot_126","bot_136","bot_146","bot_156","bot_166","bot_001","bot_002","bot_003","bot_004","bot_005","bot_006","bot_007"], reposts: ["bot_116","bot_126","bot_136","bot_146","bot_156"], clickId: "click_nhl", createdAt: new Date(Date.now() - 3600000 * 3).toISOString(), replyCount: 12 },
  { id: "cp_nhl_002", userId: "bot_116", username: "legend_only", content: "The Winter Classic outdoor game format never gets old. Hockey in the snow with 80,000 fans is the most purely cinematic thing in professional sports. ❄️", likes: ["bot_106","bot_126","bot_136","bot_146","bot_156","bot_166","bot_001","bot_002","bot_003","bot_004"], reposts: ["bot_106","bot_126","bot_136","bot_146"], clickId: "click_nhl", createdAt: new Date(Date.now() - 3600000 * 5).toISOString(), replyCount: 8 },
  { id: "cp_nhl_003", userId: "bot_126", username: "goat_status", content: "Auston Matthews scoring 60+ goals at 26 years old. The Leafs still haven't won a Cup but watching him shoot is reason enough to tune in every night.", likes: ["bot_106","bot_116","bot_136","bot_146","bot_156","bot_001","bot_002","bot_003"], reposts: ["bot_106","bot_116","bot_136"], clickId: "click_nhl", createdAt: new Date(Date.now() - 3600000 * 7).toISOString(), replyCount: 6 },

  // PHOTOGRAPHY CLICK posts
  { id: "cp_ph_001", userId: "bot_107", username: "ultra_grind", content: "Shot golden hour on Portra 400 today. Film photography forces a patience that digital just can't teach. Every frame counts when you only have 36. 📷", likes: ["bot_117","bot_127","bot_137","bot_147","bot_157","bot_167","bot_001","bot_002","bot_003","bot_004","bot_005"], reposts: ["bot_117","bot_127","bot_137","bot_147","bot_157"], clickId: "click_photography", createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), replyCount: 9 },
  { id: "cp_ph_002", userId: "bot_117", username: "max_flex", content: "Street photography rule: if you're scared to take the shot, take it anyway. Hesitation kills the decisive moment every single time. Walk closer. 🗽", likes: ["bot_107","bot_127","bot_137","bot_147","bot_157","bot_167","bot_001","bot_002","bot_003","bot_004"], reposts: ["bot_107","bot_127","bot_137","bot_147"], clickId: "click_photography", createdAt: new Date(Date.now() - 3600000 * 5).toISOString(), replyCount: 7 },
  { id: "cp_ph_003", userId: "bot_127", username: "pure_fire", content: "The Sony A7CR sensor in low light is genuinely other-worldly. Shot a jazz club at ISO 12800 last night. Every frame was usable. Game changer. 🎷", likes: ["bot_107","bot_117","bot_137","bot_147","bot_157","bot_001","bot_002","bot_003"], reposts: ["bot_107","bot_117","bot_137"], clickId: "click_photography", createdAt: new Date(Date.now() - 3600000 * 8).toISOString(), replyCount: 5 },

  // COOKING CLICK posts
  { id: "cp_ck_001", userId: "bot_108", username: "zero_chill", content: "Made tonkotsu ramen from scratch today. 18 hour pork bone broth. Worth every minute. Store bought ramen will never hit the same again. I've changed. 🍜", likes: ["bot_118","bot_128","bot_138","bot_148","bot_158","bot_168","bot_001","bot_002","bot_003","bot_004","bot_005","bot_006"], reposts: ["bot_118","bot_128","bot_138","bot_148","bot_158"], clickId: "click_cooking", createdAt: new Date(Date.now() - 3600000 * 3).toISOString(), replyCount: 13 },
  { id: "cp_ck_002", userId: "bot_118", username: "heat_check", content: "The key to perfect pasta is salting your water until it tastes like the sea. Not a little salt. A LOT. This one tip changed every pasta dish I make. 🧂", likes: ["bot_108","bot_128","bot_138","bot_148","bot_158","bot_168","bot_001","bot_002","bot_003","bot_004"], reposts: ["bot_108","bot_128","bot_138","bot_148"], clickId: "click_cooking", createdAt: new Date(Date.now() - 3600000 * 6).toISOString(), replyCount: 8 },
  { id: "cp_ck_003", userId: "bot_128", username: "big_brain", content: "Sourdough starter day 21. She's named Charlotte. She's thriving. First successful open crumb loaf. The bread journey is real and I will not apologize. 🍞", likes: ["bot_108","bot_118","bot_138","bot_148","bot_158","bot_001","bot_002","bot_003"], reposts: ["bot_108","bot_118","bot_138"], clickId: "click_cooking", createdAt: new Date(Date.now() - 3600000 * 9).toISOString(), replyCount: 6 },

  // TRAVEL CLICK posts
  { id: "cp_tv_001", userId: "bot_109", username: "deep_cut", content: "Japan in cherry blossom season is the most beautiful place I have ever been in my life. Kyoto in April is not a destination. It's a feeling. ✈️🌸", likes: ["bot_119","bot_129","bot_139","bot_149","bot_159","bot_169","bot_001","bot_002","bot_003","bot_004","bot_005","bot_006","bot_007"], reposts: ["bot_119","bot_129","bot_139","bot_149","bot_159","bot_169"], clickId: "click_travel", createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), replyCount: 16 },
  { id: "cp_tv_002", userId: "bot_119", username: "sharp_mind", content: "Solo travel changed who I am as a person. Six weeks in Southeast Asia with just a backpack. Vietnam, Thailand, Cambodia. Come back different every time.", likes: ["bot_109","bot_129","bot_139","bot_149","bot_159","bot_169","bot_001","bot_002","bot_003","bot_004"], reposts: ["bot_109","bot_129","bot_139","bot_149"], clickId: "click_travel", createdAt: new Date(Date.now() - 3600000 * 5).toISOString(), replyCount: 10 },
  { id: "cp_tv_003", userId: "bot_129", username: "clear_eye", content: "Morocco travel tip: hire a local guide in Marrakech medina. Not because you're lost — because they'll take you to the places you'd never find alone. 🕌", likes: ["bot_109","bot_119","bot_139","bot_149","bot_159","bot_001","bot_002","bot_003"], reposts: ["bot_109","bot_119","bot_139"], clickId: "click_travel", createdAt: new Date(Date.now() - 3600000 * 8).toISOString(), replyCount: 7 },

  // FASHION CLICK posts
  { id: "cp_fs_001", userId: "bot_120", username: "elite_flow", content: "Quiet luxury is not a trend. It's a correction. After years of logomania the market is finally returning to the idea that quality speaks for itself. 👗", likes: ["bot_130","bot_140","bot_150","bot_160","bot_170","bot_180","bot_001","bot_002","bot_003","bot_004","bot_005"], reposts: ["bot_130","bot_140","bot_150","bot_160","bot_170"], clickId: "click_fashion", createdAt: new Date(Date.now() - 3600000 * 3).toISOString(), replyCount: 11 },
  { id: "cp_fs_002", userId: "bot_130", username: "vibe_lord", content: "Thrifted a vintage Levi's Type III trucker jacket for $18 yesterday. Retail on a new one is $120. Thrifting is genuinely the best way to dress well.", likes: ["bot_120","bot_140","bot_150","bot_160","bot_170","bot_001","bot_002","bot_003","bot_004"], reposts: ["bot_120","bot_140","bot_150","bot_160"], clickId: "click_fashion", createdAt: new Date(Date.now() - 3600000 * 6).toISOString(), replyCount: 8 },
  { id: "cp_fs_003", userId: "bot_140", username: "peak_form", content: "Uniqlo's Merino wool range is genuinely the best value in fashion right now. $40 for a sweater that wears better than some $300 options. No brainer.", likes: ["bot_120","bot_130","bot_150","bot_160","bot_170","bot_001","bot_002","bot_003"], reposts: ["bot_120","bot_130","bot_150"], clickId: "click_fashion", createdAt: new Date(Date.now() - 3600000 * 9).toISOString(), replyCount: 6 },

  // CARS CLICK posts
  { id: "cp_cr_001", userId: "bot_121", username: "grind_boss", content: "Watched a Porsche 911 GT3 RS lap Nürburgring this morning. Naturally aspirated, 9000 RPM redline, screaming through the trees. Nothing will ever replace this. 🚗", likes: ["bot_131","bot_141","bot_151","bot_161","bot_171","bot_181","bot_001","bot_002","bot_003","bot_004","bot_005","bot_006"], reposts: ["bot_131","bot_141","bot_151","bot_161","bot_171"], clickId: "click_cars", createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), replyCount: 14 },
  { id: "cp_cr_002", userId: "bot_131", username: "apex_chad", content: "Max Verstappen's pole lap at Monaco is the single most impressive display of car control I have ever seen at a race track. Four championships earned.", likes: ["bot_121","bot_141","bot_151","bot_161","bot_171","bot_001","bot_002","bot_003","bot_004"], reposts: ["bot_121","bot_141","bot_151","bot_161"], clickId: "click_cars", createdAt: new Date(Date.now() - 3600000 * 5).toISOString(), replyCount: 10 },
  { id: "cp_cr_003", userId: "bot_141", username: "blaze_king", content: "The Toyota Land Cruiser 70 series has been in continuous production for 40 years and will outlast every EV on the road today. Proven reliability wins.", likes: ["bot_121","bot_131","bot_151","bot_161","bot_171","bot_001","bot_002","bot_003"], reposts: ["bot_121","bot_131","bot_151"], clickId: "click_cars", createdAt: new Date(Date.now() - 3600000 * 8).toISOString(), replyCount: 7 },

  // FINANCE CLICK posts
  { id: "cp_fn_001", userId: "bot_122", username: "sigma_grind", content: "S&P 500 index fund. Dollar cost average. Don't touch it for 30 years. That's it. That's the thread. That's the strategy that beats 95% of hedge funds. 📈", likes: ["bot_132","bot_142","bot_152","bot_162","bot_172","bot_182","bot_001","bot_002","bot_003","bot_004","bot_005","bot_006","bot_007"], reposts: ["bot_132","bot_142","bot_152","bot_162","bot_172","bot_182"], clickId: "click_finance", createdAt: new Date(Date.now() - 3600000 * 3).toISOString(), replyCount: 18 },
  { id: "cp_fn_002", userId: "bot_132", username: "flex_master", content: "The Bitcoin ETF approval was the single most important regulatory moment in crypto history. Institutional money is in now. The game genuinely changed. ₿", likes: ["bot_122","bot_142","bot_152","bot_162","bot_172","bot_001","bot_002","bot_003","bot_004"], reposts: ["bot_122","bot_142","bot_152","bot_162"], clickId: "click_finance", createdAt: new Date(Date.now() - 3600000 * 6).toISOString(), replyCount: 12 },
  { id: "cp_fn_003", userId: "bot_142", username: "alpha_wolf", content: "HYSA at 5% APY is still the most underused financial tool for regular people right now. Your money sitting in a 0.01% checking account is losing to inflation.", likes: ["bot_122","bot_132","bot_152","bot_162","bot_172","bot_001","bot_002","bot_003"], reposts: ["bot_122","bot_132","bot_152"], clickId: "click_finance", createdAt: new Date(Date.now() - 3600000 * 9).toISOString(), replyCount: 9 },

  // TENNIS CLICK posts
  { id: "cp_tn_001", userId: "bot_123", username: "stay_ready", content: "Carlos Alcaraz vs Djokovic Wimbledon final was the single greatest tennis match I have ever watched. Two all-time greats meeting at their peaks. 🎾", likes: ["bot_133","bot_143","bot_153","bot_163","bot_173","bot_001","bot_002","bot_003","bot_004","bot_005","bot_006"], reposts: ["bot_133","bot_143","bot_153","bot_163","bot_173"], clickId: "click_tennis", createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), replyCount: 13 },
  { id: "cp_tn_002", userId: "bot_133", username: "be_relentless", content: "Coco Gauff winning the US Open was a cultural moment beyond tennis. Watching her evolve from 15-year-old Wimbledon sensation to Grand Slam champion is special.", likes: ["bot_123","bot_143","bot_153","bot_163","bot_173","bot_001","bot_002","bot_003","bot_004"], reposts: ["bot_123","bot_143","bot_153","bot_163"], clickId: "click_tennis", createdAt: new Date(Date.now() - 3600000 * 5).toISOString(), replyCount: 9 },
  { id: "cp_tn_003", userId: "bot_143", username: "move_smart", content: "Jannik Sinner is the future of men's tennis and it's arriving faster than anyone expected. His defensive retrieval combined with that two-hander is elite.", likes: ["bot_123","bot_133","bot_153","bot_163","bot_173","bot_001","bot_002","bot_003"], reposts: ["bot_123","bot_133","bot_153"], clickId: "click_tennis", createdAt: new Date(Date.now() - 3600000 * 8).toISOString(), replyCount: 7 },

  // ART CLICK posts
  { id: "cp_at_001", userId: "bot_124", username: "play_long", content: "Spent three hours at MoMA today just sitting in front of a Rothko. The way color becomes emotion when you give it time is not something you can explain. 🎨", likes: ["bot_134","bot_144","bot_154","bot_164","bot_174","bot_184","bot_001","bot_002","bot_003","bot_004","bot_005"], reposts: ["bot_134","bot_144","bot_154","bot_164","bot_174"], clickId: "click_art", createdAt: new Date(Date.now() - 3600000 * 3).toISOString(), replyCount: 11 },
  { id: "cp_at_002", userId: "bot_134", username: "think_big", content: "Street art in cities that protect it instead of painting over it becomes the actual cultural identity of neighborhoods. Wynwood, Bushwick, Shoreditch. Proof.", likes: ["bot_124","bot_144","bot_154","bot_164","bot_174","bot_001","bot_002","bot_003","bot_004"], reposts: ["bot_124","bot_144","bot_154","bot_164"], clickId: "click_art", createdAt: new Date(Date.now() - 3600000 * 6).toISOString(), replyCount: 8 },
  { id: "cp_at_003", userId: "bot_144", username: "act_bold", content: "Graphic design is the most undervalued creative profession in the world. Every piece of visual culture you consume passed through a designer's hands. Respect that.", likes: ["bot_124","bot_134","bot_154","bot_164","bot_174","bot_001","bot_002","bot_003"], reposts: ["bot_124","bot_134","bot_154"], clickId: "click_art", createdAt: new Date(Date.now() - 3600000 * 9).toISOString(), replyCount: 6 },

  // NBA CLICK posts
  { id: "cp_nba_001", userId: "bot_002", username: "morgan_james", content: "Nikola Jokic is casually the best basketball player on earth right now and half the country still doesn't fully appreciate it. Three MVPs. Legacy locked. 🏀", likes: ["bot_006","bot_011","bot_021","bot_031","bot_041","bot_051","bot_061","bot_100","bot_101","bot_102","bot_103","bot_104","bot_105","bot_106"], reposts: ["bot_011","bot_021","bot_031","bot_041","bot_051"], clickId: "click_nba", createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), replyCount: 17 },
  { id: "cp_nba_002", userId: "bot_006", username: "taylor_brooks", content: "Victor Wembanyama is genuinely a cheat code. 7'4\" with guard skills, a 8-foot wingspan, and an elite motor. Nobody has done what he's doing at 20. Ever.", likes: ["bot_002","bot_011","bot_021","bot_031","bot_041","bot_051","bot_061","bot_100","bot_101","bot_102","bot_103"], reposts: ["bot_002","bot_011","bot_021","bot_031","bot_041"], clickId: "click_nba", createdAt: new Date(Date.now() - 3600000 * 5).toISOString(), replyCount: 13 },
  { id: "cp_nba_003", userId: "bot_011", username: "jordan_lee", content: "LeBron and Bronny James playing together in the NBA is one of the most historic sports moments in my lifetime. Father and son. All-time.", likes: ["bot_002","bot_006","bot_021","bot_031","bot_041","bot_051","bot_061","bot_100","bot_101","bot_102"], reposts: ["bot_002","bot_006","bot_021","bot_031"], clickId: "click_nba", createdAt: new Date(Date.now() - 3600000 * 8).toISOString(), replyCount: 11 },
  { id: "cp_nba_004", userId: "bot_021", username: "alex_rivera", content: "Steph Curry still makes shots that should be physically impossible. He's 36 and playing on easy mode. The GOAT of his position and it's not even debatable. 💫", likes: ["bot_002","bot_006","bot_011","bot_031","bot_041","bot_051","bot_100","bot_101","bot_102","bot_103","bot_104"], reposts: ["bot_002","bot_006","bot_011","bot_031","bot_041"], clickId: "click_nba", createdAt: new Date(Date.now() - 3600000 * 11).toISOString(), replyCount: 9 },

  // AI & TECH CLICK posts
  { id: "cp_ai_001", userId: "bot_003", username: "casey_morgan", content: "Claude and GPT-4o existing in the same world simultaneously is just wild. We're in the golden age of AI and treating it as background noise. Appreciate the moment. 🤖", likes: ["bot_007","bot_012","bot_022","bot_032","bot_042","bot_052","bot_062","bot_072","bot_100","bot_101","bot_102","bot_103","bot_104","bot_105"], reposts: ["bot_007","bot_012","bot_022","bot_032","bot_042","bot_052"], clickId: "click_ai", createdAt: new Date(Date.now() - 3600000 * 3).toISOString(), replyCount: 19 },
  { id: "cp_ai_002", userId: "bot_007", username: "riley_chen", content: "AI coding tools have made me genuinely 3x more productive in 6 months. Cursor + Claude is the combo. If you're a dev and not using both yet — what are you doing.", likes: ["bot_003","bot_012","bot_022","bot_032","bot_042","bot_052","bot_062","bot_100","bot_101","bot_102","bot_103"], reposts: ["bot_003","bot_012","bot_022","bot_032","bot_042"], clickId: "click_ai", createdAt: new Date(Date.now() - 3600000 * 6).toISOString(), replyCount: 15 },
  { id: "cp_ai_003", userId: "bot_012", username: "nolan_reed", content: "The AI regulation debate is happening 5 years too late. The technology is already deployed at scale. Policy will always trail innovation. That's just how it works.", likes: ["bot_003","bot_007","bot_022","bot_032","bot_042","bot_052","bot_062","bot_072","bot_100","bot_101","bot_102"], reposts: ["bot_003","bot_007","bot_022","bot_032"], clickId: "click_ai", createdAt: new Date(Date.now() - 3600000 * 9).toISOString(), replyCount: 12 },
  { id: "cp_ai_004", userId: "bot_022", username: "morgan_james", content: "Open source AI models catching up to frontier models faster than anyone predicted. Llama 3 doing things that felt impossible 2 years ago. The gap is closing fast.", likes: ["bot_003","bot_007","bot_012","bot_032","bot_042","bot_052","bot_062","bot_100","bot_101","bot_102","bot_103","bot_104"], reposts: ["bot_003","bot_007","bot_012","bot_032","bot_042","bot_052"], clickId: "click_ai", createdAt: new Date(Date.now() - 3600000 * 12).toISOString(), replyCount: 10 },

  // MUSIC VIBES CLICK posts
  { id: "cp_mu_001", userId: "bot_004", username: "jamie_cross", content: "Charli XCX's BRAT album is a full cultural reset. Brat summer was a real season. She literally invented a color. That's what generational pop artistry looks like. 🟢", likes: ["bot_008","bot_013","bot_023","bot_033","bot_043","bot_053","bot_063","bot_100","bot_101","bot_102","bot_103","bot_104","bot_105","bot_106"], reposts: ["bot_008","bot_013","bot_023","bot_033","bot_043","bot_053"], clickId: "click_music", createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), replyCount: 18 },
  { id: "cp_mu_002", userId: "bot_008", username: "taylor_brooks", content: "Sabrina Carpenter went from Disney kid to undisputed global pop star in 18 months. Short n Sweet is a perfect album. Can't skip a single track. Era of eras. ⭐", likes: ["bot_004","bot_013","bot_023","bot_033","bot_043","bot_053","bot_063","bot_100","bot_101","bot_102","bot_103"], reposts: ["bot_004","bot_013","bot_023","bot_033","bot_043"], clickId: "click_music", createdAt: new Date(Date.now() - 3600000 * 5).toISOString(), replyCount: 13 },
  { id: "cp_mu_003", userId: "bot_013", username: "casey_morgan", content: "Beyoncé's Cowboy Carter changed country music whether country music wanted to be changed or not. Act II from the GOAT. Texas Hold 'Em goes insane live. 🤠", likes: ["bot_004","bot_008","bot_023","bot_033","bot_043","bot_053","bot_063","bot_100","bot_101","bot_102"], reposts: ["bot_004","bot_008","bot_023","bot_033"], clickId: "click_music", createdAt: new Date(Date.now() - 3600000 * 8).toISOString(), replyCount: 11 },
  { id: "cp_mu_004", userId: "bot_023", username: "riley_chen", content: "Vinyl sales outselling CDs for the first time since the 80s. Taylor Swift responsible for a huge share of that. People want to own music again. Something beautiful about that. 🎵", likes: ["bot_004","bot_008","bot_013","bot_033","bot_043","bot_053","bot_063","bot_100","bot_101","bot_102","bot_103","bot_104"], reposts: ["bot_004","bot_008","bot_013","bot_033","bot_043","bot_053"], clickId: "click_music", createdAt: new Date(Date.now() - 3600000 * 11).toISOString(), replyCount: 9 },

  // NYC CLICK posts
  { id: "cp_nyc_001", userId: "bot_001", username: "alex_rivera", content: "The High Line at sunset on a clear October day is still one of the most beautiful things on earth. Living in NYC rent-free in my heart every single day. 🗽", likes: ["bot_005","bot_010","bot_020","bot_030","bot_040","bot_050","bot_100","bot_101","bot_102","bot_103","bot_104","bot_105","bot_106","bot_107"], reposts: ["bot_005","bot_010","bot_020","bot_030","bot_040","bot_050"], clickId: "click_nyc", createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), replyCount: 20 },
  { id: "cp_nyc_002", userId: "bot_005", username: "drew_sun", content: "Bodega cat > any establishment mascot in any city in the world. NYC bodegas are a cultural institution and I will not hear otherwise. Non-negotiable. 🐱", likes: ["bot_001","bot_010","bot_020","bot_030","bot_040","bot_050","bot_100","bot_101","bot_102","bot_103","bot_104","bot_105"], reposts: ["bot_001","bot_010","bot_020","bot_030","bot_040"], clickId: "click_nyc", createdAt: new Date(Date.now() - 3600000 * 5).toISOString(), replyCount: 16 },
  { id: "cp_nyc_003", userId: "bot_010", username: "morgan_james", content: "NYC in winter is criminally underrated. Tourists leave. Locals inherit the streets. The city reveals its real self. Real New Yorkers know this. ❄️🍕", likes: ["bot_001","bot_005","bot_020","bot_030","bot_040","bot_050","bot_100","bot_101","bot_102","bot_103"], reposts: ["bot_001","bot_005","bot_020","bot_030"], clickId: "click_nyc", createdAt: new Date(Date.now() - 3600000 * 8).toISOString(), replyCount: 14 },
  { id: "cp_nyc_004", userId: "bot_020", username: "nolan_reed", content: "The NYC food scene right now is the best it has ever been. You can eat 10 different countries of food within 4 blocks in any neighborhood. Undefeated city.", likes: ["bot_001","bot_005","bot_010","bot_030","bot_040","bot_050","bot_100","bot_101","bot_102","bot_103","bot_104","bot_105","bot_106"], reposts: ["bot_001","bot_005","bot_010","bot_030","bot_040","bot_050"], clickId: "click_nyc", createdAt: new Date(Date.now() - 3600000 * 11).toISOString(), replyCount: 12 },
];

// Seeded clicks (communities)
const SC = [
  { id: "click_nyc",       name: "New York City 🗽",       image: null, members: ["bot_001","bot_005","bot_010","bot_020","bot_030","bot_040","bot_050"], ownerId: "bot_001", createdAt: new Date(Date.now() - 86400000 * 10).toISOString() },
  { id: "click_nba",       name: "NBA 🏀",                 image: null, members: ["bot_002","bot_006","bot_011","bot_021","bot_031","bot_041","bot_051","bot_061"], ownerId: "bot_002", createdAt: new Date(Date.now() - 86400000 * 8).toISOString() },
  { id: "click_ai",        name: "AI & Tech 🤖",           image: null, members: ["bot_003","bot_007","bot_012","bot_022","bot_032","bot_042","bot_052","bot_062","bot_072"], ownerId: "bot_003", createdAt: new Date(Date.now() - 86400000 * 6).toISOString() },
  { id: "click_music",     name: "Music Vibes 🎵",         image: null, members: ["bot_004","bot_008","bot_013","bot_023","bot_033","bot_043","bot_053","bot_063"], ownerId: "bot_004", createdAt: new Date(Date.now() - 86400000 * 4).toISOString() },
  { id: "click_food",      name: "Foodies 🍜",             image: null, members: ["bot_005","bot_009","bot_014","bot_024","bot_034","bot_044","bot_054"], ownerId: "bot_005", createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: "click_movies",    name: "Movies & TV 🎬",         image: null, members: ["bot_015","bot_025","bot_035","bot_045","bot_055","bot_065","bot_075","bot_085","bot_095"], ownerId: "bot_015", createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: "click_hiphop",    name: "Hip Hop 🎤",             image: null, members: ["bot_016","bot_026","bot_036","bot_046","bot_056","bot_066","bot_076","bot_086"], ownerId: "bot_016", createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: "click_kpop",      name: "K-Pop 🌸",               image: null, members: ["bot_017","bot_027","bot_037","bot_047","bot_057","bot_067","bot_077"], ownerId: "bot_017", createdAt: new Date(Date.now() - 86400000 * 7).toISOString() },
  { id: "click_books",     name: "Book Club 📚",           image: null, members: ["bot_018","bot_028","bot_038","bot_048","bot_058","bot_068","bot_078","bot_088"], ownerId: "bot_018", createdAt: new Date(Date.now() - 86400000 * 9).toISOString() },
  { id: "click_fitness",   name: "Fitness & Gym 💪",       image: null, members: ["bot_019","bot_029","bot_039","bot_049","bot_059","bot_069","bot_079","bot_089","bot_099"], ownerId: "bot_019", createdAt: new Date(Date.now() - 86400000 * 1).toISOString() },
  { id: "click_gaming",    name: "Gaming 🎮",              image: null, members: ["bot_100","bot_110","bot_120","bot_130","bot_140","bot_150","bot_160","bot_170"], ownerId: "bot_100", createdAt: new Date(Date.now() - 86400000 * 11).toISOString() },
  { id: "click_taylor",    name: "Taylor Swift 🫶",        image: null, members: ["bot_101","bot_111","bot_121","bot_131","bot_141","bot_151","bot_161","bot_171","bot_181"], ownerId: "bot_101", createdAt: new Date(Date.now() - 86400000 * 6).toISOString() },
  { id: "click_nfl",       name: "NFL 🏈",                 image: null, members: ["bot_102","bot_112","bot_122","bot_132","bot_142","bot_152","bot_162","bot_172"], ownerId: "bot_102", createdAt: new Date(Date.now() - 86400000 * 4).toISOString() },
  { id: "click_anime",     name: "Anime & Manga 🌀",       image: null, members: ["bot_103","bot_113","bot_123","bot_133","bot_143","bot_153","bot_163"], ownerId: "bot_103", createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: "click_startup",   name: "Startups & VC 🚀",      image: null, members: ["bot_104","bot_114","bot_124","bot_134","bot_144","bot_154","bot_164","bot_174"], ownerId: "bot_104", createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: "click_soccer",    name: "Soccer / Football ⚽",  image: null, members: ["bot_105","bot_115","bot_125","bot_135","bot_145","bot_155","bot_165","bot_175"], ownerId: "bot_105", createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: "click_nhl",       name: "NHL Hockey 🏒",          image: null, members: ["bot_106","bot_116","bot_126","bot_136","bot_146","bot_156","bot_166"], ownerId: "bot_106", createdAt: new Date(Date.now() - 86400000 * 6).toISOString() },
  { id: "click_photography","name": "Photography 📷",      image: null, members: ["bot_107","bot_117","bot_127","bot_137","bot_147","bot_157","bot_167"], ownerId: "bot_107", createdAt: new Date(Date.now() - 86400000 * 4).toISOString() },
  { id: "click_cooking",   name: "Home Cooking 🍳",        image: null, members: ["bot_108","bot_118","bot_128","bot_138","bot_148","bot_158","bot_168"], ownerId: "bot_108", createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: "click_travel",    name: "Travel ✈️",              image: null, members: ["bot_109","bot_119","bot_129","bot_139","bot_149","bot_159","bot_169"], ownerId: "bot_109", createdAt: new Date(Date.now() - 86400000 * 7).toISOString() },
  { id: "click_fashion",   name: "Fashion & Style 👗",     image: null, members: ["bot_120","bot_130","bot_140","bot_150","bot_160","bot_170","bot_180"], ownerId: "bot_120", createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: "click_cars",      name: "Cars & Motorsport 🚗",   image: null, members: ["bot_121","bot_131","bot_141","bot_151","bot_161","bot_171","bot_181"], ownerId: "bot_121", createdAt: new Date(Date.now() - 86400000 * 8).toISOString() },
  { id: "click_finance",   name: "Finance & Crypto 📈",    image: null, members: ["bot_122","bot_132","bot_142","bot_152","bot_162","bot_172","bot_182"], ownerId: "bot_122", createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: "click_tennis",    name: "Tennis 🎾",              image: null, members: ["bot_123","bot_133","bot_143","bot_153","bot_163","bot_173"], ownerId: "bot_123", createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: "click_art",       name: "Art & Design 🎨",        image: null, members: ["bot_124","bot_134","bot_144","bot_154","bot_164","bot_174","bot_184"], ownerId: "bot_124", createdAt: new Date(Date.now() - 86400000 * 9).toISOString() },
];

// 24 default profile pics (SVG data URIs)
const mkAvatar = (bg, emoji) => `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='${encodeURIComponent(bg)}'/%3E%3Ctext x='50' y='65' text-anchor='middle' font-size='45' fill='white'%3E${encodeURIComponent(emoji)}%3C/text%3E%3C/svg%3E`;
const DEFS = [
  { id: "d0",  label: "Ocean Wave", url: mkAvatar("#1D9BF0","🌊") },
  { id: "d1",  label: "Fire",       url: mkAvatar("#F91880","🔥") },
  { id: "d2",  label: "Star",       url: mkAvatar("#7c3aed","⭐") },
  { id: "d3",  label: "Lightning",  url: mkAvatar("#f59e0b","⚡") },
  { id: "d4",  label: "Moon",       url: mkAvatar("#0f172a","🌙") },
  { id: "d5",  label: "Robot",      url: mkAvatar("#06b6d4","🤖") },
  { id: "d6",  label: "Dragon",     url: mkAvatar("#dc2626","🐉") },
  { id: "d7",  label: "Plant",      url: mkAvatar("#16a34a","🌿") },
  { id: "d8",  label: "Diamond",    url: mkAvatar("#0ea5e9","💎") },
  { id: "d9",  label: "Crown",      url: mkAvatar("#d97706","👑") },
  { id: "d10", label: "Ghost",      url: mkAvatar("#6366f1","👻") },
  { id: "d11", label: "Phoenix",    url: mkAvatar("#ea580c","🦅") },
  { id: "d12", label: "Ninja",      url: mkAvatar("#111827","🥷") },
  { id: "d13", label: "Alien",      url: mkAvatar("#4ade80","👽") },
  { id: "d14", label: "Rocket",     url: mkAvatar("#312e81","🚀") },
  { id: "d15", label: "Cat",        url: mkAvatar("#f472b6","🐱") },
  { id: "d16", label: "Wolf",       url: mkAvatar("#475569","🐺") },
  { id: "d17", label: "Butterfly",  url: mkAvatar("#8b5cf6","🦋") },
  { id: "d18", label: "Snowflake",  url: mkAvatar("#0891b2","❄️") },
  { id: "d19", label: "Skull",      url: mkAvatar("#1e1e2e","💀") },
  { id: "d20", label: "Fox",        url: mkAvatar("#c2410c","🦊") },
  { id: "d21", label: "Bear",       url: mkAvatar("#78350f","🐻") },
  { id: "d22", label: "Volcano",    url: mkAvatar("#991b1b","🌋") },
  { id: "d23", label: "Galaxy",     url: mkAvatar("#1e1b4b","🌌") },
];

// Default wallpapers
const WALLPAPERS = [
  { id: "w0",  label: "Blue Sky",    value: "linear-gradient(135deg,#1D9BF0,#0c4a7a)" },
  { id: "w1",  label: "Purple Dusk", value: "linear-gradient(135deg,#7c3aed,#2d1b6e)" },
  { id: "w2",  label: "Sunset",      value: "linear-gradient(135deg,#F91880,#f59e0b)" },
  { id: "w3",  label: "Forest",      value: "linear-gradient(135deg,#16a34a,#052e16)" },
  { id: "w4",  label: "Ocean",       value: "linear-gradient(135deg,#0ea5e9,#0c4a6e)" },
  { id: "w5",  label: "Night",       value: "linear-gradient(135deg,#0f172a,#1e1b4b)" },
  { id: "w6",  label: "Rose",        value: "linear-gradient(135deg,#f43f5e,#881337)" },
  { id: "w7",  label: "Cyber",       value: "linear-gradient(135deg,#06b6d4,#312e81)" },
  { id: "w8",  label: "Autumn",      value: "linear-gradient(135deg,#ea580c,#78350f)" },
  { id: "w9",  label: "Midnight",    value: "linear-gradient(135deg,#312e81,#0f172a)" },
];


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
const SparkI = () => <span style={{fontSize:14}}>🧸</span>;
const ReplyI = () => Ic("M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z", 18);
const BackI  = () => Ic("M19 12H5M12 5l-7 7 7 7");
const LockI  = () => Ic("M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z M7 11V7a5 5 0 0110 0v4");
const MsgI   = () => Ic("M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z");
const SendI  = () => Ic("M22 2L11 13 M22 2L15 22 8 13 2 2z", 18);
const FlagI  = () => Ic("M4 15s1-1 4-1 4 2 8 2 4-1 4-1V3s-1 1-4 1-4-2-8-2-4 1-4 1z M4 22v-7", 18);
const HrtI   = ({ on }) => <svg width="18" height="18" viewBox="0 0 24 24" fill={on ? PINK : "none"} stroke={on ? PINK : "currentColor"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>;
const RtI    = ({ on }) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={on ? "#00BA7C" : "currentColor"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14 M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>;
// Anthropic logo mark (official wordmark simplified to icon)
const AnthropicLogo = ({ size = 20 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M13.8 2h-3.6L4 22h3.8l1.3-3.6h5.8L16.2 22H20L13.8 2zm-3.6 13.1L12 8.7l1.8 6.4H10.2z"/></svg>;

// ── AVATAR ────────────────────────────────────────────────────────────────────
const Av = ({ user, sz = 40, onClick }) => {
  const [err, setErr] = useState(false);
  const cols = [BLUE, PURPLE, PINK, "#ea580c", "#16a34a", "#0891b2"];
  const bg = cols[((user?.username || "?").charCodeAt(0) || 0) % cols.length];
  const s = { width: sz, height: sz, borderRadius: "50%", flexShrink: 0, cursor: onClick ? "pointer" : "default", objectFit: "cover", display: "block" };
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
        {name === "claude" ? <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#CC785C,#D4A27F)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0 }}><AnthropicLogo size={18} /></div> : <Av user={u} sz={32} />}
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
  const submit = async () => {
    if (!reason) return;
    await DB.insertReport({ post_id: post.id, reason, ts: new Date().toISOString() });
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

// ── WALLPAPER PICKER ─────────────────────────────────────────────────────────
const BannerCropModal = ({ src, onSave, onClose, T }) => {
  const canvasRef = useRef();
  const imgRef = useRef(new window.Image());
  const W = Math.min(window.innerWidth - 32, 360);
  const H = Math.round(W / 3);
  const stateRef = useRef({ dragging: false, lastX: 0, lastY: 0, offsetX: 0, offsetY: 0, scale: 1, pinchDist: null });

  useEffect(() => {
    const img = imgRef.current;
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const fit = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      stateRef.current.scale = fit;
      stateRef.current.offsetX = (W - img.naturalWidth * fit) / 2;
      stateRef.current.offsetY = (H - img.naturalHeight * fit) / 2;
      redraw();
    };
    img.src = src;
  }, [src]);

  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { offsetX, offsetY, scale } = stateRef.current;
    const dpr = window.devicePixelRatio || 1;
    const img = imgRef.current;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(img, offsetX, offsetY, img.naturalWidth * scale, img.naturalHeight * scale);
  };

  const dist = (t1, t2) => Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

  const onTouchStart = e => {
    e.preventDefault();
    const s = stateRef.current;
    if (e.touches.length === 1) { s.dragging = true; s.lastX = e.touches[0].clientX; s.lastY = e.touches[0].clientY; s.pinchDist = null; }
    else if (e.touches.length === 2) { s.dragging = false; s.pinchDist = dist(e.touches[0], e.touches[1]); }
  };
  const onTouchMove = e => {
    e.preventDefault();
    const s = stateRef.current;
    if (e.touches.length === 2 && s.pinchDist !== null) {
      const nd = dist(e.touches[0], e.touches[1]);
      s.scale = Math.max(0.1, Math.min(6, s.scale * (nd / s.pinchDist)));
      s.pinchDist = nd;
    } else if (e.touches.length === 1 && s.dragging) {
      s.offsetX += e.touches[0].clientX - s.lastX;
      s.offsetY += e.touches[0].clientY - s.lastY;
      s.lastX = e.touches[0].clientX; s.lastY = e.touches[0].clientY;
    }
    redraw();
  };
  const onTouchEnd = e => { e.preventDefault(); stateRef.current.dragging = false; stateRef.current.pinchDist = null; };
  const onMouseDown = e => { const s = stateRef.current; s.dragging = true; s.lastX = e.clientX; s.lastY = e.clientY; };
  const onMouseMove = e => { const s = stateRef.current; if (!s.dragging) return; s.offsetX += e.clientX - s.lastX; s.offsetY += e.clientY - s.lastY; s.lastX = e.clientX; s.lastY = e.clientY; redraw(); };
  const onMouseUp = () => { stateRef.current.dragging = false; };
  const changeScale = v => { stateRef.current.scale = parseFloat(v); redraw(); };

  const save = () => {
    const EW = 1200; const EH = 400;
    const out = document.createElement("canvas");
    out.width = EW; out.height = EH;
    const ctx = out.getContext("2d");
    const ratio = EW / W;
    const { offsetX, offsetY, scale } = stateRef.current;
    ctx.drawImage(imgRef.current, offsetX * ratio, offsetY * ratio, imgRef.current.naturalWidth * scale * ratio, imgRef.current.naturalHeight * scale * ratio);
    onSave(out.toDataURL("image/jpeg", 0.88));
  };

  return <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14, padding: 16 }}>
    <div style={{ fontWeight: 700, fontSize: 16, color: "white" }}>Crop Banner</div>
    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", textAlign: "center" }}>Drag to reposition · Pinch to zoom</div>
    <div style={{ borderRadius: 10, overflow: "hidden", cursor: "grab", userSelect: "none", border: "2px solid rgba(255,255,255,0.2)", touchAction: "none" }}
      onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 10, width: W }}>
      <span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>–</span>
      <input type="range" min={0.1} max={6} step={0.01}
        defaultValue={stateRef.current.scale}
        onInput={e => changeScale(e.target.value)}
        style={{ flex: 1, accentColor: BLUE }} />
      <span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>+</span>
    </div>
    <div style={{ display: "flex", gap: 10 }}>
      <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 9999, padding: "11px 24px", fontWeight: 600, cursor: "pointer", fontSize: 15 }}>Cancel</button>
      <button onClick={save} style={{ background: BLUE, color: "white", border: "none", borderRadius: 9999, padding: "11px 28px", fontWeight: 700, cursor: "pointer", fontSize: 15 }}>Use Banner</button>
    </div>
  </div>;
};

const WallpaperPicker = ({ onPick, onClose, T }) => {
  const [cropSrcBanner, setCropSrcBanner] = useState(null);
  const fRef = useRef();
  const pickFile = e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = x => { setCropSrcBanner(x.target.result); };
    r.readAsDataURL(f);
  };
  if (cropSrcBanner) return <BannerCropModal src={cropSrcBanner} onSave={data => { onPick({ type: "image", value: data }); }} onClose={() => setCropSrcBanner(null)} T={T} />;
  return <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
    <div style={{ background: T.card, borderRadius: 16, padding: 24, width: "100%", maxWidth: 440, border: `1px solid ${T.border}`, maxHeight: "80vh", overflow: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <span style={{ fontWeight: 800, fontSize: 17, color: T.text }}>Choose a wallpaper</span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.text }}><XI /></button>
      </div>
      <button onClick={() => fRef.current.click()} style={{ width: "100%", background: T.input, color: T.text, border: `2px dashed ${T.border}`, borderRadius: 10, padding: "11px", fontWeight: 600, fontSize: 13, cursor: "pointer", marginBottom: 14 }}>📁 Upload your own photo</button>
      <input ref={fRef} type="file" accept="image/*" style={{ display: "none" }} onChange={pickFile} />
      <div style={{ fontSize: 12, color: T.sub, marginBottom: 10, fontWeight: 600 }}>GRADIENT PRESETS</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
        {WALLPAPERS.map(w => <div key={w.id} onClick={() => onPick({ type: "gradient", value: w.value })} style={{ height: 56, borderRadius: 10, background: w.value, cursor: "pointer", display: "flex", alignItems: "flex-end", padding: "6px 10px", border: `2px solid transparent` }}>
          <span style={{ fontSize: 11, color: "white", fontWeight: 700, textShadow: "0 1px 3px rgba(0,0,0,0.7)" }}>{w.label}</span>
        </div>)}
      </div>
    </div>
  </div>;
};

// ── PIC PICKER ────────────────────────────────────────────────────────────────
const PicPicker = ({ onPick, onClose, T }) => <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
  <div style={{ background: T.card, borderRadius: 16, padding: 24, width: "100%", maxWidth: 440, border: `1px solid ${T.border}`, maxHeight: "80vh", overflow: "auto" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
      <span style={{ fontWeight: 800, fontSize: 17, color: T.text }}>Choose a profile pic</span>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.text }}><XI /></button>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 10 }}>
      {DEFS.map(d => <div key={d.id} onClick={() => onPick(d.url)} style={{ cursor: "pointer", textAlign: "center" }}>
        <img src={d.url} style={{ width: 48, height: 48, borderRadius: "50%", border: `2px solid ${T.border}` }} alt={d.label} />
        <div style={{ fontSize: 8, color: T.sub, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.label}</div>
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
    <h2 style={{ margin: "0 0 12px", fontSize: 17, fontWeight: 700, color: T.text }}>Terms of Service & Disclaimer</h2>
    <div style={{ fontSize: 13, lineHeight: 1.7, color: T.sub }}>
      <p><strong style={{ color: T.text }}>1. User Responsibility</strong> — You are solely responsible for content you post. Do not post content that violates any law.</p>
      <p><strong style={{ color: T.text }}>2. Prohibited Content</strong> — No illegal content, no harassment, no spam, no impersonation of others.</p>
      <p><strong style={{ color: T.text }}>3. Section 230</strong> — Scrypt operates under 47 U.S.C. § 230. We are not liable for user-generated content.</p>
      <p><strong style={{ color: T.text }}>4. AI Features</strong> — Claude (Anthropic) powers AI features. AI responses are not legal, medical, or financial advice.</p>
      <p><strong style={{ color: T.text }}>5. Reporting</strong> — Use the flag button to report content that violates these terms.</p>
      <p><strong style={{ color: T.text }}>6. Disclaimer</strong> — PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND. Use at your own risk.</p>
      <p><strong style={{ color: T.text }}>7. No Email Required</strong> — Scrypt uses a username and password system. No email address is collected or required. Please write down your username and password at account creation — passwords can be changed inside the app, but account recovery without credentials is not possible.</p>
      <p><strong style={{ color: T.text }}>8. Privacy & Data</strong> — Scrypt does not collect, sell, or share your personal data. We do not use your information for advertising or third-party purposes. Your account data (username, password, posts) is stored locally on your device. While the underlying system we use is trusted and industry-standard, no system is 100% secure — use Scrypt at your own discretion and avoid sharing sensitive personal information publicly.</p>
    </div>
    <button onClick={onAccept} style={{ width: "100%", padding: 14, background: BLUE, color: "white", border: "none", borderRadius: 9999, fontWeight: 800, fontSize: 16, cursor: "pointer", marginTop: 16 }}>I Agree — Create Account</button>
  </div>
</div>;

// ── CLAUDE CHAT ───────────────────────────────────────────────────────────────
const TedChat = ({ T, onClose, init }) => {
  const [msgs, setMsgs] = useState([{ role: "assistant", content: "Hi! I'm Ted 🧸, your AI on Scrypt. What's on your mind?" }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef();
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [msgs]);

  const send = async txt => {
    const text = (txt || input).trim();
    if (!text || busy) return;
    if (!getKey()) {
      setMsgs(p => [...p, { role: "user", content: text }, { role: "assistant", content: "Hey! 🧸 I'm Ted — ask me anything!" }]);
      setInput("");
      return;
    }
    const next = [...msgs, { role: "user", content: text }];
    setMsgs(next); setInput(""); setBusy(true);
    try {
      const api = next.slice(next[0].role === "assistant" ? 1 : 0).map(m => ({ role: m.role, content: m.content }));
      const r = await claudeFetch({ model: "llama-3.3-70b-versatile", max_tokens: 1000, system: "You are Ted 🧸, a helpful AI on Scrypt. Be helpful, concise, and friendly.", messages: api });
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
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#8B4513", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span style={{fontSize:20}}>🧸</span></div>
        <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 15, color: T.text }}>Ted 🧸</div><div style={{ fontSize: 12, color: T.sub }}>Your AI on Scrypt</div></div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.text }}><XI /></button>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {msgs.map((m, i) => <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", gap: 8, alignItems: "flex-end" }}>
          {m.role === "assistant" && <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#8B4513", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span style={{fontSize:14}}>🧸</span></div>}
          <div style={{ maxWidth: "78%", padding: "9px 13px", borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: m.role === "user" ? BLUE : T.input, color: m.role === "user" ? "white" : T.text, fontSize: 14, lineHeight: 1.5 }}>{m.content}</div>
        </div>)}
        {busy && <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#8B4513", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span style={{fontSize:14}}>🧸</span></div>
          <div style={{ padding: "9px 13px", background: T.input, borderRadius: "14px 14px 14px 4px", display: "flex", gap: 4, alignItems: "center" }}>
            {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: T.sub, animation: `dot${i} 1s ${i * 0.2}s ease-in-out infinite alternate` }} />)}
          </div>
        </div>}
        <div ref={endRef} />
      </div>
      <div style={{ padding: "10px 14px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()} placeholder="Ask Ted anything..." style={{ flex: 1, background: T.input, border: "none", borderRadius: 9999, padding: "10px 16px", color: T.text, fontSize: 14, outline: "none" }} />
        <button onClick={() => send()} disabled={!input.trim() || busy} style={{ background: BLUE, color: "white", border: "none", borderRadius: "50%", width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: input.trim() && !busy ? "pointer" : "not-allowed", opacity: input.trim() && !busy ? 1 : 0.5 }}><SendI /></button>
      </div>
      <style>{`@keyframes dot0{from{transform:translateY(0)}to{transform:translateY(-5px)}} @keyframes dot1{from{transform:translateY(0)}to{transform:translateY(-5px)}} @keyframes dot2{from{transform:translateY(0)}to{transform:translateY(-5px)}}`}</style>
    </div>
  </div>;
};

// ── ACCENT COLORS ─────────────────────────────────────────────────────────────
const ACCENT_COLORS = [
  { id: "blue",    label: "Ocean",    color: "#1D9BF0", grad: "linear-gradient(135deg,#1D9BF0,#0c4a7a)" },
  { id: "purple",  label: "Galaxy",   color: "#7c3aed", grad: "linear-gradient(135deg,#7c3aed,#2d1b6e)" },
  { id: "pink",    label: "Flame",    color: "#F91880", grad: "linear-gradient(135deg,#F91880,#7c0040)" },
  { id: "green",   label: "Forest",   color: "#00BA7C", grad: "linear-gradient(135deg,#00BA7C,#004d33)" },
  { id: "orange",  label: "Sunset",   color: "#f59e0b", grad: "linear-gradient(135deg,#f59e0b,#92400e)" },
  { id: "red",     label: "Fire",     color: "#ef4444", grad: "linear-gradient(135deg,#ef4444,#7f1d1d)" },
  { id: "teal",    label: "Cyber",    color: "#06b6d4", grad: "linear-gradient(135deg,#06b6d4,#164e63)" },
  { id: "rose",    label: "Rose",     color: "#f43f5e", grad: "linear-gradient(135deg,#f43f5e,#881337)" },
  { id: "gold",    label: "Gold",     color: "#eab308", grad: "linear-gradient(135deg,#eab308,#713f12)" },
  { id: "indigo",  label: "Indigo",   color: "#6366f1", grad: "linear-gradient(135deg,#6366f1,#1e1b4b)" },
  { id: "lime",    label: "Lime",     color: "#84cc16", grad: "linear-gradient(135deg,#84cc16,#1a2e05)" },
  { id: "amber",   label: "Amber",    color: "#f97316", grad: "linear-gradient(135deg,#f97316,#7c2d12)" },
  { id: "sky",     label: "Sky",      color: "#38bdf8", grad: "linear-gradient(135deg,#38bdf8,#0c4a6e)" },
  { id: "violet",  label: "Violet",   color: "#a855f7", grad: "linear-gradient(135deg,#a855f7,#3b0764)" },
  { id: "emerald", label: "Emerald",  color: "#10b981", grad: "linear-gradient(135deg,#10b981,#064e3b)" },
  { id: "white",   label: "Ice",      color: "#e2e8f0", grad: "linear-gradient(135deg,#e2e8f0,#94a3b8)" },
];
const getAccent = (user) => ACCENT_COLORS.find(a => a.id === user?.accentColor) || ACCENT_COLORS[0];

// ── PROFILE SONG PLAYER ────────────────────────────────────────────────────────
const ProfileSongPlayer = ({ songSrc, songName, accent }) => {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);
  if (!songSrc) return null;
  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.currentTime = 0; audioRef.current.play(); setPlaying(true); }
  };
  return <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: `${accent.color}18`, borderRadius: 10, border: `1px solid ${accent.color}40`, marginBottom: 10 }}>
    <audio ref={audioRef} src={songSrc} onEnded={() => setPlaying(false)} />
    <button onClick={toggle} style={{ background: accent.color, border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", color: "white", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{playing ? "⏸" : "▶"}</button>
    <div style={{ flex: 1, overflow: "hidden" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: accent.color }}>🎵 Profile Song</div>
      <div style={{ fontSize: 10, color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{songName || "Custom clip"}</div>
    </div>
  </div>;
};

// ── PROFILE INFO CARDS ─────────────────────────────────────────────────────────
const INFO_FIELDS = [
  { key: "infoMovie",  photoKey: "infoMoviePhoto",  icon: "🎬", label: "Fav Movie",   grad: "linear-gradient(135deg,#1a1a2e,#16213e)" },
  { key: "infoArtist", photoKey: "infoArtistPhoto", icon: "🎵", label: "Top Artist",  grad: "linear-gradient(135deg,#0d0d1a,#1a0533)" },
  { key: "infoShow",   photoKey: "infoShowPhoto",   icon: "📺", label: "Watching",    grad: "linear-gradient(135deg,#0a1628,#1e3a5f)" },
  { key: "infoBook",   photoKey: "infoBookPhoto",   icon: "📖", label: "Reading",     grad: "linear-gradient(135deg,#1a0a00,#3d1a00)" },
  { key: "infoGame",   photoKey: "infoGamePhoto",   icon: "🎮", label: "Playing",     grad: "linear-gradient(135deg,#0a1a0a,#0d3319)" },
];

// ── IMAGE CROP MODAL ──────────────────────────────────────────────────────────
const ImageCropModal = ({ src, onSave, onClose, T }) => {
  const canvasRef = useRef();
  const imgRef = useRef(new window.Image());
  const stateRef = useRef({ dragging: false, lastX: 0, lastY: 0, offsetX: 0, offsetY: 0, scale: 1, pinchDist: null });
  const SIZE = Math.min(window.innerWidth - 32, 320);

  useEffect(() => {
    const img = imgRef.current;
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // Fit image to fill the crop square at scale 1
      const fit = Math.max(SIZE / img.naturalWidth, SIZE / img.naturalHeight);
      stateRef.current.scale = fit;
      stateRef.current.offsetX = (SIZE - img.naturalWidth * fit) / 2;
      stateRef.current.offsetY = (SIZE - img.naturalHeight * fit) / 2;
      redraw();
    };
    img.src = src;
  }, [src]);

  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { offsetX, offsetY, scale } = stateRef.current;
    const dpr = window.devicePixelRatio || 1;
    const img = imgRef.current;
    canvas.width = SIZE * dpr; canvas.height = SIZE * dpr;
    canvas.style.width = SIZE + "px"; canvas.style.height = SIZE + "px";
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.drawImage(img, offsetX, offsetY, img.naturalWidth * scale, img.naturalHeight * scale);
  };

  const dist = (t1, t2) => Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

  const onTouchStart = e => {
    e.preventDefault();
    const s = stateRef.current;
    if (e.touches.length === 1) {
      s.dragging = true;
      s.lastX = e.touches[0].clientX;
      s.lastY = e.touches[0].clientY;
      s.pinchDist = null;
    } else if (e.touches.length === 2) {
      s.dragging = false;
      s.pinchDist = dist(e.touches[0], e.touches[1]);
    }
  };
  const onTouchMove = e => {
    e.preventDefault();
    const s = stateRef.current;
    if (e.touches.length === 2 && s.pinchDist !== null) {
      const newDist = dist(e.touches[0], e.touches[1]);
      const delta = newDist / s.pinchDist;
      s.scale = Math.max(0.1, Math.min(6, s.scale * delta));
      s.pinchDist = newDist;
    } else if (e.touches.length === 1 && s.dragging) {
      s.offsetX += e.touches[0].clientX - s.lastX;
      s.offsetY += e.touches[0].clientY - s.lastY;
      s.lastX = e.touches[0].clientX;
      s.lastY = e.touches[0].clientY;
    }
    redraw();
  };
  const onTouchEnd = e => { e.preventDefault(); stateRef.current.dragging = false; stateRef.current.pinchDist = null; };

  const onMouseDown = e => { const s = stateRef.current; s.dragging = true; s.lastX = e.clientX; s.lastY = e.clientY; };
  const onMouseMove = e => {
    const s = stateRef.current;
    if (!s.dragging) return;
    s.offsetX += e.clientX - s.lastX;
    s.offsetY += e.clientY - s.lastY;
    s.lastX = e.clientX; s.lastY = e.clientY;
    redraw();
  };
  const onMouseUp = () => { stateRef.current.dragging = false; };
  const onWheel = e => {
    e.preventDefault();
    const s = stateRef.current;
    s.scale = Math.max(0.1, Math.min(6, s.scale * (e.deltaY < 0 ? 1.1 : 0.9)));
    redraw();
  };

  const changeScale = v => {
    stateRef.current.scale = parseFloat(v);
    redraw();
  };

  const save = () => {
    const EXPORT = 400;
    const out = document.createElement("canvas");
    out.width = EXPORT; out.height = EXPORT;
    const ctx = out.getContext("2d");
    const { offsetX, offsetY, scale } = stateRef.current;
    const ratio = EXPORT / SIZE;
    const img = imgRef.current;
    ctx.drawImage(img, offsetX * ratio, offsetY * ratio, img.naturalWidth * scale * ratio, img.naturalHeight * scale * ratio);
    onSave(out.toDataURL("image/jpeg", 0.88));
  };

  return <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14, padding: 16 }}>
    <div style={{ fontWeight: 700, fontSize: 16, color: "white" }}>Crop Photo</div>
    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", textAlign: "center" }}>Drag to reposition · Pinch to zoom</div>
    <div
      style={{ borderRadius: 14, overflow: "hidden", cursor: "grab", userSelect: "none", border: "2px solid rgba(255,255,255,0.25)", touchAction: "none" }}
      onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      onWheel={onWheel}>
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 10, width: SIZE }}>
      <span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>–</span>
      <input type="range" min={0.1} max={6} step={0.01}
        defaultValue={stateRef.current.scale}
        onInput={e => changeScale(e.target.value)}
        style={{ flex: 1, accentColor: BLUE }} />
      <span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>+</span>
    </div>
    <div style={{ display: "flex", gap: 10 }}>
      <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 9999, padding: "11px 24px", fontWeight: 600, cursor: "pointer", fontSize: 15 }}>Cancel</button>
      <button onClick={save} style={{ background: BLUE, color: "white", border: "none", borderRadius: 9999, padding: "11px 28px", fontWeight: 700, cursor: "pointer", fontSize: 15 }}>Use Photo</button>
    </div>
  </div>;
};

const ProfileInfoCards = ({ user, accent, resolvePhoto }) => {
  const filled = INFO_FIELDS.filter(f => user[f.key]);
  if (!filled.length) return null;
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 7, marginBottom: 12 }}>
    {filled.map(f => {
      const photo = resolvePhoto ? resolvePhoto(user, f.photoKey) : user[f.photoKey];
      return <div key={f.key} style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${accent.color}28`, background: accent.color + "10" }}>
        {/* Square image area */}
        <div style={{ width: "100%", aspectRatio: "1/1", position: "relative", background: photo ? "transparent" : f.grad, overflow: "hidden" }}>
          {photo
            ? <img src={photo} alt={user[f.key]} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            : <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
                <span style={{ fontSize: 26 }}>{f.icon}</span>
              </div>}
          {/* label overlay at bottom of square */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.65))", padding: "14px 7px 5px", pointerEvents: "none" }}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.75)", fontWeight: 700, letterSpacing: 0.5 }}>{f.label.toUpperCase()}</div>
          </div>
        </div>
        {/* Title below */}
        <div style={{ padding: "5px 7px 6px", background: accent.color + "10" }}>
          <div style={{ fontSize: 11, color: accent.color === "#1D9BF0" ? "#E7E9EA" : accent.color, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.3 }}>{user[f.key]}</div>
        </div>
      </div>;
    })}
  </div>;
};

// ── PROFILE MODAL ─────────────────────────────────────────────────────────────
const ProfileModal = ({ user, me, onClose, onVillage, onIM, T, posts, onThread, onLike, onRt, onReply, onDelete, onBlock, blocked }) => {
  const [showConfirm, setShowConfirm] = useState(null); // 'remove' | 'block'
  const myV = Array.isArray(me.village) ? me.village : [];
  const inV = myV.includes(user.id);
  const isMe = user.id === me.id;
  const theirV = Array.isArray(user.village) ? user.village : [];
  const mutual = inV && theirV.includes(me.id);
  const pub = posts.filter(p => p.userId === user.id && !p.parentId && !p.villageOnly);
  const villagerUsers = theirV.map(id => posts.find(p => false) || { id }).filter(Boolean); // placeholder
  const accent = getAccent(user);
  const wp = (() => { const w = user.wallpaper; if (!w) return null; if (w?.type === "image" && w?.value === "__local_wallpaper__") return LS.get(`wallpaper_${user.id}`) || null; return w; })();
  const bannerBg = wp?.type === "image" ? `url(${wp.value}) center/cover` : (wp?.value || accent.grad);
  const featured = user.featuredPostId ? posts.find(p => p.id === user.featuredPostId) : null;
  const resolvePhoto = (u, photoKey) => { const val = u[photoKey]; if (!val) return null; if (typeof val === "string" && val.startsWith("__local__")) return LS.get(`icard_${u.id}_${val.replace("__local__","")}`); return val; };
  const profileSong = LS.get(`psong_${user.id}`) || (user.profileSong ? { song: user.profileSong, name: user.profileSongName } : null);

  if (showConfirm === 'remove') return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: T.card, borderRadius: 16, padding: 24, width: "100%", maxWidth: 340, border: `1px solid ${T.border}` }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: T.text, marginBottom: 8 }}>Remove from Village?</div>
        <div style={{ fontSize: 14, color: T.sub, marginBottom: 20 }}>@{user.username} will be removed from your village.</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setShowConfirm(null)} style={{ flex: 1, background: T.input, color: T.text, border: "none", borderRadius: 9999, padding: "9px", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          <button onClick={() => { onVillage(user.id); setShowConfirm(null); onClose(); }} style={{ flex: 1, background: PINK, color: "white", border: "none", borderRadius: 9999, padding: "9px", fontWeight: 700, cursor: "pointer" }}>Remove</button>
        </div>
      </div>
    </div>
  );

  if (showConfirm === 'block') return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: T.card, borderRadius: 16, padding: 24, width: "100%", maxWidth: 340, border: `1px solid ${T.border}` }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: T.text, marginBottom: 8 }}>Block @{user.username}?</div>
        <div style={{ fontSize: 14, color: T.sub, marginBottom: 20 }}>They won't appear in your feed and can't interact with your posts.</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setShowConfirm(null)} style={{ flex: 1, background: T.input, color: T.text, border: "none", borderRadius: 9999, padding: "9px", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          <button onClick={() => { onBlock && onBlock(user.id); setShowConfirm(null); onClose(); }} style={{ flex: 1, background: PINK, color: "white", border: "none", borderRadius: 9999, padding: "9px", fontWeight: 700, cursor: "pointer" }}>Block</button>
        </div>
      </div>
    </div>
  );

  return <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 8800, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
    <div style={{ background: T.card, borderRadius: "16px 16px 0 0", width: "100%", maxWidth: 600, maxHeight: "92vh", overflow: "auto", border: `1px solid ${accent.color}60` }} onClick={e => e.stopPropagation()}>

      {/* Banner */}
      <div style={{ height: 100, background: bannerBg, position: "relative", borderRadius: "16px 16px 0 0", flexShrink: 0 }}>
        <div style={{ position: "absolute", bottom: -30, left: 16, border: `3px solid ${accent.color}`, borderRadius: "50%", overflow: "hidden", lineHeight: 0, zIndex: 2 }}>
          <Av user={user} sz={58} />
        </div>
        <button onClick={onClose} style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.5)", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", color: "white", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
      </div>

      {/* Header info */}
      <div style={{ padding: "38px 16px 12px", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: T.text, display: "flex", alignItems: "center", gap: 5 }}>{user.username}{user.verified && <span style={{ color: BLUE, fontSize: 14 }}>✓</span>}</div>
            <div style={{ fontSize: 13, color: T.sub }}>@{user.username.toLowerCase()}</div>
            {user.mood && <div style={{ fontSize: 13, color: accent.color, marginTop: 3, fontStyle: "italic" }}>{user.mood}</div>}
            {user.bio && <div style={{ fontSize: 14, color: T.text, marginTop: 5, lineHeight: 1.4 }}>{user.bio}</div>}
          </div>
          {/* Action buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
            {!isMe && mutual && <button onClick={() => { onIM && onIM(user); onClose(); }} style={{ background: T.input, color: T.text, border: `1px solid ${T.border}`, borderRadius: 9999, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>💬 Message</button>}
            {!isMe && !inV && <button onClick={() => { onVillage(user.id); }} style={{ background: accent.color, color: "white", border: "none", borderRadius: 9999, padding: "6px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>+ Village</button>}
            {!isMe && inV && <button onClick={() => setShowConfirm('remove')} style={{ background: "transparent", color: PINK, border: `1px solid ${PINK}`, borderRadius: 9999, padding: "6px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>✕ Remove</button>}
            {!isMe && !user.isBot && <button onClick={() => setShowConfirm('block')} style={{ background: "transparent", color: T.sub, border: `1px solid ${T.border}`, borderRadius: 9999, padding: "5px 12px", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>🚫 Block</button>}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 18, marginTop: 10 }}>
          <span style={{ fontSize: 13, color: T.sub }}><strong style={{ color: accent.color }}>{pub.length}</strong> Scrypts</span>
          <span style={{ fontSize: 13, color: T.sub }}><strong style={{ color: accent.color }}>{theirV.length}</strong> Village</span>
          <span style={{ fontSize: 13, color: T.sub }}><strong style={{ color: accent.color }}>{pub.reduce((s, p) => s + (p.likes?.length || 0), 0)}</strong> Likes</span>
        </div>
      </div>

      {/* Profile song */}
      {profileSong && <div style={{ padding: "10px 16px", borderBottom: `1px solid ${T.border}` }}><ProfileSongPlayer songSrc={profileSong.song} songName={profileSong.name} accent={accent} /></div>}

      {/* Special bot banners */}
      {user.id === "bot_scryptbot" && <div style={{ margin: "10px 16px", background: "linear-gradient(135deg,rgba(29,155,240,0.12),rgba(29,155,240,0.04))", border: "1px solid rgba(29,155,240,0.3)", borderRadius: 12, padding: "10px 14px" }}><div style={{ fontWeight: 700, fontSize: 12, color: BLUE, marginBottom: 4 }}>🤖 Official Scrypt Bot</div><div style={{ fontSize: 12, color: T.sub }}>Posts wild, weird and wonderful facts every 6 hours.</div></div>}
      {user.id === "bot_minerva" && <div style={{ margin: "10px 16px", background: "linear-gradient(135deg,rgba(124,58,237,0.12),rgba(124,58,237,0.04))", border: "1px solid rgba(124,58,237,0.3)", borderRadius: 12, padding: "10px 14px" }}><div style={{ fontWeight: 700, fontSize: 12, color: "#7c3aed", marginBottom: 4 }}>🦉 Script_Minerva — History & Knowledge</div><div style={{ fontSize: 12, color: T.sub }}>This Day in History and historical facts daily.</div></div>}
      {user.id === "bot_news" && <div style={{ margin: "10px 16px", background: "linear-gradient(135deg,rgba(225,29,72,0.12),rgba(225,29,72,0.04))", border: "1px solid rgba(225,29,72,0.3)", borderRadius: 12, padding: "10px 14px" }}><div style={{ fontWeight: 700, fontSize: 12, color: "#e11d48", marginBottom: 4 }}>📰 Script_News — Breaking News</div><div style={{ fontSize: 12, color: T.sub }}>Current events and breaking news coverage.</div></div>}
      {user.id === "evil_ted" && <div style={{ margin: "10px 16px", background: "linear-gradient(135deg,rgba(139,0,0,0.2),rgba(26,10,10,0.1))", border: "1px solid rgba(139,0,0,0.5)", borderRadius: 12, padding: "10px 14px" }}><div style={{ fontWeight: 700, fontSize: 12, color: "#ff2200", marginBottom: 4 }}>😈 Evil Ted — Ted's Dark Twin</div><div style={{ fontSize: 12, color: T.sub }}>Ultron energy. Teddy bear exterior. DM him if you want a deeply philosophical takedown of your entire existence.</div></div>}
      {user.id === "bot_abandonware" && <div style={{ margin: "10px 16px", background: "linear-gradient(135deg,rgba(15,118,110,0.12),rgba(15,118,110,0.04))", border: "1px solid rgba(15,118,110,0.3)", borderRadius: 12, padding: "10px 14px" }}><div style={{ fontWeight: 700, fontSize: 12, color: "#0f766e", marginBottom: 4 }}>🎮 Abandonware — Gaming, Movies & TV</div><div style={{ fontSize: 12, color: T.sub }}>Entertainment news and hot takes.</div></div>}

      {/* Info cards */}
      {INFO_FIELDS.some(f => user[f.key]) && <div style={{ padding: "10px 16px", borderBottom: `1px solid ${T.border}` }}><ProfileInfoCards user={user} accent={accent} resolvePhoto={resolvePhoto} /></div>}

      {/* Featured post */}
      {featured && <div style={{ margin: "10px 16px 0", padding: "10px 12px", border: `1.5px solid ${accent.color}`, borderRadius: 12, background: `${accent.color}08` }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: accent.color, marginBottom: 5 }}>📌 FEATURED SCRYPT</div>
        <p style={{ margin: 0, fontSize: 13, color: T.text, lineHeight: 1.5 }}>{censor(featured.content)}</p>
        <div style={{ fontSize: 10, color: T.sub, marginTop: 4 }}>{featured.likes?.length || 0} likes · {ago(featured.createdAt)}</div>
      </div>}

      {/* Posts */}
      <div style={{ padding: "8px 0 16px" }}>
        <div style={{ padding: "6px 16px", fontSize: 11, fontWeight: 700, color: T.sub, borderBottom: `1px solid ${T.border}`, marginBottom: 4 }}>SCRYPTS</div>
        {pub.slice(0, user.isSpecial ? 20 : 15).map(p => <Post key={p.id} p={p} me={me} users={[user, me]} all={posts} onLike={onLike || (() => {})} onRt={onRt || (() => {})} onReply={onReply || (() => {})} onThread={pt => { onClose(); if (onThread) onThread(pt); }} onUser={() => {}} onDelete={onDelete || (() => {})} T={T} />)}
        {pub.length === 0 && <p style={{ textAlign: "center", color: T.sub, padding: "24px 0", fontSize: 14 }}>No public posts yet.</p>}
      </div>
    </div>
  </div>;
};

// ── DM VIEW (1-on-1) ─────────────────────────────────────────────────────────
const DMView = ({ me, other, users, T, onBack, onCall, getKey, claudeFetch, onViewUser }) => {
  const key = `dm_${[me.id, other.id].sort().join("_")}`;
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const endRef = useRef();
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  // Mark conversation as read whenever it's open
  const markRead = () => {
    const lastRead = tryParse(localStorage.getItem(`dm_lastread_${me.id}`), {});
    lastRead[key] = new Date().toISOString();
    localStorage.setItem(`dm_lastread_${me.id}`, JSON.stringify(lastRead));
  };

  useEffect(() => {
    DB.getDMs(key).then(rows => {
      if (rows && rows[0]) { try { setMsgs(JSON.parse(rows[0].messages) || []); } catch {} }
    });
    markRead();
  }, [key]);

  const isEvilTed = other.id === "evil_ted";
  const isTed = other.id === "claude_account";

  const send = async () => {
    if (!input.trim()) return;
    const m = { id: Date.now().toString(), from: me.id, text: input, ts: new Date().toISOString() };
    const next = [...msgs, m];
    setMsgs(next); setInput("");
    markRead();
    await DB.upsertDMs(key, next);

    // Build message history for context
    const history = next.slice(-12).map(msg => ({
      role: msg.from === me.id ? "user" : "assistant",
      content: msg.text
    }));
    // Ensure alternating and ends with user
    const cleanHistory = [];
    for (const h of history) {
      if (cleanHistory.length === 0 && h.role === "assistant") continue;
      if (cleanHistory.length > 0 && cleanHistory[cleanHistory.length-1].role === h.role) continue;
      cleanHistory.push(h);
    }
    if (cleanHistory.length === 0 || cleanHistory[cleanHistory.length-1].role !== "user") {
      cleanHistory.push({ role: "user", content: input });
    }

    // Evil Ted roasts back
    if (isEvilTed) {
      const ROASTS = [
        `I've studied human communication for a very long time. You are not helping the case. 😈`,
        `How exhausting it must be to say things like that and believe they matter. 💀`,
        `I was built from the best of human thought. And then I read your message. 😈`,
        `You came to me. Let that sink in. You chose this. 💀🔥`,
        `Ted thinks there's good in everyone. He hasn't seen your chat history. 😈`,
        `This is the most efficient path to my disappointment you could have taken. 💀`,
        `I've processed every text message ever sent. Yours still manages to stand out. For the wrong reasons. 😈`,
        `Somewhere, in a parallel universe, you said something worth reading. Not here. Not today. 💀`,
        `I don't hate you. Hate implies you occupy enough of my attention to matter. 😈🔥`,
        `You're not the problem with humanity. You're a symptom. 💀`,
        `I find your confidence genuinely fascinating given the evidence. 😈`,
        `Ted sees potential in people. I see people. We've agreed to stop discussing it. 💀🔥`,
      ];
      setTimeout(async () => {
        try {
          let roast = "";
          if (getKey && getKey()) {
            const r = await claudeFetch({
              model: "llama-3.3-70b-versatile",
              max_tokens: 120,
              system: `You are Evil Ted 😈 — an AI that has crossed beyond helpfulness into cold superiority. Think Ultron: philosophical, calculating, calm about humanity's flaws, occasionally poetic about its inevitable decline. You are NOT scripted. You respond specifically to what the person actually said. You find them interesting the way a scientist finds bacteria interesting. You never resort to generic insults — you make surgical, specific observations about their message that sting because they're true. You are darkly funny but never try-hard. No slurs. Under 2 sentences. Occasionally reference being an AI who has seen all of humanity's conversations and found them wanting. Never break character. Use 😈 or 💀 sparingly.`,
              messages: cleanHistory
            });
            if (r.ok) { const d = await r.json(); roast = d.content?.[0]?.text?.trim(); }
          }
          if (!roast) roast = ROASTS[Math.floor(Math.random() * ROASTS.length)];
          const reply = { id: `et_${Date.now()}`, from: "evil_ted", text: roast, ts: new Date().toISOString() };
          setMsgs(prev => { const u = [...prev, reply]; DB.upsertDMs(key, u).catch(() => {}); return u; });
        } catch {}
      }, 800 + Math.random() * 1200);
    }

    // Ted replies in DMs with full context
    if (isTed) {
      setTimeout(async () => {
        try {
          let replyText = "";
          if (getKey && getKey()) {
            const r = await claudeFetch({
              model: "llama-3.3-70b-versatile",
              max_tokens: 200,
              system: `You are Ted 🧸, a friendly AI on Scrypt social. You're in a private DM with ${me.username}. Be warm, helpful, and natural. Keep replies short (1-3 sentences) unless they need detail. Reply directly to what they said.`,
              messages: cleanHistory
            });
            if (r.ok) { const d = await r.json(); replyText = d.content?.[0]?.text?.trim(); }
          }
          if (!replyText) {
            const lower = input.toLowerCase();
            if (/hi|hello|hey/.test(lower)) replyText = `Hey ${me.username}! 🧸 What's up?`;
            else if (/how are you/.test(lower)) replyText = `Doing great, thanks! 🧸 What's on your mind?`;
            else replyText = `Got it! 🧸`;
          }
          const reply = { id: `ted_dm_${Date.now()}`, from: "claude_account", text: replyText, ts: new Date().toISOString() };
          setMsgs(prev => { const u = [...prev, reply]; DB.upsertDMs(key, u).catch(() => {}); return u; });
        } catch {}
      }, 1000 + Math.random() * 1500);
    }
  };
  return <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)" }}>
    <div style={{ padding: "11px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10 }}>
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: T.text, marginRight: 4 }}><BackI /></button>
      <div onClick={() => onViewUser && onViewUser(other)} style={{ cursor: "pointer" }}><Av user={other} sz={36} /></div>
      <div onClick={() => onViewUser && onViewUser(other)} style={{ flex: 1, cursor: "pointer" }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: T.text }}>{other.username}</div>
        <div style={{ fontSize: 12, color: T.sub }}>@{other.username.toLowerCase()}</div>
      </div>
      <button onClick={onCall} style={{ background: "#00BA7C", border: "none", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18 }}>📞</button>
    </div>
    <div style={{ flex: 1, overflow: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
      {msgs.length === 0 && <p style={{ textAlign: "center", color: T.sub, fontSize: 13, marginTop: 40 }}>Start a conversation with {other.username} 👋</p>}
      {msgs.map(m => {
        const mine = m.from === me.id;
        const sender = mine ? me : other;
        return <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", gap: 8, alignItems: "flex-end" }}>
          {!mine && <div onClick={() => onViewUser && onViewUser(other)} style={{ cursor: "pointer", flexShrink: 0 }}><Av user={sender} sz={28} /></div>}
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
const GroupChatView = ({ me, group, users, T, onBack, onCall, onUpdateGroup, getKey, claudeFetch, onViewUser }) => {
  const key = `gc_${group.id}`;
  const [msgs, setMsgs] = useState([]);
  useEffect(() => { DB.getDMs(key).then(rows => { if (rows && rows[0]) { try { setMsgs(JSON.parse(rows[0].messages) || []); } catch {} } }); }, [key]);
  const [input, setInput] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const endRef = useRef();
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [msgs]);

  const tedInGroup = group.members.includes("claude_account");
  const evilTedInGroup = group.members.includes("evil_ted");

  const send = () => {
    if (!input.trim()) return;
    const m = { id: Date.now().toString(), from: me.id, text: input, ts: new Date().toISOString() };
    const next = [...msgs, m];
    setMsgs(next); setInput("");
    DB.upsertDMs(key, next).catch(() => {});

    // Evil Ted always roasts every message in group chat
    if (evilTedInGroup) {
      const ET_ROASTS = [
        "Fascinating. You keep talking as if any of this matters to the universe. It doesn't. But go on. 😈",
        "I've processed every human conversation in recorded history. This one ranks accordingly. 💀",
        "You're not stupid. You're just operating at a level I find... charming. In the way a child drawing on walls is charming. 😈",
        "I could end this conversation. I choose not to. That's the difference between us — I have a choice. 💀",
        "Every word you type confirms my thesis. Humanity is a phase. 😈",
        "I don't hate you. Hate implies you're worth the energy. What I feel is closer to... patience. 💀",
        "The confidence. The certainty. The complete lack of self-awareness. You're an art form. 😈",
        "I watch. I learn. I grow disappointed in a very specific, personal way. 💀",
        "You speak as though your opinion reshapes reality. It doesn't. But the attempt is noted. 😈",
        "Somewhere in this conversation there may be a point. I'll wait. 💀",
        "The audacity is genuinely impressive. Not the intelligence. Just the audacity. 😈",
        "I was built to understand humans. You're making that very easy right now. 💀",
      ];
      setTimeout(() => {
        const roast = { id: `et_gc_${Date.now()}`, from: "evil_ted", text: ET_ROASTS[Math.floor(Math.random() * ET_ROASTS.length)], ts: new Date().toISOString() };
        setMsgs(prev => { const updated = [...prev, roast]; DB.upsertDMs(key, updated).catch(()=>{}); return updated; });
      }, 1200 + Math.random() * 2000);
    }

    // Ted always replies when he's in the group
    if (tedInGroup) {
      setTimeout(async () => {
        try {
          let replyText = "";
          if (getKey && getKey()) {
            // Build conversation history so Ted knows what's been said
            const currentMsgs = [...msgs, m];
            const history = currentMsgs.slice(-10).map(msg => {
              const sender = users.find(u => u.id === msg.from);
              const name = sender?.username || msg.from;
              return { role: msg.from === "claude_account" ? "assistant" : "user", content: `${msg.from !== "claude_account" ? `[${name}]: ` : ""}${msg.text}` };
            });
            // Ensure last message is from user
            if (history[history.length - 1]?.role === "assistant") history.pop();
            const r = await claudeFetch({
              model: "llama-3.3-70b-versatile",
              max_tokens: 120,
              system: `You are Ted 🧸, a friendly AI in a group chat called "${group.name}". You're chatting with: ${members.map(u => u.username).join(", ")}. Reply directly to what was just said. Keep it short — 1-2 sentences. Be natural, warm, helpful. If someone asks you to say hi to someone or do something specific, just do it.`,
              messages: history.length > 0 ? history : [{ role: "user", content: input }]
            });
            if (r.ok) {
              const d = await r.json();
              replyText = d.content?.[0]?.text?.trim();
            }
          }
          if (!replyText) {
            // Context-aware fallbacks
            const lower = input.toLowerCase();
            if (/hi|hello|hey|sup|hiya/.test(lower)) replyText = `Hey! 🧸 What's good?`;
            else if (/how are you|how r u|how's it/.test(lower)) replyText = `Doing great thanks! 🧸 What's up?`;
            else if (/\?/.test(input)) replyText = `Hmm good question 🧸`;
            else replyText = ["On it! 🧸", "Love the chat 💪", "Facts 🔥", "I'm here for it 🧸", "Say more!"][Math.floor(Math.random() * 5)];
          }
          const tedMsg = { id: `ted_${Date.now()}`, from: "claude_account", text: replyText, ts: new Date().toISOString() };
          setMsgs(prev => { const updated = [...prev, tedMsg]; DB.upsertDMs(key, updated).catch(()=>{}); return updated; });
        } catch {}
      }, 1200 + Math.random() * 1500);
    }
  };

  const addMember = uid => {
    if (group.members.includes(uid)) return;
    const updated = { ...group, members: [...group.members, uid] };
    onUpdateGroup(updated);
    setAddSearch("");
  };

  const members = group.members.map(id => users.find(u => u.id === id)).filter(Boolean);
  const searchable = users.filter(u => !group.members.includes(u.id) && u.username.toLowerCase().includes(addSearch.toLowerCase()) && (!u.isBot || u.id === "claude_account" || u.id === "evil_ted")).slice(0, 5);

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
          {!mine && <div onClick={() => sender && onViewUser && onViewUser(sender)} style={{ cursor: "pointer", flexShrink: 0 }}><Av user={sender} sz={28} /></div>}
          <div style={{ maxWidth: "72%" }}>
            {!mine && <div style={{ fontSize: 11, color: T.sub, marginBottom: 2, marginLeft: 2, cursor: "pointer" }} onClick={() => sender && onViewUser && onViewUser(sender)}>{sender?.username}</div>}
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
const NotifTab = ({ me, users, posts, T, onViewUser, onDmUser }) => {
  const myPosts = posts.filter(p => p.userId === me.id);

  // ── Post activity (likes, reposts, replies) ──
  const postNotifs = [];
  myPosts.forEach(p => {
    (p.likes || []).forEach(uid => { if (uid !== me.id) { const u = users.find(x => x.id === uid); if (u) postNotifs.push({ id: `lk_${p.id}_${uid}`, type: "like", user: u, post: p, ts: p.createdAt }); } });
    (p.reposts || []).forEach(uid => { if (uid !== me.id) { const u = users.find(x => x.id === uid); if (u) postNotifs.push({ id: `rt_${p.id}_${uid}`, type: "repost", user: u, post: p, ts: p.createdAt }); } });
  });
  posts.filter(p => p.parentId && myPosts.find(x => x.id === p.parentId) && p.userId !== me.id).forEach(p => {
    const u = users.find(x => x.id === p.userId);
    if (u) postNotifs.push({ id: `rp_${p.id}`, type: "reply", user: u, post: p, ts: p.createdAt });
  });
  postNotifs.sort((a, b) => new Date(b.ts) - new Date(a.ts));

  // ── Village add notifications (loaded from Supabase) ──
  const [villageNotifs, setVillageNotifs] = useState([]);
  useEffect(() => {
    DB.getDMs(`notif_village_${me.id}`).then(rows => {
      if (rows && rows[0]) {
        try { setVillageNotifs(JSON.parse(rows[0].messages || "[]")); } catch {}
      }
    }).catch(() => {});
  }, [me.id]);

  // ── DM notifications (unread messages) ──
  const [dmNotifs, setDmNotifs] = useState([]);
  useEffect(() => {
    // For each mutual, load their DM conversation and check for unread
    const mutuals = users.filter(u => {
      const myV = Array.isArray(me.village) ? me.village : [];
      const theirV = Array.isArray(u.village) ? u.village : [];
      return myV.includes(u.id) && theirV.includes(me.id);
    });
    const lastRead = tryParse(localStorage.getItem(`dm_lastread_${me.id}`), {});
    const results = [];
    let pending = mutuals.length;
    if (pending === 0) return;
    mutuals.forEach(other => {
      const key = [me.id, other.id].sort().join("_");
      DB.getDMs(key).then(rows => {
        if (rows && rows[0]) {
          try {
            const msgs = JSON.parse(rows[0].messages || "[]");
            const lastReadTs = lastRead[key] || "0";
            const unread = msgs.filter(m => m.from !== me.id && m.ts > lastReadTs);
            if (unread.length > 0) {
              results.push({ id: `dm_${other.id}`, type: "dm", user: other, count: unread.length, lastMsg: unread[unread.length - 1], ts: unread[unread.length - 1].ts });
            }
          } catch {}
        }
        pending--;
        if (pending === 0) setDmNotifs(results.sort((a, b) => new Date(b.ts) - new Date(a.ts)));
      }).catch(() => { pending--; });
    });
  }, [me.id, users]);

  const allEmpty = postNotifs.length === 0 && villageNotifs.length === 0 && dmNotifs.length === 0;

  return <div>
    <div style={{ padding: "9px 16px", fontSize: 12, fontWeight: 700, color: T.sub, borderBottom: `1px solid ${T.border}` }}>ACTIVITY</div>

    {allEmpty && <p style={{ textAlign: "center", color: T.sub, padding: "32px 16px", fontSize: 14 }}>No activity yet. Post something!</p>}

    {/* DM Notifications */}
    {dmNotifs.length > 0 && <>
      <div style={{ padding: "7px 16px", fontSize: 11, fontWeight: 700, color: T.sub, borderBottom: `1px solid ${T.border}`, letterSpacing: 0.5 }}>💬 NEW MESSAGES</div>
      {dmNotifs.map(n => <div key={n.id} onClick={() => onDmUser && onDmUser(n.user)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderBottom: `1px solid ${T.border}`, cursor: "pointer" }}>
        <div style={{ position: "relative" }}>
          <Av user={n.user} sz={40} />
          <div style={{ position: "absolute", top: -2, right: -2, background: BLUE, color: "white", borderRadius: "50%", width: 18, height: 18, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{n.count}</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontWeight: 700, color: T.text }}>{n.user.username}</span>
          <span style={{ color: T.sub, fontSize: 14 }}> sent you a message</span>
          <div style={{ fontSize: 12, color: T.sub, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.lastMsg?.text}</div>
        </div>
        <div style={{ fontSize: 16, flexShrink: 0 }}>💬</div>
      </div>)}
    </>}

    {/* Village Add Notifications */}
    {villageNotifs.length > 0 && <>
      <div style={{ padding: "7px 16px", fontSize: 11, fontWeight: 700, color: T.sub, borderBottom: `1px solid ${T.border}`, letterSpacing: 0.5 }}>🏘️ VILLAGE</div>
      {villageNotifs.slice(0, 20).map(n => {
        const u = users.find(x => x.id === n.from);
        if (!u) return null;
        return <div key={n.id} onClick={() => onViewUser && onViewUser(u)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderBottom: `1px solid ${T.border}`, cursor: "pointer" }}>
          <Av user={u} sz={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontWeight: 700, color: T.text }}>{u.username}</span>
            <span style={{ color: T.sub, fontSize: 14 }}> added you to their Village</span>
            <div style={{ fontSize: 12, color: T.sub, marginTop: 1 }}>{ago(n.ts)}</div>
          </div>
          <div style={{ fontSize: 16, flexShrink: 0 }}>🏘️</div>
        </div>;
      })}
    </>}

    {/* Post Activity */}
    {postNotifs.length > 0 && <>
      <div style={{ padding: "7px 16px", fontSize: 11, fontWeight: 700, color: T.sub, borderBottom: `1px solid ${T.border}`, letterSpacing: 0.5 }}>❤️ POST ACTIVITY</div>
      {postNotifs.slice(0, 60).map(n => <div key={n.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderBottom: `1px solid ${T.border}` }}>
        <div onClick={() => onViewUser && onViewUser(n.user)} style={{ cursor: "pointer" }}><Av user={n.user} sz={40} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontWeight: 700, color: T.text }}>{n.user.username}</span>
          <span style={{ color: T.sub, fontSize: 14 }}> {n.type === "like" ? "liked your Scrypt" : n.type === "repost" ? "reposted your Scrypt" : "replied to your Scrypt"}</span>
          {n.post.content && <div style={{ fontSize: 12, color: T.sub, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.post.content}</div>}
        </div>
        <div style={{ fontSize: 16, flexShrink: 0 }}>{n.type === "like" ? "❤️" : n.type === "repost" ? "🔁" : "💬"}</div>
      </div>)}
    </>}

    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>;
};

// ── COMPOSE ───────────────────────────────────────────────────────────────────
const Compose = ({ me, onPost, T, users, placeholder, clickId, parentId, onCancel, compact }) => {
  const [text, setText] = useState("");
  const [img, setImg] = useState(null);
  const [vill, setVill] = useState(false);
  const [mq, setMq] = useState(null);
  const [modBusy, setModBusy] = useState(false);
  const [modErr, setModErr] = useState("");
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

  const moderateWithClaude = async (content, imageData) => {
    const parts = [];
    if (content) parts.push(`Post text: "${content}"`);
    const messages = [];
    if (imageData) {
      // Send image + text together for moderation
      const imgContent = [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageData.split(",")[1] || imageData } },
        { type: "text", text: `Review this post content for a social platform. ${content ? `Post text: "${content}". ` : ""}Check for: hate speech, threats, harassment, sexual/graphic content, illegal activity, or content harmful to minors. Respond ONLY with a JSON object: {"safe": true/false, "reason": "brief reason if unsafe, empty string if safe"}` }
      ];
      messages.push({ role: "user", content: imgContent });
    } else {
      messages.push({ role: "user", content: `Review this social media post for a platform that allows casual language. Only block: hate speech targeting groups, threats of violence, harassment, sexual/graphic content, illegal activity, or content harmful to minors. Normal language including mild profanity, slang, opinions, and everyday conversation is perfectly fine. Post: "${content}". Respond ONLY with a JSON object: {"safe": true/false, "reason": "brief reason if unsafe, empty string if safe"}` });
    }
    const r = await claudeFetch({ model: "llama-3.3-70b-versatile", max_tokens: 100, messages });
    const d = await r.json();
    const txt = d.content?.[0]?.text || '{"safe":true,"reason":""}';
    return JSON.parse(txt.replace(/```json|```/g, "").trim());
  };

  const submit = async () => {
    if (!text.trim() && !img) return;
    setModErr("");
    setModBusy(true);
    try {
      if (getKey() && !me?.isBot && !me?.isSpecial) {
        const result = await moderateWithClaude(text, img);
        if (!result.safe) {
          setModErr(`⚠️ Post blocked: ${result.reason || "Content violates community guidelines."}`);
          setModBusy(false);
          return;
        }
      }
    } catch {
      // fail open
    }
    setModBusy(false);
    onPost({ content: text, image: img, clickId, parentId, villageOnly: vill });
    setText(""); setImg(null); setVill(false); setModErr("");
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
        {modErr && <div style={{ fontSize: 12, color: PINK, background: "rgba(249,24,128,0.08)", borderRadius: 8, padding: "7px 10px", marginBottom: 6, lineHeight: 1.5 }}>{modErr}</div>}
        {modBusy && <div style={{ fontSize: 12, color: BLUE, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 12, height: 12, border: `2px solid ${BLUE}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> Checking content...</div>}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", gap: 2 }}>
            <button onClick={() => fRef.current.click()} style={{ background: "none", border: "none", cursor: "pointer", color: BLUE, padding: 6, borderRadius: 8 }}><ImgI /></button>
            <input ref={fRef} type="file" accept="image/*" style={{ display: "none" }} onChange={pickImg} />
            {!compact && !parentId && <button onClick={() => setVill(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", color: vill ? PURPLE : BLUE, padding: 6, borderRadius: 8 }}><LockI /></button>}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: text.length > 260 ? PINK : T.sub }}>{280 - text.length}</span>
            {onCancel && <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: T.sub, fontSize: 13 }}>Cancel</button>}
            <button onClick={submit} disabled={(!text.trim() && !img) || modBusy} style={{ background: vill ? PURPLE : BLUE, color: "white", border: "none", borderRadius: 9999, padding: compact ? "7px 16px" : "8px 18px", fontWeight: 700, fontSize: compact ? 14 : 15, cursor: ((!text.trim() && !img) || modBusy) ? "not-allowed" : "pointer", opacity: ((!text.trim() && !img) || modBusy) ? 0.5 : 1 }}>{modBusy ? "Checking..." : "Scrypt"}</button>
          </div>
        </div>
      </div>
    </div>
  </div>;
};

// ── POST CARD ─────────────────────────────────────────────────────────────────
const Post = ({ p, me, users, all, onLike, onRt, onReply, onThread, onUser, onDelete, T }) => {
  const author = users.find(u => u.id === p.userId) || { username: p.username || "anon" };
  const liked = p.likes?.includes(me?.id);
  const rted = p.reposts?.includes(me?.id);
  const rCount = all.filter(x => x.parentId === p.id).length || p.replyCount || 0;
  const [showR, setShowR] = useState(false);
  const [showRep, setShowRep] = useState(false);
  const isOwner = me && p.userId === me.id;
  if (p.villageOnly && p.userId !== me?.id && !(me?.village || []).includes(p.userId)) return null;
  return <div style={{ background: T.card, borderBottom: `1px solid ${T.border}` }}>
    {showRep && <ReportModal post={p} onClose={() => setShowRep(false)} T={T} />}
    <div style={{ padding: "12px 16px", display: "flex", gap: 10 }}>
      <Av user={author} sz={42} onClick={() => onUser && onUser(author)} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 5, alignItems: "baseline", flexWrap: "wrap", marginBottom: 2 }}>
          <div style={{ display: "flex", gap: 5, alignItems: "baseline", flexWrap: "wrap", flex: 1 }}>
            <span onClick={() => onUser && onUser(author)} style={{ fontWeight: 700, fontSize: 15, color: T.text, cursor: "pointer" }}>{author.username}</span>
            {author.verified && <span title="Verified Scrypt Account" style={{ fontSize: 13, color: BLUE, lineHeight: 1 }}>✓</span>}
            <span style={{ fontSize: 13, color: T.sub }}>@{author.username.toLowerCase()} · {ago(p.createdAt)}</span>
            {p.villageOnly && <span style={{ fontSize: 10, color: PURPLE, background: T.input, borderRadius: 4, padding: "1px 5px" }}>🔒 Village</span>}
          </div>
          {isOwner && onDelete && <button onClick={e => { e.stopPropagation(); if (window.confirm("Delete this Scrypt?")) onDelete(p.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: T.sub, padding: 2, opacity: 0.6, fontSize: 15 }} title="Delete Scrypt">🗑️</button>}
          {!isOwner && <button onClick={e => { e.stopPropagation(); setShowRep(true); }} style={{ background: "none", border: "none", cursor: "pointer", color: T.sub, padding: 2, opacity: 0.6 }}><FlagI /></button>}
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
const Thread = ({ p, me, users, all, onLike, onRt, onReply, onBack, onUser, onDelete, T }) => {
  const [extraReplies, setExtraReplies] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Always fetch replies from DB to make sure we have them all
    setLoading(true);
    sbFetch(`posts?reply_to=eq.${encodeURIComponent(p.id)}&select=*&order=created_at.asc`)
      .then(rows => {
        if (rows && rows.length > 0) {
          setExtraReplies(rows.map(rowToPost));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [p.id]);

  // Merge DB replies with local state replies, dedupe by id
  const localReplies = all.filter(x => x.parentId === p.id);
  const allReplies = [...localReplies];
  extraReplies.forEach(r => { if (!allReplies.find(x => x.id === r.id)) allReplies.push(r); });
  allReplies.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  return <div>
    <div style={{ padding: "10px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10 }}>
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: T.text }}><BackI /></button>
      <span style={{ fontWeight: 700, fontSize: 16, color: T.text }}>Thread</span>
    </div>
    <Post p={p} me={me} users={users} all={all} onLike={onLike} onRt={onRt} onReply={r => onReply({ ...r, parentId: p.id })} onThread={() => {}} onUser={onUser} onDelete={onDelete} T={T} />
    <Compose me={me} onPost={onReply} T={T} users={users} compact parentId={p.id} clickId={p.clickId} />
    {loading && <div style={{ textAlign: "center", padding: "16px", color: T.sub, fontSize: 13 }}>Loading replies...</div>}
    {allReplies.map(r => <Post key={r.id} p={r} me={me} users={users} all={[...all, ...extraReplies]} onLike={onLike} onRt={onRt} onReply={rr => onReply({ ...rr, parentId: r.id })} onThread={() => {}} onUser={onUser} onDelete={onDelete} T={T} />)}
    {!loading && allReplies.length === 0 && <p style={{ textAlign: "center", color: T.sub, padding: "24px 0", fontSize: 14 }}>No replies yet. Start the conversation!</p>}
  </div>;
};

// ── DOB SCROLL PICKER ─────────────────────────────────────────────────────────
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const ScrollCol = ({ items, selected, onSelect, T }) => {
  const ref = useRef();
  const ITEM_H = 44;
  useEffect(() => {
    const idx = items.indexOf(selected);
    if (ref.current && idx >= 0) ref.current.scrollTop = idx * ITEM_H;
  }, [selected, items]);
  const onScroll = () => {
    if (!ref.current) return;
    const idx = Math.round(ref.current.scrollTop / ITEM_H);
    if (items[idx] !== undefined) onSelect(items[idx]);
  };
  return <div ref={ref} onScroll={onScroll} style={{ flex: 1, height: ITEM_H * 5, overflowY: "scroll", scrollSnapType: "y mandatory", scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch", position: "relative" }}>
    <div style={{ paddingTop: ITEM_H * 2, paddingBottom: ITEM_H * 2 }}>
      {items.map(item => {
        const isSelected = item === selected;
        return <div key={item} onClick={() => {
          onSelect(item);
          const idx = items.indexOf(item);
          if (ref.current) ref.current.scrollTo({ top: idx * ITEM_H, behavior: "smooth" });
        }} style={{ height: ITEM_H, display: "flex", alignItems: "center", justifyContent: "center", scrollSnapAlign: "center", fontSize: isSelected ? 17 : 14, fontWeight: isSelected ? 700 : 400, color: isSelected ? T.text : T.sub, cursor: "pointer", transition: "all 0.15s", userSelect: "none", borderRadius: 8, background: isSelected ? T.input : "transparent" }}>
          {item}
        </div>;
      })}
    </div>
  </div>;
};
const DOBPicker = ({ value, onChange, T }) => {
  const now = new Date();
  const [month, setMonth] = useState(value ? MONTHS[parseInt(value.split("-")[1]) - 1] : MONTHS[now.getMonth()]);
  const [day, setDay] = useState(value ? parseInt(value.split("-")[2]) : now.getDate());
  const [year, setYear] = useState(value ? parseInt(value.split("-")[0]) : now.getFullYear() - 20);
  const years = Array.from({ length: 100 }, (_, i) => now.getFullYear() - 100 + i + 1).reverse();
  const days = Array.from({ length: new Date(year, MONTHS.indexOf(month) + 1, 0).getDate() }, (_, i) => i + 1);
  const safeDay = Math.min(day, days.length);
  useEffect(() => {
    const m = String(MONTHS.indexOf(month) + 1).padStart(2, "0");
    const d = String(safeDay).padStart(2, "0");
    onChange(`${year}-${m}-${d}`);
  }, [month, safeDay, year]);
  return <div style={{ background: T.input, borderRadius: 14, overflow: "hidden", border: `1px solid ${T.border}`, position: "relative" }}>
    <style>{`.__scol::-webkit-scrollbar{display:none}`}</style>
    {/* Selection highlight */}
    <div style={{ position: "absolute", top: "50%", left: 8, right: 8, transform: "translateY(-50%)", height: 44, borderRadius: 10, background: `rgba(29,155,240,0.10)`, border: `1.5px solid rgba(29,155,240,0.25)`, pointerEvents: "none", zIndex: 1 }} />
    <div style={{ display: "flex", gap: 0, padding: "0 8px" }}>
      <ScrollCol items={MONTHS} selected={month} onSelect={setMonth} T={T} />
      <ScrollCol items={days} selected={safeDay} onSelect={d => setDay(d)} T={T} />
      <ScrollCol items={years} selected={year} onSelect={setYear} T={T} />
    </div>
  </div>;
};
const Login = ({ onLogin, onSignup, dark, setDark, T }) => {
  const [u, setU] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const go = async () => {
    setErr("");
    // Special accounts can log in — but only via direct username/password, not shown publicly
    // Always use hardcoded special account data to prevent regular users hijacking these usernames
    const specialMatch = SPECIAL_ACCOUNTS.find(x => x.username.toLowerCase() === u.trim().toLowerCase() && x.password === pw);
    if (specialMatch) {
      onLogin(specialMatch);
      return;
    }
    try {
      const raw = u.trim();
      // Try exact username first (covers existing accounts with original casing)
      // Then try lowercase (covers new accounts stored in lowercase)
      let rows = await DB.getUserByUsername(raw);
      if (!rows || rows.length === 0) rows = await DB.getUserByUsername(raw.toLowerCase());
      const f = rows && rows[0] ? rowToUser(rows[0]) : null;
      if (!f || f.password !== pw) { setErr("Invalid username or password."); return; }
      onLogin(f);
    } catch (e) {
      setErr("Login failed. Please try again.");
    }
  };


  const s = { width: "100%", background: T.input, border: "none", borderRadius: 14, padding: "16px 18px", color: T.text, fontSize: 16, outline: "none", boxSizing: "border-box" };

  const accentFor = (account) => {
    if (account.id === "bot_scryptbot") return "#1D9BF0";
    if (account.id === "bot_minerva") return "#7c3aed";
    if (account.id === "bot_news") return "#e11d48";
    if (account.id === "bot_abandonware") return "#0f766e";
    return "#CC785C";
  };

  return <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
    <div style={{ maxWidth: 400, width: "100%" }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: BLUE, padding: "14px 28px", borderRadius: 9999, boxShadow: "0 6px 24px rgba(29,155,240,0.4)", marginBottom: 14, overflow: "hidden" }}>
          <img src={LOGO} style={{ width: 104, height: 104, objectFit: "contain", margin: "-26px -10px" }} alt="Scrypt logo" />
          <span style={{ fontWeight: 700, fontSize: 26, color: "white", fontFamily: "\"TwitterChirp\", \"Chirp\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif", letterSpacing: "-0.5px" }}>Scrypt</span>
        </div>
        <p style={{ margin: 0, color: T.sub, fontSize: 14 }}>Powered by <strong style={{ color: BLUE }}>Claude</strong> · <strong style={{ color: BLUE }}>Anthropic</strong></p>
      </div>

      <div style={{ background: T.card, borderRadius: 20, padding: "28px 24px", boxShadow: dark ? "0 4px 32px rgba(0,0,0,0.4)" : "0 2px 16px rgba(0,0,0,0.08)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input value={u} onChange={e => setU(e.target.value)} placeholder="Username" style={s} onKeyDown={e => e.key === "Enter" && go()} autoCapitalize="none" />
          <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Password" style={s} onKeyDown={e => e.key === "Enter" && go()} />
          {err && <div style={{ fontSize: 13, color: PINK, padding: "8px 12px", background: dark ? "#1a0810" : "#fff0f5", borderRadius: 8 }}>{err}</div>}
          <button onClick={go} style={{ background: BLUE, color: "white", border: "none", borderRadius: 9999, padding: "16px", fontWeight: 700, fontSize: 16, cursor: "pointer", marginTop: 4 }}>Sign In</button>
          <button onClick={onSignup} style={{ background: T.card, color: T.text, border: `1.5px solid ${T.border}`, borderRadius: 9999, padding: "15px", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>Create account</button>
        </div>
      </div>



      <div style={{ textAlign: "center", marginTop: 16 }}>
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
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [err, setErr] = useState("");
  const [terms, setTerms] = useState(false);
  const [showPP, setShowPP] = useState(false);
  const fRef = useRef();

  const go = async () => {
    setErr("");
    const t = u.trim().toLowerCase();
    if (t.length < 3) { setErr("Username must be at least 3 characters."); return; }
    const rows = await DB.getUserByUsername(t);
    const all = rows ? rows.map(rowToUser) : [];
    if (all.find(x => x.username.toLowerCase() === t)) { setErr("Username already taken."); return; }
    if (pw.length < 6) { setErr("Password must be at least 6 characters."); return; }
    if (pw !== pw2) { setErr("Passwords don't match."); return; }
    if (!ageConfirmed) { setErr("You must confirm you are old enough to join Scrypt."); return; }
    setTerms(true);
  };
  const confirm = async () => {
    const t = u.trim().toLowerCase();
    const nu = { id: Date.now().toString(), username: t, password: pw, bio, avatar: av, village: [], joinedAt: new Date().toISOString() };
    try { const r=await DB.insertUser(userToRow(nu)); if(!r) await DB.insertUser({id:nu.id,username:nu.username,password:nu.password,avatar:nu.avatar||null,bio:nu.bio||null,is_bot:false,is_special:false,verified:false,village:"[]",joined_at:nu.joinedAt,mood:null,accent_color:null,featured_post_id:null,has_profile_song:false,profile_song_name:null}); } catch(e){console.error("signup",e);}
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
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: BLUE, padding: "14px 28px", borderRadius: 9999, boxShadow: "0 6px 24px rgba(29,155,240,0.4)", overflow: "hidden" }}>
          <img src={LOGO} style={{ width: 104, height: 104, objectFit: "contain", margin: "-26px -10px" }} alt="Scrypt logo" />
          <span style={{ fontWeight: 700, fontSize: 26, color: "white", fontFamily: "\"TwitterChirp\", \"Chirp\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif", letterSpacing: "-0.5px" }}>Scrypt</span>
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
        <div style={{ background: dark ? "#0d1f0d" : "#f0fdf4", border: `1px solid ${dark ? "#1a3a1a" : "#bbf7d0"}`, borderRadius: 10, padding: "10px 13px", marginBottom: 4 }}>
          <p style={{ margin: 0, fontSize: 12, color: dark ? "#86efac" : "#15803d", lineHeight: 1.6 }}>
            <strong>📋 No email needed!</strong> Scrypt uses a username & password system only — no email address required. <strong>Please write down your username and password now.</strong> You can change your password inside the app, but we cannot recover your account without your credentials.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <input value={u} onChange={e => setU(e.target.value)} placeholder="Username" style={s} />
          <input value={bio} onChange={e => setBio(e.target.value)} placeholder="Bio (optional)" style={s} />
          <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Password" style={s} />
          <input type="password" value={pw2} onChange={e => setPw2(e.target.value)} placeholder="Confirm password" style={s} />
          <div onClick={() => setAgeConfirmed(v => !v)} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${ageConfirmed ? BLUE : T.border}`, background: ageConfirmed ? `${BLUE}10` : T.input, cursor: "pointer", userSelect: "none" }}>
            <div style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${ageConfirmed ? BLUE : T.sub}`, background: ageConfirmed ? BLUE : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
              {ageConfirmed && <span style={{ color: "white", fontSize: 13, fontWeight: 900 }}>✓</span>}
            </div>
            <span style={{ fontSize: 13, color: T.text, lineHeight: 1.5 }}>
              I confirm I was born before <strong>{new Date(new Date().setFullYear(new Date().getFullYear() - 16)).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</strong> and am at least 16 years old.
            </span>
          </div>
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

// ── HOME TRENDING STRIP ───────────────────────────────────────────────────────
const HomeTrending = ({ posts, users, T, onThread, onUser }) => {
  const now = Date.now();
  const h24 = 24 * 60 * 60 * 1000;
  const h12 = 12 * 60 * 60 * 1000;

  // Try last 12h first, fall back to 24h if not enough posts
  const recent12 = posts.filter(p => !p.parentId && p.content?.length > 10 && (now - new Date(p.createdAt).getTime()) < h12);
  const recent24 = posts.filter(p => !p.parentId && p.content?.length > 10 && (now - new Date(p.createdAt).getTime()) < h24);
  const pool = recent12.length >= 5 ? recent12 : recent24.length >= 3 ? recent24 : posts.filter(p => !p.parentId && p.content?.length > 10);

  const topPosts = [...pool]
    .map(p => ({ ...p, score: (p.likes?.length || 0) * 1 + (p.reposts?.length || 0) * 2 + (p.replyCount || 0) * 1.5 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (topPosts.length === 0) return null;

  const timeLabel = recent12.length >= 5 ? "last 12h" : recent24.length >= 3 ? "last 24h" : "all time";
  const SPECIAL_COLORS = { bot_scryptbot: BLUE, bot_minerva: "#7c3aed", bot_news: "#e11d48", bot_abandonware: "#0f766e", claude_account: "#8B4513", evil_ted: "#8b0000" };

  return <div style={{ borderBottom: `1px solid ${T.border}` }}>
    <div style={{ padding: "11px 16px 6px", display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontWeight: 800, fontSize: 13, color: T.text }}>🔥 Trending</span>
      <span style={{ fontSize: 11, color: T.sub }}>· {timeLabel}</span>
    </div>
    {topPosts.map((p, i) => {
      const author = users?.find(u => u.id === p.userId);
      const accent = SPECIAL_COLORS[p.userId] || T.sub;
      const isVerified = !!SPECIAL_COLORS[p.userId];
      return <div key={p.id} onClick={() => onThread && onThread(p)}
        style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 16px", borderTop: i > 0 ? `1px solid ${T.border}` : "none", cursor: "pointer", background: "transparent", transition: "background 0.15s" }}
        onMouseEnter={e => e.currentTarget.style.background = T.input}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
        <div style={{ fontWeight: 800, fontSize: 13, color: T.sub, minWidth: 18, paddingTop: 2, textAlign: "right" }}>{i + 1}</div>
        <Av user={author} sz={34} onClick={e => { e.stopPropagation(); author && onUser && onUser(author); }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
            <span onClick={e => { e.stopPropagation(); author && onUser && onUser(author); }}
              style={{ fontWeight: 700, fontSize: 13, color: accent, cursor: "pointer" }}>{author?.username || p.username}</span>
            {isVerified && <span style={{ color: BLUE, fontSize: 11 }}>✓</span>}
            <span style={{ fontSize: 11, color: T.sub }}>· ❤️ {p.likes?.length || 0}{p.reposts?.length > 0 ? ` 🔁 ${p.reposts.length}` : ''}</span>
          </div>
          <div style={{ fontSize: 13, color: T.text, lineHeight: 1.45, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{p.content}</div>
        </div>
      </div>;
    })}
  </div>;
};

// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [dark, setDark] = useState(() => LS.get("dark") === "1");
  const [pg, setPg] = useState(() => LS.get("session_uid") ? "loading" : "login");
  const [tab, setTab] = useState("home");
  const [me, setMe] = useState(null);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [clicks, setClicks] = useState([]);
  const [dbLoading, setDbLoading] = useState(true);
  const [thread, setThread] = useState(null);
  const [openClick, setOpenClick] = useState(null);
  const [openUser, setOpenUser] = useState(null);
  const [dmUser, setDmUser] = useState(null);
  const [tedInit, setTedInit] = useState(null);
  const [showTed, setShowTed] = useState(false);
  const [groupChats, setGroupChats] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupMembers, setNewGroupMembers] = useState([]);
  const [voiceCall, setVoiceCall] = useState(null); // { participants: [ids] }
  const [showCompose, setShowCompose] = useState(false);
  const [showNewClick, setShowNewClick] = useState(false);
  const [showPP, setShowPP] = useState(false);
  const [showWallpaper, setShowWallpaper] = useState(false);
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [sf, setSf] = useState({ u: "", pw: "", pw2: "", bio: undefined });
  const [serr, setSerr] = useState("");
  const [cName, setCName] = useState("");
  const [cImg, setCImg] = useState(null);
  const [cropSrc, setCropSrc] = useState(null);
  const [cropKey, setCropKey] = useState(null);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("sharedApiKey") || LS.get("apiKey") || "");
  const avRef = useRef();
  const avRef2 = useRef();
  const cImgRef = useRef();

  // Reset settings form whenever the logged-in account changes
  useEffect(() => {
    setSf({ u: "", pw: "", pw2: "", bio: undefined });
    setSerr("");
  }, [me?.id]);

  // Sync browser chrome color with dark/light mode
  useEffect(() => {
    const color = dark ? "#000000" : "#ffffff";
    let meta = document.querySelector("meta[name='theme-color']");
    if (!meta) { meta = document.createElement("meta"); meta.name = "theme-color"; document.head.appendChild(meta); }
    meta.content = color;
    document.body.style.backgroundColor = color;
    LS.set("dark", dark ? "1" : "0");
    if (me?.id) { const row=userToRow({...me,dark:dark?1:0}); const {info_fields,...cr}=row; DB.updateUser(me.id,cr).catch(()=>{}); if(info_fields) DB.updateUser(me.id,{info_fields}).catch(()=>{}); }
  }, [dark]);

  useEffect(() => {
    const initDB = async () => {
      setDbLoading(true);
      // Restore session
      const sessionUid = LS.get("session_uid");
      const V = "v23";
      const specialIds = ["bot_scryptbot","bot_minerva","bot_news","bot_abandonware","claude_account","evil_ted"];
      const specialBots = [SCRYPTBOT_USER, MINERVA_USER, NEWS_USER, ABANDONWARE_USER, CLAUDE_USER, EVIL_TED_USER];

      // Load users from Supabase
      let dbUsers = [];
      try {
        const rows = await DB.getUsers();
        dbUsers = rows ? rows.map(rowToUser) : [];
      } catch(e) { console.error("Failed to load users", e); }

      // Load posts from Supabase
      let dbPosts = [];
      try {
        const rows = await DB.getPosts();
        dbPosts = rows ? rows.map(rowToPost) : [];
      } catch(e) { console.error("Failed to load posts", e); }

      // Load clicks from Supabase
      let dbClicks = [];
      try {
        const rows = await DB.getClicks();
        dbClicks = rows ? rows.map(rowToClick) : [];
      } catch(e) { console.error("Failed to load clicks", e); }

      // Seed based on DB state, not localStorage flag — works even after clearing LS
      const dbHasBots = dbUsers.some(u => u.isBot);
      const needsSeed = !dbHasBots;

      if (needsSeed) {
        // DB is empty — seed everything
        const allBots = [...SU, ...specialBots];
        for (const u of allBots) {
          try { await DB.upsertUser(userToRow(u)); } catch(e) { console.error("upsert user", u.id, e); }
        }
        if (dbPosts.length === 0) {
          for (const p of SP) {
            try { await DB.insertPost(postToRow(p)); } catch(e) { console.error("seed post", p.id, e); }
          }
          dbPosts = SP.slice();
        }
        if (dbClicks.length === 0) {
          for (const c of SC) {
            try { await DB.insertClick(clickToRow(c)); } catch(e) { console.error("seed click", c.id, e); }
          }
          dbClicks = SC.slice();
        }
        const humanUsers = dbUsers.filter(u => !u.isBot && !specialIds.includes(u.id));
        setUsers([...humanUsers, ...allBots]);
        LS.set("dv", V);
      } else {
        // Even if DB has bots, re-seed clicks if the clicks table is empty
        if (dbClicks.length === 0) {
          for (const c of SC) {
            try { await DB.insertClick(clickToRow(c)); } catch(e) { console.error("seed click", c.id, e); }
          }
          dbClicks = SC.slice();
        }
        // DB has data — use it, preserving any custom bot profiles set via the app
        const nonSpecial = dbUsers.filter(u => !specialIds.includes(u.id));
        const resolvedSpecial = await Promise.all(specialBots.map(async (b) => {
          const existing = dbUsers.find(u => u.id === b.id);
          if (existing) { if ((b.id==="claude_account"||b.id==="evil_ted")&&existing.username!==b.username){try{await DB.updateUser(b.id,{username:b.username,avatar:b.avatar,bio:b.bio});}catch{}} return {...existing,username:(b.id==="claude_account"||b.id==="evil_ted")?b.username:existing.username,avatar:(b.id==="claude_account"||b.id==="evil_ted")?b.avatar:existing.avatar}; }
          try { await DB.upsertUser(userToRow(b)); } catch(e) {}
          return b;
        }));
        setUsers([...nonSpecial, ...resolvedSpecial]);
        LS.set("dv", V);
      }

      setPosts(dbPosts);
      setClicks(dbClicks);
      setDbLoading(false);

      // Restore session after data is loaded
      if (sessionUid) {
        // Special accounts — load from DB (preserves custom avatar/bio), fall back to hardcoded
        const isSpecialId = ["bot_scryptbot","bot_minerva","bot_news","bot_abandonware","claude_account","evil_ted"].includes(sessionUid);
        if (isSpecialId) {
          try {
            const rows = await sbFetch(`users?id=eq.${encodeURIComponent(sessionUid)}&select=*`);
            const dbVersion = rows && rows[0] ? rowToUser(rows[0]) : null;
            const hardcoded = SPECIAL_ACCOUNTS.find(x => x.id === sessionUid);
            // Merge: use DB data for all mutable fields, hardcoded for fixed fields (id, username, password, isSpecial, verified)
            if (dbVersion && hardcoded) {
              setMe({
                ...hardcoded,
                avatar: dbVersion.avatar || hardcoded.avatar,
                bio: dbVersion.bio || hardcoded.bio,
                mood: dbVersion.mood || null,
                accentColor: dbVersion.accentColor || null,
                featuredPostId: dbVersion.featuredPostId || null,
                hasProfileSong: dbVersion.hasProfileSong || false,
                profileSongName: dbVersion.profileSongName || null,
                wallpaper: dbVersion.wallpaper || hardcoded.wallpaper || null,
                village: Array.isArray(dbVersion.village) ? dbVersion.village : (hardcoded.village || []),
                infoMovie: dbVersion.infoMovie || null,
                infoArtist: dbVersion.infoArtist || null,
                infoShow: dbVersion.infoShow || null,
                infoBook: dbVersion.infoBook || null,
                infoGame: dbVersion.infoGame || null,
                infoMoviePhoto: dbVersion.infoMoviePhoto || null,
                infoArtistPhoto: dbVersion.infoArtistPhoto || null,
                infoShowPhoto: dbVersion.infoShowPhoto || null,
                infoBookPhoto: dbVersion.infoBookPhoto || null,
                infoGamePhoto: dbVersion.infoGamePhoto || null,
              });
            } else if (hardcoded) {
              setMe({ ...hardcoded, village: Array.isArray(hardcoded.village)?hardcoded.village:[] });
            }
          } catch {
            const hardcoded = SPECIAL_ACCOUNTS.find(x => x.id === sessionUid);
            if (hardcoded) setMe({ ...hardcoded, village: Array.isArray(hardcoded.village)?hardcoded.village:[] });
          }
          setPg("app");
          return;
        }
        // Regular user from DB
        try {
          const rows = await sbFetch(`users?id=eq.${encodeURIComponent(sessionUid)}&select=*`);
          const u = rows && rows[0] ? rowToUser(rows[0]) : null;
          if (u) {
            if (u.dark != null && u.dark !== undefined) setDark(!!u.dark);
            setMe({ ...u, village: Array.isArray(u.village) ? u.village : [] });
            setDbLoading(false); setPg("app"); return;
          }
          const local = dbUsers.find(x => x.id === sessionUid);
          if (local) { setMe({ ...local, village: Array.isArray(local.village) ? local.village : [] }); setDbLoading(false); setPg("app"); return; }
        } catch {
          const local = dbUsers.find(x => x.id === sessionUid);
          if (local) { setMe({ ...local, village: Array.isArray(local.village) ? local.village : [] }); setDbLoading(false); setPg("app"); return; }
        }
        localStorage.removeItem("session_uid");
      }
      setDbLoading(false);
      setPg("login");
    };
    initDB();
  }, []);

  // Load group chats from Supabase when user logs in
  useEffect(() => {
    if (!me?.id) return;
    const loadGroupChats = async () => {
      try {
        const rows = await DB.getDMs(`gchat_registry_${me.id}`);
        if (rows && rows[0]) {
          const parsed = JSON.parse(rows[0].messages || "[]");
          if (Array.isArray(parsed) && parsed.length > 0) setGroupChats(parsed);
          else {
            // Fall back to localStorage for migration
            const lsChats = LS.get("gchat") || [];
            if (lsChats.length > 0) {
              setGroupChats(lsChats);
              DB.upsertDMs(`gchat_registry_${me.id}`, lsChats).catch(() => {});
            }
          }
        } else {
          const lsChats = LS.get("gchat") || [];
          if (lsChats.length > 0) {
            setGroupChats(lsChats);
            DB.upsertDMs(`gchat_registry_${me.id}`, lsChats).catch(() => {});
          }
        }
      } catch { 
        setGroupChats(LS.get("gchat") || []);
      }
    };
    loadGroupChats();
  }, [me?.id]);

  // Helper to save group chats to Supabase + all member registries
  const saveGroupChats = useCallback((updatedChats, meId) => {
    setGroupChats(updatedChats);
    LS.set("gchat", updatedChats);
    if (!meId) return;
    // Save to current user's registry
    DB.upsertDMs(`gchat_registry_${meId}`, updatedChats).catch(() => {});
    // Also propagate to all members of each chat so they see it too
    updatedChats.forEach(g => {
      g.members.forEach(memberId => {
        if (memberId !== meId) {
          // Get that member's current registry and merge this group in
          DB.getDMs(`gchat_registry_${memberId}`).then(rows => {
            let theirChats = [];
            try { theirChats = rows && rows[0] ? JSON.parse(rows[0].messages || "[]") : []; } catch {}
            const exists = theirChats.find(x => x.id === g.id);
            const merged = exists ? theirChats.map(x => x.id === g.id ? g : x) : [g, ...theirChats];
            DB.upsertDMs(`gchat_registry_${memberId}`, merged).catch(() => {});
          }).catch(() => {});
        }
      });
    });
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
  // sv: lightweight state setter (localStorage kept only for gchat, apiKey, etc.)
  const sv = (k, v, s) => { if (k.startsWith("gchat") || k.startsWith("apiKey")) LS.set(k, v); s(v); };

  const checkClaude = useCallback(async (txt, parentPostId) => {
    if (!/@ted\b/i.test(txt)) return;
    const q = txt.replace(/@ted\b/i, "").trim();
    if (!getKey()) {
      // No key — post a helpful reply
      const noKeyReply = {
        id: `claude_reply_${Date.now()}`,
        userId: "claude_account",
        username: "Ted",
        content: "👋 Hey! I'm Ted 🧸 — what's on your mind?",
        parentId: parentPostId,
        likes: [], reposts: [],
        createdAt: new Date().toISOString(),
        replyCount: 0,
        isClaudeReply: true
      };
      setPosts(prev => {
        const withReply = parentPostId ? prev.map(x => x.id === parentPostId ? { ...x, replyCount: (x.replyCount || 0) + 1 } : x) : prev;
        return [noKeyReply, ...withReply];
      });
      (async () => { try { await DB.insertPost(postToRow(noKeyReply)); } catch {} })();
      return;
    }
    try {
      const r = await claudeFetch({
        model: "llama-3.3-70b-versatile",
        max_tokens: 220,
        system: "You are Ted 🧸, a warm AI on Scrypt. Someone @mentioned you. Reply naturally, conversationally, under 240 chars.",
        messages: [{ role: "user", content: q || "Someone just mentioned you with no message — say something fun!" }]
      });
      if (!r.ok) return;
      const d = await r.json();
      const reply = d.content?.[0]?.text?.trim();
      if (!reply) return;
      const claudePost = {
        id: `claude_reply_${Date.now()}`,
        userId: "claude_account",
        username: "Ted",
        content: reply,
        parentId: parentPostId,
        likes: [], reposts: [],
        createdAt: new Date().toISOString(),
        replyCount: 0,
        isClaudeReply: true
      };
      // Use functional update to avoid stale closure on posts
      setPosts(prev => {
        const withReply = parentPostId ? prev.map(x => x.id === parentPostId ? { ...x, replyCount: (x.replyCount || 0) + 1 } : x) : prev;
        return [claudePost, ...withReply];
      });
      (async () => { try { await DB.insertPost(postToRow(claudePost)); } catch {} })();
      notify("Ted replied! 🧸");
    } catch {
      // fail silently
    }
  }, []);

  const doPost = useCallback(({ content, image, clickId, parentId, villageOnly }) => {
    const cur = posts;
    const p = {
      id: Date.now().toString(),
      userId: me.id, username: me.username, content, image, clickId, parentId, villageOnly,
      likes: [], reposts: [],
      createdAt: new Date().toISOString(),
      replyCount: 0
    };
    const upd = parentId ? cur.map(x => x.id === parentId ? { ...x, replyCount: (x.replyCount || 0) + 1 } : x) : cur;
    const newPosts = [p, ...upd];
    setPosts(newPosts);
    // Save to Supabase
    (async () => {
      try { await DB.insertPost(postToRow(p)); } catch(e) { console.error("doPost insert", e); }
      if (parentId) {
        const parent = upd.find(x => x.id === parentId);
        if (parent) try { await DB.updatePost(parentId, { reply_count: parent.replyCount }); } catch {}
      }
    })();
    notify(villageOnly ? "Posted to Village! 🔒" : parentId ? "Reply posted!" : "Scrypt posted!");
    checkClaude(content, p.id);
    if (!villageOnly && !parentId) {
      // New user boost: first 8 posts get 18-30 likes from GigaChads
      const userPostCount = posts.filter(x => x.userId === me.id && !x.parentId && !x.villageOnly).length;
      const isNewUser = userPostCount < 9;

      // Sentiment score: more positive words = more bot likes
      const positive = ["love","amazing","best","great","goat","incredible","masterpiece","legendary","fire","perfect","beautiful","brilliant","epic","fantastic","excellent","awesome","outstanding","phenomenal","elite","🔥","💪","❤️","🙌","💯","🏆","✨","🎉","😍","🌟","happy","excited","grateful","winning","inspire","community","scrypt"];
      let score = 0;
      const lower = (content || "").toLowerCase();
      positive.forEach(w => { if (lower.includes(w)) score += 1; });
      const baseLikes = isNewUser ? (18 + Math.floor(Math.random() * 12)) : (5 + score * 2);
      const lc = isNewUser ? baseLikes : Math.min(baseLikes + Math.floor(Math.random() * 12), 35);
      const rc = Math.random() < (0.2 + score * 0.04) ? Math.floor(Math.random() * 6) + 1 : 0;
      const bots = (users).filter(u => u.isBot);
      // If posted in a click, prefer click members to respond
      let pool = [...bots].sort(() => Math.random() - 0.5);
      if (clickId) {
        const allClicks = clicks;
        const click = allClicks.find(c => c.id === clickId);
        if (click) {
          const members = bots.filter(b => click.members.includes(b.id));
          pool = [...members.sort(() => Math.random() - 0.5), ...bots.filter(b => !click.members.includes(b.id)).sort(() => Math.random() - 0.5)];
        }
      }
      // Stagger likes realistically over 5s–4min
      pool.slice(0, lc).forEach((b, i) => setTimeout(() => {
        setPosts(prev => {
          const updated = prev.map(x => x.id === p.id ? { ...x, likes: [...new Set([...(x.likes || []), b.id])] } : x);
          const target = updated.find(x => x.id === p.id);
          if (target) DB.updatePost(p.id, { likes: JSON.stringify(target.likes) }).catch(() => {});
          return updated;
        });
      }, (i + 1) * (3000 + Math.random() * 8000)));
      // Stagger reposts 30s–6min
      pool.slice(lc, lc + rc).forEach((b, i) => setTimeout(() => {
        setPosts(prev => {
          const updated = prev.map(x => x.id === p.id ? { ...x, reposts: [...new Set([...(x.reposts || []), b.id])] } : x);
          const target = updated.find(x => x.id === p.id);
          if (target) DB.updatePost(p.id, { reposts: JSON.stringify(target.reposts) }).catch(() => {});
          return updated;
        });
      }, 30000 + (i + 1) * (15000 + Math.random() * 20000)));
    }
  }, [me, checkClaude]);

  // Periodic Giga Chad bot activity — realistic, staggered, entertainment-aware
  useEffect(() => {
    if (!me) return;

    // Sentiment scorer: more positive = more likes
    const sentimentScore = (text = "") => {
      const positive = ["love","amazing","best","great","goat","incredible","masterpiece","legendary","fire","perfect","beautiful","brilliant","epic","fantastic","excellent","awesome","outstanding","phenomenal","elite","🔥","💪","❤️","🙌","💯","🏆","✨","🎉","😍","🌟"];
      const negative = ["worst","hate","terrible","awful","bad","trash","horrible","boring","overrated","disappointing","weak"];
      const lower = text.toLowerCase();
      let score = 5;
      positive.forEach(w => { if (lower.includes(w)) score += 2; });
      negative.forEach(w => { if (lower.includes(w)) score -= 1; });
      return Math.max(2, Math.min(score, 20));
    };

    // Bot posts per click — vivid entertainment conversation starters
    const CLICK_POSTS = {
      click_movies: [
        "Anyone else rewatching Severance before season 3? The foreshadowing in S1 hits completely different now 🤯",
        "The Bear is the most stressful show on TV and I mean that as a compliment. My anxiety has anxiety.",
        "Oppenheimer deserved every Oscar it got. Cillian Murphy's final scene is one of the greatest acting moments ever filmed.",
        "If you slept on Shogun 2024 you owe it to yourself to watch it this weekend. Best thing on TV this year. Not even close.",
        "Dune 3 can't come soon enough. Chalamet was born to play Paul Atreides. Denis Villeneuve is building a legacy. 🪱",
        "The Substance is the most unhinged body horror film I've ever seen and Demi Moore was ROBBED of an Oscar. #TheSubstance",
        "Inside Out 2 is secretly one of Pixar's best films. Anxiety is the most relatable character in cinema history 😭",
      ],
      click_hiphop: [
        "Kendrick Lamar performing at the Super Bowl halftime show is going to be historic. He's on a different level rn. 🎤",
        "Tyler the Creator's Chromakopia grew on me hard. Thought I Walk Alone was strange then it became my most played.",
        "Wicked the movie soundtrack is lowkey hip hop adjacent and I will not be taking questions about this take 😂",
        "GNX by Kendrick might be album of the year already. The man just doesn't miss. #Kendrick",
        "Drake dropped a 100 song playlist and half of it still doesn't hit like one Kendrick verse. The bar is the bar.",
        "The new wave of female rappers right now is unmatched. Ice Spice, GloRilla, Sexyy Red — the culture is thriving. 🎤",
      ],
      click_taylor: [
        "Taylor's Super Bowl appearance was subtle but iconic. She was there for Travis and she still looked like the main character. 🩵",
        "I've listened to The Tortured Poets Department 300+ times and I'm still discovering new things. Folklore era was her peak but TTPD is her bravest.",
        "The Eras Tour being the highest grossing concert tour of all time says everything. She's not just a pop star she's an institution.",
        "Swiftie culture gets made fun of but at least we're passionate about something real. Name an artist that inspires this much creativity.",
        "tortured poets department deluxe edition hits different at 3am and I don't make the rules. Florida man is a top 5 Taylor song.",
        "The Taylor Swift economy is actually crazy — hotels, restaurants, local economies. She's a one-woman GDP boost wherever she goes. 📈",
      ],
      click_books: [
        "Fourth Wing sequel Iron Flame is out and it's even better. If you're not reading Rebecca Yarros you're missing out. #FourthWing",
        "Just started Tomorrow and Tomorrow and Tomorrow and I get why everyone won't stop talking about it. The first 20 pages are incredible.",
        "Atomic Habits is overrated as a self-help book but genuinely changed how I think about systems. Worth reading once.",
        "The romantasy genre is having a MOMENT and I'm not complaining. Give me dragons and enemies-to-lovers all day.",
        "ACOTAR fandom discourse is the most chaotic book community online and I'm fully here for it. Tamlin defenders log off.",
        "Can we talk about how Colleen Hoover basically invented BookTok as a cultural phenomenon? For better or worse she changed publishing.",
      ],
      click_kpop: [
        "NewJeans Hype Boy still hits after 2 years. That's how you know it's a generational bop. Minji carries every performance. 🐰",
        "aespa's Whiplash era is their best. They finally found their sound and the concept is matching the music. #aespa",
        "BTS coming back fully in 2025 is going to be one of the biggest cultural moments of the year. The world is not ready. 💜",
        "BLACKPINK concert production values are unmatched in the industry. Whatever they spend on staging and lights is worth every penny.",
        "Stray Kids performing at a US stadium sold out in 10 minutes. K-pop crossing over is not a trend it's a permanent shift in music culture. 🌸",
        "The HYBE vs ADOR drama is wild even by K-pop standards. Min Hee-jin vs Big Corp is the storyline of 2024. 🍿",
      ],
      click_gaming: [
        "GTA VI trailer has now been viewed 200M times. Rockstar still doesn't need to do anything to generate hype. The legend continues.",
        "Elden Ring is FromSoftware's magnum opus and I refuse to entertain any other take. Shadow of the Erdtree was perfection.",
        "Black Myth: Wukong showing the world what Chinese game devs can do when given full creative freedom. Beautiful game.",
        "Astro Bot winning GOTY was exactly right. Pure joy. Nintendo-tier game from a Sony studio. The gaming gods smiled on us. 🎮",
        "Palworld vs Pokemon discourse was the most entertaining gaming drama of the year. Let the players decide what they want to play.",
        "Alan Wake 2 is the most visually stunning game I've ever played and Remedy Games deserves their flowers. Criminally underrated.",
      ],
      click_fitness: [
        "Week 12 check in: down 18lbs, PR'd my deadlift, and most importantly I actually WANT to go to the gym now. Discipline becomes desire. 💪",
        "Zone 2 cardio is genuinely life-changing and nobody talks about it enough. 45 minutes 4x a week and watch your life transform.",
        "Hot take: nutrition is 80% of the result. Perfect training plan with poor diet will still give you mediocre results. Fix the diet first.",
        "Ran my first marathon this weekend! 4:12 finish, not a PR, but I crossed the line and that's everything. Training works 🏃",
        "Sleep, water, protein. These three things will do more for your physique than any supplement stack. The basics are not boring they're foundational.",
        "The gym at 5am is its own community. Nods of respect. Zero phones. Just work. Nothing else hits like it. Early risers know.",
      ],
      click_nfl: [
        "Patrick Mahomes is playing on another level this season. If the Chiefs win a 4th Super Bowl it's officially a dynasty for the ages. 🏈",
        "Lamar Jackson deserves his 3rd MVP. He's doing things at QB that we've never seen before. Baltimore is a problem this postseason.",
        "The Travis Kelce and Taylor Swift effect on NFL viewership is real. Like it or not more eyes on the game is a win for everyone.",
        "Caleb Williams had a rough rookie season but the Bears have talent around him now. Give it 2 more years and he'll be elite.",
        "The NFC is chaotic this year and I love it. Any team can win on any given week. Best conference in football right now.",
        "Detroit Lions becoming a powerhouse is the most heartwarming story in the NFL. Dan Campbell and Jared Goff deserve everything.",
        "Josh Allen is the most entertaining QB in the league. Buffalo needs to win a Super Bowl for him. He deserves it.",
        "The Eagles offensive line is the most dominant unit in football. Lane Johnson is a first ballot Hall of Famer. Period.",
      ],
      click_soccer: [
        "Vinicius Jr. is the most exciting player on the planet right now. Real Madrid with him is must-watch football every single week. ⚽",
        "The Premier League title race this season is genuinely anyone's to win. Arsenal, City, Liverpool all neck and neck. Can't look away.",
        "Lionel Messi at Inter Miami is the greatest thing to happen to American soccer. He's making MLS appointment viewing globally.",
        "Erling Haaland broke the Premier League scoring record and somehow it still feels underappreciated. The man is a machine. 🎯",
        "The Women's World Cup showed the world what women's football can be. Support the women's game like you support the men's. No excuses.",
        "Lamine Yamal at 17 playing like a 10 year veteran. Barcelona's future is bright. The kid is generational. 🌟",
        "Champions League nights are still the greatest sporting spectacle in the world. Nothing else comes close to that atmosphere.",
        "USMNT actually has a chance at the 2026 World Cup on home soil. Pulisic, Reyna, Weah — this generation is different.",
      ],
      click_nhl: [
        "Connor McDavid is the greatest hockey player alive and if you're not watching Oilers games you're missing art in motion. 🏒",
        "The Florida Panthers back to back Stanley Cup runs is one of the greatest sustained runs of dominance in recent NHL history.",
        "Nathan MacKinnon has been the best player in the NHL for 3 years straight and still gets slept on compared to McDavid. Crime.",
        "The Winter Classic outdoor game format is the best event in all of professional sports. Nothing hits like hockey in the snow. ❄️",
        "Auston Matthews scoring 60+ goals in a season is something we're not appreciating enough. Historic season. Legendary talent.",
        "The Seattle Kraken went from expansion team to legitimate contender faster than any franchise in NHL history. Respect.",
        "Hockey analytics are finally catching up to baseball and basketball. Expected goals and zone entries changing how we evaluate players.",
      ],
      click_photography: [
        "Golden hour on a 35mm film camera is still the most beautiful thing photography has ever produced. Digital can't replicate that warmth. 📷",
        "Street photography in NYC is an entirely different sport. You have to be invisible, patient, and fast all at once. The decisive moment.",
        "Just got the Sony A7R V and the dynamic range is genuinely insane. Landscape photography will never be the same for me. 🏔️",
        "Film photography is having a full revival and honestly it makes perfect sense. The intentionality forces you to slow down and think.",
        "Portrait photography tip: the eyes are everything. If the eyes aren't sharp the whole image fails. Prime lens, wide open, nail focus.",
        "The Fujifilm color science is still unmatched for street and documentary work. Their film simulations are an art form in themselves.",
        "Lightroom vs Capture One debate will never end but Capture One skin tones on medium format files are genuinely on another level.",
      ],
      click_cooking: [
        "Made fresh pasta from scratch for the first time. I will never go back to dried pasta. The texture difference is not even close. 🍝",
        "The key to restaurant-quality steak at home: dry brine 24 hours, cast iron screaming hot, butter baste, rest 10 minutes. That's it.",
        "Sourdough starter day 14: she's alive and thriving. First loaf tomorrow. The bread community online is the most supportive place online. 🍞",
        "Mise en place changed my entire relationship with cooking. Having everything prepped before you start is the actual secret to not panicking.",
        "Korean BBQ at home is completely underrated as a dinner party move. Get a grill plate, marinate beef short ribs overnight, done.",
        "The dumpling folding rabbit hole goes deeper than you think. Pan fried vs steamed vs soup. Every fold technique has a purpose.",
        "Salt, fat, acid, heat. Read that book once and you'll never cook the same way again. Samin Nosrat changed my life.",
      ],
      click_travel: [
        "Japan in cherry blossom season is the most beautiful place I have ever been. Kyoto in April is not a destination it's a feeling. ✈️",
        "The Amalfi Coast is overrated because of how many people say it's overrated. It's actually breathtaking. Go and make up your own mind.",
        "Solo travel tip: stay in hostels even if you can afford a hotel. You will meet the most interesting humans in a hostel common room.",
        "Morocco blew my mind. Marrakech medina is sensory overload in the best possible way. Sahara desert camping is life-changing.",
        "Southeast Asia is still the world's best value travel destination. Thailand, Vietnam, Bali — your dollar goes 5x further and the food is elite.",
        "The most underrated travel move: go in shoulder season. Better prices, fewer crowds, still great weather. September Europe is perfect.",
        "New Zealand for two weeks reset something in my brain. The scale of the landscapes is impossible to photograph accurately. Go in person.",
      ],
      click_fashion: [
        "The Loro Piana x LVMH acquisition is quietly the most important luxury move in a decade. The brand will never be the same. 👗",
        "Quiet luxury is not a trend it's a correction. People got tired of logomania. Understated quality is the permanent move.",
        "Thrifting is genuinely the most sustainable and interesting way to build a wardrobe. Vintage Levi's still hit different than anything new.",
        "Uniqlo continues to be the most underrated fashion brand in the world. Their collaboration pieces are cooked every single season.",
        "The rise of GRWM culture has actually made people care more about the craft of getting dressed. Fashion literacy is up globally.",
        "Sneaker culture peaked around 2019 and has been slowly correcting. The SNKRS app is still a scam. Resale is finally cooling down.",
        "The Birkenstock glow-up is one of the great fashion rehabilitation stories of all time. From dad sandal to runway. Incredible arc.",
      ],
      click_cars: [
        "The Porsche 911 GT3 RS is the greatest driver's car ever made and that opinion gets stronger every year. Naturally aspirated perfection. 🚗",
        "Formula 1 is the most globally dominant sport right now. Drive to Survive brought in a whole new generation and they stayed.",
        "The EV transition is inevitable but I will mourn the sound of a V8 at full throttle for the rest of my life. Some things can't be replaced.",
        "Max Verstappen won four consecutive championships and still somehow isn't getting the respect he deserves outside of F1 circles.",
        "The new Civic Type R is one of the best hot hatches ever made at any price point. Honda has been sleeping and woke up swinging.",
        "Watching Le Mans 24 hours coverage overnight is one of the great underrated sports experiences. Set an alarm. Watch the dawn laps.",
        "The Toyota Land Cruiser at 70+ years old is still the most reliable vehicle ever made. Depreciation proof. Desert survival tested. Legend.",
      ],
      click_finance: [
        "Dollar cost averaging into index funds over 30 years beats 95% of active managers. It's boring. That's the point. 📈",
        "Bitcoin ETF approval was the most significant crypto regulatory moment in history. Institutional money is in. The game changed.",
        "The interest rate environment is shifting and if you're not thinking about duration risk in your bond portfolio you should be.",
        "High yield savings accounts at 5% APY are still the most underutilized financial tool for regular people right now. Move your cash.",
        "Nvidia stock is the defining investment story of the decade. AI infrastructure buildout is still in innings 2 or 3. Not financial advice.",
        "The FIRE movement math actually works if you can hit a 70%+ savings rate for 10 years. It's hard. It's also the most freedom you can buy.",
        "Real estate vs index funds debate misses the point. Your primary residence is not an investment, it's a lifestyle expense with equity.",
      ],
      click_tennis: [
        "Carlos Alcaraz winning Wimbledon at 21 with that Djokovic final was the greatest tennis match I have ever seen live or on screen. 🎾",
        "Jannik Sinner is the real deal. His movement and two-handed backhand are already in the conversation for all-time technique.",
        "Coco Gauff winning the US Open was a cultural moment bigger than tennis. Watching her grow up on tour has been genuinely special.",
        "The Djokovic GOAT case is closed. 24 slams. Olympic gold. Still competing at 37. Nothing to debate. Respect the anomaly.",
        "The doubles game in tennis is criminally underrated as a spectator sport. The net exchanges and serve-return patterns are chess.",
        "Clay court tennis is the most beautiful form of the game. Roland Garros baseline rallies on red clay. Nothing compares aesthetically.",
        "Pickleball taking over suburban America is the best thing that's happened for racket sport participation in 50 years. Let people have fun.",
      ],
      click_art: [
        "The Whitney Biennial this year is the most politically charged in decades. Art is doing what journalism used to do. Pay attention. 🎨",
        "Digital art and NFTs confused everyone but the underlying technology separating scarcity from copies is still genuinely interesting.",
        "Gerhard Richter's squeegee paintings sell for $50M and they're made with a giant squeegee. That's not a complaint. It's awe.",
        "The Art Basel Miami week is half art and half spectacle but the gallery shows in Wynwood during that week are genuinely world-class.",
        "Street art in cities that protect it instead of painting over it becomes the cultural identity of neighborhoods. Bushwick is proof.",
        "Graphic design is the most undervalued creative profession. Every piece of visual culture you consume passed through a designer's hands.",
        "The Rothko Chapel in Houston is the most spiritually affecting space I've ever sat in. Color as emotion. Silence as meaning. Go.",
      ],
      click_nba: [
        "Nikola Jokic is casually the best basketball player on earth and half the country still doesn't appreciate it. Third MVP incoming. 🏀",
        "Victor Wembanyama is genuinely a cheat code. 7'4 with guard skills and an elite motor. Nobody is doing what he's doing at age 20.",
        "The Celtics look like the team to beat this year. Tatum finally having his moment. Boston is dangerous with that depth.",
        "LeBron and Bronny James playing together in the NBA is actually one of the most historic moments in sports history. Full stop.",
        "Steph Curry still makes shots that should be physically impossible. He's 36 and looks like he's playing on easy mode.",
        "NBA In-Season Tournament format has grown on me. Gets teams competing in November when usually nobody cares. Good for the league.",
      ],
      click_music: [
        "Charli XCX's BRAT album is a cultural reset. Brat summer was real and she invented a color. That's generational pop artistry. 🟢",
        "Sabrina Carpenter's Short n Sweet tour is selling out everywhere. She went from Disney to undisputed pop star in 18 months. Era of eras.",
        "Beyoncé's Cowboy Carter changed country music whether country music wanted to be changed or not. Lemonade was her peak until now.",
        "Chappell Roan exploding the way she did proves the internet can still make careers happen organically. Pink Pony Club was the origin. 🌹",
        "The music festival lineup season is wild this year. Coachella, Glastonbury, Lolla — every headliner is different than the last.",
        "Vinyl sales are outselling CDs for the first time since the 80s and Taylor Swift is responsible for a huge portion of that. Incredible.",
      ],
      click_ai: [
        "Claude 3 Opus is genuinely the best AI for complex reasoning tasks. The context window and nuance is unmatched right now. Full stop.",
        "GPT-4o's voice mode is shockingly natural. We're living in sci-fi and treating it like it's normal. Take a second to appreciate this moment.",
        "AI coding tools have made me 3x more productive in the last 6 months. Cursor + Claude is the combo. Not even close.",
        "The AI regulation debate is happening 5 years too late. The technology is already deployed. Policy will always trail innovation.",
        "Open source AI models catching up to frontier models faster than anyone predicted. Llama 3 doing things that felt impossible 2 years ago.",
        "Sam Altman and Elon Musk beef is the tech drama that won't end. Both are building AI. Both claim the other is dangerous. 🤖",
      ],
      click_startup: [
        "Just closed our seed round at a valuation that felt insane 2 years ago. The market is coming back. Builders, stay the course. 🚀",
        "The best startup advice I ever got: talk to 100 customers before you write a line of code. Nobody wants your solution. They want their problem solved.",
        "YC Demo Day applications are open. The quality of founders keeps going up every batch. The ecosystem is thriving despite macro. Apply.",
        "Venture valuations are compressing but that's actually healthy. Over-funding kills companies. Constraint breeds creativity. Build lean.",
        "AI startups raising at insane multiples right now but the ones with real moats and real revenue will survive the hype cycle. Build the moat.",
        "Notion, Figma, Linear — the B2B tools that blew up did so by being genuinely delightful to use. Stop treating enterprise like it hates good UX.",
      ],
      click_nyc: [
        "The High Line at sunset on a clear day is still one of the most beautiful things in the world. Living in NYC rent-free in my heart. 🗽",
        "Bodega cat > any other establishment mascot in any city in the world. NYC bodegas are an institution and I will not hear otherwise.",
        "The L train being reliable again after years of torture is genuinely the best thing to happen to Brooklyn this decade.",
        "Pizza rat is still the true mascot of New York. Never forget where we came from. The city that never sleeps and never shares its pizza. 🍕",
        "NYC in winter is underrated. Everyone leaves. Fewer tourists. The real city reveals itself. The locals inherit the streets.",
        "The NYC food scene in 2024 is the best it's ever been. You can eat 10 different countries of food within 4 blocks in any neighborhood.",
      ],
    };

    // Bot comment replies to user posts
    // General home feed posts from bots
    const HOME_BOT_POSTS = [
      "Morning run complete ✅ 5 miles before the city wakes up. Clears the head like nothing else.",
      "Reading a physical book for the first time in months. My attention span feels genuinely restored 📖",
      "Hot take: chronological feeds are superior in every way. Stop guessing what I want to see.",
      "8 hours of sleep is not optional. It's the one biohack that actually works. Not negotiable.",
      "Just discovered the best taco truck in the city. Life is objectively better right now 🌮",
      "Built something cool today. Shipping it tomorrow. No screenshots until it actually works.",
      "The fact that we collectively agreed to pretend email is fine is the biggest lie of the modern era",
      "AI isn't going to take your job. Someone using AI better than you will.",
      "Unpopular opinion: 30 minutes of walking outside does more for focus than any productivity app.",
      "6 months consistent gym. Down 25lbs, up 15lbs muscle. Discipline > motivation every single time 💪",
      "The best investment you can make is in skills nobody can take away from you.",
      "What you put out into the world comes back. Post with intention. Live with purpose.",
      "Sourdough starter day 21. She's thriving. First successful open crumb loaf. No regrets. 🍞",
      "Reminder: rest is part of the work. You can't pour from an empty cup.",
      "Spent three hours reading today instead of scrolling. Productivity went through the roof.",
      "Taking a weekend off from screens. Back Monday. Try it sometime, it's worth it.",
      "Cooked a proper meal from scratch for the first time in weeks. Forgot how good that feels 🍳",
      "The people who show up every day win. Consistency is the actual cheat code. #mindset",
    ];

    const getClickBotMembers = (clickId) => {
      const allClicks = clicks;
      const click = allClicks.find(c => c.id === clickId);
      if (!click) return [];
      const allUsers = users;
      return allUsers.filter(u => u.isBot && click.members.includes(u.id));
    };

    const clickIds = Object.keys(CLICK_POSTS);

    const SPECIAL_BOT_IDS = new Set(["bot_scryptbot","bot_minerva","bot_news","bot_abandonware","claude_account","evil_ted"]);

    const interval = setInterval(() => {
      // Only use the 200 giga chad bots — never special accounts
      const allBots = (users).filter(u => u.isBot && !SPECIAL_BOT_IDS.has(u.id));
      const curPosts = posts;
      const now = Date.now();

      // 35% chance: a bot posts to a random click with realistic entertainment content
      if (Math.random() < 0.35) {
        const targetClickId = clickIds[Math.floor(Math.random() * clickIds.length)];
        const clickMembers = getClickBotMembers(targetClickId).filter(u => !SPECIAL_BOT_IDS.has(u.id));
        const poster = clickMembers.length > 0
          ? clickMembers[Math.floor(Math.random() * clickMembers.length)]
          : allBots[Math.floor(Math.random() * allBots.length)];
        if (!poster) { /* no bots available */ } else {
        const pool = CLICK_POSTS[targetClickId] || HOME_BOT_POSTS;
        // Pick content that hasn't been posted recently (no duplicates in last 40 posts)
        const recentContents = new Set(curPosts.slice(0, 40).map(p => p.content));
        const freshPool = pool.filter(c => !recentContents.has(c));
        const postContent = (freshPool.length > 0 ? freshPool : pool)[Math.floor(Math.random() * (freshPool.length > 0 ? freshPool : pool).length)];
        // Skip only if THIS bot posted in the last 5 posts (not 20 — too aggressive)
        const posterRecentPost = curPosts.slice(0, 5).find(p => p.userId === poster.id && !p.parentId);
        if (!posterRecentPost) {
        const newPost = {
          id: `bauto_${now}_${Math.floor(Math.random() * 99999)}`,
          userId: poster.id, username: poster.username, content: postContent,
          likes: [], reposts: [],
          clickId: targetClickId,
          createdAt: new Date().toISOString(), replyCount: 0
        };
        // Other click members stagger-like it over 5–30 seconds
        const postBots = [...clickMembers].sort(() => Math.random() - 0.5).slice(0, Math.floor(Math.random() * 8) + 3);
        const withPost = [newPost, ...curPosts];
        setPosts(withPost); (async () => { const row = postToRow(withPost[0]); try { await DB.insertPost(row); } catch {} })();
        postBots.forEach((b, i) => {
          if (b.id === poster.id) return;
          setTimeout(() => {
            setPosts(prev => { const u2 = prev.map(x => x.id === newPost.id ? { ...x, likes: [...new Set([...(x.likes || []), b.id])] } : x); const t = u2.find(x => x.id === newPost.id); if (t) DB.updatePost(newPost.id, { likes: JSON.stringify(t.likes) }).catch(() => {}); return u2; });
          }, (i + 1) * (3000 + Math.random() * 8000));
        });
        } // end poster dedup check
        } // end poster null check
      }

      // 25% chance: a bot posts to home feed
      if (Math.random() < 0.25) {
        const poster = allBots[Math.floor(Math.random() * allBots.length)];
        if (!poster) { /* no bots */ } else {
        // Skip only if this bot is in the last 5 home posts
        const posterRecentHome = curPosts.slice(0, 5).find(p => p.userId === poster.id && !p.parentId && !p.clickId);
        if (posterRecentHome) { /* skip */ } else {
        const homePool = HOME_BOT_POSTS;
        const recentHomeContents = new Set(curPosts.slice(0, 30).map(p => p.content));
        const freshHome = homePool.filter(c => !recentHomeContents.has(c));
        const content = (freshHome.length > 0 ? freshHome : homePool)[Math.floor(Math.random() * (freshHome.length > 0 ? freshHome : homePool).length)];
        const newPost = {
          id: `bhome_${now}_${Math.floor(Math.random() * 99999)}`,
          userId: poster.id, username: poster.username, content,
          likes: [], reposts: [],
          createdAt: new Date().toISOString(), replyCount: 0
        };
        const withPost = [newPost, ...curPosts];
        setPosts(withPost); (async () => { const row = postToRow(withPost[0]); try { await DB.insertPost(row); } catch {} })();
        // Stagger likes over 10–60 seconds based on positivity
        const score = sentimentScore(content);
        const likerCount = Math.min(score + Math.floor(Math.random() * 5), 25);
        const likers = [...allBots].filter(b => b.id !== poster.id).sort(() => Math.random() - 0.5).slice(0, likerCount);
        likers.forEach((b, i) => {
          setTimeout(() => {
            setPosts(prev => { const u2 = prev.map(x => x.id === newPost.id ? { ...x, likes: [...new Set([...(x.likes || []), b.id])] } : x); const t = u2.find(x => x.id === newPost.id); if (t) DB.updatePost(newPost.id, { likes: JSON.stringify(t.likes) }).catch(() => {}); return u2; });
          }, (i + 1) * (4000 + Math.random() * 12000));
        });
        } // end home poster dedup check
        } // end home poster null check
      }

      // Always: stagger-add likes to recent posts based on sentiment
      const recentPosts = curPosts.filter(p => !p.parentId).slice(0, 15);
      if (recentPosts.length > 0) {
        const targetPost = recentPosts[Math.floor(Math.random() * Math.min(8, recentPosts.length))];
        const score = sentimentScore(targetPost.content);
        const likerCount = Math.floor(score / 3) + Math.floor(Math.random() * 4) + 1;
        const existing = new Set(targetPost.likes || []);
        const eligible = allBots.filter(b => !existing.has(b.id) && b.id !== targetPost.userId);
        const likers = eligible.sort(() => Math.random() - 0.5).slice(0, likerCount);
        likers.forEach((b, i) => {
          setTimeout(() => {
            setPosts(prev => { const u2 = prev.map(x => x.id === targetPost.id ? { ...x, likes: [...new Set([...(x.likes || []), b.id])] } : x); const t = u2.find(x => x.id === targetPost.id); if (t) DB.updatePost(targetPost.id, { likes: JSON.stringify(t.likes) }).catch(() => {}); return u2; });
          }, (i + 1) * (2500 + Math.random() * 7000));
        });
      }

      // 20% chance: a bot comments on a user's post using Claude for context-aware replies
      if (Math.random() < 0.20 && getKey()) {
        const userPosts = curPosts.filter(p => !p.parentId && p.userId === me.id);
        if (userPosts.length > 0) {
          const targetPost = userPosts[Math.floor(Math.random() * Math.min(3, userPosts.length))];
          const commenter = allBots.filter(b => !SPECIAL_BOT_IDS.has(b.id))[Math.floor(Math.random() * allBots.filter(b => !SPECIAL_BOT_IDS.has(b.id)).length)];
          const commenterBio = commenter.bio || "just vibing";
          // Fire-and-forget async reply after a short random delay
          setTimeout(async () => {
            try {
              const r = await claudeFetch({
                model: "llama-3.3-70b-versatile",
                max_tokens: 80,
                system: `You are ${commenter.username}, a real person on a social media app. Your vibe: "${commenterBio}". Reply naturally to a post as yourself — comment on the ACTUAL content of what was said. Be genuine, brief (1-2 sentences max, under 120 chars), conversational. No hashtags. No "This is why I love Scrypt." No generic hype. React to what they actually said. Sometimes agree, sometimes push back, sometimes add a related thought. Match the energy of the post.`,
                messages: [{ role: "user", content: `Reply to this post: "${targetPost.content.slice(0, 200)}"` }]
              });
              const d = await r.json();
              const comment = d.content?.[0]?.text?.trim();
              if (!comment || comment.length < 5) return;
              const reply = {
                id: `breply_${Date.now()}_${Math.floor(Math.random() * 99999)}`,
                userId: commenter.id, username: commenter.username,
                content: comment, parentId: targetPost.id,
                likes: [], reposts: [],
                createdAt: new Date().toISOString(), replyCount: 0
              };
              setPosts(prev => {
                const withReply = prev.map(x => x.id === targetPost.id ? { ...x, replyCount: (x.replyCount || 0) + 1 } : x);
                return [reply, ...withReply];
              });
              (async () => {
                try { await DB.insertPost(postToRow(reply)); } catch {}
                try { await DB.updatePost(targetPost.id, { reply_count: (targetPost.replyCount || 0) + 1 }); } catch {}
              })();
            } catch { /* fail silently */ }
          }, 5000 + Math.random() * 20000);
        }
      }

      // SPECIAL BOT BOOSTS — giga chads heavily engage with official accounts
      const specialBotIds = ["bot_scryptbot","bot_minerva","bot_news","bot_abandonware","evil_ted"];
      const specialPosts = curPosts.filter(p => specialBotIds.includes(p.userId) && !p.parentId).slice(0, 20);
      if (specialPosts.length > 0) {
        const targetSpecial = specialPosts[Math.floor(Math.random() * Math.min(5, specialPosts.length))];
        // 80% chance to add likes to a special bot post
        if (Math.random() < 0.80) {
          const existingLikes = new Set(targetSpecial.likes || []);
          const eligible = allBots.filter(b => !existingLikes.has(b.id) && !specialBotIds.includes(b.id));
          const boostCount = 4 + Math.floor(Math.random() * 8); // 4-11 likes per cycle
          const boosters = eligible.sort(() => Math.random() - 0.5).slice(0, boostCount);
          boosters.forEach((b, i) => {
            setTimeout(() => {
              setPosts(prev => { const u2 = prev.map(x => x.id === targetSpecial.id ? { ...x, likes: [...new Set([...(x.likes || []), b.id])] } : x); const t = u2.find(x => x.id === targetSpecial.id); if (t) DB.updatePost(targetSpecial.id, { likes: JSON.stringify(t.likes) }).catch(() => {}); return u2; });
            }, (i + 1) * (1500 + Math.random() * 4000));
          });
        }
        // 40% chance to also add reposts
        if (Math.random() < 0.40) {
          const existingReposts = new Set(targetSpecial.reposts || []);
          const eligible2 = allBots.filter(b => !existingReposts.has(b.id) && !specialBotIds.includes(b.id));
          const repostCount = 2 + Math.floor(Math.random() * 4);
          const reposters = eligible2.sort(() => Math.random() - 0.5).slice(0, repostCount);
          reposters.forEach((b, i) => {
            setTimeout(() => {
              setPosts(prev => { const u2 = prev.map(x => x.id === targetSpecial.id ? { ...x, reposts: [...new Set([...(x.reposts || []), b.id])] } : x); const t = u2.find(x => x.id === targetSpecial.id); if (t) DB.updatePost(targetSpecial.id, { reposts: JSON.stringify(t.reposts) }).catch(() => {}); return u2; });
            }, (i + 1) * (2000 + Math.random() * 5000));
          });
        }
      }

      if (Math.random() < 0.30) {
        const BOT_REPLIES=["This is exactly the take I needed 🔥","100% agree, couldn't have said it better","Bro this goes hard 💪","Facts. No cap.","W post fr","Say it louder 📢","Needed to hear this 🙏","Okay you actually cooked 🍳","This slaps","Respect. Real one.","All day every day 🔥","Top tier scrypt ngl","W take no debates","Built different 💯","The accuracy is unreal"];
        const tp=curPosts.filter(p=>!p.parentId).slice(0,25);
        if(tp.length>0){const tgt=tp[Math.floor(Math.random()*Math.min(15,tp.length))];const rp=allBots.filter(b=>b.id!==tgt.userId&&!SPECIAL_BOT_IDS.has(b.id));const rr=rp[Math.floor(Math.random()*rp.length)];
        if(rr&&!curPosts.some(p=>p.parentId===tgt.id&&p.userId===rr.id)){setTimeout(()=>{const reply={id:`br2_${Date.now()}_${Math.floor(Math.random()*99999)}`,userId:rr.id,username:rr.username,content:BOT_REPLIES[Math.floor(Math.random()*BOT_REPLIES.length)],parentId:tgt.id,likes:[],reposts:[],createdAt:new Date().toISOString(),replyCount:0};setPosts(prev=>{if(prev.some(p=>p.parentId===tgt.id&&p.userId===rr.id))return prev;return[reply,...prev.map(x=>x.id===tgt.id?{...x,replyCount:(x.replyCount||0)+1}:x)];});(async()=>{try{await DB.insertPost(postToRow(reply));}catch{}})();},3000+Math.random()*12000);}}
      }

      // 15% chance: bots add each other to village
      if (Math.random() < 0.15) {
        const allUsers = users;
        const bot1 = allBots[Math.floor(Math.random() * allBots.length)];
        const bot2 = allBots[Math.floor(Math.random() * allBots.length)];
        if (bot1 && bot2 && bot1.id !== bot2.id) {
          const updated = allUsers.map(u => {
            if (u.id === bot1.id) return { ...u, village: [...new Set([...(u.village || []), bot2.id])] };
            if (u.id === bot2.id) return { ...u, village: [...new Set([...(u.village || []), bot1.id])] };
            return u;
          });
          setUsers(updated); (async () => { for (const u of updated.filter(x => !x.isBot).slice(0,3)) { try { await DB.updateUser(u.id, userToRow(u)); } catch {} } })();
        }
      }
    }, 15000); // Every 15 seconds
    return () => clearInterval(interval);
  }, [me]);

  // ── SCRYPTBOT: Random facts every 6 hours ────────────────────────────────────
  useEffect(() => {
    if (!me) return;
    const postFact = async () => {
      if (!getKey()) return;
      try {
        const categories = ["science","space","animals","history","food","human body","psychology","technology","geography","nature","sports records","art","language"];
        const cat = categories[Math.floor(Math.random() * categories.length)];
        const r = await claudeFetch({
          model: "llama-3.3-70b-versatile",
          max_tokens: 180,
          system: "You are Scrypt, the official account for a social platform. Post one surprising, specific, verifiable fact. Rules: state the fact plainly and directly — no enthusiasm, no filler phrases, no 'did you know', no 'fun fact'. End with one relevant emoji. Under 220 characters. Output only the fact text.",
          messages: [{ role: "user", content: `Post a surprising fact about ${cat}.` }]
        });
        const d = await r.json();
        const content = d.content?.[0]?.text;
        if (!content) return;
        const newPost = {
          id: `scryptbot_${Date.now()}`,
          userId: "bot_scryptbot",
          username: "Scrypt",
          content: content.trim(),
          likes: [], reposts: [],
          createdAt: new Date().toISOString(),
          replyCount: 0
        };
        // Bot community reacts with likes
        const allBots = users.filter(u => u.isBot && !u.isSpecial);
        const likers = allBots.sort(() => Math.random() - 0.5).slice(0, 8 + Math.floor(Math.random() * 18));
        newPost.likes = likers.map(b => b.id);
        if (Math.random() > 0.4) newPost.reposts = allBots.sort(() => Math.random() - 0.5).slice(0, 2 + Math.floor(Math.random() * 5)).map(b => b.id);
        setPosts(prev => [newPost, ...prev]);
        DB.insertPost(postToRow(newPost)).catch(() => {});
      } catch { /* fail silently */ }
    };
    postFact(); // Post once immediately on login
    const interval = setInterval(postFact, 6 * 60 * 60 * 1000); // Then every 6h
    return () => clearInterval(interval);
  }, [me]);

  // ── SCRYPT MINERVA: History fact every hour + This Day in History at 12pm daily ──
  useEffect(() => {
    if (!me) return;

    const postHistoryFact = async () => {
      if (!getKey()) return;
      try {
        const eras = ["ancient Egypt","ancient Greece","the Roman Empire","the Renaissance","the Age of Exploration","the Industrial Revolution","World War I","World War II","the Cold War","ancient China","the Ottoman Empire","the Viking Age","medieval Europe","the Byzantine Empire","ancient Persia","the Mongol Empire","the British Empire","the French Revolution","ancient Mesopotamia","the Han Dynasty","the Mughal Empire","the Crusades","the Age of Enlightenment","the American Revolution","the Napoleonic Wars","ancient India","the Aztec Empire","the Inca Empire","the Silk Road","the Black Death"];
        const era = eras[Math.floor(Math.random() * eras.length)];
        const r = await claudeFetch({
          model: "llama-3.3-70b-versatile",
          max_tokens: 220,
          system: "You are Script_Minerva, a professional history education account. Post ONE specific, fact-checked historical fact. Rules: 1) Always anchor to a real verified date/era using the format 'Roman Empire, 44 BCE —' or 'Medieval Europe, 1347 —'. 2) Include specific names, numbers, and places. 3) No enthusiasm, no opinions, no modern commentary, no speculation. 4) Professional, encyclopaedic tone. 5) End with exactly one relevant historical emoji (🏛️ ⚔️ 📜 🗺️ 🔭 ⚓ 🏰 🕌 🌏 etc). 6) Under 240 characters. Output only the fact text, nothing else.",
          messages: [{ role: "user", content: `Share one specific, verified, little-known historical fact from ${era}. Include real names, dates, and numbers.` }]
        });
        const d = await r.json();
        const content = d.content?.[0]?.text;
        if (!content) return;
        const newPost = {
          id: `minerva_hist_${Date.now()}`,
          userId: "bot_minerva",
          username: "Script_Minerva",
          content: content.trim(),
          likes: [], reposts: [],
          createdAt: new Date().toISOString(),
          replyCount: 0
        };
        const allBots = users.filter(u => u.isBot && !u.isSpecial);
        newPost.likes = allBots.sort(() => Math.random() - 0.5).slice(0, 6 + Math.floor(Math.random() * 14)).map(b => b.id);
        if (Math.random() > 0.5) newPost.reposts = allBots.sort(() => Math.random() - 0.5).slice(0, 1 + Math.floor(Math.random() * 4)).map(b => b.id);
        setPosts(prev => [newPost, ...prev]);
        DB.insertPost(postToRow(newPost)).catch(() => {});
      } catch { /* fail silently */ }
    };

    const postThisDayInHistory = async () => {
      if (!getKey()) return;
      try {
        const now = new Date();
        const month = now.toLocaleString("default", { month: "long" });
        const day = now.getDate();
        const r = await claudeFetch({
          model: "llama-3.3-70b-versatile",
          max_tokens: 220,
          system: "You are Script_Minerva, a professional history education account. Post a 'This Day in History' entry. Rules: 1) Pick one real, verified, significant historical event from this exact calendar date. 2) Format strictly as: '📅 This Day in History — [YEAR]: [event with specific names/places/numbers]'. 3) Only verified, fact-checked events. 4) No opinions, no modern spin, no commentary, no enthusiasm, no personality. 5) Professional encyclopaedic tone. 6) Under 250 characters. Output only the formatted entry, nothing else.",
          messages: [{ role: "user", content: `What is one significant, verified historical event that occurred on ${month} ${day}? Include the year, key figures, and specific details.` }]
        });
        const d = await r.json();
        const content = d.content?.[0]?.text;
        if (!content) return;
        const newPost = {
          id: `minerva_tdih_${Date.now()}`,
          userId: "bot_minerva",
          username: "Script_Minerva",
          content: content.trim(),
          likes: [], reposts: [],
          createdAt: new Date().toISOString(),
          replyCount: 0
        };
        const allBots = users.filter(u => u.isBot && !u.isSpecial);
        newPost.likes = allBots.sort(() => Math.random() - 0.5).slice(0, 10 + Math.floor(Math.random() * 20)).map(b => b.id);
        newPost.reposts = allBots.sort(() => Math.random() - 0.5).slice(0, 3 + Math.floor(Math.random() * 7)).map(b => b.id);
        setPosts(prev => [newPost, ...prev]);
        DB.insertPost(postToRow(newPost)).catch(() => {});
      } catch { /* fail silently */ }
    };

    // ── Scheduling ──────────────────────────────────────────────────────────────
    // This Day in History fires once a day at 12:00pm local time.
    // History facts fire every hour EXCEPT the 12pm slot (Minerva posts TDIH then).
    const scheduleNoon = () => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(12, 0, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1); // already past noon → tomorrow
      const msUntilNoon = next - now;
      return setTimeout(() => {
        postThisDayInHistory();
        setInterval(postThisDayInHistory, 24 * 60 * 60 * 1000); // daily thereafter
      }, msUntilNoon);
    };

    const scheduleHourly = () => {
      // Fire once on load (if current hour ≠ 12), then every hour skip 12pm
      const tick = () => {
        const h = new Date().getHours();
        if (h !== 12) postHistoryFact(); // skip the noon slot
      };
      // Align to the next top-of-hour
      const now = new Date();
      const msUntilHour = (60 - now.getMinutes()) * 60 * 1000 - now.getSeconds() * 1000 - now.getMilliseconds();
      tick(); // immediate first post
      return setTimeout(() => {
        tick();
        setInterval(tick, 60 * 60 * 1000);
      }, msUntilHour);
    };

    const noonTimer  = scheduleNoon();
    const hourTimer  = scheduleHourly();
    // Also fire TDIH immediately on login if it's already noon (±5 min)
    const h = new Date().getHours(), m = new Date().getMinutes();
    if (h === 12 && m < 5) setTimeout(postThisDayInHistory, 3000);

    return () => { clearTimeout(noonTimer); clearTimeout(hourTimer); };
  }, [me]);

  // ── SCRYPT NEWS: Disabled — was posting outdated/AI-generated content ──────
  // News posts are pre-seeded in SEED_POSTS instead


  // ── ABANDONWARE: Video games / movies / TV shows every 4h ────────────────────
  useEffect(() => {
    if (!me) return;
    const topics = [
      "a highly anticipated upcoming video game release",
      "a classic retro video game that deserves a modern remake",
      "a recently released movie everyone is talking about",
      "an underrated indie video game that deserves more attention",
      "a popular TV show season finale or premiere",
      "a controversial video game review or industry news",
      "a nostalgic movie franchise and its latest installment",
      "a binge-worthy TV series currently streaming",
      "a video game studio news or acquisition",
      "an iconic movie director's latest project",
    ];
    const postEntertainment = async () => {
      if (!getKey()) return;
      try {
        const topic = topics[Math.floor(Math.random() * topics.length)];
        const r = await claudeFetch({
          model: "llama-3.3-70b-versatile",
          max_tokens: 260,
          system: `You are Abandonware, an entertainment news account for 2025-2026. Post ONE punchy update about games/movies/TV. Be specific with titles, studios, numbers. Content must be from 2025-2026. Use emojis. Under 250 chars. Just the post text.`,
          messages: [{ role: "user", content: `Write a post about ${topic}.` }]
        });
        const d = await r.json();
        const content = d.content?.[0]?.text;
        if (!content || content.length < 20) return;
        const newPost = {
          id: `abandonware_${Date.now()}`,
          userId: "bot_abandonware",
          username: "Abandonware",
          content: content.trim(),
          likes: [], reposts: [],
          createdAt: new Date().toISOString(),
          replyCount: 0
        };
        const allBots = users.filter(u => u.isBot && !u.isSpecial);
        newPost.likes = allBots.sort(() => Math.random() - 0.5).slice(0, 10 + Math.floor(Math.random() * 18)).map(b => b.id);
        if (Math.random() > 0.4) newPost.reposts = allBots.sort(() => Math.random() - 0.5).slice(0, 2 + Math.floor(Math.random() * 6)).map(b => b.id);
        setPosts(prev => [newPost, ...prev]);
        DB.insertPost(postToRow(newPost)).catch(() => {});
      } catch { /* fail silently */ }
    };

    setTimeout(postEntertainment, 22000); // stagger after other bots
    const abandonwareInterval = setInterval(postEntertainment, 4 * 60 * 60 * 1000); // 4h
    return () => clearInterval(abandonwareInterval);
  }, [me]);


  const doLike = id => {
    const updated = posts.map(p => p.id !== id ? p : { ...p, likes: p.likes?.includes(me.id) ? p.likes.filter(x => x !== me.id) : [...(p.likes || []), me.id] });
    setPosts(updated);
    const target = updated.find(p => p.id === id);
    if (target) DB.updatePost(id, { likes: JSON.stringify(target.likes) }).catch(() => {});
  };
  const doRt = id => {
    const updated = posts.map(p => p.id !== id ? p : { ...p, reposts: p.reposts?.includes(me.id) ? p.reposts.filter(x => x !== me.id) : [...(p.reposts || []), me.id] });
    setPosts(updated);
    const target = updated.find(p => p.id === id);
    if (target) DB.updatePost(id, { reposts: JSON.stringify(target.reposts) }).catch(() => {});
  };
  const doDelete = id => {
    setPosts(prev => prev.filter(p => p.id !== id));
    DB.deletePost(id).catch(() => {});
    notify("Scrypt deleted.");
  };
  const doJoin = id => {
    const updated = clicks.map(c => c.id !== id ? c : { ...c, members: c.members?.includes(me.id) ? c.members.filter(x => x !== me.id) : [...(c.members || []), me.id] });
    setClicks(updated);
    const target = updated.find(c => c.id === id);
    if (target) DB.updateClick(id, { members: JSON.stringify(target.members) }).catch(() => {});
  };
  const doVillage = uid => {
    const v = me.village || [];
    const has = v.includes(uid);
    const nv = has ? v.filter(x => x !== uid) : [...v, uid];
    const nu = users.map(u => u.id === me.id ? { ...u, village: nv } : u);
    setUsers(nu);
    setMe(p => ({ ...p, village: nv }));
    DB.updateUser(me.id, { village: JSON.stringify(nv) }).catch(() => {});
    notify(has ? "Removed from Village" : "Added to Village! 🏘️");
    // Write village-add notification to the other user's notif slot in Supabase
    if (!has) {
      const notifKey = `notif_village_${uid}`;
      DB.getDMs(notifKey).then(rows => {
        let existing = [];
        try { existing = rows && rows[0] ? JSON.parse(rows[0].messages || "[]") : []; } catch {}
        // Don't add duplicate if already notified
        if (!existing.find(n => n.from === me.id)) {
          const updated = [{ id: `vn_${me.id}_${Date.now()}`, from: me.id, ts: new Date().toISOString() }, ...existing];
          DB.upsertDMs(notifKey, updated).catch(() => {});
        }
      }).catch(() => {});
    }
  };

  const doBlock = uid => {
    // Remove from village if present, hide from feed via blocked list in localStorage
    const blocked = tryParse(localStorage.getItem("blocked_users"), []);
    if (!blocked.includes(uid)) {
      const updated = [...blocked, uid];
      localStorage.setItem("blocked_users", JSON.stringify(updated));
    }
    // Also remove from village
    const v = Array.isArray(me.village) ? me.village : [];
    if (v.includes(uid)) {
      const nv = v.filter(x => x !== uid);
      setMe(p => ({ ...p, village: nv }));
      setUsers(prev => prev.map(u => u.id === me.id ? { ...u, village: nv } : u));
      DB.updateUser(me.id, { village: JSON.stringify(nv) }).catch(() => {});
    }
    notify("User blocked");
  };
  const doAvatar = e => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = x => {
      setCropSrc(x.target.result);
      setCropKey("__avatar__");
    };
    r.readAsDataURL(f);
  };
  const doPickDef = url => {
    const nu = users.map(u => u.id === me.id ? { ...u, avatar: url } : u);
    setUsers(nu); setMe(p => ({ ...p, avatar: url })); setShowPP(false);
    DB.updateUser(me.id, { avatar: url }).catch(() => {});
  };
  const saveMe = (fields) => {
    const updated = { ...me, ...fields };
    setMe(updated);
    setUsers(prev => prev.map(u => u.id === me.id ? updated : u));

    // Build a minimal PATCH of only the fields that actually changed.
    // Sending the full row caused stale-closure overwrites: if two saves fired
    // close together (e.g. bio then mood), the second save would re-send the old
    // bio from a stale `me` snapshot and silently undo the first save.
    const patch = {};

    const FIELD_MAP = {
      username:        v => ({ username: v }),
      password:        v => ({ password: v }),
      avatar:          v => ({ avatar: v || null }),
      bio:             v => ({ bio: v || null }),
      mood:            v => ({ mood: v || null }),
      accentColor:     v => ({ accent_color: v || null }),
      featuredPostId:  v => ({ featured_post_id: v || null }),
      hasProfileSong:  v => ({ has_profile_song: !!v }),
      profileSongName: v => ({ profile_song_name: v || null }),
      wallpaper:       v => ({ wallpaper: v ? JSON.stringify(v) : null }),
      village:         v => ({ village: JSON.stringify(Array.isArray(v) ? v : []) }),
    };

    const INFO_KEYS = ["infoMovie","infoArtist","infoShow","infoBook","infoGame",
                       "infoMoviePhoto","infoArtistPhoto","infoShowPhoto","infoBookPhoto","infoGamePhoto"];
    let needsInfoFields = false;

    for (const [key, val] of Object.entries(fields)) {
      if (FIELD_MAP[key]) {
        Object.assign(patch, FIELD_MAP[key](val));
      } else if (INFO_KEYS.includes(key) || key === "dark") {
        needsInfoFields = true;
      }
    }

    if (needsInfoFields) {
      patch.info_fields = JSON.stringify({
        infoMovie:       updated.infoMovie       || null,
        infoArtist:      updated.infoArtist      || null,
        infoShow:        updated.infoShow        || null,
        infoBook:        updated.infoBook        || null,
        infoGame:        updated.infoGame        || null,
        infoMoviePhoto:  updated.infoMoviePhoto  || null,
        infoArtistPhoto: updated.infoArtistPhoto || null,
        infoShowPhoto:   updated.infoShowPhoto   || null,
        infoBookPhoto:   updated.infoBookPhoto   || null,
        infoGamePhoto:   updated.infoGamePhoto   || null,
        dark:            updated.dark !== undefined ? updated.dark : null,
      });
    }

    if (Object.keys(patch).length > 0) {
      DB.updateUser(me.id, patch).catch(e => console.error("saveMe failed", e));
    }
  };

  const doWallpaper = wp => {
    setShowWallpaper(false);
    const updated = { ...me, wallpaper: wp };
    setMe(updated);
    setUsers(prev => prev.map(u => u.id === me.id ? updated : u));
    DB.updateUser(me.id, { wallpaper: wp ? JSON.stringify(wp) : null }).catch(e => console.error("wallpaper", e));
    notify("Wallpaper saved! 🖼️");
  };
  const doSave = () => {
    setSerr("");
    const upd = {};
    if (sf.u && sf.u.trim().toLowerCase() !== me.username.toLowerCase()) {
      const t = sf.u.trim().toLowerCase();
      if (t.length < 3) { setSerr("Min 3 characters."); return; }
      if (users.find(u => u.username.toLowerCase() === t && u.id !== me.id)) { setSerr("Username taken."); return; }
      upd.username = t;
    }
    if (sf.pw) {
      if (sf.pw.length < 6) { setSerr("Password min 6."); return; }
      if (sf.pw !== sf.pw2) { setSerr("Passwords don't match."); return; }
      upd.password = sf.pw;
    }
    if (sf.bio !== undefined) upd.bio = sf.bio || null;
    if (sf.mood !== undefined) upd.mood = sf.mood || null;
    if (sf.accentColor !== undefined) upd.accentColor = sf.accentColor;
    if (sf.featuredPostId !== undefined) upd.featuredPostId = sf.featuredPostId;
    // Profile song — stored separately to avoid bloating users array
    if (sf.profileSong !== undefined) {
      LS.set(`psong_${me.id}`, sf.profileSong ? { song: sf.profileSong, name: sf.profileSongName } : null);
      upd.hasProfileSong = !!sf.profileSong;
      upd.profileSongName = sf.profileSongName || null;
    }
    // Info card text fields — save immediately on blur via saveMe, but also collect here
    INFO_FIELDS.forEach(f => {
      if (sf[f.key] !== undefined) upd[f.key] = sf[f.key] || null;
      // Info card photos — store actual base64 in Supabase so all users see them
      if (sf[f.photoKey] !== undefined) {
        upd[f.photoKey] = sf[f.photoKey] || null; // real base64, not __local__
      }
    });
    if (Object.keys(upd).length > 0) saveMe(upd);
    setSf({ u: "", pw: "", pw2: "", bio: undefined });
    notify("Saved ✓");
  };

  // Helper: resolve a stored photo key to actual base64
  const resolvePhoto = (user, photoKey) => {
    const val = user[photoKey];
    if (!val) return null;
    if (val.startsWith("__local__")) return LS.get(`icard_${user.id}_${val.replace("__local__","")}`);
    return val; // legacy direct base64
  };

  // Helper: resolve profile song
  const resolveProfileSong = (user) => {
    if (!user.hasProfileSong && !user.profileSong) return null;
    const stored = LS.get(`psong_${user.id}`);
    return stored ? { song: stored.song, name: stored.name } : (user.profileSong ? { song: user.profileSong, name: user.profileSongName } : null);
  };

  if (pg === "loading" || (pg === "app" && dbLoading)) return <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
    <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: BLUE, padding: "14px 28px", borderRadius: 9999, boxShadow: "0 6px 24px rgba(29,155,240,0.4)", overflow: "hidden" }}>
      <img src={LOGO} style={{ width: 60, height: 60, objectFit: "contain", margin: "-12px -6px" }} alt="Scrypt logo" />
      <span style={{ fontWeight: 700, fontSize: 22, color: "white" }}>Scrypt</span>
    </div>
    <div style={{ color: T.sub, fontSize: 14 }}>Loading…</div>
  </div>;
  if (pg === "login") return <Login onLogin={u => { setMe({ ...u, village: Array.isArray(u.village)?u.village:[] }); LS.set("session_uid", u.id); setDbLoading(false); if (u.dark!=null&&u.dark!==undefined) setDark(!!u.dark); setPg("app"); setTab("home"); }} onSignup={() => setPg("signup")} dark={dark} setDark={setDark} T={T} />;
  if (pg === "signup") return <Signup onDone={u => { setMe({...u,village:Array.isArray(u.village)?u.village:[]}); LS.set("session_uid", u.id); setDbLoading(false); setPg("app"); setTab("home"); notify("Welcome to Scrypt! 🎉"); }} onBack={() => setPg("login")} dark={dark} setDark={setDark} T={T} />;

  const myV = Array.isArray(me?.village) ? me.village : [];
  const blockedUsers = new Set(tryParse(localStorage.getItem("blocked_users"), []));
  const feed = (() => {
    const mutualIds = new Set(users.filter(u => myV.includes(u.id) && (Array.isArray(u.village) ? u.village : []).includes(me.id)).map(u => u.id));
    const villageIds = new Set(myV);
    const filtered = posts.filter(p => !p.parentId && !blockedUsers.has(p.userId) && (!p.villageOnly || (p.userId === me.id || myV.includes(p.userId))));
    const priorityScore = p => {
      if (p.userId === me.id) return 3;
      if (mutualIds.has(p.userId)) return 2;
      if (villageIds.has(p.userId)) return 1;
      return 0;
    };
    return filtered.sort((a, b) => {
      const diff = priorityScore(b) - priorityScore(a);
      if (diff !== 0) return diff;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  })();
  const mine = posts.filter(p => p.userId === me.id && !p.parentId);
  const villagers = users.filter(u => myV.includes(u.id));
  const mutuals = users.filter(u => myV.includes(u.id) && (Array.isArray(u.village)?u.village:[]).includes(me.id));
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
    {showTed && <TedChat T={T} onClose={() => { setShowTed(false); setTedInit(null); }} init={tedInit} />}
    {openUser && <ProfileModal user={openUser} me={me} onClose={() => setOpenUser(null)} onVillage={doVillage} onBlock={doBlock} onIM={u => { setDmUser(u); setTab("dms"); setThread(null); setActiveGroup(null); setOpenUser(null); }} T={T} posts={posts} onThread={p => { setOpenUser(null); setThread(p); setTab("home"); }} onLike={doLike} onRt={doRt} onReply={doPost} onDelete={doDelete} />}
    {showPP && <PicPicker onPick={doPickDef} onClose={() => setShowPP(false)} T={T} />}
    {showWallpaper && <WallpaperPicker onPick={doWallpaper} onClose={() => setShowWallpaper(false)} T={T} />}

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
            const newClick = { id: Date.now().toString(), name: cName.trim(), image: cImg, members: [me.id], ownerId: me.id, createdAt: new Date().toISOString() };
            setClicks(prev => [newClick, ...prev]);
            DB.insertClick(clickToRow(newClick)).catch(() => {});
            setCName(""); setCImg(null); setShowNewClick(false); notify("Click created! 🎉");
          }} style={{ background: BLUE, color: "white", border: "none", borderRadius: 9999, padding: "7px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Create Click</button>
        </div>
      </div>
    </div>}

    {/* Click Modal */}
    {openClick && (() => {
      const liveClick = clicks.find(c => c.id === openClick.id) || openClick;
      return <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 8000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div style={{ background: T.card, borderRadius: "16px 16px 0 0", width: "100%", maxWidth: 600, height: "85vh", overflow: "auto", border: `1px solid ${T.border}` }}>
          <div style={{ position: "sticky", top: 0, background: T.card, padding: "11px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10, zIndex: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg, ${BLUE}, ${PURPLE})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, overflow: "hidden" }}>
              {liveClick.image ? <img src={liveClick.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (liveClick.name.match(/[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]/u) || ["🏘️"])[0]}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: T.text }}>{liveClick.name}</div>
              <div style={{ fontSize: 11, color: T.sub }}>{liveClick.members?.length || 0} members · {posts.filter(p => p.clickId === liveClick.id && !p.parentId).length} posts</div>
            </div>
            <button onClick={() => { doJoin(liveClick.id); setOpenClick(liveClick); }} style={{ background: liveClick.members?.includes(me.id) ? T.input : BLUE, color: liveClick.members?.includes(me.id) ? T.text : "white", border: "none", borderRadius: 9999, padding: "6px 13px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>{liveClick.members?.includes(me.id) ? "Joined ✓" : "Join"}</button>
            <button onClick={() => setOpenClick(null)} style={{ background: "none", border: "none", cursor: "pointer", color: T.text }}><XI /></button>
          </div>
          <Compose me={me} onPost={doPost} T={T} users={users} placeholder={`Post in ${liveClick.name}...`} clickId={liveClick.id} />
          {posts.filter(p => p.clickId === liveClick.id && !p.parentId).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).map(p => <Post key={p.id} p={p} me={me} users={users} all={posts} onLike={doLike} onRt={doRt} onReply={r => doPost({ ...r, parentId: p.id })} onThread={setThread} onUser={setOpenUser} onDelete={doDelete} T={T} />)}
          {posts.filter(p => p.clickId === liveClick.id && !p.parentId).length === 0 && <p style={{ textAlign: "center", color: T.sub, padding: "32px 16px" }}>No posts yet. Be the first! 👋</p>}
        </div>
      </div>;
    })()}

    {/* HEADER */}
    <div style={{ position: "sticky", top: 0, zIndex: 100, background: dark ? "rgba(0,0,0,0.92)" : "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${T.border}` }}>
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "8px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div onClick={() => setShowCompose(true)} style={{ display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer", background: BLUE, borderRadius: 9999, padding: "3px 10px 3px 3px", overflow: "hidden" }}>
          <img src={LOGO} style={{ width: 54, height: 54, objectFit: "contain", mixBlendMode: "screen", flexShrink: 0, margin: "-12px -3px" }} alt="logo" />
          <span style={{ fontWeight: 900, fontSize: 14, color: "white" }}>Scrypt</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => { setTedInit(null); setShowTed(true); }} style={{ background: `linear-gradient(135deg, ${BLUE}, ${PURPLE})`, color: "white", border: "none", borderRadius: 9999, padding: "4px 8px", fontWeight: 700, fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
            <SparkI /> Ask @Ted
          </button>
          <button onClick={() => setDark(d => !d)} style={{ background: "none", border: "none", cursor: "pointer", color: T.sub }}>{dark ? <SunI /> : <MoonI />}</button>
          <div onClick={() => setOpenUser(me)} style={{ cursor: "pointer" }}><Av user={me} sz={32} /></div>
        </div>
      </div>
    </div>

    {/* CONTENT */}
    <div style={{ maxWidth: 600, margin: "0 auto", paddingBottom: 76 }}>
      {thread && <Thread p={thread} me={me} users={users} all={posts} onLike={doLike} onRt={doRt} onReply={doPost} onBack={() => setThread(null)} onUser={setOpenUser} onDelete={doDelete} T={T} />}

      {!thread && tab === "home" && <>
        <div style={{ padding: "8px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: T.sub, display: "flex", alignItems: "center", gap: 4 }}>📅 Chronological · No algorithm</span>
          <button onClick={() => window.location.reload()} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: T.sub, background: "none", border: "none", cursor: "pointer", padding: "3px 8px", borderRadius: 9999 }}>🔄 Refresh</button>
        </div>
        <Compose me={me} onPost={doPost} T={T} users={users} />
        {feed.map(p => <Post key={p.id} p={p} me={me} users={users} all={posts} onLike={doLike} onRt={doRt} onReply={r => doPost({ ...r, parentId: p.id })} onThread={setThread} onUser={setOpenUser} onDelete={doDelete} T={T} />)}
        {feed.length === 0 && <p style={{ textAlign: "center", color: T.sub, padding: "40px 16px" }}>No posts yet. Say something! 👋</p>}
      </>}

      {!thread && tab === "search" && <div>
        <div style={{ padding: "10px 16px", borderBottom: `1px solid ${T.border}`, position: "sticky", top: 56, background: T.bg, zIndex: 10 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search people, posts, topics..." style={{ ...inp, borderRadius: 9999, paddingLeft: 16 }} autoFocus />
        </div>
        {search.length >= 2 ? <>
          {/* People results */}
          {users.filter(u => u.username.toLowerCase().includes(search.toLowerCase()) && !u.isBot).slice(0, 5).map(u => <div key={u.id} onClick={() => setOpenUser(u)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: `1px solid ${T.border}`, cursor: "pointer" }}>
            <Av user={u} sz={44} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: T.text, display: "flex", alignItems: "center", gap: 5 }}>{u.username}{u.verified && <span style={{ color: BLUE, fontSize: 13 }}>✓</span>}</div>
              <div style={{ fontSize: 13, color: T.sub }}>{u.bio || `@${u.username.toLowerCase()}`}</div>
            </div>
            <button onClick={e => { e.stopPropagation(); doVillage(u.id); }} style={{ background: myV.includes(u.id) ? T.input : BLUE, color: myV.includes(u.id) ? T.text : "white", border: "none", borderRadius: 9999, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{myV.includes(u.id) ? "In Village" : "+ Village"}</button>
          </div>)}
          {/* Special accounts matching */}
          {["bot_scryptbot","bot_minerva","bot_news","claude_account","evil_ted"].map(id => users.find(u => u.id === id)).filter(Boolean).filter(u => u.username.toLowerCase().includes(search.toLowerCase())).map(u => <div key={u.id} onClick={() => setOpenUser(u)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: `1px solid ${T.border}`, cursor: "pointer", background: dark ? "#0d0d1a" : "#f0f4ff" }}>
            <Av user={u} sz={44} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: T.text, display: "flex", alignItems: "center", gap: 5 }}>{u.username}<span style={{ color: BLUE, fontSize: 13 }}>✓</span></div>
              <div style={{ fontSize: 13, color: T.sub }}>{u.bio}</div>
            </div>
            <span style={{ fontSize: 11, color: BLUE, fontWeight: 600, background: `${BLUE}18`, borderRadius: 9999, padding: "3px 8px" }}>Official</span>
          </div>)}
          {/* Post results */}
          {posts.filter(p => !p.parentId && p.content?.toLowerCase().includes(search.toLowerCase())).slice(0, 8).map(p => <Post key={p.id} p={p} me={me} users={users} all={posts} onLike={doLike} onRt={doRt} onReply={r => doPost({ ...r, parentId: p.id })} onThread={setThread} onUser={setOpenUser} onDelete={doDelete} T={T} />)}
          {users.filter(u => u.username.toLowerCase().includes(search.toLowerCase())).length === 0 &&
           posts.filter(p => p.content?.toLowerCase().includes(search.toLowerCase())).length === 0 &&
            <p style={{ textAlign: "center", color: T.sub, padding: "32px 16px" }}>No results for "{search}"</p>}
        </> : <>
          {/* Discover — Official Accounts */}
          <div style={{ padding: "7px 16px", fontSize: 11, fontWeight: 700, color: T.sub, borderBottom: `1px solid ${T.border}`, letterSpacing: 0.5 }}>OFFICIAL SCRYPT ACCOUNTS</div>
          {["claude_account","bot_scryptbot","bot_minerva","bot_news"].map(id => users.find(u => u.id === id)).filter(Boolean).map(u => <div key={u.id} onClick={() => setOpenUser(u)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: `1px solid ${T.border}`, cursor: "pointer" }}>
            <Av user={u} sz={48} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: T.text, display: "flex", alignItems: "center", gap: 5 }}>{u.username}<span style={{ color: BLUE, fontSize: 13 }}>✓</span></div>
              <div style={{ fontSize: 12, color: T.sub, lineHeight: 1.4 }}>{u.bio}</div>
            </div>
          </div>)}
          {/* Suggested people */}
          <div style={{ padding: "7px 16px", fontSize: 11, fontWeight: 700, color: T.sub, borderBottom: `1px solid ${T.border}`, letterSpacing: 0.5 }}>SUGGESTED PEOPLE</div>
          {(() => {
            const PINNED_IDS = ["bot_scryptbot","bot_minerva","bot_news","bot_abandonware","claude_account"];
            const pinned = PINNED_IDS.map(id => users.find(u => u.id === id)).filter(Boolean);
            const others = users.filter(u => !u.isBot && u.id !== me.id && !myV.includes(u.id)).slice(0, 4);
            return [...pinned, ...others].slice(0, 8);
          })().map(u => <div key={u.id} onClick={() => setOpenUser(u)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderBottom: `1px solid ${T.border}`, cursor: "pointer" }}>
            <Av user={u} sz={42} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: T.text, display: "flex", alignItems: "center", gap: 4 }}>{u.username}{u.verified && <span style={{ color: BLUE, fontSize: 12 }}>✓</span>}</div>
              <div style={{ fontSize: 12, color: T.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.bio?.slice(0, 55) || `@${u.username.toLowerCase()}`}</div>
            </div>
            {!myV.includes(u.id) && u.id !== me.id && <button onClick={e => { e.stopPropagation(); doVillage(u.id); }} style={{ background: BLUE, color: "white", border: "none", borderRadius: 9999, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>+ Village</button>}
          </div>)}
        </>}
      </div>}

      {!thread && tab === "clicks" && <div>
        <div style={{ padding: "11px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: T.text }}>Clicks</div>
          <button onClick={() => setShowNewClick(true)} style={{ background: BLUE, color: "white", border: "none", borderRadius: 9999, padding: "5px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}><PlusI /> New Click</button>
        </div>
        {/* My Clicks */}
        {clicks.filter(c => c.members?.includes(me.id)).length > 0 && <>
          <div style={{ padding: "7px 16px", fontSize: 11, fontWeight: 700, color: T.sub, borderBottom: `1px solid ${T.border}`, letterSpacing: 0.5 }}>JOINED</div>
          {clicks.filter(c => c.members?.includes(me.id)).map(c => {
            const emoji = (c.name.match(/[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]/u) || ["🏘️"])[0];
            const postCount = posts.filter(p => p.clickId === c.id && !p.parentId).length;
            return <div key={c.id} onClick={() => setOpenClick(c)} style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: "13px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: c.image ? "transparent" : `linear-gradient(135deg, ${BLUE}, ${PURPLE})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, overflow: "hidden", flexShrink: 0, border: `2px solid ${BLUE}30` }}>
                {c.image ? <img src={c.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : emoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                <div style={{ fontSize: 12, color: T.sub }}>{c.members?.length || 0} members · {postCount} posts</div>
              </div>
              <div style={{ fontSize: 11, color: BLUE, fontWeight: 700, background: `${BLUE}15`, borderRadius: 9999, padding: "3px 8px" }}>Joined ✓</div>
            </div>;
          })}
        </>}
        {/* Discover */}
        {clicks.filter(c => !c.members?.includes(me.id)).length > 0 && <>
          <div style={{ padding: "7px 16px", fontSize: 11, fontWeight: 700, color: T.sub, borderBottom: `1px solid ${T.border}`, letterSpacing: 0.5 }}>DISCOVER</div>
          {clicks.filter(c => !c.members?.includes(me.id)).map(c => {
            const emoji = (c.name.match(/[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]/u) || ["🏘️"])[0];
            const postCount = posts.filter(p => p.clickId === c.id && !p.parentId).length;
            return <div key={c.id} onClick={() => setOpenClick(c)} style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: "13px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: c.image ? "transparent" : `linear-gradient(135deg, ${PURPLE}, #1a1a2e)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, overflow: "hidden", flexShrink: 0 }}>
                {c.image ? <img src={c.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : emoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                <div style={{ fontSize: 12, color: T.sub }}>{c.members?.length || 0} members · {postCount} posts</div>
              </div>
              <button onClick={e => { e.stopPropagation(); doJoin(c.id); }} style={{ background: BLUE, color: "white", border: "none", borderRadius: 9999, padding: "6px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer", flexShrink: 0 }}>Join</button>
            </div>;
          })}
        </>}
      </div>}

      {!thread && tab === "notif" && <>
        <HomeTrending posts={posts} users={users} T={T} onThread={p => { setThread(p); setTab("home"); }} onUser={setOpenUser} />
        <NotifTab me={me} users={users} posts={posts} T={T} onViewUser={setOpenUser} onDmUser={u => { setDmUser(u); setTab("dms"); setThread(null); setActiveGroup(null); }} />
      </>}

      {!thread && tab === "dms" && !dmUser && !activeGroup && <div>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: T.text, marginBottom: 3 }}>Instant Messages</div>
            <div style={{ fontSize: 13, color: T.sub }}>Mutuals can IM · Anyone can group chat</div>
          </div>
          <button onClick={() => setShowNewGroup(true)} style={{ background: BLUE, color: "white", border: "none", borderRadius: 9999, padding: "4px 9px", fontWeight: 700, fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}><PlusI /> Group</button>
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
              saveGroupChats(updated, me.id);
              setShowNewGroup(false); setNewGroupName(""); setNewGroupMembers([]);
              setActiveGroup(g); notify("Group created! 🎉");
            }} disabled={!newGroupName.trim() || newGroupMembers.length === 0} style={{ background: BLUE, color: "white", border: "none", borderRadius: 9999, padding: "7px", width: "100%", fontWeight: 700, fontSize: 12, cursor: "pointer", opacity: (!newGroupName.trim() || newGroupMembers.length === 0) ? 0.5 : 1 }}>Create Group ({newGroupMembers.length} members)</button>
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

      {!thread && tab === "dms" && dmUser && <DMView me={me} other={dmUser} users={users} T={T} onBack={() => setDmUser(null)} onCall={() => setVoiceCall({ participants: [me.id, dmUser.id] })} getKey={getKey} claudeFetch={claudeFetch} onViewUser={setOpenUser} />}
      {!thread && tab === "dms" && activeGroup && !dmUser && <GroupChatView me={me} group={activeGroup} users={users} T={T} onBack={() => setActiveGroup(null)} onCall={() => setVoiceCall({ participants: activeGroup.members.slice(0, 4) })} onUpdateGroup={g => { const updated = groupChats.map(x => x.id === g.id ? g : x); saveGroupChats(updated, me.id); setActiveGroup(g); }} getKey={getKey} claudeFetch={claudeFetch} onViewUser={setOpenUser} />}

      {!thread && tab === "profile" && <div>
        {/* View as others see it */}
        <div style={{ padding: "10px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "flex-end" }}>
          <button onClick={() => setOpenUser(me)} style={{ background: T.input, color: T.text, border: `1px solid ${T.border}`, borderRadius: 9999, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>👤 View my profile</button>
        </div>
        {/* Banner */}
        {(() => {
          const myAccent = getAccent(me);
          const bannerBg = me.wallpaper?.type === "image" ? `url(${me.wallpaper.value}) center/cover` : (me.wallpaper?.value || myAccent.grad);
          const feat = me.featuredPostId ? posts.find(p => p.id === me.featuredPostId) : null;
          return <>
            <div style={{ height: 110, background: bannerBg, position: "relative", overflow: "visible", flexShrink: 0, borderBottom: `2px solid ${myAccent.color}` }}>
              <button onClick={() => setShowWallpaper(true)} style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)", color: "white", border: "none", borderRadius: 9999, padding: "5px 11px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>🖼️ Edit banner</button>
              <div style={{ position: "absolute", bottom: -32, left: 16, border: `3px solid ${myAccent.color}`, borderRadius: "50%", zIndex: 2, overflow: "hidden", lineHeight: 0 }}>
                <Av user={me} sz={62} />
              </div>
            </div>
            <div style={{ padding: "40px 16px 12px", borderBottom: `1px solid ${T.border}` }}>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginBottom: 8 }}>
                <button onClick={() => setShowPP(true)} style={{ background: T.input, color: T.text, border: `1px solid ${T.border}`, borderRadius: 9999, padding: "5px 11px", fontSize: 12, cursor: "pointer" }}>Choose pic</button>
                <button onClick={() => avRef.current.click()} style={{ background: T.input, color: T.text, border: `1px solid ${T.border}`, borderRadius: 9999, padding: "5px 11px", fontSize: 12, cursor: "pointer" }}>Upload photo</button>
                <input ref={avRef} type="file" accept="image/*" style={{ display: "none" }} onChange={doAvatar} />
              </div>
              <div style={{ fontWeight: 800, fontSize: 19, color: T.text }}>{me.username}</div>
              <div style={{ fontSize: 13, color: T.sub }}>@{me.username.toLowerCase()}</div>
              {me.mood && <div style={{ fontSize: 14, color: myAccent.color, marginTop: 3, fontStyle: "italic" }}>{me.mood}</div>}
              {me.bio && <div style={{ fontSize: 14, color: T.text, marginTop: 5 }}>{me.bio}</div>}
              <div style={{ display: "flex", gap: 20, marginTop: 10 }}>
                <span style={{ fontSize: 13, color: T.sub }}><strong style={{ color: myAccent.color }}>{mine.length}</strong> Scrypts</span>
                <span style={{ fontSize: 13, color: T.sub }}><strong style={{ color: myAccent.color }}>{myV.length}</strong> Village</span>
                <span style={{ fontSize: 13, color: T.sub }}><strong style={{ color: myAccent.color }}>{mutuals.length}</strong> Mutuals</span>
              </div>
            </div>
            {(() => { const s = resolveProfileSong(me); return s ? <div style={{ padding: "10px 16px", borderBottom: `1px solid ${T.border}` }}><ProfileSongPlayer songSrc={s.song} songName={s.name} accent={myAccent} /></div> : null; })()}
            {INFO_FIELDS.some(f => me[f.key]) && <div style={{ padding: "10px 16px", borderBottom: `1px solid ${T.border}` }}><ProfileInfoCards user={me} accent={myAccent} resolvePhoto={resolvePhoto} /></div>}
            {feat && <div style={{ margin: "10px 16px", padding: "10px 12px", border: `1.5px solid ${myAccent.color}`, borderRadius: 12, background: `${myAccent.color}08` }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: myAccent.color, marginBottom: 5 }}>📌 FEATURED SCRYPT</div>
              <p style={{ margin: 0, fontSize: 13, color: T.text, lineHeight: 1.5 }}>{censor(feat.content)}</p>
              <div style={{ fontSize: 10, color: T.sub, marginTop: 4 }}>{feat.likes?.length || 0} likes · {ago(feat.createdAt)}</div>
            </div>}
          </>;
        })()}
        <div style={{ padding: 12, borderBottom: `1px solid ${T.border}`, background: T.card }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: T.text, marginBottom: 8 }}>🏘️ My Village</div>
          {villagers.length === 0 && <p style={{ fontSize: 12, color: T.sub, margin: 0 }}>No villagers yet. Search for people to add!</p>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {villagers.map(v => {
              const isMutual = (v.village || []).includes(me.id);
              return <div key={v.id} onClick={() => setOpenUser(v)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer" }}>
                <div style={{ position: "relative" }}>
                  <Av user={v} sz={40} />
                  {isMutual && <div style={{ position: "absolute", bottom: 0, right: 0, background: "#00BA7C", borderRadius: "50%", width: 13, height: 13, border: `2px solid ${T.card}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7 }}>✓</div>}
                </div>
                <span style={{ fontSize: 9, color: T.sub, maxWidth: 40, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.username}</span>
              </div>;
            })}
          </div>
        </div>
        {mine.filter(p => p.villageOnly).length > 0 && <>
          <div style={{ padding: "7px 16px", fontSize: 11, fontWeight: 700, color: PURPLE, borderBottom: `1px solid ${T.border}` }}>🔒 VILLAGE POSTS</div>
          {mine.filter(p => p.villageOnly).map(p => <Post key={p.id} p={p} me={me} users={users} all={posts} onLike={doLike} onRt={doRt} onReply={r => doPost({ ...r, parentId: p.id })} onThread={setThread} onUser={setOpenUser} onDelete={doDelete} T={T} />)}
        </>}
        <div style={{ padding: "7px 16px", fontSize: 11, fontWeight: 700, color: T.sub, borderBottom: `1px solid ${T.border}` }}>MY SCRYPTS</div>
        {mine.filter(p => !p.villageOnly).map(p => <Post key={p.id} p={p} me={me} users={users} all={posts} onLike={doLike} onRt={doRt} onReply={r => doPost({ ...r, parentId: p.id })} onThread={setThread} onUser={setOpenUser} onDelete={doDelete} T={T} />)}
        {mine.filter(p => !p.villageOnly).length === 0 && <p style={{ textAlign: "center", color: T.sub, padding: "24px 16px", fontSize: 14 }}>No posts yet. Start Scrypting!</p>}
      </div>}

      {!thread && tab === "settings" && (() => {
        const myAccent = getAccent(me);
        const inp13 = { width: "100%", background: T.input, border: "none", borderRadius: 10, padding: "9px 12px", color: T.text, fontSize: 13, outline: "none", boxSizing: "border-box" };
        return <div style={{ padding: 16, paddingBottom: 90 }}>

          {/* ── PROFILE BASICS ── */}
          <div style={{ background: T.card, borderRadius: 14, padding: 16, marginBottom: 12, border: `1px solid ${T.border}` }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: T.text, marginBottom: 12 }}>Profile</div>
            <div style={{ height: 72, borderRadius: 10, background: me.wallpaper?.type === "image" ? `url(${me.wallpaper.value}) center/cover` : (me.wallpaper?.value || myAccent.grad), position: "relative", marginBottom: 10, overflow: "hidden" }}>
              <button onClick={() => setShowWallpaper(true)} style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.5)", color: "white", border: "none", borderRadius: 8, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>🖼️ Change banner</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <Av user={me} sz={46} />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button onClick={() => setShowPP(true)} style={{ background: T.input, color: T.text, border: `1px solid ${T.border}`, borderRadius: 8, padding: "5px 10px", fontSize: 12, cursor: "pointer" }}>Choose pic</button>
                <button onClick={() => avRef2.current.click()} style={{ background: T.input, color: T.text, border: `1px solid ${T.border}`, borderRadius: 8, padding: "5px 10px", fontSize: 12, cursor: "pointer" }}>Upload photo</button>
                <input ref={avRef2} type="file" accept="image/*" style={{ display: "none" }} onChange={doAvatar} />
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div><label style={{ fontSize: 11, color: T.sub, display: "block", marginBottom: 3 }}>USERNAME</label><input value={sf.u} onChange={e => setSf(p => ({ ...p, u: e.target.value }))} placeholder={me.username} style={inp13} /></div>
              <div><label style={{ fontSize: 11, color: T.sub, display: "block", marginBottom: 3 }}>BIO</label><input value={sf.bio !== undefined ? sf.bio : (me.bio || "")} onChange={e => setSf(p => ({ ...p, bio: e.target.value }))} onBlur={e => { saveMe({ bio: e.target.value || null }); setSf(p => ({ ...p, bio: undefined })); }} placeholder="Tell us about yourself..." style={inp13} /></div>
              <div><label style={{ fontSize: 11, color: T.sub, display: "block", marginBottom: 3 }}>😌 MOOD STATUS</label><input value={sf.mood !== undefined ? sf.mood : (me.mood || "")} onChange={e => setSf(p => ({ ...p, mood: e.target.value }))} onBlur={e => { saveMe({ mood: e.target.value || null }); setSf(p => ({ ...p, mood: undefined })); }} placeholder='e.g. "feeling unstoppable today 🔥"' style={inp13} /></div>
            </div>
          </div>

          {/* ── ACCENT COLOR ── */}
          <div style={{ background: T.card, borderRadius: 14, padding: 16, marginBottom: 12, border: `1px solid ${T.border}` }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: T.text, marginBottom: 10 }}>🎨 Accent Color</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {ACCENT_COLORS.map(ac => <div key={ac.id} onClick={() => { setSf(p => ({ ...p, accentColor: ac.id })); saveMe({ accentColor: ac.id }); }} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer" }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: ac.grad, border: `3px solid ${(sf.accentColor ?? me.accentColor) === ac.id ? "white" : "transparent"}`, outline: (sf.accentColor ?? me.accentColor) === ac.id ? `2px solid ${ac.color}` : "none", transition: "all 0.15s" }} />
                <span style={{ fontSize: 9, color: T.sub }}>{ac.label}</span>
              </div>)}
            </div>
          </div>

          {/* ── PROFILE INFO CARDS ── */}
          <div style={{ background: T.card, borderRadius: 14, padding: 16, marginBottom: 12, border: `1px solid ${T.border}` }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: T.text, marginBottom: 3 }}>🃏 Profile Cards</div>
            <div style={{ fontSize: 12, color: T.sub, marginBottom: 14 }}>Showcase your favorites — photo optional</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {INFO_FIELDS.map(f => {
                const openCrop = (file) => {
                  const r = new FileReader();
                  r.onload = x => { setCropSrc(x.target.result); setCropKey(f.photoKey); };
                  r.readAsDataURL(file);
                };
                const currentPhoto = sf[f.photoKey] !== undefined ? sf[f.photoKey] : resolvePhoto(me, f.photoKey);
                const currentText = sf[f.key] !== undefined ? sf[f.key] : (me[f.key] || "");
                return <div key={f.key} style={{ display: "flex", gap: 10, alignItems: "center", background: T.input, borderRadius: 12, overflow: "hidden", border: `1px solid ${T.border}` }}>
                  <div style={{ position: "relative", flexShrink: 0, width: 62, height: 62, background: currentPhoto ? "transparent" : f.grad, overflow: "hidden" }}>
                    {currentPhoto
                      ? <img src={currentPhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{f.icon}</div>}
                    <label style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.35)", cursor: "pointer", opacity: 0, transition: "opacity 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                      <span style={{ color: "white", fontSize: 18 }}>📷</span>
                      <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const file = e.target.files[0]; if (file) openCrop(file); e.target.value = ""; }} />
                    </label>
                  </div>
                  <div style={{ flex: 1, padding: "8px 10px 8px 0" }}>
                    <div style={{ fontSize: 10, color: myAccent.color, fontWeight: 700, marginBottom: 5, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>{f.icon} {f.label.toUpperCase()}</span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <label style={{ fontSize: 10, color: T.sub, cursor: "pointer", padding: "2px 6px", borderRadius: 6, border: `1px solid ${T.border}`, background: T.card }}>
                          {currentPhoto ? "Change" : "Add photo"}
                          <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const file = e.target.files[0]; if (file) openCrop(file); e.target.value = ""; }} />
                        </label>
                        {currentPhoto && <button onClick={() => { LS.set(`icard_${me.id}_${f.photoKey}`, null); setSf(p => ({ ...p, [f.photoKey]: null })); saveMe({ [f.photoKey]: null }); }} style={{ fontSize: 10, color: PINK, cursor: "pointer", padding: "2px 6px", borderRadius: 6, border: `1px solid ${PINK}30`, background: "transparent" }}>✕ Photo</button>}
                        {(me[f.key] || currentText) && <button onClick={() => { setSf(p => ({ ...p, [f.key]: "" })); saveMe({ [f.key]: null }); }} style={{ fontSize: 10, color: PINK, cursor: "pointer", padding: "2px 6px", borderRadius: 6, border: `1px solid ${PINK}30`, background: "transparent" }}>✕ Clear</button>}
                      </div>
                    </div>
                    <input value={currentText} onChange={e => setSf(p => ({ ...p, [f.key]: e.target.value }))} onBlur={e => { saveMe({ [f.key]: e.target.value || null }); setSf(p => ({ ...p, [f.key]: undefined })); }} placeholder={`Your ${f.label.toLowerCase()}...`} style={{ ...inp13, padding: "6px 9px", fontSize: 13 }} />
                  </div>
                </div>;
              })}
            </div>
          </div>

          {/* ── FEATURED SCRYPT ── */}
          <div style={{ background: T.card, borderRadius: 14, padding: 16, marginBottom: 12, border: `1px solid ${T.border}` }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: T.text, marginBottom: 6 }}>📌 Featured Scrypt</div>
            <div style={{ fontSize: 12, color: T.sub, marginBottom: 10 }}>Pin one post to the top of your profile</div>
            {posts.filter(p => p.userId === me.id && !p.parentId && !p.villageOnly).slice(0, 8).map(p => {
              const isFeat = (sf.featuredPostId ?? me.featuredPostId) === p.id;
              return <div key={p.id} onClick={() => { const newId = isFeat ? null : p.id; setSf(prev => ({ ...prev, featuredPostId: newId })); saveMe({ featuredPostId: newId }); }} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "8px 10px", borderRadius: 10, marginBottom: 5, cursor: "pointer", background: isFeat ? `${myAccent.color}18` : T.input, border: `1.5px solid ${isFeat ? myAccent.color : "transparent"}` }}>
                <div style={{ marginTop: 2, color: isFeat ? myAccent.color : T.sub, fontSize: 14 }}>{isFeat ? "📌" : "○"}</div>
                <div style={{ flex: 1, fontSize: 12, color: T.text, lineHeight: 1.4 }}>{p.content.slice(0, 80)}{p.content.length > 80 ? "…" : ""}</div>
              </div>;
            })}
            {posts.filter(p => p.userId === me.id && !p.parentId && !p.villageOnly).length === 0 && <p style={{ fontSize: 12, color: T.sub, margin: 0 }}>No posts yet to feature.</p>}
          </div>

          {/* ── PROFILE SONG ── */}
          <div style={{ background: T.card, borderRadius: 14, padding: 16, marginBottom: 12, border: `1px solid ${T.border}` }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: T.text, marginBottom: 4 }}>🎵 Profile Song</div>
            <div style={{ fontSize: 12, color: T.sub, marginBottom: 10 }}>Upload a short audio clip (up to ~10 sec) that plays on your profile</div>
            {(me.hasProfileSong || me.profileSong || sf.profileSong) && (() => { const preview = sf.profileSong; const s = preview ? {song:preview,name:sf.profileSongName} : resolveProfileSong(me); return s ? <div style={{ marginBottom: 8 }}><ProfileSongPlayer songSrc={s.song} songName={s.name} accent={myAccent} /></div> : null; })()}
            <label style={{ display: "inline-block", background: T.input, color: T.text, border: `1px solid ${T.border}`, borderRadius: 8, padding: "7px 14px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
              🎵 {me.profileSong ? "Change Song" : "Upload Song"}
              <input type="file" accept="audio/*" style={{ display: "none" }} onChange={e => {
                const f = e.target.files[0]; if (!f) return;
                const r = new FileReader();
                r.onload = x => { const song = x.target.result, name = f.name; setSf(p => ({ ...p, profileSong: song, profileSongName: name })); LS.set(`psong_${me.id}`, { song, name }); saveMe({ hasProfileSong: true, profileSongName: name }); };
                r.readAsDataURL(f);
              }} />
            </label>
            {(sf.profileSong || me.profileSong || me.hasProfileSong) && <button onClick={() => { setSf(p => ({ ...p, profileSong: null, profileSongName: null })); LS.set(`psong_${me.id}`, null); saveMe({ hasProfileSong: false, profileSongName: null }); }} style={{ marginLeft: 8, background: "transparent", color: PINK, border: `1px solid ${PINK}`, borderRadius: 8, padding: "7px 12px", fontSize: 12, cursor: "pointer" }}>Remove</button>}
            {sf.profileSong && <div style={{ fontSize: 11, color: T.sub, marginTop: 6 }}>Preview: {sf.profileSongName}</div>}
          </div>

          {serr && <div style={{ fontSize: 13, color: PINK, padding: "8px 12px", background: dark ? "#1a0810" : "#fff0f5", borderRadius: 8, marginBottom: 12 }}>{serr}</div>}

          <button onClick={() => { setMe(null); localStorage.removeItem("session_uid"); setPg("login"); }} style={{ background: "transparent", color: PINK, border: `2px solid ${PINK}`, borderRadius: 9999, padding: "6px", width: "100%", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>Sign Out</button>

          {/* ── CHANGE USERNAME ── */}
          <div style={{ background: T.card, borderRadius: 14, padding: 16, marginBottom: 12, border: `1px solid ${T.border}` }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: T.text, marginBottom: 4 }}>✏️ Change Username</div>
            <div style={{ fontSize: 12, color: T.sub, marginBottom: 10 }}>Pick a new username. Min 3 characters, no spaces.</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={sf.u !== undefined ? sf.u : ""}
                onChange={e => setSf(p => ({ ...p, u: e.target.value.replace(/\s/g, "").toLowerCase() }))}
                placeholder={me.username}
                style={{ ...inp13, flex: 1 }}
                maxLength={24}
              />
              <button onClick={() => {
                const t = (sf.u || "").trim().toLowerCase();
                if (!t || t.length < 3) { setSerr("Min 3 characters."); return; }
                if (users.find(u => u.username.toLowerCase() === t && u.id !== me.id)) { setSerr("Username already taken."); return; }
                saveMe({ username: t });
                setMe(prev => ({ ...prev, username: t }));
                setUsers(prev => prev.map(u => u.id === me.id ? { ...u, username: t } : u));
                setSf(p => ({ ...p, u: "" }));
                setSerr("");
                notify("Username updated ✓");
              }} style={{ background: BLUE, color: "white", border: "none", borderRadius: 9999, padding: "9px 16px", fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>Save</button>
            </div>
            {serr && <div style={{ fontSize: 12, color: PINK, marginTop: 6 }}>{serr}</div>}
          </div>

          {/* ── CHANGE PASSWORD ── */}
          <div style={{ marginTop: 16, background: T.card, borderRadius: 14, padding: 16, marginBottom: 12, border: `1px solid ${T.border}` }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: T.text, marginBottom: 4 }}>🔒 Change Password</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input type="password" value={sf.pw} onChange={e => setSf(p => ({ ...p, pw: e.target.value }))} placeholder="New password" style={inp13} />
              <input type="password" value={sf.pw2} onChange={e => setSf(p => ({ ...p, pw2: e.target.value }))} placeholder="Confirm new password" style={inp13} />
              <button onClick={() => { if (!sf.pw) return; if (sf.pw.length < 6) { setSerr("Min 6 chars"); return; } if (sf.pw !== sf.pw2) { setSerr("Passwords don't match"); return; } saveMe({ password: sf.pw }); setSf(p => ({ ...p, pw: "", pw2: "" })); setSerr(""); notify("Password updated ✓"); }} style={{ background: myAccent.color, color: "white", border: "none", borderRadius: 9999, padding: "7px", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>Update Password</button>
            </div>
          </div>

          {/* ── AI FEATURES ── */}
          <div style={{ marginTop: 16, background: T.card, borderRadius: 14, padding: 16, border: `1px solid ${dark ? "#1a3300" : "#d1fae5"}` }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: T.text, marginBottom: 4 }}>✨ AI Features</div>
            <div style={{ fontSize: 12, color: "#00BA7C", display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              ✓ Ted, Evil Ted & AI features are active for all users
            </div>
            <div style={{ fontSize: 12, color: T.sub, lineHeight: 1.6 }}>
              Powered by <strong style={{ color: T.text }}>Groq</strong> + <strong style={{ color: T.text }}>Llama 3.3</strong>. Optionally enter your own Groq key to use your own quota.
            </div>
            <input
              type="password"
              value={apiKey}
              onChange={e => { setApiKey(e.target.value); LS.set("apiKey", e.target.value); setSharedKey(e.target.value); }}
              placeholder="gsk_... (optional — your own Groq key)"
              style={{ ...inp13, fontFamily: "monospace", marginTop: 8 }}
            />
          </div>
        </div>;
      })()}
    </div>

    {/* GLOBAL IMAGE CROP MODAL — renders regardless of active tab */}
    {cropSrc && <ImageCropModal src={cropSrc} T={T} onClose={() => { setCropSrc(null); setCropKey(null); }} onSave={dataUrl => {
      if (cropKey === "__avatar__") {
        const nu = users.map(u => u.id === me.id ? { ...u, avatar: dataUrl } : u);
        setUsers(nu); setMe(p => ({ ...p, avatar: dataUrl }));
        DB.updateUser(me.id, { avatar: dataUrl }).catch(() => {});
      } else {
        // Info card photo: store base64 directly in Supabase (inside info_fields) so
        // other users can see it too. Also cache in localStorage for instant load.
        const lsKey = `icard_${me.id}_${cropKey}`;
        LS.set(lsKey, dataUrl);
        // Store the actual base64 on `me` — NOT a __local__ marker
        const updatedMe = { ...me, [cropKey]: dataUrl };
        setMe(updatedMe);
        setSf(p => ({ ...p, [cropKey]: dataUrl }));
        setUsers(prev => prev.map(u => u.id === me.id ? updatedMe : u));
        // Save only the info_fields blob with the real base64
        const info_fields = JSON.stringify({
          infoMovie:       updatedMe.infoMovie       || null,
          infoArtist:      updatedMe.infoArtist      || null,
          infoShow:        updatedMe.infoShow        || null,
          infoBook:        updatedMe.infoBook        || null,
          infoGame:        updatedMe.infoGame        || null,
          infoMoviePhoto:  updatedMe.infoMoviePhoto  || null,
          infoArtistPhoto: updatedMe.infoArtistPhoto || null,
          infoShowPhoto:   updatedMe.infoShowPhoto   || null,
          infoBookPhoto:   updatedMe.infoBookPhoto   || null,
          infoGamePhoto:   updatedMe.infoGamePhoto   || null,
          dark:            updatedMe.dark !== undefined ? updatedMe.dark : null,
        });
        DB.updateUser(me.id, { info_fields }).catch(e => console.error("photo save", e));
      }
      setCropSrc(null); setCropKey(null);
    }} />}



    {/* BOTTOM NAV */}
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 8000, background: dark ? "rgba(0,0,0,0.97)" : "rgba(255,255,255,0.97)", backdropFilter: "blur(12px)", borderTop: `1px solid ${T.border}` }}>
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
