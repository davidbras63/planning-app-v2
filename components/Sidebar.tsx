"use client";

import { useState } from 'react';
import { Box, Stack, ActionIcon, Flex, Divider } from '@mantine/core';
import {
  LayoutDashboard,
  Calendar,
  BarChart3,
  Settings,
  ExternalLink,
  LogOut,
  FolderPlus,
  BookOpenCheck,
  Home,
  ChevronLeft
} from 'lucide-react';
import Link from 'next/link';
import { useClerk, useUser } from '@clerk/nextjs';
import { supabase } from '@/lib/supabaseClient';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const { signOut } = useClerk();
  const { user } = useUser();
  if (!user) return null; 
  // ----------------------------------
  const handleCreateFolder = async () => {
    if (!user) { alert("Connectez-vous !"); return; }
    const name = prompt("Nom du nouveau dossier :");
    if (!name) return;
    const { error } = await supabase.from('folders').insert([{ name, user_id: user.id }]);
    if (error) alert("Erreur : " + error.message);
    else { alert("Dossier créé !"); window.location.reload(); }
  };

  const handleCreateSubject = async () => {
    if (!user) { alert("Connectez-vous !"); return; }
    const { data: folders } = await supabase.from('folders').select('id, name').eq('user_id', user.id);
    if (!folders || folders.length === 0) { alert("Crée d'abord un dossier !"); return; }
    const name = prompt("Nom de la nouvelle matière :");
    if (!name) return;
    const list = folders.map((f, i) => `${i + 1}. ${f.name}`).join('\n');
    const choice = prompt(`Dans quel dossier ? Saisis le numéro :\n${list}`);
    if (!choice) return;
    const idx = parseInt(choice) - 1;
    if (isNaN(idx) || !folders[idx]) return;
    const { error } = await supabase.from('subjects').insert([{ name, folder_id: folders[idx].id }]);
    if (error) alert("Erreur : " + error.message);
    else { alert("Matière créée !"); window.location.reload(); }
  };

  return (
    <Box style={{ width: '100%', height: '100%', backgroundColor: '#141517' }} p="md">
      <Stack h="100%" justify="space-between">
        <Stack gap="xs">
          <Flex justify={isOpen ? "space-between" : "center"} align="center" mb="md">
            {isOpen && <Link href="/" style={{ color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}><Home size={18} /> Accueil</Link>}
            <ActionIcon onClick={() => setIsOpen(!isOpen)} variant="subtle"><ChevronLeft size={18} /></ActionIcon>
          </Flex>

          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '8px', textDecoration: 'none', color: '#909296' }}><LayoutDashboard size={20} />{isOpen && <span>Dashboard</span>}</Link>
          <Link href="/planning" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '8px', textDecoration: 'none', color: '#909296' }}><Calendar size={20} />{isOpen && <span>Planning</span>}</Link>
          <Link href="/graphiques" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '8px', textDecoration: 'none', color: '#909296' }}><BarChart3 size={20} />{isOpen && <span>Graphiques</span>}</Link>
          <Link href="/settings" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '8px', textDecoration: 'none', color: '#909296' }}><Settings size={20} />{isOpen && <span>Paramètres</span>}</Link>

          <Divider my="sm" />
          <Box style={{ cursor: 'pointer', color: '#69db7c', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px' }} onClick={handleCreateFolder}>
            <FolderPlus size={20} /> {isOpen && "Créer Dossier"}
          </Box>
          <Box style={{ cursor: 'pointer', color: '#fab005', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px' }} onClick={handleCreateSubject}>
            <BookOpenCheck size={20} /> {isOpen && "Créer Matière"}
          </Box>
          <Divider my="sm" />
          <Box style={{ color: '#909296', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px' }}><ExternalLink size={20} /> {isOpen && "Lien 1"}</Box>
          <Box style={{ color: '#909296', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px' }}><ExternalLink size={20} /> {isOpen && "Lien 2"}</Box>
        </Stack>

        <Stack>
          <Box style={{ cursor: 'pointer', color: '#ff6b6b', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px' }} onClick={() => signOut()}>
            <LogOut size={20} /> {isOpen && "Déconnexion"}
          </Box>
        </Stack>
      </Stack>
    </Box>
  );
}

