async function demanderRetrait(marque, montantEuro, coutGC) {
    if (!monPseudo) {
        alert("Tu dois être connecté pour accéder à la boutique !");
        openAuthModal(true);
        return;
    }

    let soldeActuel = parseFloat(document.getElementById('global-balance-gc').innerText);
    if (soldeActuel < coutGC) {
        alert(`Fonds insuffisants ! Il te manque ${coutGC - soldeActuel} GC pour obtenir cette carte.`);
        return;
    }

    let confirmation = confirm(`Es-tu sûr de vouloir dépenser ${coutGC} GC pour une carte ${marque} de ${montantEuro}€ ?\n\nLa carte sera envoyée sur ton adresse e-mail après vérification de ton compte.`);
    if (!confirmation) return;

    const { data, error } = await client.rpc('traiter_retrait', {
        p_pseudo: monPseudo,
        p_marque: marque,
        p_montant_euro: montantEuro,
        p_cout_gc: coutGC
    });

    if (error) {
        console.error(error);
        alert("Une erreur s'est produite lors de la transaction. Contacte-nous sur Discord.");
        return;
    }

    if (data.status === 'erreur') {
        alert("Erreur : " + data.message);
        return;
    }

    alert(`✅ Demande envoyée avec succès !\n\nTon retrait est en cours de traitement. Tu recevras ta carte cadeau ${marque} par e-mail sous 48h.`);
    
    const { data: newData } = await client
        .from('Joueurs')
        .select('"GoldCoins"')
        .eq('pseudo', monPseudo)
        .single();
        
    if (newData) {
        document.getElementById('global-balance-gc').innerText = newData.GoldCoins.toFixed(2);
    }
}