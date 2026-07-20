const GRID_SIZE = 25;
let minesCount = 1;
let currentPartieId = null;
let isMinesPlaying = false;
let revealedCount = 0;

const gridContainer = document.getElementById('grid'); 
for (let i = 0; i < GRID_SIZE; i++) {
    let cell = document.createElement('div');
    cell.className = 'cell';
    cell.id = `cell-${i}`;
    cell.onclick = () => handleCellClick(i);
    gridContainer.appendChild(cell);
}

function setMines(num, btnElement) {
    if (isMinesPlaying) return;
    minesCount = num;
    document.querySelectorAll('.m-btn').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');
}

async function syncBalance() {
    const { data } = await client
        .from('Joueurs')
        .select('"GoldCoins", "FreeCoins"')
        .eq('pseudo', monPseudo)
        .single();
    
    if (data) {
        const gcElement = document.getElementById('global-balance-gc');
        const fcElement = document.getElementById('global-balance-fc');
        if (gcElement) gcElement.innerText = (data.GoldCoins || 0).toFixed(2);
        if (fcElement) fcElement.innerText = (data.FreeCoins || 0).toFixed(2);
    }
}

function calcMultiplierVisuel() {
    if (revealedCount === 0) return 1;
    let mult = 1;
    let safeCells = GRID_SIZE - minesCount;
    for (let i = 0; i < revealedCount; i++) {
        mult *= (GRID_SIZE - i) / (safeCells - i);
    }
    return mult * 0.99;
}

// =========================================
// 1. DÉMARRER LA PARTIE
// =========================================
async function startGame() {
    if (isMinesPlaying) return;
    
    let bet = parseFloat(document.getElementById('montant-mise').value);
    let currentGC = parseFloat(document.getElementById('global-balance-gc').innerText);
    let currentFC = parseFloat(document.getElementById('global-balance-fc').innerText);

    let soldeActuel = typeMonnaieActive === 'GoldCoins' ? currentGC : currentFC;

    if (isNaN(bet) || bet <= 0 || bet > soldeActuel) {
        showToast("Mise invalide ou solde insuffisant !", "error");
        return;
    }

    document.querySelectorAll('.cell').forEach(cell => {
        cell.className = 'cell';
        cell.innerHTML = '';
    });

    document.getElementById('montant-mise').disabled = true;
    document.getElementById('play-btn').style.display = 'none';
    document.getElementById('cashout-btn').style.display = 'block';
    document.getElementById('cashout-btn').innerHTML = `ENCAISSER (${bet.toFixed(2)} ${typeMonnaieActive === 'GoldCoins' ? 'GC' : 'FC'})`;

    const { data, error } = await client.rpc('demarrer_mines', {
        p_pseudo: monPseudo,
        p_mise: bet,
        p_nb_mines: minesCount,
        p_monnaie: typeMonnaieActive
    });

    if (error) {
        showToast("Erreur de transaction !", "error");
        return;
    }

    currentPartieId = data.id;
    isMinesPlaying = true;
    window.isGameActive = true;
    revealedCount = 0;
    
    syncBalance();
}

// =========================================
// 2. CLIQUER SUR UNE CASE
// =========================================
async function handleCellClick(index) {
    if (!isMinesPlaying || !currentPartieId) return;
    let cell = document.getElementById(`cell-${index}`);
    if (cell.classList.contains('revealed-diamond')) return; 

    const { data, error } = await client.rpc('cliquer_mine', {
        p_id: currentPartieId,
        p_case: index
    });

    if (error || data.status === 'erreur') return;

    if (data.status === 'boum') {
        cell.classList.add('revealed-mine');
        cell.innerHTML = '💣';
        endMinesGame("Boom ! Tu as touché une mine 💥", data.mines);
    } else if (data.status === 'diamant') {
        cell.classList.add('revealed-diamond');
        cell.innerHTML = '💎';
        revealedCount++;
        
        let bet = parseFloat(document.getElementById('montant-mise').value);
        let currentGain = bet * calcMultiplierVisuel();
        
        if (typeMonnaieActive === 'GoldCoins') {
            document.getElementById('cashout-btn').innerHTML = `ENCAISSER (${currentGain.toFixed(2)} GC)`;
        } else {
            let profit = currentGain - bet;
            document.getElementById('cashout-btn').innerHTML = `ENCAISSER (+${profit.toFixed(2)} GC)`;
        }

        if (revealedCount === GRID_SIZE - minesCount) {
            cashout(); 
        }
    }
}

// =========================================
// 3. ENCAISSER (Totalement sécurisé)
// =========================================
async function cashout() {
    if (!isMinesPlaying || !currentPartieId) return;

    const { data, error } = await client.rpc('encaisser_mines', {
        p_id: currentPartieId
    });

    if (error || data.status === 'erreur') return;

    let gainFinal = data.gain;
    let profit = data.plus_value;
    
    endMinesGame(null, data.mines);
    syncBalance(); 

    let montantAAfficher = typeMonnaieActive === 'GoldCoins' ? gainFinal : profit;
    
    if (montantAAfficher > 0) {
        showWinModal(montantAAfficher, 'GC');
    } else {
        showToast("Mise récupérée !", "info");
    }
}

function endMinesGame(msg, minesArray) {
    isMinesPlaying = false;
    window.isGameActive = false;
    currentPartieId = null;
    document.getElementById('montant-mise').disabled = false;
    document.getElementById('play-btn').style.display = 'block';
    document.getElementById('cashout-btn').style.display = 'none';
    
    if (minesArray) {
        minesArray.forEach(m => {
            let c = document.getElementById(`cell-${m}`);
            if (!c.classList.contains('revealed-mine')) {
                c.classList.add('hidden-mine');
                c.innerHTML = '💣';
            }
        });
    }
    
    if (msg) {
        showToast(msg, "error");
    }

    chargerEtAfficherHistorique('historique-mines-container', 'Mines');
}

// =========================================
// 4. GESTION DE LA POP-UP DE VICTOIRE
// =========================================
function showWinModal(amount, currency) {
    const modal = document.getElementById('win-modal');
    const winAmountDiv = document.getElementById('win-amount');
    const winBox = modal.querySelector('.win-box');
    
    winAmountDiv.innerHTML = `+${amount.toFixed(2)} <span style="color: #10b981; font-weight: 700;">${currency}</span>`;
    
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.style.opacity = '1';
        winBox.style.transform = 'translateY(0) scale(1)';
    }, 10);

    if (typeof confetti === 'function') {
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, zIndex: 100000 });
        setTimeout(() => confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0, y: 0.9 }, zIndex: 100000 }), 100);
        setTimeout(() => confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1, y: 0.9 }, zIndex: 100000 }), 200);
    }
}

function closeWinModal() {
    const modal = document.getElementById('win-modal');
    const winBox = modal.querySelector('.win-box');
    
    modal.style.opacity = '0';
    winBox.style.transform = 'translateY(30px) scale(0.9)';
    
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

setTimeout(() => {
    chargerEtAfficherHistorique('historique-mines-container', 'Mines');
}, 500);