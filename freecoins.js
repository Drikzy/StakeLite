// Variable globale pour le timer du bonus
let timerInterval;

// ==========================================
// 🎁 BONUS QUOTIDIEN
// ==========================================

async function initialiserBonus() {
    const btnBonus = document.getElementById('btn-bonus');
    const timerBonus = document.getElementById('timer-bonus');
    
    // Vérification en base de données
    const { data, error } = await client
        .from('Joueurs')
        .select('dernier_bonus')
        .eq('pseudo', monPseudo)
        .single();

    if (data && data.dernier_bonus) {
        activerCompteARebours(data.dernier_bonus);
    } else {
        // Jamais réclamé
        btnBonus.style.display = 'inline-block';
        timerBonus.style.display = 'none';
    }
}

async function recolterBonus() {
    const btn = document.getElementById('btn-bonus');
    btn.disabled = true;
    btn.innerText = "Vérification...";

    const { data, error } = await client.rpc('reclamer_bonus_quotidien', {
        p_pseudo: monPseudo
    });

    if (error || (data && data.status === 'erreur')) {
        if(typeof showToast === 'function') showToast("Le bonus n'est pas encore prêt !", "error");
        btn.disabled = false;
        btn.innerText = "Réclamer +100 FC";
        return;
    }

    // Succès
    if(typeof showToast === 'function') showToast("🎁 100 FC ajoutés à ton compte !", "info");
    
    // Maj de l'affichage en haut
    const fcElement = document.getElementById('global-balance-fc');
    if (fcElement) fcElement.innerText = (parseFloat(fcElement.innerText) + 100).toFixed(2);

    activerCompteARebours(data.dernier_bonus);
}

function activerCompteARebours(dateDernierBonus) {
    const dateBonus = new Date(dateDernierBonus);
    const dateProchainBonus = new Date(dateBonus.getTime() + 24 * 60 * 60 * 1000); // + 24h

    const btnBonus = document.getElementById('btn-bonus');
    const timerBonus = document.getElementById('timer-bonus');
    const countdownSpan = document.getElementById('countdown');

    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        const maintenant = new Date().getTime();
        const distance = dateProchainBonus.getTime() - maintenant;

        if (distance <= 0) {
            clearInterval(timerInterval);
            btnBonus.style.display = 'inline-block';
            btnBonus.disabled = false;
            btnBonus.innerText = "Réclamer +100 FC";
            timerBonus.style.display = 'none';
            return;
        }

        btnBonus.style.display = 'none';
        timerBonus.style.display = 'block';
        
        const heures = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const secondes = Math.floor((distance % (1000 * 60)) / 1000);

        countdownSpan.innerText = 
            String(heures).padStart(2, '0') + ":" + 
            String(minutes).padStart(2, '0') + ":" + 
            String(secondes).padStart(2, '0');
    }, 1000);
}

// ==========================================
// 🎯 QUÊTES DYNAMIQUES
// ==========================================

async function chargerQuetes() {
    const container = document.getElementById('quetes-container');
    
    const { data, error } = await client.rpc('get_quetes_du_jour', {
        p_pseudo: monPseudo
    });

    if (error) {
        console.error("🚨 ERREUR SQL SUPABASE :", error);
        container.innerHTML = `
            <div style="background: rgba(255,0,0,0.1); border: 1px solid #ff4444; padding: 15px; border-radius: 8px;">
                <p style="text-align: center; color: #ff4444; font-weight: bold; margin-bottom: 5px;">Erreur de base de données :</p>
                <p style="text-align: center; color: #ffaaaa; font-family: monospace; font-size: 0.9rem;">${error.message || 'Erreur inconnue'}</p>
                <p style="text-align: center; color: #888; font-family: monospace; font-size: 0.8rem; margin-top: 5px;">${error.details || 'Regarde la console F12 pour plus d\'infos'}</p>
            </div>
        `;
        return;
    }

    if (!data || data.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #888;">Aucune quête disponible pour le moment.</p>';
        return;
    }

    container.innerHTML = '';

    data.forEach(quete => {
        const card = document.createElement('div');
        card.className = 'game-card';
        card.style.cssText = 'width: 100%; padding: 15px; flex-direction: row; justify-content: space-between; gap: 10px; margin-bottom: 15px;';

        let btnHTML = '';
    
        // On s'assure que l'affichage ne dépasse pas le max (ex: 12/10 -> 10/10)
        let proActuelle = quete.progression > quete.objectif ? quete.objectif : quete.progression;
        let objAtteint = proActuelle >= quete.objectif;

        if (quete.est_completee) {
            // Déjà récupérée aujourd'hui -> Bouton désactivé
            btnHTML = `<button class="main-btn" style="background: #333; color: #888; cursor: not-allowed; min-width: 120px;" disabled>Déjà fait</button>`;
            
        } else if (!objAtteint && quete.type_action !== 'clic') {
            // Objectif pas encore atteint (ex: Mines 3/10) -> Bouton gris avec progression
            btnHTML = `<button class="main-btn" style="background: #2a2a2a; color: #aaa; cursor: not-allowed; min-width: 120px;" disabled>${proActuelle} / ${quete.objectif}</button>`;
            
        } else {
            // Soit c'est un clic simple, soit l'objectif (ex: 10/10) est atteint -> Bouton cliquable
            const lienStr = quete.lien_action ? `'${quete.lien_action}'` : 'null';
            btnHTML = `<button id="btn-quete-${quete.id}" class="auth-btn signup-btn" style="min-width: 120px;" onclick="accomplirQuete('${quete.id}', ${lienStr})">+${quete.recompense} FC</button>`;
        }

        card.innerHTML = `
            <div style="text-align: left;">
                <h4 style="margin-bottom: 5px;">${quete.titre}</h4>
                <p style="font-size: 0.85rem; color: var(--text-sec);">${quete.description}</p>
            </div>
            ${btnHTML}
        `;
        container.appendChild(card);
    });
}

async function accomplirQuete(queteId, lienAction) {
    const btn = document.getElementById(`btn-quete-${queteId}`);
    if (btn) {
        btn.disabled = true;
        btn.innerText = '⏳...';
    }

    // Ouvrir le lien associé (ex: Discord) dans un nouvel onglet
    if (lienAction && lienAction !== 'null') {
        window.open(lienAction, '_blank');
    }

    // Appeler Supabase
    const { data, error } = await client.rpc('valider_quete', {
        p_pseudo: monPseudo,
        p_quete_id: queteId
    });

    if (error || (data && data.status === 'erreur')) {
        if (typeof showToast === 'function') {
            showToast(data?.message || "Erreur serveur", "error");
        }
        if (btn) {
            btn.disabled = false;
            btn.innerText = "+ FC";
        }
        return;
    }

    // Succès
    if (typeof showToast === 'function') {
        showToast(`✅ ${data.message}`, "info");
    }
    
    // Maj de l'affichage global
    const fcElement = document.getElementById('global-balance-fc');
    if (fcElement) fcElement.innerText = (parseFloat(fcElement.innerText) + data.gain).toFixed(2);

    // Recharger la liste pour afficher le bouton "Déjà fait"
    chargerQuetes();
}

// ==========================================
// 🚀 INITIALISATION
// ==========================================

// Attendre que monPseudo soit disponible via main.js
let verifConnexion = setInterval(() => {
    if (typeof monPseudo !== 'undefined' && monPseudo) {
        clearInterval(verifConnexion); 
        initialiserBonus();            
        chargerQuetes();               
    }
}, 500);