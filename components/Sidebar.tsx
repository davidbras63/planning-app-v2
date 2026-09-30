"use client";

import { useState, useEffect, useMemo } from 'react';
import { Box, Stack, ActionIcon, Flex, Divider, Text, Modal, TextInput, Select, Button, Group, NumberInput } from '@mantine/core';
import { useParams, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Calendar, BarChart3, Settings, ExternalLink,
  LogOut, FolderPlus, BookOpenCheck, Home, ChevronLeft, Mail, Plus, HelpCircle, Palette, Target
} from 'lucide-react';
import Link from 'next/link';
import { useClerk } from '@clerk/nextjs';
import { useDisclosure } from '@mantine/hooks';
import SummerPauseButton from '@/components/SummerPauseButton';
import BackgroundPicker from '@/components/BackgroundPicker';
import { actionGetMatieresByFolder, actionSaveTraining } from '@/app/actions/trainingActions';
import {
  actionCreateMatiere,
  actionGetFolders,
  actionGetLinks,
  actionSaveLink,
  actionCreateFolder  
} from '@/app/actions/sidebarActions';

export default function Sidebar() {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(true);
    const [links, setLinks] = useState<any[]>([]);
    const [folders, setFolders] = useState<any[]>([]);
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [matiereName, setMatiereName] = useState("");
    const [folderName, setFolderName] = useState("");
    const [openedFolder, setOpenedFolder] = useState(false);
    const [openedSubject, setOpenedSubject] = useState(false);
    const [openedLink, setOpenedLink] = useState(false);
    const [linkTitle, setLinkTitle] = useState("");
    const [linkUrl, setLinkUrl] = useState("");

    // États additionnels pour la modale d'entraînement / annales complète
    const [trainingType, setTrainingType] = useState<'annales' | 'chapitre'>('annales');
    const [trainingFolderId, setTrainingFolderId] = useState<string | null>(null);
    const [trainingMatieres, setTrainingMatieres] = useState<any[]>([]);
    const [trainingMatiereId, setTrainingMatiereId] = useState<string | null>(null);
    const [trainingChapitres, setTrainingChapitres] = useState<any[]>([]);
    const [trainingChapitreId, setTrainingChapitreId] = useState<string | null>(null);
    const [trainingTitle, setTrainingTitle] = useState("");
    const [trainingScore, setTrainingScore] = useState<number | ''>('');
    const [trainingMaxScore, setTrainingMaxScore] = useState<number | ''>(20);

    const { signOut } = useClerk();
    const params = useParams();
    const urlFolderId = params?.folderId as string | null;
    const currentFolderId = useMemo(() => {
		return urlFolderId || (folders.length > 0 ? folders[0].value : null);
	}, [urlFolderId, folders]);

	// État pour la modale d'entraînement / annales avec injection automatique du dossier actif
	const [openedTraining, { open: baseOpenTraining, close: closeTraining }] = useDisclosure(false);
	const openTraining = () => {
		if (currentFolderId && !trainingFolderId) {
			setTrainingFolderId(currentFolderId);
		}
		baseOpenTraining();
	};

    // État pour la modale de personnalisation du fond
    const [openedBackground, { open: openBackground, close: closeBackground }] = useDisclosure(false);

    useEffect(() => {
        let isMounted = true;
        const loadData = async () => {
            const dataLinks = await actionGetLinks();
            const dataFolders = await actionGetFolders();
           
            if (isMounted) {
                setLinks(dataLinks || []);
                if (dataFolders && dataFolders.length > 0) {
                    const formattedFolders = dataFolders.map((f: any) => ({ value: String(f.id), label: f.nom || f.name }));
                    setFolders(formattedFolders);
                }
            }
        };
        loadData();
        return () => { isMounted = false; };
    }, []);

    // Chargement dynamique des matières selon le dossier sélectionné dans l'entraînement
    useEffect(() => {
        let isMounted = true;
        const fetchMatieres = async () => {
            if (!trainingFolderId) {
                setTrainingMatieres([]);
                setTrainingMatiereId(null);
                setTrainingChapitres([]);
                setTrainingChapitreId(null);
                return;
            }
            const res = await actionGetMatieresByFolder(trainingFolderId);
            if (isMounted) {
                if (res?.success && res.matieres) {
                    setTrainingMatieres(res.matieres.map((m: any) => ({ value: String(m.id), label: m.nom, chapitres: m.chapitres || [] })));
                } else {
                    setTrainingMatieres([]);
                }
                setTrainingMatiereId(null);
                setTrainingChapitres([]);
                setTrainingChapitreId(null);
            }
        };
        fetchMatieres();
        return () => { isMounted = false; };
    }, [trainingFolderId]);

    // Chargement dynamique des chapitres selon la matière sélectionnée
    useEffect(() => {
        if (!trainingMatiereId) {
            setTrainingChapitres([]);
            setTrainingChapitreId(null);
            return;
        }
        const selectedMat = trainingMatieres.find(m => m.value === trainingMatiereId);
        if (selectedMat && selectedMat.chapitres) {
            setTrainingChapitres(selectedMat.chapitres.map((c: any) => ({ value: String(c.id), label: c.titre || c.name })));
        } else {
            setTrainingChapitres([]);
        }
        setTrainingChapitreId(null);
    }, [trainingMatiereId, trainingMatieres]);

    const handleCreateFolder = () => setOpenedFolder(true);
    const handleCreateSubject = () => setOpenedSubject(true);
    const handleAddLink = () => setOpenedLink(true);

    return (
        <Box style={{ width: isOpen ? '250px' : '70px', height: '100%', backgroundColor: '#141517', transition: 'width 0.3s', display: 'flex', flexDirection: 'column' }} p="md">
            <Stack h="100%" justify="space-between" style={{ overflowY: 'auto', overflowX: 'hidden', flex: 1 }} className="custom-scroll">
                <Stack gap="xs">
					<div style={{ padding: '0px', margin: '-30px 0px 0px -25px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
						<img src="/logo.png" alt="Logo Nesis" style={{ height: '120px', width: 'auto', filter: 'brightness(0) saturate(100%) invert(70%) sepia(80%) saturate(800%) hue-rotate(130deg)' }} />
					</div>
                    <Flex justify={isOpen ? "space-between" : "center"} align="center" mb="md">
                        {isOpen && <Link href="/?from=menu" style={{ color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}><Home size={18} /> Accueil</Link>}
                        <ActionIcon onClick={() => setIsOpen(!isOpen)} variant="subtle"><ChevronLeft size={18} /></ActionIcon>
                    </Flex>

                    <Link href={currentFolderId ? `/protected/dashboard/${currentFolderId}` : "/protected/dashboard"} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', color: '#888286', textDecoration: 'none' }}><LayoutDashboard size={20} />{isOpen && "Dashboard"}</Link>
					<Link href={currentFolderId ? `/protected/planning/${currentFolderId}` : "/protected/planning"} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', color: '#888286', textDecoration: 'none' }}><Calendar size={20} />{isOpen && "Planning"}</Link>
					<Link href={currentFolderId ? `/protected/graphiques/${currentFolderId}` : "/protected/graphiques"} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', color: '#888286', textDecoration: 'none' }}><BarChart3 size={20} />{isOpen && "Graphiques"}</Link>
					
					<Box 
						style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', color: '#888286', textDecoration: 'none', borderRadius: '8px' }} 
						onClick={openTraining}
						className="hover:bg-slate-800 hover:text-white transition"
					>
						<Target size={20} /> {isOpen && "Entraînement / Annales"}
					</Box>
													
					<Link href={currentFolderId ? `/protected/settings/${currentFolderId}` : "/protected/settings"} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', color: '#888286', textDecoration: 'none' }}><Settings size={20} />{isOpen && "Paramètres"}</Link>

                    <Box 
                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', color: '#888286', textDecoration: 'none', borderRadius: '8px' }} 
                        onClick={openBackground}
                        className="hover:bg-slate-800 hover:text-white transition"
                    >
                        <Palette size={20} /> {isOpen && "Personnalisation"}
                    </Box>

                    <Divider my="sm" />
                    <Box style={{ cursor: 'pointer', color: '#69db7c', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px' }} onClick={handleCreateFolder}><FolderPlus size={20} /> {isOpen && "Créer Dossier"}</Box>
                    <Box style={{ cursor: 'pointer', color: '#fab005', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px' }} onClick={handleCreateSubject}><BookOpenCheck size={20} /> {isOpen && "Créer Matière"}</Box>
                   
                    <Divider my="sm" />
                    <Text size="xs" color="#5c5f66" p="xs">{isOpen && "MES LIENS"}</Text>
                    {links.map((link) => (
                       <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', color: '#909296', textDecoration: 'none' }}>
                          <ExternalLink size={18} /> {isOpen && link.label}
                      </a>
                    ))}
                    <Box style={{ cursor: 'pointer', color: '#909296', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px' }} onClick={handleAddLink}><Plus size={20} /> {isOpen && "Ajouter Lien"}</Box>

                    <Divider my="sm" />
                    <Link href="/contact" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', color: '#909296', textDecoration: 'none' }}>
					  <HelpCircle size={20} />
					  {isOpen && "Contact"}
					</Link>
                    <Link href="/faq" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', color: '#909296', textDecoration: 'none' }}>
					   <HelpCircle size={20} /> {isOpen && "Prise en main"}
					</Link>
                </Stack>
				
				<SummerPauseButton />
				
                <Box style={{ cursor: 'pointer', color: '#ff6b6b', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', marginTop: '20px' }} onClick={() => signOut()}>
                    <LogOut size={20} /> {isOpen && "Déconnexion"}
                </Box>
            </Stack>
           
            <Modal opened={openedFolder} onClose={() => setOpenedFolder(false)} title="Nouveau Dossier">
                <Stack gap="md">
                    <TextInput 
                        label="Nom du dossier" 
                        placeholder="Ex: Semestre 1 ou Première année ou nom de la formation...."
                        value={folderName}
                        onChange={(e) => setFolderName(e.currentTarget.value)}
                    />
                    <Button onClick={async () => {
                        if (!folderName) {
                            alert("Mets un nom pour le dossier !");
                            return;
                        }
                        await actionCreateFolder(folderName);
                        setOpenedFolder(false);
                        setFolderName("");
                        router.refresh();
                    }}>
                        Créer le dossier
                    </Button>
                </Stack>
            </Modal>

            <Modal opened={openedSubject} onClose={() => setOpenedSubject(false)} title="Nouvelle Matière">
                <Stack gap="md">
                    <Select 
                        label="Dossier cible"
                        placeholder="Sélectionne un dossier"
                        data={folders}
                        value={selectedFolderId}
                        onChange={setSelectedFolderId}
                    />
                    <TextInput 
                        label="Nom de la matière" 
                        placeholder="Ex: Mathématiques ou Chimie..."
                        value={matiereName}
                        onChange={(e) => setMatiereName(e.currentTarget.value)}
                    />
                    <Button onClick={async () => {
                        if (!selectedFolderId || !matiereName) {
                            alert("Sélectionne un dossier et mets un nom !");
                            return;
                        }
                        await actionCreateMatiere(matiereName, selectedFolderId);
                        setOpenedSubject(false);
                        setMatiereName("");
                        router.refresh();
                    }}>
                        Créer la matière
                    </Button>
                </Stack>
            </Modal>

			<Modal opened={openedLink} onClose={() => setOpenedLink(false)} title="Ajouter un lien">
                <Stack gap="md">
                    <TextInput
                        label="Titre du lien"
                        placeholder="Ex: YouTube"
                        value={linkTitle}
                        onChange={(e) => setLinkTitle(e.currentTarget.value)}
                    />
                    <TextInput
                        label="Adresse du lien (URL)"
                        placeholder="Ex: https://www.youtube.com"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.currentTarget.value)}
                    />
                    <Button onClick={async () => {
                        if (!linkTitle || !linkUrl) {
                            alert("Remplis bien les deux champs !");
                            return;
                        }
                        await actionSaveLink(linkTitle, linkUrl);
                        setOpenedLink(false);
                        setLinkTitle("");
                        setLinkUrl("");
                        router.refresh();
                    }}>
                        Enregistrer le lien
                    </Button>
                </Stack>
            </Modal>

            {/* Modale d'entraînement / annales complète */}
            <Modal opened={openedTraining} onClose={closeTraining} title="Espace Entraînement / Annales" size="lg">
                <Stack gap="md">
                    <Text size="sm" c="dimmed">
                        Enregistre tes notes soit en mode Annales (global par date), soit en mode Chapitre (lié au planning J0 existant).
                    </Text>

                    <Group grow>
                        <Button 
                            variant={trainingType === 'annales' ? 'filled' : 'outline'}
                            onClick={() => setTrainingType('annales')}
                        >
                            Mode Annales
                        </Button>
                        <Button 
                            variant={trainingType === 'chapitre' ? 'filled' : 'outline'}
                            onClick={() => setTrainingType('chapitre')}
                        >
                            Mode Chapitre
                        </Button>
                    </Group>

                    <Select
                        label="Dossier cible"
                        placeholder="Sélectionne un dossier"
                        data={folders}
                        value={trainingFolderId}
                        onChange={setTrainingFolderId}
                        clearable
                    />

                    <Select
                        label="Matière"
                        placeholder="Sélectionne une matière"
                        data={trainingMatieres}
                        value={trainingMatiereId}
                        onChange={setTrainingMatiereId}
                        disabled={!trainingFolderId}
                        clearable
                    />

                    {trainingType === 'chapitre' && (
                        <Select
                            label="Chapitre"
                            placeholder="Sélectionne un chapitre"
                            data={trainingChapitres}
                            value={trainingChapitreId}
                            onChange={setTrainingChapitreId}
                            disabled={!trainingMatiereId}
                            clearable
                        />
                    )}

                    {trainingType === 'annales' && (
                        <TextInput
                            label="Titre des Annales / Examen"
                            placeholder="Ex: Annales Concours 2024"
                            value={trainingTitle}
                            onChange={(e) => setTrainingTitle(e.currentTarget.value)}
                        />
                    )}

                    <Group grow>
                        <NumberInput
                            label="Note obtenue"
                            placeholder="Ex: 14"
                            value={trainingScore}
                            onChange={(val) => setTrainingScore(val)}
                        />
                        <NumberInput
                            label="Sur (Note maximale)"
                            placeholder="Ex: 20"
                            value={trainingMaxScore}
                            onChange={(val) => setTrainingMaxScore(val)}
                        />
                    </Group>

                    <Button 
                        mt="md" 
                        onClick={async () => {
                            if (!trainingFolderId || !trainingMatiereId || trainingScore === '') {
                                alert("Merci de remplir au moins le dossier, la matière et la note !");
                                return;
                            }
                            if (trainingType === 'chapitre' && !trainingChapitreId) {
                                alert("Sélectionne un chapitre pour le mode Chapitre !");
                                return;
                            }
                            if (trainingType === 'annales' && !trainingTitle) {
                                alert("Donne un titre à tes annales !");
                                return;
                            }

                            const res = await actionSaveTraining({
                                type: trainingType,
                                folderId: trainingFolderId,
                                matiereId: trainingMatiereId,
                                chapitreId: trainingChapitreId,
                                title: trainingTitle,
                                score: trainingScore,
                                maxScore: trainingMaxScore
                            });

                            if (res?.success) {
                                alert("Entraînement enregistré avec succès !");
                                closeTraining();
                                setTrainingTitle("");
                                setTrainingScore("");
                              router.refresh();
                            } else {
                                alert("Erreur lors de l'enregistrement.");
                            }
                        }}
                  >
                        Enregistrer l'entraînement
                  </Button>
              </Stack>
          </Modal>

          <BackgroundPicker opened={openedBackground} onClose={closeBackground} />
      </Box>
    );
}