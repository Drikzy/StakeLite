const supabaseUrl = 'https://hiusxytfgberekcwwszr.supabase.co';
const supabaseKey = 'sb_publishable_oTAvDkJ0NLEm5ccJ-1LrYA_ab_Eg4_q';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

let balance = 0;
let monPseudo = localStorage.getItem("stakelite_pseudo");
if (!monPseudo) {
    document.getElementById('login-overlay').classList.add('active');
} else {
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
    document.getElementById('login-overlay').classList.remove('active');
    initPlayer();
}

async function initPlayer() {
    console.log("Connexion pour le joueur :", monPseudo);
    
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

async function updateBalance(amount) {
    balance += amount;
    document.getElementById('global-balance').innerText = balance.toFixed(2);

    const { error } = await supabase
        .from('joueurs')
        .update({ solde: balance })
        .eq('pseudo', monPseudo);
}