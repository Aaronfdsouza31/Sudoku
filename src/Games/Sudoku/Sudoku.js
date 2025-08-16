import React, { useState, useEffect, useRef } from "react";

// Helper functions
const emptyGrid = () => Array(9).fill(null).map(() => Array(9).fill(""));
const emptyNotes = () => Array(9).fill(null)
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
    const r = Math.floor(idx / 9), c = idx % 9;
    if (grid[r][c]) return fill(idx + 1);
    let nums = shuffle([1,2,3,4,5,6,7,8,9]);
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
  let puzzle = grid.map(row => row.slice());
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
    if ((grid[r][i] === val && i !== c) || (grid[i][c] === val && i !== r)) return false;
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
  for (let rr = br; rr < br + 3; rr++) {
    for (let cc = bc; cc < bc + 3; cc++) {
      if (board[rr][cc]) used.add(board[rr][cc]);
    }
  }
  return [1,2,3,4,5,6,7,8,9].filter(n => !used.has(String(n)));
}

function getHighScores() {
  try {
    return JSON.parse(localStorage.getItem("sudoku_highscores_v2")) || {
      Easy: [],
      Medium: [],
      Hard: [],
    };
  } catch {
    return { Easy: [], Medium: [], Hard: [] };
  }
}

function saveHighScores(scores) {
  localStorage.setItem("sudoku_highscores_v2", JSON.stringify(scores));
}

export default function Sudoku() {
  const [screen, setScreen] = useState("init");
  const [inputName, setInputName] = useState("");
  const [name, setName] = useState("");
  const [difficulty, setDifficulty] = useState(null);
  const [board, setBoard] = useState(emptyGrid());
  const [solution, setSolution] = useState(null);
  const [original, setOriginal] = useState(emptyGrid());
  const [notes, setNotes] = useState(emptyNotes());
  const [selected, setSelected] = useState([-1, -1]);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef();
  const [pencil, setPencil] = useState(false);
  const [highlightNum, setHighlightNum] = useState(null);
  const [highScores, setHighScores] = useState(getHighScores());
  const [animateComplete, setAnimateComplete] = useState(false);
  const [paused, setPaused] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [puzzleSeed, setPuzzleSeed] = useState(null);

  useEffect(() => {
    if(screen === "play" && !paused) {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [screen, paused]);

  useEffect(() => {
    function handleVisibility() {
      if(screen === "play" && !paused && document.hidden) {
        setPaused(true);
        setShowPauseModal(true);
        sessionStorage.setItem("sudoku_autosave", JSON.stringify({
          board, notes, timer, difficulty, name, original, solution, selected, pencil, highlightNum
        }));
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);

    if(screen === "play" && !paused) {
      const saved = sessionStorage.getItem("sudoku_autosave");
      if(saved) setShowPauseModal(true);
    }
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [screen, paused, board, notes, timer, difficulty, name, original, solution, selected, pencil, highlightNum]);

  useEffect(() => {
    if(screen === "play" && sessionStorage.getItem("sudoku_autosave")) {
      setPaused(true);
      setShowPauseModal(true);
    }
  }, [screen]);

  function handleResumeGame() {
    const saved = JSON.parse(sessionStorage.getItem("sudoku_autosave"));
    if(saved) {
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
  function handleResumeWithoutRestore() {
    setPaused(false);
    setShowPauseModal(false);
    sessionStorage.removeItem("sudoku_autosave");
  }
  function startGame(diff) {
    setDifficulty(diff);
    let clues = diff === "Easy" ? 42 : diff === "Medium" ? 34 : 26;
    let puzzle = generatePuzzle(clues);
    let solved = JSON.parse(JSON.stringify(puzzle));
    solveBoard(solved);
    setSolution(solved);
    setOriginal(puzzle.map(row => row.slice()));
    setBoard(puzzle.map(row => row.slice()));
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
  function solveBoard(grid) {
    for(let r=0;r<9;r++) {
      for(let c=0;c<9;c++) {
        if(!grid[r][c]) {
          for(let n=1;n<=9;n++) {
            if(isValid(grid,r,c,n)) {
              grid[r][c] = String(n);
              if(solveBoard(grid)) return true;
              grid[r][c] = "";
            }
          }
          return false;
        }
      }
    }
    return true;
  }
  function handleRestart() {
    setBoard(puzzleSeed.map(row => row.slice()));
    setNotes(emptyNotes());
    setSelected([-1,-1]);
    setPencil(false);
    setHighlightNum(null);
    setTimer(0);
    setPaused(false);
    setShowPauseModal(false);
    sessionStorage.removeItem("sudoku_autosave");
  }
  function handleNewGame() {
    startGame(difficulty);
  }
  function handleBack() {
    setScreen("select");
    setPaused(false);
    setShowPauseModal(false);
    sessionStorage.removeItem("sudoku_autosave");
  }
  function selectCell(r, c) {
    setSelected([r, c]);
    setHighlightNum(null);
  }
  function handleInput(num) {
    const [r, c] = selected;
    if (r === -1 || c === -1 || original[r][c]) return;
    if (pencil) {
      setNotes(prev => {
        const copy = prev.map(row => row.map(set => new Set(set)));
        const allowed = getAvailableCandidates(board, r, c);
        if (!allowed.includes(Number(num))) return copy;
        if (copy[r][c].has(num)) copy[r][c].delete(num);
        else copy[r][c].add(num);
        return copy;
      });
    } else {
      setBoard(b => {
        const newB = b.map(row => row.slice());
        newB[r][c] = num;
        return newB;
      });
      setNotes(prev => {
        const copy = prev.map(row => row.map(set => new Set(set)));
        copy[r][c].clear();
        return copy;
      });
    }
  }
  useEffect(() => {
    function onKeyDown(e) {
      if (screen !== "play") return;
      if (!isNaN(e.key) && e.key >= "1" && e.key <= "9") {
        handleInput(e.key);
        setHighlightNum(null);
      }
      if (["Backspace", "Delete", "0"].includes(e.key) && selected[0] !== -1) {
        const [r, c] = selected;
        if (pencil) {
          setNotes(prev => {
            const copy = prev.map(row => row.map(set => new Set(set)));
            copy[r][c].clear();
            return copy;
          });
        } else {
          setBoard(b => {
            const newB = b.map(row => row.slice());
            newB[r][c] = "";
            return newB;
          });
        }
        setHighlightNum(null);
      }
      if (e.key === "ArrowUp" && selected[0] > 0) setSelected(([r, c]) => [r - 1, c]);
      if (e.key === "ArrowDown" && selected < 8) setSelected(([r, c]) => [r + 1, c]);
      if (e.key === "ArrowLeft" && selected[1] > 0) setSelected(([r, c]) => [r, c - 1]);
      if (e.key === "ArrowRight" && selected[1] < 8) setSelected(([r, c]) => [r, c + 1]);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected, screen, pencil]);
  useEffect(() => {
    if (screen === "play" && isComplete() && isCorrect()) {
      clearInterval(timerRef.current);
      setAnimateComplete(true);
      setTimeout(() => setScreen("complete"), 1200);
    }
  }, [board]);
  function isComplete() {
    return board.every(row => row.every(cell => cell !== ""));
  }
  function isCorrect() {
    return JSON.stringify(board) === JSON.stringify(solution);
  }
  function formatTime(sec) {
    const m = Math.floor(sec / 60), s = sec % 60;
    return `${m}:${s < 10 ? "0" + s : s}`;
  }
  function recordScore(name, t, diff) {
    let scores = getHighScores();
    let newList = [...scores[diff], { name, time: t }].sort((a, b) => a.time - b.time).slice(0, 5);
    scores[diff] = newList;
    setHighScores(scores);
    saveHighScores(scores);
  }
  function countNum(n) {
    return board.reduce((acc, r) => acc + r.reduce((a, c) => a + (c === String(n) ? 1 : 0), 0), 0);
  }
  function MiniGridPencil({ notes }) {
    const nums = Array.from({ length: 9 }, (_, i) => String(i + 1));
    return (
      <div style={{ width: "100%", height: "100%", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", fontSize: "11px", color: "#736e6e", placeItems: "center" }}>
        {nums.map(n => (
          <div key={n} style={{ opacity: notes.has(n) ? 1 : 0.17, height: "1em" }}>{n}</div>
        ))}
      </div>
    );
  }
  function renderCell(r, c) {
    const v = board[r][c];
    const pencilSet = notes[r][c];
    const isClue = original[r][c];
    const isSelected = selected[0] === r && selected[1] === c;
    const isHighlighted = highlightNum && String(v) === String(highlightNum);
    const cellAnim = animateComplete ? { animation: 'bgFlash 0.8s linear alternate infinite' } : {};
    return (
      <td
        key={c}
        onClick={() => {
          selectCell(r, c);
          if (board[r][c]) setHighlightNum(board[r][c]);
        }}
        style={{
          width: "11%",
          height: 0,
          paddingBottom: "11%",
          minWidth: "32px",
          maxWidth: "48px",
          position: "relative",
          textAlign: "center",
          fontWeight: isClue ? "bold" : "normal",
          fontSize: v ? "2rem" : "1.1rem",
          cursor: isClue ? "default" : "pointer",
          background:
            isSelected
              ? "#ffa500"
              : animateComplete
              ? "#a0ffad"
              : isHighlighted
              ? "#dde8f7"
              : isClue
              ? "#e9e9e9"
              : "white",
          ...cellBorder(r, c),
          ...cellAnim,
          transition: "background 0.2s",
        }}
      >
        <span style={{
          position: "absolute",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
        }}>
          {v ? v : pencilSet.size > 0 && <MiniGridPencil notes={pencilSet} />}
        </span>
      </td>
    );
  }
  function NumPanel() {
    function handleNumClick(n) {
      if (
        Array.isArray(selected) &&
        Array.isArray(original) &&
        selected[0] >= 0 &&
        selected[1] >= 0 &&
        original[selected] &&
        !original[selected][selected[1]]
      ) {
        handleInput(String(n));
      }
      setHighlightNum(highlightNum === String(n) ? null : String(n));
    }
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "flex-start",
          alignItems: "center",
          gap: "6px",
          width: "100%",
          maxWidth: "450px",
          margin: "16px auto",
        }}
      >
        {[...Array(9)].map((_, i) => {
          const n = i + 1;
          const done = countNum(n) === 9;
          return (
            <div
              key={n}
              onClick={() => handleNumClick(n)}
              style={{
                padding: "9px 10px",
                border: highlightNum === String(n) ? "2px solid blue" : "1px solid #bbb",
                borderRadius: 9,
                fontSize: "19px",
                fontWeight: "bold",
                textDecoration: done ? "line-through" : "none",
                color: highlightNum === String(n) ? "blue" : "#333",
                background: done ? "#ddeedf" : "#f7f7fa",
                cursor: done ? "not-allowed" : "pointer",
                opacity: done ? 0.45 : 1,
                userSelect: "none",
                minWidth: "32px",
                minHeight: "32px",
                maxWidth: "38px",
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {n}
            </div>
          );
        })}
      </div>
    );
  }
  if (screen === "init") {
    return (
      <div style={ui.container}>
        <h2>Welcome to Sudoku</h2>
        <input
          value={inputName}
          onChange={e => setInputName(e.target.value)}
          placeholder="Enter your name"
          style={ui.input}
        />
        <button disabled={!inputName.trim()} onClick={() => { setName(inputName.trim()); setScreen("select"); }}>
          Next
        </button>
        <div style={{ marginTop: 20 }}>
          <HighScoresList allScores={highScores} />
        </div>
      </div>
    );
  }
  if (screen === "select") {
    return (
      <div style={ui.container}>
        <h2>Hello, {name}!</h2>
        <h4>Select Difficulty</h4>
        <button style={ui.diffBtn} onClick={() => startGame("Easy")}>Easy</button>
        <button style={ui.diffBtn} onClick={() => startGame("Medium")}>Medium</button>
        <button style={ui.diffBtn} onClick={() => startGame("Hard")}>Hard</button>
      </div>
    );
  }
  return (
    <div style={ui.container}>
      <style>{`
        @keyframes bgFlash {
          0% { background: #a0ffad; }
          100% { background: #fff8a0; }
        }
      `}</style>
      <h3 style={{ marginBottom: 4 }}>Name: {name} | Difficulty: {difficulty} | Time: {formatTime(timer)}</h3>
      <NumPanel />
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
        <table style={{ borderCollapse: "collapse", margin: "auto", width: "100%", maxWidth: "450px", aspectRatio: "1" }}>
          <tbody>
            {Array.from({ length: 9 }, (_, r) => (
              <tr key={r}>{Array.from({ length: 9 }, (_, c) => renderCell(r, c))}</tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginLeft: 32, marginTop: 14 }}>
          <button style={ui.pencilBtn} onClick={() => setPencil(p => !p)}>
            {pencil ? "Exit 📝 Pencil" : "Enter 📝 Pencil"}
          </button>
        </div>
      </div>
      <div style={{ height: 28, margin: "16px auto" }}>
        {pencil
          ? <span style={{ color: "#444" }}>Pencil mode: only allowed numbers can be written as notes</span>
          : <span style={{ color: "#444" }}>Regular mode: you can enter any number (even if repeated)</span>}
      </div>
      <div style={{ marginTop: 32, maxWidth: 340, marginLeft: "auto", marginRight: "auto" }}>
        <div style={{display:"flex", justifyContent:"center", gap:16, marginBottom:16}}>
          <button onClick={handleBack} style={{ padding: "7px 18px", fontWeight: "bold" }}>Back</button>
          <button onClick={handleRestart} style={{ padding: "7px 18px", fontWeight: "bold" }}>Restart</button>
          <button onClick={handleNewGame} style={{ padding: "7px 18px", fontWeight: "bold" }}>New Game</button>
        </div>
        <h4>Top 5 High Scores ({difficulty})</h4>
        <ol>
          {highScores[difficulty] && highScores[difficulty].length ? highScores[difficulty].map(({ name, time }, i) => (
            <li key={i}>{name} - {formatTime(time)}</li>
          )) : <li>No scores yet</li>}
        </ol>
      </div>
      
      {/* DEBUG: show selected cell coordinates */}
      <div style={{position: 'fixed', bottom: 10, left: 10, backgroundColor: '#eee', padding: 10, zIndex: 9999}}>
        <strong>Selected Cell:</strong> {JSON.stringify(selected)}
      </div>

      {showPauseModal && (
        <PauseModal
          onResume={handleResumeGame}
          onResumeWithoutRestore={handleResumeWithoutRestore}
        />
      )}
      {screen === "complete" && (
        <CompletedDialog
          timer={timer}
          name={name}
          onClose={() => {
            recordScore(name, timer, difficulty);
            setScreen("select");
            setAnimateComplete(false);
          }}
        />
      )}
    </div>
  );
}
function PauseModal({ onResume, onResumeWithoutRestore }) {
  return (
    <div style={{
      position: "fixed", left: 0, top: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.16)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 30
    }}>
      <div style={{
        background: "#fff", borderRadius: 15, padding: "34px 32px", minWidth: 260, textAlign: "center"
      }}>
        <h2>Your game has been paused</h2>
        <button onClick={onResume} style={{ padding: "12px 25px", margin: "16px 0", fontSize: 17, borderRadius: 24, fontWeight: "bold", background: "#111", color: "#fff", border: "none" }}>Resume</button>
        <div>
          <button onClick={onResumeWithoutRestore} style={{ marginTop: 10, background: "none", border: "none", fontSize: 15, color: "#1A2B99", textDecoration: "underline", cursor: "pointer" }}>Resume without restoring</button>
        </div>
      </div>
    </div>
  );
}
function CompletedDialog({ timer, name, onClose }) {
  return (
    <div style={{
      position: "fixed", left: 0, right: 0, top: 0, bottom: 0,
      display: "flex", justifyContent: "center", alignItems: "center",
      background: "rgba(39,171,39,0.24)", zIndex: 20
    }}>
      <div style={{
        padding: 28,
        background: "white",
        borderRadius: 12,
        boxShadow: "0 0 28px #0a9640"
      }}>
        <h2 style={{ color: "#0a9640" }}>🎉 Completed!</h2>
        <p style={{ fontSize: 18, margin: "16px 0" }}>
          Congratulations <b>{name}</b>,<br />
          Your solving time is: <b>{Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}</b>
        </p>
        <button style={{ fontSize: 14, padding: "8px 24px", cursor: "pointer" }} onClick={onClose}>OK</button>
      </div>
    </div>
  );
}
function HighScoresList({ allScores }) {
  return (
    <div style={{ maxWidth: 400, marginTop: 8, fontSize: 14, color: "#666" }}>
      <h4>High Scores</h4>
      {["Easy", "Medium", "Hard"].map(diff => (
        <div key={diff} style={{ marginBottom: 6 }}>
          <strong>{diff}: </strong>
          {allScores[diff] && allScores[diff].length > 0
            ? allScores[diff].map(s => `${s.name} (${Math.floor(s.time / 60)}:${String(s.time % 60).padStart(2, '0')})`).join(", ")
            : "No scores yet"}
        </div>
      ))}
    </div>
  );
}
function cellBorder(r, c) {
  return {
    borderTop: r === 0 ? "2.5px solid #111" : r % 3 === 0 ? "2px solid #222" : "1px solid #bbb",
    borderLeft: c === 0 ? "2.5px solid #111" : c % 3 === 0 ? "2px solid #222" : "1px solid #bbb",
    borderRight: c === 8 ? "2.5px solid #111" : (c + 1) % 3 === 0 ? "2px solid #222" : "1px solid #bbb",
    borderBottom: r === 8 ? "2.5px solid #111" : (r + 1) % 3 === 0 ? "2px solid #222" : "1px solid #bbb"
  };
}
const ui = {
  container: {
    maxWidth: 670,
    margin: "18px auto 0",
    padding: "16px 6px 36px",
    borderRadius: 10,
    background: "#f3f7f8",
    minHeight: 530
  },
  input: {
    fontSize: 22,
    padding: "7px 16px",
    borderRadius: 5,
    border: "1.5px solid #aaa",
    marginRight: 8,
    marginBottom: 18,
    width: "240px"
  },
  diffBtn: {
    fontSize: 18,
    padding: "7px 26px",
    margin: "0 7px 17px",
    borderRadius: 6,
    border: "1.7px solid #98c3ff",
    background: "#e5f0ff",
    cursor: "pointer"
  },
  pencilBtn: {
    fontSize: 15,
    padding: "6px 14px",
    marginTop: "2px",
    borderRadius: 6,
    border: "1.6px solid #555",
    background: "#f9f8f4",
    cursor: "pointer",
    fontWeight: "bold"
  }
};
