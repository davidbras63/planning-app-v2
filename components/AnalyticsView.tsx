"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Container, Title, Select, Card, Text, Stack, Box, Center, SimpleGrid, Modal } from "@mantine/core";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useDisclosure } from "@mantine/hooks";

interface AnalyticsViewProps {
  matieresList: { value: string; label: string; folderId: number }[];
  chapitresList: { value: string; label: string; matiereId: number }[];
  getMatiereData: (matiereId: number) => Promise<{ chartData: any[]; average: number; totalQcm: number }>;
  getChapitreData: (chapitreId: number) => Promise<{ chartData: any[]; average: number; totalQcm: number }>;
}

// Fonction de tri pour forcer l'ordre des étapes (J0, J7, J7R, J14...)
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
}: AnalyticsViewProps) {
  const params = useParams();
  const folderId = Number(params?.folderId);

  // Filter matieres by folder
  const folderMatieres = matieresList.filter((m) => m.folderId === folderId);

  const [selectedMatiere, setSelectedMatiere] = useState<string | null>(
    folderMatieres.length > 0 ? folderMatieres[0].value : null
  );

  // Etats stockés proprement pour stopper la boucle infinie
  const [matiereInfo, setMatiereInfo] = useState<{ chartData: any[]; average: number; totalQcm: number }>({
    chartData: [],
    average: 0,
    totalQcm: 0,
  });

  const [chapitresData, setChapitresData] = useState<Record<string, any>>({});

  // Modal
  const [opened, { open, close }] = useDisclosure(false);
  const [activeChapitreModal, setActiveChapitreModal] = useState<{ label: string; data: any; totalQcm: number; average: number } | null>(null);

  // 1. Récupération des données Matière sans boucler
  useEffect(() => {
    if (selectedMatiere) {
      getMatiereData(Number(selectedMatiere)).then((res) => {
        if (res) setMatiereInfo(res);
      });
    }
  }, [selectedMatiere]);

  // 2. Récupération des données Chapitres sans boucler
  const filteredChapitres = chapitresList.filter(
    (chap) => !selectedMatiere || chap.matiereId === Number(selectedMatiere)
  );

  useEffect(() => {
    // Réinitialiser les données des chapitres quand la matière change
    setChapitresData({});

    filteredChapitres.forEach((chap) => {
      getChapitreData(Number(chap.value)).then((res) => {
        if (res) {
          setChapitresData((prev) => ({ ...prev, [chap.value]: res }));
        }
      });
    });
  }, [selectedMatiere, chapitresList.length]); // Ajout de chapitresList.length pour le rechargement initial

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
    <Container fluid p="xl">
      <Title order={2} c="dimmed" style={{ margin: 0, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
 Tableau de Suivi & Statistiques
 </Title>

      {/* --- SECTION 1 : VUE MATIÈRE --- */}
      <Box mb={40}>
        <Title order={3} c="dimmed" style={{ margin: 0, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
 Matière
</Title>
        <Select
          placeholder="Sélectionner une matière"
          data={folderMatieres}
          value={selectedMatiere}
          onChange={setSelectedMatiere}
          mb="md"
          styles={{
            input: {
              maxWidth: 300,
              backgroundColor: '#0f172a', // Fond sombre
              borderColor: '#334155', // Bordure foncée
              color: 'white' // Texte blanc
            },
            dropdown: { backgroundColor: '#0f172a', borderColor: '#334155', color: 'white' },
            item: { '&[data-selected]': { backgroundColor: '#1e293b' } }
          }}
        />

        <Card withBorder shadow="sm" radius="md" p="lg" style={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }}>
          <Stack gap="xs">
            <Text fw={700} size="lg" c="white">Vue Globale Matière (Moyenne: {matiereInfo.average} / 20)</Text>
           
            <Box style={{ height: 300, width: "100%" }}>
              {matiereInfo?.chartData && matiereInfo.chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sortChartSteps(matiereInfo.chartData)} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="step" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 20]} stroke="#94a3b8" tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8, color: '#fff' }} />
                    <Line type="monotone" dataKey="moyenne" stroke="#38bdf8" strokeWidth={3} name="Moyenne J" dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="average" stroke="#f87171" strokeWidth={2} strokeDasharray="5 5" name="Average" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Center h="100%"><Text size="sm" c="dimmed">Aucune donnée disponible pour cette matière</Text></Center>
              )}
            </Box>

            <Box bg="rgba(56, 189, 248, 0.1)" p="xs" ta="center" style={{ borderRadius: 4, border: "1px solid rgba(56, 189, 248, 0.3)" }}>
              <Text size="sm" fw={700} c="#38bdf8">
                QCM : {matiereInfo.totalQcm} réalisés
              </Text>
            </Box>
          </Stack>
        </Card>
      </Box>

      {/* --- SECTION 2 : VUE CHAPITRES --- */}
      <Box>
        <Title order={3} c="dimmed" style={{ margin: 0, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                  backgroundColor: '#0f172a',
                  borderColor: '#1e293b',
                  cursor: "pointer",
                  transition: "transform 0.2s, border-color 0.2s"
                }}
                onClick={() => handleCardClick(chap, chapInfo)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.borderColor = "#38bdf8";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "#1e293b";
                }}
              >
                <Stack gap="xs">
                  <Text fw={700} size="sm" truncate c="white">{chap.label}</Text>

                  <Box style={{ height: 140 }}>
                    {chapInfo?.chartData && chapInfo.chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sortChartSteps(chapInfo.chartData)} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="step" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                          <YAxis domain={[0, 20]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8, color: '#fff' }} />
                          <Line type="monotone" dataKey="moyenne" stroke="#38bdf8" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="average" stroke="#f87171" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <Center h="100%"><Text size="xs" c="dimmed">Aucune note</Text></Center>
                    )}
                  </Box>

                  <Box bg="rgba(56, 189, 248, 0.1)" p="xs" ta="center" style={{ borderRadius: 4, border: "1px solid rgba(56, 189, 248, 0.3)" }}>
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

      {/* --- MODAL DE ZOOM --- */}
      <Modal
        opened={opened}
        onClose={close}
        title={<Text fw={700} c="white">{activeChapitreModal?.label || "Détail Chapitre"}</Text>}
        size="lg"
        centered
        styles={{
          content: { backgroundColor: '#0f172a', border: '1px solid #1e293b' },
          header: { backgroundColor: '#0f172a' },
          close: { color: 'white' }
        }}
      >
        {activeChapitreModal && (
          <Stack gap="md">
            <Text size="sm" fw={500} c="gray.3">Moyenne globale du chapitre : {activeChapitreModal.average} / 20</Text>
           
            <Box style={{ height: 350, width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sortChartSteps(activeChapitreModal.data)} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="step" stroke="#94a3b8" />
                  <YAxis domain={[0, 20]} stroke="#94a3b8" />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8, color: '#fff' }} />
                  <Line type="monotone" dataKey="moyenne" stroke="#38bdf8" strokeWidth={3} name="Moyenne J" dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="average" stroke="#f87171" strokeWidth={2} strokeDasharray="5 5" name="Average" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Box>

            <Box bg="rgba(56, 189, 248, 0.1)" p="xs" ta="center" style={{ borderRadius: 4, border: "1px solid rgba(56, 189, 248, 0.3)" }}>
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
