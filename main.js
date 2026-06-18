// =========================================
// 1. CONFIGURATION DE SUPABASE
// =========================================
const supabaseUrl = 'https://hiusxytfgberekcwwszr.supabase.co'; // ⚠️ À REMPLACER
const supabaseKey = 'sb_publishable_oTAvDkJ0NLEm5ccJ-1LrYA_ab_Eg4_q'; // ⚠️ À REMPLACER

const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// =========================================
// 2. GESTION DU JOUEUR & DE LA BANQUE
// =========================================
let balance = 0;
let monPseudo = localStorage.getItem("stakelite_pseudo");

// Vérification au lancement
if (!monPseudo) {
    // Joueur inconnu : on affiche l'écran d'accueil
    document.getElementById('login-overlay').classList.add('active');
} else {
    // Joueur connu : on charge ses données direct
    initPlayer();
}

// Bouton "ENTRER" de la pop-up
function login() {
    let input = document.getElementById('pseudo-input').value.trim();
    
    if (input === "") {
        alert("Tu dois choisir un pseudo !");
        return;
    }

    monPseudo = input;
    localStorage.setItem("stakelite_pseudo", monPseudo);
    
    document.getElementById('login-overlay').classList.remove('active');
    initPlayer();
}

// Chargement des données depuis Supabase
async function initPlayer() {
    console.log("Connexion pour :", monPseudo);
    
    let { data, error } = await supabase
        .from('joueurs')
        .select('solde')
        .eq('pseudo', monPseudo)
        .single();

    if (data) {
        balance = data.solde;
    } else {
        balance = 10000;
        await supabase
            .from('joueurs')
            .insert([{ pseudo: monPseudo, solde: balance }]);
    }
    
    document.getElementById('global-balance').innerText = balance.toFixed(2);
}

// Mise à jour de l'argent
async function updateBalance(amount) {
    balance += amount;
    document.getElementById('global-balance').innerText = balance.toFixed(2);

    const { error } = await supabase
        .from('joueurs')
        .update({ solde: balance })
        .eq('pseudo', monPseudo);
        
    if (error) {
        console.error("Erreur de sauvegarde :", error);
    }
}

// =========================================
// 3. NAVIGATION (Onglets)
// =========================================
function switchTab(game, btnElement) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');

    document.getElementById('mines-section').classList.remove('active');
    document.getElementById('blackjack-section').classList.remove('active');
    
    document.getElementById(`${game}-section`).classList.add('active');
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}