const SUITS = ['♠', '♣', '♥', '♦'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

let deck = [];
let pHand = [];
let dHand = [];
let isBjPlaying = false;

// Boutons rapides de mise (1/2 et x2)
function modifyBet(multiplier) {
    if(isBjPlaying) return;
    let input = document.getElementById('bj-bet');
    let val = parseFloat(input.value);
    input.value = Math.floor(val * multiplier);
}

function getDeck() {
    let d = [];
    for (let s of SUITS) {
        for (let v of VALUES) { d.push({ value: v, suit: s }); }
    }
    return d.sort(() => Math.random() - 0.5);
}

function getScore(hand) {
    let score = 0, aces = 0;
    for (let c of hand) {
        if (c.value === 'A') { aces++; score += 11; }
        else if (['J', 'Q', 'K'].includes(c.value)) score += 10;
        else score += parseInt(c.value);
    }
    while (score > 21 && aces > 0) { score -= 10; aces--; }
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

function updateBjUI(hideDealerCard = true) {
    let pContainer = document.getElementById('player-hand');
    let dContainer = document.getElementById('dealer-hand');
    
    pContainer.innerHTML = ''; 
    dContainer.innerHTML = '';

    pHand.forEach(c => pContainer.appendChild(renderCard(c)));
    dHand.forEach((c, i) => dContainer.appendChild(renderCard(c, hideDealerCard && i === 1)));

    // Score Joueur
    document.getElementById('player-score').innerText = `Toi : ${getScore(pHand)}`;

    // Score Croupier
    if (hideDealerCard) {
        document.getElementById('dealer-score').innerText = 'Croupier : ?';
    } else {
        document.getElementById('dealer-score').innerText = `Croupier : ${getScore(dHand)}`;
    }
}

function setBjMessage(msg, color = 'var(--text-sec)') {
    let msgEl = document.getElementById('bj-message');
    msgEl.innerText = msg;
    msgEl.style.color = color;
}

// Fonction pour bloquer/débloquer les boutons d'action
function toggleActionBtns(disabled) {
    document.querySelectorAll('.action-btn').forEach(btn => btn.disabled = disabled);
}

async function startBlackjack() {
    let bet = parseFloat(document.getElementById('bj-bet').value);
    if (isNaN(bet) || bet <= 0 || bet > balance) return alert("Mise invalide ou solde insuffisant");
    
    updateBalance(-bet);
    isBjPlaying = true;
    
    // Changement d'interface : on utilise les NOUVEAUX ID
    document.getElementById('bj-bet-controls').style.display = 'none';
    document.getElementById('bj-action-controls').style.display = 'flex';
    toggleActionBtns(true); // On désactive pendant la distribution
    
    setBjMessage("Distribution...");

    deck = getDeck();
    pHand = []; 
    dHand = [];
    
    // Distribution fluide avec Async/Await
    pHand.push(deck.pop()); updateBjUI(); await sleep(500);
    dHand.push(deck.pop()); updateBjUI(); await sleep(500);
    pHand.push(deck.pop()); updateBjUI(); await sleep(500);
    dHand.push(deck.pop()); updateBjUI(); await sleep(500);

    toggleActionBtns(false); // On réactive les boutons
    setBjMessage("Tirer ou Rester ?");

    // Blackjack Naturel
    if (getScore(pHand) === 21) {
        endBlackjack("Blackjack !", bet * 2.5, 'var(--accent)');
    }
}

function hit() {
    pHand.push(deck.pop());
    updateBjUI();
    
    let score = getScore(pHand);
    if (score > 21) {
        setTimeout(() => endBlackjack("Bust ! Perdu.", 0, 'var(--red)'), 500);
    } else if (score === 21) {
        setTimeout(() => stand(), 500); // Auto Stand si on a 21
    }
}

async function stand() {
    toggleActionBtns(true);
    
    // On révèle la carte cachée du croupier
    updateBjUI(false); 
    
    // Le croupier tire jusqu'à avoir au moins 17
    while (getScore(dHand) < 17) {
        await sleep(1000);
        dHand.push(deck.pop());
        updateBjUI(false);
    }

    let pScore = getScore(pHand);
    let dScore = getScore(dHand);
    let bet = parseFloat(document.getElementById('bj-bet').value);

    // Résultat
    if (dScore > 21 || pScore > dScore) {
        endBlackjack("Gagné !", bet * 2, 'var(--accent)');
    } else if (pScore < dScore) {
        endBlackjack("Perdu...", 0, 'var(--red)');
    } else {
        endBlackjack("Égalité (Push)", bet, 'var(--text-sec)');
    }
}

function endBlackjack(msg, winAmount, color) {
    setBjMessage(msg, color);
    if (winAmount > 0) updateBalance(winAmount);
    
    isBjPlaying = false;
    
    // On remet l'interface de mise avec les NOUVEAUX ID
    document.getElementById('bj-action-controls').style.display = 'none';
    document.getElementById('bj-bet-controls').style.display = 'block';
    updateBjUI(false); 
}