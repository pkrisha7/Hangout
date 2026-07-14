import React, { useState, useEffect, useRef } from 'react';

const PUZZLES = [{
        grid: [
            ['C', 'A', 'T', '#', 'D'],
            ['#', '#', 'A', '#', 'O'],
            ['S', 'T', 'R', 'E', 'G'],
            ['#', '#', 'E', '#', '#'],
            ['#', '#', 'E', '#', '#'],
        ],
        words: [
            { word: 'CAT', clue: 'A common household pet that meows', row: 0, col: 0, dir: 'across', num: 1 },
            { word: 'TREE', clue: 'A tall woody plant', row: 0, col: 2, dir: 'down', num: 2 },
            { word: 'STRE', clue: null, hidden: true, row: 2, col: 0, dir: 'across' },
            { word: 'STARE', clue: 'To look at something fixedly', row: 2, col: 0, dir: 'across', num: 3 },
            { word: 'DOG', clue: "Man's best friend", row: 0, col: 4, dir: 'down', num: 4 },
        ],
    },
    {
        grid: [
            ['S', 'U', 'N', '#', 'M'],
            ['#', '#', 'O', '#', 'O'],
            ['R', 'A', 'I', 'N', 'O'],
            ['#', '#', 'G', '#', 'N'],
            ['#', '#', 'H', '#', '#'],
        ],
        words: [
            { word: 'SUN', clue: 'The star at the center of our solar system', row: 0, col: 0, dir: 'across', num: 1 },
            { word: 'NOING', clue: null, hidden: true },
            { word: 'NIGHT', clue: 'The dark part of the day', row: 0, col: 2, dir: 'down', num: 2 },
            { word: 'RAIN', clue: 'Water falling from clouds', row: 2, col: 0, dir: 'across', num: 3 },
            { word: 'MOON', clue: 'Earth\'s natural satellite', row: 0, col: 4, dir: 'down', num: 4 },
        ],
    },
    {
        grid: [
            ['B', 'L', 'U', 'E', '#'],
            ['#', '#', '#', 'A', '#'],
            ['G', 'R', 'E', 'E', 'N'],
            ['#', '#', '#', 'T', '#'],
            ['#', '#', '#', 'H', '#'],
        ],
        words: [
            { word: 'BLUE', clue: 'Color of the sky', row: 0, col: 0, dir: 'across', num: 1 },
            { word: 'EARTH', clue: 'Our home planet', row: 0, col: 3, dir: 'down', num: 2 },
            { word: 'GREEN', clue: 'Color of grass and leaves', row: 2, col: 0, dir: 'across', num: 3 },
        ],
    },
];

function buildCellMap(puzzle) {
    const map = {};
    puzzle.words.forEach(w => {
        if (w.hidden) return;
        for (let i = 0; i < w.word.length; i++) {
            const r = w.dir === 'down' ? w.row + i : w.row;
            const c = w.dir === 'across' ? w.col + i : w.col;
            map[r + '-' + c] = map[r + '-' + c] || {};
            map[r + '-' + c].letter = w.word[i];
            if (i === 0) map[r + '-' + c].num = w.num;
        }
    });
    return map;
}

export default function Crossword({ onClose }) {
    const [puzzleIdx, setPuzzleIdx] = useState(0);
    const [userGrid, setUserGrid] = useState({});
    const [selected, setSelected] = useState(null);
    const [dir, setDir] = useState('across');
    const [phase, setPhase] = useState('menu');
    const [checked, setChecked] = useState({});
    const [revealed, setRevealed] = useState({});
    const [timer, setTimer] = useState(0);
    const [running, setRunning] = useState(false);
    const [won, setWon] = useState(false);
    const timerRef = useRef(null);
    const inputRef = useRef(null);

    const puzzle = PUZZLES[puzzleIdx];
    const cellMap = buildCellMap(puzzle);
    const ROWS = 5,
        COLS = 5;

    useEffect(() => {
        if (running) { timerRef.current = setInterval(() => setTimer(t => t + 1), 1000); } else { clearInterval(timerRef.current); }
        return () => clearInterval(timerRef.current);
    }, [running]);

    const formatTime = (s) => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');

    const startGame = (idx) => {
        const i = idx !== undefined ? idx : puzzleIdx;
        setPuzzleIdx(i);
        setUserGrid({});
        setSelected(null);
        setChecked({});
        setRevealed({});
        setTimer(0);
        setWon(false);
        setRunning(true);
        setPhase('playing');
    };

    const isBlack = (r, c) => puzzle.grid[r][c] === '#';

    const handleCellClick = (r, c) => {
        if (isBlack(r, c)) return;
        const key = r + '-' + c;
        if (selected === key) setDir(d => d === 'across' ? 'down' : 'across');
        else setSelected(key);
        inputRef.current && inputRef.current.focus();
    };

    const getWordCells = (r, c, direction) => {
        const cells = [];
        if (direction === 'across') {
            let cc = c;
            while (cc > 0 && !isBlack(r, cc - 1)) cc--;
            while (cc < COLS && !isBlack(r, cc)) {
                cells.push(r + '-' + cc);
                cc++;
            }
        } else {
            let rr = r;
            while (rr > 0 && !isBlack(rr - 1, c)) rr--;
            while (rr < ROWS && !isBlack(rr, c)) {
                cells.push(rr + '-' + c);
                rr++;
            }
        }
        return cells;
    };

    const moveNext = (r, c) => {
        let nr = r,
            nc = c;
        if (dir === 'across') nc = Math.min(COLS - 1, c + 1);
        else nr = Math.min(ROWS - 1, r + 1);
        if (!isBlack(nr, nc)) setSelected(nr + '-' + nc);
    };

    const movePrev = (r, c) => {
        let nr = r,
            nc = c;
        if (dir === 'across') nc = Math.max(0, c - 1);
        else nr = Math.max(0, r - 1);
        if (!isBlack(nr, nc)) setSelected(nr + '-' + nc);
    };

    const handleKeyDown = (e) => {
        if (phase !== 'playing' || !selected) return;
        const [r, c] = selected.split('-').map(Number);

        if (e.key === 'Backspace') {
            e.preventDefault();
            if (userGrid[selected]) {
                setUserGrid(prev => {
                    const n = {...prev };
                    delete n[selected];
                    return n;
                });
            } else {
                movePrev(r, c);
            }
            return;
        }
        if (e.key === 'ArrowRight') {
            setDir('across');
            if (!isBlack(r, c + 1)) setSelected(r + '-' + (c + 1));
            e.preventDefault();
            return;
        }
        if (e.key === 'ArrowLeft') {
            setDir('across');
            if (c > 0 && !isBlack(r, c - 1)) setSelected(r + '-' + (c - 1));
            e.preventDefault();
            return;
        }
        if (e.key === 'ArrowDown') {
            setDir('down');
            if (!isBlack(r + 1, c)) setSelected((r + 1) + '-' + c);
            e.preventDefault();
            return;
        }
        if (e.key === 'ArrowUp') {
            setDir('down');
            if (r > 0 && !isBlack(r - 1, c)) setSelected((r - 1) + '-' + c);
            e.preventDefault();
            return;
        }

        if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
            e.preventDefault();
            const letter = e.key.toUpperCase();
            const newGrid = {...userGrid, [selected]: letter };
            setUserGrid(newGrid);
            setChecked(prev => {
                const n = {...prev };
                delete n[selected];
                return n;
            });
            moveNext(r, c);

            // check win
            const allCorrect = Object.entries(cellMap).every(([k, v]) => newGrid[k] === v.letter);
            if (allCorrect) {
                setRunning(false);
                setWon(true);
                setPhase('won');
            }
        }
    };

    const checkAll = () => {
        const result = {};
        Object.entries(cellMap).forEach(([k, v]) => {
            if (userGrid[k]) result[k] = userGrid[k] === v.letter ? 'correct' : 'wrong';
        });
        setChecked(result);
    };

    const revealAll = () => {
        const full = {};
        Object.entries(cellMap).forEach(([k, v]) => { full[k] = v.letter; });
        setUserGrid(full);
        setRevealed(Object.fromEntries(Object.keys(cellMap).map(k => [k, true])));
        setRunning(false);
    };

    const clues = {
        across: puzzle.words.filter(w => w.dir === 'across' && !w.hidden),
        down: puzzle.words.filter(w => w.dir === 'down' && !w.hidden),
    };

    const highlightedCells = selected ?
        new Set(getWordCells(...selected.split('-').map(Number), dir)) :
        new Set();

    const getCellStyle = (r, c) => {
        const key = r + '-' + c;
        const isSel = selected === key;
        const isHi = highlightedCells.has(key);
        const chk = checked[key];
        let bg = '#1a1a26';
        if (isHi) bg = '#1e1e40';
        if (isSel) bg = '#2d1fa8';
        if (chk === 'correct') bg = '#14532d';
        if (chk === 'wrong') bg = '#450a0a';
        return {
            width: 48,
            height: 48,
            background: bg,
            border: '1px solid #2a2a3a',
            borderRight: (c % 5 === 4) ? '1px solid #4a4a6a' : '1px solid #2a2a3a',
            borderBottom: (r % 5 === 4) ? '1px solid #4a4a6a' : '1px solid #2a2a3a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            position: 'relative',
            userSelect: 'none',
            transition: 'background 0.1s',
            color: revealed[key] ? '#f59e0b' : chk === 'correct' ? '#4ade80' : chk === 'wrong' ? '#f87171' : '#e8e8f0',
            fontSize: 18,
            fontWeight: 700,
        };
    };

    return ( <
        div style = { st.overlay }
        onClick = { e => e.target === e.currentTarget && onClose && onClose() } >
        <
        div style = { st.modal } >
        <
        input ref = { inputRef }
        onKeyDown = { handleKeyDown }
        style = {
            { position: 'absolute', opacity: 0, pointerEvents: 'none', width: 1, height: 1 }
        }
        readOnly / >

        <
        div style = { st.header } >
        <
        span style = { st.title } > 📝Crossword < /span> <
        button style = { st.closeBtn }
        onClick = { onClose } > ✕ < /button> < /
        div >

        {
            phase === 'won' && ( <
                div style = { st.wonBox } >
                <
                div style = {
                    { fontSize: 52, marginBottom: 8 }
                } > 🎉 < /div> <
                div style = {
                    { fontSize: 24, fontWeight: 800, color: '#a78bfa', marginBottom: 4 }
                } > Puzzle solved! < /div> <
                div style = {
                    { color: '#888', fontSize: 14, marginBottom: 20 }
                } > Time: { formatTime(timer) } < /div> <
                div style = {
                    { display: 'flex', gap: 8 }
                } >
                <
                button style = { st.newGameBtn }
                onClick = {
                    () => startGame(puzzleIdx)
                } > Play Again < /button> <
                button style = {
                    {...st.newGameBtn, background: '#1a1a26', border: '1px solid #3d2fa0', color: '#a78bfa' }
                }
                onClick = {
                    () => startGame((puzzleIdx + 1) % PUZZLES.length)
                } > Next Puzzle < /button> < /
                div > <
                /div>
            )
        }

        {
            phase === 'playing' && ( <
                >
                <
                div style = { st.statsRow } >
                <
                div style = { st.stat } > < div style = { st.statL } > Time < /div><div style={st.statV}>{formatTime(timer)}</div > < /div> <
                div style = { st.stat } > < div style = { st.statL } > Puzzle < /div><div style={st.statV}>{puzzleIdx+1}/ { PUZZLES.length } < /div></div >
                <
                div style = { st.stat } > < div style = { st.statL } > Direction < /div><div style={st.statV}>{dir === 'across' ? '→' : '↓'}</div > < /div> < /
                div >

                { /* Board */ } <
                div style = {
                    { display: 'flex', justifyContent: 'center', marginBottom: 16 }
                } >
                <
                div style = {
                    { display: 'grid', gridTemplateColumns: 'repeat(5,48px)', gap: 2, background: '#0a0a12', padding: 4, borderRadius: 10, border: '2px solid #4a4a6a' }
                } > {
                    Array.from({ length: ROWS }, (_, r) => Array.from({ length: COLS }, (_, c) => {
                            const key = r + '-' + c;
                            const info = cellMap[key];
                            return isBlack(r, c) ?
                                <
                                div key = { key }
                            style = {
                                { width: 48, height: 48, background: '#060610', borderRadius: 2 }
                            }
                            />: < div key = { key }
                            style = { getCellStyle(r, c) }
                            onClick = {
                                () => handleCellClick(r, c)
                            } > {
                                info ? .num && < span style = {
                                    { position: 'absolute', top: 2, left: 3, fontSize: 9, color: '#a78bfa', fontWeight: 700, lineHeight: 1 }
                                } > { info.num } < /span>} { userGrid[key] || '' } < /
                                div > ;
                            }))
                    } <
                    /div> < /
                    div >

                    { /* Clues */ } <
                    div style = {
                        { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }
                    } > {
                        ['across', 'down'].map(d => ( <
                                div key = { d }
                                style = {
                                    { background: '#1a1a26', borderRadius: 10, padding: '10px 12px' }
                                } >
                                <
                                div style = {
                                    { fontSize: 10, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }
                                } > { d === 'across' ? '→ Across' : '↓ Down' } < /div> {
                                clues[d].map(w => ( <
                                    div key = { w.num }
                                    style = {
                                        { fontSize: 11, color: highlightedCells.has(w.row + '-' + w.col) ? '#e8e8f0' : '#888', marginBottom: 5, cursor: 'pointer', lineHeight: 1.4 }
                                    }
                                    onClick = {
                                        () => {
                                            setSelected(w.row + '-' + w.col);
                                            setDir(w.dir);
                                            inputRef.current && inputRef.current.focus();
                                        }
                                    } >
                                    <
                                    span style = {
                                        { color: '#a78bfa', fontWeight: 700 }
                                    } > { w.num }. < /span>{w.clue} < /
                                    div >
                                ))
                            } <
                            /div>
                        ))
                } <
                /div>

                { /* Buttons */ } <
                div style = {
                    { display: 'flex', gap: 8, marginBottom: 8 }
                } >
                <
                button style = { st.toolBtn }
                onClick = { checkAll } > ✓Check < /button> <
                button style = { st.toolBtn }
                onClick = { revealAll } > 💡Reveal < /button> <
                button style = { st.toolBtn }
                onClick = {
                    () => startGame((puzzleIdx + 1) % PUZZLES.length)
                } > ⏭Next < /button> < /
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
        } <
        /div> < /
        div >
    );
}

const st = {
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(6px)' },
    modal: { background: '#0f0f14', border: '1px solid #2a2a3a', borderRadius: 20, padding: '28px 24px', width: '100%', maxWidth: 480, boxShadow: '0 32px 80px rgba(0,0,0,0.7)', fontFamily: "'Segoe UI',sans-serif", color: '#e8e8f0', maxHeight: '95vh', overflowY: 'auto', position: 'relative' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 22, fontWeight: 700, color: '#fff' },
    closeBtn: { background: '#1e1e2e', border: '1px solid #2a2a3a', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: '#888', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    statsRow: { display: 'flex', gap: 12, marginBottom: 16 },
    stat: { flex: 1, background: '#1a1a26', borderRadius: 10, padding: '8px 12px', textAlign: 'center' },
    statL: { fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: 1 },
    statV: { fontSize: 18, fontWeight: 700, color: '#a78bfa', marginTop: 2 },
    toolBtn: { flex: 1, background: '#1a1a26', border: '1px solid #2a2a3a', borderRadius: 8, padding: '8px 0', color: '#888', fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5 },
    newGameBtn: { width: '100%', background: 'linear-gradient(135deg,#6d5fdf,#a78bfa)', border: 'none', borderRadius: 10, padding: '12px 0', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 4 },
    wonBox: { textAlign: 'center', padding: '20px 0' },
};