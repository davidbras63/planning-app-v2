"use client";

import { useState, useEffect } from 'react';
import { Box, Stack, ActionIcon, Flex, Divider, Text } from '@mantine/core';
import {
  LayoutDashboard, Calendar, BarChart3, Settings, ExternalLink,
  LogOut, FolderPlus, BookOpenCheck, Home, ChevronLeft, Mail, Cloud, Plus
} from 'lucide-react';
import Link from 'next/link';
import { useClerk } from '@clerk/nextjs';
import { 
  actionCreateMatiere, 
  actionGetMatieres, 
  actionCreateChapitre, 
  actionGetLinks, 
  actionSaveLink 
} from '@/app/actions/sidebarActions';


export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const [links, setLinks] = useState<any[]>([]);
  const { signOut } = useClerk();

  // Chargement initial des liens persistants
  useEffect(() => {
    const loadLinks = async () => {
      const data = await actionGetLinks();
      setLinks(data);
    };
    loadLinks();
  }, []);

  // Handlers pour les actions
  const handleCreateFolder = async () => {
    const name = prompt("Nom du nouveau dossier :");
    if (name) { await actionCreateFolder(name); window.location.reload(); }
  };

  const handleCreateSubject = async () => {
    const foldersList = await actionGetFolders();
    if (foldersList.length === 0) { alert("Crée d'abord un dossier !"); return; }
    
    const name = prompt("Nom de la matière :");
    if (!name) return;
    
    const list = foldersList.map((f, i) => `${i + 1}. ${f.name}`).join('\n');
    const choice = prompt(`Dans quel dossier ? (numéro) :\n${list}`);
    
    const idx = parseInt(choice || "") - 1;
    if (foldersList[idx]) {
      await actionCreateSubject(name, foldersList[idx].id);
      window.location.reload();
    }
  };

  const handleAddLink = async () => {
    const title = prompt("Titre du lien :");
    const url = prompt("URL (ex: https://...) :");
    if (title && url) { await actionSaveLink(title, url); window.location.reload(); }
  };

  return (
    <Box style={{ width: isOpen ? '250px' : '70px', height: '100%', backgroundColor: '#141517', transition: 'width 0.3s', overflow: 'hidden' }} p="md">
      <Stack h="100%" justify="space-between">
        <Stack gap="xs">
          <Flex justify={isOpen ? "space-between" : "center"} align="center" mb="md">
            {isOpen && <Link href="/" style={{ color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}><Home size={18} /> Accueil</Link>}
            <ActionIcon onClick={() => setIsOpen(!isOpen)} variant="subtle"><ChevronLeft size={18} /></ActionIcon>
          </Flex>

          <Link href="/protected/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', color: '#909296', textDecoration: 'none' }}><LayoutDashboard size={20} />{isOpen && "Dashboard"}</Link>
          <Link href="/protected/planning" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', color: '#909296', textDecoration: 'none' }}><Calendar size={20} />{isOpen && "Planning"}</Link>
          <Link href="/protected/graphiques" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', color: '#909296', textDecoration: 'none' }}><BarChart3 size={20} />{isOpen && "Graphiques"}</Link>
          <Link href="/protected/settings" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', color: '#909296', textDecoration: 'none' }}><Settings size={20} />{isOpen && "Paramètres"}</Link>

          <Divider my="sm" />
          <Box style={{ cursor: 'pointer', color: '#69db7c', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px' }} onClick={handleCreateFolder}><FolderPlus size={20} /> {isOpen && "Créer Dossier"}</Box>
          <Box style={{ cursor: 'pointer', color: '#fab005', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px' }} onClick={handleCreateSubject}><BookOpenCheck size={20} /> {isOpen && "Créer Matière"}</Box>
          
          <Divider my="sm" />
          <Text size="xs" color="#5c5f66" p="xs">{isOpen && "MES LIENS"}</Text>
          {links.map((link) => (
             <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', color: '#909296', textDecoration: 'none' }}>
               <ExternalLink size={18} /> {isOpen && link.title}
             </a>
          ))}
          <Box style={{ cursor: 'pointer', color: '#909296', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px' }} onClick={handleAddLink}><Plus size={20} /> {isOpen && "Ajouter Lien"}</Box>

          <Divider my="sm" />
          <a href="mailto:contact@email.com" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', color: '#909296', textDecoration: 'none' }}><Mail size={20} /> {isOpen && "Contact"}</a>
          <Box style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', color: '#e64980' }}><Cloud size={20} /> {isOpen && "Cloud (Premium)"}</Box>
        </Stack>

        <Box style={{ cursor: 'pointer', color: '#ff6b6b', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px' }} onClick={() => signOut()}>
          <LogOut size={20} /> {isOpen && "Déconnexion"}
        </Box>
      </Stack>
    </Box>
  );
}

