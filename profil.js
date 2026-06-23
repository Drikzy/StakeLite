async function checkAccess() {
    const { data: { session } } = await client.auth.getSession();
    
    // Si personne n'est connecté, on l'éjecte vers la page d'accueil
    if (!session) {
        window.location.href = "index.html";
        return;
    }

    // Si le joueur est connecté, on pré-remplit sa case pseudo
    monPseudo = session.user.user_metadata.pseudo;
    document.getElementById('update-pseudo').value = monPseudo;
}

async function updateProfile() {
    const newPseudo = document.getElementById('update-pseudo').value.trim();
    const newEmail = document.getElementById('update-email').value.trim();
    const newPassword = document.getElementById('update-password').value.trim();

    let updates = {};
    if (newEmail) updates.email = newEmail;
    if (newPassword) updates.password = newPassword;
    if (newPseudo && newPseudo !== monPseudo) {
        updates.data = { pseudo: newPseudo }; 
    }

    if (Object.keys(updates).length === 0) {
        alert("Tu n'as rien modifié !");
        return;
    }

    const bouton = document.querySelector('button');
    bouton.innerText = "SAUVEGARDE EN COURS...";
    bouton.disabled = true;
    const { data, error } = await client.auth.updateUser(updates);

    if (error) {
        alert("Erreur : " + error.message);
        bouton.innerText = "SAUVEGARDER";
        bouton.disabled = false;
        return;
    }
    if (newPseudo && newPseudo !== monPseudo) {
        await client
            .from('Joueurs')
            .update({ pseudo: newPseudo })
            .eq('pseudo', monPseudo); 
            
        monPseudo = newPseudo;
    }

    document.getElementById('update-password').value = "";
    document.getElementById('update-email').value = "";
    bouton.innerText = "SAUVEGARDER";
    bouton.disabled = false;
    alert("Profil mis à jour avec succès !");
}

checkAccess();
chargerEtAfficherHistorique('historique-global-container');