import streamlit as st

def afficher_presentation_complete():
    st.markdown("<h1 style='text-align: center; color: #FF4B4B;'>📖 Présentation : Pilot Expert</h1>", unsafe_allow_html=True)
    st.markdown("<h3 style='text-align: center; color: #777;'>Optimisez votre mémorisation, automatisez votre planning.</h3>", unsafe_allow_html=True)
    st.write("---")

    tabs = st.tabs(["🚀 Concept", "⚙️ Réglages", "📅 Planning", "📊 Dashboard", "📈 Analyse"])
   
    with tabs[0]:
        st.markdown("### 🚀 La Philosophie Pilot Expert")
        st.write("""
        Pilot Expert est basé sur la **répétition espacée**. L'idée est simple : réviser une information juste avant de l'oublier. 
        L'application gère toute la mécanique temporelle pour vous permettre de vous concentrer uniquement sur l'apprentissage.
        * **Automatisation :** Vous fixez vos règles, l'application génère le planning.
        * **Adaptabilité :** Le système détecte vos lacunes et propose des solutions de rattrapage intelligentes.
        * **Centralisation :** Un seul endroit pour le planning, les notes, le suivi de progression et les liens vers vos cours.
        """)
        
    with tabs[1]:
        st.markdown("### ⚙️ Centre de Contrôle (Réglages & Sidebar)")
        st.write("""
        La barre latérale est le moteur de votre réussite :
        * **Cadencier de révision :** Définissez vos intervalles (ex: J3, J7, J14). Vous pouvez ajouter autant de j que vous voulez.
        * **Recalcul Global :** C’est votre bouton "Sérénité". Après toute modification du cadencier, ce bouton recalcule l'intégralité de votre planning en se basant sur les dates J0 initiales, sans intervention manuelle sur chaque chapitre.
        * **Seuils et Limites :** 
            * *Seuils de note :* Définissez la note minimale (ex: 12/20) pour valider une échéance. En dessous, le chapitre est marqué "à rattraper".
            * *Max cours/jour :* **Attention, ce réglage est exclusif.** Il ne limite pas votre saisie manuelle. Il sert uniquement de garde-fou au bouton "Réintégrer" pour éviter de surcharger vos journées lors des remplacements automatiques.
        * **Configuration :** Créez vos dossiers (ex: PASS? LAS? HEC...) et rattachez-y vos matières et chapitres pour structurer vos révisions.
        """)

    with tabs[2]:
        st.markdown("### 📅 Maîtrise du Planning")
        st.write("""
        * **Création d'un chapitre :** Renseignez la matière, le titre, le J0 et surtout **la date de l'examen**. Cette date est votre limite de sécurité : l'outil n'ajoutera jamais de révision trop proche de l'épreuve.
        * **Déplacement (Recalcul intelligent) :** Si vous changez la date d'un J0 (via l'option "Modifier les dates"), toutes les échéances futures (J3, J7, etc.) sont automatiquement décalées pour rester cohérentes.
        * **Grille de Saisie de Notes :** Optimisée pour la vitesse : tapez votre note, appuyez sur **Entrée**, et le système enregistre tout en passant automatiquement à la ligne suivante.
        """)

    with tabs[3]:
        st.markdown("### 📊 Dashboard & Réintégration")
        st.write("""
        Si une note est insuffisante, le bouton "Réintégrer" automatise votre rattrapage en suivant trois règles strictes :
        1. **Marge de sécurité :** Il cherche le premier créneau libre jusqu'à moins 2 jours de l'échéance suivante.
        2. **Repos :** Il exclut automatiquement les dimanches.
        3. **Charge de travail :** Il respecte votre limite de "Max cours/jour" pour ne jamais saturer votre emploi du temps.
        * **Traçabilité :** Une fois réintégrée, l'ancienne session est marquée comme "Traitée" pour garder un historique propre la réintegration apparaissant elle dans le plannning notée avec r pour diferencié les cours de rattrapage.
        """)
    
    with tabs[4]:
        st.markdown("### 📈 Analyse Graphique")
        st.write("""
        Ne pilotez plus à l'aveugle :
        * **Évolution Moyenne :** Visualisez la progression de vos notes sur chaque échéance. Une courbe montante est le signe que votre mémorisation est efficace.
        * **Comparatif Thématique :** Sélectionnez jusqu'à 3 chapitres pour comparer leurs courbes. Si un chapitre stagne par rapport à la moyenne globale, vous savez immédiatement lequel mérite une attention particulière.
        """)