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
  getSubjectAnalyseData?: (matiereId: number, folderId: number) => Promise<{ chartData: any[]; matiereAverage: number; totalQcm: number }>;
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

  const [chapitresData, setChapitresData] = useState<Record<string, any>>({});

  const [opened, { open, close }] = useDisclosure(false);
  const [activeChapitreModal, setActiveChapitreModal] = useState<{ label: string; data: any; totalQcm: number; average: number } | null>(null);

  useEffect(() => {
    if (selectedMatiere) {
      if (analysisMode === "anal" && getSubjectAnalyseData) {
        getSubjectAnalyseData(Number(selectedMatiere), folderId).then((res) => {
          if (res) {
            setMatiereInfo({
              chartData: res.chartData,
              average: res.matiereAverage,
              totalQcm: res.totalQcm,
            });
          }
        });
      } else {
        getMatiereData(Number(selectedMatiere)).then((res) => {
          if (res) setMatiereInfo(res);
        });
      }
    }
  }, [selectedMatiere, analysisMode, folderId]);

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
    <Container 'antialiased' WebkitFontSmoothing: fluid p="xl" style="{{" }}>
      <Title '#ffffff', '24px', '8px', 'center', 'flex', 0, 800 alignItems: color: display: fontWeight: gap: margin: marginBottom: order="{2}" style="{{" }}>
        Tableau de Suivi & Statistiques
      </Title>

      <Box mb="{40}">
        <Group align="center" justify="space-between" mb="16px">
          <Title '#38bdf8', '1.25rem' '8px', 'center', 'flex', 0, alignItems: color: display: fontSize: gap: margin: order="{3}" style="{{" }}>
            Matière
          </Title>

          <Group gap="xs">
            <Button "filled" "outline"} "standard" : ? color="cyan" onClick="{()" size="xs" variant="{analysisMode"> setAnalysisMode("standard")}
            >
              Standard
            </Button>
            <Button "anal" "filled" "outline"} : ? color="cyan" onClick="{()" size="xs" variant="{analysisMode"> setAnalysisMode("anal")}
            >
              Mode Anal
            </Button>
          </Group>
        </Group>

        <Select '#1a1b1e', '&[data-selected]': '8px' 'rgba(255, 'white' 'white', 0.05)', 0.1)' 0.15)', 255, 300, backgroundColor: borderColor: borderRadius: color: data="{folderMatieres}" dropdown: input: item: maxWidth: mb="md" onChange="{setSelectedMatiere}" placeholder="Sélectionner une matière" styles="{{" value="{selectedMatiere}" { } }, }}/>

        <Card '12px' 'rgba(255, 0.03)', 0.1)', 255, backgroundColor: borderColor: borderRadius: p="lg" radius="md" shadow="sm" style="{{" withBorder }}>
          <Stack gap="md">
            <Text c="white" fw="{700}" size="lg">
              {analysisMode === "anal" ? "Analyse Globale Matière (Par Date)" : "Vue Globale Matière"} (Moyenne : <span style={{ color: '#38bdf8' }}>{matiereInfo.average} / 20</span>)
            </Text>
            
            <Box "100%" 300, height: style="{{" width: }}>
              {matiereInfo?.chartData && matiereInfo.chartData.length > 0 ? (
                <ResponsiveContainer height="100%" width="100%">
                  <LineChart "standard" -10, 20, 5 5, : ? bottom: data="{analysisMode" left: margin="{{" matiereInfo.chartData} right: sortChartSteps(matiereInfo.chartData) top: }}>
                    <CartesianGrid stroke="rgba(255, 255, 255, 0.1)" strokeDasharray="3 3"/>
                    <XAxis "anal" "date" "step"} 12 : ? dataKey="{analysisMode" fontSize: stroke="#909296" tick="{{" }}/>
                    <YAxis 12 20]} domain="{[0," fontSize: stroke="#909296" tick="{{" }}/>
                    <Tooltip '#1a1b1e', '#fff' 'rgba(255, 0.15)', 255, 8, backgroundColor: borderColor: borderRadius: color: contentStyle="{{" }}/>
                    <Line "Moyenne "anal" 4 : ? J"} Session" dataKey="moyenne" dot="{{" name="{analysisMode" r: stroke="#38bdf8" strokeWidth="{3}" type="monotone" }}/>
                    {analysisMode === "standard" && (
                      <Line dataKey="average" dot="{false}" name="Average" stroke="#f87171" strokeDasharray="5 5" strokeWidth="{2}" type="monotone"/>
                    )}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Center h="100%"><Text c="dimmed" size="sm">Aucune donnée disponible pour cette matière</Text></Center>
              )}
            </Box>

            <Box "1px 0.2)" 189, 248, 6, bg="rgba(56, 189, 248, 0.08)" border: borderRadius: p="xs" rgba(56, solid style="{{" ta="center" }}>
              <Text c="#38bdf8" fw="{700}" size="sm">
                QCM : {matiereInfo.totalQcm} réalisés
              </Text>
            </Box>
          </Stack>
        </Card>
      </Box>

      <Box>
        <Title '#38bdf8', '1.25rem' '16px', '8px', 'center', 'flex', 0, alignItems: color: display: fontSize: gap: margin: marginBottom: order="{3}" style="{{" }}>
          Chapitres
        </Title>
        
        <SimpleGrid 1, 2, 4 base: cols="{{" md: sm: spacing="lg" }}>
          {filteredChapitres.map((chap) => {
            const chapInfo = chapitresData[chap.value] || { chartData: [], average: 0, totalQcm: 0 };

            return (
              <Card "pointer", "transform '12px', 'rgba(255, 0.03)', 0.1)', 0.2s" 0.2s, 255, backgroundColor: border-color borderColor: borderRadius: cursor: key="{chap.value}" onClick="{()" p="md" radius="md" shadow="sm" style="{{" transition: withBorder }}> handleCardClick(chap, chapInfo)}
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
                  <Text c="white" fw="{700}" size="sm" truncate>{chap.label}</Text>

                  <Box 140 height: style="{{" }}>
                    {chapInfo?.chartData && chapInfo.chartData.length > 0 ? (
                      <ResponsiveContainer height="100%" width="100%">
                        <LineChart -20, 5 5, bottom: data="{sortChartSteps(chapInfo.chartData)}" left: margin="{{" right: top: }}>
                          <CartesianGrid stroke="rgba(255, 255, 255, 0.1)" strokeDasharray="3 3"/>
                          <XAxis '#909296' 10, dataKey="step" fill: fontSize: tick="{{" }}/>
                          <YAxis '#909296' 10, 20]} domain="{[0," fill: fontSize: tick="{{" }}/>
                          <Tooltip '#1a1b1e', '#fff' 'rgba(255, 0.15)', 255, 8, backgroundColor: borderColor: borderRadius: color: contentStyle="{{" }}/>
                          <Line dataKey="moyenne" dot="{false}" stroke="#38bdf8" strokeWidth="{2}" type="monotone"/>
                          <Line dataKey="average" dot="{false}" stroke="#f87171" strokeDasharray="3 3" strokeWidth="{1.5}" type="monotone"/>
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <Center h="100%"><Text c="dimmed" size="xs">Aucune note</Text></Center>
                    )}
                  </Box>

                  <Box "1px 0.2)" 189, 248, 6, bg="rgba(56, 189, 248, 0.08)" border: borderRadius: p="xs" rgba(56, solid style="{{" ta="center" }}>
                    <Text c="#38bdf8" fw="{700}" size="sm">
                      QCM : {chapInfo.totalQcm}
                    </Text>
                  </Box>
                </Stack>
              </Card>
            );
          })}
        </SimpleGrid>
      </Box>

      <Modal c="white" fw="{700}" onClose="{close}" opened="{opened}" title="{<Text">{activeChapitreModal?.label || "Détail Chapitre"}</Text>}
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
            <Text c="white" fw="{500}" size="sm">
              Moyenne globale du chapitre : <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>{activeChapitreModal.average} / 20</span>
            </Text>
            
            <Box "100%" 350, height: style="{{" width: }}>
              <ResponsiveContainer height="100%" width="100%">
                <LineChart -10, 20, 5 5, bottom: data="{sortChartSteps(activeChapitreModal.data)}" left: margin="{{" right: top: }}>
                  <CartesianGrid stroke="rgba(255, 255, 255, 0.1)" strokeDasharray="3 3"/>
                  <XAxis dataKey="step" stroke="#909296"/>
                  <YAxis 20]} domain="{[0," stroke="#909296"/>
                  <Tooltip '#1a1b1e', '#fff' 'rgba(255, 0.15)', 255, 8, backgroundColor: borderColor: borderRadius: color: contentStyle="{{" }}/>
                  <Line 4 dataKey="moyenne" dot="{{" name="Moyenne J" r: stroke="#38bdf8" strokeWidth="{3}" type="monotone" }}/>
                  <Line dataKey="average" dot="{false}" name="Average" stroke="#f87171" strokeDasharray="5 5" strokeWidth="{2}" type="monotone"/>
                </LineChart>
              </ResponsiveContainer>
            </Box>

            <Box "1px 0.2)" 189, 248, 6, bg="rgba(56, 189, 248, 0.08)" border: borderRadius: p="xs" rgba(56, solid style="{{" ta="center" }}>
              <Text c="#38bdf8" fw="{700}" size="sm">
                Total QCM réalisés : {activeChapitreModal.totalQcm}
              </Text>
            </Box>
          </Stack>
        )}
      </Modal>
    </Container>
  );
}