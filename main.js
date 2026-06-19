const supabaseUrl = 'https://hiusxytfgberekcwwszr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpdXN4eXRmZ2JlcmVrY3d3c3pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NjUyMzksImV4cCI6MjA5NzM0MTIzOX0.MP9Us-b5OFwzz-2mxc3nfExnX1_107Dejd1Tj3CfciQ';
const client = window.supabase.createClient(supabaseUrl, supabaseKey);

let balance = 0;
let monPseudo = localStorage.getItem("stakelite_pseudo");
console.log("Pseudo trouvé dans le stockage local :", monPseudo);

if (!monPseudo) {
    console.log("Aucun pseudo en mémoire. Affichage de la pop-up.");
    document.getElementById('login-overlay').classList.add('active');
} else {
    console.log("Pseudo détecté. Initialisation du joueur...");
    initPlayer();
}

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
    let { data, error: selectError } = await client
        .from('Joueurs')
        .select('solde')
        .eq('pseudo', monPseudo);

    if (selectError) {
        console.error("Erreur lors de la RECHERCHE du joueur :", selectError.message, selectError);
        alert("Erreur de connexion à la base de données");
        return;
    }

    // Si le joueur existe déjà
    if (data && data.length > 0) {
        balance = data[0].solde;
        console.log("Joueur trouvé ! Solde chargé depuis Supabase :", balance);
    }
    // Si le joueur n'existe pas encore
    else {
        console.log("Joueur inconnu.");
        let { data: newPlayer, error: insertError } = await client
            .from('Joueurs')
            .insert([{ pseudo: monPseudo }])
            .select();

        if (insertError) {
            console.error("❌ Erreur d'insertion :", insertError.message);
            alert("Erreur de création du profil");
            return;
        }
        if (newPlayer && newPlayer.length > 0) {
            balance = newPlayer[0].solde;
            console.log("Compte créé !");
        }
    }
    
    document.getElementById('global-balance').innerText = balance.toFixed(2);
}

async function updateBalance(amount) {
    const { data, error } = await client.rpc('update_balance_secure', {
        p_pseudo: monPseudo,
        p_amount: amount
    });
        
    if (error) {
        console.error("Erreur de transaction :", error.message);
        return;
    }
    balance = data;
    document.getElementById('global-balance').innerText = balance.toFixed(2);
}

// Navigation
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