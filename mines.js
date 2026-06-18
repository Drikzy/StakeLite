const GRID_SIZE = 25;
let minesCount = 3;
let minesLocations = [];
let isMinesPlaying = false;
let revealedCount = 0;

// Création de la grille au chargement de la page
const gridContainer = document.getElementById('mines-grid');
for (let i = 0; i < GRID_SIZE; i++) {
    let cell = document.createElement('div');
    cell.className = 'cell';
    cell.id = `cell-${i}`;
    cell.onclick = () => handleCellClick(i);
    gridContainer.appendChild(cell);
}

function selectMines(num, btnElement) {
    if (isMinesPlaying) return;
    minesCount = num;
    document.getElementById('mines-count-display').innerText = num;
    
    document.querySelectorAll('.m-btn').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');
}

function calcMultiplier() {
    if (revealedCount === 0) return 1;
    let mult = 1;
    let safeCells = GRID_SIZE - minesCount;
    for (let i = 0; i < revealedCount; i++) {
        mult *= (GRID_SIZE - i) / (safeCells - i);
    }
    return mult * 0.99;
}

function handleMinesAction() {
    if (!isMinesPlaying) {
        // DÉMARRER UNE PARTIE
        let bet = parseFloat(document.getElementById('mines-bet').value);
        if (isNaN(bet) || bet <= 0 || bet > balance) return alert("Mise invalide ou solde insuffisant");
        
        updateBalance(-bet);
        document.getElementById('mines-bet').disabled = true;

        // Reset visuel de la grille
        document.querySelectorAll('.cell').forEach(cell => {
            cell.className = 'cell';
            cell.innerHTML = '';
        });

        // Placement aléatoire des mines
        minesLocations = [];
        while (minesLocations.length < minesCount) {
            let r = Math.floor(Math.random() * GRID_SIZE);
            if (!minesLocations.includes(r)) minesLocations.push(r);
        }

        revealedCount = 0;
        isMinesPlaying = true;
        document.getElementById('mines-action-btn').innerHTML = `CASHOUT (Bet: ${bet})`;
    } else {
        // ENCAISSER (Cashout)
        let bet = parseFloat(document.getElementById('mines-bet').value);
        let profit = bet * calcMultiplier();
        updateBalance(profit);
        endMinesGame(`Gagné ! ${profit.toFixed(2)} GC`);
    }
}

function handleCellClick(index) {
    if (!isMinesPlaying) return;
    
    let cell = document.getElementById(`cell-${index}`);
    if (cell.classList.contains('revealed-diamond')) return; 

    if (minesLocations.includes(index)) {
        // BOUM : C'est une mine
        cell.classList.add('revealed-mine');
        cell.innerHTML = '💣';
        endMinesGame("Perdu !");
    } else {
        // SAFE : C'est un diamant
        cell.classList.add('revealed-diamond');
        cell.innerHTML = '💎';
        revealedCount++;
        
        let bet = parseFloat(document.getElementById('mines-bet').value);
        let currentGain = bet * calcMultiplier();
        document.getElementById('mines-action-btn').innerHTML = `CASHOUT (${currentGain.toFixed(2)} GC)`;
    }
}

function endMinesGame(msg) {
    isMinesPlaying = false;
    document.getElementById('mines-bet').disabled = false;
    document.getElementById('mines-action-btn').innerHTML = 'JOUER';
    
    // Révèle les mines cachées en gris pour prouver l'honnêteté
    minesLocations.forEach(m => {
        let c = document.getElementById(`cell-${m}`);
        if (!c.classList.contains('revealed-mine')) {
            c.classList.add('hidden-mine');
            c.innerHTML = '💣';
        }
    });
    
    setTimeout(() => alert(msg), 100);
}