import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// On récupère les clés secrètes du serveur
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const API_KEY = Deno.env.get('API_SPORTS_KEY')!

// On crée un client Supabase avec les droits ADMIN (Service Role)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
  console.log("🤖 Réveil du Croupier Automatique...");

  // 1. Trouver les matchs "en_attente" dont l'heure de début est dépassée
  const { data: matchs } = await supabase
    .from('Matchs')
    .select('*')
    .eq('statut', 'en_attente')
    .lte('date_debut', new Date().toISOString());

  if (!matchs || matchs.length === 0) {
    return new Response("Aucun match à vérifier.", { status: 200 })
  }

  // 2. Préparer les IDs pour l'API
  const apiIds = matchs.filter(m => m.api_id).map(m => m.api_id);
  if (apiIds.length === 0) return new Response("Aucun API ID trouvé.", { status: 200 });

  // 3. Interroger API-Football (1 seule requête pour TOUS les matchs !)
  const response = await fetch(`https://v3.football.api-sports.io/fixtures?ids=${apiIds.join(',')}`, {
    headers: { "x-apisports-key": API_KEY }
  });
  const data = await response.json();

  // 4. Analyser les résultats
  for (const fixture of data.response) {
    if (fixture.fixture.status.short === "FT") { // FT = Full Time (Match Terminé)
      const matchLocal = matchs.find(m => m.api_id == fixture.fixture.id);
      
      const goalsHome = fixture.goals.home;
      const goalsAway = fixture.goals.away;
      
      // Déterminer le résultat gagnant
      let resultatGagnant = 'nul';
      if (goalsHome > goalsAway) resultatGagnant = 'home';
      if (goalsAway > goalsHome) resultatGagnant = 'away';

      console.log(`✅ Match ${matchLocal.id} terminé : ${resultatGagnant}`);

      // Mettre à jour le match
      await supabase.from('Matchs').update({ statut: 'termine', resultat: resultatGagnant }).eq('id', matchLocal.id);

      // 5. Récupérer tous les paris sur ce match et payer les gagnants
      const { data: paris } = await supabase.from('Paris').select('*').eq('match_id', matchLocal.id).eq('statut', 'en_cours');
      
      for (const pari of (paris || [])) {
        if (pari.prediction === resultatGagnant) {
          // GAGNÉ : On calcule le gain
          let cote = 1;
          if (resultatGagnant === 'home') cote = matchLocal.cote_home;
          if (resultatGagnant === 'nul') cote = matchLocal.cote_nul;
          if (resultatGagnant === 'away') cote = matchLocal.cote_away;
          
          const gain = pari.mise * cote;
          
          // On marque le pari gagné et on verse l'argent via la fonction SQL sécurisée
          await supabase.from('Paris').update({ statut: 'gagne', gain: gain }).eq('id', pari.id);
          await supabase.rpc('payer_gagnant', { pseudo_joueur: pari.joueur_pseudo, montant: gain });
          
        } else {
          // PERDU
          await supabase.from('Paris').update({ statut: 'perdu' }).eq('id', pari.id);
        }
      }
    }
  }

  return new Response("Vérification terminée avec succès !", { status: 200 })
})