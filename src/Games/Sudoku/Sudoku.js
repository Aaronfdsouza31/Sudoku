import React, { useState, useEffect, useRef } from "react";

const emptyGrid = () => Array(9).fill(0).map(() => Array(9).fill(""));
const emptyNotes = () => Array(9).fill(0).map(() => Array(9).fill().map(() => new Set()));

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]]=[a[j],a[i]];} return a;}
function isOK(grid,r,c,n){
  n=String(n);
  for(let i=0;i<9;i++){ if(grid[r][i]===n||grid[i][c]===n) return false;}
  const br=Math.floor(r/3)*3, bc=Math.floor(c/3)*3;
  for(let rr=br;rr<br+3;rr++)for(let cc=bc;cc<bc+3;cc++) if(grid[rr][cc]===n) return false;
  return true;
}
function generatePuzzle(clueCount){
  const grid=emptyGrid();
  function fill(idx=0){
    if(idx===81) return true;
    const r=Math.floor(idx/9), c=idx%9;
    if(grid[r][c]) return fill(idx+1);
    for(const n of shuffle([1,2,3,4,5,6,7,8,9])){
      if(isOK(grid,r,c,n)){ grid[r][c]=String(n); if(fill(idx+1)) return true; grid[r][c]="";}
    }
    return false;
  }
  fill();
  let puzzle=grid.map(r=>[...r]);
  let blanks=81-clueCount;
  while(blanks>0){
    const r=Math.floor(Math.random()*9), c=Math.floor(Math.random()*9);
    if(puzzle[r][c]!==""){ puzzle[r][c]=""; blanks--; }
  }
  return [puzzle,grid];
}

export default function Sudoku(){
  const [screen,setScreen]=useState("init");
  const [player,setPlayer]=useState("");
  const [name,setName]=useState("");
  const [difficulty,setDifficulty]=useState("Easy");
  const [board,setBoard]=useState(emptyGrid());
  const [solution,setSolution]=useState(emptyGrid());
  const [notes,setNotes]=useState(emptyNotes());
  const [original,setOriginal]=useState(emptyGrid());
  const [selected,setSelected]=useState([-1,-1]);
  const [pencil,setPencil]=useState(false);
  const [timer,setTimer]=useState(0);
  const timerRef=useRef();

  useEffect(()=>{
    if(screen==="play"){ timerRef.current=setInterval(()=>setTimer(t=>t+1),1000); }
    return()=>clearInterval(timerRef.current);
  },[screen]);

  useEffect(()=>{
    if(screen==="play" && isFinished()){
      clearInterval(timerRef.current);
      setTimeout(()=>setScreen("complete"),300);
    }
  },[board]);

  function startGame(diff){
    setDifficulty(diff);
    const clues= diff==="Easy"?42: diff==="Medium"?32:25;
    const [puz,sol]=generatePuzzle(clues);
    setOriginal(puz.map(r=>[...r]));
    setBoard(puz.map(r=>[...r]));
    setSolution(sol);
    setNotes(emptyNotes());
    setSelected([-1,-1]);
    setPencil(false);
    setTimer(0);
    setScreen("play");
  }

  function handleInput(n){
    const[r,c]=selected;
    if(r<0||c<0||original[r][c]) return;
    if(pencil){
      setNotes(ns=>{
        const copy=ns.map(r=>r.map(s=>new Set(s)));
        if(copy[r][c].has(n)) copy[r][c].delete(n);
        else copy[r][c].add(n);
        return copy;
      });
    }else{
      setBoard(b=>{
        const cp=b.map(r=>r.slice());
        cp[r][c]=String(n);
        return cp;
      });
      setNotes(ns=>{
        const cp=ns.map(r=>r.map(s=>new Set(s)));
        cp[r][c].clear();
        return cp;
      });
    }
  }

  function renderNotes(r,c){
    const set=notes[r][c];
    return(
      <div style={{
        display:"grid", gridTemplateColumns:"repeat(3,1fr)",
        fontSize:9, lineHeight:"10px", color:"#555"
      }}>
        {Array.from({length:9},(_,i)=>{const v=i+1;return(
          <div key={v} style={{opacity:set.has(String(v))?1:0.2}}>
            {v}
          </div>
        );})}
      </div>
    );
  }

  function isFinished(){
    return JSON.stringify(board)===JSON.stringify(solution);
  }

  function formatTime(t){ return `${Math.floor(t/60)}:${String(t%60).padStart(2,"0")}`;}

  // Keyboard support
  useEffect(()=>{
    function down(e){
      if(screen!=="play")return;
      if(/[1-9]/.test(e.key)) handleInput(e.key);
      if(["Backspace","Delete","0"].includes(e.key)) handleInput("");
      if(e.key==="p") setPencil(p=>!p);
    }
    window.addEventListener("keydown",down);
    return()=>window.removeEventListener("keydown",down);
  });

  if(screen==="init"){
    return(
      <div style={style.wrap}>
        <h2>Welcome to Sudoku</h2>
        <input value={player} onChange={e=>setPlayer(e.target.value)} placeholder="Enter name" style={style.input}/>
        <button disabled={!player} onClick={()=>{setName(player);setScreen("select");}}>Next</button>
      </div>
    );
  }

  if(screen==="select"){
    return(
      <div style={style.wrap}>
        <h3>Hello {name}</h3>
        <p>Select Difficulty:</p>
        <button onClick={()=>startGame("Easy")}>Easy</button>
        <button onClick={()=>startGame("Medium")}>Medium</button>
        <button onClick={()=>startGame("Hard")}>Hard</button>
      </div>
    );
  }

  if(screen==="complete"){
    return(
      <div style={style.wrap}>
        <h2>🎉 Completed!</h2>
        <p>Time: {formatTime(timer)}</p>
        <button onClick={()=>setScreen("select")}>Play Again</button>
      </div>
    );
  }

  return(
    <div style={style.wrap}>
      <h3>Name: {name} | {difficulty} | {formatTime(timer)}</h3>
      <div style={style.numpad}>
        {Array.from({length:9},(_,i)=>(i+1)).map(n=>
          <div key={n} style={style.numBtn} onClick={()=>handleInput(n)}>{n}</div>
        )}
      </div>
      <table style={style.table}>
        <tbody>
        {board.map((row,r)=>(
          <tr key={r}>
            {row.map((val,c)=>{
              const isSelected=r===selected[0]&&c===selected[1];
              const clue=original[r][c];
              return(
                <td key={c}
                  onClick={()=>setSelected([r,c])}
                  style={{
                    ...style.cell,
                    background:clue?"#dedede":isSelected?"#ffc26d": "white",
                    borderTop: r%3===0? "3px solid #000":"1px solid #999",
                    borderLeft:c%3===0? "3px solid #000":"1px solid #999",
                    borderRight:(c+1)%3===0? "3px solid #000":"1px solid #999",
                    borderBottom:(r+1)%3===0? "3px solid #000":"1px solid #999"
                  }}>
                  <span style={{visibility: val?"visible":"hidden", fontSize:20}}>{val}</span>
                  {!val && renderNotes(r,c)}
                </td>
              )
            })}
          </tr>
        ))}
        </tbody>
      </table>
      <button style={{marginTop:10}} onClick={()=>setPencil(!pencil)}>{pencil?"Exit Pencil":"Enter Pencil"}</button>
    </div>
  );
}

const style={
  wrap:{maxWidth:450,margin:"20px auto",textAlign:"center",fontFamily:"Arial"},
  input:{padding:8,fontSize:16,width:"80%",marginBottom:12},
  table:{width:"100%",borderCollapse:"collapse"},
  cell:{height:0,paddingBottom:"11%",position:"relative",textAlign:"center",cursor:"pointer"},
  numpad:{display:"flex",justifyContent:"center",gap:4,margin:"10px 0"},
  numBtn:{border:"1px solid #999",padding:"7px 11px",borderRadius:6,cursor:"pointer",userSelect:"none"}
};
