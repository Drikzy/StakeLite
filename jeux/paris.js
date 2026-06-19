let selectedMatchId = null;
let selectedPrediction = null;
let selectedOdds = 0;

// =========================================
// 1. CHARGEMENT DES MATCHS DU JOUR
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
        const estExpire = maintenant >= dateMatch; // Si l'heure du match est passée

        const options = { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' };
        const dateFormatee = dateMatch.toLocaleDateString('fr-FR', options);

        const card = document.createElement('div');
        card.className = 'match-card';
        card.innerHTML = `
            <div class="match-header">
                <span>📅 ${dateFormatee}</span>
                <span style="color: ${estExpire ? 'var(--red)' : '#2fbf71'}">
                    ${estExpire ? '🔴 En Cours (Paris clos)' : '🟢 Ouvert'}
                </span>
            </div>
            
            <div class="match-teams" style="display: flex; justify-content: space-between; align-items: center;">
                <span style="flex: 1; text-align: right;">${match.equipe_home}</span>
                <div style="flex: 1; text-align: center;">
                    <span style="color: var(--text-sec); font-size: 14px;">VS</span>
                </div>
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

            <div class="bet-slip" id="slip-${match.id}" style="display: none;">
                <input type="number" id="input-${match.id}" value="100" min="1" style="margin-bottom: 0; flex: 1;">
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
    const mise = parseFloat(inputMise.value);

    if (isNaN(mise) || mise <= 0 || mise > balance) return alert("Mise invalide ou solde insuffisant.");

    // Vérification de sécurité avant l'envoi
    const { data: match, error: matchError } = await client
        .from('Matchs')
        .select('date_debut')
        .eq('id', matchId)
        .single();

    if (matchError || new Date() >= new Date(match.date_debut)) {
        alert("Désolé, les paris sont clos pour ce match !");
        loadMatchs(); 
        return;
    }

    updateBalance(-mise);

    const { error: betError } = await client
        .from('Paris')
        .insert([{
            joueur_pseudo: monPseudo,
            match_id: matchId,
            prediction: selectedPrediction,
            mise: mise,
            statut: 'en_cours'
        }]);

    if (betError) {
        alert("Une erreur est survenue lors de la validation du pari.");
        updateBalance(mise); 
        return;
    }

    document.getElementById(`slip-${matchId}`).style.display = 'none';
    document.getElementById(`btn-${matchId}-${selectedPrediction}`).classList.remove('selected');
    selectedMatchId = null;
    selectedPrediction = null;
    loadMyBets();
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
        let montantAffichage = `Mise : ${pari.mise.toFixed(2)} GC`;

        if (pari.statut === 'gagne') {
            statutLabel = "Gagné";
            montantAffichage = `+${pari.gain.toFixed(2)} GC`;
        } else if (pari.statut === 'perdu') {
            statutLabel = "Perdu";
            montantAffichage = `-${pari.mise.toFixed(2)} GC`;
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