// === FILE: src/Games/Sudoku/Sudoku.js ===
import React, { useState, useEffect, useRef } from "react";

const emptyGrid = () => Array(9).fill(null).map(() => Array(9).fill(""));
const emptyNotes = () =>
  Array(9)
    .fill(null)
    .map(() => Array(9).fill(null).map(() => new Set()));

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generatePuzzle(clues = 36) {
  let grid = emptyGrid();
  function fill(idx = 0) {
    if (idx === 81) return true;
    const r = Math.floor(idx / 9),
      c = idx % 9;
    if (grid[r][c]) return fill(idx + 1);
    let nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (let n of nums) {
      if (isValid(grid, r, c, n)) {
        grid[r][c] = String(n);
        if (fill(idx + 1)) return true;
        grid[r][c] = "";
      }
    }
    return false;
  }
  fill();
  let puzzle = grid.map((row) => row.slice());
  let removeCount = 81 - clues;
  while (removeCount > 0) {
    const r = Math.floor(Math.random() * 9);
    const c = Math.floor(Math.random() * 9);
    if (puzzle[r][c] !== "") {
      puzzle[r][c] = "";
      removeCount--;
    }
  }
  return puzzle;
}

function isValid(grid, r, c, val) {
  val = String(val);
  for (let i = 0; i < 9; i++) {
    if ((grid[r][i] === val && i !== c) || (grid[i][c] === val && i !== r))
      return false;
  }
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let rr = br; rr < br + 3; rr++) {
    for (let cc = bc; cc < bc + 3; cc++) {
      if (grid[rr][cc] === val && (rr !== r || cc !== c)) return false;
    }
  }
  return true;
}

function getAvailableCandidates(board, r, c) {
  const used = new Set();
  for (let i = 0; i < 9; i++) {
    if (board[r][i]) used.add(board[r][i]);
    if (board[i][c]) used.add(board[i][c]);
  }
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let rr = br; rr < 3 + br; rr++) {
    for (let cc = bc; cc < 3 + bc; cc++) {
      if (board[rr][cc]) used.add(board[rr][cc]);
    }
  }
  return [1,2,3,4,5,6,7,8,9].filter(n => !used.has(String(n)));
}

function getHighScores() {
  try {
    return (
      JSON.parse(localStorage.getItem("sudoku_highscores_v2")) || {
        Easy: [],
        Medium: [],
        Hard: [],
      }
    );
  } catch {
    return { Easy: [], Medium: [], Hard: [] };
  }
}

function saveHighScores(scores) {
  localStorage.setItem("sudoku_highscores_v2", JSON.stringify(scores));
}

export default function Sudoku() {
  const [screen,setScreen]=useState("init");
  const [inputName,setInputName]=useState("");
  const [name,setName]=useState("");
  const [difficulty,setDifficulty]=useState(null);
  const [board,setBoard]=useState(emptyGrid());
  const [solution,setSolution]=useState(null);
  const [original,setOriginal]=useState(emptyGrid());
  const [notes,setNotes]=useState(emptyNotes());
  const [selected,setSelected]=useState([-1,-1]);
  const [timer,setTimer]=useState(0);
  const timerRef=useRef();
  const [pencil,setPencil]=useState(false);
  const [highlightNum,setHighlightNum]=useState(null);
  const [highScores,setHighScores]=useState(getHighScores());
  const [animateComplete,setAnimateComplete]=useState(false);
  const [paused,setPaused]=useState(false);
  const [showPauseModal,setShowPauseModal]=useState(false);
  const [puzzleSeed,setPuzzleSeed]=useState(null);

  useEffect(()=>{
    if(screen==="play"&&!paused){
      timerRef.current=setInterval(()=>setTimer(t=>t+1),1000);
    } else clearInterval(timerRef.current);
    return()=> clearInterval(timerRef.current);
  },[screen,paused]);

  useEffect(() => {
    if (screen==="play" && !paused && document.hidden) {
      setPaused(true);
      setShowPauseModal(true);
      sessionStorage.setItem("sudoku_autosave", JSON.stringify({
        board,notes,timer,difficulty,name,original,solution,selected,pencil,highlightNum
      }));
    }
  },[screen,paused]);

  useEffect(()=>{
    if(screen==="play" && sessionStorage.getItem("sudoku_autosave")){
      setPaused(true);
      setShowPauseModal(true);
    }
  },[screen]);

  function handleResumeGame(){
    const saved = JSON.parse(sessionStorage.getItem("sudoku_autosave"));
    if(saved){
      setBoard(saved.board);
      setNotes(saved.notes);
      setTimer(saved.timer);
      setDifficulty(saved.difficulty);
      setName(saved.name);
      setOriginal(saved.original);
      setSolution(saved.solution);
      setSelected(saved.selected);
      setPencil(saved.pencil);
      setHighlightNum(saved.highlightNum);
      setPaused(false);
      setShowPauseModal(false);
      sessionStorage.removeItem("sudoku_autosave");
    }
  }
  function handleResumeWithoutRestore(){
    setPaused(false); setShowPauseModal(false); sessionStorage.removeItem("sudoku_autosave");
  }
  function startGame(diff){
    setDifficulty(diff);
    let clues = diff==="Easy"?42: diff==="Medium"?34:26;
    let puzzle = generatePuzzle(clues);
    let solved = JSON.parse(JSON.stringify(puzzle));
    solveBoard(solved);
    setSolution(solved);
    setOriginal(puzzle.map(r=>r.slice()));
    setBoard(puzzle.map(r=>r.slice()));
    setNotes(emptyNotes());
    setSelected([-1,-1]);
    setPencil(false);
    setHighlightNum(null);
    setTimer(0);
    setScreen("play");
    setPuzzleSeed(puzzle);
    setPaused(false);
    setShowPauseModal(false);
    sessionStorage.removeItem("sudoku_autosave");
  }
  function solveBoard(grid){
    for(let r=0;r<9;r++){
      for(let c=0;c<9;c++){
        if(!grid[r][c]){
          for(let n=1;n<=9;n++){
            if(isValid(grid,r,c,n)){
              grid[r][c]=String(n);
              if(solveBoard(grid)) return true;
              grid[r][c]="";
            }
          }
          return false;
        }
      }
    }
    return true;
  }
  function handleRestart(){
    setBoard(puzzleSeed.map(r=>r.slice()));
    setNotes(emptyNotes());
    setSelected([-1,-1]);
    setPencil(false);
    setHighlightNum(null);
    setTimer(0);
    setPaused(false);
    setShowPauseModal(false);
    sessionStorage.removeItem("sudoku_autosave");
  }
  function handleNewGame(){ startGame(difficulty); }
  function handleBack(){ setScreen("select"); }
  function selectCell(r,c){ setSelected([r,c]); setHighlightNum(null); }

  function handleInput(num){
    const [r,c] = selected;
    if(r===-1 || c===-1 || original[r][c]) return;
    if(pencil){
      setNotes(prev=>{
        const copy=prev.map(r=>r.map(s=>new Set(s)));
        const allowed=getAvailableCandidates(board,r,c);
        if(!allowed.includes(Number(num))) return copy;
        if(copy[r][c].has(num)) copy[r][c].delete(num);
        else copy[r][c].add(num);
        return copy;
      });
    } else {
      setBoard(b=>{
        const nb=b.map(r=>r.slice());
        nb[r][c]=num;
        return nb;
      });
      setNotes(prev=>{
        const copy=prev.map(r=>r.map(s=>new Set(s)));
        copy[r][c].clear();
        return copy;
      });
    }
  }

  useEffect(()=>{
    function onKeyDown(e){
      if(screen!=="play") return;
      if(!isNaN(e.key) && e.key>="1" && e.key<="9"){
        handleInput(e.key); setHighlightNum(null);
      }
      if(["Backspace","Delete","0"].includes(e.key) && selected[0]!==-1){
        const [r,c]=selected;
        if(pencil){
          setNotes(prev=>{
            const copy=prev.map(r=>r.map(s=>new Set(s)));
            copy[r][c].clear(); return copy;
          });
        } else {
          setBoard(b=>{
            const nb=b.map(r=>r.slice());
            nb[r][c]=""; return nb;
          });
        }
        setHighlightNum(null);
      }
    }
    window.addEventListener("keydown",onKeyDown);
    return()=>window.removeEventListener("keydown",onKeyDown);
  },[selected,screen,pencil]);

  useEffect(()=>{
    if(screen==="play"&& board.every(r=>r.every(c=>c!=="")) && JSON.stringify(board)===JSON.stringify(solution) ){
      clearInterval(timerRef.current);
      setAnimateComplete(true);
      setTimeout(()=>setScreen("complete"),1200);
    }
  },[board]);

  function formatTime(sec){ const m=Math.floor(sec/60),s=sec%60; return`${m}:${s<10?"0"+s:s}`;}
  function recordScore(name,t,diff){
    const s=getHighScores();
    s[diff]=[...s[diff],{name,time:t}].sort((a,b)=>a.time-b.time).slice(0,5);
    setHighScores(s); saveHighScores(s);
  }
  function countNum(n){ return board.reduce((a,r)=>a+r.reduce((x,y)=>x+(y===String(n)?1:0),0),0);}

  // NumPanel that works on mobile + desktop
  function NumPanel(){
    function handleNumClick(n){
      const[r,c]=selected;
      if(r===-1||c===-1) return;
      if(original[r][c]) return;

      handleInput(String(n));
      setHighlightNum(p=>p===String(n)?null:String(n));
    }
    return (
      <div style={{display:"flex",justifyContent:"flex-start",gap:"6px",width:"100%",maxWidth:"450px",margin:"16px auto"}}>
        {[...Array(9)].map((_,i)=>{
          const n=i+1, done=countNum(n)===9;
          return(
            <div key={n} onClick={()=>!done && handleNumClick(n)}
            style={{padding:"9px 10px",border:highlightNum===String(n)?"2px solid blue":"1px solid #bbb",
              borderRadius:9,fontSize:"19px",fontWeight:"bold",textDecoration:done?"line-through":"none",
              color:highlightNum===String(n)?"blue":"#333", background:done?"#ddeedf":"#f7f7fa",
              cursor:done?"not-allowed":"pointer", opacity:done?0.45:1,userSelect:"none",
              minWidth:"32px",minHeight:"32px",maxWidth:"38px",boxSizing:"border-box",display:"flex",alignItems:"center",justifyContent:"center"}}>
              {n}
            </div>
          );
        })}
      </div>
    );
  }

  function MiniGridPencil({notes}){
    const nums=Array.from({length:9},(_,i)=>String(i+1));
    return(
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",fontSize:"11px"}}>
        {nums.map(n=>(<div key={n} style={{opacity:notes.has(n)?1:0.2}}>{n}</div>))}
      </div>
    );
  }

  function renderCell(r,c){
    const v=board[r][c], pencilSet=notes[r][c], isClue=original[r][c],
     isSel=selected[0]===r&&selected[1]===c, isHl=highlightNum&&String(v)===String(highlightNum);
    return(
      <td key={c} onClick={()=>{selectCell(r,c); if(board[r][c])setHighlightNum(board[r][c]);}}
       style={{width:"11%",paddingBottom:"11%",position:"relative",textAlign:"center",fontWeight:isClue?"bold":"normal",
        background:isSel?"#ffa500":isHl?"#dde8f7":isClue?"#e9e9e9":"white",...cellBorder(r,c)}}>
        <span style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)"}}>
          {v? v:( pencilSet.size>0 && <MiniGridPencil notes={pencilSet}/> )}
        </span>
      </td>
    );
  }

  if(screen==="init"){
    return(
      <div style={ui.container}>
        <h2>Welcome to Sudoku</h2>
        <input value={inputName} onChange={e=>setInputName(e.target.value)} placeholder="Enter your name" style={ui.input}/>
        <button disabled={!inputName.trim()} onClick={()=>{setName(inputName.trim());setScreen("select");}}>Next</button>
        <div style={{marginTop:20}}><HighScoresList allScores={highScores}/></div>
      </div>);
  }

  if(screen==="select"){
    return(
      <div style={ui.container}>
        <h2>Hello, {name}!</h2>
        <h4>Select Difficulty</h4>
        <button style={ui.diffBtn} onClick={()=>startGame("Easy")}>Easy</button>
        <button style={ui.diffBtn} onClick={()=>startGame("Medium")}>Medium</button>
        <button style={ui.diffBtn} onClick={()=>startGame("Hard")}>Hard</button>
      </div>
    );
  }

  return(
   <div style={ui.container}>
     <h3>Name: {name} | Difficulty: {difficulty} | Time: {formatTime(timer)}</h3>
     <NumPanel/>
     <table style={{borderCollapse:"collapse",margin:"auto",width:"100%",maxWidth:"450px",aspectRatio:"1"}}>
      <tbody>
       {Array.from({length:9},(_,r)=>(<tr key={r}>{Array.from({length:9},(_,c)=>renderCell(r,c))}</tr>))}
      </tbody>
     </table>
     <div style={{marginTop:16}}>
     <button style={ui.pencilBtn} onClick={()=>setPencil(p=>!p)}>{pencil?"Exit Pencil":"Enter Pencil"}</button></div>
     <div style={{marginTop:16}}>
      <button onClick={handleBack}>Back</button>
      <button onClick={handleRestart}>Restart</button>
      <button onClick={handleNewGame}>New Game</button>
     </div>
   </div>
  );
}

function PauseModal(){}
function CompletedDialog(){}
function HighScoresList(props){ return null; }
function cellBorder(r,c){
  return{
    borderTop:r===0?"2px solid #222":r%3===0?"2px solid #222":"1px solid #bbb",
    borderLeft:c===0?"2px solid #222":c%3===0?"2px solid #222":"1px solid #bbb",
    borderRight:c===8?"2px solid #222":(c+1)%3===0?"2px solid #222":"1px solid #bbb",
    borderBottom:r===8?"2px solid #222":(r+1)%3===0?"2px solid #222":"1px solid #bbb"
  };
}

const ui={
  container:{maxWidth:650,margin:"20px auto",background:"#f2f2f2",padding:16,borderRadius:12},
  input:{padding:8,fontSize:18,width:"80%",marginBottom:16},
  diffBtn:{marginRight:10,padding:"6px 20px",fontSize:16},
  pencilBtn:{padding:"6px 20px",marginTop:8,fontSize:15}
};
