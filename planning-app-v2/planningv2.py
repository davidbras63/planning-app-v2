import streamlit as st
import pandas as pd
import datetime as dt
from datetime import datetime, timezone
import uuid
import time
import altair as alt
import faq_module
from supabase import create_client, Client
from streamlit_clerk import clerk_auth, clerk_interface
from presentation_methode import afficher_presentation_complete

st.set_page_config(layout="wide")

# ==========================================
# CONFIGURATION SÉCURISÉE CLERK & SUPABASE
# ==========================================
# La session et l'authentification sont gérées nativement par le pont Clerk
clerk_session = clerk_auth()

SUPABASE_URL = "https://chkvewgvqchzrdyhuqiu.supabase.co"
SUPABASE_KEY = "sb_publishable_bx3KnY9iYGERGYz93X5GPQ_7Hsbw0r6"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Vérification stricte de l'authentification
if not clerk_session or not clerk_session.get("userId"):
    st.warning("Veuillez vous connecter pour accéder à votre espace de suivi.")
    clerk_interface() # Affiche l'interface native de connexion Clerk
    st.stop()

# Récupération de l'ID utilisateur unique fourni par Clerk pour le cloisonnement
current_uid = clerk_session.get("userId")

# ==========================================
# GESTION DE LA SESSION & ÉTATS
# ==========================================
if "essai_termine" not in st.session_state:
    st.session_state.essai_termine = False

if "date_inscription" not in st.session_state:
    st.session_state.date_inscription = None

if "statut_abonnement" not in st.session_state:
    st.session_state.statut_abonnement = 'active'

# ==========================================
# CHARGEMENT ET SAUVEGARDE DES DONNÉES (Cloisonné par user_id)
# ==========================================
def load_data_from_supabase():
    try:
        # 1. Chargement des données de suivi filtrées par l'utilisateur connecté
        res_data = supabase.table("tracking_data").select("*").eq("user_id", current_uid).execute()
        df = pd.DataFrame(res_data.data)
        if df.empty:
            df = pd.DataFrame(columns=['Dossier', 'Matiere', 'Chapitre', 'J_Type', 'Date', 'Note', 'Statut', 'ID'])
        else:
            df = df[['Dossier', 'Matiere', 'Chapitre', 'J_Type', 'Date', 'Note', 'Statut', 'ID']]
            df['Date'] = df['Date'].astype(str)
       
        # 2. Chargement de la configuration filtrée par l'utilisateur connecté
        res_config = supabase.table("app_config").select("*").eq("user_id", current_uid).execute()
        if res_config.data and len(res_config.data) > 0:
            config = res_config.data[0]['config_json']
        else:
            config = {
                "dossiers": {},
                "cours_max": 5,
                "cadencier": [3, 7, 14, 30, 60],
                "seuils": {"3": 12, "7": 12, "14": 12, "30": 12, "60": 12}
            }
        return df, config
    except Exception as e:
        st.error(f"Erreur de chargement Supabase : {e}")
        st.stop()

def save_all_to_supabase(df, config):
    if df is None:
        return
    try:
        # Nettoyage et forçage de l'unicité avant l'envoi en base
        df_propre = df.drop_duplicates(subset=['Dossier', 'Matiere', 'Chapitre', 'J_Type']).copy()
        df_propre['user_id'] = current_uid
       
        # Sûreté : suppression des anciennes lignes de cet utilisateur avant réécriture
        supabase.table("tracking_data").delete().eq("user_id", current_uid).execute()
       
        records = df_propre.to_dict(orient="records")
        if records:
            supabase.table("tracking_data").insert(records).execute()
       
        supabase.table("app_config").delete().eq("user_id", current_uid).execute()
        supabase.table("app_config").insert({"user_id": current_uid, "config_json": config}).execute()
       
    except Exception as e:
        st.error(f"Erreur de sauvegarde Supabase : {e}")

if 'data' not in st.session_state:
    st.session_state.data, st.session_state.config = load_data_from_supabase()

def save_all_to_sheet(df, config):
    save_all_to_supabase(df, config)

def reset_dossier():
    nom = st.session_state.d_in
    if nom and nom not in st.session_state.config['dossiers']:
        st.session_state.config['dossiers'][nom] = []
    st.session_state.d_in = ""

def reset_matiere():
    nom = st.session_state.m_in
    if nom and nom not in st.session_state.config['dossiers'][choix_dos]:
        st.session_state.config['dossiers'][choix_dos].append(nom)
    st.session_state.m_in = ""

# ==========================================
# MOTEURS DE RECALCUL CORRIGÉS ET STABLES (AVEC GESTION DE TYPES)
# ==========================================
def recuperer_et_fusionner_notes(dossier):
    mask = (st.session_state.data['Dossier'] == dossier) & (st.session_state.data['Note'].astype(float) > 0)
    df_recup = st.session_state.data[mask][['Matiere', 'Chapitre', 'J_Type', 'Note']].copy()
    df_recup['Note'] = pd.to_numeric(df_recup['Note'], errors='coerce').fillna(0.0)
    return df_recup

def appliquer_notes_sauvegardees(df_notes, df_cible):
    df_result = df_cible.copy()
    df_result['Note'] = 0.0
   
    for _, r_note in df_notes.iterrows():
        cond = (
            (df_result['Matiere'] == r_note['Matiere']) &
            (df_result['Chapitre'] == r_note['Chapitre']) &
            (df_result['J_Type'] == r_note['J_Type'])
        )
        if cond.any():
            df_result.loc[cond, 'Note'] = float(r_note['Note'])
           
    df_result['Note'] = pd.to_numeric(df_result['Note'], errors='coerce').fillna(0.0)
    return df_result

def recalculer_tous_les_chapitres_masse(dossier, cadencier):
    notes_sauvegardees = recuperer_et_fusionner_notes(dossier)

    j0_records_brut = st.session_state.data[
        (st.session_state.data['Dossier'] == dossier) &
        (st.session_state.data['J_Type'] == 'J0')
    ]
   
    chapitres_uniques = {}
    for _, row in j0_records_brut.iterrows():
        cle = (row['Matiere'], row['Chapitre'])
        if cle not in chapitres_uniques:
            exam_row = st.session_state.data[
                (st.session_state.data['Dossier'] == dossier) &
                (st.session_state.data['Matiere'] == row['Matiere']) &
                (st.session_state.data['Chapitre'] == row['Chapitre']) &
                (st.session_state.data['J_Type'] == 'Examen')
            ]
            dex_date_str = exam_row.iloc[0]['Date'] if not exam_row.empty else None
            chapitres_uniques[cle] = (row['Date'], dex_date_str)

    st.session_state.data = st.session_state.data[st.session_state.data['Dossier'] != dossier].copy()

    nouveaux_items = []
    for (matiere, chapitre), (date_j0_str, dex_date_str) in chapitres_uniques.items():
        d0_date = dt.datetime.strptime(date_j0_str, "%Y-%m-%d").date()
       
        if dex_date_str:
            dex_date = dt.datetime.strptime(dex_date_str, "%Y-%m-%d").date()
        else:
            dex_date = d0_date + dt.timedelta(days=365)

        nouveaux_items.append({
            'ID': str(uuid.uuid4()), 'Dossier': dossier, 'Matiere': matiere,
            'Chapitre': chapitre, 'J_Type': 'J0', 'Date': str(d0_date),
            'Note': 0, 'Statut': 'À faire'
        })
       
        nouveaux_items.append({
            'ID': str(uuid.uuid4()), 'Dossier': dossier, 'Matiere': matiere,
            'Chapitre': chapitre, 'J_Type': 'Examen', 'Date': str(dex_date),
            'Note': 0, 'Statut': 'À faire'
        })

        limite_revision = dex_date - dt.timedelta(days=2)

        for j in cadencier:
            date_j = d0_date + dt.timedelta(days=int(j))
           
            if date_j >= limite_revision:
                continue
               
            nouveaux_items.append({
                'ID': str(uuid.uuid4()), 'Dossier': dossier, 'Matiere': matiere,
                'Chapitre': chapitre, 'J_Type': f'J{j}', 'Date': str(date_j),
                'Note': 0, 'Statut': 'À faire'
            })
               
    if nouveaux_items:
        df_new = pd.DataFrame(nouveaux_items).drop_duplicates(subset=['Dossier', 'Matiere', 'Chapitre', 'J_Type'])
        df_new = appliquer_notes_sauvegardees(notes_sauvegardees, df_new)
        st.session_state.data = pd.concat([st.session_state.data, df_new], ignore_index=True)

    st.session_state.data = st.session_state.data.drop_duplicates(subset=['Dossier', 'Matiere', 'Chapitre', 'J_Type']).reset_index(drop=True)
    save_all_to_sheet(st.session_state.data, st.session_state.config)

# ==========================================
# AFFICHAGE DE L'APPLICATION (Menu latéral et pages)
# ==========================================
st.sidebar.title("⚙️ Pilot Expert")

# Affichage des informations de l'utilisateur connecté dans la sidebar
with st.sidebar.expander("👤 Profil", expanded=True):
    user_email = clerk_session.get("user", {}).get("primaryEmailAddress", "Utilisateur")
    st.write(f"Connecté : **{user_email}**")

with st.sidebar.expander("🛠️ Navigation rapide & Options", expanded=True):
    afficher_accueil = st.session_state.get("afficher_accueil", False)
    libelle_bouton = "📊 Revenir sur le Dashboard" if afficher_accueil else "🏠 Revenir sur la présentation"

    if st.button(libelle_bouton, use_container_width=True):
        st.session_state.afficher_accueil = not afficher_accueil
        st.rerun()

    if 'demarrer_dashboard' not in st.session_state:
        st.session_state.demarrer_dashboard = False
    st.checkbox("✅ Démarrer direct sur le Dashboard", value=st.session_state.demarrer_dashboard, key="chk_d_dash")

with st.sidebar.expander("🛠️ Réglages", expanded=False):
    st.session_state.config['cours_max'] = st.number_input("Max cours/jour", 1, 20, int(st.session_state.config.get('cours_max', 5)))
    cad_str = st.text_input("Cadencier (jours)", ",".join(map(str, st.session_state.config['cadencier'])))
    st.session_state.config['cadencier'] = [int(x.strip()) for x in cad_str.split(",")]
    
    for j in st.session_state.config['cadencier']:
        st.session_state.config['seuils'][str(j)] = st.slider(f"Seuil Note J{j}", 10, 20, int(st.session_state.config['seuils'].get(str(j), 12)))

st.sidebar.markdown("---")
st.sidebar.subheader("🔄 Recalcul Global")
if st.sidebar.button("✔️ Appliquer cadencier & recalculer tout", use_container_width=True):
    choix_dos_sidebar = st.session_state.data.loc[st.session_state.data['Dossier'].isin(list(st.session_state.config['dossiers'].keys())), 'Dossier'].values[0] if not st.session_state.data.empty else None
    if choix_dos_sidebar:
        recalculer_tous_les_chapitres_masse(choix_dos_sidebar, st.session_state.config['cadencier'])
        st.session_state.data, _ = load_data_from_supabase()
        st.success("Recalcul global appliqué avec succès !")
        st.rerun()
    else:
        st.warning("Aucun dossier actif pour lancer un recalcul global.")

liste_dossiers = list(st.session_state.config['dossiers'].keys())
if not liste_dossiers:
    st.sidebar.info("💡 Créez un dossier ci-dessous pour commencer.")
    choix_dos = ""
else:
    choix_dos = st.sidebar.selectbox("Dossier", liste_dossiers)
    
st.sidebar.text_input("Nouveau Dossier", key="d_in")
st.sidebar.button("➕ Créer Dossier", on_click=reset_dossier)
st.sidebar.text_input("Nom Matière", key="m_in")
st.sidebar.button("➕ Ajouter Matière", on_click=reset_matiere)

if "page" not in st.session_state:
    st.session_state.page = "Dashboard"

page = st.sidebar.radio(
    "Navigation",
    ["Dashboard", "Planning & Saisie", "Graphiques"],
    index=["Dashboard", "Planning & Saisie", "Graphiques"].index(st.session_state.page)
)
st.session_state.page = page

st.sidebar.markdown("---")
st.sidebar.subheader("🔗 Raccourcis")

if 'url_biomedal' not in st.session_state.config:
    st.session_state.config['url_biomedal'] = ""

url_bio = st.session_state.config['url_biomedal']

if url_bio:
    st.sidebar.link_button("🏥 Biomédal", url_bio, use_container_width=True)
else:
    with st.sidebar.popover("⚙️ Configurer Biomédal", use_container_width=True):
        lien_bio = st.text_input("Colle le lien Biomédal ici :", key="input_bio")
        if st.button("Enregistrer Biomédal", key="btn_bio"):
            st.session_state.config['url_biomedal'] = lien_bio
            st.rerun()

if 'url_fac' not in st.session_state.config:
    st.session_state.config['url_fac'] = ""

url_fac = st.session_state.config['url_fac']

if url_fac:
    st.sidebar.link_button("🎓 Fac", url_fac, use_container_width=True)
else:
    with st.sidebar.popover("⚙️ Configurer la Fac", use_container_width=True):
        lien_fac = st.text_input("Colle le lien de la Fac ici :", key="input_fac")
        if st.button("Enregistrer la Fac", key="btn_fac"):
            st.session_state.config['url_fac'] = lien_fac
            st.rerun()

st.sidebar.markdown("---")
st.sidebar.subheader("❓ Centre d'Aide")

with st.sidebar.popover("📖 Ouvrir la FAQ", use_container_width=True):
    faq_module.afficher_faq_complete()

st.sidebar.markdown("<br><br>", unsafe_allow_html=True)

# ==========================================
# LOGIQUE DES PAGES MÉTIERS
# ==========================================
if "afficher_accueil" in st.session_state and st.session_state.afficher_accueil:
    afficher_presentation_complete()
else:
    if page == "Dashboard":
        if not choix_dos:
            st.info("Sélectionnez ou créez un dossier dans le menu de gauche (Sidebar) pour afficher votre Dashboard.")
        else:
            st.title(f"🎯 Dashboard : {choix_dos}")
            with st.popover("🚨 Supprimer le dossier ?"):
                st.error("⚠️ ATTENTION : Tu vas supprimer TOUT le dossier de suivi. Cette action est irréversible !")
                if st.button("Confirmer la suppression du dossier"):
                    del st.session_state.config['dossiers'][choix_dos]
                    st.session_state.data = st.session_state.data[st.session_state.data['Dossier'] != choix_dos]
                    save_all_to_sheet(st.session_state.data, st.session_state.config)
                    st.rerun()
            
            for m in st.session_state.config['dossiers'].get(choix_dos, []):
                with st.expander(f"📚 {m}"):
                    c1, c2 = st.columns([4, 1])
                    with c2.popover("🗑️ Supprimer", key=f"pop_{m}"):
                        st.error(f"🚨 Confirmer la suppression de {m} ?")
                        if st.button("Oui, supprimer définitivement", key=f"del_{m}"):
                            st.session_state.config['dossiers'][choix_dos].remove(m)
                            st.session_state.data = st.session_state.data[(st.session_state.data['Dossier'] != choix_dos) | (st.session_state.data['Matiere'] != m)]
                            save_all_to_sheet(st.session_state.data, st.session_state.config)
                            st.rerun()
                    chapitres_matiere = st.session_state.data[(st.session_state.data['Dossier'] == choix_dos) & (st.session_state.data['Matiere'] == m)]['Chapitre'].unique()
                    if len(chapitres_matiere) > 0:
                        st.write("**Chapitres :**")
                        for c in chapitres_matiere:
                            col_ch, col_pb = st.columns([0.8, 0.2])
                            col_ch.write(f"- {c}")
                            with col_pb.popover("🗑️", key=f"pop_chap_{choix_dos}_{m}_{c}"):
                                st.error(f"Supprimer le chapitre {c} ?")
                                if st.button("Confirmer", key=f"del_chap_{choix_dos}_{m}_{c}"):
                                    st.session_state.data = st.session_state.data[
                                        ~((st.session_state.data['Dossier'] == choix_dos) &
                                        (st.session_state.data['Matiere'] == m) &
                                        (st.session_state.data['Chapitre'] == c))
                                    ]
                                    save_all_to_sheet(st.session_state.data, st.session_state.config)
                                    st.success(f"Chapitre '{c}' supprimé !")
                                    st.rerun()
                    
            st.subheader("⚠️ Rattrapages à traiter")
            df_dos = st.session_state.data[st.session_state.data['Dossier'] == choix_dos].copy()
            def est_en_rattrapage(row):
                try: note = float(str(row['Note']).replace(',', '.'))
                except: note = 0
                j_str = str(row['J_Type']).replace('J', '').replace('R', '')
                seuil = int(st.session_state.config['seuils'].get(j_str, 12))
                return note > 0 and note < seuil and row['Statut'] != 'Traité'
            
            rattrapages = df_dos[df_dos.apply(est_en_rattrapage, axis=1)]
            if rattrapages.empty:
                st.success("🎉 Aucun rattrapage à traiter pour le moment !")
            else:
                for _, row in rattrapages.iterrows():
                    c1, c2, c3 = st.columns([0.6, 0.2, 0.2])
                    c1.write(f"{row['Matiere']} | {row['Chapitre']} ({row['J_Type']}) | Note: {row['Note']}")
                    
                    if c2.button("Réintégrer", key=f"btn_{row['ID']}"):
                        date_debut = dt.datetime.strptime(row['Date'], '%Y-%m-%d')
                        all_dates = sorted(st.session_state.data[(st.session_state.data['Chapitre'] == row['Chapitre']) & (st.session_state.data['Dossier'] == choix_dos)]['Date'].unique())
                        
                        if (all_dates.index(row['Date']) + 1) < len(all_dates):
                            next_date_str = all_dates[all_dates.index(row['Date']) + 1]
                            date_limite = dt.datetime.strptime(next_date_str, '%Y-%m-%d') - dt.timedelta(days=2)
                        else:
                            date_limite = date_debut + dt.timedelta(days=365)
                        
                        place_trouvee = False
                        cours_max = int(st.session_state.config.get('cours_max', 5))
                        
                        for delta in range(1, 60):
                            test_date_dt = date_debut + dt.timedelta(days=delta)
                            test_date = test_date_dt.strftime('%Y-%m-%d')
                            
                            if test_date_dt > date_limite:
                                break
                                
                            if test_date_dt.weekday() == 6:
                                continue
                                
                            cours_ce_jour = len(st.session_state.data[(st.session_state.data['Date'] == test_date) & (st.session_state.data['Dossier'] == choix_dos)])
                            if cours_ce_jour >= cours_max:
                                continue
                            
                            if test_date not in st.session_state.data[(st.session_state.data['Chapitre'] == row['Chapitre']) & (st.session_state.data['Dossier'] == choix_dos)]['Date'].values:
                                new_row = row.copy()
                                new_row['ID'] = str(uuid.uuid4())
                                new_row['J_Type'] = f"{row['J_Type'].replace('R','')}R"
                                new_row['Date'] = test_date
                                new_row['Note'] = 0
                                new_row['Statut'] = 'À faire'
                                
                                st.session_state.data = pd.concat([st.session_state.data, pd.DataFrame([new_row])], ignore_index=True)
                                st.session_state.data.loc[st.session_state.data['ID'] == row['ID'], 'Statut'] = 'Traité'
                                save_all_to_sheet(st.session_state.data, st.session_state.config)
                                place_trouvee = True
                                break
                                
                        if place_trouvee:
                            st.rerun()
                        else:
                            st.session_state[f"erreur_place_{row['ID']}"] = True

                    if st.session_state.get(f"erreur_place_{row['ID']}", False):
                        st.error("❌ Aucune place trouvée automatiquement avec les règles actuelles.")
                        forcer_choix = st.checkbox("🙋‍♂️ Voulez-vous forcer une date manuellement ?", key=f"chk_forcer_{row['ID']}")
                        
                        if forcer_choix:
                            date_forcee = st.date_input("Sélectionne la date de repli :", value=dt.date.today(), key=f"input_date_forcee_{row['ID']}")
                            c_valider, c_annuler = st.columns(2)
                            
                            if c_valider.button("✅ Confirmer le forçage", key=f"btn_valider_force_{row['ID']}"):
                                new_row = row.copy()
                                new_row['ID'] = str(uuid.uuid4())
                                new_row['J_Type'] = f"{row['J_Type'].replace('R','')}R"
                                new_row['Date'] = str(date_forcee)
                                new_row['Note'] = 0
                                new_row['Statut'] = 'À faire'
                                
                                st.session_state.data = pd.concat([st.session_state.data, pd.DataFrame([new_row])], ignore_index=True)
                                st.session_state.data.loc[st.session_state.data['ID'] == row['ID'], 'Statut'] = 'Traité'
                                save_all_to_sheet(st.session_state.data, st.session_state.config)
                                del st.session_state[f"erreur_place_{row['ID']}"]
                                st.rerun()
                                
                            if c_annuler.button("Abandonner", key=f"btn_annuler_force_{row['ID']}"):
                                del st.session_state[f"erreur_place_{row['ID']}"]
                                st.rerun()

                    if c3.button("🗑️ Supprimer", key=f"trash_{row['ID']}"):
                        st.session_state.data = st.session_state.data[st.session_state.data['ID'] != row['ID']]
                        save_all_to_sheet(st.session_state.data, st.session_state.config)
                        if f"erreur_place_{row['ID']}" in st.session_state:
                            del st.session_state[f"erreur_place_{row['ID']}"]
                        st.rerun()

    elif page == "Planning & Saisie":
        if "modifier_dates" not in st.session_state:
            st.session_state.modifier_dates = False

        if not choix_dos:
            st.info("Sélectionnez ou créez un dossier dans le menu de gauche (Sidebar) pour accéder au planning.")
        else:
            with st.expander("✍️ Ajouter Chapitre", expanded=True):
                with st.form("Add_Form", clear_on_submit=True):
                    mat = st.selectbox("Matière", st.session_state.config['dossiers'].get(choix_dos, []))
                    chap = st.text_input("Titre")
                    d0_date = st.date_input("Date J0", value=dt.date.today())
                    dex_date = st.date_input("Date Examen", value=None)
                    submitted = st.form_submit_button("Générer Planning")
                
                if submitted and chap and dex_date:
                    st.session_state.data = st.session_state.data[
                        ~((st.session_state.data['Dossier'] == choix_dos) &
                          (st.session_state.data['Matiere'] == mat) &
                          (st.session_state.data['Chapitre'] == chap))
                    ].copy()
                    
                    new_rows = [
                        {'ID': str(uuid.uuid4()), 'Dossier': choix_dos, 'Matiere': mat, 'Chapitre': chap, 'J_Type': 'J0', 'Date': str(d0_date), 'Note': 0, 'Statut': 'À faire'},
                        {'ID': str(uuid.uuid4()), 'Dossier': choix_dos, 'Matiere': mat, 'Chapitre': chap, 'J_Type': 'Examen', 'Date': str(dex_date), 'Note': 0, 'Statut': 'À faire'}
                    ]
                    
                    for j in st.session_state.config['cadencier']:
                        d_j = d0_date + dt.timedelta(days=j)
                        if d_j <= dex_date:
                            new_rows.append({
                                'ID': str(uuid.uuid4()),
                                'Dossier': choix_dos,
                                'Matiere': mat,
                                'Chapitre': chap,
                                'J_Type': f'J{j}',
                                'Date': str(d_j),
                                'Note': 0,
                                'Statut': 'À faire'
                            })
                    
                    df_to_add = pd.DataFrame(new_rows).drop_duplicates(subset=['Dossier', 'Matiere', 'Chapitre', 'J_Type'])
                    st.session_state.data = pd.concat([st.session_state.data, df_to_add], ignore_index=True)
                    save_all_to_sheet(st.session_state.data, st.session_state.config)
                    st.rerun()

            st.subheader("🗓️ Planning Hebdomadaire")
            st.session_state.modifier_dates = st.checkbox("Activer la modification des dates (y compris les J)", st.session_state.modifier_dates)
            
            if "semaine_decalage" not in st.session_state:
                st.session_state.semaine_decalage = 0

            today = dt.date.today()
            start = today - dt.timedelta(days=today.weekday()) + dt.timedelta(days=st.session_state.semaine_decalage)

            cols = st.columns(7)
            
            for i, col in enumerate(cols):
                day_dt = start + dt.timedelta(days=i)
                day_str = day_dt.strftime('%Y-%m-%d')
                with col:
                    st.markdown(f"**{day_str[8:]}/{day_str[5:7]}**")
                    temp = st.session_state.data[(st.session_state.data['Date'] == day_str) & (st.session_state.data['Dossier'] == choix_dos)]
                    for _, r in temp.iterrows():
                        c_box, c_btn = st.columns([0.75, 0.25])
                        with c_box:
                            valide = st.checkbox(f"{r['Chapitre']} ({r['J_Type']})", value=(r['Statut'] == 'Fait'), key=f"chk_{r['ID']}")
                            if valide != (r['Statut'] == 'Fait'):
                                st.session_state.data.loc[st.session_state.data['ID'] == r['ID'], 'Statut'] = 'Fait' if valide else 'À faire'
                                save_all_to_sheet(st.session_state.data, st.session_state.config)
                                st.rerun()
                        with c_btn:
                            if st.session_state.get("modifier_dates", False):
                                with st.popover("⚙️"):
                                    import datetime
                                    try:
                                        val_date = datetime.datetime.strptime(r['Date'], "%Y-%m-%d").date()
                                    except:
                                        val_date = datetime.date.today()
                                        
                                    new_date = st.date_input("Modifier date :", value=val_date, key=f"rep_{r['ID']}")
                                    if st.button("✔️ Valider", key=f"btn_rep_{r['ID']}"):
                                        if r['J_Type'] == 'J0':
                                            st.session_state.data.loc[st.session_state.data['ID'] == r['ID'], 'Date'] = str(new_date)
                                            save_all_to_sheet(st.session_state.data, st.session_state.config)
                                            recalculer_tous_les_chapitres_masse(r['Dossier'], st.session_state.config['cadencier'])
                                            st.success("Date J0 modifiée et échéances recalculées !")
                                            st.rerun()
                                        else:
                                            st.session_state.data.loc[st.session_state.data['ID'] == r['ID'], 'Date'] = str(new_date)
                                            save_all_to_sheet(st.session_state.data, st.session_state.config)
                                            st.success("Date de révision modifiée !")

                                        time.sleep(1)
                                        st.rerun()
                            else:
                                st.write("")

            st.write("")

            col_g, col_c, col_d = st.columns([1, 1.5, 1])
            if col_g.button("⬅️", key="prev_week"):
                st.session_state.semaine_decalage -= 7
                st.rerun()
            if col_c.button("Aujourd'hui", key="today_week"):
                st.session_state.semaine_decalage = 0
                st.rerun()
            if col_d.button("➡️", key="next_week"):
                st.session_state.semaine_decalage += 7
                st.rerun()

            st.subheader("🗓️ Grille de Saisie des Notes (Aujourd'hui)")
            
            st.session_state.data['Note'] = pd.to_numeric(
                st.session_state.data['Note'].astype(str).str.replace(',', '.'),
                errors='coerce'
            ).astype(float).fillna(0.0)
            
            mask = (st.session_state.data['Date'] == str(dt.date.today())) & (st.session_state.data['Dossier'] == choix_dos)
            df_saisie = st.session_state.data[mask].copy()

            if df_saisie.empty:
                st.info("Aucune échéance (J0, J3...) prévue aujourd'hui sur ce dossier.")
            else:
                df_saisie['Note_Saisie'] = df_saisie['Note'].astype(str).replace('0.0', '').replace('0', '')
                if 'Statut' not in df_saisie.columns or df_saisie['Statut'].iloc[0] is None:
                    df_saisie['Statut'] = 'À faire'

                df_editor_view = df_saisie[['ID', 'Chapitre', 'J_Type', 'Statut', 'Note_Saisie']].reset_index(drop=True)

                config_cols = {
                    "Chapitre": st.column_config.TextColumn("📚 Chapitre", disabled=True),
                    "J_Type": st.column_config.TextColumn("⏳ Échéance", disabled=True),
                    "Statut": st.column_config.SelectboxColumn("🔄 Statut", options=["À faire", "Fait"], required=True),
                    "Note_Saisie": st.column_config.TextColumn("✍️ Saisie Notes (Ex: 12 14.5 11)", help="Notes séparées par un espace.")
                }

                edited_df = st.data_editor(
                    df_editor_view[['Chapitre', 'J_Type', 'Statut', 'Note_Saisie']],
                    column_config=config_cols,
                    use_container_width=True,
                    hide_index=True,
                    key="grille_saisie_clavier_fluide_v3"
                )

                st.write("")
                if st.button("💾 Enregistrer et Calculer les Moyennes", use_container_width=True, type="primary"):
                    if edited_df is not None:
                        try:
                            for idx_row, edited_row in edited_df.iterrows():
                                if idx_row < len(df_editor_view):
                                    row_id = df_editor_view.loc[idx_row, 'ID']
                                    st.session_state.data.loc[st.session_state.data['ID'] == row_id, 'Statut'] = edited_row['Statut']
                                    
                                    raw_notes = str(edited_row.get('Note_Saisie', '')).strip().replace(',', '.')
                                    if raw_notes and raw_notes not in ["nan", "None", "", "0", "0.0"]:
                                        try:
                                            list_nums = [float(n) for n in raw_notes.split()]
                                            if list_nums:
                                                moyenne = round(sum(list_nums) / len(list_nums), 2)
                                                st.session_state.data.loc[st.session_state.data['ID'] == row_id, 'Note'] = float(moyenne)
                                        except ValueError:
                                            pass
                                    else:
                                        st.session_state.data.loc[st.session_state.data['ID'] == row_id, 'Note'] = 0.0

                            save_all_to_sheet(st.session_state.data, st.session_state.config)
                            st.success("Moyennes calculées et sauvegardées avec succès 🎉")
                            time.sleep(1.5)
                            st.rerun()
                        except Exception as e:
                            st.error(f"Erreur d'enregistrement : {e}")

    elif page == "Graphiques":
        st.title("📊 Analyse Graphique de tes Notes")
        
        if "data" in st.session_state and not st.session_state.data.empty:
            df_brut = st.session_state.data[st.session_state.data['Dossier'] == choix_dos].copy()
            df_brut['Note_Num'] = pd.to_numeric(df_brut['Note'].astype(str).str.replace(',', '.'), errors='coerce')
            df_graphes = df_brut[(df_brut['Note_Num'].notna()) & (df_brut['Note_Num'] > 0)].copy()
            
            liste_matieres = sorted(df_graphes['Matière'].unique()) if 'Matière' in df_graphes.columns else []
            if not liste_matieres and 'Matiere' in df_graphes.columns:
                liste_matieres = sorted(df_graphes['Matiere'].unique())
                
            if liste_matieres:
                sel_mat_graph = st.selectbox("📚 Choisis la matière à analyser :", options=liste_matieres)
                col_mat = 'Matière' if 'Matière' in df_graphes.columns else 'Matiere'
                df_mat_graph = df_graphes[df_graphes[col_mat] == sel_mat_graph].copy()
                
                if not df_mat_graph.empty:
                    st.subheader(f"📈 Évolution de la moyenne réelle ({sel_mat_graph})")
                    df_mat_graph['Sort_Val'] = df_mat_graph['J_Type'].astype(str).str.extract('(\d+)').fillna(0).astype(float)
                    df_mat_graph.loc[df_mat_graph['J_Type'].astype(str).str.contains('R', case=False, na=False), 'Sort_Val'] += 0.5
                    
                    df_moy_regroupee = df_mat_graph.groupby(['J_Type', 'Sort_Val'])['Note_Num'].mean().reset_index()
                    df_moy_regroupee = df_moy_regroupee.sort_values('Sort_Val')
                    
                    chart_moyenne = alt.Chart(df_moy_regroupee).mark_line(point=True, color='blue').encode(
                        x=alt.X('J_Type', sort=alt.EncodingSortField(field='Sort_Val', order='ascending'), title='Échéance (Arrêt au dernier J complété)'),
                        y=alt.Y('Note_Num', scale=alt.Scale(domain=[0, 20]), title='Note Moyenne Réelle')
                    ).properties(height=220)
                    st.altair_chart(chart_moyenne, use_container_width=True)
                    
                    st.write("---")
                    
                    st.subheader("📋 Comparaison individuelle des grands thèmes")
                    df_mat_graph['Theme'] = df_mat_graph['Chapitre'].astype(str).str.replace(r'^\d+[\s-]*', '', regex=True).str.strip()
                    liste_themes = sorted(df_mat_graph['Theme'].unique())
                    
                    themes_selectionnes = st.multiselect(
                        f"Sélectionne jusqu'à 3 thèmes de {sel_mat_graph} :",
                        options=liste_themes,
                        default=[liste_themes[0]] if liste_themes else None,
                        max_selections=3
                    )
                    
                    if themes_selectionnes:
                        cols = st.columns(len(themes_selectionnes))
                        for i, nom_theme in enumerate(themes_selectionnes):
                            with cols[i]:
                                st.markdown(f"**Thème : {nom_theme}**")
                                df_un_theme = df_mat_graph[df_mat_graph['Theme'] == nom_theme].copy()
                                if not df_un_theme.empty:
                                    df_theme_regroupe = df_un_theme.groupby(['J_Type', 'Sort_Val'])['Note_Num'].mean().reset_index()
                                    df_theme_regroupe = df_theme_regroupe.sort_values('Sort_Val')
                                    
                                    chart_chapitre = alt.Chart(df_theme_regroupee).mark_line(point=True, color='orange').encode(
                                        x=alt.X('J_Type', sort=alt.EncodingSortField(field='Sort_Val', order='ascending'), title='Échéance'),
                                        y=alt.Y('Note_Num', scale=alt.Scale(domain=[0, 20]), title='Note Moyenne')
                                    ).properties(height=180, title="Progression réelle")
                                    st.altair_chart(chart_chapitre, use_container_width=True)
                                else:
                                    st.caption("Aucune note saisie pour ce thème.")
                    else:
                        st.info("Sélectionne au moins un thème pour afficher les mini-graphes.")
                else:
                    st.info(f"Aucune note supérieure à 0 enregistrée pour {sel_mat_graph}.")
            else:
                st.info("Aucune matière avec des notes valides trouvée pour le moment.")
        else:
            st.info("Pas de données disponibles.")

