async function checkAccess() {
    const { data: { session } } = await client.auth.getSession();
    
    if (!session) {
        window.location.href = "index.html";
        return;
    }

    monPseudo = session.user.user_metadata.pseudo;
    document.getElementById('update-pseudo').value = monPseudo;
    monEmail = session.user.email;
    document.getElementById('update-email').value = monEmail;
}

async function updateProfile(event) {
    if (event) event.preventDefault();

    const bouton = event.currentTarget || document.querySelector('button');
    
    // 1. Récupération des champs
    const newPseudo = document.getElementById('update-pseudo').value.trim();
    const newEmail = document.getElementById('update-email').value.trim();
    const newPassword = document.getElementById('update-password').value.trim();
    const currentPassword = document.getElementById('current-password').value.trim();

    // 2. Vérification s'il y a des changements
    if (!newEmail && !newPassword && (!newPseudo || newPseudo === monPseudo)) {
        showToast("Tu n'as rien modifié !", "error");
        return;
    }

    // 3. VÉRIFICATION DE SÉCURITÉ : Mot de passe actuel obligatoire
    if (!currentPassword) {
        showToast("Tu dois saisir ton mot de passe actuel pour valider les modifications.", "error");
        return;
    }

    bouton.innerText = "SAUVEGARDE EN COURS...";
    bouton.disabled = true;

    // Récupération de l'email actuel via la session pour l'authentification
    const { data: { session } } = await client.auth.getSession();
    if (!session) {
        showToast("Session expirée. Veuillez vous reconnecter.", "error");
        setTimeout(() => window.location.href = "index.html", 2000);
        return;
    }
    const currentEmail = session.user.email;

    // 4. VALIDATION DU MOT DE PASSE ACTUEL AUPRÈS DE SUPABASE
    const { error: verifyError } = await client.auth.signInWithPassword({
        email: currentEmail,
        password: currentPassword
    });

    if (verifyError) {
        showToast("Le mot de passe actuel est incorrect. Modification annulée.", "error");
        resetBouton(bouton);
        return;
    }

    // =========================================
    // ÉTAPE A : GESTION DU PSEUDO (Déménagement complet en SQL)
    // =========================================
    if (newPseudo && newPseudo !== monPseudo) {
        if (newPseudo.length < 3) {
            showToast("Le pseudo doit faire au moins 3 caractères.", "error");
            resetBouton(bouton);
            return;
        }

        const { data, error: sqlError } = await client.rpc('modifier_pseudo', {
            p_ancien: monPseudo,
            p_nouveau: newPseudo
        });

        if (sqlError) {
            console.error("Erreur SQL :", sqlError);
            showToast("Erreur base de données. Ton pseudo n'a pas été changé.", "error");
            resetBouton(bouton);
            return;
        }

        if (data && data.status === 'erreur') {
            showToast(data.message, "error"); // Affiche "Ce pseudo est déjà pris !"
            resetBouton(bouton);
            return;
        }

        const { error: authPseudoError } = await client.auth.updateUser({
            data: { pseudo: newPseudo }
        });

        if (authPseudoError) {
            console.error("Erreur Auth Pseudo :", authPseudoError);
        } else {
            monPseudo = newPseudo;
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
            showToast("Erreur lors de la mise à jour : " + authError.message, "error");
            resetBouton(bouton);
            return;
        }
    }

    // =========================================
    // ÉTAPE C : NETTOYAGE ET SUCCÈS
    // =========================================
    document.getElementById('update-password').value = "";
    // On peut laisser l'email actuel affiché
    document.getElementById('current-password').value = ""; 
    
    if (typeof chargerEtAfficherHistorique === "function") {
        chargerEtAfficherHistorique('historique-global-container');
    }

    resetBouton(bouton);
    showToast("Profil mis à jour avec succès !", "info");
}

function resetBouton(bouton) {
    bouton.innerText = "SAUVEGARDER";
    bouton.disabled = false;
}

// INITIALISATION AU DÉMARRAGE DE LA PAGE
async function initialiserPageProfil() {
    await checkAccess();
    if (typeof chargerEtAfficherHistorique === "function") {
        chargerEtAfficherHistorique('historique-global-container');
    }
}

initialiserPageProfil();