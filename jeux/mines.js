const GRID_SIZE = 25;
let minesCount = 1; // 1 par défaut
let minesLocations = [];
let isMinesPlaying = false;
let revealedCount = 0;

// 1. CORRECTION ICI : L'ID est 'grid' tout court
const gridContainer = document.getElementById('grid'); 
for (let i = 0; i < GRID_SIZE; i++) {
    let cell = document.createElement('div');
    cell.className = 'cell';
    cell.id = `cell-${i}`;
    cell.onclick = () => handleCellClick(i);
    gridContainer.appendChild(cell);
}

// 2. CORRECTION ICI : Synchronisé avec le HTML (setMines)
function setMines(num, btnElement) {
    if (isMinesPlaying) return;
    minesCount = num;
    
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
    return mult * 0.99; // Avantage de la maison (1%)
}

// 3. CORRECTION ICI : Bouton JOUER
async function startGame() {
    if (isMinesPlaying) return;

    let bet = parseFloat(document.getElementById('bet-amount').value);
    if (isNaN(bet) || bet <= 0 || bet > balance) return alert("Mise invalide ou solde insuffisant");
    
    updateBalance(-bet);
    document.getElementById('bet-amount').disabled = true;

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
    
    // Gérer l'affichage des boutons
    document.getElementById('play-btn').style.display = 'none';
    let cashoutBtn = document.getElementById('cashout-btn');
    cashoutBtn.style.display = 'block';
    cashoutBtn.innerHTML = `ENCAISSER (${bet.toFixed(2)} GC)`;
}

// 4. CORRECTION ICI : Bouton ENCAISSER
function cashout() {
    if (!isMinesPlaying) return;
    let bet = parseFloat(document.getElementById('bet-amount').value);
    let profit = bet * calcMultiplier();
    updateBalance(profit);
    endMinesGame(`Gagné ! ${profit.toFixed(2)} GC`);
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
        
        let bet = parseFloat(document.getElementById('bet-amount').value);
        let currentGain = bet * calcMultiplier();
        document.getElementById('cashout-btn').innerHTML = `ENCAISSER (${currentGain.toFixed(2)} GC)`;
        
        // Auto-cashout si le joueur a trouvé tous les diamants
        if (revealedCount === GRID_SIZE - minesCount) {
            cashout();
        }
    }
}

function endMinesGame(msg) {
    isMinesPlaying = false;
    document.getElementById('bet-amount').disabled = false;
    
    // Remettre les boutons à leur état d'origine
    document.getElementById('play-btn').style.display = 'block';
    document.getElementById('cashout-btn').style.display = 'none';
    
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