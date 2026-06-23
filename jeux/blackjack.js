let isBjPlaying = false;
let currentBjId = null;

function modifyBet(multiplier) {
    if(isBjPlaying) return;
    let input = document.getElementById('bj-bet');
    let val = parseFloat(input.value);
    input.value = Math.floor(val * multiplier);
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

function calculateScore(hand) {
    let score = 0;
    let aces = 0;
    hand.forEach(card => {
        let val = card.value;
        if (val === 'A') { 
            aces += 1; 
            score += 11; 
        } else if (['J', 'Q', 'K'].includes(val)) { 
            score += 10; 
        } else { 
            score += parseInt(val); 
        }
    });
    while (score > 21 && aces > 0) { 
        score -= 10; 
        aces -= 1; 
    }
    return score;
}

function renderCard(card, isHidden = false) {
    let div = document.createElement('div');
    div.className = 'card';
    if (isHidden) {
        div.classList.add('hidden');
    } else {
        if (card.suit === '♥' || card.suit === '♦') div.classList.add('red');
        div.innerHTML = `${card.value} <span class="suit">${card.suit}</span>`;
    }
    return div;
}

function parseCards(dataArray) {
    if (!dataArray) return [];
    if (typeof dataArray === 'string') {
        try { return JSON.parse(dataArray); } catch(e) { return []; }
    }
    return Array.isArray(dataArray) ? dataArray : [];
}

function updateHandsUI(pHand, dHand, hideDealerCard = true) {
    pHand = parseCards(pHand);
    dHand = parseCards(dHand);

    let pContainer = document.getElementById('player-hand');
    let dContainer = document.getElementById('dealer-hand');
    pContainer.innerHTML = ''; dContainer.innerHTML = '';

    pHand.forEach(c => pContainer.appendChild(renderCard(c)));
    dHand.forEach((c, i) => dContainer.appendChild(renderCard(c, hideDealerCard && i === 1)));
}

function setBjMessage(msg, color = 'var(--text-sec)') {
    let msgEl = document.getElementById('bj-message');
    msgEl.innerText = msg;
    msgEl.style.color = color;
}

function toggleActionBtns(disabled) {
    document.querySelectorAll('.action-btn').forEach(btn => btn.disabled = disabled);
}

// =========================================
// 1. DISTRIBUER
// =========================================
async function startBlackjack() {
    let bet = parseFloat(document.getElementById('bj-bet').value);
    if (isNaN(bet) || bet <= 0 || bet > balance) return alert("Mise invalide ou solde insuffisant");

    isBjPlaying = true;
    document.getElementById('bj-bet-controls').style.display = 'none';
    document.getElementById('bj-action-controls').style.display = 'flex';
    toggleActionBtns(true);
    setBjMessage("Distribution...");

    const { data, error } = await client.rpc('bj_demarrer', { p_pseudo: monPseudo, p_mise: bet });
    
    if (error) {
        alert("Erreur de transaction !");
        isBjPlaying = false;
        return;
    }

    currentBjId = data.id;
    
    let pHandSafe = parseCards(data.main_joueur);
    let dHandSafe = parseCards(data.main_croupier);
    
    updateHandsUI(pHandSafe, dHandSafe, true);
    
    // 🧮 AFFICHAGE DES SCORES AU LANCEMENT
    document.getElementById('player-score').innerText = `Toi : ${calculateScore(pHandSafe)}`;
    document.getElementById('dealer-score').innerText = `Croupier : ${calculateScore([dHandSafe[0]])}`;
    
    syncBalance(); 
    toggleActionBtns(false);
    setBjMessage("Tirer ou Rester ?");
}

// =========================================
// 2. TIRER
// =========================================
async function hit() {
    if (!currentBjId) return;
    toggleActionBtns(true);

    const { data, error } = await client.rpc('bj_hit', { p_id: currentBjId });
    if (error || data.status === 'erreur') { toggleActionBtns(false); return; }

    let pHandSafe = parseCards(data.main_joueur);
    let pContainer = document.getElementById('player-hand');
    pContainer.innerHTML = '';
    pHandSafe.forEach(c => pContainer.appendChild(renderCard(c)));
    
    // 🧮 MISE À JOUR DU SCORE DU JOUEUR
    document.getElementById('player-score').innerText = `Toi : ${calculateScore(pHandSafe)}`;

    if (data.status === 'perdu') {
        endBlackjack("Bust ! Perdu.", 0, 'var(--red)', null, pHandSafe);
    } else {
        toggleActionBtns(false);
    }
}

// =========================================
// 3. RESTER
// =========================================
async function stand() {
    if (!currentBjId) return;
    toggleActionBtns(true);
    setBjMessage("Le croupier joue...");

    const { data, error } = await client.rpc('bj_stand', { p_id: currentBjId });
    if (error || data.status === 'erreur') { toggleActionBtns(false); return; }

    let msg = "";
    let color = "";
    if (data.status === 'gagne') { msg = `Gagné ! +${data.gain.toFixed(2)} GC`; color = 'var(--accent)'; }
    else if (data.status === 'perdu') { msg = "Perdu..."; color = 'var(--red)'; }
    else { msg = "Égalité (Push)"; color = 'var(--text-sec)'; }

    endBlackjack(msg, data.gain, color, data.main_croupier);
}

// =========================================
// FIN DE PARTIE 
// =========================================
function endBlackjack(msg, winAmount, color, dHandReveal = null, pHand = null) {
    setBjMessage(msg, color);
    
    if (dHandReveal) {
        dHandReveal = parseCards(dHandReveal);
        let dContainer = document.getElementById('dealer-hand');
        dContainer.innerHTML = '';
        dHandReveal.forEach(c => dContainer.appendChild(renderCard(c, false)));
        
        document.getElementById('dealer-score').innerText = `Croupier : ${calculateScore(dHandReveal)}`;
    }
    
    isBjPlaying = false;
    currentBjId = null;
    syncBalance();
    chargerEtAfficherHistorique('historique-blackjack-container', 'Blackjack');

    setTimeout(() => {
        document.getElementById('bj-action-controls').style.display = 'none';
        document.getElementById('bj-bet-controls').style.display = 'block';
    }, 2000);
}

chargerEtAfficherHistorique('historique-blackjack-container', 'Blackjack');