const supabaseUrl = 'https://hiusxytfgberekcwwszr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpdXN4eXRmZ2JlcmVrY3d3c3pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NjUyMzksImV4cCI6MjA5NzM0MTIzOX0.MP9Us-b5OFwzz-2mxc3nfExnX1_107Dejd1Tj3CfciQ';
const client = window.supabase.createClient(supabaseUrl, supabaseKey);
let balance = 0;
let monPseudo = "";
let isLoginMode = true; // true = page de connexion, false = page d'inscription

async function checkSession() {
    const { data: { session } } = await client.auth.getSession();
    
    if (session) {
        console.log("Session trouvée ! Connecté avec :", session.user.email);
        monPseudo = session.user.user_metadata.pseudo;
        
        document.getElementById('login-overlay').classList.remove('active');
        initPlayer();
    } else {
        console.log("Aucune session. Affichage de l'écran d'accueil.");
        document.getElementById('login-overlay').classList.add('active');
    }
}

function toggleAuthMode(event) {
    event.preventDefault();
    isLoginMode = !isLoginMode;

    const title = document.getElementById('auth-title');
    const btn = document.getElementById('auth-main-btn');
    const switchText = document.getElementById('auth-switch-text');
    const switchLink = document.getElementById('auth-switch-link');
    const pseudoGroup = document.getElementById('pseudo-group');

    if (isLoginMode) {
        title.innerText = "Connexion à StakeLite";
        btn.innerText = "SE CONNECTER";
        switchText.innerText = "Pas encore de compte ?";
        switchLink.innerText = "S'inscrire";
        pseudoGroup.style.display = "none";
    } else {
        title.innerText = "Créer un compte";
        btn.innerText = "S'INSCRIRE";
        switchText.innerText = "Déjà un compte ?";
        switchLink.innerText = "Se connecter";
        pseudoGroup.style.display = "block";
    }
}

async function handleAuth() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value.trim();
    
    if (!email || !password) {
        alert("Remplis bien ton email et ton mot de passe !");
        return;
    }

    if (!isLoginMode) {
        const pseudo = document.getElementById('auth-pseudo').value.trim();
        if (!pseudo) {
            alert("Tu dois choisir un pseudo !");
            return;
        }

        console.log("Création du compte");
        const { data, error } = await client.auth.signUp({
            email: email,
            password: password,
            options: {
                data: { pseudo: pseudo }
            }
        });

        if (error) {
            alert("Erreur d'inscription : " + error.message);
            return;
        }
        monPseudo = pseudo;
        await client.from('Joueurs').insert([{ pseudo: monPseudo }]);
        
        console.log("Compte créé avec succès !");
        
    } else {
        console.log("Vérification des identifiants");
        const { data, error } = await client.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            alert("Identifiants incorrects !");
            return;
        }
        
        monPseudo = data.user.user_metadata.pseudo;
        console.log("Connexion réussie !");
    }
    document.getElementById('login-overlay').classList.remove('active');
    initPlayer();
}

async function logout() {
    await client.auth.signOut();
    location.reload();
}

async function initPlayer() {
    let { data, error } = await client
        .from('Joueurs')
        .select('solde')
        .eq('pseudo', monPseudo);

    if (data && data.length > 0) {
        balance = data[0].solde;
        document.getElementById('global-balance').innerText = balance.toFixed(2);
    }
    document.getElementById('user-avatar').innerText = monPseudo.charAt(0);
    document.getElementById('dropdown-pseudo').innerText = monPseudo;
}

async function updateBalance(amount) {
    const { data, error } = await client.rpc('update_balance_secure', {
        p_pseudo: monPseudo,
        p_amount: amount
    });
        
    if (error) {
        console.error("❌ Erreur de transaction :", error.message);
        return;
    }

    balance = data;
    document.getElementById('global-balance').innerText = balance.toFixed(2);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

checkSession();

// Affiche ou cache le menu déroulant
function toggleUserMenu() {
    document.getElementById('user-dropdown').classList.toggle('active');
}

async function logout() {
    await client.auth.signOut();
    location.reload();
}