"use client";

import { useState, useEffect, useMemo } from 'react';
import { Box, Stack, ActionIcon, Flex, Divider, Text, Modal, TextInput, Select, Button, Group, Checkbox, Table } from '@mantine/core';
import { useParams, useRouter } from 'next/navigation';
import {
    LayoutDashboard, Calendar, BarChart3, Settings, ExternalLink,
    LogOut, FolderPlus, BookOpenCheck, Home, ChevronLeft, Plus, HelpCircle, Palette, Target
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

    // États pour l'entraînement / annales
    const [trainingType, setTrainingType] = useState<'annales' | 'chapitre'>('annales');
    const [trainingFolderId, setTrainingFolderId] = useState<string | null>(null);
    const [trainingMatieres, setTrainingMatieres] = useState<any[]>([]);
    const [trainingMatiereId, setTrainingMatiereId] = useState<string | null>(null);
    
    // États pour les notes libres par matière (Mode Annales)
    const [annalesInputs, setAnnalesInputs] = useState<{ [matiereId: string]: string }>({});
    
    // États pour la sélection multiple de chapitres (Mode Chapitre)
    const [availableChapitres, setAvailableChapitres] = useState<any[]>([]);
    const [selectedChapitreIds, setSelectedChapitreIds] = useState<string[]>([]);
    const [chapitreInputs, setChapitreInputs] = useState<{ [chapitreId: string]: string }>({});

    const { signOut } = useClerk();
    const params = useParams();
    const urlFolderId = params?.folderId as string | null;
    const currentFolderId = useMemo(() => {
        return urlFolderId || (folders.length > 0 ? folders[0].value : null);
    }, [urlFolderId, folders]);

    const [openedTraining, { open: baseOpenTraining, close: closeTraining }] = useDisclosure(false);
    const openTraining = () => {
        if (currentFolderId && !trainingFolderId) {
            setTrainingFolderId(currentFolderId);
        }
        baseOpenTraining();
    };

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

    // Chargement dynamique des matières et de leurs chapitres selon le dossier
    useEffect(() => {
        let isMounted = true;
        const fetchMatieres = async () => {
            if (!trainingFolderId) {
                setTrainingMatieres([]);
                setTrainingMatiereId(null);
                setAvailableChapitres([]);
                setSelectedChapitreIds([]);
                return;
            }
            const res = await actionGetMatieresByFolder(trainingFolderId);
            if (isMounted) {
                if (res?.success && res.matieres) {
                    setTrainingMatieres(res.matieres);
                } else {
                    setTrainingMatieres([]);
                }
                setTrainingMatiereId(null);
                setAvailableChapitres([]);
                setSelectedChapitreIds([]);
                setAnnalesInputs({});
            }
        };
        fetchMatieres();
        return () => { isMounted = false; };
    }, [trainingFolderId]);

    // Chargement des chapitres quand on sélectionne une matière en mode chapitre
    useEffect(() => {
        if (!trainingMatiereId) {
            setAvailableChapitres([]);
            setSelectedChapitreIds([]);
            return;
        }
        const selectedMat = trainingMatieres.find(m => String(m.id) === trainingMatiereId);
        if (selectedMat && selectedMat.chapitres) {
            setAvailableChapitres(selectedMat.chapitres);
        } else {
            setAvailableChapitres([]);
        }
        setSelectedChapitreIds([]);
        setChapitreInputs({});
    }, [trainingMatiereId, trainingMatieres]);

    // Fonction utilitaire pour parser et calculer la moyenne d'une saisie libre (ex: "15 25/30 14/15")
    const calculateAverage = (rawInput: string) => {
        if (!rawInput.trim()) return null;
        const parts = rawInput.trim().split(/\s+/);
        let totalScore = 0;
        let totalMax = 0;
        let count = 0;

        for (const part of parts) {
            if (part.includes('/')) {
                const [valStr, maxStr] = part.split('/');
                const val = parseFloat(valStr);
                const max = parseFloat(maxStr);
                if (!isNaN(val) && !isNaN(max) && max > 0) {
                    // Normalisation sur 20 pour faire la moyenne proprement
                    totalScore += (val / max) * 20;
                    totalMax += 20;
                    count++;
                }
            } else {
                const val = parseFloat(part);
                if (!isNaN(val)) {
                    totalScore += val;
                    totalMax += 20; // Par défaut sur 20 si pas de barème précisé
                    count++;
                }
            }
        }

        if (count === 0 || totalMax === 0) return null;
        return Number(((totalScore / totalMax) * 20).toFixed(2));
    };

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

            {/* Modale d'entraînement / annales unifiée en tableau de saisie libre */}
            <Modal opened={openedTraining} onClose={closeTraining} title="Espace Entraînement / Annales" size="xl">
                <Stack gap="md">
                    <Text size="sm" c="dimmed">
                        Enregistre tes notes en saisie libre (ex: 15 ou 25/30 espace 14/15). La moyenne s'effectue automatiquement.
                    </Text>

                    <Group grow>
                        <Button 
                            variant={trainingType === 'annales' ? 'filled' : 'outline'}
                            onClick={() => setTrainingType('annales')}
                        >
                            Mode Annales (Global Dossier)
                        </Button>
                        <Button 
                            variant={trainingType === 'chapitre' ? 'filled' : 'outline'}
                            onClick={() => setTrainingType('chapitre')}
                        >
                            Mode Chapitre (Sélection multiple)
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

                    {trainingType === 'annales' && (
                        <>
                            <Text size="sm" fw={500} mt="xs">Saisie des notes par matière :</Text>
                            {trainingMatieres.length === 0 ? (
                                <Text size="sm" c="dimmed">Aucune matière trouvée dans ce dossier.</Text>
                            ) : (
                                <Table highlightOnHover withTableBorder>
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>Matière</Table.Th>
                                            <Table.Th>Notes (saisie libre)</Table.Th>
                                            <Table.Th>Moyenne calculée</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {trainingMatieres.map((mat) => {
                                            const val = annalesInputs[mat.id] || "";
                                            const avg = calculateAverage(val);
                                            return (
                                                <Table.Tr key={mat.id}>
                                                    <Table.Td fw={500}>{mat.nom}</Table.Td>
                                                    <Table.Td>
                                                        <TextInput
                                                            placeholder="Ex: 15 25/30 14/15"
                                                            value={val}
                                                            onChange={(e) => setAnnalesInputs({ ...annalesInputs, [mat.id]: e.currentTarget.value })}
                                                        />
                                                    </Table.Td>
                                                    <Table.Td>
                                                        {avg !== null ? `${avg} / 20` : '-'}
                                                    </Table.Td>
                                                </Table.Tr>
                                            );
                                        })}
                                    </Table.Tbody>
                                </Table>
                            )}
                        </>
                    )}

                    {trainingType === 'chapitre' && (
                        <Stack gap="sm">
                            <Select
                                label="Matière"
                                placeholder="Sélectionne une matière"
                                data={trainingMatieres.map(m => ({ value: String(m.id), label: m.nom }))}
                                value={trainingMatiereId}
                                onChange={setTrainingMatiereId}
                                disabled={!trainingFolderId}
                                clearable
                            />

                            {trainingMatiereId && (
                                <>
                                    <Text size="sm" fw={500} mt="xs">Sélectionne les chapitres :</Text>
                                    {availableChapitres.length === 0 ? (
                                        <Text size="sm" c="dimmed">Aucun chapitre disponible pour cette matière.</Text>
                                    ) : (
                                        <Stack gap="xs" pl="xs">
                                            {availableChapitres.map((chap) => {
                                                const isChecked = selectedChapitreIds.includes(String(chap.id));
                                                return (
                                                    <Checkbox
                                                        key={chap.id}
                                                        label={chap.titre || chap.name}
                                                        checked={isChecked}
                                                        onChange={(e) => {
                                                            if (e.currentTarget.checked) {
                                                                setSelectedChapitreIds([...selectedChapitreIds, String(chap.id)]);
                                                            } else {
                                                                setSelectedChapitreIds(selectedChapitreIds.filter(id => id !== String(chap.id)));
                                                            }
                                                        }}
                                                    />
                                                );
                                            })}
                                        </Stack>
                                    )}

                                    {selectedChapitreIds.length > 0 && (
                                        <>
                                            <Text size="sm" fw={500} mt="md">Tableau de saisie des notes par chapitre :</Text>
                                            <Table highlightOnHover withTableBorder>
                                                <Table.Thead>
                                                    <Table.Tr>
                                                        <Table.Th>Chapitre</Table.Th>
                                                        <Table.Th>Notes (saisie libre)</Table.Th>
                                                        <Table.Th>Moyenne calculée</Table.Th>
                                                    </Table.Tr>
                                                </Table.Thead>
                                                <Table.Tbody>
                                                    {selectedChapitreIds.map((chapId) => {
                                                        const chap = availableChapitres.find(c => String(c.id) === chapId);
                                                        const val = chapitreInputs[chapId] || "";
                                                        const avg = calculateAverage(val);
                                                        return (
                                                            <Table.Tr key={chapId}>
                                                                <Table.Td fw={500}>{chap?.titre || chap?.name}</Table.Td>
                                                                <Table.Td>
                                                                    <TextInput
                                                                        placeholder="Ex: 14 18/20"
                                                                        value={val}
                                                                        onChange={(e) => setChapitreInputs({ ...chapitreInputs, [chapId]: e.currentTarget.value })}
                                                                    />
                                                                </Table.Td>
                                                                <Table.Td>
                                                                    {avg !== null ? `${avg} / 20` : '-'}
                                                                </Table.Td>
                                                            </Table.Tr>
                                                        );
                                                    })}
                                                </Table.Tbody>
                                            </Table>
                                        </>
                                    )}
                                </>
                            )}
                        </Stack>
                    )}

                    <Button 
                        mt="md" 
                        onClick={async () => {
                            if (!trainingFolderId) {
                                alert("Sélectionne un dossier !");
                                return;
                            }

                            let successCount = 0;

                            if (trainingType === 'annales') {
                                for (const [matiereId, rawInput] of Object.entries(annalesInputs)) {
                                    const avg = calculateAverage(rawInput);
                                    if (avg !== null) {
                                        const res = await actionSaveTraining({
                                            type: 'annales',
                                            folderId: trainingFolderId,
                                            matiereId,
                                            chapitreId: null,
                                            title: 'Saisie Annales',
                                            score: avg,
                                            maxScore: 20
                                        });
                                        if (res?.success) successCount++;
                                    }
                                }
                            } else {
                                for (const chapId of selectedChapitreIds) {
                                    const rawInput = chapitreInputs[chapId] || "";
                                    const avg = calculateAverage(rawInput);
                                    if (avg !== null && trainingMatiereId) {
                                        const res = await actionSaveTraining({
                                            type: 'chapitre',
                                            folderId: trainingFolderId,
                                            matiereId: trainingMatiereId,
                                            chapitreId: chapId,
                                            title: 'Saisie Chapitre',
                                            score: avg,
                                            maxScore: 20
                                        });
                                        if (res?.success) successCount++;
                                    }
                                }
                            }

                            if (successCount > 0) {
                                alert("Entraînements enregistrés avec succès !");
                                closeTraining();
                                setAnnalesInputs({});
                                setChapitreInputs({});
                                setSelectedChapitreIds([]);
                                router.refresh();
                            } else {
                                alert("Aucune note valide à enregistrer.");
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