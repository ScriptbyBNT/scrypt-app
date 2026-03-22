import { useState, useRef, useCallback, useEffect } from "react"; 
const BLUE="#1D9BF0", PURPLE="#7c3aed", PINK="#F91880"; 
const LS={get:k=>{try{return JSON.parse(localStorage.getItem(k));}catch{return null;}},set:(const BAD=["fuck","shit","bitch","asshole","dick","pussy","cunt","bastard","crap","piss","coconst hasBad=t=>{if(!t)return false;return BAD.some(w=>t.toLowerCase().includes(w));}; const censor=t=>{if(!t)return t;let r=t;BAD.forEach(w=>{r=r.replace(new RegExp(w,"gi"),w[0]+const ago=iso=>{const d=new Date(iso),now=new Date(),ms=now-d;if(ms<60000)return"just now";i
const SU=JSON.parse("[{\"id\": \"bot_000\", \"username\": \"alex_rivera\", \"avatar\": \"httconst SP=JSON.parse("[{\"id\": \"cpost_1143\", \"userId\": \"bot_050\", \"username\": \"thorconst SC=JSON.parse("[{\"id\": \"click_nyc\", \"name\": \"New York City \", \"image\": nulconst DEFS=JSON.parse("[{\"id\": \"d0\", \"label\": \"Ocean Wave\", \"url\": \"data:image/svconst LOGO="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAANwAAAB4CAYAAACZ15x5AAAZDUlEQVR42u
// ── ICONS ──────────────────────────────────────────────────────────────────── const Ic=(d,s=20)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentconst HomeI =()=>Ic("M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10"); const SrchI =()=>Ic("M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z"); const GrpI =()=>Ic("M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8zconst UserI =()=>Ic("M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 11a4 4 0 100-8 4 4 0 000 8const BellI =()=>Ic("M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 01-3.46 0"); const GearI =()=>Ic("M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06const ImgI =()=>Ic("M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2z M8.const XI =()=>Ic("M18 6L6 18M6 6l12 12",18); 
const SunI =()=>Ic("M12 17A5 5 0 1012 7a5 5 0 000 10zM12 1v2M12 21v2M4.22 4.22l1.42 1.42M1const MoonI =()=>Ic("M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z",18); const PlusI =()=>Ic("M12 5v14M5 12h14",20); 
const SparkI =()=>Ic("M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 const ReplyI =()=>Ic("M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",18); const BackI =()=>Ic("M19 12H5M12 5l-7 7 7 7"); 
const LockI =()=>Ic("M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z M7const MsgI =()=>Ic("M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"); const SendI =()=>Ic("M22 2L11 13 M22 2L15 22 8 13 2 2z",18); 
const FlagI =()=>Ic("M4 15s1-1 4-1 4 2 8 2 4-1 4-1V3s-1 1-4 1-4-2-8-2-4 1-4 1z M4 22v-7",18)const HrtI =({on})=><svg width="18" height="18" viewBox="0 0 24 24" fill={on?PINK:"none"} const RtI =({on})=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={on
// ── AVATAR ──────────────────────────────────────────────────────────────────── const Av=({user,sz=40,onClick})=>{ 
 const [err,setErr]=useState(false); 
 const cols=[BLUE,PURPLE,PINK,"#ea580c","#16a34a","#0891b2"]; 
 const bg=cols[((user?.username||"?").charCodeAt(0)||0)%cols.length];  const s={width:sz,height:sz,borderRadius:"50%",flexShrink:0,cursor:onClick?"pointer":"defa
 if(user?.avatar&&!err) return <img src={user.avatar} alt="" onError={()=>setErr(true)} sty return <div onClick={onClick} style={{...s,background:bg,display:"flex",alignItems:"center}; 
// ── RICH TEXT ───────────────────────────────────────────────────────────────── const Rich=({text,users,onUser})=>{ 
 if(!text)return null; 
 return <>{text.split(/(@\w+)/g).map((p,i)=>{ 
 if(p.startsWith("@")){const n=p.slice(1).toLowerCase();const u=users.find(x=>x.username. return <span key={i}>{p}</span>; 
 })}</>; 
}; 
// ── MENTION PICKER ──────────────────────────────────────────────────────────── const MentionPicker=({q,users,onPick,T})=>{ 
 const m=q!=null?["claude",...users.map(u=>u.username)].filter(n=>n.toLowerCase().startsWit if(!m.length)return null; 
 return <div style={{position:"absolute",bottom:"100%",left:0,right:0,background:T.card,bor {m.map(name=>{const u=users.find(x=>x.username===name);return( 
 <div key={name} onMouseDown={e=>{e.preventDefault();onPick(name);}} style={{display:"f {name==="claude"?<div style={{width:32,height:32,borderRadius:"50%",background:`line <div><div style={{fontWeight:700,fontSize:13,color:T.text}}>@{name}</div>{u?.bio&&<d </div> 
 );})} 
 </div>; 
}; 
// ── REPORT MODAL ────────────────────────────────────────────────────────────── const ReportModal=({post,onClose,T})=>{ 
 const [reason,setReason]=useState("");const [done,setDone]=useState(false);  const reasons=["Spam or misleading","Harassment or hate speech","Violent or dangerous cont const submit=()=>{ 
 if(!reason)return; 
 const reports=LS.get("reports")||[]; 
 reports.push({postId:post.id,reason,ts:new Date().toISOString()});  LS.set("reports",reports); 
 setDone(true); 
 }; 
 return( 
 <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:9500,display:" <div style={{background:T.card,borderRadius:16,padding:24,width:"100%",maxWidth:420,bo {done?<> 
 <div style={{textAlign:"center",padding:"16px 0"}}> 
 <div style={{fontSize:40,marginBottom:12}}> </div> 
 <div style={{fontWeight:800,fontSize:18,color:T.text,marginBottom:8}}>Report sub <div style={{fontSize:14,color:T.sub,marginBottom:20}}>Thanks for helping keep S <button onClick={onClose} style={{background:BLUE,color:"white",border:"none",bo
 </div> 
 </>:<> 
 <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",mar <span style={{fontWeight:800,fontSize:17,color:T.text}}>Report Scrypt</span>  <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointe </div> 
 <div style={{fontSize:13,color:T.sub,marginBottom:14}}>Why are you reporting this  <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:18}}>  {reasons.map(r=>( 
 <button key={r} onClick={()=>setReason(r)} style={{background:reason===r?BLUE: ))} 
 </div> 
 <button onClick={submit} disabled={!reason} style={{background:PINK,color:"white", </>} 
 </div> 
 </div> 
 ); 
}; 
// ── PIC PICKER ──────────────────────────────────────────────────────────────── const PicPicker=({onPick,onClose,T})=>( 
 <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:9000,display:"fl <div style={{background:T.card,borderRadius:16,padding:24,width:"100%",maxWidth:440,bord <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginB <span style={{fontWeight:800,fontSize:17,color:T.text}}>Choose a profile pic</span> 
 <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",c </div> 
 <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12}}>  {DEFS.map(d=>( 
 <div key={d.id} onClick={()=>onPick(d.url)} style={{cursor:"pointer",textAlign:"ce <img src={d.url} style={{width:54,height:54,borderRadius:"50%",border:`2px solid <div style={{fontSize:9,color:T.sub,marginTop:4,overflow:"hidden",textOverflow:" </div> 
 ))} 
 </div> 
 </div> 
 </div> 
); 
// ── TERMS ───────────────────────────────────────────────────────────────────── const Terms=({onAccept,T})=>( 
 <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:9999,display:"fl <div style={{background:T.card,borderRadius:16,maxWidth:520,width:"100%",maxHeight:"85vh <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>  <div style={{background:BLUE,borderRadius:14,padding:"6px 10px"}}><img src={LOGO} st <span style={{fontWeight:800,fontSize:20,color:BLUE}}>Scrypt</span>  </div>
 <h2 style={{margin:"0 0 12px",fontSize:17,fontWeight:700,color:T.text}}>Terms of Servi <div style={{fontSize:13,lineHeight:1.7,color:T.sub}}> 
 <p><strong style={{color:T.text}}>1. User Responsibility</strong> — You are solely r <p><strong style={{color:T.text}}>2. Prohibited Content</strong> — No illegal conten <p><strong style={{color:T.text}}>3. Section 230</strong> — Scrypt operates under 47 <p><strong style={{color:T.text}}>4. AI Features</strong> — Claude (Anthropic) power <p><strong style={{color:T.text}}>5. Reporting</strong> — Use the flag button to rep <p><strong style={{color:T.text}}>6. Disclaimer</strong> — PROVIDED "AS IS" WITHOUT  </div> 
 <button onClick={onAccept} style={{width:"100%",padding:14,background:BLUE,color:"whit </div> 
 </div> 
); 
// ── CLAUDE CHAT ─────────────────────────────────────────────────────────────── const ClaudeChat=({T,onClose,init})=>{ 
 const [msgs,setMsgs]=useState([{role:"assistant",content:"Hi! I'm Claude, your AI assistan const [input,setInput]=useState("");const [busy,setBusy]=useState(false);const endRef=useR useEffect(()=>endRef.current?.scrollIntoView({behavior:"smooth"}),[msgs]);  const send=async txt=>{ 
 const text=(txt||input).trim();if(!text||busy)return; 
 const next=[...msgs,{role:"user",content:text}]; 
 setMsgs(next);setInput("");setBusy(true); 
 try{ 
 const api=next.slice(next[0].role==="assistant"?1:0).map(m=>({role:m.role,content:m.co const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"C const d=await r.json(); 
 setMsgs(p=>[...p,{role:"assistant",content:d.content?.[0]?.text||"Sorry, try again."}]) }catch{setMsgs(p=>[...p,{role:"assistant",content:"Connection error. Try again!"}]);}  setBusy(false); 
 }; 
 useEffect(()=>{if(init)send(init);},[]); 
 return( 
 <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:8900,display: <div style={{background:T.card,borderRadius:"16px 16px 0 0",width:"100%",maxWidth:600, <div style={{padding:"13px 16px",borderBottom:`1px solid ${T.border}`,display:"flex", <div style={{width:36,height:36,borderRadius:"50%",background:`linear-gradient(135 <div style={{flex:1}}><div style={{fontWeight:700,fontSize:15,color:T.text}}>Claud <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer", </div> 
 <div style={{flex:1,overflow:"auto",padding:16}}> 
 {msgs.map((m,i)=>( 
 <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"f {m.role==="assistant"&&<div style={{width:26,height:26,borderRadius:"50%",back <div style={{maxWidth:"78%",padding:"9px 13px",borderRadius:m.role==="user"?"1 </div> 
 ))}
 {busy&&<div style={{display:"flex",gap:8,alignItems:"center"}}>  <div style={{width:26,height:26,borderRadius:"50%",background:`linear-gradient(1 <div style={{padding:"9px 13px",background:T.input,borderRadius:12,display:"flex </div>} 
 <div ref={endRef}/> 
 </div> 
 <div style={{padding:"10px 14px",borderTop:`1px solid ${T.border}`,display:"flex",ga <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key=== <button onClick={()=>send()} disabled={!input.trim()||busy} style={{background:BLU </div> 
 <style>{`@keyframes dot0{from{transform:translateY(0)}to{transform:translateY(-5px)}} </div> 
 </div> 
 ); 
}; 
// ── PROFILE MODAL ───────────────────────────────────────────────────────────── const ProfileModal=({user,me,onClose,onVillage,T,posts})=>{ 
 const myV=me.village||[];const inV=myV.includes(user.id);const isMe=user.id===me.id;  const theirV=user.village||[];const mutual=inV&&theirV.includes(me.id);  const pub=posts.filter(p=>p.userId===user.id&&!p.parentId&&!p.villageOnly);  return( 
 <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:8800,display: <div style={{background:T.card,borderRadius:"16px 16px 0 0",width:"100%",maxWidth:600, <div style={{height:80,background:`linear-gradient(135deg,${BLUE},${PURPLE})`,border <button onClick={onClose} style={{position:"absolute",top:10,right:12,background:" </div> 
 <div style={{padding:"0 20px 20px",marginTop:-30}}> 
 <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",m <div style={{border:`3px solid ${T.card}`,borderRadius:"50%"}}><Av user={user} s {!isMe&&<div style={{display:"flex",gap:8,alignItems:"center"}}>  {mutual&&<button style={{background:T.input,color:T.text,border:`1px solid ${T. <button onClick={()=>onVillage(user.id)} style={{background:inV?"transparent": </div>} 
 </div> 
 <div style={{fontWeight:800,fontSize:18,color:T.text}}>{user.username}{user.isBitC <div style={{fontSize:13,color:T.sub,marginBottom:4}}>@{user.username.toLowerCase() {user.bio&&<div style={{fontSize:14,color:T.text,margin:"4px 0 10px"}}>{user.bio}< <div style={{display:"flex",gap:20,marginBottom:14}}> 
 <span style={{fontSize:14,color:T.sub}}><strong style={{color:T.text}}>{pub.leng <span style={{fontSize:14,color:T.sub}}><strong style={{color:T.text}}>{(user.vi <span style={{fontSize:14,color:T.sub}}><strong style={{color:T.text}}>{pub.redu </div> 
 {pub.slice(0,5).map(p=><div key={p.id} style={{padding:"8px 0",borderTop:`1px soli <p style={{margin:0,fontSize:14,color:T.text,lineHeight:1.5}}>{censor(p.content)} <div style={{fontSize:11,color:T.sub,marginTop:3}}>{ago(p.createdAt)} · {p.likes </div>)}
 {pub.length===0&&<p style={{textAlign:"center",color:T.sub,padding:"14px 0",fontSi </div> 
 </div> 
 </div> 
 ); 
}; 
// ── DM VIEW ─────────────────────────────────────────────────────────────────── const DMView=({me,other,T,onBack})=>{ 
 const key=`dm_${[me.id,other.id].sort().join("_")}`; 
 const [msgs,setMsgs]=useState(()=>LS.get(key)||[]); 
 const [input,setInput]=useState("");const endRef=useRef(); 
 useEffect(()=>endRef.current?.scrollIntoView({behavior:"smooth"}),[msgs]);  const send=()=>{ 
 if(!input.trim())return; 
 const m={id:Date.now().toString(),from:me.id,text:input,ts:new Date().toISOString()};  const next=[...msgs,m];setMsgs(next);LS.set(key,next);setInput("");  }; 
 return( 
 <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 120px)"}}>  <div style={{padding:"11px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",a <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",co <Av user={other} sz={36}/> 
 <div style={{flex:1}}><div style={{fontWeight:700,fontSize:15,color:T.text}}>{other. </div> 
 <div style={{flex:1,overflow:"auto",padding:16,display:"flex",flexDirection:"column",g {msgs.length===0&&<p style={{textAlign:"center",color:T.sub,fontSize:13,marginTop:40} {msgs.map(m=>{const mine=m.from===me.id;return( 
 <div key={m.id} style={{display:"flex",justifyContent:mine?"flex-end":"flex-start", {!mine&&<Av user={other} sz={28}/>} 
 <div style={{maxWidth:"72%"}}> 
 <div style={{padding:"9px 13px",borderRadius:mine?"14px 14px 4px 14px":"14px 1 <div style={{fontSize:10,color:T.sub,marginTop:2,textAlign:mine?"right":"left"} </div> 
 </div> 
 );})} 
 <div ref={endRef}/> 
 </div> 
 <div style={{padding:"10px 14px",borderTop:`1px solid ${T.border}`,display:"flex",gap: <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="E <button onClick={send} disabled={!input.trim()} style={{background:BLUE,color:"white </div> 
 </div> 
 ); 
}; 
// ── NOTIFICATIONS + TRENDING ──────────────────────────────────────────────────
const NotifTab=({me,users,posts,T})=>{ 
 const [trending,setTrending]=useState(null);const [tBusy,setTBusy]=useState(false);  const myPosts=posts.filter(p=>p.userId===me.id); 
 const notifs=[]; 
 myPosts.forEach(p=>{ 
 (p.likes||[]).forEach(uid=>{if(uid!==me.id){const u=users.find(x=>x.id===uid);if(u)notif (p.reposts||[]).forEach(uid=>{if(uid!==me.id){const u=users.find(x=>x.id===uid);if(u)not }); 
 posts.filter(p=>p.parentId&&myPosts.find(x=>x.id===p.parentId)&&p.userId!==me.id).forEach( const u=users.find(x=>x.id===p.userId);if(u)notifs.push({id:`rp_${p.id}`,type:"reply",us }); 
 notifs.sort((a,b)=>new Date(b.ts)-new Date(a.ts)); 
 const loadTrending=async()=>{ 
 setTBusy(true); 
 const sample=posts.slice(0,40).map(p=>p.content).join(" | "); 
 try{ 
 const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"C const d=await r.json();const txt=d.content?.[0]?.text||"[]"; 
 setTrending(JSON.parse(txt.replace(/```json|```/g,"").trim())); 
 }catch{setTrending(["AI & Tech","Sports Talk","City Life","Music Vibes","Daily Thoughts"] setTBusy(false); 
 }; 
 useEffect(()=>{loadTrending();},[]); 
 return( 
 <div> 
 <div style={{background:T.card,borderBottom:`1px solid ${T.border}`,padding:16}}>  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",margi <div style={{fontWeight:800,fontSize:16,color:T.text}}>Trending on Scrypt</div>  <div style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:BLUE,curso </div> 
 {tBusy&&<div style={{color:T.sub,fontSize:13,display:"flex",alignItems:"center",gap: {trending&&!tBusy&&<div style={{display:"flex",flexWrap:"wrap",gap:8}}>  {trending.map((t,i)=><div key={i} style={{background:T.input,borderRadius:9999,pad </div>} 
 </div> 
 <div style={{padding:"9px 16px",fontSize:12,fontWeight:700,color:T.sub,borderBottom:`1 {notifs.length===0&&<p style={{textAlign:"center",color:T.sub,padding:"32px 16px",font {notifs.slice(0,60).map(n=>( 
 <div key={n.id} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 16px <Av user={n.user} sz={40}/> 
 <div style={{flex:1,minWidth:0}}> 
 <span style={{fontWeight:700,color:T.text}}>{n.user.username}</span>  <span style={{color:T.sub,fontSize:14}}> {n.type==="like"?"liked your Scrypt":n. {n.post.content&&<div style={{fontSize:12,color:T.sub,marginTop:1,overflow:"hidd </div>
 <div style={{fontSize:16,flexShrink:0}}>{n.type==="like"?" ":n.type==="repost"?"  </div> 
 ))} 
 <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>  </div> 
 ); 
}; 
// ── COMPOSE ─────────────────────────────────────────────────────────────────── const Compose=({me,onPost,T,users,placeholder,clickId,parentId,onCancel,compact})=>{  const [text,setText]=useState("");const [img,setImg]=useState(null);const [vill,setVill]=u const fRef=useRef();const taRef=useRef(); 
 const onChange=e=>{setText(e.target.value);const b=e.target.value.slice(0,e.target.selecti const pickM=name=>{const pos=taRef.current?.selectionStart||text.length;setText(text.slice const submit=()=>{if(!text.trim()&&!img)return;onPost({content:text,image:img,clickId:clic const pickImg=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload return( 
 <div style={{background:T.card,borderBottom:`1px solid ${T.border}`,padding:compact?"9px <div style={{display:"flex",gap:10}}> 
 <Av user={me} sz={compact?34:42}/> 
 <div style={{flex:1,position:"relative"}}> 
 {mq!==null&&<MentionPicker q={mq} users={users} onPick={pickM} T={T}/>}  <textarea ref={taRef} value={text} onChange={onChange} placeholder={placeholder||( {img&&<div style={{position:"relative",display:"inline-block",marginBottom:8}}><im {vill&&!compact&&<div style={{fontSize:11,color:PURPLE,marginBottom:5,display:"fle <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",pad <div style={{display:"flex",gap:2}}> 
 <button onClick={()=>fRef.current.click()} style={{background:"none",border:"n <input ref={fRef} type="file" accept="image/*" style={{display:"none"}} onChan {!compact&&!parentId&&<button onClick={()=>setVill(v=>!v)} style={{background: </div> 
 <div style={{display:"flex",gap:8,alignItems:"center"}}> 
 <span style={{fontSize:12,color:text.length>260?PINK:T.sub}}>{280-text.length} {onCancel&&<button onClick={onCancel} style={{background:"none",border:"none", <button onClick={submit} disabled={!text.trim()&&!img} style={{background:vill </div> 
 </div> 
 </div> 
 </div> 
 </div> 
 ); 
}; 
// ── POST CARD ───────────────────────────────────────────────────────────────── const Post=({p,me,users,all,onLike,onRt,onReply,onThread,onUser,T})=>{  const author=users.find(u=>u.id===p.userId)||{username:p.username||"anon"};  const liked=p.likes?.includes(me?.id);const rted=p.reposts?.includes(me?.id);
 const rCount=all.filter(x=>x.parentId===p.id).length||p.replyCount||0;  const [showR,setShowR]=useState(false);const [showRep,setShowRep]=useState(false);  if(p.villageOnly&&p.userId!==me?.id&&!(me?.village||[]).includes(p.userId))return null;  return( 
 <div style={{background:T.card,borderBottom:`1px solid ${T.border}`}}>  {showRep&&<ReportModal post={p} onClose={()=>setShowRep(false)} T={T}/>}  <div style={{padding:"12px 16px",display:"flex",gap:10}}> 
 <Av user={author} sz={42} onClick={()=>onUser&&onUser(author)}/>  <div style={{flex:1,minWidth:0}}> 
 <div style={{display:"flex",gap:5,alignItems:"baseline",flexWrap:"wrap",marginBott <div style={{display:"flex",gap:5,alignItems:"baseline",flexWrap:"wrap"}}>  <span onClick={()=>onUser&&onUser(author)} style={{fontWeight:700,fontSize:15, <span style={{fontSize:13,color:T.sub}}>@{author.username.toLowerCase()} · {ag {p.villageOnly&&<span style={{fontSize:10,color:PURPLE,background:T.input,bord </div> 
 {p.userId!==me?.id&&<button onClick={e=>{e.stopPropagation();setShowRep(true);}} </div> 
 <div style={{fontSize:15,lineHeight:1.6,color:T.text,marginBottom:8,wordBreak:"bre {p.image&&<img src={p.image} alt="" style={{borderRadius:12,maxWidth:"100%",maxHei <div style={{display:"flex",alignItems:"center",marginLeft:-6}}>  <button onClick={()=>setShowR(v=>!v)} style={{background:"none",border:"none",cu <button onClick={()=>onLike(p.id)} style={{background:"none",border:"none",curso <button onClick={()=>onRt(p.id)} style={{background:"none",border:"none",cursor: {rCount>0&&<button onClick={()=>onThread(p)} style={{background:"none",border:"n </div> 
 </div> 
 </div> 
 {showR&&<Compose me={me} onPost={pp=>{onReply(pp);setShowR(false);}} T={T} users={user </div> 
 ); 
}; 
// ── THREAD ──────────────────────────────────────────────────────────────────── const Thread=({p,me,users,all,onLike,onRt,onReply,onBack,onUser,T})=>{  const replies=all.filter(x=>x.parentId===p.id).sort((a,b)=>new Date(a.createdAt)-new Date( return <div> 
 <div style={{padding:"10px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",ali <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",colo </div> 
 <Post p={p} me={me} users={users} all={all} onLike={onLike} onRt={onRt} onReply={onReply} <Compose me={me} onPost={onReply} T={T} users={users} compact parentId={p.id} clickId={p. {replies.map(r=><Post key={r.id} p={r} me={me} users={users} all={all} onLike={onLike} o {replies.length===0&&<p style={{textAlign:"center",color:T.sub,padding:"24px 0",fontSize: </div>; 
}; 
// ── AUTH ──────────────────────────────────────────────────────────────────────
const Login=({onLogin,onSignup,dark,setDark,T})=>{ 
 const [u,setU]=useState("");const [pw,setPw]=useState("");const [err,setErr]=useState("");  const go=()=>{setErr("");const all=LS.get("su")||[];const f=all.find(x=>x.username===u&&x. const s={width:"100%",background:T.input,border:"none",borderRadius:10,padding:"12px 14px", return <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",j <div style={{maxWidth:380,width:"100%"}}> 
 <div style={{textAlign:"center",marginBottom:28}}> 
 <div style={{display:"inline-flex",alignItems:"center",gap:10,background:BLUE,paddin <img src={LOGO} style={{width:46,height:46,objectFit:"contain"}}/><span style={{fo </div> 
 <p style={{marginTop:8,color:T.sub,fontSize:13}}>Powered by <strong style={{color:BL </div> 
 <div style={{background:T.card,borderRadius:16,padding:"24px 20px",border:`1px solid ${ <h2 style={{margin:"0 0 18px",fontSize:20,fontWeight:800,color:T.text}}>Sign in</h2>  <div style={{display:"flex",flexDirection:"column",gap:11}}> 
 <input value={u} onChange={e=>setU(e.target.value)} placeholder="Username" style={ <input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder= {err&&<div style={{fontSize:13,color:PINK,padding:"8px 12px",background:dark?"#1a0 <button onClick={go} style={{background:BLUE,color:"white",border:"none",borderRad <button onClick={onSignup} style={{background:"transparent",color:T.text,border:`2 </div> 
 </div> 
 <div style={{textAlign:"center",marginTop:12}}> 
 <button onClick={()=>setDark(d=>!d)} style={{background:"none",border:"none",cursor: </div> 
 </div> 
 </div>; 
}; 
const Signup=({onDone,onBack,dark,setDark,T})=>{ 
 const [u,setU]=useState("");const [pw,setPw]=useState("");const [pw2,setPw2]=useState(""); const fRef=useRef(); 
 const go=()=>{setErr("");const t=u.trim();const all=LS.get("su")||[];if(t.length<3){setErr const confirm=()=>{const all=LS.get("su")||[];const nu={id:Date.now().toString(),username: const s={width:"100%",background:T.input,border:"none",borderRadius:10,padding:"12px 14px", return <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",j {terms&&<Terms onAccept={confirm} T={T}/>} 
 {showPP&&<PicPicker onPick={url=>{setAv(url);setShowPP(false);}} onClose={()=>setShowPP( <div style={{maxWidth:380,width:"100%"}}> 
 <div style={{textAlign:"center",marginBottom:28}}> 
 <div style={{display:"inline-flex",alignItems:"center",gap:10,background:BLUE,paddin <img src={LOGO} style={{width:46,height:46,objectFit:"contain"}}/><span style={{fo </div> 
 </div> 
 <div style={{background:T.card,borderRadius:16,padding:"24px 20px",border:`1px solid ${ <h2 style={{margin:"0 0 18px",fontSize:20,fontWeight:800,color:T.text}}>Create accou <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
 {av?<img src={av} style={{width:58,height:58,borderRadius:"50%",objectFit:"cover", <div style={{display:"flex",gap:8,flexWrap:"wrap"}}> 
 <button onClick={()=>setShowPP(true)} style={{background:T.input,color:T.text,bo <button onClick={()=>fRef.current.click()} style={{background:T.input,color:T.te <input ref={fRef} type="file" accept="image/*" style={{display:"none"}} onChange </div> 
 </div> 
 <div style={{display:"flex",flexDirection:"column",gap:11}}> 
 <input value={u} onChange={e=>setU(e.target.value)} placeholder="Username" style={ <input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder= <input type="password" value={pw2} onChange={e=>setPw2(e.target.value)} placeholde {err&&<div style={{fontSize:13,color:PINK,padding:"8px 12px",background:dark?"#1a0 <button onClick={go} style={{background:BLUE,color:"white",border:"none",borderRad <button onClick={onBack} style={{background:"transparent",color:T.text,border:`2px </div> 
 </div> 
 </div> 
 </div>; 
}; 
// ══════════════════════════════════════════════════════════════════════════════ export default function App(){ 
 const [dark,setDark]=useState(false); 
 const [pg,setPg]=useState("login");const [tab,setTab]=useState("home");  const [me,setMe]=useState(null); 
 const [users,setUsers]=useState(()=>LS.get("su")||[]); 
 const [posts,setPosts]=useState(()=>LS.get("sp")||[]); 
 const [clicks,setClicks]=useState(()=>LS.get("sc")||[]); 
 const [thread,setThread]=useState(null);const [openClick,setOpenClick]=useState(null);  const [openUser,setOpenUser]=useState(null);const [dmUser,setDmUser]=useState(null);  const [claudeInit,setClaudeInit]=useState(null);const [showClaude,setShowClaude]=useState( const [showCompose,setShowCompose]=useState(false);const [showNewClick,setShowNewClick]=us const [showPP,setShowPP]=useState(false);const [toast,setToast]=useState("");  const [search,setSearch]=useState(""); 
 const [sf,setSf]=useState({u:"",pw:"",pw2:"",bio:""});const [serr,setSerr]=useState("");  const [cName,setCName]=useState("");const [cImg,setCImg]=useState(null);  const avRef=useRef();const avRef2=useRef();const cImgRef=useRef(); 
 useEffect(()=>{ 
 const V="v16"; 
 if(LS.get("dv")!==V){ 
 const h=(LS.get("su")||[]).filter(u=>!u.isBot); 
 const m=[...h,...SU];LS.set("su",m);setUsers(m); 
 LS.set("sp",SP);setPosts(SP); 
 LS.set("sc",SC);setClicks(SC); 
 LS.set("dv",V); 
 }
 },[]); 
 const T={bg:dark?"#000":"#F7F9F9",card:dark?"#16181C":"#fff",text:dark?"#E7E9EA":"#0F1419", const notify=m=>{setToast(m);setTimeout(()=>setToast(""),3000);}; 
 const sv=(k,v,s)=>{LS.set(k,v);s(v);}; 
 const checkClaude=useCallback(txt=>{if(/@claude\b/i.test(txt)){const q=txt.replace(/@claud
 const doPost=useCallback(({content,image,clickId,parentId,villageOnly})=>{  const cur=LS.get("sp")||[]; 
 const p={id:Date.now().toString(),userId:me.id,username:me.username,content,image,clickI const upd=parentId?cur.map(x=>x.id===parentId?{...x,replyCount:(x.replyCount||0)+1}:x):c sv("sp",[p,...upd],setPosts); 
 notify(villageOnly?"Posted to Village!":parentId?"Reply posted!":"Scrypt posted!");  checkClaude(content); 
 if(!villageOnly&&!parentId){ 
 const bots=(LS.get("su")||[]).filter(u=>u.isBot); // 250 Bit Chads  const sh=[...bots].sort(()=>Math.random()-0.5); 
 const lc=Math.floor(Math.random()*7)+1;const rc=Math.random()<0.18?Math.floor(Math.ran sh.slice(0,lc).forEach((b,i)=>setTimeout(()=>{const c=LS.get("sp")||[];const u=c.map(x sh.slice(lc,lc+rc).forEach((b,i)=>setTimeout(()=>{const c=LS.get("sp")||[];const u=c.m } 
 },[me,checkClaude]); 
 const doLike=id=>sv("sp",posts.map(p=>p.id!==id?p:{...p,likes:p.likes?.includes(me.id)?p.l const doRt=id=>{sv("sp",posts.map(p=>p.id!==id?p:{...p,reposts:p.reposts?.includes(me.id)? const doJoin=id=>sv("sc",clicks.map(c=>c.id!==id?c:{...c,members:c.members?.includes(me.id) const doVillage=uid=>{const v=me.village||[];const has=v.includes(uid);const nv=has?v.filt const doAvatar=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onloa const doPickDef=url=>{const nu=users.map(u=>u.id===me.id?{...u,avatar:url}:u);sv("su",nu,s const doSave=()=>{ 
 setSerr("");const upd={}; 
 if(sf.u&&sf.u.trim()!==me.username){const t=sf.u.trim();if(t.length<3){setSerr("Min 3 ch if(sf.pw){if(sf.pw.length<6){setSerr("Password min 6.");return;}if(sf.pw!==sf.pw2){setSe if(sf.bio)upd.bio=sf.bio; 
 sv("su",users.map(u=>u.id===me.id?{...u,...upd}:u),setUsers);setMe(p=>({...p,...upd}));s }; 
 if(pg==="login")return<Login onLogin={u=>{setMe({...u,village:u.village||[]});setPg("app"); if(pg==="signup")return<Signup onDone={u=>{setMe(u);setPg("app");setTab("home");notify("We
 const myV=me?.village||[]; 
 const feed=posts.filter(p=>!p.parentId&&(!p.villageOnly||(p.userId===me.id||myV.includes(p. const mine=posts.filter(p=>p.userId===me.id&&!p.parentId); 
 const villagers=users.filter(u=>myV.includes(u.id)); 
 const mutuals=users.filter(u=>myV.includes(u.id)&&(u.village||[]).includes(me.id));  const notifCount=posts.filter(p=>p.userId===me.id&&(((p.likes||[]).filter(x=>x!==me.id).le
 const inp={width:"100%",background:T.input,border:"none",borderRadius:10,padding:"10px 14p
 const Nav=({id,icon,label,badge})=>( 
 <button onClick={()=>{setTab(id);setThread(null);setDmUser(null);}} style={{flex:1,displ {icon} 
 {badge>0&&<div style={{position:"absolute",top:4,right:"calc(50% - 14px)",background:P <span style={{fontSize:10,fontWeight:tab===id?700:500}}>{label}</span>  </button> 
 ); 
 return( 
 <div style={{minHeight:"100vh",background:T.bg,fontFamily:"'Segoe UI',sans-serif",color: {toast&&<div style={{position:"fixed",top:18,left:"50%",transform:"translateX(-50%)",b {showClaude&&<ClaudeChat T={T} onClose={()=>{setShowClaude(false);setClaudeInit(null);} {openUser&&<ProfileModal user={openUser} me={me} onClose={()=>setOpenUser(null)} onVil {showPP&&<PicPicker onPick={doPickDef} onClose={()=>setShowPP(false)} T={T}/>} 
 {showCompose&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zInd <div style={{background:T.card,borderRadius:16,width:"100%",maxWidth:560,border:`1px <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",pad <span style={{fontWeight:700,fontSize:15,color:T.text}}>New Scrypt</span> 
 <button onClick={()=>setShowCompose(false)} style={{background:"none",border:"no </div> 
 <Compose me={me} onPost={p=>{doPost(p);setShowCompose(false);}} T={T} users={users} </div> 
 </div>} 
 {showNewClick&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIn <div style={{background:T.card,borderRadius:16,padding:22,width:"100%",maxWidth:400, <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",mar <span style={{fontWeight:800,fontSize:17,color:T.text}}>Create a Click</span> 
 <button onClick={()=>setShowNewClick(false)} style={{background:"none",border:"n </div> 
 <div style={{display:"flex",flexDirection:"column",gap:10}}>  <div onClick={()=>cImgRef.current.click()} style={{height:86,borderRadius:10,bor {cImg?<img src={cImg} alt="" style={{width:"100%",height:"100%",objectFit:"cov </div> 
 <input ref={cImgRef} type="file" accept="image/*" style={{display:"none"}} onCha <input value={cName} onChange={e=>setCName(e.target.value)} placeholder="Click n <button onClick={()=>{if(!cName.trim())return;sv("sc",[{id:Date.now().toString(), </div> 
 </div> 
 </div>} 
 {openClick&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex: <div style={{background:T.card,borderRadius:"16px 16px 0 0",width:"100%",maxWidth:60 <div style={{position:"sticky",top:0,background:T.card,padding:"11px 16px",borderB
 <div style={{width:40,height:40,borderRadius:10,background:`linear-gradient(135d <div style={{flex:1}}> 
 {openClick.ownerId===me.id?<input defaultValue={openClick.name} onBlur={e=>{co <div style={{fontSize:11,color:T.sub}}>{openClick.members?.length||0} members< </div> 
 <button onClick={()=>setOpenClick(null)} style={{background:"none",border:"none", </div> 
 <Compose me={me} onPost={doPost} T={T} users={users} placeholder={"Post in "+openC {posts.filter(p=>p.clickId===openClick.id&&!p.parentId).map(p=><Post key={p.id} p={ {posts.filter(p=>p.clickId===openClick.id&&!p.parentId).length===0&&<p style={{tex </div> 
 </div>} 
 {/* HEADER */} 
 <div style={{position:"sticky",top:0,zIndex:100,background:dark?"rgba(0,0,0,0.92)":"rg <div style={{maxWidth:600,margin:"0 auto",padding:"8px 16px",display:"flex",alignIte <div onClick={()=>setShowCompose(true)} style={{display:"inline-flex",alignItems:" <img src={LOGO} style={{width:28,height:28,objectFit:"contain"}}/><span style={{ </div> 
 <div style={{display:"flex",alignItems:"center",gap:8}}> 
 <button onClick={()=>{setClaudeInit(null);setShowClaude(true);}} style={{backgro {SparkI()} Ask @Claude 
 </button> 
 <button onClick={()=>setDark(d=>!d)} style={{background:"none",border:"none",cur <div onClick={()=>setOpenUser(me)} style={{cursor:"pointer"}}><Av user={me} sz={ </div> 
 </div> 
 </div> 
 {/* CONTENT */} 
 <div style={{maxWidth:600,margin:"0 auto",paddingBottom:76}}> 
 {thread&&<Thread p={thread} me={me} users={users} all={posts} onLike={doLike} onRt={
 {!thread&&tab==="home"&&<> 
 <div style={{padding:"8px 16px",borderBottom:`1px solid ${T.border}`,display:"flex <span style={{fontSize:12,color:T.sub,display:"flex",alignItems:"center",gap:4}} <div style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:T.sub}}> </div> 
 <Compose me={me} onPost={doPost} T={T} users={users}/> 
 {feed.map(p=><Post key={p.id} p={p} me={me} users={users} all={posts} onLike={doLi {feed.length===0&&<p style={{textAlign:"center",color:T.sub,padding:"40px 16px"}}> </>} 
 {!thread&&tab==="search"&&<div> 
 <div style={{padding:"10px 16px",borderBottom:`1px solid ${T.border}`}}>  <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Searc
 </div> 
 {search.length>=2&&<> 
 {users.filter(u=>u.username.toLowerCase().includes(search.toLowerCase())).slice( <div key={u.id} onClick={()=>setOpenUser(u)} style={{display:"flex",alignItems: <Av user={u} sz={44}/><div style={{flex:1}}><div style={{fontWeight:700,font <button onClick={e=>{e.stopPropagation();doVillage(u.id);}} style={{backgrou </div> 
 ))} 
 {posts.filter(p=>!p.parentId&&censor(p.content).toLowerCase().includes(search.to </>} 
 {search.length<2&&<p style={{textAlign:"center",color:T.sub,padding:"32px 16px",fo </div>} 
 {!thread&&tab==="clicks"&&<div> 
 <div style={{padding:"11px 16px",borderBottom:`1px solid ${T.border}`}}>  <button onClick={()=>setShowNewClick(true)} style={{background:BLUE,color:"white </div> 
 {clicks.map(c=>( 
 <div key={c.id} onClick={()=>setOpenClick(c)} style={{background:T.card,borderBo <div style={{width:46,height:46,borderRadius:11,background:`linear-gradient(13 <div style={{flex:1}}><div style={{fontWeight:700,fontSize:15,color:T.text}}>{ <button onClick={e=>{e.stopPropagation();doJoin(c.id);}} style={{background:c. </div> 
 ))} 
 </div>} 
 {!thread&&tab==="notif"&&<NotifTab me={me} users={users} posts={posts} T={T}/>} 
 {!thread&&tab==="dms"&&!dmUser&&<div> 
 <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`}}>  <div style={{fontWeight:800,fontSize:16,color:T.text,marginBottom:3}}>Messages</ <div style={{fontSize:13,color:T.sub}}>Only mutual Village members can DM each o </div> 
 {mutuals.length===0&&<div style={{padding:"32px 16px",textAlign:"center"}}>  <div style={{fontSize:36,marginBottom:12}}> </div> 
 <div style={{fontWeight:700,fontSize:16,color:T.text,marginBottom:6}}>No mutual  <div style={{fontSize:14,color:T.sub}}>Add people to your Village and wait for t </div>} 
 {mutuals.map(u=>( 
 <div key={u.id} onClick={()=>setDmUser(u)} style={{display:"flex",alignItems:"ce <Av user={u} sz={46}/> 
 <div style={{flex:1}}><div style={{fontWeight:700,fontSize:15,color:T.text}}>{ <div style={{color:T.sub,opacity:0.6}}>{MsgI()}</div> 
 </div> 
 ))} 
 </div>}
 {!thread&&tab==="dms"&&dmUser&&<DMView me={me} other={dmUser} T={T} onBack={()=>setD
 {!thread&&tab==="profile"&&<div> 
 <div style={{height:96,background:`linear-gradient(135deg,${BLUE},${PURPLE})`,posi <div style={{position:"absolute",bottom:-28,left:16,border:`4px solid ${T.card}`, </div> 
 <div style={{padding:"36px 16px 14px",borderBottom:`1px solid ${T.border}`}}>  <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginBottom:10}}>  <button onClick={()=>setShowPP(true)} style={{background:T.input,color:T.text, <button onClick={()=>avRef.current.click()} style={{background:T.input,color:T. <input ref={avRef} type="file" accept="image/*" style={{display:"none"}} onCha </div> 
 <div style={{fontWeight:800,fontSize:20,color:T.text}}>{me.username}</div>  <div style={{fontSize:13,color:T.sub}}>@{me.username.toLowerCase()}</div>  {me.bio&&<div style={{fontSize:14,color:T.text,marginTop:5}}>{me.bio}</div>}  <div style={{display:"flex",gap:20,marginTop:10}}> 
 <span style={{fontSize:14,color:T.sub}}><strong style={{color:T.text}}>{mine.l <span style={{fontSize:14,color:T.sub}}><strong style={{color:T.text}}>{myV.le <span style={{fontSize:14,color:T.sub}}><strong style={{color:T.text}}>{mutual </div> 
 </div> 
 <div style={{padding:14,borderBottom:`1px solid ${T.border}`,background:T.card}}>  <div style={{fontWeight:700,fontSize:13,color:T.text,marginBottom:10}}> My Vil {villagers.length===0&&<p style={{fontSize:12,color:T.sub,margin:0}}>No villager <div style={{display:"flex",gap:10,flexWrap:"wrap"}}> 
 {villagers.map(v=>{const isMutual=(v.village||[]).includes(me.id);return(  <div key={v.id} onClick={()=>setOpenUser(v)} style={{display:"flex",flexDire <div style={{position:"relative"}}><Av user={v} sz={44}/>{isMutual&&<div s <span style={{fontSize:9,color:T.sub,maxWidth:44,overflow:"hidden",textOve </div> 
 );})} 
 </div> 
 </div> 
 {mine.filter(p=>p.villageOnly).length>0&&<> 
 <div style={{padding:"8px 16px",fontSize:12,fontWeight:700,color:PURPLE,borderBo {mine.filter(p=>p.villageOnly).map(p=><Post key={p.id} p={p} me={me} users={user </>} 
 <div style={{padding:"8px 16px",fontSize:12,fontWeight:700,color:T.sub,borderBotto {mine.filter(p=>!p.villageOnly).map(p=><Post key={p.id} p={p} me={me} users={users} {mine.filter(p=>!p.villageOnly).length===0&&<p style={{textAlign:"center",color:T. </div>} 
 {!thread&&tab==="settings"&&<div style={{padding:16}}> 
 <div style={{background:T.card,borderRadius:14,padding:18,marginBottom:12,border:` <div style={{fontWeight:700,fontSize:15,color:T.text,marginBottom:14}}>Profile</ <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>  <Av user={me} sz={50}/>
 <div style={{display:"flex",gap:8,flexWrap:"wrap"}}> 
 <button onClick={()=>setShowPP(true)} style={{background:T.input,color:T.tex <button onClick={()=>avRef2.current.click()} style={{background:T.input,colo <input ref={avRef2} type="file" accept="image/*" style={{display:"none"}} on </div> 
 </div> 
 <div style={{display:"flex",flexDirection:"column",gap:9}}>  <div><label style={{fontSize:11,color:T.sub,display:"block",marginBottom:3}}>U <div><label style={{fontSize:11,color:T.sub,display:"block",marginBottom:3}}>B </div> 
 </div> 
 <div style={{background:T.card,borderRadius:14,padding:18,marginBottom:12,border:` <div style={{fontWeight:700,fontSize:15,color:T.text,marginBottom:12}}>Password< <div style={{display:"flex",flexDirection:"column",gap:9}}>  <input type="password" value={sf.pw} onChange={e=>setSf(p=>({...p,pw:e.target. <input type="password" value={sf.pw2} onChange={e=>setSf(p=>({...p,pw2:e.targe </div> 
 </div> 
 {serr&&<div style={{fontSize:13,color:PINK,padding:"8px 12px",background:dark?"#1a <button onClick={doSave} style={{background:BLUE,color:"white",border:"none",borde <button onClick={()=>{setMe(null);setPg("login");}} style={{background:"transparen <div style={{marginTop:18,padding:12,background:dark?"#1a1400":"#fffbeb",borderRad <p style={{fontSize:11,color:T.sub,margin:0,lineHeight:1.7}}><strong style={{col </div> 
 </div>} 
 </div> 
 {/* BOTTOM NAV */} 
 <div style={{position:"fixed",bottom:0,left:0,right:0,background:dark?"rgba(0,0,0,0.95) <div style={{maxWidth:600,margin:"0 auto",display:"flex"}}> 
 <Nav id="home" icon={HomeI()} label="Home"/> 
 <Nav id="search" icon={SrchI()} label="Search"/> 
 <Nav id="clicks" icon={GrpI()} label="Clicks"/> 
 <Nav id="notif" icon={BellI()} label="Activity" badge={notifCount}/>  <Nav id="dms" icon={MsgI()} label="DMs"/> 
 <Nav id="profile" icon={UserI()} label="Profile"/> 
 <Nav id="settings" icon={GearI()} label="Settings"/> 
 </div> 
 </div> 
 </div> 
 ); 
}
