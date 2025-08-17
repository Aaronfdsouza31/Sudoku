import React, { useState, useEffect, useRef } from "react";

// Helpers
const emptyGrid = () => Array(9).fill(null).map(() => Array(9).fill(""));
const emptyNotes = () => Array(9).fill(null).map(() => Array(9).fill(null).map(() => new Set()));

function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a;}
function ok(g,r,c,n){
  n=String(n);
  for(let i=0;i<9;i++) if(g[r][i]===n||g[i][c]===n) return false;
  const br=Math.floor(r/3)*3, bc=Math.floor(c/3)*3;
  for(let rr=br;rr<br+3;rr++) for(let cc=bc;cc<bc+3;cc++) if(g[rr][cc]===n) return false;
  return true;
}
function generate(clues){
  const g=emptyGrid();
  function fill(i=0){
    if(i===81) return true;
    const r=Math.floor(i/9), c=i%9;
    if(g[r][c]) return fill(i+1);
    for(const n of shuffle([1,2,3,4,5,6,7,8,9])){
      if(ok(g,r,c,n)){ g[r][c]=String(n); if(fill(i+1)) return true; g[r][c]=""; }
    }
    return false;
  }
  fill();
  let puz=g.map(r=>[...r]);
  let rm=81-clues;
  while(rm>0){ const r=Math.floor(Math.random()*9),c=Math.floor(Math.random()*9); if(puz[r][c]!==""){puz[r][c]="";rm--;} }
  return [puz,g];
}

export default function Sudoku(){
  const [stage,setStage]=useState("name");
  const [name,setName]=useState("");
  const [diff,setDiff]=useState("Easy");
  const [board,setBoard]=useState(emptyGrid());
  const [original,setOriginal]=useState(emptyGrid());
  const [solution,setSolution]=useState(emptyGrid());
  const [notes,setNotes]=useState(emptyNotes());
  const [select,setSelect]=useState([-1,-1]);
  const [pencil,setPencil]=useState(false);
  const [timer,setTimer]=useState(0);
  const timerRef=useRef();
  const [complete,setComplete]=useState(false);

  // generate once we hit play
  function start(d){
    setDiff(d);
    const clues= d==="Easy"?42:d==="Medium"?32:26;
    const [pz,sol]=generate(clues);
    setBoard(pz.map(r=>[...r]));
    setOriginal(pz.map(r=>[...r]));
    setSolution(sol);
    setNotes(emptyNotes());
    setSelect([-1,-1]);
    setPencil(false);
    setTimer(0);
    setComplete(false);
    setStage("play");
  }

  // restart same puzzle
  function restart(){
    setBoard(original.map(r=>[...r]));
    setNotes(emptyNotes());
    setSelect([-1,-1]);
    setPencil(false);
    setTimer(0);
  }

  // timer
  useEffect(()=>{
    if(stage==="play"){
      timerRef.current=setInterval(()=>setTimer(t=>t+1),1000);
    }
    return()=>clearInterval(timerRef.current);
  },[stage]);

  // win detect
  useEffect(()=>{
    if(stage==="play"){
      const done=JSON.stringify(board)===JSON.stringify(solution);
      if(done){
        clearInterval(timerRef.current);
        setComplete(true);
      }
    }
  },[board]);

  function handleIn(n){
    const[r,c]=select;
    if(r<0||c<0||original[r][c])return;
    if(pencil){
      setNotes(ns=>{
        const cp=ns.map(r=>r.map(s=>new Set(s)));
        if(cp[r][c].has(n)) cp[r][c].delete(n);
        else cp[r][c].add(n);
        return cp;
      });
    }else{
      setBoard(b=>{
        const cp=b.map(r=>r.slice());
        cp[r][c]=String(n);
        return cp;
      });
      setNotes(ns=>{
        const cp=ns.map(r=>r.map(s=>new Set(s)));
        cp[r][c].clear();return cp;
      });
    }
  }

  // keyboard
  useEffect(()=>{
    function key(e){
      if(stage!=="play") return;
      if(/[1-9]/.test(e.key)) handleIn(e.key);
      if(["Backspace","Delete","0"].includes(e.key)) handleIn("");
      if(e.key==="p") setPencil(p=>!pencil);
    }
    window.addEventListener("keydown",key);
    return()=>window.removeEventListener("keydown",key);
  });

  function fT(t){return `${Math.floor(t/60)}:${String(t%60).padStart(2,"0")}`;}

  if(stage==="name"){
    return(
      <div style={st.wrap}>
        <h2>Welcome to Sudoku</h2>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Enter name" style={st.input}/>
        <button disabled={!name} onClick={()=>setStage("diff")}>Next</button>
      </div>
    );
  }
  if(stage==="diff"){
    return(
      <div style={st.wrap}>
        <h3>Hello {name}</h3>
        <p>Select Difficulty</p>
        <button onClick={()=>start("Easy")}>Easy</button>
        <button onClick={()=>start("Medium")}>Medium</button>
        <button onClick={()=>start("Hard")}>Hard</button>
      </div>
    );
  }

  return(
    <div style={st.wrap}>
      <h3>{name} | {diff} | {fT(timer)}</h3>
      <div style={st.nums}>
        {Array.from({length:9},(_,i)=>(<div key={i+1} onClick={()=>handleIn(String(i+1))} style={st.num}>{i+1}</div>))}
      </div>
      <div style={st.board}>
        {board.map((row,r)=>(
          <div key={r} style={st.row}>
            {row.map((v,c)=>{
              const isSel=r===select[0]&&c===select[1];
              const clue=original[r][c];
              return(
                <div key={c} onClick={()=>setSelect([r,c])} style={{
                  ...st.cell,
                  borderTop: r%3===0?"3px solid #000":"1px solid #999",
                  borderLeft:c%3===0?"3px solid #000":"1px solid #999",
                  borderRight:(c+1)%3===0?"3px solid #000":"1px solid #999",
                  borderBottom:(r+1)%3===0?"3px solid #000":"1px solid #999",
                  background: clue?"#ddd":isSel?"#ffe8a0":"white"
                }}>
                  {v?(<span style={{fontSize:22,fontWeight:"bold"}}>{v}</span>):
                  [...notes[r][c]].length>0 && (
                    <div style={st.notesBox}>
                      {[1,2,3,4,5,6,7,8,9].map(n=>
                        <span key={n} style={{fontSize:10,opacity:notes[r][c].has(String(n))?1:0}}>{n}</span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
      <button onClick={()=>setPencil(!pencil)} style={{marginTop:10}}>{pencil?"Exit Pencil":"Enter Pencil"}</button>

      {/* New Buttons */}
      <div style={{marginTop:10}}>
        <button onClick={()=>setStage("diff")}>Back</button>{" "}
        <button onClick={restart}>Restart</button>{" "}
        <button onClick={()=>start(diff)}>New Game</button>
      </div>

      {complete && (
        <div style={st.complete}>
          <div style={{background:"white",padding:30,borderRadius:8,textAlign:"center"}}>
            <h2>🎉 Completed!</h2>
            <p>Time: {fT(timer)}</p>
            <button onClick={()=>setStage("diff")}>Play Again</button>
          </div>
        </div>
      )}
    </div>
  );
}

const st={
  wrap:{maxWidth:450,margin:"20px auto",textAlign:"center",fontFamily:"Arial"},
  input:{padding:8,fontSize:16,width:"80%",marginBottom:12},
  nums:{display:"flex",justifyContent:"center",gap:6,marginBottom:12},
  num:{padding:"7px 11px",background:"#f4f4f4",border:"1px solid #999",borderRadius:6,cursor:"pointer"},
  board:{},
  row:{display:"flex"},
  cell:{width:"50px",height:"50px",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",cursor:"pointer"},
  notesBox:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",width:"100%",height:"100%",alignContent:"center",justifyItems:"center",color:"#666"},
  complete:{position:"fixed",left:0,right:0,top:0,bottom:0,background:"rgba(0,0,0,0.35)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}
};
