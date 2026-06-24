async function checkAccess() {
    const { data: { session } } = await client.auth.getSession();
    
    if (!session) {
        window.location.href = "index.html";
        return;
    }

    monPseudo = session.user.user_metadata.pseudo;
    document.getElementById('update-pseudo').value = monPseudo;
}

async function updateProfile(event) {
    if (event) event.preventDefault();

    const bouton = event.currentTarget || document.querySelector('button');
    
    const newPseudo = document.getElementById('update-pseudo').value.trim();
    const newEmail = document.getElementById('update-email').value.trim();
    const newPassword = document.getElementById('update-password').value.trim();

    if (!newEmail && !newPassword && (!newPseudo || newPseudo === monPseudo)) {
        alert("Tu n'as rien modifié !");
        return;
    }

    bouton.innerText = "SAUVEGARDE EN COURS...";
    bouton.disabled = true;

    // =========================================
    // ÉTAPE A : GESTION DU PSEUDO (Déménagement complet en SQL)
    // =========================================
    if (newPseudo && newPseudo !== monPseudo) {
        if (newPseudo.length < 3) {
            alert("Le pseudo doit faire au moins 3 caractères.");
            resetBouton(bouton);
            return;
        }

        // On lance notre super fonction SQL qui déplace le solde et l'historique
        const { data, error: sqlError } = await client.rpc('modifier_pseudo', {
            p_ancien: monPseudo,
            p_nouveau: newPseudo
        });

        if (sqlError) {
            console.error("Erreur SQL :", sqlError);
            alert("Erreur base de données. Ton pseudo n'a pas été changé.");
            resetBouton(bouton);
            return;
        }

        if (data && data.status === 'erreur') {
            alert(data.message); // Affiche "Ce pseudo est déjà pris !"
            resetBouton(bouton);
            return;
        }

        // Si la base de données a accepté, on change l'étiquette d'authentification
        const { error: authPseudoError } = await client.auth.updateUser({
            data: { pseudo: newPseudo }
        });

        if (authPseudoError) {
            console.error("Erreur Auth Pseudo :", authPseudoError);
        } else {
            monPseudo = newPseudo;
            // On met à jour l'affichage en haut à droite
            const pseudoElement = document.getElementById('dropdown-pseudo');
            const avatarElement = document.getElementById('user-avatar');
            if (pseudoElement) pseudoElement.innerText = monPseudo;
            if (avatarElement) avatarElement.innerText = monPseudo.charAt(0);
        }
    }

    // =========================================
    // ÉTAPE B : GESTION DE L'EMAIL ET DU MOT DE PASSE
    // =========================================
    let authUpdates = {};
    if (newEmail) authUpdates.email = newEmail;
    if (newPassword) authUpdates.password = newPassword;

    if (Object.keys(authUpdates).length > 0) {
        const { error: authError } = await client.auth.updateUser(authUpdates);
        
        if (authError) {
            alert("Erreur lors de la mise à jour (Email/MDP) : " + authError.message);
            resetBouton(bouton);
            return;
        }
    }

    // =========================================
    // ÉTAPE C : NETTOYAGE ET SUCCÈS
    // =========================================
    document.getElementById('update-password').value = "";
    document.getElementById('update-email').value = "";
    
    // On recharge l'historique au cas où le joueur vient de changer de pseudo
    chargerEtAfficherHistorique('historique-global-container');

    resetBouton(bouton);
    alert("Profil mis à jour avec succès !");
}

function resetBouton(bouton) {
    bouton.innerText = "SAUVEGARDER";
    bouton.disabled = false;
}

// INITIALISATION AU DÉMARRAGE DE LA PAGE
async function initialiserPageProfil() {
    await checkAccess();
    chargerEtAfficherHistorique('historique-global-container');
}

initialiserPageProfil();