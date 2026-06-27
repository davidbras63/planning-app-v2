import streamlit as st

def afficher_faq_complete():
    st.markdown("## 📖 Centre d'Aide & FAQ")
    
    with st.expander("🧭 Navigation dans l'application"):
        st.write("""
        La navigation s'effectue via le menu latéral (Sidebar) dans cet ordre :
        - **Dashboard :** Ton tableau de bord complet. It regroupe le tableau des rattrapages (alertes sous ton seuil de réussite) et te permet d'avoir une vision d'ensemble de ton année en affichant toutes tes matières. En cliquant sur une matière, tu peux dérouler et voir la liste de absolument tous les chapitres/cours déjà enregistrés à l'intérieur.
        - **Planning :** Ton espace central pour créer tes chapitres, saisir tes notes et gérer tes dates (J0).
        - **Graphiques :** Pour analyser tes performances et comparer tes chapitres.
        """)
        
    with st.expander("📅 Planning : Création, Saisie et Réglages (Le cœur du système)"):
        st.write("""
        C'est dans l'onglet **Planning** que tout se passe :
        - **Création des chapitres :** C'est ici que tu ajoutes tes nouveaux chapitres. **Attention :** veille bien à sélectionner la bonne matière en premier lieu pour t'assurer que le chapitre y soit correctement rattaché. Renseigne ensuite obligatoirement sa **date de J0** (date du cours ou début d'apprentissage) et sa **date d'examen** (limite de sécurité).
        - **Saisie des notes :** Tu saisis tes notes directement au clavier (`Note [Espace] Note [Espace] Note`), puis tu valides avec **[Entrée]** pour calculer les moyennes en bas du tableau.
        - **Modification du cadencier (Réglages) :** C'est dans l'onglet des réglages que tu configures les intervalles de temps de tes révisions (ex: J3, J7, J14...). Si tu ajoutes ou modifies un intervalle, clique sur "Recalcul Global" pour propager le changement.
        - **Notes planchers (Seuils) :** Via les curseurs (sliders) ajustables, tu règles la note minimale attendue par échéance (J). C'est la comparaison entre ces seuils et tes notes saisies qui détermine si un cours bascule en rattrapage.
        """)
        
    with st.expander("📁 Organisation : Dossiers, Matières et Chapitres"):
        st.write("""
        La nomenclature est pensée pour refléter exactement ton cursus :
        - **Les Dossiers :** Ils correspondent à ton année en cours (ex: `PASS`, `LAS`, `HEC`...).
        - **Les Matières :** Ce sont les Unités d'Enseignement enseignées (ex: `01-UE1`, `02-UE2`...).
        - **Les Chapitres / Cours :** Utilise un préfixe combiné pour identifier immédiatement le cours (ex: `01-01_COEUR`, `01-02_COEUR`, ou `01-01_CERVEAU`).
        """)
        
    with st.expander("🔗 Liens Web Génériques"):
        st.write("""
        - Tu peux coller directement les liens de tes plateformes pédagogiques (cours en ligne, ENT, etc.) dans l'application.
        - Ces liens sont entièrement génériques. 
        - Si un lien n'est pas encore configuré, un popover d'accès rapide apparaît dans la barre latérale pour te permettre de le renseigner simplement. Une fois enregistré, le lien s'affiche sous forme de bouton d'accès direct.
        """)
        
    with st.expander("📊 Suivi Graphique et Comparatif"):
        st.write("""
        La section graphique te permet d'analyser précisément ton niveau :
        - Une première courbe affiche la **moyenne générale** de la matière.
        - En dessous, tu peux afficher et comparer **jusqu'à 3 chapitres en même temps**.
        - Cela te permet de voir immédiatement dans quel chapitre tu es le meilleur ou, au contraire, ceux qui nécessitent plus d'attention par rapport à tes révisions.
        """)
        
    with st.expander("🛠️ Tableau de rattrapage et Bouton 'Réintégrer'"):
        st.write("""
        Si un chapitre passe en dessous de ton seuil de réussite, il apparaît dans le tableau de rattrapage :
        - **Le bouton 'Réintégrer' (Automatique) :** Il cherche un créneau disponible en respectant des règles strictes pour éviter la surcharge :
          1. Il ne place pas de cours au-delà de **J-2 par rapport au J suivant** (pour éviter tout chevauchement).
          2. Il ignore systématiquement les **dimanches** pour te laisser une journée complète de récupération.
          3. Il respecte le paramètre de **cours max par jour** que tu as défini dans la barre latérale (Sidebar).
        - **Forçage manuel :** Si l'algorithme automatique ne trouve pas de place, tu as la possibilité de forcer la réintégration manuellement à la date de ton choix.
        - **Suppression :** Si finalement tu ne souhaites pas réintégrer ou rattraper ce cours, le bouton 'Supprimer' te permet de l'enlever complètement du tableau.
        """)
        
    with st.expander("⚙️ Planning, Décalages et Recalculs"):
        st.write("""
        - **Décalage du J0 :** Si tu actives l'option 'Modifier les dates' dans le planning et que tu décales un J0, le système recalcule automatiquement toute la chaîne future (J3, J7, etc.) pour respecter ton cadencier.
        - **Décalage d'un autre J (J3, J7...) :** Si tu déplaces une seule échéance de révision (tolérance d'un ou deux jours max pour gérer une surcharge), **seul ce J spécifique bouge**, les autres restent en place.
        - **Recalcul du cadencier :** Si tu modifies les intervalles de jours dans les réglages (ajout d'un J45 par exemple), clique impérativement sur 'Recalcul Global' pour mettre à jour tout le planning en te basant sur les dates J0 initiales.
        """)
        
    with st.expander("🔓 Compte, Période d'essai et Données"):
        st.write("""
        - Durant la période d'essai, tes notes et données sont conservées **pendant 48 heures**. 
        - Passé ce délai de 48 heures sans activation ou confirmation, les données sont écrasées.
        """)

