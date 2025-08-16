import React, { useState, useEffect, useRef } from "react";

// Helper functions
const emptyGrid = () => Array(9).fill(null).map(() => Array(9).fill(""));
const emptyNotes = () => Array(9).fill(null)
  .map(() => Array(9).fill(null).map(() => new Set()));

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [arr[j], arr[i]] = [arr[i], arr[j]];
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
  const [showModal, setShowModal] = useState(false);
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
    function visibilityHandler() {
      if (screen === "play" && !paused && document.hidden) {
        setPaused(true);
        setShowModal(true);
        sessionStorage.setItem("sudoku_autosave", JSON.stringify({
          board, notes, timer, difficulty, name, original, solution, selected, pencil, highlightNum
        }));
      }
    }
    document.addEventListener("visibilitychange", visibilityHandler);
    if (screen === "play" && !paused) {
      const saved = sessionStorage.getItem("sudoku_autosave");
      if(saved) setShowModal(true);
    }
    return () => document.removeEventListener("visibilitychange", visibilityHandler);
  }, [screen, paused]);

  useEffect(() => {
    if(screen === "play" && sessionStorage.getItem("sudoku_autosave")) {
      setPaused(true);
      setShowModal(true);
    }
  }, [screen]);

  const handleResume = () => {
    const saved = JSON.parse(sessionStorage.getItem("sudoku_autosave"));
    if (saved) {
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
      setShowModal(false);
      sessionStorage.removeItem("sudoku_autosave");
    }
  };

  const handleResumeWithout = () => {
    setPaused(false);
    setShowModal(false);
    sessionStorage.removeItem("sudoku_autosave");
  };

  const startGame = (diff) => {
    setDifficulty(diff);
    const clues = diff === "Easy" ? 42 : diff === "Medium" ? 34 : 26;
    const puzzle = generatePuzzle(clues);
    const solved = JSON.parse(JSON.stringify(puzzle));
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
    setShowModal(false);
    sessionStorage.removeItem("sudoku_autosave");
  };

  const solveBoard = (grid) => {
    for(let r=0; r<9; r++) {
      for(let c=0; c<9; c++) {
        if(!grid[r][c]){
          for(let n=1; n<=9; n++){
            if(isValid(grid, r, c, n)){
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
  };

  const handleRestart = () => {
    setBoard(puzzleSeed.map(row => row.slice()));
    setNotes(emptyNotes());
    setSelected([-1,-1]);
    setPencil(false);
    setHighlightNum(null);
    setTimer(0);
    setPaused(false);
    setShowModal(false);
    sessionStorage.removeItem("sudoku_autosave");
  };

  const handleNewGame = () => {
    startGame(difficulty);
  };

  const handleBack = () => {
    setScreen("select");
    setPaused(false);
    setShowModal(false);
    sessionStorage.removeItem("sudoku_autosave");
  };

  const selectCell = (r, c) => {
    setSelected([r, c]);
    setHighlightNum(null);
  };

  const handleInput = (num) => {
    console.log("handleInput called with number:", num, "at cell:", selected);
    if (selected[0] === -1 || selected[1] === -1) return;
    if (original[selected][selected[1]]) return;

    if (pencil) {
      setNotes(prev => {
        const copy = prev.map(row => row.map(cell => new Set(cell)));
        const allowed = getAvailableCandidates(board, selected[0], selected[1]);
        if (!allowed.includes(Number(num))) return copy;
        if (copy[selected][selected[1]].has(num)) {
          copy[selected][selected[1]].delete(num);
        } else {
          copy[selected][selected[1]].add(num);
        }
        return copy;
      });
    } else {
      setBoard(prev => {
        const copy = prev.map(row => row.slice());
        copy[selected[0]][selected[1]] = num;
        return copy;
      });
      setNotes(prev => {
        const copy = prev.map(row => row.map(cell => new Set(cell)));
        copy[selected][selected[1]].clear();
        return copy;
      });
    }
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if(screen !== "play") return;
      if (e.key >= '1' && e.key <= '9') {
        handleInput(e.key);
        setHighlightNum(null);
      }
      if ((e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') && selected[0] !== -1) {
        if(pencil) {
          setNotes(prev => {
            const copy = prev.map(row => row.map(cell => new Set(cell)));
            copy[selected[0]][selected[1]].clear();
            return copy;
          });
        } else {
          setBoard(prev => {
            const copy = prev.map(row => row.slice());
            copy[selected[0]][selected[1]] = "";
            return copy;
          });
        }
        setHighlightNum(null);
      }
      if(e.key === 'ArrowUp' && selected > 0) setSelected(([r,c]) => [r-1, c]);
      if(e.key === 'ArrowDown' && selected < 8) setSelected(([r,c]) => [r+1, c]);
      if(e.key === 'ArrowLeft' && selected[1] > 0) setSelected(([r,c]) => [r, c-1]);
      if(e.key === 'ArrowRight' && selected[1] < 8) setSelected(([r,c]) => [r, c+1]);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selected, screen]);

  useEffect(() => {
    if(screen === "play" && isComplete() && isCorrect()) {
      clearInterval(timerRef.current);
      setAnimateComplete(true);
      setTimeout(() => setScreen("complete"), 1200);
    }
  }, [board]);

  const isComplete = () => board.every(row => row.every(cell => cell !== ""));

  const isCorrect = () => JSON.stringify(board) === JSON.stringify(solution);

  const formatTime = (seconds) => {
    let m = Math.floor(seconds / 60);
    let s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const recordScore = (playerName, time, diff) => {
    let scores = getHighScores();
    let newScores = [...scores[diff], {name: playerName, time }];
    newScores = newScores.sort((a,b)=> a.time - b.time).slice(0, 5);
    scores[diff] = newScores;
    setHighScores(scores);
    saveHighScores(scores);
  };

  const countNum = (n) => {
    let count = 0;
    for(let row of board){
      for(let cell of row){
        if(cell === String(n)) count++;
      }
    }
    return count;
  };

  const MiniGridNote = ({ notes }) => {
    const nums = Array.from({length:9}).map((_, i) => String(i+1));
    return <div style={{
      width: '100%', height:'100%',
      display: 'grid',
      gridTemplateColumns: "repeat(3, 1fr)",
      fontSize: '11px',
      color:'#736e6e',
      placeItems:'center'
    }}>
      {nums.map(n => <div key={n} style={{opacity: notes.has(n)?1:0.15, height: '1em'}}>{n}</div>)}
    </div>;
  };

  const renderCell = (r,c) => {
    const val = board[r][c];
    const isClue = original[r][c];
    const notesInCell = notes[r][c];
    const isSelectedCell = (selected[0] === r && selected[1] === c);
    const isHighlighted = (highlightNum && val === highlightNum);
    const animateOnComplete = animateComplete ? {animation: 'bgFlash 0.8s linear alternate infinite'} : {};
    return (
      <td key={c} onClick={() => {
        selectCell(r,c);
        if(board[r][c]) setHighlightNum(board[r][c]);
      }}
      style={{
        ...cellBorder(r,c),
        width: '11%',
        paddingBottom: '11%',
        position: 'relative',
        textAlign: 'center',
        fontWeight: isClue ? 'bold' : 'normal',
        fontSize: val ? '2rem' : '1rem',
        cursor: isClue ? 'default' : 'pointer',
        background: isSelectedCell ? '#ffa500' :
          animateComplete ? '#a0ffad' :
          isHighlighted ? '#dde7f7' :
          isClue ? '#eaeaea' : 'white',
        ...animateOnComplete,
        transition: 'background 0.2s',
        userSelect: 'none',
      }}>
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)'
        }}>
          {
            val || notesInCell.size === 0 ? val : <MiniGridNote notes={notesInCell} />
          }
        </div>
      </td>
    );
  };

  const NumPad = () => {
    const handleNumClick = (num) => {
      console.log('NumPad clicked:', num, 'Selected cell:', selected);
      if( selected[0] < 0 || selected[1] < 0 ) return; // No cell selected
      if( original[selected][selected[1]] ) return; // Not editable
      handleInput(String(num));
      setHighlightNum(String(num));
    };

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'flex-start',
        gap: '6px',
        maxWidth: '450px',
        margin: '16px auto',
      }}>
        {[...Array(9).keys()].map(i => {
          const num = (i + 1);
          const isDone = countNum(num) >= 9;
          const isHighlighted = highlightNum === String(num);
          return (
            <div key={num} onClick={() => handleNumClick(num)} style={{
              padding: '9px 10px',
              borderRadius: 10,
              border: isHighlighted ? '2px solid blue' : '1px solid #bbb',
              fontWeight: 'bold',
              fontSize: '18px',
              cursor: isDone ? 'not-allowed' : 'pointer',
              opacity: isDone ? 0.4 : 1,
              backgroundColor: isDone ? '#ddeff5' : '#f7f9fc',
              userSelect: 'none',
              minWidth: 36,
              textAlign: 'center',
              color: '#222',
              userSelect: 'none',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {num}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={ui.container}>
      <h3 style={{marginBottom: 10}}>Name: {name} | Difficulty: {difficulty} | Time: {formatTime(timer)}</h3>
      {screen === 'init' && (
        <>
          <input
            type="text"
            value={inputName}
            onChange={e => setInputName(e.target.value)}
            placeholder="Enter your name"
            style={ui.input}
          />
          <button
            disabled={!inputName.trim()}
            onClick={() => { setName(inputName.trim()); setScreen('select'); }}
          >
            Next
          </button>
          <div>
            <h4>Top Scores</h4>
            <pre>{JSON.stringify(highScores, null, 2)}</pre>
          </div>
        </>
      )}

      {screen === 'select' && (
        <>
          <h4>Select Difficulty</h4>
          <button style={ui.diffBtn} onClick={() => startGame('Easy')}>Easy</button>
          <button style={ui.diffBtn} onClick={() => startGame('Medium')}>Medium</button>
          <button style={ui.diffBtn} onClick={() => startGame('Hard')}>Hard</button>
        </>
      )}

      {screen === 'play' && (
        <>
          {/* Number pad with number click handler */}
          <NumPad />

          {/* Sudoku grid */}
          <table style={{borderCollapse: 'collapse', margin: 'auto', width: '100%', maxWidth: 450, aspectRatio: '1'}}>
            <tbody>
              {board.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => renderCell(i, j))}
                </tr>
              ))}
            </tbody>
          </table>

          <button onClick={() => setPencil(!pencil)} style={ui.pencilBtn}>
            {pencil ? 'Exit Pencil Mode' : 'Enter Pencil Mode'}
          </button>

          <div style={{ marginTop: 16, maxWidth: 340, margin: 'auto' }}>
            <button onClick={handleBack} style={ui.button}>Back</button>
            <button onClick={handleRestart} style={ui.button}>Restart</button>
            <button onClick={handleNewGame} style={ui.button}>New Game</button>
          </div>
        </>
      )}

      {screen === 'complete' && (
        <div>
          <h2>Congratulations, {name}!</h2>
          <p>You completed the puzzle in {formatTime(timer)}</p>
          <button onClick={() => setScreen('select')} style={ui.button}>Play Again</button>
        </div>
      )}

      {/* Debug window showing selected cell */}
      <div style={{
        position: 'fixed',
        bottom: 10,
        left: 10,
        backgroundColor: '#eee',
        padding: 10,
        zIndex: 9999
      }}>
        <strong>Selected Cell:</strong> {JSON.stringify(selected)}
      </div>
    </div>
  );
}

const ui = {
  container: {
    maxWidth: 670,
    margin: 'auto',
    padding: '10px',
    backgroundColor: '#f3f7f8',
    minHeight: 600,
  },
  input: {
    fontSize: 20,
    padding: '8px',
    marginBottom: 10,
    width: '80%',
    maxWidth: 400,
  },
  diffBtn: {
    padding: '10px 20px',
    marginRight: 10,
    fontSize: 18,
    cursor: 'pointer',
  },
  button: {
    padding: '10px 20px',
    margin: '10px 5px',
    fontSize: 16,
  },
  pencilBtn: {
    marginTop: 10,
    padding: '8px 16px',
    fontSize: 16,
    cursor: 'pointer',
  },
};

function cellBorder(r,c) {
  return {
    borderTop: r % 3 === 0 ? '2px solid black' : '1px solid gray',
    borderLeft: c % 3 === 0 ? '2px solid black' : '1px solid gray',
    borderRight: c === 8 ? '2px solid black' : '1px solid gray',
    borderBottom: r === 8 ? '2px solid black' : '1px solid gray',
  };
}
