"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Container, Title, Select, Card, Text, Stack, Box, Center, SimpleGrid, Modal, Group, Button } from "@mantine/core";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useDisclosure } from "@mantine/hooks";

interface AnalyticsViewProps {
  matieresList: { value: string; label: string; folderId: number }[];
  chapitresList: { value: string; label: string; matiereId: number }[];
  getMatiereData: (matiereId: number) => Promise<{ chartData: any[]; average: number; totalQcm: number }>;
  getChapitreData: (chapitreId: number) => Promise<{ chartData: any[]; average: number; totalQcm: number }>;
  getFolderAnalysesData?: (folderId: number) => Promise<{ success: boolean; data: Record<string, any> }>;
}

const sortChartSteps = (data: any[]) => {
  if (!Array.isArray(data)) return [];
  return [...data].sort((a, b) => {
    const stepA = String(a.step || "");
    const stepB = String(b.step || "");
    const numA = parseInt(stepA.replace(/\D/g, "")) || 0;
    const numB = parseInt(stepB.replace(/\D/g, "")) || 0;
    if (numA !== numB) return numA - numB;
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
  getFolderAnalysesData,
}: AnalyticsViewProps) {
  const params = useParams();
  const folderId = Number(params?.folderId);

  const folderMatieres = matieresList.filter((m) => m.folderId === folderId);

  const [selectedMatiere, setSelectedMatiere] = useState<string | null>(
    folderMatieres.length > 0 ? folderMatieres[0].value : null
  );

  const [analysisMode, setAnalysisMode] = useState<"standard" | "anal">("standard");
  const [matiereInfo, setMatiereInfo] = useState<{ chartData: any[]; average: number; totalQcm: number }>({
    chartData: [],
    average: 0,
    totalQcm: 0,
  });

  const [subjectsAnalysesData, setSubjectsAnalysesData] = useState<Record<string, any>>({});
  const [chapitresData, setChapitresData] = useState<Record<string, any>>({});

  const [opened, { open, close }] = useDisclosure(false);
  const [activeModalItem, setActiveModalItem] = useState<{ label: string; data: any; totalQcm: number; average: number; isDateMode?: boolean } | null>(null);

  // Standard mode fetch
  useEffect(() => {
    if (analysisMode === "standard" && selectedMatiere) {
      getMatiereData(Number(selectedMatiere)).then((res) => {
        if (res) setMatiereInfo(res);
      });
    }
  }, [selectedMatiere, analysisMode, getMatiereData]);

  // Mode Anal : UNE SEULE REQUÊTE POUR TOUT LE DOSSIER
  useEffect(() => {
    if (analysisMode === "anal" && getFolderAnalysesData) {
      getFolderAnalysesData(folderId).then((res) => {
        if (res && res.success) {
          setSubjectsAnalysesData(res.data);
        }
      });
    }
  }, [analysisMode, folderId, getFolderAnalysesData]);

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
  }, [selectedMatiere, chapitresList.length, getChapitreData]);

  const handleCardClick = (label: string, info: any, isDateMode = false) => {
    setActiveModalItem({
      label,
      data: info?.chartData || [],
      totalQcm: info?.totalQcm || 0,
      average: info?.average || 0,
      isDateMode,
    });
    open();
  };

  const selectedMatiereLabel = folderMatieres.find((m) => m.value === selectedMatiere)?.label || "Matière";

  return (
    <Container fluid p="xl" style={{ WebkitFontSmoothing: 'antialiased' }}>
      <Title order={2} style={{ color: '#ffffff', margin: 0, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}>
        Tableau de Suivi & Statistiques
      </Title>

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

            <Card
              withBorder
              shadow="sm"
              radius="md"
              p="lg"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                cursor: "pointer",
                transition: "transform 0.2s, border-color 0.2s"
              }}
              onClick={() => handleCardClick(`Vue Globale Matière : ${selectedMatiereLabel}`, matiereInfo, false)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
              }}
            >
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
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
            {folderMatieres.map((mat) => {
              const matInfo = subjectsAnalysesData[mat.value] 
                || subjectsAnalysesData[String(mat.value)] 
                || subjectsAnalysesData[Number(mat.value)] 
                || { chartData: [], average: 0, totalQcm: 0 };

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
                    borderRadius: '12px',
                    cursor: "pointer",
                    transition: "transform 0.2s, border-color 0.2s"
                  }}
                  onClick={() => handleCardClick(mat.label, matInfo, true)}
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
                            <Line type="monotone" dataKey="average" stroke="#f87171" strokeWidth={1.5} strokeDasharray="5 5" name="Average" dot={false} />
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

      {/* --- SECTION 2 : VUE CHAPITRES --- */}
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
                  onClick={() => handleCardClick(chap.label, chapInfo, false)}
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

      {/* --- MODAL DE ZOOM UNIVERSELLE --- */}
      <Modal
        opened={opened}
        onClose={close}
        title={<Text fw={700} c="white">{activeModalItem?.label || "Détail"}</Text>}
        size="lg"
        centered
        styles={{
          content: { backgroundColor: '#1a1b1e', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '12px' },
          header: { backgroundColor: 'transparent' },
          close: { color: 'white' }
        }}
      >
        {activeModalItem && (
          <Stack gap="md">
            <Text size="sm" fw={500} c="white">
              Moyenne : <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>{activeModalItem.average} / 20</span>
            </Text>
           
            <Box style={{ height: 350, width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={activeModalItem.isDateMode ? activeModalItem.data : sortChartSteps(activeModalItem.data)} 
                  margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis dataKey={activeModalItem.isDateMode ? "date" : "step"} stroke="#909296" />
                  <YAxis domain={[0, 20]} stroke="#909296" />
                  <Tooltip contentStyle={{ backgroundColor: '#1a1b1e', borderColor: 'rgba(255, 255, 255, 0.15)', borderRadius: 8, color: '#fff' }} />
                  <Line type="monotone" dataKey="moyenne" stroke="#38bdf8" strokeWidth={3} name={activeModalItem.isDateMode ? "Moyenne Session" : "Moyenne J"} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="average" stroke="#f87171" strokeWidth={2} strokeDasharray="5 5" name="Average" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Box>

            <Box bg="rgba(56, 189, 248, 0.08)" p="xs" ta="center" style={{ borderRadius: 6, border: "1px solid rgba(56, 189, 248, 0.2)" }}>
              <Text size="sm" fw={700} c="#38bdf8">
                Total QCM réalisés : {activeModalItem.totalQcm}
              </Text>
            </Box>
          </Stack>
        )}
      </Modal>
    </Container>
  );
}