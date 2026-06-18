const supabaseUrl = 'https://hiusxytfgberekcwwszr.supabase.co';
const supabaseKey = 'sb_publishable_oTAvDkJ0NLEm5ccJ-1LrYA_ab_Eg4_q';

const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
let balance = 0;
const monPseudo = "Flo";

async function initPlayer() {
    console.log("Connexion à la base de données Supabase...");
    let { data, error } = await supabase
        .from('joueurs')
        .select('solde')
        .eq('pseudo', monPseudo)
        .single();

    if (data) {
        balance = data.solde;
        console.log("Joueur trouvé ! Solde :", balance);
    } else {
        balance = 10000;
        await supabase
            .from('joueurs')
            .insert([{ pseudo: monPseudo, solde: balance }]);
        console.log("Nouveau joueur créé dans la base !");
    }
    document.getElementById('global-balance').innerText = balance.toFixed(2);
}

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
initPlayer();

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