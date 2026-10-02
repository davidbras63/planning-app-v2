"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Container, Title, Select, Card, Text, Stack, Box, Center, SimpleGrid, Modal, Group, Button } from "@mantine/core";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useDisclosure } from "@mantine/hooks";
import { useUser } from "@clerk/nextjs";

interface AnalyticsViewProps {
  matieresList: { value: string; label: string; folderId: number }[];
  chapitresList: { value: string; label: string; matiereId: number }[];
  getMatiereData: (matiereId: number) => Promise<{ chartData: any[]; average: number; totalQcm: number }>;
  getChapitreData: (chapitreId: number) => Promise<{ chartData: any[]; average: number; totalQcm: number }>;
  getSubjectAnalyseData?: (matiereId: number, folderId: number, clerkId: string) => Promise<{ chartData: any[]; matiereAverage: number; totalQcm: number }>;
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
  getSubjectAnalyseData,
}: AnalyticsViewProps) {
  const params = useParams();
  const folderId = Number(params?.folderId);
  const { user } = useUser();
  const clerkId = user?.id;

  const folderMatieres = matieresList.filter((m) => m.folderId === folderId);

  const [selectedMatiere, setSelectedMatiere] = useState<string | null>(
    folderMatieres.length > 0 ? folderMatieres[0].value : null
  );

  const [analysisMode, setAnalysisMode] = useState<"standard" | "anal">("standard");

  // Mode Standard : Données de la matière sélectionnée
  const [matiereInfo, setMatiereInfo] = useState<{ chartData: any[]; average: number; totalQcm: number }>({
    chartData: [],
    average: 0,
    totalQcm: 0,
  });

  // Mode Anal : Données de toutes les matières stockées par ID
  const [subjectsAnalysesData, setSubjectsAnalysesData] = useState<Record<string, any>>({});

  const [chapitresData, setChapitresData] = useState<Record<string, any>>({});

  const [opened, { open, close }] = useDisclosure(false);
  const [activeChapitreModal, setActiveChapitreModal] = useState<{ label: string; data: any; totalQcm: number; average: number } | null>(null);

  // 1. Récupération Mode Standard
  useEffect(() => {
    if (analysisMode === "standard" && selectedMatiere) {
      getMatiereData(Number(selectedMatiere)).then((res) => {
        if (res) setMatiereInfo(res);
      });
    }
  }, [selectedMatiere, analysisMode]);

  // 1b. Récupération Mode Anal (charge toutes les matières du dossier en même temps avec le clerkId)
  useEffect(() => {
    if (analysisMode === "anal" && getSubjectAnalyseData && clerkId) {
      setSubjectsAnalysesData({});
      folderMatieres.forEach((mat) => {
        getSubjectAnalyseData(Number(mat.value), folderId, clerkId).then((res: any) => {
          if (res && res.success) {
            setSubjectsAnalysesData((prev) => ({
              ...prev,
              [mat.value]: {
                chartData: res.chartData,
                average: res.matiereAverage,
                totalQcm: res.totalQcm,
              },
            }));
          }
        });
      });
    }
  }, [analysisMode, folderId, folderMatieres, clerkId, getSubjectAnalyseData]);

  // 2. Récupération des données Chapitres
  const filteredChapitres = chapitresList.filter(
    (chap) => !selectedMatiere || chap.matiereId === Number(selectedMatiere)
  );

  useEffect(() => {
    setChapitresData({});
    filteredChapitres.forEach((chap) => {
      getChapitreData(Number(chap.value)).then((res) => {
        if (res) {
          setChapitresData((prev) => ({ ...prev, [chap.value]: res }));
        }
      });
    });
  }, [selectedMatiere, chapitresList.length]);

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
      <Title order={2} style={{ color: '#ffffff', margin: 0, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}>
        Tableau de Suivi & Statistiques
      </Title>

      {/* --- SECTION 1 : VUE MATIÈRE (STANDARD OU ANAL GLOBAL) --- */}
      <Box mb={40}>
        <Group justify="space-between" align="center" mb="16px">
          <Title order={3} style={{ color: '#38bdf8', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem' }}>
            {analysisMode === "anal" ? "Analyse Globale des Matières (Par Date)" : "Matière"}
          </Title>

          <Group gap="xs">
            <Button
              size="xs"
              variant={analysisMode === "standard" ? "filled" : "outline"}
              color="cyan"
              onClick={() => setAnalysisMode("standard")}
            >
              Standard
            </Button>
            <Button
              size="xs"
              variant={analysisMode === "anal" ? "filled" : "outline"}
              color="cyan"
              onClick={() => setAnalysisMode("anal")}
            >
              Mode Anal
            </Button>
          </Group>
        </Group>

        {/* Si Mode Standard : Select + Grande carte unique */}
        {analysisMode === "standard" ? (
          <>
            <Select
              placeholder="Sélectionner une matière"
              data={folderMatieres}
              value={selectedMatiere}
              onChange={setSelectedMatiere}
              mb="md"
              styles={{
                input: {
                  maxWidth: 300,
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderColor: 'rgba(255, 255, 255, 0.15)',
                  color: 'white',
                  borderRadius: '8px'
                },
                dropdown: { backgroundColor: '#1a1b1e', borderColor: 'rgba(255, 255, 255, 0.15)', color: 'white' },
                item: { '&[data-selected]': { backgroundColor: 'rgba(255, 255, 255, 0.1)' } }
              }}
            />

            <Card withBorder shadow="sm" radius="md" p="lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '12px' }}>
              <Stack gap="md">
                <Text fw={700} size="lg" c="white">
                  Vue Globale Matière (Moyenne : <span style={{ color: '#38bdf8' }}>{matiereInfo.average} / 20</span>)
                </Text>
               
                <Box style={{ height: 300, width: "100%" }}>
                  {matiereInfo?.chartData && matiereInfo.chartData.length > 0 ? (
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

                <Box bg="rgba(56, 189, 248, 0.08)" p="xs" ta="center" style={{ borderRadius: 6, border: "1px solid rgba(56, 189, 248, 0.2)" }}>
                  <Text size="sm" fw={700} c="#38bdf8">
                    QCM : {matiereInfo.totalQcm} réalisés
                  </Text>
                </Box>
              </Stack>
            </Card>
          </>
        ) : (
          /* Si Mode Anal : Grille de toutes les matières (style chapitres) */
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
            {folderMatieres.map((mat) => {
              const matInfo = subjectsAnalysesData[mat.value] || { chartData: [], average: 0, totalQcm: 0 };

              return (
                <Card
                  key={mat.value}
                  withBorder
                  shadow="sm"
                  radius="md"
                  p="md"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px'
                  }}
                >
                  <Stack gap="xs">
                    <Text fw={700} size="md" truncate c="white">
                      {mat.label} (Moy: <span style={{ color: '#38bdf8' }}>{matInfo.average}/20</span>)
                    </Text>

                    <Box style={{ height: 180 }}>
                      {matInfo?.chartData && matInfo.chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={matInfo.chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#909296' }} />
                            <YAxis domain={[0, 20]} tick={{ fontSize: 10, fill: '#909296' }} />
                            <Tooltip contentStyle={{ backgroundColor: '#1a1b1e', borderColor: 'rgba(255, 255, 255, 0.15)', borderRadius: 8, color: '#fff' }} />
                            <Line type="monotone" dataKey="moyenne" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3 }} name="Moyenne Session" />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <Center h="100%"><Text size="xs" c="dimmed">Aucune donnée</Text></Center>
                      )}
                    </Box>

                    <Box bg="rgba(56, 189, 248, 0.08)" p="xs" ta="center" style={{ borderRadius: 6, border: "1px solid rgba(56, 189, 248, 0.2)" }}>
                      <Text size="sm" fw={700} c="#38bdf8">
                        QCM : {matInfo.totalQcm}
                      </Text>
                    </Box>
                  </Stack>
                </Card>
              );
            })}
          </SimpleGrid>
        )}
      </Box>

      {/* --- SECTION 2 : VUE CHAPITRES (Uniquement en mode standard ou filtré) --- */}
      {analysisMode === "standard" && (
        <Box>
          <Title order={3} style={{ color: '#38bdf8', margin: 0, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem' }}>
            Chapitres
          </Title>
         
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg">
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
                    borderRadius: '12px',
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

                    <Box bg="rgba(56, 189, 248, 0.08)" p="xs" ta="center" style={{ borderRadius: 6, border: "1px solid rgba(56, 189, 248, 0.2)" }}>
                      <Text size="sm" fw={700} c="#38bdf8">
                        QCM : {chapInfo.totalQcm}
                      </Text>
                    </Box>
                  </Stack>
                </Card>
              );
            })}
          </SimpleGrid>
        </Box>
      )}

      {/* --- MODAL DE ZOOM --- */}
      <Modal
        opened={opened}
        onClose={close}
        title={<Text fw={700} c="white">{activeChapitreModal?.label || "Détail Chapitre"}</Text>}
        size="lg"
        centered
        styles={{
          content: { backgroundColor: '#1a1b1e', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '12px' },
          header: { backgroundColor: 'transparent' },
          close: { color: 'white' }
        }}
      >
        {activeChapitreModal && (
          <Stack gap="md">
            <Text size="sm" fw={500} c="white">
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

            <Box bg="rgba(56, 189, 248, 0.08)" p="xs" ta="center" style={{ borderRadius: 6, border: "1px solid rgba(56, 189, 248, 0.2)" }}>
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