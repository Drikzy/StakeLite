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

// Fonction utilitaire pour rafraîchir l'affichage depuis la vraie base
async function syncBalance() {
    const { data } = await client.from('Joueurs').select('solde').eq('pseudo', monPseudo).single();
    if (data) {
        balance = data.solde;
        document.getElementById('global-balance').innerText = balance.toFixed(2);
    }
}

// Calcul visuel du multiplicateur (juste pour le bouton)
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
    let bet = parseFloat(document.getElementById('bet-amount').value);
    if (isNaN(bet) || bet <= 0 || bet > balance) return alert("Mise invalide ou solde insuffisant");

    // Nettoyage de la grille
    document.querySelectorAll('.cell').forEach(cell => {
        cell.className = 'cell';
        cell.innerHTML = '';
    });

    document.getElementById('bet-amount').disabled = true;
    document.getElementById('play-btn').style.display = 'none';
    document.getElementById('cashout-btn').style.display = 'block';
    document.getElementById('cashout-btn').innerHTML = `ENCAISSER (${bet.toFixed(2)} GC)`;

    // ON APPELLE LE SERVEUR
    const { data, error } = await client.rpc('demarrer_mines', {
        p_pseudo: monPseudo,
        p_mise: bet,
        p_nb_mines: minesCount
    });

    if (error) {
        alert("Erreur de transaction !");
        return;
    }

    currentPartieId = data.id; // On stocke l'ID sécurisé
    isMinesPlaying = true;
    revealedCount = 0;
    
    syncBalance(); // Met à jour le compteur en haut (mise déduite)
}

// =========================================
// 2. CLIQUER SUR UNE CASE
// =========================================
async function handleCellClick(index) {
    if (!isMinesPlaying || !currentPartieId) return;
    let cell = document.getElementById(`cell-${index}`);
    if (cell.classList.contains('revealed-diamond')) return; 

    // ON DEMANDE AU SERVEUR SI LA CASE EST SAFE
    const { data, error } = await client.rpc('cliquer_mine', {
        p_id: currentPartieId,
        p_case: index
    });

    if (error || data.status === 'erreur') return;

    if (data.status === 'boum') {
        // PERDU
        cell.classList.add('revealed-mine');
        cell.innerHTML = '💣';
        endMinesGame("Perdu !", data.mines);
    } else if (data.status === 'diamant') {
        // GAGNÉ
        cell.classList.add('revealed-diamond');
        cell.innerHTML = '💎';
        revealedCount++;
        
        let bet = parseFloat(document.getElementById('bet-amount').value);
        let currentGain = bet * calcMultiplierVisuel();
        document.getElementById('cashout-btn').innerHTML = `ENCAISSER (${currentGain.toFixed(2)} GC)`;

        if (revealedCount === GRID_SIZE - minesCount) {
            cashout(); // Auto-cashout
        }
    }
}

// =========================================
// 3. ENCAISSER
// =========================================
async function cashout() {
    if (!isMinesPlaying || !currentPartieId) return;

    // ON DEMANDE AU SERVEUR DE CALCULER ET VERSER LES GAINS
    const { data, error } = await client.rpc('encaisser_mines', {
        p_id: currentPartieId
    });

    if (error || data.status === 'erreur') return;

    endMinesGame(`Gagné ! ${data.gain.toFixed(2)} GC`, data.mines);
    syncBalance(); // Met à jour le compteur en haut (gains ajoutés)
}

function endMinesGame(msg, minesArray) {
    isMinesPlaying = false;
    currentPartieId = null;
    document.getElementById('bet-amount').disabled = false;
    document.getElementById('play-btn').style.display = 'block';
    document.getElementById('cashout-btn').style.display = 'none';
    
    // Le serveur vient de nous donner l'emplacement des bombes, on les affiche
    if (minesArray) {
        minesArray.forEach(m => {
            let c = document.getElementById(`cell-${m}`);
            if (!c.classList.contains('revealed-mine')) {
                c.classList.add('hidden-mine');
                c.innerHTML = '💣';
            }
        });
    }
    setTimeout(() => alert(msg), 100);
}