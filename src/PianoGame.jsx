import { useState, useEffect, useCallback, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS & DATA
// ─────────────────────────────────────────────────────────────────────────────

const NOTE_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const SOLFEGE    = { C:"Do", "C#":"Do#", D:"Re", "D#":"Re#", E:"Mi",
                     F:"Fa", "F#":"Fa#", G:"Sol","G#":"Sol#",A:"La",
                     "A#":"La#", B:"Si" };

// Sub-level time limits in seconds (0 = free)
const SUB_TIMES = [0, 20, 15, 10, 8, 7, 6, 5, 4, 3];

// Treble staff: line 5=bottom (E4), line 1=top (F5). Spaces at x.5.
// Below staff: line > 5 (ledger). Above staff: line < 1 (ledger).
const TREBLE_STAFF = [
  { note:"C4",  line:6,   ledger:true },
  { note:"C#4", line:6,   acc:"#", ledger:true },
  { note:"Cb4", line:6,   acc:"b", ledger:true },
  { note:"D4",  line:5.5 },
  { note:"D#4", line:5.5, acc:"#" },
  { note:"Db4", line:5.5, acc:"b" },
  { note:"E4",  line:5   },
  { note:"E#4", line:5,   acc:"#" },
  { note:"Eb4", line:5,   acc:"b" },
  { note:"F4",  line:4.5 },
  { note:"F#4", line:4.5, acc:"#" },
  { note:"Fb4", line:4.5, acc:"b" },
  { note:"G4",  line:4   },
  { note:"G#4", line:4,   acc:"#" },
  { note:"Gb4", line:4,   acc:"b" },
  { note:"A4",  line:3.5 },
  { note:"A#4", line:3.5, acc:"#" },
  { note:"Ab4", line:3.5, acc:"b" },
  { note:"B4",  line:3   },
  { note:"B#4", line:3,   acc:"#" },
  { note:"Bb4", line:3,   acc:"b" },
  { note:"C5",  line:2.5 },
  { note:"C#5", line:2.5, acc:"#" },
  { note:"Cb5", line:2.5, acc:"b" },
  { note:"D5",  line:2   },
  { note:"D#5", line:2,   acc:"#" },
  { note:"Db5", line:2,   acc:"b" },
  { note:"E5",  line:1.5 },
  { note:"E#5", line:1.5, acc:"#" },
  { note:"Eb5", line:1.5, acc:"b" },
  { note:"F5",  line:1   },
  { note:"F#5", line:1,   acc:"#" },
  { note:"Fb5", line:1,   acc:"b" },
  { note:"G5",  line:0.5 },
  { note:"G#5", line:0.5, acc:"#" },
  { note:"Gb5", line:0.5, acc:"b" },
  { note:"A5",  line:0,   ledger:true },
  { note:"A#5", line:0,   acc:"#", ledger:true },
  { note:"Ab5", line:0,   acc:"b", ledger:true },
];

// Bass staff: line 5=bottom (G2), line 1=top (A3). Same coordinate system as treble.
// Below staff: line > 5 (ledger). Above staff: line < 1 (ledger).
const BASS_STAFF = [
  { note:"C2",  line:7.5, ledger:true },
  { note:"D2",  line:7,   ledger:true },
  { note:"E2",  line:6.5, ledger:true },
  { note:"F2",  line:6,   ledger:true },
  { note:"G2",  line:5   },
  { note:"G#2", line:5,   acc:"#" },
  { note:"Gb2", line:5,   acc:"b" },
  { note:"A2",  line:4.5 },
  { note:"A#2", line:4.5, acc:"#" },
  { note:"Ab2", line:4.5, acc:"b" },
  { note:"B2",  line:4   },
  { note:"B#2", line:4,   acc:"#" },
  { note:"Bb2", line:4,   acc:"b" },
  { note:"C3",  line:3.5 },
  { note:"C#3", line:3.5, acc:"#" },
  { note:"Cb3", line:3.5, acc:"b" },
  { note:"D3",  line:3   },
  { note:"D#3", line:3,   acc:"#" },
  { note:"Db3", line:3,   acc:"b" },
  { note:"E3",  line:2.5 },
  { note:"E#3", line:2.5, acc:"#" },
  { note:"Eb3", line:2.5, acc:"b" },
  { note:"F3",  line:2   },
  { note:"F#3", line:2,   acc:"#" },
  { note:"Fb3", line:2,   acc:"b" },
  { note:"G3",  line:1.5 },
  { note:"G#3", line:1.5, acc:"#" },
  { note:"Gb3", line:1.5, acc:"b" },
  { note:"A3",  line:1   },
  { note:"A#3", line:1,   acc:"#" },
  { note:"Ab3", line:1,   acc:"b" },
  { note:"B3",  line:0.5 },
  { note:"C4",  line:-1,  ledger:true },
  { note:"C#4", line:-1,  acc:"#", ledger:true },
  { note:"Cb4", line:-1,  acc:"b", ledger:true },
];

// ─────────────────────────────────────────────────────────────────────────────
// KEY SIGNATURES
// ─────────────────────────────────────────────────────────────────────────────

// Key sig positions in new coordinate system (1=top line, 5=bottom line)
const SHARP_POSITIONS  = [2, 1.5, 2.5, 2, 1.5, 2, 2.5]; // F C G D A E B
const FLAT_POSITIONS   = [4, 4.5, 3.5, 4, 4.5, 3.5, 4]; // B E A D G C F
const SHARP_NOTE_NAMES = ["F","C","G","D","A","E","B"];
const FLAT_NOTE_NAMES  = ["B","E","A","D","G","C","F"];

const KEY_SIGNATURES = [
  { name:"Do Mayor",    sharps:[], flats:[], display:"0 alteraciones" },
  { name:"Sol Mayor",   sharps:["F"], flats:[], display:"1♯ (Fa#)" },
  { name:"Fa Mayor",    sharps:[], flats:["B"], display:"1♭ (Sib)" },
  { name:"Re Mayor",    sharps:["F","C"], flats:[], display:"2♯ (Fa# Do#)" },
  { name:"Sib Mayor",   sharps:[], flats:["B","E"], display:"2♭ (Sib Mib)" },
  { name:"La Mayor",    sharps:["F","C","G"], flats:[], display:"3♯ (Fa# Do# Sol#)" },
  { name:"Mib Mayor",   sharps:[], flats:["B","E","A"], display:"3♭ (Sib Mib Lab)" },
  { name:"Mi Mayor",    sharps:["F","C","G","D"], flats:[], display:"4♯" },
  { name:"Lab Mayor",   sharps:[], flats:["B","E","A","D"], display:"4♭" },
  { name:"Si Mayor",    sharps:["F","C","G","D","A"], flats:[], display:"5♯" },
  { name:"Reb Mayor",   sharps:[], flats:["B","E","A","D","G"], display:"5♭" },
  { name:"Fa# Mayor",   sharps:["F","C","G","D","A","E"], flats:[], display:"6♯" },
  { name:"Solb Mayor",  sharps:[], flats:["B","E","A","D","G","C"], display:"6♭" },
  { name:"Do# Mayor",   sharps:["F","C","G","D","A","E","B"], flats:[], display:"7♯" },
  { name:"Dob Mayor",   sharps:[], flats:["B","E","A","D","G","C","F"], display:"7♭" },
];

const TREBLE_NATURAL_POOL = ["C4","D4","E4","F4","G4","A4","B4","C5","D5","E5","F5","G5","A5"];
const BASS_NATURAL_POOL   = ["G2","A2","B2","C3","D3","E3","F3","G3","A3","B3","C4"];

function applyKeySignature(writtenNote, keySig) {
  const m = writtenNote.match(/^([A-G])(\d)$/);
  if (!m) return writtenNote;
  const letter = m[1], oct = m[2];
  if (keySig.sharps.includes(letter)) return `${letter}#${oct}`;
  if (keySig.flats.includes(letter))  return `${letter}b${oct}`;
  return writtenNote;
}

const LEVEL8 = {
  id: 8,
  name: "Armaduras",
  clef: "treble",
  showLabel: false,
  chords: false,
  accidentals: false,
  keySigMode: true,
  notePool: TREBLE_NATURAL_POOL,
  description: "Armaduras de clave · 15 escalas mayores · Sin nombres",
};

// Level definitions
const LEVELS = [
  {
    id: 1,
    name: "Primeros pasos",
    clef: "treble",
    showLabel: true,
    chords: false,
    accidentals: false,
    notePool: ["C4","D4","E4","F4","G4","A4","B4","C5","D5","E5","F5","G5","A5"],
    description: "Notas naturales · Clave de Sol · Con nombres",
  },
  {
    id: 2,
    name: "Mano izquierda",
    clef: "bass",
    showLabel: true,
    chords: false,
    accidentals: false,
    notePool: ["G2","A2","B2","C3","D3","E3","F3","G3","A3","B3","C4"],
    description: "Notas naturales · Clave de Fa · Con nombres",
  },
  {
    id: 3,
    name: "Sol sin ayuda",
    clef: "treble",
    showLabel: false,
    chords: false,
    accidentals: false,
    notePool: ["C4","D4","E4","F4","G4","A4","B4","C5","D5","E5","F5","G5","A5"],
    description: "Notas naturales · Clave de Sol · Sin nombres",
  },
  {
    id: 4,
    name: "Fa sin ayuda",
    clef: "bass",
    showLabel: false,
    chords: false,
    accidentals: true,
    notePool: ["G2","G#2","Ab2","A2","A#2","Bb2","B2",
               "C3","C#3","Db3","D3","D#3","Eb3","E3","F3","F#3","Gb3",
               "G3","G#3","Ab3","A3","A#3","Bb3","B3","C4"],
    description: "Sostenidos y bemoles · Clave de Fa · Sin nombres",
  },
  {
    id: 5,
    name: "Acordes Sol",
    clef: "treble",
    showLabel: false,
    chords: true,
    accidentals: false,
    notePool: ["C4","D4","E4","F4","G4","A4","B4","C5","D5","E5","F5","G5","A5"],
    description: "Acordes de 2 notas · Clave de Sol · Sin nombres",
  },
  {
    id: 6,
    name: "Acordes Fa",
    clef: "bass",
    showLabel: false,
    chords: true,
    accidentals: false,
    notePool: ["G2","A2","B2","C3","D3","E3","F3","G3","A3","B3","C4"],
    description: "Acordes de 2 notas · Clave de Fa · Sin nombres",
  },
  {
    id: 7,
    name: "Maestro",
    clef: "both",
    showLabel: false,
    chords: true,
    accidentals: true,
    notePool: ["G2","G#2","Ab2","A2","Bb2","B2",
               "C3","C#3","D3","D#3","Eb3","E3","F3","F#3","G3","G#3","A3","Bb3","B3",
               "C4","C#4","D4","D#4","E4","F4","F#4","G4","G#4","A4","Bb4","B4",
               "C5","C#5","D5","D#5","E5","F5","F#5","G5","G#5","A5"],
    description: "Todo junto · Ambas claves · Sin nombres",
  },
  LEVEL8,
];

// Piano keys C2–C6
const PIANO_KEYS = [];
for (let oct = 2; oct <= 5; oct++) {
  [
    {s:0,b:false},{s:1,b:true},{s:2,b:false},{s:3,b:true},{s:4,b:false},
    {s:5,b:false},{s:6,b:true},{s:7,b:false},{s:8,b:true},{s:9,b:false},
    {s:10,b:true},{s:11,b:false},
  ].forEach(({s,b}) => {
    PIANO_KEYS.push({ note:`${NOTE_NAMES[s]}${oct}`, isBlack:b, semitone:s, octave:oct });
  });
}
PIANO_KEYS.push({ note:"C6", isBlack:false, semitone:0, octave:6 });
const WHITE_KEYS = PIANO_KEYS.filter(k=>!k.isBlack);
const BLACK_KEYS = PIANO_KEYS.filter(k=>k.isBlack);

// ─────────────────────────────────────────────────────────────────────────────
// AUDIO
// ─────────────────────────────────────────────────────────────────────────────
let _actx = null;
function actx() {
  if (!_actx) _actx = new (window.AudioContext||window.webkitAudioContext)();
  return _actx;
}
function freq(note) {
  const m = note.match(/^([A-G]#?|[A-G]b?)(\d)$/);
  if (!m) return 440;
  let name = m[1], oct = parseInt(m[2]);
  // handle flats
  if (name.endsWith("b")) {
    const base = NOTE_NAMES.indexOf(name[0]);
    const semi = (base - 1 + 12) % 12;
    name = NOTE_NAMES[semi];
  }
  const s = NOTE_NAMES.indexOf(name);
  return 440 * Math.pow(2, (s + (oct-4)*12 - 9) / 12);
}
function playTone(note, ok) {
  try {
    const c = actx(), o = c.createOscillator(), g = c.createGain();
    o.connect(g); g.connect(c.destination);
    o.frequency.value = freq(note);
    o.type = ok === false ? "sawtooth" : "triangle";
    const d = ok === false ? 0.15 : 0.5;
    g.gain.setValueAtTime(0.25, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d);
    o.start(); o.stop(c.currentTime + d);
  } catch(_){}
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function noteLabel(note) {
  const m = note.match(/^([A-G]#?|[A-G]b?)(\d)$/);
  if (!m) return note;
  return SOLFEGE[m[1]] || m[1];
}

function pickNote(pool, avoid=[]) {
  const cands = pool.filter(n=>!avoid.includes(n));
  const src = cands.length ? cands : pool;
  return src[Math.floor(Math.random()*src.length)];
}

function pickChord(pool, avoid=[]) {
  const n1 = pickNote(pool, avoid);
  const rest = pool.filter(n=>n!==n1);
  if (rest.length === 0) return [n1];
  const n2 = pickNote(rest, [n1]);
  return [n1, n2].sort();
}

function staffDataForNote(note, clef) {
  const data = clef === "treble" ? TREBLE_STAFF : BASS_STAFF;
  return data.find(d=>d.note===note);
}

// Enharmonic equivalents for display
function enharmonicNote(note) {
  const ENARMONICS = { "C#":"Db","D#":"Eb","F#":"Gb","G#":"Ab","A#":"Bb",
                       "Db":"C#","Eb":"D#","Gb":"F#","Ab":"G#","Bb":"A#" };
  const m = note.match(/^([A-G]#?|[A-G]b?)(\d)$/);
  if (!m) return null;
  const alt = ENARMONICS[m[1]];
  return alt ? `${alt}${m[2]}` : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// STAFF SVG
// ─────────────────────────────────────────────────────────────────────────────
function KeySigSymbols({ clef, keySig, y, startX }) {
  if (!keySig || (keySig.sharps.length === 0 && keySig.flats.length === 0)) return null;
  const isSharp = keySig.sharps.length > 0;
  const symbols = isSharp ? keySig.sharps : keySig.flats;
  const positions = isSharp ? SHARP_POSITIONS : FLAT_POSITIONS;
  const x0 = startX || 110;

  return (
    <>
      {symbols.map((_, i) => (
        <text
          key={i}
          x={x0 + i * 18}
          y={y(positions[i]) + 7}
          fontSize={20}
          fontFamily="serif"
          fill="#d4b870"
          style={{userSelect:"none"}}
        >{isSharp ? "♯" : "♭"}</text>
      ))}
    </>
  );
}

function Staff({ clef, notes, showLabel, keySig }) {
  const W=680, H=260, sp=26;
  // line 5 (bottom) → y=174, line 1 (top) → y=70
  const y = line => 174 + (line - 5) * sp;
  const staffLines = [1, 2, 3, 4, 5];
  const staffData = clef==="treble" ? TREBLE_STAFF : BASS_STAFF;

  const noteX = W / 2;

  const noteInfos = notes.map(n => {
    const naturalN = n.replace(/#|b/g,"").replace(/(\d)/,"$1");
    let info = staffData.find(d => d.note === n);
    if (!info) {
      const enh = enharmonicNote(n);
      if (enh) info = staffData.find(d => d.note === enh);
    }
    if (!info) info = staffData.find(d => d.note === naturalN);
    return info ? {...info, displayNote: n} : null;
  }).filter(Boolean);

  const ledgerLines = new Set();
  noteInfos.forEach(info => { if(info.ledger) ledgerLines.add(info.line); });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {/* Key signature symbols (behind clef glyph) */}
      <KeySigSymbols clef={clef} keySig={keySig} y={y} startX={110} />

      {/* Staff lines */}
      {staffLines.map(l=>(
        <line key={l} x1={40} x2={W-40} y1={y(l)} y2={y(l)} stroke="#b09870" strokeWidth={1.5}/>
      ))}

      {/* Ledger lines */}
      {[...ledgerLines].map(l=>(
        <line key={`led${l}`} x1={noteX-28} x2={noteX+28} y1={y(l)} y2={y(l)} stroke="#b09870" strokeWidth={1.8}/>
      ))}

      {/* Notes */}
      {noteInfos.map((info, i) => {
        const xOff = noteInfos.length > 1 ? (i===0 ? -20 : 20) : 0;
        const nx = noteX + xOff;
        const ny = y(info.line);
        const showAcc = keySig ? false : !!info.acc;
        return (
          <g key={`${info.note}-${i}`}>
            <ellipse cx={nx} cy={ny} rx={24} ry={16} fill="#f5c84228"/>
            <ellipse cx={nx} cy={ny} rx={13} ry={9} fill="#f5c842" stroke="#c89000" strokeWidth={2}/>
            <line x1={nx+13} y1={ny} x2={nx+13} y2={ny-52} stroke="#f5c842" strokeWidth={2.2}/>
            {showAcc && (
              <text x={nx-26} y={ny+6} fontSize={20} fontFamily="serif" fill="#f5a020"
                style={{userSelect:"none"}}>
                {info.acc==="#" ? "♯" : "♭"}
              </text>
            )}
            {showLabel && (
              <text x={nx} y={ny+32} textAnchor="middle" fontSize={13}
                fontFamily="Georgia,serif" fill="#f5c842" fontWeight="bold">
                {noteLabel(info.note)}
              </text>
            )}
          </g>
        );
      })}

      {/* Clef drawn last so it renders on top of staff lines */}
      {clef==="treble" ? (
        <text x={10} y={228} fontSize={265} fontFamily="serif" fill="#d4c4a0" style={{userSelect:"none"}}>𝄞</text>
      ) : (
        <text x={18} y={134} fontSize={80} fontFamily="serif" fill="#d4c4a0" style={{userSelect:"none"}}>𝄢</text>
      )}

      <text x={W-16} y={H-8} textAnchor="end" fontSize={11} fill="#6a5030" fontFamily="Georgia,serif">
        {clef==="treble" ? "Clave de Sol" : "Clave de Fa"}
      </text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PIANO KEYBOARD
// ─────────────────────────────────────────────────────────────────────────────
function PianoKeyboard({ onPress, keyHeight=110 }) {
  const wCount = WHITE_KEYS.length;
  const kw = 100/wCount;

  function blackLeft(key) {
    const prevWhites = [0,2,4,5,7,9,11];
    const ps = [...prevWhites].reverse().find(s=>s<key.semitone);
    if (ps === undefined) return null;
    const pn = `${NOTE_NAMES[ps]}${key.octave}`;
    const idx = WHITE_KEYS.findIndex(k=>k.note===pn);
    if (idx===-1) return null;
    return (idx+0.65)*kw;
  }

  function keyBg(isBlack) {
    return isBlack ? "#1e1208" : "linear-gradient(180deg,#f8f0e0,#ede0c8)";
  }

  return (
    <div style={{position:"relative",width:"100%",height:keyHeight}}>
      {WHITE_KEYS.map((key,i)=>(
        <div key={key.note} onClick={()=>onPress(key.note)}
          style={{
            position:"absolute", left:`${i*kw}%`, width:`${kw-0.22}%`, height:"100%",
            background: keyBg(false),
            border:"1px solid #a09070", borderRadius:"0 0 6px 6px",
            cursor:"pointer", zIndex:1, transition:"background 0.1s",
            boxShadow:"inset 0 -2px 5px rgba(0,0,0,0.1)",
            display:"flex",alignItems:"flex-end",justifyContent:"center",paddingBottom:3,
          }}
        >
          {key.note==="C4" && (
            <span style={{fontSize:7,color:"#807060",fontFamily:"Georgia,serif"}}>Do4</span>
          )}
        </div>
      ))}
      {BLACK_KEYS.map(key=>{
        const left = blackLeft(key);
        if (left===null) return null;
        return (
          <div key={key.note} onClick={()=>onPress(key.note)}
            style={{
              position:"absolute", left:`${left}%`, width:`${kw*0.58}%`, height:"62%",
              background: keyBg(true),
              borderRadius:"0 0 5px 5px", cursor:"pointer", zIndex:2,
              boxShadow:"2px 4px 10px rgba(0,0,0,0.55)", transition:"background 0.1s",
            }}
          />
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CELEBRATION OVERLAY
// ─────────────────────────────────────────────────────────────────────────────
const SUB_MESSAGES = [
  "¡Fantástico! 🌟 Seguís sumando, sos imparable 💪🎹",
  "¡Increíble progreso! 🎉✨ Cada nota te acerca más al dominio 🚀",
  "¡Lo hiciste genial! 🥳🎵 Tu dedicación se nota muchísimo 💛",
  "¡Qué ritmo más hermoso! 🎶😍 Seguí así, vas perfecto 🌈",
  "¡Súper! 🎊🎹 El piano se rinde ante vos 🏅✨",
  "¡Bravo! 👏🌟 Cada subnivel superado es un paso enorme 🎯💫",
  "¡Eso es! 🙌🎵 Tu cerebro musical está creciendo 🧠🎶",
  "¡Qué talento! 🌺✨ Nada te detiene, adelante 🚂💨",
  "¡Excelente! 🎠🌟 El esfuerzo siempre da sus frutos 🍀💪",
  "¡Último subnivel del nivel! 🏁🔥 ¡Ahora sí podés subir! 👑🎹",
];
const LEVEL_MESSAGES = [
  "🏆✨🎉 ¡NIVEL COMPLETADO! ¡Sos una máquina del piano! 🎹🌟🔥 Tu dedicación es inspiradora, seguí brillando 💛🚀🎊",
  "👑🎶🌈 ¡INCREÍBLE! ¡Superaste el nivel como una profesional! 🏅✨🎵 El piano te agradece tu amor 💕🎹🌺",
  "🌟🎊🔥 ¡NIVEL DOMINADO! ¡Nada puede con vos! 💪🎹✨ Cada nota es una victoria tuya 🏆🎵💛",
];

function Celebration({ message, onClose, isLevel }) {
  return (
    <div style={{
      position:"fixed",inset:0,zIndex:100,
      background:"rgba(10,6,2,0.88)",
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      padding:24, backdropFilter:"blur(4px)",
    }}>
      <div style={{
        background: isLevel
          ? "linear-gradient(135deg,#2a1a00,#3a2600,#2a1a00)"
          : "linear-gradient(135deg,#1a1008,#2a1a08)",
        border:`2px solid ${isLevel?"#f5c842":"#7a6030"}`,
        borderRadius:20, padding:"28px 32px", maxWidth:340, textAlign:"center",
        boxShadow: isLevel ? "0 0 60px #f5c84266" : "0 0 30px #f5c84233",
      }}>
        <div style={{fontSize: isLevel?36:26, marginBottom:12, lineHeight:1.3}}>
          {isLevel?"🏆":"🎉"}
        </div>
        <div style={{
          fontSize: isLevel?16:14, color:"#f5e8c0", lineHeight:1.7,
          fontFamily:"Georgia,serif", marginBottom:20,
        }}>
          {message}
        </div>
        <button onClick={onClose} style={{
          padding:"10px 28px", borderRadius:24,
          border:"2px solid #f5c842",
          background:"linear-gradient(135deg,#c89000,#f5c842)",
          color:"#110c04", fontSize:14, fontWeight:"bold",
          cursor:"pointer", fontFamily:"Georgia,serif", letterSpacing:1,
        }}>¡Seguir! 🎹</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATS SCREEN
// ─────────────────────────────────────────────────────────────────────────────
function StatsScreen({ stats, onBack }) {
  const entries = Object.entries(stats).sort((a,b)=>{
    const ar = a[1].hits/(a[1].total||1);
    const br = b[1].hits/(b[1].total||1);
    return ar - br; // worst first
  });

  function pct(h,t) { return t>0 ? Math.round(h/t*100) : 0; }
  function bar(h,t) {
    const p = pct(h,t);
    const col = p>=80?"#50b850":p>=50?"#f5c842":"#e05050";
    return (
      <div style={{width:"100%",height:6,background:"#2a1a08",borderRadius:3,marginTop:3}}>
        <div style={{width:`${p}%`,height:"100%",background:col,borderRadius:3,transition:"width 0.4s"}}/>
      </div>
    );
  }

  const totalNotes   = Object.values(stats).reduce((a,v)=>a+v.total,0);
  const totalCorrect = Object.values(stats).reduce((a,v)=>a+v.hits,0);
  const globalPct    = pct(totalCorrect,totalNotes);

  return (
    <div style={{
      minHeight:"100vh",
      background:"radial-gradient(ellipse at 30% 20%,#1e1208 0%,#0c0804 70%)",
      fontFamily:"Georgia,serif", color:"#e8dcc8",
      display:"flex",flexDirection:"column",alignItems:"center",
      paddingTop:"max(60px, env(safe-area-inset-top, 20px))",
      paddingLeft:"14px", paddingRight:"14px", paddingBottom:"32px",
    }}>
      <div style={{width:"100%",maxWidth:400}}>
        <button onClick={onBack} style={{
          background:"transparent",border:"1px solid #3a2a12",
          color:"#7a6040",borderRadius:8,padding:"5px 14px",
          fontSize:12,cursor:"pointer",marginBottom:16,fontFamily:"Georgia,serif",
        }}>← Volver</button>

        <div style={{fontSize:22,color:"#f5c842",letterSpacing:3,marginBottom:4}}>📊 ESTADÍSTICAS</div>
        <div style={{fontSize:11,color:"#5a4020",letterSpacing:2,marginBottom:16}}>GLOBALES · TODAS LAS SESIONES</div>

        {/* Summary */}
        <div style={{
          display:"flex",gap:12,marginBottom:20,
          background:"#160e04",border:"1px solid #3a2810",borderRadius:12,padding:"12px 16px",
        }}>
          <div style={{flex:1,textAlign:"center"}}>
            <div style={{fontSize:22,color:"#f5c842",fontWeight:"bold"}}>{totalNotes}</div>
            <div style={{fontSize:10,color:"#5a4020"}}>notas totales</div>
          </div>
          <div style={{flex:1,textAlign:"center"}}>
            <div style={{fontSize:22,color:"#50b850",fontWeight:"bold"}}>{totalCorrect}</div>
            <div style={{fontSize:10,color:"#5a4020"}}>aciertos</div>
          </div>
          <div style={{flex:1,textAlign:"center"}}>
            <div style={{fontSize:22,color:globalPct>=80?"#50b850":globalPct>=50?"#f5c842":"#e05050",fontWeight:"bold"}}>{globalPct}%</div>
            <div style={{fontSize:10,color:"#5a4020"}}>precisión</div>
          </div>
        </div>

        {entries.length === 0 && (
          <div style={{color:"#5a4020",textAlign:"center",marginTop:40,fontSize:13}}>
            Todavía no hay estadísticas.<br/>¡Jugá un poco primero! 🎹
          </div>
        )}

        {/* Per-note */}
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {entries.map(([note,{hits,total,misses}])=>(
            <div key={note} style={{
              background:"#160e04",border:"1px solid #2a1a08",
              borderRadius:10,padding:"10px 14px",
            }}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:15,color:"#f5c842",fontWeight:"bold"}}>
                  {noteLabel(note)} <span style={{fontSize:11,color:"#5a4020"}}>({note})</span>
                </span>
                <span style={{fontSize:13,color:pct(hits,total)>=80?"#50b850":pct(hits,total)>=50?"#f5c842":"#e05050"}}>
                  {pct(hits,total)}%
                </span>
              </div>
              {bar(hits,total)}
              <div style={{display:"flex",gap:14,marginTop:4,fontSize:10,color:"#5a4020"}}>
                <span>✓ {hits}</span>
                <span>✗ {misses}</span>
                <span>total {total}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
const STORAGE_KEY = "piano-game-progress";


export default function PianoGame() {
  // ── Screens: menu | play | stats
  const [screen, setScreen]       = useState("menu");
  const [celebration, setCelebration] = useState(null); // {msg, isLevel}

  // ── Progress
  const [levelIdx, setLevelIdx]   = useState(0);
  const [subLevel, setSubLevel]   = useState(0);
  const [keySigIdx, setKeySigIdx] = useState(0); // which key signature in level 7
  const [stats, setStats]         = useState({});
  const [canLevelUp, setCanLevelUp] = useState(false);
  const [levelUpBlocked, setLevelUpBlocked] = useState(false);

  // ── Session state
  const [currentNotes, setCurrentNotes] = useState([]); // array of notes (1 or 2)
  const [currentClef, setCurrentClef]   = useState("treble");
  const [recentNotes, setRecentNotes]   = useState([]);
  const [streak, setStreak]             = useState(0);
  const [sessionScore, setSessionScore] = useState(0);
  const [pressedNotes, setPressedNotes] = useState([]);
  const [correctNotes, setCorrectNotes] = useState([]);
  const [wrongNotes, setWrongNotes]     = useState([]);
  const [feedbackMsg, setFeedbackMsg]   = useState(null);
  const [timeLeft, setTimeLeft]         = useState(null);
  const [currentWrittenNotes, setCurrentWrittenNotes] = useState([]);
  const [chordPressed, setChordPressed] = useState([]);

  // ── Current level info
  const level   = LEVELS[levelIdx];
  const timeLim = SUB_TIMES[subLevel];
  const beatDur = timeLim > 0 ? timeLim : null;

  const timerRef    = useRef(null);
  const advanceRef  = useRef(null);
  const streakRef   = useRef(0);
  const subLevelRef = useRef(0);
  const levelIdxRef = useRef(0);
  const keySigIdxRef = useRef(0);
  const canLevelUpRef = useRef(false);
  const statsRef    = useRef({});
  streakRef.current    = streak;
  subLevelRef.current  = subLevel;
  levelIdxRef.current  = levelIdx;
  keySigIdxRef.current = keySigIdx;
  canLevelUpRef.current = canLevelUp;
  statsRef.current     = stats;

  // ── Load/save progress via localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.levelIdx   !== undefined) setLevelIdx(d.levelIdx);
        if (d.subLevel   !== undefined) setSubLevel(d.subLevel);
        if (d.keySigIdx  !== undefined) setKeySigIdx(d.keySigIdx);
        if (d.stats)                    setStats(d.stats);
        if (d.canLevelUp !== undefined) setCanLevelUp(d.canLevelUp);
      }
    } catch(_){}
  }, []);

  function saveProgress(li, sl, st, clu, ksi) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        levelIdx: li, subLevel: sl, keySigIdx: ksi ?? keySigIdxRef.current,
        stats: st, canLevelUp: clu,
      }));
    } catch(_){}
  }

  // ── Current key signature (only relevant in level 7)
  const isKeySigLevel = LEVELS[levelIdx]?.keySigMode;
  const currentKeySig = isKeySigLevel ? KEY_SIGNATURES[keySigIdx] : null;

  // ── Generate next note(s)
  const loadNext = useCallback((recents=[]) => {
    const li   = levelIdxRef.current;
    const sl   = subLevelRef.current;
    const ksi  = keySigIdxRef.current;
    const lvl  = LEVELS[li];
    let clef   = lvl.clef;
    if (clef === "both") clef = Math.random()>0.5?"treble":"bass";
    setCurrentClef(clef);

    let notes;
    if (lvl.keySigMode) {
      // Pick a written note; the actual note to press is derived via key signature
      const keySig = KEY_SIGNATURES[ksi];
      const written = pickNote(lvl.notePool, recents);
      const actual  = applyKeySignature(written, keySig);
      notes = [actual]; // actual is what the player must press
      // Store written note for display (staff shows written position, no accidental)
      setCurrentWrittenNotes([written]);
    } else if (lvl.chords) {
      notes = pickChord(lvl.notePool, recents);
      setCurrentWrittenNotes(notes);
    } else {
      notes = [pickNote(lvl.notePool, recents)];
      setCurrentWrittenNotes(notes);
    }
    setCurrentNotes(notes);
    setRecentNotes(prev => [...prev.slice(-5), ...notes]);
    setPressedNotes([]);
    setCorrectNotes([]);
    setWrongNotes([]);
    setChordPressed([]);
    setFeedbackMsg(null);
    const tl = SUB_TIMES[sl];
    if (tl > 0) setTimeLeft(tl);
    else setTimeLeft(null);
  }, []);

  // ── Timer countdown
  useEffect(() => {
    if (!beatDur || screen!=="play" || timeLeft===null) return;
    if (timeLeft <= 0.05) {
      handleTimeout();
      return;
    }
    timerRef.current = setTimeout(()=>setTimeLeft(t=>+(t-0.1).toFixed(2)), 100);
    return ()=>clearTimeout(timerRef.current);
  }, [timeLeft, screen, beatDur]);

  function handleTimeout() {
    clearTimeout(timerRef.current);
    setCorrectNotes([]);
    setWrongNotes(currentNotes);
    setFeedbackMsg("⏱ ¡Tiempo! Esa fue: " + currentNotes.map(noteLabel).join(" + "));
    updateStatsImmediate(currentNotes, false);
    updateStreak(false);
    advanceRef.current = setTimeout(()=>loadNext(recentNotes), 1200);
  }

  // ── Record stats synchronously via ref, then sync to state
  function updateStatsImmediate(notes, correct) {
    const prev = statsRef.current;
    const next = {...prev};
    notes.forEach(n => {
      if (!next[n]) next[n] = {hits:0,misses:0,total:0};
      next[n] = {
        hits:   next[n].hits   + (correct?1:0),
        misses: next[n].misses + (correct?0:1),
        total:  next[n].total  + 1,
      };
    });
    statsRef.current = next;
    setStats(next);
    return next;
  }

  // ── Streak & sub-level progression
  function updateStreak(correct) {
    if (correct) {
      const ns  = streakRef.current + 1;
      const sl  = subLevelRef.current;
      const li  = levelIdxRef.current;
      const ksi = keySigIdxRef.current;
      const clu = canLevelUpRef.current;
      const st  = statsRef.current;
      setStreak(ns);
      setSessionScore(s=>s+10+Math.floor(ns/5)*5);
      if (ns >= 20) {
        setStreak(0);
        const nextSub = sl + 1;
        const isKSLevel = LEVELS[li]?.keySigMode;

        if (nextSub >= SUB_TIMES.length) {
          // Completed all time sub-levels for current key sig (or regular level)
          if (isKSLevel) {
            const nextKsi = ksi + 1;
            if (nextKsi >= KEY_SIGNATURES.length) {
              // All 15 key sigs done!
              setCanLevelUp(true);
              const msg = "🏁🎹🌟 ¡COMPLETASTE LAS 15 ESCALAS! ¡Sos una maestra de las armaduras! 👑🎶✨";
              setTimeout(()=>setCelebration({msg, isLevel:false}), 200);
              saveProgress(li, sl, st, true, ksi);
            } else {
              // Move to next key signature, reset time sub-levels
              setKeySigIdx(nextKsi);
              setSubLevel(0);
              const ksName = KEY_SIGNATURES[nextKsi].name;
              const msg = `🎵✨ ¡Armadura completada! Siguiente: ${ksName} 🎹🌟💪`;
              setTimeout(()=>setCelebration({msg, isLevel:false}), 200);
              saveProgress(li, 0, st, clu, nextKsi);
            }
          } else {
            setCanLevelUp(true);
            const msg = SUB_MESSAGES[SUB_TIMES.length - 1];
            setTimeout(()=>setCelebration({msg, isLevel:false}), 200);
            saveProgress(li, sl, st, true, ksi);
          }
        } else {
          // Advance time sub-level
          setSubLevel(nextSub);
          const msg = isKSLevel
            ? `⏱🎹 ¡Bien! Ahora con ${SUB_TIMES[nextSub]}s por nota 🔥`
            : SUB_MESSAGES[Math.min(nextSub-1, SUB_MESSAGES.length-1)];
          setTimeout(()=>setCelebration({msg, isLevel:false}), 200);
          saveProgress(li, nextSub, st, clu, ksi);
        }
      }
    } else {
      setStreak(0);
    }
  }

  // ── Key press
  function handleKeyPress(note) {
    if (screen!=="play" || !currentNotes.length) return;
    clearTimeout(timerRef.current);
    clearTimeout(advanceRef.current);

    playTone(note, currentNotes.includes(note));

    if (currentNotes.length === 1) {
      // Single note mode
      const correct = note === currentNotes[0];
      setPressedNotes([note]);
      if (correct) {
        setCorrectNotes([note]);
        setFeedbackMsg("✓ ¡Correcto!");
        updateStatsImmediate(currentNotes, true);
        updateStreak(true);
        advanceRef.current = setTimeout(()=>loadNext(recentNotes), 600);
      } else {
        setWrongNotes([note]);
        setFeedbackMsg("✗ Era: " + noteLabel(currentNotes[0]));
        updateStatsImmediate(currentNotes, false);
        updateStreak(false);
        setTimeout(()=>{
          setPressedNotes([]); setWrongNotes([]); setFeedbackMsg(null);
          const tl = SUB_TIMES[subLevelRef.current];
          if (tl > 0) setTimeLeft(tl * 0.6);
        }, 500);
      }
    } else {
      // Chord mode
      if (chordPressed.includes(note)) return;
      const newPressed = [...chordPressed, note];
      setChordPressed(newPressed);
      setPressedNotes(newPressed);

      const allCorrect = currentNotes.every(n=>newPressed.includes(n));
      const anyWrong   = newPressed.some(n=>!currentNotes.includes(n));

      if (anyWrong) {
        setWrongNotes(newPressed.filter(n=>!currentNotes.includes(n)));
        setCorrectNotes(newPressed.filter(n=>currentNotes.includes(n)));
        setFeedbackMsg("✗ Eran: " + currentNotes.map(noteLabel).join(" + "));
        updateStatsImmediate(currentNotes, false);
        updateStreak(false);
        setTimeout(()=>{
          setPressedNotes([]); setWrongNotes([]); setCorrectNotes([]); setChordPressed([]); setFeedbackMsg(null);
          const tl = SUB_TIMES[subLevelRef.current];
          if (tl > 0) setTimeLeft(tl * 0.6);
        }, 600);
      } else if (allCorrect) {
        setCorrectNotes(currentNotes);
        setFeedbackMsg("✓ ¡Acorde correcto! 🎵");
        updateStatsImmediate(currentNotes, true);
        updateStreak(true);
        advanceRef.current = setTimeout(()=>loadNext(recentNotes), 700);
      }
      // else: waiting for second note
    }
  }

  // ── Level up
  function handleLevelUp() {
    if (!canLevelUp) { setLevelUpBlocked(true); return; }
    const nextLi = levelIdx + 1;
    if (nextLi >= LEVELS.length) {
      setCelebration({msg: LEVEL_MESSAGES[2], isLevel:true});
      return;
    }
    setLevelIdx(nextLi);
    setSubLevel(0);
    setKeySigIdx(0);
    setCanLevelUp(false);
    setLevelUpBlocked(false);
    setStreak(0);
    const msg = LEVEL_MESSAGES[Math.floor(Math.random()*LEVEL_MESSAGES.length)];
    setCelebration({msg, isLevel:true});
    saveProgress(nextLi, 0, stats, false, 0);
  }

  function startPlaying() {
    setScreen("play");
    setSessionScore(0);
    setStreak(0);
    setRecentNotes([]);
    loadNext([]);
  }

  // ── Viewport / orientation detection
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const update = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", () => setTimeout(update, 150));
    return () => { window.removeEventListener("resize", update); };
  }, []);
  const isLandscape = vp.w > vp.h;
  const isTablet    = vp.w >= 768;
  const isWide      = vp.w >= 1024;
  const pianoH      = isLandscape ? (isTablet ? 160 : 115) : (isTablet ? 160 : 110);
  const staffMaxW   = isWide ? 480 : isTablet ? 400 : isLandscape ? 360 : 320;
  const pianoMaxW   = isWide ? 1000 : isTablet ? 860 : 720;
  const headerSize  = isLandscape && !isTablet ? 17 : 24;
  const showSubtitle = !(isLandscape && !isTablet);
  const badgeFontSz = isTablet ? 13 : 11;
  const vPad        = isLandscape && !isTablet ? "5px 10px 8px" : "12px 10px 24px";
  const gap         = isLandscape && !isTablet ? 4 : 8;

  const timerPct = timeLeft!==null && beatDur ? Math.max(0,(timeLeft/beatDur)*100) : 100;

  if (screen==="stats") {
    return <StatsScreen stats={stats} onBack={()=>setScreen("menu")}/>;
  }

  return (
    <div style={{
      minHeight:"100vh",
      background:"radial-gradient(ellipse at 25% 15%,#201408 0%,#0e0804 65%,#060402 100%)",
      fontFamily:"Georgia,'Times New Roman',serif",
      color:"#e8dcc8",
      display:"flex",flexDirection:"column",alignItems:"center",
      padding: vPad,
      overflowX:"hidden", overflowY:"auto", boxSizing:"border-box",
    }}>

      {celebration && (
        <Celebration message={celebration.msg} isLevel={celebration.isLevel}
          onClose={()=>{ setCelebration(null); if(screen==="play"&&currentNotes.length===0) loadNext([]); }}
        />
      )}

      {/* Header */}
      <div style={{textAlign:"center",marginBottom:gap}}>
        <div style={{fontSize:headerSize,letterSpacing:5,color:"#f5c842",lineHeight:1.1}}>♩ PARTITURA</div>
        {showSubtitle && <div style={{fontSize:9,letterSpacing:5,color:"#6a5030",marginTop:1}}>LECTURA DE NOTAS</div>}
      </div>

      {/* Badge */}
      <div style={{
        display:"flex",gap:6,alignItems:"center",marginBottom:gap,
        background:"#160e04",border:"1px solid #3a2810",
        borderRadius:20,padding:"3px 10px",fontSize:badgeFontSz,
        flexWrap:"wrap",justifyContent:"center",maxWidth:"98%",
      }}>
        <span style={{color:"#f5c842"}}>Nv.{levelIdx+1}</span>
        <span style={{color:"#3a2810"}}>|</span>
        <span style={{color:"#c8a060"}}>{level.name}</span>
        {isKeySigLevel && currentKeySig && (<>
          <span style={{color:"#3a2810"}}>|</span>
          <span style={{color:"#d4b870"}}>{currentKeySig.name}</span>
          <span style={{color:"#4a3020",fontSize:9}}>({currentKeySig.display})</span>
          <span style={{color:"#3a2810"}}>|</span>
          <span style={{color:"#5a4020",fontSize:9}}>{keySigIdx+1}/15</span>
        </>)}
        <span style={{color:"#3a2810"}}>|</span>
        <span style={{color:"#7a6040"}}>
          {subLevel===0?"♾":"⏱ "+SUB_TIMES[subLevel]+"s"}
          {" "}<span style={{color:"#4a3020",fontSize:9}}>({subLevel+1}/{SUB_TIMES.length})</span>
        </span>
      </div>

      {/* Score */}
      <div style={{display:"flex",gap:16,marginBottom:gap,fontSize:isTablet?14:12}}>
        <span>⭐ <b style={{color:"#f5c842"}}>{sessionScore}</b></span>
        <span>🔥 <b style={{color:streak>=10?"#f5c842":streak>=5?"#f0a030":"#e8dcc8"}}>{streak}</b>/20</span>
      </div>

      {/* Menu */}
      {screen==="menu" && (
        <div style={{width:"100%",maxWidth:isTablet?520:390,marginBottom:12,overflowY:"auto"}}>
          <div style={{
            display:"grid",
            gridTemplateColumns: isLandscape||isTablet ? "1fr 1fr" : "1fr",
            gap:6,marginBottom:12,
          }}>
            {LEVELS.map((lv,i)=>{
              // TODO: remove for production
              const isActive=i===levelIdx, isLocked=i>levelIdx && i>=6, isDone=i<levelIdx;
              return (
                <div key={lv.id} style={{
                  background:isActive?"#1e1408":"#120a04",
                  border:`1.5px solid ${isActive?"#f5c842":isDone?"#3a6030":"#2a1808"}`,
                  borderRadius:10,padding:"7px 11px",opacity:isLocked?0.4:1,
                  display:"flex",justifyContent:"space-between",alignItems:"center",
                }}>
                  <div>
                    <div style={{fontSize:isTablet?13:11,color:isActive?"#f5c842":isDone?"#60a050":"#7a6040"}}>
                      {isDone?"✓ ":isActive?"▶ ":"🔒 "}{lv.id}. {lv.name}
                    </div>
                    <div style={{fontSize:9,color:"#4a3020",marginTop:1}}>{lv.description}</div>
                  </div>
                  {isActive && (
                    <div style={{fontSize:9,color:"#5a4020",textAlign:"right",marginLeft:6}}>
                      {lv.keySigMode?`${keySigIdx+1}/15`:`${subLevel+1}/${SUB_TIMES.length}`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap",marginBottom:10}}>
            <button onClick={startPlaying} style={{
              padding:isTablet?"12px 34px":"10px 26px",borderRadius:28,
              border:"2px solid #f5c842",background:"linear-gradient(135deg,#c89000,#f5c842)",
              color:"#0e0804",fontSize:isTablet?15:13,fontWeight:"bold",
              letterSpacing:2,cursor:"pointer",fontFamily:"Georgia,serif",
              boxShadow:"0 4px 24px #f5c84240",
            }}>▶ JUGAR</button>
            <button onClick={()=>setScreen("stats")} style={{
              padding:isTablet?"12px 20px":"10px 16px",borderRadius:28,
              border:"1.5px solid #3a2810",background:"transparent",
              color:"#7a6040",fontSize:isTablet?14:12,cursor:"pointer",fontFamily:"Georgia,serif",
            }}>📊 Stats</button>
          </div>

          <div style={{textAlign:"center"}}>
            {canLevelUp && levelIdx<LEVELS.length-1 ? (
              <button onClick={handleLevelUp} style={{
                padding:"7px 20px",borderRadius:24,border:"2px solid #50b850",
                background:"#50b85018",color:"#70d870",fontSize:12,cursor:"pointer",fontFamily:"Georgia,serif",
              }}>🆙 Subir al Nivel {levelIdx+2}</button>
            ) : levelIdx<LEVELS.length-1 ? (
              <div>
                <button onClick={()=>setLevelUpBlocked(true)} style={{
                  padding:"7px 20px",borderRadius:24,border:"1px solid #3a2810",
                  background:"transparent",color:"#3a2810",fontSize:12,cursor:"not-allowed",fontFamily:"Georgia,serif",
                }}>🔒 Subir de nivel</button>
                {levelUpBlocked && (
                  <div style={{fontSize:10,color:"#a07040",marginTop:5,maxWidth:280,margin:"5px auto 0"}}>
                    💪 ¡Seguí practicando! Necesitás 20 seguidas en el subnivel {SUB_TIMES.length} (3s) para subir.
                  </div>
                )}
              </div>
            ) : (
              <div style={{fontSize:12,color:"#f5c842"}}>🏆 ¡Nivel máximo alcanzado!</div>
            )}
          </div>
        </div>
      )}

      {/* Play screen */}
      {screen==="play" && (<>
        <button onClick={()=>{ clearTimeout(timerRef.current); clearTimeout(advanceRef.current); setScreen("menu"); }}
          style={{padding:"4px 12px",borderRadius:14,border:"1px solid #2a1808",
            background:"transparent",color:"#5a4020",fontSize:10,
            cursor:"pointer",marginBottom:gap,fontFamily:"Georgia,serif",
          }}>← Menú</button>

        {beatDur && (
          <div style={{width:"100%",maxWidth:staffMaxW,height:5,background:"#1e1008",borderRadius:3,marginBottom:gap}}>
            <div style={{height:"100%",width:`${timerPct}%`,borderRadius:3,
              background:timerPct>50?"#f5c842":timerPct>20?"#f09020":"#f04030",
              transition:"width 0.1s linear,background 0.4s"}}/>
          </div>
        )}

        {currentNotes.length>0 && (
          <div style={{
            width:"100%",maxWidth:pianoMaxW,
            background:"#120a02",border:"1.5px solid #2e1c08",
            borderRadius:12,padding:isLandscape&&!isTablet?"2px 8px":"5px 10px",
            marginBottom:gap,boxShadow:"0 4px 24px rgba(0,0,0,0.7)",
          }}>
            <Staff clef={currentClef} notes={currentWrittenNotes} showLabel={level.showLabel} keySig={currentKeySig}/>
          </div>
        )}

        {level.chords && currentNotes.length===2 && (
          <div style={{fontSize:10,color:"#5a4020",marginBottom:gap/2}}>
            🎵 Tocá las dos notas{chordPressed.length===1&&" · 1/2 ✓"}
          </div>
        )}

        <div style={{height:18,display:"flex",alignItems:"center",marginBottom:gap/2}}>
          {feedbackMsg && (
            <span style={{fontSize:12,
              color:feedbackMsg.startsWith("✓")?"#70d070":feedbackMsg.startsWith("⏱")?"#f09040":"#f07060",
            }}>{feedbackMsg}</span>
          )}
        </div>
      </>)}

      {/* Piano */}
      <div style={{
        width:"100%",maxWidth:pianoMaxW,
        background:"#0e0804",border:"2px solid #221408",
        borderRadius:"0 0 16px 16px",
        padding:isTablet?"12px 8px 14px":"8px 4px 10px",
        boxShadow:"0 8px 40px rgba(0,0,0,0.9)",
        marginTop:screen==="menu"?"auto":0,
      }}>
        <PianoKeyboard onPress={handleKeyPress} keyHeight={pianoH}/>
        <div style={{textAlign:"center",marginTop:3,fontSize:8,color:"#2a1808",letterSpacing:3}}>
          C2 ·· C3 ·· C4 ·· C5
        </div>
      </div>

      {screen==="play" && (
        <div style={{width:"100%",maxWidth:staffMaxW,marginTop:gap/2}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"#4a3020",marginBottom:2}}>
            <span>Racha: {streak}/20</span>
            <span>{subLevel<SUB_TIMES.length-1?`→ sub ${subLevel+2}`:canLevelUp?"¡Podés subir!":"→ desbloquear"}</span>
          </div>
          <div style={{width:"100%",height:4,background:"#1e1008",borderRadius:2}}>
            <div style={{width:`${(streak/20)*100}%`,height:"100%",
              background:"linear-gradient(90deg,#c89000,#f5c842)",
              borderRadius:2,transition:"width 0.2s"}}/>
          </div>
        </div>
      )}
    </div>
  );
}






