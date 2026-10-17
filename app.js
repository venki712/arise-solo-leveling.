// ARISE — Firebase-backed real-life leveling system.
// 1) Create a Firebase project, enable Email/Password Authentication and Firestore.
// 2) Paste your project's web config below. Never put service-account keys here.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA7DU5pvdAnMWiDEvm81TANoyFdZBfJ6Og",
  authDomain: "arise-web-ad4c9.firebaseapp.com",
  projectId: "arise-web-ad4c9",
  storageBucket: "arise-web-ad4c9.firebasestorage.app",
  messagingSenderId: "534782381504",
  appId: "1:534782381504:web:51d4d0a1b5a245dc7b8c25",
  measurementId: "G-WNN551J4VF"
};


const $ = (id) => document.getElementById(id);
const authView = $("authView"), appView = $("appView");
let mode = "login", user = null, profile = null, unsubscribe = null, saving = false;
const statMeta = [
  ["STR","Strength","Workout / fitness"],["INT","Intelligence","Study + coding"],
  ["FOC","Focus","Phone control"],["CHA","Charisma","Communication"],
  ["FIN","Finance","Career / money skill"],["STA","Stamina","Sleep + consistency"]
];
const quests = [
  {id:"breakfast",title:"Eat breakfast",desc:"Before college",xp:5,stat:"STA"},
  {id:"learn",title:"Learn a new concept",desc:"10–15 minutes before college",xp:5,stat:"INT"},
  {id:"college",title:"College attendance & focus",desc:"10 AM–6 PM",xp:10,stat:"FOC"},
  {id:"communication",title:"Communication practice",desc:"Speak or participate once",xp:5,stat:"CHA"},
  {id:"lunch",title:"Eat lunch",desc:"During college break",xp:5,stat:"STA"},
  {id:"study",title:"BCA study",desc:"45 minutes, 6–8 PM window",xp:15,stat:"INT"},
  {id:"coding",title:"Coding practice",desc:"30 minutes, 6–8 PM window",xp:10,stat:"INT"},
  {id:"gym",title:"Planned gym workout",desc:"8 PM–10 PM",xp:15,stat:"STR"},
  {id:"gymfocus",title:"Focused gym session",desc:"Keep phone away during training",xp:5,stat:"FOC"},
  {id:"dinner",title:"Eat dinner",desc:"Around your routine; don't skip meals",xp:5,stat:"STA"},
  {id:"phone",title:"Phone-control session",desc:"30 minutes without unnecessary scrolling",xp:5,stat:"FOC"},
  {id:"sleep",title:"Sleep routine",desc:"Wind down and aim for adequate rest",xp:10,stat:"STA"},
  {id:"career",title:"Career skill practice",desc:"10 minutes: resume, interview or money skill",xp:5,stat:"FIN"}
]; // Exactly 100 XP total.
const meals = [{id:"breakfast",name:"🍳 Breakfast"},{id:"lunch",name:"🍛 Lunch"},{id:"dinner",name:"🍽️ Dinner"}];
const achievements = [
  {id:"first",icon:"⚡",name:"First Quest",desc:"Complete any quest",test:p=>p.totalCompleted>=1},
  {id:"meals",icon:"🍽️",name:"Fuelled Up",desc:"Log all 3 meals in one day",test:p=>p.mealDays>=1},
  {id:"gym3",icon:"💪",name:"Hunter Training",desc:"Log 3 gym quests",test:p=>(p.questCounts.gym||0)>=3},
  {id:"study5",icon:"🧠",name:"Knowledge Seeker",desc:"Complete 5 study/coding quests",test:p=>(p.questCounts.study||0)+(p.questCounts.coding||0)>=5},
  {id:"xp500",icon:"🔷",name:"500 XP Club",desc:"Earn 500 lifetime XP",test:p=>p.totalXp>=500},
  {id:"level10",icon:"👑",name:"Rising Hunter",desc:"Reach level 10",test:p=>p.level>=10}
];
function localDateKey(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
function defaultProfile(){return {totalXp:0,totalCompleted:0,questCounts:{},stats:{STR:10,INT:10,FOC:10,CHA:10,FIN:10,STA:10},days:{},mealDays:0,sleepByDay:{},createdAt:Date.now()};}
function ensureDay(p){const key=localDateKey();if(!p.days[key])p.days[key]={completed:{},meals:{},sleepHours:""};return p.days[key];}
function xpToday(p){const day=ensureDay(p);return Math.min(100,quests.reduce((s,q)=>s+(day.completed[q.id]?q.xp:0),0));}
function levelInfo(totalXp){const level=Math.min(100,Math.floor(totalXp/100)+1);const into=level===100?100:totalXp%100;return {level,into,rank:level>=81?"S":level>=61?"A":level>=41?"B":level>=21?"C":level>=11?"D":"E"};}
function showToast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2300);}
function setMode(next){mode=next;document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.mode===mode));$("authTitle").textContent=mode==="login"?"Welcome back, Hunter.":"Create your Hunter account."; $("authDesc").textContent=mode==="login"?"Sign in to continue your progress.":"Your progress will sync when you sign in on another device."; $("authSubmit").textContent=mode==="login"?"Enter the System":"Create account";$("password").autocomplete=mode==="login"?"current-password":"new-password";$("authMessage").textContent="";}
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>setMode(b.dataset.mode)));
function checkConfig(){return !firebaseConfig.apiKey.startsWith("PASTE_")&&!firebaseConfig.projectId.startsWith("PASTE_")&&!firebaseConfig.appId.startsWith("PASTE_");}
let app, auth, db;
if(checkConfig()){app=initializeApp(firebaseConfig);auth=getAuth(app);db=getFirestore(app);$("connection").textContent="● Connecting";}else{$("connection").textContent="● Setup needed";$("authMessage").textContent="Add your Firebase web config in app.js to enable accounts and cloud sync.";$("authMessage").style.color="#ffc878";}
$("authForm").addEventListener("submit",async e=>{e.preventDefault();if(!checkConfig()){showToast("Set up Firebase first — see README.");return;}const email=$("email").value.trim(),password=$("password").value;$("authSubmit").disabled=true;$("authMessage").textContent="Connecting…";try{if(mode==="register")await createUserWithEmailAndPassword(auth,email,password);else await signInWithEmailAndPassword(auth,email,password);}catch(err){$("authMessage").textContent=authError(err.code);$("authMessage").style.color="#ff9eaa";}finally{$("authSubmit").disabled=false;}});
function authError(code){return ({"auth/email-already-in-use":"This email already has an account. Sign in instead.","auth/invalid-email":"Enter a valid email address.","auth/weak-password":"Use at least 6 characters for your password.","auth/invalid-credential":"Email or password is incorrect.","auth/network-request-failed":"Network issue. Check your connection."})[code]||"Could not sign in. Check your details and Firebase setup.";}
$("logoutBtn").addEventListener("click",()=>signOut(auth));
onAuthStateChangedSafe();
function onAuthStateChangedSafe(){if(!checkConfig())return;onAuthStateChanged(auth,async u=>{if(unsubscribe){unsubscribe();unsubscribe=null;}user=u;if(!u){authView.classList.remove("hidden");appView.classList.add("hidden");$("logoutBtn").classList.add("hidden");$("connection").textContent=navigator.onLine?"● Online":"● Offline";return;}authView.classList.add("hidden");appView.classList.remove("hidden");$("logoutBtn").classList.remove("hidden");$("connection").textContent="● Syncing";try{const ref=doc(db,"users",u.uid);const snap=await getDoc(ref);if(!snap.exists())await setDoc(ref,defaultProfile());unsubscribe=onSnapshot(ref,s=>{if(s.exists()){profile=s.data();render();$("connection").textContent=navigator.onLine?"● Synced":"● Offline";$("connection").classList.toggle("online",navigator.onLine);}},err=>{console.error(err);$("connection").textContent="● Sync error";});}catch(err){console.error(err);showToast("Couldn't load profile. Check Firestore rules.");}});}
async function saveProfile(){if(!user||!profile||saving)return;saving=true;try{await setDoc(doc(db,"users",user.uid),{...profile,updatedAt:serverTimestamp()});}catch(e){console.error(e);showToast("Save failed. Check connection.");}finally{saving=false;}}
function render(){if(!profile)return;const day=ensureDay(profile),xp=xpToday(profile),li=levelInfo(profile.totalXp||0);$("todayLabel").textContent=new Date().toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"});$("levelValue").textContent=li.level;$("rankBadge").textContent=`${li.rank}-RANK`;$("xpValue").textContent=`${profile.totalXp||0} XP`;$("levelProgress").style.width=li.into+"%";$("nextLevelText").textContent=li.level===100?"Maximum level reached":`${li.into} / 100 XP toward level ${li.level+1}`;$("todayXp").textContent=`${xp} / 100`;$("dailyPercent").textContent=Math.round(xp)+"%";$("dailyRing").style.background=`conic-gradient(var(--blue) ${xp*3.6}deg,#14243b 0deg)`;
$("statList").innerHTML=statMeta.map(([code,name,desc])=>{const value=Math.min(100,profile.stats?.[code]||10);return `<div class="stat-row"><div class="stat-code">${code}</div><div class="stat-info"><span>${name} <small class="muted">· ${desc}</small></span><div class="stat-bar"><i style="width:${value}%"></i></div></div><div class="stat-value">${value}</div></div>`;}).join("");
$("questList").innerHTML=quests.map(q=>`<label class="quest-item ${day.completed[q.id]?"done":""}"><input class="quest-check" type="checkbox" data-quest="${q.id}" ${day.completed[q.id]?"checked":""}><span class="quest-copy"><strong>${q.title}</strong><span>${q.desc}</span></span><span class="xp-pill">+${q.xp} XP</span></label>`).join("");
$("questCount").textContent=`${quests.filter(q=>day.completed[q.id]).length} / ${quests.length} completed`;document.querySelectorAll("[data-quest]").forEach(el=>el.addEventListener("change",()=>toggleQuest(el.dataset.quest,el.checked)));
$("mealList").innerHTML=meals.map(m=>`<div class="meal-row"><span>${m.name}</span><button class="${day.meals[m.id]?"done":""}" data-meal="${m.id}">${day.meals[m.id]?"✓ Done":"Mark eaten"}</button></div>`).join("");document.querySelectorAll("[data-meal]").forEach(b=>b.addEventListener("click",()=>toggleMeal(b.dataset.meal)));
$("sleepHours").value=day.sleepHours||"";const unlocked=achievements.filter(a=>a.test({...profile,level:li.level}));$("achievementList").innerHTML=achievements.map(a=>{const yes=unlocked.some(x=>x.id===a.id);return `<div class="achievement ${yes?"unlocked":""}"><div class="icon">${yes?a.icon:"🔒"}</div><strong>${a.name}</strong><span>${yes?"UNLOCKED":a.desc}</span></div>`;}).join("");}
async function toggleQuest(id,checked){const q=quests.find(x=>x.id===id);if(!q)return;const day=ensureDay(profile);if(!!day.completed[id]===checked)return;const before=day.completed[id]?q.xp:0;const after=checked?q.xp:0;if(xpToday(profile)-before+after>100){showToast("Daily XP target reached.");render();return;}day.completed[id]=checked;if(checked){profile.totalXp=(profile.totalXp||0)+q.xp;profile.totalCompleted=(profile.totalCompleted||0)+1;profile.questCounts=profile.questCounts||{};profile.questCounts[id]=(profile.questCounts[id]||0)+1;profile.stats=profile.stats||{};profile.stats[q.stat]=Math.min(100,(profile.stats[q.stat]||10)+1);}else{profile.totalXp=Math.max(0,(profile.totalXp||0)-q.xp);profile.totalCompleted=Math.max(0,(profile.totalCompleted||0)-1);profile.questCounts[id]=Math.max(0,(profile.questCounts[id]||1)-1);profile.stats[q.stat]=Math.max(10,(profile.stats[q.stat]||10)-1);}render();await saveProfile();showToast(checked?`Quest cleared: +${q.xp} XP`:"Quest unchecked");}
async function toggleMeal(id){const day=ensureDay(profile);day.meals=day.meals||{};day.meals[id]=!day.meals[id];const all=meals.every(m=>day.meals[m.id]);if(all&&!day.mealCounted){day.mealCounted=true;profile.mealDays=(profile.mealDays||0)+1;}else if(!all&&day.mealCounted){day.mealCounted=false;profile.mealDays=Math.max(0,(profile.mealDays||0)-1);}render();await saveProfile();showToast(day.meals[id]?"Meal logged":"Meal log removed");}
$("saveSleepBtn").addEventListener("click",async()=>{const n=Number($("sleepHours").value);if(!Number.isFinite(n)||n<0||n>24){$("sleepMessage").textContent="Enter a value between 0 and 24.";return;}const day=ensureDay(profile);day.sleepHours=n;profile.sleepByDay=profile.sleepByDay||{};profile.sleepByDay[localDateKey()]=n;render();await saveProfile();$("sleepMessage").textContent=`Saved ${n} hours.`;});
$("resetDayBtn").addEventListener("click",()=>{showToast("Today's quests are shown. Past dates remain saved.");render();});
window.addEventListener("online",()=>{if(user){$("connection").textContent="● Online";$("connection").classList.add("online");}});window.addEventListener("offline",()=>{$("connection").textContent="● Offline";$("connection").classList.remove("online");});
