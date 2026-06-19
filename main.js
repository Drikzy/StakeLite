// =========================================
// 1. CONFIGURATION DE SUPABASE
// =========================================
const supabaseUrl = 'https://hiusxytfgberekcwwszr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpdXN4eXRmZ2JlcmVrY3d3c3pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NjUyMzksImV4cCI6MjA5NzM0MTIzOX0.MP9Us-b5OFwzz-2mxc3nfExnX1_107Dejd1Tj3CfciQ';
const client = window.supabase.createClient(supabaseUrl, supabaseKey);

// =========================================
// 2. GESTION DU JOUEUR & DE LA BANQUE
// =========================================
let balance = 0;
let monPseudo = localStorage.getItem("stakelite_pseudo");

console.log("=== DÉMARRAGE DU SITE ===");
console.log("Pseudo trouvé dans le stockage local :", monPseudo);

// Vérification au lancement
if (!monPseudo) {
    console.log("Aucun pseudo en mémoire. Affichage de la pop-up.");
    document.getElementById('login-overlay').classList.add('active');
} else {
    console.log("Pseudo détecté. Initialisation du joueur...");
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
    console.log("Pseudo enregistré dans le stockage local :", monPseudo);
    
    document.getElementById('login-overlay').classList.remove('active');
    initPlayer();
}

// Chargement des données depuis Supabase
async function initPlayer() {
    console.log("Recherche du joueur dans Supabase :", monPseudo);
    
    // On utilise une recherche classique sans .single() pour éviter le plantage automatique
    let { data, error: selectError } = await client
        .from('Joueurs')
        .select('solde')
        .eq('pseudo', monPseudo);

    if (selectError) {
        console.error("❌ Erreur lors de la RECHERCHE du joueur :", selectError.message, selectError);
        alert("Erreur de connexion à la base de données (voir console F12)");
        return;
    }

    // Si le joueur existe déjà
    if (data && data.length > 0) {
        balance = data[0].solde;
        console.log("✅ Joueur trouvé ! Solde chargé depuis Supabase :", balance);
    } 
    // Si le joueur n'existe pas encore
    else {
        balance = 10000;
        console.log("Joueur inconnu dans Supabase. Création de la ligne en cours...");
        
        let { error: insertError } = await client
            .from('Joueurs')
            .insert([{ pseudo: monPseudo, solde: balance }]);

        if (insertError) {
            console.error("❌ Erreur critique lors de l'INSERTION du joueur :", insertError.message, insertError);
            alert("Impossible de créer ton profil dans Supabase : " + insertError.message);
            return;
        } else {
            console.log("🎉 Nouvelle ligne créée avec succès dans Supabase !");
        }
    }
    
    document.getElementById('global-balance').innerText = balance.toFixed(2);
}

// Mise à jour de l'argent
async function updateBalance(amount) {
    balance += amount;
    document.getElementById('global-balance').innerText = balance.toFixed(2);

    const { error } = await client
        .from('Joueurs')
        .update({ solde: balance })
        .eq('pseudo', monPseudo);
        
    if (error) {
        console.error("❌ Erreur lors de la SAUVEGARDE du solde :", error.message);
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