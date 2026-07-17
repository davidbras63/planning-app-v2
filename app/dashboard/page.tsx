// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from '@clerk/nextjs';
import { Trash2, ChevronRight, ChevronDown, RotateCcw, AlertCircle, Calendar, Folder, GitMerge } from 'lucide-react';
import { tenterReintegration } from '@/logic/reintegration';
import { Container, Stack, Title, Card, Flex, ActionIcon, Text, Collapse, Table, Button, Group, Box } from '@mantine/core';

export default function Dashboard() {
  const { user } = useUser();
  const [data, setData] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<{ [key: string]: boolean }>({});
  const [rattrapages, setRattrapages] = useState<any[]>([]);

  const loadAll = async () => {
    if (!user) return;
   
    const { data: tree } = await supabase
      .from('folders')
      .select(`id, name, subjects(id, name, chapters(id, title, revisions(id, note, due_date, cycle_day)))`)
      .eq('user_id', user.id);
    setData(tree || []);

    const { data: settings } = await supabase
      .from('settings')
      .select('cycle_day, min_note')
      .eq('user_id', user.id);

    const { data: allRevisions } = await supabase
      .from('revisions')
      .select('*, chapters(title)');

    const filtered = (allRevisions || []).filter((r) => {
      if (!r.note) return false;
      const setting = settings?.find((s) => s.cycle_day === r.cycle_day);
      return setting ? r.note < setting.min_note : false;
    });

    setRattrapages(filtered);
  };

  useEffect(() => {
    loadAll();
  }, [user]);

  const deleteItem = async (table: string, id: string) => {
    if (!confirm("Supprimer définitivement cet élément ?")) return;
    await supabase.from(table).delete().eq('id', id);
    loadAll();
  };

  const handleReintegrer = async (r: any) => {
    if (!user) return;
    try {
      const res = await tenterReintegration(user.id, r.id, r.chapter_id, parseInt(r.cycle_day) || 1, r.due_date);
      if (res.success) {
        alert(`Cours réintégré avec succès le : ${res.date}`);
        loadAll();
      } else {
        if (confirm("Pas de place trouvée. Voulez-vous forcer le placement manuellement ?")) {
          handleForcerManuel(r);
        }
      }
    } catch (e) {
      alert("Erreur lors de la réintégration automatique.");
    }
  };

  const handleForcerManuel = (r: any) => {
    const date = prompt("Choisir une date de remplacement forcée (YYYY-MM-DD) :");
    if (!date) return;
    supabase.from('revisions')
      .update({ due_date: date, cycle_day: `J${parseInt(r.cycle_day) || 1}R`, note: null })
      .eq('id', r.id)
      .then(({ error }) => {
        if (error) alert("Erreur : " + error.message);
        else { alert("Placement forcé validé !"); loadAll(); }
      });
  };

  return (
    <Container fluid p="xl">
      <Stack gap="xl">
        <Box>
          <Title order={2} size="h3" fw={700} mb="md" display="flex" style={{ alignItems: 'center', gap: '8px' }}>
            <Folder size={22} /> Gestion des Dossiers
          </Title>
          <Stack gap="md">
            {data.map((folder) => (
              <Card key={folder.id} withBorder shadow="sm" radius="md" p="md" bg="var(--mantine-color-body)">
                <Flex justify="space-between" align="center" style={{ borderBottom: '1px solid var(--mantine-color-default-border)', paddingBottom: '8px' }}>
                  <Text fw={700} size="lg">{folder.name}</Text>
                  <ActionIcon variant="subtle" color="red.5" onClick={() => deleteItem('folders', folder.id)}><Trash2 size={18} /></ActionIcon>
                </Flex>
                {folder.subjects?.map((sub: any) => (
                  <Box key={sub.id} mt="sm" p="xs" style={{ backgroundColor: 'var(--mantine-color-dark-8)', borderRadius: 'var(--mantine-radius-sm)' }}>
                    <Flex justify="space-between" align="center">
                      <Group gap="xs" onClick={() => setExpanded({...expanded, [sub.id]: !expanded[sub.id]})} style={{ cursor: 'pointer', color: 'var(--mantine-color-indigo-4)' }}>
                        {expanded[sub.id] ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}
                        <Text fw={500}>{sub.name}</Text>
                      </Group>
                      <ActionIcon variant="subtle" color="red.4" size="sm" onClick={() => deleteItem('subjects', sub.id)}><Trash2 size={16} /></ActionIcon>
                    </Flex>
                    <Collapse opened={expanded[sub.id]}>
                      <Stack gap={6} mt="xs" ml="xl">
                        {sub.chapters?.map((chap: any) => (
                          <Flex key={chap.id} justify="space-between" align="center" p="xs" style={{ backgroundColor: 'var(--mantine-color-dark-9)', borderRadius: 'var(--mantine-radius-xs)' }}>
                            <Text size="sm" c="gray.3">{chap.title}</Text>
                            <ActionIcon variant="subtle" color="red.4" size="xs" onClick={() => deleteItem('chapters', chap.id)}><Trash2 size={14} /></ActionIcon>
                          </Flex>
                        ))}
                      </Stack>
                    </Collapse>
                  </Box>
                ))}
              </Card>
            ))}
          </Stack>
        </Box>

        <Box>
          <Title order={2} size="h3" fw={700} c="orange.5" mb="md" display="flex" style={{ alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={22} /> Tableau de Rattrapage
          </Title>
          <Card withBorder shadow="sm" radius="md" p={0} bg="var(--mantine-color-body)" style={{ overflow: 'hidden' }}>
            <Table variant="simple" verticalSpacing="sm" horizontalSpacing="md">
              <Table.Thead style={{ backgroundColor: 'var(--mantine-color-dark-8)' }}>
                <Table.Tr>
                  <Table.Th>Chapitre</Table.Th><Table.Th>Note</Table.Th><Table.Th>Échéance</Table.Th><Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rattrapages.map((r) => (
                  <Table.Tr key={r.id}>
                    <Table.Td>{r.chapters?.title}</Table.Td>
                    <Table.Td><Text c="red.4" fw={700}>{r.note}/20</Text></Table.Td>
                    <Table.Td>{r.due_date}</Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Button size="xs" color="green.6" leftSection={<RotateCcw size={14}/>} onClick={() => handleReintegrer(r)}>Réintégrer</Button>
                        <Button size="xs" color="yellow.6" leftSection={<Calendar size={14}/>} onClick={() => handleForcerManuel(r)}>Forcer</Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>
          
          {/* BOUTON DE RÉINTÉGRATION GLOBALE AJOUTÉ ICI */}
          <Group mt="md" justify="flex-end">
            <Button color="pink.6" leftSection={<GitMerge size={16}/>} onClick={() => alert("Réintégration de tous les éléments sélectionnés...")}>
              Réintégrer tous les éléments
            </Button>
          </Group>
        </Box>
      </Stack>
    </Container>
  );
}
