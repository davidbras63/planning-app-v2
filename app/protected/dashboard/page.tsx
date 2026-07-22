"use client";

import { useEffect, useState, useTransition } from 'react';
import { useUser } from '@clerk/nextjs';
import { Trash2, ChevronRight, ChevronDown, RotateCcw, Folder, AlertCircle, Calendar } from 'lucide-react';
import { Container, Stack, Title, Card, Flex, ActionIcon, Text, Collapse, Table, Button, Group, Box } from '@mantine/core';
import { getDashboardData, deleteDashboardItem, forceEcheancePlacement } from '@/app/actions/dashboardActions';
import { actionTenterReintegration } from '@/app/actions/reintegration';

export default function Dashboard() {
  const { user } = useUser();
  const [data, setData] = useState<any[]>([]);
  const [rattrapages, setRattrapages] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<{ [key: string]: boolean }>({});
  const [isPending, startTransition] = useTransition();

  const loadAll = async () => {
    if (!user) return;
    startTransition(async () => {
      const result = await getDashboardData(user.id);
      setData(result.folders);
      setRattrapages(result.rattrapages);
    });
  };

  useEffect(() => {
    if (user) loadAll();
  }, [user]);

  const handleDelete = async (table: 'matieres' | 'chapitres' | 'echeances', id: string) => {
    if (!confirm("Supprimer définitivement cet élément ?")) return;
    await deleteDashboardItem(table, id);
    loadAll();
  };

  const handleReintegrer = async (echeance: any) => {
    if (!user) return;
    const res = await actionTenterReintegration(user.id, echeance.id, echeance.chapitreId, echeance.cycleDay, echeance.date);
    if (res.success) {
      alert("Réintégration réussie !");
      loadAll();
    } else {
      const date = prompt("Pas de place trouvée. Date forcée (YYYY-MM-DD) :");
      if (date) {
        await forceEcheancePlacement(echeance.id, new Date(date), echeance.cycleDay);
        loadAll();
      }
    }
  };

  if (!user) return null;

  return (
    <Container fluid p="xl">
      <Stack gap="xl">
        <Box>
          <Title order={2} size="h3" fw={700} mb="md"><Folder size={22} /> Gestion des Matières</Title>
          <Stack gap="md">
            {data.map((matiere) => (
              <Card key={matiere.id} withBorder p="md">
                <Flex justify="space-between" align="center">
                  <Text fw={700} size="lg">{matiere.nom}</Text>
                  <ActionIcon color="red" onClick={() => handleDelete('matieres', matiere.id)}><Trash2 size={18} /></ActionIcon>
                </Flex>
                {matiere.chapitres?.map((chap: any) => (
                  <Box key={chap.id} mt="xs">
                    <Flex align="center" onClick={() => setExpanded({...expanded, [chap.id]: !expanded[chap.id]})}>
                      {expanded[chap.id] ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                      <Text ml={5}>{chap.titre}</Text>
                    </Flex>
                  </Box>
                ))}
              </Card>
            ))}
          </Stack>
        </Box>

        <Box>
          <Title order={2} size="h3" fw={700} c="orange.5" mb="md"><AlertCircle size={22} /> Tableau de Rattrapage</Title>
          <Table>
            <Table.Thead>
              <Table.Tr><Table.Th>Chapitre</Table.Th><Table.Th>Date</Table.Th><Table.Th>Actions</Table.Th></Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rattrapages.map((r: any) => (
                <Table.Tr key={r.echeances.id}>
                  <Table.Td>{r.chapitres?.titre}</Table.Td>
                  <Table.Td>{new Date(r.echeances.date).toLocaleDateString()}</Table.Td>
                  <Table.Td>
                    <Button size="xs" onClick={() => handleReintegrer(r.echeances)}>Réintégrer</Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Box>
      </Stack>
    </Container>
  );
}
