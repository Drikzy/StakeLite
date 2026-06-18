// La Banque Commune
let balance = 10000.00;

function updateBalance(amount) {
    balance += amount;
    document.getElementById('global-balance').innerText = balance.toFixed(2);
}

// Système d'onglets pour naviguer entre les jeux
function switchTab(game, btnElement) {
    // Retire la classe 'active' de tous les boutons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    // Ajoute la classe 'active' au bouton cliqué
    btnElement.classList.add('active');

    // Cache tous les jeux
    document.getElementById('mines-section').classList.remove('active');
    document.getElementById('blackjack-section').classList.remove('active');
    
    // Affiche le jeu sélectionné
    document.getElementById(`${game}-section`).classList.add('active');
}

// Utilitaire global pour simuler des pauses (utilisé surtout dans le Blackjack)
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}