"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Container, Title, Select, Card, Text, Stack, Box, Center, SimpleGrid, Modal, Flex, Group, Button, Loader } from "@mantine/core";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useDisclosure } from "@mantine/hooks";

interface AnalyticsViewProps {
  matieresList: { value: string; label: string; folderId: number }[];
  chapitresList: { value: string; label: string; matiereId: number }[];
  annalesList?: { value: string; label: string; matiereId: number }[];
  getMatiereData: (matiereId: number) => Promise<{ chartData: any[]; average: number; totalQcm: number }>;
  getChapitreData: (chapitreId: number) => Promise<{ chartData: any[]; average: number; totalQcm: number }>;
  getAnnalesData?: (matiereId: number) => Promise<{ chartData: any[]; subjectAverage: number; totalQcm: number }>;
}

const sortChartSteps = (data: any[]) => {
  if (!Array.isArray(data)) return [];
  return [...data].sort((a, b) => {
    const stepA = String(a.step || "");
    const stepB = String(b.step || "");

    const numA = parseInt(stepA.replace(/\D/g, "")) || 0;
    const numB = parseInt(stepB.replace(/\D/g, "")) || 0;

    if (numA !== numB) {
      return numA - numB;
    }

    const hasRA = stepA.includes("R");
    const hasRB = stepB.includes("R");

    if (!hasRA && hasRB) return -1;
    if (hasRA && !hasRB) return 1;

    return 0;
  });
};

export default function AnalyticsView({
  matieresList = [],
  chapitresList = [],
  getMatiereData,
  getChapitreData,
  getAnnalesData,
}: AnalyticsViewProps) {
  const params = useParams();
  const folderId = Number(params?.folderId);

  const folderMatieres = matieresList.filter((m) => m.folderId === folderId);

  const [selectedMatiere, setSelectedMatiere] = useState<string | null>(
    folderMatieres.length > 0 ? folderMatieres[0].value : null
  );

  const [viewMode, setViewMode] = useState<'chapitres' | 'annales'>('chapitres');

  const [matiereInfo, setMatiereInfo] = useState<{ chartData: any[]; average: number; totalQcm: number }>({
    chartData: [],
    average: 0,
    totalQcm: 0,
  });
  const [loadingMatiere, setLoadingMatiere] = useState(false);

  const [allAnnalesData, setAllAnnalesData] = useState<Record<string, { chartData: any[]; subjectAverage: number; totalQcm: number }>>({});
  const [chapitresData, setChapitresData] = useState<Record<string, any>>({});
  const [loadingChapitres, setLoadingChapitres] = useState(false);

  const [opened, { open, close }] = useDisclosure(false);
  const [activeChapitreModal, setActiveChapitreModal] = useState<{ label: string; data: any; totalQcm: number; average: number } | null>(null);

  // Charger les données de la matière sélectionnée avec gestion d'erreur et loader
  useEffect(() => {
    if (!selectedMatiere) return;
    let isMounted = true;
    setLoadingMatiere(true);

    getMatiereData(Number(selectedMatiere))
      .then((res) => {
        if (isMounted && res) {
          setMatiereInfo(res);
        }
      })
      .catch((err) => {
        console.error("Erreur chargement données matière :", err);
      })
      .finally(() => {
        if (isMounted) setLoadingMatiere(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedMatiere, getMatiereData]);

  // Charger les annales globales si le mode annales est actif
  useEffect(() => {
    if (viewMode === 'annales' && getAnnalesData) {
      folderMatieres.forEach((mat) => {
        getAnnalesData(Number(mat.value))
          .then((res) => {
            if (res) {
              setAllAnnalesData((prev) => ({ ...prev, [mat.value]: res }));
            }
          })
          .catch((err) => {
            console.error(`Erreur chargement annales pour la matière ${mat.value} :`, err);
          });
      });
    }
  }, [viewMode, folderMatieres, getAnnalesData]);

  const filteredChapitres = chapitresList.filter(
    (chap) => !selectedMatiere || chap.matiereId === Number(selectedMatiere)
  );

  // Charger les données des chapitres de la matière avec gestion sécurisée
  useEffect(() => {
    let isMounted = true;
    setChapitresData({});
    setLoadingChapitres(true);

    Promise.all(
      filteredChapitres.map(async (chap) => {
        try {
          const res = await getChapitreData(Number(chap.value));
          return { id: chap.value, res };
        } catch (err) {
          console.error(`Erreur chargement chapitre ${chap.value} :`, err);
          return { id: chap.value, res: null };
        }
      })
    ).then((results) => {
      if (!isMounted) return;
      const newChapData: Record<string, any> = {};
      results.forEach(({ id, res }) => {
        if (res) newChapData[id] = res;
      });
      setChapitresData(newChapData);
      setLoadingChapitres(false);
    });

    return () => {
      isMounted = false;
    };
  }, [selectedMatiere, chapitresList, getChapitreData]);

  const handleCardClick = (chap: { value: string; label: string }, chapInfo: any) => {
    setActiveChapitreModal({
      label: chap.label,
      data: chapInfo?.chartData || [],
      totalQcm: chapInfo?.totalQcm || 0,
      average: chapInfo?.average || 0,
    });
    open();
  };

  return (
    <Container fluid p="xl" style={{ WebkitFontSmoothing: 'antialiased' }}>
      <Flex justify="space-between" align="center" mb="lg" wrap="wrap" gap="md">
        <Title order={2} style={{ color: '#ffffff' }}>
          Tableau de Suivi & Statistiques
        </Title>

        <Group bg="rgba(255, 255, 255, 0.05)" p={4} style={{ borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <Button
            size="xs"
            variant={viewMode === 'chapitres' ? 'filled' : 'subtle'}
            color={viewMode === 'chapitres' ? 'blue' : 'gray'}
            onClick={() => setViewMode('chapitres')}
            style={{ color: viewMode === 'chapitres' ? '#fff' : '#909296' }}
          >
            Mode Chapitres
          </Button>
          <Button
            size="xs"
            variant={viewMode === 'annales' ? 'filled' : 'subtle'}
            color={viewMode === 'annales' ? 'rose' : 'gray'}
            onClick={() => setViewMode('annales')}
            style={{ 
              backgroundColor: viewMode === 'annales' ? '#f43f5e' : 'transparent',
              color: viewMode === 'annales' ? '#fff' : '#909296' 
            }}
          >
            Mode Annales (Global)
          </Button>
        </Group>
      </Flex>

      {/* --- MODE CHAPITRES --- */}
      {viewMode === 'chapitres' && (
        <Stack gap="xl">
          <Box>
            <Title order={3} mb="md" style={{ color: '#ffffff', fontSize: '18px' }}>
              Matières & Révisions J
            </Title>

            <Select
              placeholder="Sélectionner une matière"
              data={folderMatieres}
              value={selectedMatiere}
              onChange={setSelectedMatiere}
              mb="md"
              styles={{
                input: { maxWidth: 300, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.15)', color: 'white' },
                dropdown: { backgroundColor: '#1a1b1e', borderColor: 'rgba(255, 255, 255, 0.15)', color: 'white' },
                item: { '&[data-selected]': { backgroundColor: 'rgba(255, 255, 255, 0.1)' } }
              }}
            />

            <Card withBorder shadow="sm" radius="md" p="lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
              <Stack gap="xs">
                <Text fw={700} size="lg" c="white">
                  Vue Globale Matière (Moyenne : <span style={{ color: '#38bdf8' }}>{matiereInfo.average} / 20</span>)
                </Text>
               
                <Box style={{ height: 300, width: "100%", position: 'relative' }}>
                  {loadingMatiere ? (
                    <Center h="100%"><Loader color="blue" size="sm" /></Center>
                  ) : matiereInfo?.chartData && matiereInfo.chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sortChartSteps(matiereInfo.chartData)} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                        <XAxis dataKey="step" stroke="#909296" tick={{ fontSize: 12 }} />
                        <YAxis domain={[0, 20]} stroke="#909296" tick={{ fontSize: 12 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#1a1b1e', borderColor: 'rgba(255, 255, 255, 0.15)', borderRadius: 8, color: '#fff' }} />
                        <Line type="monotone" dataKey="moyenne" stroke="#38bdf8" strokeWidth={3} name="Moyenne J" dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="average" stroke="#f87171" strokeWidth={2} strokeDasharray="5 5" name="Average" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <Center h="100%"><Text size="sm" c="dimmed">Aucune donnée disponible pour cette matière</Text></Center>
                  )}
                </Box>

                <Box bg="rgba(56, 189, 248, 0.08)" p="xs" ta="center" style={{ borderRadius: 4, border: "1px solid rgba(56, 189, 248, 0.2)" }}>
                  <Text size="sm" fw={700} c="#38bdf8">
                    QCM : {matiereInfo.totalQcm} réalisés
                  </Text>
                </Box>
              </Stack>
            </Card>
          </Box>

          <Box>
            <Title order={3} mb="md" style={{ color: '#ffffff', fontSize: '18px' }}>
              Chapitres
            </Title>
           
            {loadingChapitres ? (
              <Center p="xl"><Loader color="blue" /></Center>
            ) : (
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
                {filteredChapitres.map((chap) => {
                  const chapInfo = chapitresData[chap.value] || { chartData: [], average: 0, totalQcm: 0 };

                  return (
                    <Card
                      key={chap.value}
                      withBorder
                      shadow="sm"
                      radius="md"
                      p="md"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        cursor: "pointer",
                        transition: "transform 0.2s, border-color 0.2s"
                      }}
                      onClick={() => handleCardClick(chap, chapInfo)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-3px)";
                        e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.4)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                      }}
                    >
                      <Stack gap="xs">
                        <Text fw={700} size="sm" truncate c="white">{chap.label}</Text>

                        <Text size="xs" c="dimmed">
                          Moyenne : <span style={{ color: '#38bdf8', fontWeight: 700 }}>{chapInfo.average} / 20</span>
                        </Text>

                        <Box style={{ height: 140 }}>
                          {chapInfo?.chartData && chapInfo.chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={sortChartSteps(chapInfo.chartData)} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                                <XAxis dataKey="step" tick={{ fontSize: 10, fill: '#909296' }} />
                                <YAxis domain={[0, 20]} tick={{ fontSize: 10, fill: '#909296' }} />
                                <Tooltip contentStyle={{ backgroundColor: '#1a1b1e', borderColor: 'rgba(255, 255, 255, 0.15)', borderRadius: 8, color: '#fff' }} />
                                <Line type="monotone" dataKey="moyenne" stroke="#38bdf8" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="average" stroke="#f87171" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
                              </LineChart>
                            </ResponsiveContainer>
                          ) : (
                            <Center h="100%"><Text size="xs" c="dimmed">Aucune note</Text></Center>
                          )}
                        </Box>

                        <Box bg="rgba(56, 189, 248, 0.08)" p="xs" ta="center" style={{ borderRadius: 4, border: "1px solid rgba(56, 189, 248, 0.2)" }}>
                          <Text size="sm" fw={700} c="#38bdf8">
                            QCM : {chapInfo.totalQcm}
                          </Text>
                        </Box>
                      </Stack>
                    </Card>
                  );
                })}
              </SimpleGrid>
            )}
          </Box>
        </Stack>
      )}

      {/* --- MODE ANNALES (GLOBAL) --- */}
      {viewMode === 'annales' && (
        <Stack gap="xl">
          <Text size="sm" c="dimmed">
            Vue d&apos;ensemble des graphiques d&apos;annales pour chaque matière du dossier.
          </Text>

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
            {folderMatieres.map((mat) => {
              const matAnnales = allAnnalesData[mat.value] || { chartData: [], subjectAverage: 0, totalQcm: 0 };

              return (
                <Card key={mat.value} withBorder shadow="sm" radius="md" p="lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                  <Stack gap="md">
                    <Flex justify="space-between" align="center">
                      <Text fw={700} size="md" c="white">
                        {mat.label}
                      </Text>
                      <Text size="sm" c="dimmed">
                        Moyenne : <span style={{ color: '#f43f5e', fontWeight: 700 }}>{matAnnales.subjectAverage} / 20</span>
                      </Text>
                    </Flex>

                    <Box style={{ height: 240, width: "100%" }}>
                      {matAnnales.chartData && matAnnales.chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={matAnnales.chartData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                            <XAxis dataKey="date" stroke="#909296" tick={{ fontSize: 11 }} />
                            <YAxis domain={[0, 20]} stroke="#909296" tick={{ fontSize: 11 }} />
                            <Tooltip contentStyle={{ backgroundColor: '#1a1b1e', borderColor: 'rgba(255, 255, 255, 0.15)', borderRadius: 8, color: '#fff' }} />
                            <Line type="monotone" dataKey="moyenne" stroke="#f43f5e" strokeWidth={3} name="Note Annales" dot={{ r: 4 }} />
                            <Line type="monotone" dataKey="average" stroke="#38bdf8" strokeWidth={2} strokeDasharray="5 5" name="Moyenne glissante" dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <Center h="100%"><Text size="sm" c="dimmed">Aucune annale pour cette matière</Text></Center>
                      )}
                    </Box>

                    <Box bg="rgba(244, 63, 94, 0.08)" p="xs" ta="center" style={{ borderRadius: 4, border: "1px solid rgba(244, 63, 94, 0.2)" }}>
                      <Text size="xs" fw={700} c="#f43f5e">
                        QCM Annales réalisés : {matAnnales.totalQcm}
                      </Text>
                    </Box>
                  </Stack>
                </Card>
              );
            })}
          </SimpleGrid>
        </Stack>
      )}

      {/* --- MODAL DE ZOOM --- */}
      <Modal
        opened={opened}
        onClose={close}
        title={<Text fw={700} c="white">{activeChapitreModal?.label || "Détail Chapitre"}</Text>}
        size="lg"
        centered
        styles={{
          content: { backgroundColor: '#1a1b1e', border: '1px solid rgba(255, 255, 255, 0.15)' },
          header: { backgroundColor: 'transparent' },
          close: { color: 'white' }
        }}
      >
        {activeChapitreModal && (
          <Stack gap="md">
            <Text fw={500} size="sm" c="white">
              Moyenne globale du chapitre : <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>{activeChapitreModal.average} / 20</span>
            </Text>
           
            <Box style={{ height: 350, width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sortChartSteps(activeChapitreModal.data)} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis dataKey="step" stroke="#909296" />
                  <YAxis domain={[0, 20]} stroke="#909296" />
                  <Tooltip contentStyle={{ backgroundColor: '#1a1b1e', borderColor: 'rgba(255, 255, 255, 0.15)', borderRadius: 8, color: '#fff' }} />
                  <Line type="monotone" dataKey="moyenne" stroke="#38bdf8" strokeWidth={3} name="Moyenne J" dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="average" stroke="#f87171" strokeWidth={2} strokeDasharray="5 5" name="Average" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Box>

            <Box bg="rgba(56, 189, 248, 0.08)" p="xs" ta="center" style={{ borderRadius: 4, border: "1px solid rgba(56, 189, 248, 0.2)" }}>
              <Text size="sm" fw={700} c="#38bdf8">
                Total QCM réalisés : {activeChapitreModal.totalQcm}
              </Text>
            </Box>
          </Stack>
        )}
      </Modal>
    </Container>
  );
}