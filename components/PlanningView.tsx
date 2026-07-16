// components/PlanningView.tsx
"use client";
import { useMockUser } from '@/lib/fakeAuth';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from '@clerk/nextjs';
import { Stack, Text, Flex, Card, Grid, Badge, Button, Table, Group, ActionIcon } from '@mantine/core';
import { Calendar } from 'lucide-react';
import GradeInput from './GradeInput';

interface Chapitre {
  id: string;
  name: string;
  current_step: number;
  next_review: string;
  subject_id: string;
  created_at?: string;
}

export default function PlanningView() {
  const { user: realUser, isLoaded: realIsLoaded } = useUser();
  const { user, isLoaded } = useMockUser(realUser, realIsLoaded);
  const [loading, setLoading] = useState(true);
  const [allChapters, setAllChapters] = useState<Chapitre[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  });

  const INTERVALS = [1, 3, 7, 15, 30, 60];
  const hasFetched = useRef(false);

  const fetchChapters = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chapters')
        .select('*');

      if (error) {
        console.error("Erreur Supabase:", error.message);
      } else if (data) {
        setAllChapters(data);
      }
    } catch (err) {
      console.error("Erreur inattendue:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && user?.id && !hasFetched.current) {
      hasFetched.current = true;
      fetchChapters();
    }
  }, [user?.id, isLoaded]);

  const getDaysOfWeek = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const clone = new Date(currentWeekStart);
      clone.setDate(clone.getDate() + i);
      days.push(clone);
    }
    return days;
  };

  const days = getDaysOfWeek();

  const changeWeek = (direction: 'prev' | 'next') => {
    setCurrentWeekStart(prev => {
      const next = new Date(prev);
      next.setDate(next.getDate() + (direction === 'next' ? 7 : -7));
      return next;
    });
  };

  const handleDragStart = (e: React.DragEvent, chapterId: string) => {
    e.dataTransfer.setData("text/plain", chapterId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetDateStr: string) => {
    e.preventDefault();
    const chapterId = e.dataTransfer.getData("text/plain");
    if (!chapterId) return;
    updateChapterDate(chapterId, targetDateStr);
  };

  const updateChapterDate = async (chapterId: string, newDateStr: string) => {
    if (!newDateStr) return;
    const { error } = await supabase
      .from('chapters')
      .update({ next_review: newDateStr })
      .eq('id', chapterId);

    if (error) {
      alert("Erreur lors de la modification de la date : " + error.message);
    } else {
      setAllChapters(prev => prev.map(c => c.id === chapterId ? { ...c, next_review: newDateStr } : c));
    }
  };

  const formatDateStr = (date: Date) => date.toISOString().split('T')[0];

  if (loading) {
    return <Text size="sm" c="dimmed" ta="center" py="xl">Chargement de votre planning et de vos notes...</Text>;
  }

  return (
    <Stack gap="xl" style={{ width: '100%' }}>
      <style>{`
        body, main, [class*="Container-root"] {
          max-width: 100% !important;
          width: 100% !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          margin: 0 !important;
        }
      `}</style>
     
      <Card withBorder shadow="sm" radius="md" p="md" bg="var(--mantine-color-body)" style={{ width: '100%' }}>
        <Flex justify="space-between" align="center" mb="md" wrap="wrap" gap="sm">
          <Group gap="xs">
            <Calendar size={20} color="var(--mantine-color-indigo-4)" />
            <Text fw={700} size="lg">Vue Calendrier Hebdomadaire</Text>
          </Group>
          <Group gap="xs">
            <Button variant="default" size="xs" onClick={() => changeWeek('prev')}>Semaine Précédente</Button>
            <Button variant="default" size="xs" onClick={() => setCurrentWeekStart(new Date())}>Aujourd'hui</Button>
            <Button variant="default" size="xs" onClick={() => changeWeek('next')}>Semaine Suivante</Button>
          </Group>
        </Flex>

        <Grid gutter="xs" columns={7} style={{ width: '100%', margin: 0 }}>
          {days.map((day, idx) => {
            const dateStr = formatDateStr(day);
            const chaptersForDay = allChapters.filter(c => c.next_review === dateStr);
            const isToday = formatDateStr(new Date()) === dateStr;

            return (
              <Grid.Col span={1} key={idx}>
                <PaperDay
                  dayName={day.toLocaleDateString('fr-FR', { weekday: 'short' })}
                  dayNum={day.getDate()}
                  isToday={isToday}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, dateStr)}
                >
                  <Stack gap={6} style={{ minHeight: '160px', width: '100%' }}>
                    {chaptersForDay.map(c => (
                      <div
                        key={c.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, c.id)}
                        style={{ cursor: 'grab' }}
                      >
                        <Card p={6} radius="xs" bg="var(--mantine-color-indigo-9)" style={{ borderLeft: '3px solid var(--mantine-color-indigo-4)' }}>
                          <Flex justify="space-between" align="flex-start" gap={4}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <Text size="xs" fw={600} style={{ whiteSpace: 'normal', wordBreak: 'break-word' }} c="white">{c.name}</Text>
                              <Text size="9px" c="indigo.1">Étape : J+{c.current_step === 0 ? '0' : INTERVALS[c.current_step - 1] || c.current_step}</Text>
                            </div>
                           
                            <div style={{ position: 'relative', width: '20px', height: '20px', marginTop: '2px' }}>
                              <ActionIcon variant="subtle" size="xs" color="indigo.2" style={{ position: 'absolute', zIndex: 1, pointerEvents: 'none' }}>
                                <Calendar size={12} />
                              </ActionIcon>
                              <input
                                type="date"
                                value={c.next_review}
                                onChange={(e) => updateChapterDate(c.id, e.target.value)}
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  width: '100%',
                                  height: '100%',
                                  opacity: 0,
                                  cursor: 'pointer',
                                  zIndex: 2
                                }}
                              />
                            </div>
                          </Flex>
                        </Card>
                      </div>
                    ))}
                    {chaptersForDay.length === 0 && (
                      <Text size="10px" c="dimmed" ta="center" my="auto">Vide</Text>
                    )}
                  </Stack>
                </PaperDay>
              </Grid.Col>
            );
          })}
        </Grid>
      </Card>

      <Card withBorder shadow="sm" radius="md" p="xl" bg="var(--mantine-color-body)" style={{ width: '100%' }}>
        <Text fw={700} size="lg" mb="md">Tableau d'Évaluation & Saisie des Notes</Text>
       
        <div style={{ width: '100%' }}>
          <Table striped highlightOnHover withTableBorder withColumnBorders verticalSpacing="sm" style={{ width: '100%' }}>
            <Table.Thead bg="var(--mantine-color-dark-6)">
              <Table.Tr>
                <Table.Th style={{ color: 'white' }}>Nom du Chapitre</Table.Th>
                <Table.Th style={{ color: 'white', width: '150px' }}>Étape Actuelle</Table.Th>
                <Table.Th style={{ color: 'white', width: '180px' }}>Date Prévue</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {allChapters.length > 0 ? (
                allChapters.map((c) => (
                  <Table.Tr key={c.id}>
                    <Table.Td fw={500} style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{c.name || "Sans nom"}</Table.Td>
                    <Table.Td>
                      <Badge color={c.current_step === 0 ? "blue" : "teal"} variant="light">
                        {c.current_step === 0 ? "Initial (J0)" : `Rév. Étape ${c.current_step}`}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c={new Date(c.next_review) < new Date() ? "red.5" : "dimmed"}>
                        {new Date(c.next_review).toLocaleDateString('fr-FR')}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))
              ) : (
                <Table.Tr>
                  <Table.Td colSpan={3} ta="center" py="xl" c="dimmed">
                    Aucun chapitre dans votre base pour le moment.
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </div>
      </Card>

      {/* COMPOSANT SAISIE : INTÉGRÉ ICI HORS DE LA BOUCLE */}
      <GradeInput
        chapitresDuJour={allChapters.filter(c => c.next_review === formatDateStr(new Date()))}
        onCalculated={fetchChapters}
      />
    </Stack>
  );
}

function PaperDay({ dayName, dayNum, isToday, children, onDragOver, onDrop }: {
  dayName: string; dayNum: number; isToday: boolean; children: React.ReactNode;
  onDragOver: (e: React.DragEvent) => void; onDrop: (e: React.DragEvent) => void;
}) {
  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={{
        padding: '8px',
        borderRadius: 'var(--mantine-radius-md)',
        backgroundColor: isToday ? 'var(--mantine-color-dark-5)' : 'var(--mantine-color-dark-8)',
        border: isToday ? '2px solid var(--mantine-color-indigo-5)' : '1px solid var(--mantine-color-dark-6)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      <Flex direction="column" align="center" style={{ gap: '2px' }}>
        <Text size="xs" fw={700} tt="uppercase" c={isToday ? "indigo.3" : "dimmed"}>{dayName}</Text>
        <Text size="sm" fw={800} c={isToday ? "white" : "var(--mantine-color-text)"}>{dayNum}</Text>
      </Flex>
      {children}
    </div>
  );
}
