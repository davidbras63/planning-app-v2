"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Container, Title, Select, Card, Text, Stack, Box, Center, SimpleGrid, Modal, Flex } from "@mantine/core";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useDisclosure } from "@mantine/hooks";

interface AnalyticsViewProps {
  matieresList: { value: string; label: string; folderId: number }[];
  chapitresList: { value: string; label: string; matiereId: number }[];
  annalesList?: { value: string; label: string; matiereId: number }[];
  getMatiereData: (matiereId: number) => Promise<{ chartData: any[]; average: number; totalQcm: number }>;
  getChapitreData: (chapitreId: number) => Promise<{ chartData: any[]; average: number; totalQcm: number }>;
  getAnnalesData?: (matiereId: number) => Promise<{ chartData: any[]; average: number; totalAnnales: number }>;
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
  annalesList = [],
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

  const [matiereInfo, setMatiereInfo] = useState<{ chartData: any[]; average: number; totalQcm: number }>({
    chartData: [],
    average: 0,
    totalQcm: 0,
  });

  const [annalesInfo, setAnnalesInfo] = useState<{ chartData: any[]; average: number; totalAnnales: number }>({
    chartData: [],
    average: 0,
    totalAnnales: 0,
  });

  const [chapitresData, setChapitresData] = useState<Record<string, any>>({});

  // Bascule dynamique du focus (false = 70% chapitres / 30% annales, true = inverse)
  const [focusAnnales, setFocusAnnales] = useState<boolean>(false);

  const [opened, { open, close }] = useDisclosure(false);
  const [activeChapitreModal, setActiveChapitreModal] = useState<{ label: string; data: any; totalQcm: number; average: number } | null>(null);

  useEffect(() => {
    if (selectedMatiere) {
      getMatiereData(Number(selectedMatiere)).then((res) => {
        if (res) setMatiereInfo(res);
      });

      if (getAnnalesData) {
        getAnnalesData(Number(selectedMatiere)).then((res) => {
          if (res) setAnnalesInfo(res);
        });
      }
    }
  }, [selectedMatiere]);

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
      {/* Titre Principal */}
      <Title order={2} mb="lg" style={{ color: '#ffffff' }}>
        Tableau de Suivi & Statistiques
      </Title>

      {/* Disposition principale modulée selon focusAnnales */}
      <Flex direction={{ base: 'column', lg: 'row' }} gap="lg" align="flex-start">
        
        {/* COLONNE DE GAUCHE : MATIÈRES ET CHAPITRES */}
        <Box 
          style={{ 
            flex: focusAnnales ? '0 0 30%' : '0 0 70%', 
            minWidth: 0, 
            width: '100%',
            transition: 'flex 0.3s ease-in-out',
            cursor: focusAnnales ? 'pointer' : 'default'
          }}
          onClick={() => {
            if (focusAnnales) setFocusAnnales(false);
          }}
        >
          {focusAnnales && (
            <Box mb="sm">
              <Text size="xs" c="#38bdf8" fs="italic">💡 Cliquez ici pour redonner la priorité aux Chapitres (70/30)</Text>
            </Box>
          )}

          {/* --- SECTION 1 : VUE MATIÈRE --- */}
          <Box mb={40}>
            <Title order={3} mb="md" style={{ color: '#ffffff', fontSize: '18px' }}>
              Matières & Révisions J
            </Title>

            <Select
              placeholder="Sélectionner une matière"
              data={folderMatieres}
              value={selectedMatiere}
              onChange={setSelectedMatiere}
              mb="md"
              onClick={(e) => e.stopPropagation()}
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
               
                <Box style={{ height: focusAnnales ? 200 : 300, width: "100%", transition: 'height 0.3s ease-in-out' }}>
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

                <Box bg="rgba(56, 189, 248, 0.08)" p="xs" ta="center" style={{ borderRadius: 4, border: "1px solid rgba(56, 189, 248, 0.2)" }}>
                  <Text size="sm" fw={700} c="#38bdf8">
                    QCM : {matiereInfo.totalQcm} réalisés
                  </Text>
                </Box>
              </Stack>
            </Card>
          </Box>

          {/* --- SECTION 2 : VUE CHAPITRES --- */}
          {!focusAnnales && (
            <Box>
              <Title order={3} mb="md" style={{ color: '#ffffff', fontSize: '18px' }}>
                Chapitres
              </Title>
             
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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCardClick(chap, chapInfo);
                      }}
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
            </Box>
          )}
        </Box>

        {/* COLONNE DE DROITE : ANNALES / EXAMENS */}
        <Box 
          style={{ 
            flex: focusAnnales ? '0 0 70%' : '0 0 30%', 
            minWidth: '320px', 
            width: '100%',
            transition: 'flex 0.3s ease-in-out',
            cursor: !focusAnnales ? 'pointer' : 'default'
          }}
          onClick={() => {
            if (!focusAnnales) setFocusAnnales(true);
          }}
        >
          {!focusAnnales && (
            <Box mb="sm">
              <Text size="xs" c="#f43f5e" fs="italic">💡 Cliquez ici pour passer les Annales en grand (70%)</Text>
            </Box>
          )}

          <Title order={3} mb="md" style={{ color: '#ffffff', fontSize: '18px' }}>
            Annales & Examens
          </Title>

          <Card withBorder shadow="sm" radius="md" p="lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
            <Stack gap="md">
              <Text fw={700} size="md" c="white">
                Moyenne Annales : <span style={{ color: '#f43f5e' }}>{annalesInfo.average} / 20</span>
              </Text>

              <Box style={{ height: focusAnnales ? 420 : 260, width: "100%", transition: 'height 0.3s ease-in-out' }}>
                {annalesInfo?.chartData && annalesInfo.chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={annalesInfo.chartData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                      <XAxis dataKey="title" stroke="#909296" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 20]} stroke="#909296" tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#1a1b1e', borderColor: 'rgba(255, 255, 255, 0.15)', borderRadius: 8, color: '#fff' }} />
                      <Line type="monotone" dataKey="score" stroke="#f43f5e" strokeWidth={3} name="Note Annales" dot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <Center h="100%"><Text size="sm" c="dimmed" ta="center">Aucune annale enregistrée pour cette matière</Text></Center>
                )}
              </Box>

              <Box bg="rgba(244, 63, 94, 0.08)" p="xs" ta="center" style={{ borderRadius: 4, border: "1px solid rgba(244, 63, 94, 0.2)" }}>
                <Text size="sm" fw={700} c="#f43f5e">
                  Annales : {annalesInfo.totalAnnales} passées
                </Text>
              </Box>
            </Stack>
          </Card>
        </Box>

      </Flex>

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