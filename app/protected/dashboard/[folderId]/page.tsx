"use client";

import { useEffect, useState, useTransition } from 'react';
import { useUser } from '@clerk/nextjs';
import { Trash2, ChevronRight, ChevronDown, Folder, AlertCircle } from 'lucide-react';
import { Container, Stack, Title, Card, Flex, ActionIcon, Text, Table, Button, Box, Select, Modal, TextInput } from '@mantine/core';
import { getDashboardData, deleteDashboardItem, forceEcheancePlacement, actionIgnoreRattrapage, deleteFolderAction } from '@/app/actions/dashboardActions';
import { actionTenterReintegration, actionForcerReintegration, actionIgnorerRattrapage } from '@/app/actions/reintegration';
import { useRouter, useParams } from 'next/navigation';

export default function Dashboard() {
  
  const router = useRouter();
  const params = useParams();
  const folderIdFromUrl = params.folderId as string;

  const { user } = useUser();
  const [data, setData] = useState<any>(null);
  const [foldersList, setFoldersList] = useState<any[]>([]);
  const [rattrapages, setRattrapages] = useState<any[]>([]);
  const [expandedMatieres, setExpandedMatieres] = useState<{ [key: string]: boolean }>({});
  const [, startTransition] = useTransition();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(folderIdFromUrl || null);
  const [modalOpened, setModalOpened] = useState(false);
  const [activeEcheance, setActiveEcheance] = useState<any>(null);
  const [forcedDateInput, setForcedDateInput] = useState('');
  
    
  const loadAll = async () => {
        if (!folderIdFromUrl) return;
        
         try {
				const result = await getDashboardData(folderIdFromUrl);
				console.log("REPONSE DU SERVEUR :", result); // <-- Ajoute ça

				if (result && !result.error) { // <-- Sécurise avec ça
					setData(result.folder);
					setFoldersList(result.folderList || []);
					setRattrapages(result.rattrapages || []);
					// ... le reste
				} else {
					console.error("Erreur renvoyée par getDashboardData:", result?.error);
				}
			} catch (err) {
				console.error("Erreur catch du dashboard :", err);
			}
    };


  useEffect(() => {
        // On s'assure qu'on a bien un folderId valide avant d'appeler le serveur
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
        // Au lieu du prompt moche, on ouvre notre propre modale Mantine
        setActiveEcheance({ ...echeance, vraiEcheanceId, echeanceId });
        setModalOpened(true);
    }
  };


  if (!user) return null;

  return (
    <Container fluid p="xl">
      <Stack gap="xl">
        <Box>
          <div style={{ marginBottom: '20px' }}>
			  <Flex align="flex-end" gap="sm">
				<div style={{ flex: 1 }}>
				  <Select
					label="Dossier actif"
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
				  />
				</div>
				<ActionIcon
				  color="red"
				  variant="subtle"
				  size="lg"
				  style={{ height: '36px', width: '36px' }}
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


          <Title order={2} size="h3" fw={700} mb="md"><Folder size={22} /> Gestion des Matières</Title>
         
          <Stack gap="md">
            {data?.matieres?.map((matiere: any) => {
              const isMatiereOpen = Boolean(expandedMatieres[matiere.id]);
              const listChapitres = matiere.chapitres || matiere.chapitre || matiere.chapters || [];

              return (
                <Card key={matiere.id} withBorder p="md">
                  <Flex justify="space-between" align="center">
                    <Flex
                      align="center"
                      style={{ cursor: 'pointer', flex: 1 }}
                      onClick={() => setExpandedMatieres(prev => ({ ...prev, [matiere.id]: !prev[matiere.id] }))}
                    >
                      {isMatiereOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      <Text fw={700} size="lg" ml={8}>{matiere.nom || matiere.name}</Text>
                    </Flex>
                    <ActionIcon color="red" variant="subtle" onClick={() => handleDelete('matieres', matiere.id)}>
                      <Trash2 size={18} />
                    </ActionIcon>
                  </Flex>

                  {isMatiereOpen && (
                    <Stack gap="xs" mt="sm" pl="md" style={{ borderLeft: '2px solid #eee' }}>
                      {listChapitres.length > 0 ? (
                        listChapitres.map((chap: any) => {
                          const chapId = chap.id;
                          const chapTitre = chap.titre || chap.title || "Chapitre sans nom";
                          const chapJ = chap.cycleDay ?? chap.j ?? chap.jour;

                          return (
                            <Flex key={chapId} justify="space-between" align="center" py={4}>
                              <Text size="sm">
                                {chapJ !== undefined && chapJ !== null ? `[J${chapJ}] ` : ''}{chapTitre}
                              </Text>
                              <ActionIcon color="red" variant="subtle" size="sm" onClick={() => handleDelete('chapitres', chapId)}>
                                <Trash2 size={15} />
                              </ActionIcon>
                            </Flex>
                          );
                        })
                      ) : (
                        <Text size="sm" c="dimmed">Aucun chapitre dans cette matière.</Text>
                      )}
                    </Stack>
                  )}
                </Card>
              );
            })}
          </Stack>
        </Box>

        <Box>
          <Title order={2} size="h3" fw={700} c="orange.5" mb="md"><AlertCircle size={22} /> Tableau de Rattrapage</Title>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Chapitre</Table.Th>
                <Table.Th>Date</Table.Th>
                <Table.Th>Note</Table.Th>
                <Table.Th>Actions</Table.Th>
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
                    <Table.Tr key={rowKey} style={{ color: '#ffffff' }}>
                      <Table.Td style={{ color: '#ffffff', fontWeight: 500 }}>
                        {jValue && <span style={{ marginRight: '8px', fontWeight: 700, color: '#339af0' }}>[{jValue}]</span>}
                        {titreChapitre}
                      </Table.Td>

                      <Table.Td style={{ color: '#ffffff' }}>
                        {dateEcheance ? new Date(dateEcheance).toLocaleDateString() : "Date invalide"}
                      </Table.Td>

                      <Table.Td style={{ color: '#ffffff' }}>
                        {Number(noteMoyenne).toFixed(1)}
                      </Table.Td>

                      <Table.Td>
						<div style={{ display: 'flex', gap: '8px' }}>
							<Button size="xs" onClick={() => handleReintegrer(r)}>Réintégrer</Button>
							<Button 
								size="xs" 
								color="red" 
								variant="outline" 
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
						</div>
					 </Table.Td>

                    </Table.Tr>
                  );
                })
              ) : (
                <Table.Tr>
                  <Table.Td colSpan={4} align="center" style={{ color: '#ffffff' }}>
                    Aucun élément en rattrapage
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Box>
      </Stack>
	  {/* Modale propre pour Forcer ou Ignorer */}
      <Modal opened={modalOpened} onClose={() => setModalOpened(false)} title="Pas de place trouvée - Choix de réintégration">
        <Stack>
          <Text size="sm">Aucune place automatique n'a été trouvée pour ce rattrapage. Choisis une date pour forcer ou ignore la ligne.</Text>
          
          <TextInput
            label="Date forcée"
            type="date"
            value={forcedDateInput}
            onChange={(e) => setForcedDateInput(e.currentTarget.value)}
          />

          <Flex justify="space-between" mt="md">
            <Button color="red" variant="outline" onClick={async () => {
				if (activeEcheance) {
					// On récupère l'identifiant unique de la table individualNotes
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

