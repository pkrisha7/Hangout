import React, { useState, useEffect, useCallback, useRef } from 'react';

function emptyGrid() { return Array.from({ length: 9 }, () => Array(9).fill(0)); }

function isValid(grid, row, col, num) {
    for (let i = 0; i < 9; i++) {
        if (grid[row][i] === num) return false;
        if (grid[i][col] === num) return false;
        const br = 3 * Math.floor(row / 3) + Math.floor(i / 3);
        const bc = 3 * Math.floor(col / 3) + (i % 3);
        if (grid[br][bc] === num) return false;
    }
    return true;
}

function solve(grid) {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (grid[r][c] === 0) {
                const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
                for (const n of nums) {
                    if (isValid(grid, r, c, n)) {
                        grid[r][c] = n;
                        if (solve(grid)) return true;
                        grid[r][c] = 0;
                    }
                }
                return false;
            }
        }
    }
    return true;
}

function generatePuzzle(difficulty = 'medium') {
    const clues = { easy: 38, medium: 30, hard: 24 }[difficulty] || 30;
    const solution = emptyGrid();
    solve(solution);
    const puzzle = solution.map(r => [...r]);
    let removed = 81 - clues;
    while (removed > 0) {
        const r = Math.floor(Math.random() * 9);
        const c = Math.floor(Math.random() * 9);
        if (puzzle[r][c] !== 0) {
            puzzle[r][c] = 0;
            removed--;
        }
    }
    return { puzzle, solution };
}

function deepClone(g) { return g.map(r => [...r]); }

function isBoardComplete(grid, solution) {
    for (let r = 0; r < 9; r++)
        for (let c = 0; c < 9; c++)
            if (grid[r][c] !== solution[r][c]) return false;
    return true;
}

function formatTime(s) {
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

export default function Sudoku({ onClose }) {
    const [difficulty, setDifficulty] = useState('medium');
    const [solution, setSolution] = useState(null);
    const [grid, setGrid] = useState(null);
    const [given, setGiven] = useState(null);
    const [selected, setSelected] = useState(null);
    const [errors, setErrors] = useState({});
    const [notes, setNotes] = useState({});
    const [noteMode, setNoteMode] = useState(false);
    const [timer, setTimer] = useState(0);
    const [running, setRunning] = useState(false);
    const [mistakes, setMistakes] = useState(0);
    const [phase, setPhase] = useState('menu');
    const timerRef = useRef(null);

    useEffect(() => {
        if (running) { timerRef.current = setInterval(() => setTimer(t => t + 1), 1000); } else { clearInterval(timerRef.current); }
        return () => clearInterval(timerRef.current);
    }, [running]);

    const startGame = useCallback((diff) => {
        const d = diff || difficulty;
        const { puzzle: p, solution: s } = generatePuzzle(d);
        setSolution(s);
        setGrid(deepClone(p));
        setGiven(p.map(r => r.map(v => v !== 0)));
        setSelected(null);
        setErrors({});
        setNotes({});
        setTimer(0);
        setMistakes(0);
        setRunning(true);
        setPhase('playing');
    }, [difficulty]);

    const handleNumber = useCallback((num) => {
        if (!selected || !grid || !given) return;
        const { r, c } = selected;
        if (given[r][c]) return;
        const key = r + '-' + c;

        if (noteMode) {
            setNotes(prev => {
                const cur = new Set(prev[key] || []);
                cur.has(num) ? cur.delete(num) : cur.add(num);
                return {...prev, [key]: cur };
            });
            return;
        }

        const newGrid = deepClone(grid);
        newGrid[r][c] = num;
        setGrid(newGrid);
        setNotes(prev => {
            const n = {...prev };
            delete n[key];
            return n;
        });

        if (num !== 0 && num !== solution[r][c]) {
            setErrors(prev => ({...prev, [key]: true }));
            setMistakes(m => m + 1);
        } else {
            setErrors(prev => {
                const e = {...prev };
                delete e[key];
                return e;
            });
        }

        if (isBoardComplete(newGrid, solution)) {
            setRunning(false);
            setPhase('won');
        }
    }, [selected, grid, given, solution, noteMode]);

    useEffect(() => {
        const handler = (e) => {
            if (phase !== 'playing') return;
            if (e.key >= '1' && e.key <= '9') handleNumber(parseInt(e.key));
            if (e.key === 'Backspace' || e.key === 'Delete') handleNumber(0);
            if (e.key === 'n') setNoteMode(m => !m);
            if (!selected) return;
            const { r, c } = selected;
            const dirs = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
            if (dirs[e.key]) {
                const [dr, dc] = dirs[e.key];
                setSelected({ r: Math.max(0, Math.min(8, r + dr)), c: Math.max(0, Math.min(8, c + dc)) });
                e.preventDefault();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [handleNumber, phase, selected]);

    const isHighlighted = (r, c) => {
        if (!selected) return false;
        const { r: sr, c: sc } = selected;
        return r === sr || c === sc ||
            (Math.floor(r / 3) === Math.floor(sr / 3) && Math.floor(c / 3) === Math.floor(sc / 3));
    };

    const isSameNum = (r, c) => {
        if (!selected || !grid) return false;
        const val = grid[selected.r][selected.c];
        return val !== 0 && grid[r][c] === val;
    };

    const cellStyle = (r, c) => {
        const sel = selected && selected.r === r && selected.c === c;
        const err = errors[r + '-' + c];
        const isGiv = given && given[r][c];
        let bg = '#13131e';
        if (isHighlighted(r, c)) bg = '#1c1c2e';
        if (isSameNum(r, c)) bg = '#252540';
        if (sel) bg = '#2d1fa8';
        return {
            background: bg,
            borderRight: (c % 3 === 2 && c < 8) ? '2px solid #4a4a6a' : '1px solid #1e1e2e',
            borderBottom: (r % 3 === 2 && r < 8) ? '2px solid #4a4a6a' : '1px solid #1e1e2e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            aspectRatio: '1',
            cursor: 'pointer',
            transition: 'background 0.1s',
            color: err ? '#f87171' : isGiv ? '#e2e2f0' : '#a78bfa',
            fontSize: 16,
            fontWeight: isGiv ? 600 : 500,
        };
    };

    return ( <
        div style = { st.overlay }
        onClick = {
            (e) => e.target === e.currentTarget && onClose && onClose()
        } >
        <
        div style = { st.modal } >

        <
        div style = { st.header } >
        <
        span style = { st.title } > 🧩Sudoku < /span> <
        button style = { st.closeBtn }
        onClick = { onClose } > ✕ < /button> < /
        div >

        <
        div style = { st.diffRow } > {
            ['easy', 'medium', 'hard'].map(d => ( <
                button key = { d }
                style = { st.diffBtn(difficulty === d) }
                onClick = {
                    () => setDifficulty(d)
                } > { d } < /button>
            ))
        } <
        /div>

        {
            phase === 'won' && ( <
                div style = { st.wonBox } >
                <
                div style = {
                    { fontSize: 52, marginBottom: 8 }
                } > 🎉 < /div> <
                div style = {
                    { fontSize: 26, fontWeight: 800, color: '#a78bfa', marginBottom: 4 }
                } > You solved it! < /div> <
                div style = {
                    { color: '#888', fontSize: 14, marginBottom: 20 }
                } > Time: { formatTime(timer) }·
                Mistakes: { mistakes } < /div> <
                button style = { st.newGameBtn }
                onClick = {
                    () => startGame()
                } > Play Again < /button> < /
                div >
            )
        }

        {
            phase === 'playing' && ( <
                >
                <
                div style = { st.statsRow } > {
                    [
                        ['Time', formatTime(timer)],
                        ['Mistakes', mistakes],
                        ['Mode', noteMode ? 'Notes' : 'Fill']
                    ].map(([l, v]) => ( <
                        div key = { l }
                        style = { st.stat } >
                        <
                        div style = {
                            { fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: 1 }
                        } > { l } < /div> <
                        div style = {
                            { fontSize: 18, fontWeight: 700, color: '#a78bfa', marginTop: 2 }
                        } > { v } < /div> < /
                        div >
                    ))
                } <
                /div>

                <
                div style = { st.board } > {
                    grid && grid.map((row, r) => row.map((val, c) => {
                        const key = r + '-' + c;
                        const noteSet = notes[key];
                        return ( <
                            div key = { key }
                            style = { cellStyle(r, c) }
                            onClick = {
                                () => setSelected({ r, c })
                            } > {
                                val !== 0 ? val : (noteSet && noteSet.size > 0) ?
                                    <
                                    div style = {
                                        { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', width: '100%', height: '100%', padding: 1 }
                                    } > {
                                        [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => ( <
                                            span key = { n }
                                            style = {
                                                { fontSize: 7, textAlign: 'center', color: noteSet.has(n) ? '#a78bfa' : 'transparent', lineHeight: '1.4' }
                                            } > { n } < /span>
                                        ))
                                    } <
                                    /div> :
                                null
                            } <
                            /div>
                        );
                    }))
                } <
                /div>

                <
                div style = { st.toolRow } >
                <
                button style = { st.toolBtn(noteMode) }
                onClick = {
                    () => setNoteMode(m => !m)
                } > ✏️Notes { noteMode ? 'ON' : 'OFF' } < /button> <
                button style = { st.toolBtn(false) }
                onClick = {
                    () => handleNumber(0)
                } > ⌫Erase < /button> <
                button style = { st.toolBtn(false) }
                onClick = {
                    () => {
                        if (!selected || !grid || !given) return;
                        const { r, c } = selected;
                        if (given[r][c]) return;
                        const newGrid = deepClone(grid);
                        newGrid[r][c] = solution[r][c];
                        setGrid(newGrid);
                        setErrors(prev => {
                            const e = {...prev };
                            delete e[r + '-' + c];
                            return e;
                        });
                        setNotes(prev => {
                            const n = {...prev };
                            delete n[r + '-' + c];
                            return n;
                        });
                        if (isBoardComplete(newGrid, solution)) {
                            setRunning(false);
                            setPhase('won');
                        }
                    }
                } > 💡Hint < /button> < /
                div >

                <
                div style = { st.numpad } > {
                    [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => ( <
                        button key = { n }
                        style = { st.numBtn }
                        onMouseEnter = { e => e.currentTarget.style.background = '#252540' }
                        onMouseLeave = { e => e.currentTarget.style.background = '#1a1a26' }
                        onClick = {
                            () => handleNumber(n)
                        } > { n } < /button>
                    ))
                } <
                button style = {
                    {...st.numBtn, fontSize: 11, color: '#666' }
                }
                onMouseEnter = { e => e.currentTarget.style.background = '#252540' }
                onMouseLeave = { e => e.currentTarget.style.background = '#1a1a26' }
                onClick = {
                    () => handleNumber(0)
                } > CLR < /button> < /
                div > <
                />
            )
        }

        {
            phase !== 'won' && ( <
                button style = { st.newGameBtn }
                onClick = {
                    () => startGame()
                } > { phase === 'menu' ? '▶ Start Game' : '↺ New Game' } <
                /button>
            )
        }

        <
        /div> < /
        div >
    );
}

const st = {
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(6px)' },
    modal: { background: '#0f0f14', border: '1px solid #2a2a3a', borderRadius: 20, padding: '28px 24px', width: '100%', maxWidth: 440, boxShadow: '0 32px 80px rgba(0,0,0,0.7)', fontFamily: "'Segoe UI', sans-serif", color: '#e8e8f0', maxHeight: '95vh', overflowY: 'auto' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 22, fontWeight: 700, color: '#fff' },
    closeBtn: { background: '#1e1e2e', border: '1px solid #2a2a3a', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: '#888', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    diffRow: { display: 'flex', gap: 8, marginBottom: 16 },
    diffBtn: (a) => ({ flex: 1, background: a ? '#1e1e30' : 'transparent', border: '1px solid ' + (a ? '#4a4a7a' : '#2a2a3a'), borderRadius: 8, padding: '7px 0', color: a ? '#a78bfa' : '#555', fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }),
    statsRow: { display: 'flex', gap: 12, marginBottom: 16 },
    stat: { flex: 1, background: '#1a1a26', borderRadius: 10, padding: '8px 12px', textAlign: 'center' },
    board: { display: 'grid', gridTemplateColumns: 'repeat(9,1fr)', gap: 1, background: '#2a2a3a', border: '2px solid #4a4a6a', borderRadius: 10, overflow: 'hidden', marginBottom: 14 },
    toolRow: { display: 'flex', gap: 8, marginBottom: 14 },
    toolBtn: (a) => ({ flex: 1, background: a ? '#3d2fa0' : '#1a1a26', border: '1px solid ' + (a ? '#6d5fdf' : '#2a2a3a'), borderRadius: 8, padding: '8px 0', color: a ? '#c4b5fd' : '#888', fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5 }),
    numpad: { display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6, marginBottom: 12 },
    numBtn: { background: '#1a1a26', border: '1px solid #2a2a3a', borderRadius: 8, padding: '10px 0', color: '#c4c4dc', fontSize: 18, fontWeight: 600, cursor: 'pointer', textAlign: 'center', transition: 'background 0.15s' },
    newGameBtn: { width: '100%', background: 'linear-gradient(135deg,#6d5fdf,#a78bfa)', border: 'none', borderRadius: 10, padding: '12px 0', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 4 },
    wonBox: { textAlign: 'center', padding: '20px 0' },
};