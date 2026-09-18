"use client";

import { useEffect, useState, useTransition } from 'react';
import { useUser } from '@clerk/nextjs';
import { Trash2, ChevronRight, ChevronDown, Folder, AlertCircle } from 'lucide-react';
import { Container, Stack, Title, Flex, ActionIcon, Text, Table, Button, Box, Select, Modal, TextInput } from '@mantine/core';
import { getDashboardData, deleteDashboardItem, deleteFolderAction } from '@/app/actions/dashboardActions';
import { actionTenterReintegration, actionForcerReintegration, actionIgnorerRattrapage } from '@/app/actions/reintegration';
import { useRouter, useParams } from 'next/navigation';

export default function Dashboard() {
  const router = useRouter();
  const params = useParams();
  const folderIdFromUrl = params.folderId as string;

  const { user } = useUser();
  const [, setData] = useState<any>(null);
  const [foldersList, setFoldersList] = useState<any[]>([]);
  const [rattrapages, setRattrapages] = useState<any[]>([]);
  const [expandedMatieres, setExpandedMatieres] = useState<{ [key: string]: boolean }>({});
  const [, startTransition] = useTransition();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(folderIdFromUrl || null);
  const [modalOpened, setModalOpened] = useState(false);
  const [activeEcheance, setActiveEcheance] = useState<any>(null);
  const [forcedDateInput, setForcedDateInput] = useState('');
  const [matieresList, setMatieresList] = useState<any[]>([]);
 
  const loadAll = async () => {
    if (!folderIdFromUrl) return;
        
    try {
      const result = await getDashboardData(folderIdFromUrl);
      if (result && !result.error) {
        setData(result.folder);
        setFoldersList(result.folderList || []);
        setRattrapages(result.rattrapages || []);
        setMatieresList(result.folder?.matieres || []);
      } else {
        console.error("Erreur renvoyée par getDashboardData:", result?.error);
      }
    } catch (err) {
      console.error("Erreur catch du dashboard :", err);
    }
  };

  useEffect(() => {
    if (folderIdFromUrl) {
        loadAll();
    }
  }, [folderIdFromUrl]);

  const handleDelete = async (table: 'matieres' | 'chapitres' | 'echeances', id: string) => {
    if (!confirm("Supprimer définitivement cet élément ?")) return;
    await deleteDashboardItem(table, id);
    loadAll();
  };

  const handleReintegrer = async (echeance: any) => {
    if (!user) return;
   
    const chapitreId = echeance.chapitreId;
    const echeanceId = echeance.echeanceId || echeance.idEcheance || echeance.idRattrapage || echeance.id;
    const nextDueDate = echeance.date || echeance.dateEcheance;
    const vraiEcheanceId = (echeanceId === chapitreId && echeance.realEcheanceId) ? echeance.realEcheanceId : echeanceId;

    const res = await actionTenterReintegration(user.id, String(chapitreId), String(vraiEcheanceId), nextDueDate, null);
   
    if (res.success) {
        alert("Réintégration réussie !");
        loadAll();
    } else {
        setActiveEcheance({ ...echeance, vraiEcheanceId, echeanceId });
        setModalOpened(true);
    }
  };

  if (!user) return null;

  return (
    <Container fluid p="xl" style={{ WebkitFontSmoothing: 'antialiased' }}>
      <Stack gap="xl">
        {/* DOSSIER ACTIF */}
        <Box>
          <div style={{ marginBottom: '30px' }}>
            {/* Grand titre "Dossier actif" en ordre 5 avec encadré noir stylisé */}
            <div style={{
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '12px',
              padding: '12px 20px',
              marginBottom: '20px',
              width: 'fit-content',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
            }}>
              <Title order={5} style={{ margin: 0, color: '#ffffff' }}>
                Dossier actif
              </Title>
            </div>

            <Flex align="flex-end" gap="sm">
              <div style={{ width: '350px', maxWidth: '100%' }}>
                <Select
                  size="md"
                  placeholder="Sélectionner un dossier"
                  data={foldersList.map((folder: any) => ({
                    value: String(folder.id),
                    label: folder.name || `Dossier ${folder.id}`,
                  }))}
                  value={selectedFolderId}
                  onChange={(value) => {
                    if (value) {
                      setSelectedFolderId(value);
                      router.push(`/protected/dashboard/${value}`);
                    }
                  }}
                  styles={{
                    input: {
                      backgroundColor: 'rgba(30, 41, 59, 0.75)',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      color: '#ffffff',
                    },
                    dropdown: {
                      backgroundColor: '#0f172a',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      color: '#ffffff',
                    }
                  }}
                />
              </div>
              <ActionIcon
                color="red"
                variant="subtle"
                size="lg"
                style={{ height: '42px', width: '42px', backgroundColor: 'rgba(127, 29, 29, 0.3)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.35)' }}
                onClick={async () => {
                  if (!selectedFolderId) return;
                  if (confirm("Êtes-vous sûr de vouloir supprimer définitivement ce dossier et tout son contenu ?")) {
                    const res = await deleteFolderAction(selectedFolderId);
                    if (res && res.success) {
                      const remainingFolders = foldersList.filter(f => String(f.id) !== selectedFolderId);
                      if (remainingFolders.length > 0) {
                        router.push(`/protected/dashboard/${remainingFolders[0].id}`);
                      } else {
                        router.push(`/protected/dashboard`);
                      }
                    } else {
                      alert("Erreur lors de la suppression du dossier.");
                    }
                  }
                }}
              >
                <Trash2 size={20} />
              </ActionIcon>
            </Flex>
          </div>

          {/* Grand titre "Gestion des Matières" en ordre 5 avec encadré noir stylisé */}
          <div style={{
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '12px',
            padding: '12px 20px',
            marginBottom: '20px',
            width: 'fit-content',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
          }}>
            <Title order={5} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff' }}>
              <Folder size={20} color="#38bdf8" /> Gestion des Matières
            </Title>
          </div>
         
          <Stack gap="md">
            {matieresList?.map((matiere: any) => {
              const isMatiereOpen = Boolean(expandedMatieres[matiere.id]);
              const listChapitres = matiere.chapitres || matiere.chapitre || matiere.chapters || [];

              return (
                <div 
                  key={matiere.id} 
                  style={{ 
                    backgroundColor: 'rgba(15, 23, 42, 0.35)', 
                    border: '1px solid rgba(255, 255, 255, 0.25)', 
                    borderRadius: '16px', 
                    padding: '24px',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
                  }}
                >
                  <Flex justify="space-between" align="center">
                    <Flex
                      align="center"
                      style={{ cursor: 'pointer', flex: 1 }}
                      onClick={() => setExpandedMatieres(prev => ({ ...prev, [matiere.id]: !prev[matiere.id] }))}
                    >
                      {isMatiereOpen ? <ChevronDown size={18} color="#38bdf8" /> : <ChevronRight size={18} color="#38bdf8" />}
                      
                      {/* Petit conteneur ajusté pour le nom de la matière */}
                      <div style={{
                        display: 'inline-block',
                        backgroundColor: 'rgba(30, 41, 59, 0.75)',
                        border: '1px solid rgba(255, 255, 255, 0.25)',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        marginLeft: '12px',
                        width: 'fit-content'
                      }}>
                        <Text fw={600} size="md" style={{ color: '#ffffff' }}>{matiere.nom || matiere.name}</Text>
                      </div>
                    </Flex>
                    <ActionIcon color="red" variant="subtle" onClick={() => handleDelete('matieres', matiere.id)}>
                      <Trash2 size={18} />
                    </ActionIcon>
                  </Flex>

                  {isMatiereOpen && (
                    <Stack gap="xs" mt="md" pl="md" style={{ borderLeft: '2px solid rgba(56, 189, 248, 0.6)' }}>
                      {listChapitres.length > 0 ? (
                        listChapitres.map((chap: any) => {
                          const chapId = chap.id;
                          const chapTitre = chap.titre || chap.title || "Chapitre sans nom";
                          const chapJ = chap.cycleDay ?? chap.j ?? chap.jour;

                          return (
                            <Flex key={chapId} justify="space-between" align="center" py={4}>
                              <Text size="sm" style={{ color: '#ffffff' }}>
                                {chapJ !== undefined && chapJ !== null ? <span style={{ color: '#38bdf8', fontWeight: 700, marginRight: '6px' }}>[J{chapJ}]</span> : ''}
                                {chapTitre}
                              </Text>
                              <ActionIcon color="red" variant="subtle" size="sm" onClick={() => handleDelete('chapitres', chapId)}>
                                <Trash2 size={15} />
                              </ActionIcon>
                            </Flex>
                          );
                        })
                      ) : (
                        <Text size="sm" style={{ color: 'rgba(255, 255, 255, 0.7)' }} fs="italic">Aucun chapitre dans cette matière.</Text>
                      )}
                    </Stack>
                  )}
                </div>
              );
            })}
          </Stack>
        </Box>

        {/* TABLEAU DE RATTRAPAGE */}
        <Box mt={40}>
          {/* Grand titre "Tableau de Rattrapage" en ordre 5 avec encadré noir stylisé */}
          <div style={{
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '12px',
            padding: '12px 20px',
            marginBottom: '20px',
            width: 'fit-content',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
          }}>
            <Title order={5} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff' }}>
              <AlertCircle size={20} color="#f97316" /> Tableau de Rattrapage
            </Title>
          </div>

          <div style={{ 
            backgroundColor: 'rgba(15, 23, 42, 0.35)', 
            border: '1px solid rgba(56, 189, 248, 0.3)', 
            borderRadius: '16px', 
            padding: '24px',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
            overflowX: 'auto'
          }}>
            <Table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', color: '#ffffff' }}>
              <Table.Thead>
                <Table.Tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.15)' }}>
                  <Table.Th style={{ padding: '16px 12px', color: '#ffffff', fontWeight: 'bold', fontSize: '14px' }}>Chapitre</Table.Th>
                  <Table.Th style={{ padding: '16px 12px', color: '#ffffff', fontWeight: 'bold', fontSize: '14px' }}>Date</Table.Th>
                  <Table.Th style={{ padding: '16px 12px', color: '#ffffff', fontWeight: 'bold', fontSize: '14px' }}>Note</Table.Th>
                  <Table.Th style={{ padding: '16px 12px', color: '#ffffff', fontWeight: 'bold', fontSize: '14px' }}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rattrapages.length > 0 ? (
                  rattrapages.map((r: any, index: number) => {
                    const titreChapitre = r.titreChapitre || r.titre || "Chapitre inconnu";
                    const jValue = r.stepName ?? r.cycleDay ?? "";
                    const dateEcheance = r.date || r.dateEcheance;
                    const noteMoyenne = r.moyenne ?? 0;
                    const rowKey = r.echeanceId ?? r.id ?? index;

                    return (
                      <Table.Tr key={rowKey} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <Table.Td style={{ padding: '16px 12px' }}>
                          <div style={{
                            display: 'inline-block',
                            backgroundColor: 'rgba(30, 41, 59, 0.75)',
                            border: '1px solid rgba(255, 255, 255, 0.25)',
                            borderRadius: '6px',
                            padding: '8px 12px',
                            color: '#ffffff',
                            fontWeight: '600',
                            fontSize: '14px'
                          }}>
                            {jValue && <span style={{ marginRight: '8px', fontWeight: 800, color: '#38bdf8' }}>[{jValue}]</span>}
                            {titreChapitre}
                          </div>
                        </Table.Td>

                        {/* Date d'origine non modifiée */}
                        <Table.Td style={{ padding: '16px 12px', color: '#ffffff', fontSize: '14px' }}>
                          {dateEcheance ? new Date(dateEcheance).toLocaleDateString() : "Date invalide"}
                        </Table.Td>

                        <Table.Td style={{ padding: '16px 12px' }}>
                          <div style={{
                            display: 'inline-block',
                            backgroundColor: 'rgba(15, 23, 42, 0.85)',
                            border: '1px solid rgba(56, 189, 248, 0.25)',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            color: '#34d399',
                            fontWeight: 'bold',
                            fontSize: '14px'
                          }}>
                            {Number(noteMoyenne).toFixed(1)}
                          </div>
                        </Table.Td>

                        <Table.Td style={{ padding: '16px 12px' }}>
                          <Flex gap="sm">
                            <Button size="xs" color="blue" onClick={() => handleReintegrer(r)}>Réintégrer</Button>
                            {/* Bouton Ignorer d'origine en rouge */}
                            <Button
                              size="xs"
                              color="red"
                              variant="filled"
                              onClick={async () => {
                                if (r.id) {
                                  const res = await actionIgnorerRattrapage(String(r.id));
                                  if (res && res.success) {
                                    loadAll();
                                  } else {
                                    alert("Erreur lors de l'ignorance");
                                  }
                                }
                              }}
                            >
                              Ignorer
                            </Button>
                          </Flex>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })
                ) : (
                  <Table.Tr>
                    <Table.Td colSpan={4} align="center" style={{ color: 'rgba(255, 255, 255, 0.5)', padding: '24px 12px', fontStyle: 'italic', fontSize: '14px' }}>
                      Aucun élément en rattrapage
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </div>
        </Box>
      </Stack>

      {/* MODALE DE RÉINTÉGRATION */}
      <Modal 
        opened={modalOpened} 
        onClose={() => setModalOpened(false)} 
        title="Pas de place trouvée - Choix de réintégration"
        styles={{
          content: { backgroundColor: '#0f172a', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.25)' },
          header: { backgroundColor: '#0f172a', color: '#ffffff' },
          title: { fontWeight: 700, color: '#ffffff' }
        }}
      >
        <Stack>
          <Text size="sm" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>Aucune place automatique n'a été trouvée pour ce rattrapage. Choisis une date pour forcer ou ignore la ligne.</Text>
         
          <TextInput
            label="Date forcée"
            type="date"
            value={forcedDateInput}
            onChange={(e) => setForcedDateInput(e.currentTarget.value)}
            styles={{
              input: { backgroundColor: '#1e293b', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.25)' },
              label: { color: '#ffffff', fontWeight: 500 }
            }}
          />

          <Flex justify="space-between" mt="md">
            <Button color="red" variant="outline" onClick={async () => {
              if (activeEcheance) {
                const targetId = activeEcheance.id;
                if (!targetId) {
                  alert("Erreur : ID de note introuvable");
                  return;
                }
                const res = await actionIgnorerRattrapage(String(targetId));
                if (res && res.success) {
                  setModalOpened(false);
                  loadAll();
                } else {
                  alert("Erreur lors de la mise à jour");
                }
              }
            }}>
              Ignorer ce rattrapage
            </Button>

            <Button onClick={async () => {
              if (activeEcheance && forcedDateInput) {
                await actionForcerReintegration(
                  String(activeEcheance.chapitreId),
                  String(activeEcheance.vraiEcheanceId),
                  new Date(forcedDateInput)
                );
                setModalOpened(false);
                setForcedDateInput('');
                loadAll();
              }
            }}>
              Forcer la date
            </Button>
          </Flex>
        </Stack>
      </Modal>
    </Container>
  );
}