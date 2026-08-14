"use client";

import { useState, useMemo, useRef, useEffect } from 'react';
import { Stack, Group, Button, Paper, Text, Badge, Card } from '@mantine/core';
import { updateEcheanceAction } from '@/app/actions/planningUpdates';
import { toggleEcheanceCompleted } from '@/app/actions/actions';
import GradeInput from '@/components/GradeInput';
import { saveNotesAction, getMoyenneAction, getNotesContentAction, getAllUserNotesAction } from '@/app/actions/gradeActions';

export default function PlanningView({ chapitres, folderId }: { chapitres: any[], folderId: string }) {

    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        return monday;
    });

    // États pour gérer les notes saisies, les moyennes et les références d'inputs
    const [notesValues, setNotesValues] = useState<{ [key: string]: string }>({});
    const [averages, setAverages] = useState<{ [key: string]: number }>({});
    const inputRefs = useRef<HTMLInputElement[]>([]);

    // CHARGEMENT INITIAL : Récupération de toutes les notes depuis Neon au montage pour afficher le contenu et les moyennes
    // CHARGEMENT INITIAL : Récupération de toutes les notes depuis Neon au montage pour affichage
    useEffect(() => {
        async function loadInitialNotes() {
            try {
                const data = await getAllUserNotesAction();
                console.log("DONNEES RECUES DE NEON : ", data);
                
                const loadedNotes: { [key: string]: string } = {};
                const loadedAverages: { [key: string]: number } = {};

                if (data && typeof data === 'object') {
                    for (const [key, value] of Object.entries(data)) {
                        if (value && typeof value === 'object') {
                            loadedNotes[key] = (value as any).content || "";
                            loadedAverages[key] = Number((value as any).moyenne) || 0;
                        }
                    }
                }

                setNotesValues(loadedNotes);
                setAverages(loadedAverages);
            } catch (error) {
                // On ignore l'erreur si elle est liée à l'initialisation de session Clerk
                // tant que les données finissent par se charger.
                console.log("Chargement en attente de session..."); 
            }
        }

        loadInitialNotes();
    }, []);

    // Date du jour au format YYYY-MM-DD pour filtrer le tableau du jour
    const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;

    // Référence pour gérer le délai sécurisé en drag-and-drop sur les boutons de semaine
    const dragTimerRef = useRef<NodeJS.Timeout | null>(null);

    const changeWeek = (dir: number) => {
        setCurrentWeekStart((prev) => {
            const next = new Date(prev);
            next.setDate(next.getDate() + (dir * 7));
            return next;
        });
    };

    const goToCurrentWeek = () => {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        setCurrentWeekStart(monday);
    };

    const weekDays = useMemo(() => {
        const days = [];
        for (let i = 0; i < 7; i++) {
            const dayDate = new Date(currentWeekStart);
            dayDate.setDate(dayDate.getDate() + i);
            days.push(dayDate);
        }
        return days;
    }, [currentWeekStart]);

    const planningItemsByDate = useMemo(() => {
        const map: { [key: string]: any[] } = {};
        if (!chapitres) return map;

        chapitres.forEach((chap: any) => {
            // 1. Injection de l'examen à sa date exacte sur le planning
            if (chap.dateExamen) {
                const dEx = new Date(chap.dateExamen);
                const dateExStr = `${dEx.getFullYear()}-${String(dEx.getMonth() + 1).padStart(2, '0')}-${String(dEx.getDate()).padStart(2, '0')}`;

                if (!map[dateExStr]) {
                    map[dateExStr] = [];
                }

                map[dateExStr].push({
                    isExamen: true,
                    echeanceId: null,
                    chapitreId: chap.id,
                    titreChapitre: chap.titre || chap.nom || 'Sans nom',
                    matiereNom: chap.matiere?.nom || chap.matiereId || 'Matière',
                    stepName: 'EXAMEN',
                });
            }

            // 2. Traitement des échéances de révision classiques
            if (chap.echeances && Array.isArray(chap.echeances)) {
                chap.echeances.forEach((ech: any) => {
                    if (ech.date) {
                        const d = new Date(ech.date);
                        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                       
                        if (!map[dateStr]) {
                            map[dateStr] = [];
                        }

                        let stepLabel = ech.stepName || ech.nom || ech.stepLabel || ech.step || ech.type;
                        if (!stepLabel && ech.stepIndex !== undefined) {
                            stepLabel = `J${ech.stepIndex}`;
                        }
                        if (!stepLabel && ech.j !== undefined) {
                            stepLabel = `J${ech.j}`;
                        }
                        if (!stepLabel) {
                            stepLabel = 'J?';
                        }

                        map[dateStr].push({
                            isExamen: false,
                            echeanceId: ech.id,
                            chapitreId: chap.id, // <-- On transmet bien le chapitreId ici !
                            titreChapitre: chap.titre || chap.nom || 'Sans nom',
                            matiereNom: chap.matiere?.nom || chap.matiereId || 'Matière',
                            stepName: stepLabel,
							completed: ech.completed,
                        });
                    }
                });
            }
        });

        return map;
    }, [chapitres]);

    const todayEcheances = useMemo(() => {
        return (planningItemsByDate[todayStr] || []).filter((item: any) => !item.isExamen);
    }, [planningItemsByDate, todayStr]);

    // Fonction de sauvegarde mise à jour avec le couple (echeanceId, chapitreId)
    const handleSaveNote = async (echeanceId: string, chapitreId: string, value: string) => {
        if (!echeanceId || !chapitreId) return;
        const rowKey = `${echeanceId}_${chapitreId}`;
        setNotesValues(prev => ({ ...prev, [rowKey]: value }));
        await saveNotesAction(echeanceId, chapitreId, value);
    };

    // Fonction du bouton "Calculer moyenne" mise à jour
    const handleCalculateAll = async () => {
        const newAverages: { [key: string]: number } = {};
        const newNotesValues: { [key: string]: string } = {};

        for (const item of todayEcheances) {
            const { echeanceId, chapitreId } = item;
            if (echeanceId && chapitreId) {
                const rowKey = `${echeanceId}_${chapitreId}`;
                const moyenne = await getMoyenneAction(echeanceId, chapitreId);
                const content = await getNotesContentAction(echeanceId, chapitreId);
               
                newAverages[rowKey] = moyenne;
                newNotesValues[rowKey] = content;
            }
        }
        setAverages(newAverages);
        setNotesValues(prev => ({ ...prev, ...newNotesValues }));
    };

    const handleDragStart = (e: React.DragEvent, echeanceId: string) => {
        e.dataTransfer.setData('text/plain', echeanceId);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = async (e: React.DragEvent, targetDateStr: string) => {
        e.preventDefault();
        const echeanceId = e.dataTransfer.getData('text/plain');
        if (!echeanceId) return;

        await updateEcheanceAction(echeanceId, new Date(targetDateStr));
        window.location.reload();
    };

    const formatDateHeader = (date: Date) => {
        return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'numeric' });
    };

    return (
        <Stack gap="md" w="100%" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
            <Group justify="flex-start" w="100%">
                <Button
                    variant="default"
                    onClick={() => changeWeek(-1)}
                    onDragOver={(e) => {
                        e.preventDefault();
                        if (!dragTimerRef.current) {
                            dragTimerRef.current = setTimeout(() => {
                                changeWeek(-1);
                                dragTimerRef.current = null;
                            }, 1200);
                        }
                    }}
                    onDragLeave={() => {
                        if (dragTimerRef.current) {
                            clearTimeout(dragTimerRef.current);
                            dragTimerRef.current = null;
                        }
                    }}
                >
                    ← Semaine Précédente
                </Button>

                <Button variant="outline" color="blue" onClick={goToCurrentWeek}>Aujourd'hui</Button>

                <Button
                    variant="default"
                    onClick={() => changeWeek(1)}
                    onDragOver={(e) => {
                        e.preventDefault();
                        if (!dragTimerRef.current) {
                            dragTimerRef.current = setTimeout(() => {
                                changeWeek(1);
                                dragTimerRef.current = null;
                            }, 1200);
                        }
                    }}
                    onDragLeave={() => {
                        if (dragTimerRef.current) {
                            clearTimeout(dragTimerRef.current);
                            dragTimerRef.current = null;
                        }
                    }}
                >
                    Semaine Suivante →
                </Button>
            </Group>

            <Paper shadow="sm" p="md" radius="md" withBorder w="100%">
                <Text fw={700} size="lg" mb="md" ta="center">
                    Planning de la semaine du {currentWeekStart.toLocaleDateString('fr-FR')}
                </Text>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '6px', width: '100%' }}>
                    {weekDays.map((day, index) => {
                        const dStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
                        const itemsForDay = planningItemsByDate[dStr] || [];

                        return (
                            <Card
                                key={index}
                                shadow="xs"
                                p={4}
                                radius="md"
                                withBorder
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, dStr)}
                                style={{ minHeight: '300px', backgroundColor: '#fdfdfd', overflow: 'hidden' }}
                            >
                                <Text fw={700} size="10px" ta="center" mb="xs" c="blue.8" style={{ textTransform: 'capitalize', borderBottom: '1px solid #eee', paddingBottom: '4px' }}>
                                    {formatDateHeader(day)}
                                </Text>

                                <Stack gap={4}>
                                    {itemsForDay.length === 0 ? (
                                        <Text c="dimmed" size="9px" ta="center" mt="sm">Rien</Text>
                                    ) : (
                                        itemsForDay.map((item, idx) => (
                                            <Paper
                                                key={idx}
                                                p={4}
                                                radius="sm"
                                                withBorder
                                                draggable={!item.isExamen}
                                                onDragStart={(e) => !item.isExamen && handleDragStart(e, item.echeanceId)}
                                                style={{
                                                    backgroundColor: item.isExamen ? '#ffe3e3' : '#fff',
                                                    borderColor: item.isExamen ? '#fa5252' : undefined,
                                                    cursor: item.isExamen ? 'default' : 'grab'
                                                }}
                                            >
                                                <Group justify="space-between" wrap="nowrap" mb={2}>
													<Group gap="xs" wrap="nowrap">
														{/* Ajout de la case à cocher ici */}
														<input 
															type="checkbox" 
															defaultChecked={!!item.completed} 
															onChange={async (e) => {
																await toggleEcheanceCompleted(item.echeanceId, e.target.checked);
															}}
															style={{ cursor: 'pointer' }}
														/>
														<Badge
															size="xs"
															color={item.isExamen ? 'red' : 'blue'}
															variant={item.isExamen ? 'filled' : 'light'}
															style={{ padding: '0 2px', fontSize: '8px', minHeight: '16px' }}
														>
															{item.stepName}
														</Badge>
													</Group>
													<Text size="7px" c="dimmed" truncate style={{ maxWidth: '35px' }}>
														{item.matiereNom}
													</Text>
												</Group>
                                                <Text size="9px" fw={600} truncate c={item.isExamen ? 'red.9' : undefined}>
                                                    {item.titreChapitre}
                                                </Text>
                                            </Paper>
                                        ))
                                    )}
                                </Stack>
                            </Card>
                        );
                    })}
                </div>
            </Paper>

            <Paper shadow="sm" p="md" radius="md" withBorder w="100%">
                <GradeInput
                    echeances={todayEcheances}
                    inputRefs={inputRefs}
                    saveNotesAction={handleSaveNote}
                    averages={averages}
                    handleCalculateAll={handleCalculateAll}
                    notesValues={notesValues}
                />
            </Paper>
        </Stack>
    );
}
