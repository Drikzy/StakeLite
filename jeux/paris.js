let selectedMatchId = null;
let selectedPrediction = null;
let selectedOdds = 0;

// =========================================
// 0. SYNCHRONISATION DU SOLDE
// =========================================
async function syncBalance() {
    if (typeof client === 'undefined' || !monPseudo) return;
    
    const { data } = await client
        .from('Joueurs')
        .select('"GoldCoins", "FreeCoins"')
        .eq('pseudo', monPseudo)
        .single();
    
    if (data) {
        const gcElement = document.getElementById('global-balance-gc');
        const fcElement = document.getElementById('global-balance-fc');
        if (gcElement) gcElement.innerText = (data.GoldCoins || 0).toFixed(2);
        if (fcElement) fcElement.innerText = (data.FreeCoins || 0).toFixed(2);
    }
}

// =========================================
// 1. CHARGEMENT DES MATCHS DU JOUR & LIVE
// =========================================
async function loadMatchs() {
    if (typeof client === 'undefined') {
        setTimeout(loadMatchs, 100);
        return;
    }

    const { data: matchs, error } = await client
        .from('Matchs')
        .select('*')
        .neq('statut', 'termine')
        .order('date_debut', { ascending: true });

    if (error) {
        console.error("Erreur matchs:", error.message);
        return;
    }

    const container = document.getElementById('matchs-container');
    container.innerHTML = '';

    if (matchs.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: var(--text-sec);">Aucun match disponible pour le moment.</p>`;
        return;
    }

    const maintenant = new Date();

    matchs.forEach(match => {
        const dateMatch = new Date(match.date_debut);
        const estExpire = maintenant >= dateMatch; 

        const options = { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' };
        const dateFormatee = dateMatch.toLocaleDateString('fr-FR', options);

        // Affichage du milieu (Score en Direct OU simple "VS")
        let middleDisplay = '';
        if (estExpire && match.statut === 'en_cours') {
            middleDisplay = `
                <div style="flex: 1; text-align: center; display: flex; flex-direction: column; align-items: center;">
                    <span class="live-minute">${match.minute_live || '1\''}</span>
                    <span class="live-score-text">${match.score_home} - ${match.score_away}</span>
                </div>
            `;
        } else {
            middleDisplay = `
                <div style="flex: 1; text-align: center;">
                    <span style="color: var(--text-sec); font-size: 14px; font-weight: bold;">VS</span>
                </div>
            `;
        }

        const card = document.createElement('div');
        card.className = 'match-card';
        card.innerHTML = `
            <div class="match-header">
                <span>📅 ${dateFormatee}</span>
                <span style="color: ${estExpire ? 'var(--red)' : '#2fbf71'}">
                    ${estExpire ? '🔴 Paris clos' : '🟢 Ouvert'}
                </span>
            </div>
            
            <div class="match-teams" style="display: flex; justify-content: space-between; align-items: center;">
                <span style="flex: 1; text-align: right;">${match.equipe_home}</span>
                ${middleDisplay}
                <span style="flex: 1; text-align: left;">${match.equipe_away}</span>
            </div>

            <div class="odds-row">
                <button class="odd-btn" id="btn-${match.id}-home" onclick="selectOdd(${match.id}, 'home', ${match.cote_home})" ${estExpire ? 'disabled' : ''}>
                    ${match.cote_home.toFixed(2)}
                </button>
                <button class="odd-btn" id="btn-${match.id}-nul" onclick="selectOdd(${match.id}, 'nul', ${match.cote_nul})" ${estExpire ? 'disabled' : ''}>
                    ${match.cote_nul.toFixed(2)}
                </button>
                <button class="odd-btn" id="btn-${match.id}-away" onclick="selectOdd(${match.id}, 'away', ${match.cote_away})" ${estExpire ? 'disabled' : ''}>
                    ${match.cote_away.toFixed(2)}
                </button>
            </div>

            <div class="bet-slip" id="slip-${match.id}" style="display: none; align-items: center; gap: 10px;">
                <div class="input-wrapper" style="flex: 1;">
                    <input type="number" id="input-${match.id}" value="100" min="1" style="margin-bottom: 0;">
                    
                    <div class="toggle-container">
                        <label class="switch-inline">
                            <input type="checkbox" id="currency-toggle-${match.id}">
                            <span class="slider-inline round"></span>
                        </label>
                        <span class="fc-text">FC</span>
                    </div>
                </div>
                <button class="main-btn green" style="width: auto; padding: 0 20px;" onclick="placeBet(${match.id})">PARIER</button>
            </div>
        `;
        container.appendChild(card);
    });
}

// =========================================
// 2. GESTION DES MISES
// =========================================
function selectOdd(matchId, prediction, odds) {
    if (selectedMatchId && selectedMatchId !== matchId) {
        document.getElementById(`slip-${selectedMatchId}`).style.display = 'none';
        document.querySelectorAll(`.match-card .odd-btn`).forEach(btn => btn.classList.remove('selected'));
    }

    selectedMatchId = matchId;
    selectedPrediction = prediction;
    selectedOdds = odds;

    document.getElementById(`btn-${matchId}-home`).classList.remove('selected');
    document.getElementById(`btn-${matchId}-nul`).classList.remove('selected');
    document.getElementById(`btn-${matchId}-away`).classList.remove('selected');

    document.getElementById(`btn-${matchId}-${prediction}`).classList.add('selected');
    document.getElementById(`slip-${matchId}`).style.display = 'flex';
}

async function placeBet(matchId) {
    const inputMise = document.getElementById(`input-${matchId}`);
    const bet = parseFloat(inputMise.value);

    // Lecture de l'interrupteur GC/FC spécifique à ce match
    const isFC = document.getElementById(`currency-toggle-${matchId}`).checked;
    const monnaiePari = isFC ? 'FreeCoins' : 'GoldCoins';

    // Validation du solde
    let currentGC = parseFloat(document.getElementById('global-balance-gc').innerText);
    let currentFC = parseFloat(document.getElementById('global-balance-fc').innerText);
    let soldeActuel = monnaiePari === 'GoldCoins' ? currentGC : currentFC;

    if (isNaN(bet) || bet <= 0 || bet > soldeActuel) {
        return alert("Mise invalide ou solde insuffisant !");
    }

    // Appel sécurisé au backend
    const { data, error } = await client.rpc('placer_pari', {
        p_pseudo: monPseudo,
        p_match_id: matchId,
        p_prediction: selectedPrediction,
        p_mise: bet,
        p_monnaie: monnaiePari
    });

    if (error || data.status === 'erreur') {
        alert("Erreur: " + (error ? error.message : data.message));
        return;
    }

    // Succès
    document.getElementById(`slip-${matchId}`).style.display = 'none';
    document.getElementById(`btn-${matchId}-${selectedPrediction}`).classList.remove('selected');
    selectedMatchId = null;
    selectedPrediction = null;
    
    syncBalance();
    loadMyBets();
    
    alert(`Pari placé avec succès (${bet} ${monnaiePari === 'GoldCoins' ? 'GC' : 'FC'}) !`);
}

// =========================================
// 3. HISTORIQUE MES PARIS
// =========================================
async function loadMyBets() {
    if (!monPseudo) {
        setTimeout(loadMyBets, 200);
        return;
    }

    const { data: paris, error } = await client
        .from('Paris')
        .select(`
            id,
            prediction,
            mise,
            gain,
            statut,
            Matchs ( equipe_home, equipe_away )
        `)
        .eq('joueur_pseudo', monPseudo)
        .order('id', { ascending: false });

    if (error) {
        console.error("Erreur historique paris:", error.message);
        return;
    }

    const container = document.getElementById('my-bets-container');
    container.innerHTML = '';

    if (paris.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: var(--text-sec);">Tu n'as pas encore placé de paris.</p>`;
        return;
    }

    paris.forEach(pari => {
        const card = document.createElement('div');
        card.className = `bet-history-card ${pari.statut}`;
        let pronoTexte = "";
        if (pari.prediction === 'home') {
            pronoTexte = pari.Matchs.equipe_home;
        } else if (pari.prediction === 'nul') {
            pronoTexte = "Match Nul";
        } else if (pari.prediction === 'away') {
            pronoTexte = pari.Matchs.equipe_away;
        }

        let statutLabel = "En cours";
        let montantAffichage = `Mise : ${pari.mise.toFixed(2)}`;

        if (pari.statut === 'gagne') {
            statutLabel = "Gagné";
            montantAffichage = `+${(pari.gain || 0).toFixed(2)}`;
        } else if (pari.statut === 'perdu') {
            statutLabel = "Perdu";
            montantAffichage = `-${pari.mise.toFixed(2)}`;
        }

        card.innerHTML = `
            <div class="bet-history-details">
                <div class="bet-history-teams">
                    ${pari.Matchs.equipe_home} vs ${pari.Matchs.equipe_away}
                </div>
                <div class="bet-history-meta">
                    Pronostique: <span style="color: #fff; font-weight: bold;">${pronoTexte}</span>
                </div>
            </div>
            
            <div style="text-align: right; display: flex; flex-direction: column; gap: 5px; align-items: flex-end;">
                <span class="bet-status-badge ${pari.statut}">${statutLabel}</span>
                <span style="font-weight: bold; font-size: 14px; color: ${pari.statut === 'gagne' ? 'var(--accent)' : '#fff'}">
                    ${montantAffichage}
                </span>
            </div>
        `;
        container.appendChild(card);
    });
}

setInterval(() => {
    loadMatchs(); 
    loadMyBets();
}, 30000);

loadMatchs();
loadMyBets();
syncBalance();