let appMode = 'rotation', matchType = 'doubles', teamSize = 2, editMode = false, rosterVisible = true;
let setupPlayers = [];
let courts = [], waitingQueue = [], historyData = [], draftPool = [];
let tournamentPhase = 'qualifying', pendingRotation = null, selectedFromPool = null;
let seedTapCount = 0;
let currentRound = 1;
let roundScores = []; // Store scores for current round before rotation
let playerColors = {}; // Store unique pastel colors for each player

function handleHiddenSeed() {
    seedTapCount++;
    if (seedTapCount >= 5) {
        const seed = ["Ramiz", "Burak", "Reem", "Resad", "Elmas", "Zahra", "Dad", "Kambi"];
        setupPlayers = [...seed];
        updateRosterUI();
        seedTapCount = 0;
    }
    // Optional: reset tap count if they take too long
    clearTimeout(window.seedResetTimer);
    window.seedResetTimer = setTimeout(() => { seedTapCount = 0; }, 2000);
}

function setMatchType(t) { matchType = t; teamSize = (t === 'singles') ? 1 : 2; updateSetupUI(); }
function setMode(m) { appMode = m; updateSetupUI(); }
function updateSetupUI() {
    document.getElementById('type-singles').className = matchType === 'singles' ? 'mode-btn-active py-3 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 text-slate-500' : 'py-3 rounded-xl text-xs font-bold uppercase text-slate-500 transition-all flex items-center justify-center gap-2';
    document.getElementById('type-doubles').className = matchType === 'doubles' ? 'mode-btn-active py-3 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2' : 'py-3 rounded-xl text-xs font-bold uppercase text-slate-500 transition-all flex items-center justify-center gap-2';
    document.getElementById('mode-rotation').className = appMode === 'rotation' ? 'mode-btn-active py-3 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2' : 'py-3 rounded-xl text-xs font-bold uppercase text-slate-500 transition-all flex items-center justify-center gap-2';
    document.getElementById('mode-tournament').className = appMode === 'tournament' ? 'mode-btn-active py-3 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2' : 'py-3 rounded-xl text-xs font-bold uppercase text-slate-500 transition-all flex items-center justify-center gap-2';
}

function addPlayerToList() {
    const input = document.getElementById('playerNameInput');
    const name = input.value.trim();
    if (name) { setupPlayers.push(name); input.value = ''; updateRosterUI(); }
}

function removeSetupPlayer(idx) { setupPlayers.splice(idx, 1); updateRosterUI(); }

function toggleRosterView() {
    rosterVisible = !rosterVisible;
    document.getElementById('setupRosterList').classList.toggle('hidden', !rosterVisible);
    document.getElementById('rosterToggleText').innerText = rosterVisible ? 'HIDE ROSTER' : 'VIEW ROSTER';
    updateRosterUI();
}

function updateRosterUI() {
    document.getElementById('playerCounter').innerText = setupPlayers.length;
    document.getElementById('setupRosterList').innerHTML = setupPlayers.map((p, i) => `
        <div class="flex justify-between items-center text-sm p-2 border-b border-slate-900 last:border-0">
            <span class="font-bold">${p}</span>
            <button onclick="removeSetupPlayer(${i})" class="text-rose-500"><i data-lucide="x" size="14"></i></button>
        </div>`).join('');
    lucide.createIcons();
}

// Generate pastel colors for players
function generatePastelColors(players) {
    const pastelColors = [
        { bg: '#FFE5E5', text: '#CC6666' }, // Light pink
        { bg: '#E5F5E5', text: '#66CC66' }, // Light green
        { bg: '#E5E5FF', text: '#6666CC' }, // Light blue
        { bg: '#FFF5E5', text: '#CC9966' }, // Light orange
        { bg: '#F0E5FF', text: '#9966CC' }, // Light purple
        { bg: '#E5FFFF', text: '#66CCCC' }, // Light cyan
        { bg: '#FFE5F5', text: '#CC6699' }, // Light rose
        { bg: '#F5FFE5', text: '#99CC66' }, // Light lime
        { bg: '#FFE5CC', text: '#CC9966' }, // Light peach
        { bg: '#E5FFE5', text: '#66CC99' }, // Light mint
        { bg: '#E5E5F5', text: '#666699' }, // Light lavender
        { bg: '#FFF0E5', text: '#CC9966' }, // Light apricot
    ];
    
    players.forEach((player, index) => {
        const colorIndex = index % pastelColors.length;
        playerColors[player] = pastelColors[colorIndex];
    });
}

function initGame() {
    const perCourt = teamSize * 2;
    if (setupPlayers.length < perCourt) return alert(`Need at least ${perCourt} players.`);
    courts = []; waitingQueue = []; historyData = []; draftPool = [];
    tournamentPhase = 'qualifying';
    currentRound = 1;
    roundScores = [];
    generatePastelColors(setupPlayers);
    let players = [...setupPlayers];
    players.sort(() => Math.random() - 0.5);
    const num = Math.floor(players.length / perCourt);
    for (let i = 0; i < num; i++) {
        const s = i * perCourt;
        courts.push({ teamA: players.slice(s, s + teamSize), teamB: players.slice(s + teamSize, s + perCourt), winner: null, score: null });
    }
    waitingQueue = players.slice(num * perCourt);
    document.getElementById('screenTitle').innerText = appMode === 'rotation' ? "ROTATION MODE" : "QUALIFYING ROUND";
    document.getElementById('matchLabel').innerText = matchType === 'singles' ? '1v1 SINGLES' : '2v2 DOUBLES';
    document.getElementById('setupScreen').classList.replace('visible-screen', 'hidden-screen');
    document.getElementById('matchScreen').classList.replace('hidden-screen', 'visible-screen');
    if (appMode === 'tournament') {
        document.getElementById('actionArea').classList.remove('hidden');
        document.getElementById('rotationMeta').classList.add('hidden');
    } else {
        document.getElementById('actionArea').classList.add('hidden');
        document.getElementById('rotationMeta').classList.remove('hidden');
    }
    render();
}

function resetToSetup() {
    if (!confirm("Exit this session?")) return;
    setupPlayers = []; updateRosterUI();
    document.getElementById('matchScreen').classList.replace('visible-screen', 'hidden-screen');
    document.getElementById('setupScreen').classList.replace('hidden-screen', 'visible-screen');
    document.getElementById('scoreArea').classList.add('hidden');
    document.getElementById('tournamentResults').classList.add('hidden');
    editMode = false;
    currentRound = 1;
    roundScores = [];
    playerColors = {};
}

function toggleEditMode() {
    if (editMode) {
        if (courts.some(c => c.teamA.length < teamSize || c.teamB.length < teamSize)) {
            document.getElementById('draftWarning').classList.remove('hidden'); return;
        }
        editMode = false; selectedFromPool = null;
        document.getElementById('draftPoolArea').classList.add('hidden');
        document.getElementById('editText').innerText = "EDIT TEAMS";
        document.getElementById('editBtn').classList.replace('bg-emerald-600', 'bg-slate-800');
    } else {
        editMode = true; document.getElementById('draftPoolArea').classList.remove('hidden');
        document.getElementById('editText').innerText = "SAVE CHANGES";
        document.getElementById('editBtn').classList.replace('bg-slate-800', 'bg-emerald-600');
        document.getElementById('draftWarning').classList.add('hidden');
    }
    render();
}

function handleSlotClick(loc, teamKey, courtIdx, slotIdx) {
    if (!editMode) { if (loc === 'court') handleWin(courtIdx, teamKey); return; }
    if (selectedFromPool === null) {
        let name = "";
        if (loc === 'court') { if (courts[courtIdx][teamKey][slotIdx]) name = courts[courtIdx][teamKey].splice(slotIdx, 1)[0]; }
        else { name = waitingQueue.splice(slotIdx, 1)[0]; }
        if (name) draftPool.push(name);
    } else {
        const name = draftPool.splice(selectedFromPool, 1)[0];
        if (loc === 'court') { if (courts[courtIdx][teamKey].length < teamSize) courts[courtIdx][teamKey].push(name); else draftPool.push(name); }
        else { waitingQueue.push(name); }
        selectedFromPool = null;
    }
    render();
}

function handleWin(idx, key) {
    if (appMode === 'rotation') {
        courts[idx].winner = key; pendingRotation = { idx, key };
        document.getElementById('scoreArea').classList.remove('hidden');
    } else {
        if (tournamentPhase === 'complete') return;
        courts[idx].winner = key;
        document.getElementById('nextPhaseBtn').style.opacity = courts.every(c => c.winner) ? "1" : "0.5";
    }
    render();
}

function confirmRotation() {
    const sA = Math.max(0, Math.min(21, document.getElementById('scoreA').value || 0));
    const sB = Math.max(0, Math.min(21, document.getElementById('scoreB').value || 0));
    const { idx, key } = pendingRotation;
    const court = courts[idx];
    
    // Store score for current round
    roundScores.push({
        courtIdx: idx,
        teamA: [...court.teamA],
        teamB: [...court.teamB],
        scoreA: sA,
        scoreB: sB,
        winnerKey: key
    });
    
    // Store score in court object
    court.score = { scoreA: sA, scoreB: sB, winnerKey: key };
    court.winner = key;
    
    pendingRotation = null;
    document.getElementById('scoreA').value = '';
    document.getElementById('scoreB').value = '';
    document.getElementById('scoreArea').classList.add('hidden');
    render();
    
    // Check if all matches have winners - if so, show complete round button
    if (roundScores.length === courts.length && courts.every(c => c.winner !== null)) {
        // All matches complete - ready for next round
    }
}

function completeRound() {
    if (roundScores.length !== courts.length || !courts.every(c => c.winner !== null)) {
        return; // All matches must have winners
    }
    
    // Add all round scores to history
    roundScores.forEach(rs => {
        historyData.unshift({
            teamA: rs.teamA,
            teamB: rs.teamB,
            score: `${rs.scoreA}-${rs.scoreB}`,
            winnerKey: rs.winnerKey,
            round: currentRound
        });
    });
    
    // Rotate players based on winners/losers
    roundScores.forEach(rs => {
        const court = courts[rs.courtIdx];
        const loserKey = rs.winnerKey === 'teamA' ? 'teamB' : 'teamA';
        
        if (waitingQueue.length >= teamSize) {
            waitingQueue.push(...court[loserKey]);
            court[loserKey] = waitingQueue.splice(0, teamSize);
        } else {
            let s = [...court.teamA, ...court.teamB].sort(() => Math.random() - 0.5);
            court.teamA = s.slice(0, teamSize);
            court.teamB = s.slice(teamSize);
        }
        
        // Reset court for next round
        court.winner = null;
        court.score = null;
    });
    
    // Move to next round
    currentRound++;
    roundScores = [];
    render();
}

function cancelScore() { if(pendingRotation) courts[pendingRotation.idx].winner = null; pendingRotation = null; document.getElementById('scoreArea').classList.add('hidden'); render(); }

function getPlayerStyle(player) {
    if (playerColors[player]) {
        return `background-color: ${playerColors[player].bg}; color: ${playerColors[player].text};`;
    }
    return '';
}

function render() {
    const cont = document.getElementById('courtsContainer');
    cont.innerHTML = '';
    if (tournamentPhase === 'complete') return;

    // Show round number for rotation mode
    if (appMode === 'rotation') {
        const roundHeader = document.createElement('div');
        roundHeader.className = "text-center mb-4";
        roundHeader.innerHTML = `<div class="bg-indigo-950/30 border border-indigo-500/50 px-4 py-2 rounded-xl inline-block"><span class="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Round ${currentRound}</span></div>`;
        cont.appendChild(roundHeader);
    }

    courts.forEach((c, i) => {
        const div = document.createElement('div');
        div.className = "space-y-3";
        const scoreDisplay = c.score ? `<div class="text-center mt-2"><span class="bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-lg text-xs font-bold">${c.score.scoreA}-${c.score.scoreB}</span></div>` : '';
        div.innerHTML = `
            <div class="text-center text-[10px] font-black text-slate-700 uppercase tracking-widest">${tournamentPhase === 'finals' ? (i === 0 ? 'CHAMPIONSHIP' : 'BRONZE MATCH') : 'Court ' + (i+1)}</div>
            <div class="space-y-2">
                <div onclick="handleSlotClick('court', 'teamA', ${i}, 0)" class="flex flex-col gap-2 p-4 bg-slate-900 rounded-[2rem] border-2 transition-all ${c.winner === 'teamA' ? 'winner-glow' : 'border-slate-800'}">
                    <span class="text-[9px] font-bold text-indigo-500 uppercase text-center">Team A</span>
                    <div class="flex justify-center gap-2">
                        ${Array.from({length: teamSize}).map((_, si) => {
                            const player = c.teamA[si];
                            const style = player ? getPlayerStyle(player) : '';
                            return `<div class="player-slot px-4 py-2 rounded-xl font-bold text-sm min-w-[80px] text-center ${player ? 'slot-filled' : 'slot-empty'} ${editMode && selectedFromPool !== null && !player ? 'draft-active' : ''}" style="${style}">${player || '...'}</div>`;
                        }).join('')}
                    </div>
                </div>
                <div class="text-center text-slate-800 font-black italic text-[10px]">VS</div>
                <div onclick="handleSlotClick('court', 'teamB', ${i}, 0)" class="flex flex-col gap-2 p-4 bg-slate-900 rounded-[2rem] border-2 transition-all ${c.winner === 'teamB' ? 'winner-glow' : 'border-slate-800'}">
                    <span class="text-[9px] font-bold text-rose-500 uppercase text-center">Team B</span>
                    <div class="flex justify-center gap-2">
                        ${Array.from({length: teamSize}).map((_, si) => {
                            const player = c.teamB[si];
                            const style = player ? getPlayerStyle(player) : '';
                            return `<div class="player-slot px-4 py-2 rounded-xl font-bold text-sm min-w-[80px] text-center ${player ? 'slot-filled' : 'slot-empty'} ${editMode && selectedFromPool !== null && !player ? 'draft-active' : ''}" style="${style}">${player || '...'}</div>`;
                        }).join('')}
                    </div>
                </div>
                ${scoreDisplay}
            </div>`;
        cont.appendChild(div);
    });
    
    // Show "Rotate Teams" button when all matches have winners
    if (appMode === 'rotation' && roundScores.length === courts.length && courts.every(c => c.winner !== null) && courts.length > 0) {
        const rotateTeamsBtn = document.createElement('div');
        rotateTeamsBtn.className = "mt-6";
        rotateTeamsBtn.innerHTML = `<button onclick="completeRound()" class="w-full bg-emerald-600 hover:bg-emerald-700 font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-all text-white">Rotate Teams</button>`;
        cont.appendChild(rotateTeamsBtn);
    }
    
    // Update scoreboard (only for rotation mode)
    const scoreboardSection = document.getElementById('scoreboardSection');
    const scoreboardList = document.getElementById('scoreboardList');
    if (scoreboardSection && scoreboardList) {
        if (appMode === 'rotation') {
            scoreboardSection.classList.remove('hidden');
            if (historyData.length > 0) {
                scoreboardList.innerHTML = historyData.map(h => {
                    const winnerTeam = h.winnerKey === 'teamA' ? h.teamA : h.teamB;
                    const loserTeam = h.winnerKey === 'teamA' ? h.teamB : h.teamA;
                    const roundText = h.round ? ` <span class="text-slate-500 text-[8px]">(R${h.round})</span>` : '';
                    return `
                        <div class="bg-slate-900/50 border border-slate-800 p-2 rounded-xl text-[10px]">
                            <div class="flex justify-between items-center">
                                <div class="flex-1">
                                    <div class="text-emerald-500 font-bold">${winnerTeam.map(p => `<span style="${getPlayerStyle(p)}" class="px-1.5 py-0.5 rounded">${p}</span>`).join(' & ')}</div>
                                    <div class="text-slate-500 text-[9px] py-0.5">vs</div>
                                    <div class="text-slate-400">${loserTeam.map(p => `<span style="${getPlayerStyle(p)}" class="px-1.5 py-0.5 rounded">${p}</span>`).join(' & ')}</div>
                                </div>
                                <div class="font-black text-indigo-400 text-xs ml-3">${h.score}${roundText}</div>
                            </div>
                        </div>
                    `;
                }).join('');
            } else {
                scoreboardList.innerHTML = '<div class="text-slate-600 text-[10px] text-center py-2">No matches completed yet</div>';
            }
        } else {
            scoreboardSection.classList.add('hidden');
        }
    }
    
    document.getElementById('draftPool').innerHTML = draftPool.map((p, i) => `<div onclick="selectedFromPool = ${i}; render();" class="px-4 py-2 bg-indigo-600 rounded-xl font-bold text-sm border-2 ${selectedFromPool === i ? 'border-white' : 'border-transparent'}">${p}</div>`).join('');
    document.getElementById('waitingList').innerHTML = waitingQueue.map((p, i) => {
        const style = getPlayerStyle(p);
        return `<div onclick="handleSlotClick('waiting', null, null, ${i})" class="px-4 py-2 rounded-xl font-bold text-sm slot-filled" style="${style}">${p}</div>`;
    }).join('');
    if (editMode) document.getElementById('waitingList').innerHTML += `<div onclick="handleSlotClick('waiting')" class="px-4 py-2 border-2 border-dashed border-slate-700 rounded-xl text-xs text-slate-500 font-bold">+ BENCH</div>`;
    document.getElementById('historyList').innerHTML = historyData.map(h => `<div class="bg-slate-900/50 border border-slate-800 p-3 rounded-2xl text-[10px] flex justify-between items-center"><div class="flex flex-col flex-1"><span class="${h.winnerKey === 'teamA' ? 'text-emerald-500 font-bold' : 'text-slate-400'}">${h.teamA.join(' & ')}</span><span class="text-slate-600 italic py-0.5 text-[9px]">vs</span><span class="${h.winnerKey === 'teamB' ? 'text-emerald-500 font-bold' : 'text-slate-400'}">${h.teamB.join(' & ')}</span></div><span class="font-bold text-indigo-400 bg-slate-950 px-2 py-1 rounded ml-2">${h.score}</span></div>`).join('');
    lucide.createIcons();
}

function progressTournament() {
    if (!courts.every(c => c.winner !== null)) return;
    let wins = [], loss = [];
    courts.forEach(c => {
        if (c.winner === 'teamA') { wins.push(c.teamA); loss.push(c.teamB); }
        else { wins.push(c.teamB); loss.push(c.teamA); }
    });
    if (tournamentPhase === 'qualifying') {
        tournamentPhase = 'finals';
        document.getElementById('screenTitle').innerText = "FINALS ROUND";
        courts = [{ teamA: wins[0], teamB: wins[1] || wins[0], winner: null }];
        if (loss.length >= 2) courts.push({ teamA: loss[0], teamB: loss[1], winner: null });
        document.getElementById('nextPhaseBtn').innerText = "Finish Tournament";
    } else if (tournamentPhase === 'finals') {
        tournamentPhase = 'complete';
        document.getElementById('screenTitle').innerText = "RESULTS";
        document.getElementById('actionArea').classList.add('hidden');
        document.getElementById('tournamentResults').classList.remove('hidden');
        
        const podium = document.getElementById('podium');
        const first = courts[0].winner === 'teamA' ? courts[0].teamA : courts[0].teamB;
        const second = courts[0].winner === 'teamA' ? courts[0].teamB : courts[0].teamA;
        const third = courts[1] ? (courts[1].winner === 'teamA' ? courts[1].teamA : courts[1].teamB) : null;

        podium.innerHTML = `
            <div class="bg-amber-500/10 p-5 rounded-3xl border border-amber-500/30 text-center"><span class="text-amber-500 text-[10px] font-bold uppercase tracking-widest">1st Place</span><div class="text-xl font-black">${first.join(' & ')}</div></div>
            <div class="bg-slate-400/10 p-5 rounded-3xl border border-slate-400/30 text-center"><span class="text-slate-400 text-[10px] font-bold uppercase tracking-widest">2nd Place</span><div class="text-xl font-black">${second.join(' & ')}</div></div>
            ${third ? `<div class="bg-orange-700/10 p-5 rounded-3xl border border-orange-700/30 text-center"><span class="text-orange-700 text-[10px] font-bold uppercase tracking-widest">3rd Place</span><div class="text-xl font-black">${third.join(' & ')}</div></div>` : ''}
        `;
    }
    render();
}

document.getElementById('playerNameInput').addEventListener('keypress', (e) => { if (e.key === 'Enter') addPlayerToList(); });
lucide.createIcons();

