const supabaseUrl = 'https://hiusxytfgberekcwwszr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpdXN4eXRmZ2JlcmVrY3d3c3pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NjUyMzksImV4cCI6MjA5NzM0MTIzOX0.MP9Us-b5OFwzz-2mxc3nfExnX1_107Dejd1Tj3CfciQ';
const client = window.supabase.createClient(supabaseUrl, supabaseKey);

let monPseudo = "";
let isLoginMode = true;

// =========================================
// INITIALISATION & SESSION
// =========================================

async function checkSession() {
    const { data: { session } } = await client.auth.getSession();
    
    const guestMenu = document.getElementById('guest-menu');
    const loggedInMenu = document.getElementById('logged-in-menu');

    if (session) {
        console.log("Session trouvée ! Connecté avec :", session.user.email);
        monPseudo = session.user.user_metadata.pseudo;
        if (guestMenu) guestMenu.style.display = 'none';
        if (loggedInMenu) loggedInMenu.style.display = 'flex';
        
        initPlayer();
    } else {
        console.log("Aucune session. Mode visiteur.");
        if (guestMenu) guestMenu.style.display = 'flex';
        if (loggedInMenu) loggedInMenu.style.display = 'none';
    }
}

async function initPlayer() {
    let { data, error } = await client
        .from('Joueurs')
        .select('"GoldCoins", "FreeCoins"') 
        .eq('pseudo', monPseudo);

    if (data && data.length > 0) {
        let gcBalance = data[0].GoldCoins || 0;
        let fcBalance = data[0].FreeCoins || 0;
        const gcElement = document.getElementById('global-balance-gc');
        const fcElement = document.getElementById('global-balance-fc');
        
        if (gcElement) gcElement.innerText = gcBalance.toFixed(2);
        if (fcElement) fcElement.innerText = fcBalance.toFixed(2);
    }
    
    const avatarElement = document.getElementById('user-avatar');
    const pseudoElement = document.getElementById('dropdown-pseudo');

    if (avatarElement) avatarElement.innerText = monPseudo.charAt(0);
    if (pseudoElement) pseudoElement.innerText = monPseudo;
}

// =========================================
// AUTHENTIFICATION (Login / Inscription)
// =========================================

function updateAuthUI() {
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

function openAuthModal(isLogin) {
    const loginOverlay = document.getElementById('login-overlay');
    if (loginOverlay) loginOverlay.classList.add('active');
    
    isLoginMode = isLogin;
    updateAuthUI();
}

function toggleAuthMode(event) {
    event.preventDefault();
    isLoginMode = !isLoginMode;
    updateAuthUI();
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
            options: { data: { pseudo: pseudo } }
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
    
    const loginOverlay = document.getElementById('login-overlay');
    if (loginOverlay) loginOverlay.classList.remove('active');
    
    checkSession();
}

async function logout() {
    await client.auth.signOut();
    location.reload();
}

function toggleUserMenu() {
    document.getElementById('user-dropdown').classList.toggle('active');
}

// =========================================
// HISTORIQUE GLOBAL
// =========================================

async function chargerEtAfficherHistorique(containerId, gameFilter = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let query = client
        .from('Historique_Parties')
        .select('*')
        .eq('joueur_pseudo', monPseudo)
        .order('date_partie', { ascending: false });

    if (gameFilter) {
        query = query.eq('nom_jeu', gameFilter).limit(10);
    } else {
        query = query.limit(30);
    }
    
    const { data, error } = await query;

    if (error) {
        console.error("Erreur de chargement de l'historique :", error);
        container.innerHTML = "<p>Impossible de charger l'historique.</p>";
        return;
    }

    if (data.length === 0) {
        container.innerHTML = "<p>Aucune partie jouée pour le moment.</p>";
        return;
    }
    
    let html = `
        <table class="history-table">
            <thead>
                <tr>
                    ${!gameFilter ? '<th>Jeu</th>' : ''} 
                    <th>Résultat</th>
                    <th>Mise</th>
                    <th>Profit / Perte</th>
                    <th>Monnaie</th>
                    <th>Date</th>
                </tr>
            </thead>
            <tbody>
    `;

    data.forEach(partie => {
        const dateObj = new Date(partie.date_partie);
        const dateFormatee = dateObj.toLocaleDateString('fr-FR') + ' ' + dateObj.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'});
        const profitNet = partie.gain - partie.mise;
        
        let resultatTexte = "";
        let resultatClass = "";
        let profitAffiche = "";

        if (profitNet > 0) {
            resultatTexte = "Victoire";
            resultatClass = "text-win";
            profitAffiche = "+" + profitNet.toFixed(2);
        } else if (profitNet < 0) {
            resultatTexte = "Défaite";
            resultatClass = "text-loss";
            profitAffiche = profitNet.toFixed(2);
        } else {
            resultatTexte = "Égalité";
            resultatClass = "text-tie";
            profitAffiche = "0.00";
        }

        const monnaieColor = partie.type_monnaie === 'GoldCoins' ? '#ffcc00' : '#00ccff';

        html += `
            <tr>
                ${!gameFilter ? `<td>${partie.nom_jeu}</td>` : ''}
                <td class="${resultatClass}" style="font-weight: bold;">${resultatTexte}</td>
                <td>${partie.mise.toFixed(2)}</td>
                <td class="${resultatClass}">${profitAffiche}</td>
                <td style="color: ${monnaieColor}">${partie.type_monnaie === 'GoldCoins' ? 'GC' : 'FC'}</td>
                <td class="history-date">${dateFormatee}</td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

checkSession();