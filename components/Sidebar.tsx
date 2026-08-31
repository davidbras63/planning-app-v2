"use client";

import { useState, useEffect,useMemo } from 'react';
import { Box, Stack, ActionIcon, Flex, Divider, Text, Modal, TextInput, Select, Button } from '@mantine/core';
import { useParams } from 'next/navigation';
import {
  LayoutDashboard, Calendar, BarChart3, Settings, ExternalLink,
  LogOut, FolderPlus, BookOpenCheck, Home, ChevronLeft, Mail, Plus, HelpCircle
} from 'lucide-react';
import Link from 'next/link';
import { useClerk } from '@clerk/nextjs';
import {
  actionCreateMatiere,
  actionGetFolders,
  actionGetLinks,
  actionSaveLink,
  actionCreateFolder  
} from '@/app/actions/sidebarActions';

export default function Sidebar() {
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

    const { signOut } = useClerk();
    const params = useParams();
    const urlFolderId = params?.folderId as string | null;
    const currentFolderId = useMemo(() => {
		return urlFolderId || (folders.length > 0 ? folders[0].value : null);
	}, [urlFolderId, folders]);

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
                    // On retire le setSelectedFolderId d'ici pour stopper le re-rendu en cascade chaotique
                }
            }
        };
        loadData();
        return () => { isMounted = false; };
    }, []);

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
                        {isOpen && <Link href="/" style={{ color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}><Home size={18} /> Accueil</Link>}
                        <ActionIcon onClick={() => setIsOpen(!isOpen)} variant="subtle"><ChevronLeft size={18} /></ActionIcon>
                    </Flex>

                    <Link href={currentFolderId ? `/protected/dashboard/${currentFolderId}` : "/protected/dashboard"} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', color: '#888286', textDecoration: 'none' }}><LayoutDashboard size={20} />{isOpen && "Dashboard"}</Link>
					<Link href={currentFolderId ? `/protected/planning/${currentFolderId}` : "/protected/planning"} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', color: '#888286', textDecoration: 'none' }}><Calendar size={20} />{isOpen && "Planning"}</Link>
					<Link href={currentFolderId ? `/protected/graphiques/${currentFolderId}` : "/protected/graphiques"} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', color: '#888286', textDecoration: 'none' }}><BarChart3 size={20} />{isOpen && "Graphiques"}</Link>
					<Link href={currentFolderId ? `/protected/settings/${currentFolderId}` : "/protected/settings"} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', color: '#888286', textDecoration: 'none' }}><Settings size={20} />{isOpen && "Paramètres"}</Link>

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
                        window.location.reload();
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
                        window.location.reload();
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
                        window.location.reload();
                    }}>
                        Enregistrer le lien
                    </Button>
                </Stack>
            </Modal>

        </Box>
    );
}
