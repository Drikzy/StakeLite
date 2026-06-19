const supabaseUrl = 'https://hiusxytfgberekcwwszr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpdXN4eXRmZ2JlcmVrY3d3c3pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NjUyMzksImV4cCI6MjA5NzM0MTIzOX0.MP9Us-b5OFwzz-2mxc3nfExnX1_107Dejd1Tj3CfciQ';
const client = window.supabase.createClient(supabaseUrl, supabaseKey);

// =========================================
// 2. GESTION DU JOUEUR & DE LA BANQUE
// =========================================
let balance = 0;
let monPseudo = localStorage.getItem("stakelite_pseudo");

// Vérification au lancement
if (!monPseudo) {
    document.getElementById('login-overlay').classList.add('active');
} else {
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
    
    // 🔴 On utilise 'client' ici
    let { data, error } = await client
        .from('joueurs')
        .select('solde')
        .eq('pseudo', monPseudo)
        .single();

    if (data) {
        balance = data.solde;
    } else {
        balance = 10000;
        await client
            .from('joueurs')
            .insert([{ pseudo: monPseudo, solde: balance }]);
    }
    
    document.getElementById('global-balance').innerText = balance.toFixed(2);
}

// Mise à jour de l'argent
async function updateBalance(amount) {
    balance += amount;
    document.getElementById('global-balance').innerText = balance.toFixed(2);

    // 🔴 Et on utilise 'client' ici aussi
    const { error } = await client
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