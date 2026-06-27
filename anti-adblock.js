/**
 * STAKELITE - Détecteur d'AdBlock
 * Bloque l'accès au jeu si les bannières publicitaires sont masquées.
 */

// 1. Injection automatique du CSS de l'overlay pour éviter de toucher à ton style.css
const style = document.createElement('style');
style.innerHTML = `
    #adblock-overlay {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(10, 25, 41, 0.98); /* Fond sombre assorti à StakeLite */
        z-index: 999999;
        justify-content: center;
        align-items: center;
        flex-direction: column;
        text-align: center;
        padding: 20px;
        font-family: 'Poppins', sans-serif, system-ui;
    }
    .adblock-box {
        background: #1e293b;
        padding: 40px;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        max-width: 550px;
        border: 1px solid #ef4444;
    }
    .adblock-box h2 {
        color: #ef4444;
        font-size: 26px;
        margin-top: 0;
        margin-bottom: 15px;
    }
    .adblock-box p {
        color: #94a3b8;
        font-size: 15px;
        line-height: 1.6;
        margin-bottom: 25px;
    }
    .adblock-btn {
        background-color: #10b981; /* Vert StakeLite */
        color: white;
        border: none;
        padding: 12px 30px;
        font-size: 16px;
        font-weight: bold;
        border-radius: 6px;
        cursor: pointer;
        transition: background 0.2s;
    }
    .adblock-btn:hover {
        background-color: #059669;
    }
`;
document.head.appendChild(style);

// 2. Création et injection de l'overlay HTML dans le DOM dès que le script charge
window.addEventListener('DOMContentLoaded', () => {
    const overlay = document.createElement('div');
    overlay.id = 'adblock-overlay';
    overlay.innerHTML = `
        <div class="adblock-box">
            <h2>🛡️ Bloqueur de pub détecté !</h2>
            <p>
                StakeLite est un projet étudiant entièrement gratuit. Les bannières publicitaires nous permettent de financer les serveurs et de t'offrir tes <strong>FreeCoins (FC)</strong>.<br><br>
                Pour continuer à jouer et accéder aux grilles, merci de désactiver ton AdBlock/uBlock (ou de couper les boucliers Brave) pour notre site, puis de rafraîchir la page. 🙏
            </p>
            <button class="adblock-btn" onclick="window.location.reload()">J'AI DÉSACTIVÉ ADBLOCK</button>
        </div>
    `;
    document.body.appendChild(overlay);
});

// 3. Script de vérification de la bannière
window.addEventListener('load', () => {
    // On laisse 1.5 seconde à la pub Adsterra pour s'injecter et se charger
    setTimeout(() => {
        const bannerContainer = document.querySelector('.ad-banner-container');
        
        // Détection : On vérifie si la div de la pub a été supprimée, cachée (display:none) ou écrasée à 0px de hauteur
        if (
            !bannerContainer || 
            bannerContainer.offsetHeight === 0 || 
            window.getComputedStyle(bannerContainer).display === 'none'
        ) {
            // AdBlock est actif -> On affiche l'écran de blocage
            document.getElementById('adblock-overlay').style.display = 'flex';
            
            // Sécurité bonus : Désactiver le bouton de jeu principal s'il existe sur la page
            const playBtn = document.getElementById('play-btn');
            if (playBtn) {
                playBtn.disabled = true;
                playBtn.style.opacity = '0.5';
                playBtn.style.cursor = 'not-allowed';
            }
        }
    }, 1500);
});