"use client";

import { useState, useMemo, useRef, useEffect } from 'react';
import { Stack, Group, Button, Paper, Text, Badge, Card, Title } from '@mantine/core';
import { updateEcheanceAction } from '@/app/actions/planningUpdates';
import { toggleEcheanceCompleted } from '@/app/actions/actions';
import GradeInput from '@/components/GradeInput';
import { saveNotesAction, getMoyenneAction, getNotesContentAction, getAllUserNotesAction } from '@/app/actions/gradeActions';
import { useRouter } from 'next/navigation';
import { majDateExamen } from '@/app/actions/majDateExamen';


export default function PlanningView({ chapitres, folderId }: { chapitres: any[], folderId: string }) {
    const router = useRouter();
    const [currentWeekStart, setCurrentWeekStart] = useState<Date>(new Date(0));
    const [notesValues, setNotesValues] = useState<{ [key: string]: string }>({});
    const [averages, setAverages] = useState<{ [key: string]: number }>({});
    const inputRefs = useRef<HTMLInputElement[]>([]);
    

    useEffect(() => {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        setCurrentWeekStart(monday);

        async function loadInitialNotes() {
            try {
                const data = await getAllUserNotesAction();
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
                            chapitreId: chap.id,
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

    const handleDragStart = (e: React.DragEvent, item: any) => {
		e.dataTransfer.setData('text/plain', JSON.stringify({
			id: item.isExamen ? item.chapitreId : item.echeanceId,
			isExamen: item.isExamen
		}));
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
	};

	const handleDrop = async (e: React.DragEvent, targetDateStr: string) => {
		e.preventDefault();
		const rawData = e.dataTransfer.getData('text/plain');
		if (!rawData) return;

		try {
			const data = JSON.parse(rawData);
			if (data.isExamen) {
				await majDateExamen(data.id, new Date(targetDateStr));
			} else {
				await updateEcheanceAction(data.id, new Date(targetDateStr));
			}
			router.refresh();
		} catch (err) {
			console.error("Erreur lors du drop", err);
		}
	};


    const formatDateHeader = (date: Date) => {
        return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'numeric' });
    };

    return (
        <Stack gap="md" w="100%" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
            {/* Ligne du haut : Titre du planning à gauche et boutons à droite alignés sur la même hauteur */}
            <Group justify="space-between" align="center" w="100%" mb="xs">
                <Title order={3} c="dimmed" style={{ margin: 0 }}>
                    Planning de la semaine du {currentWeekStart.toLocaleDateString('fr-FR')}
                </Title>

                <Group gap="xs">
                    <Button
                        variant="default"
                        size="sm"
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

                    <Button variant="outline" color="blue" size="sm" onClick={goToCurrentWeek}>Aujourd'hui</Button>

                    <Button
                        variant="default"
                        size="sm"
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
            </Group>

            {/* Le tableau du planning avec effet transparent/flouté pour s'adapter aux futurs fonds */}
            
  
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '12px', width: '100%', marginBottom: '20px' }}>
					{weekDays.map((day, index) => {
						const dStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
						const itemsForDay = planningItemsByDate[dStr] || [];
						const isToday = new Date().toISOString().split('T')[0] === dStr;

						return (
							<div
								key={index}
								onDragOver={handleDragOver}
								onDrop={(e) => handleDrop(e, dStr)}
								style={{ 
									minHeight: '340px', 
									backgroundColor: isToday ? 'rgba(30, 41, 59, 0.9)' : 'rgba(15, 23, 42, 0.85)', 
									borderRadius: '12px',
									border: isToday ? '2px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.25)',
									boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
									display: 'flex',
									flexDirection: 'column',
									overflow: 'hidden'
								}}
							>
								{/* En-tête du jour */}
								<div style={{ padding: '10px 8px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderBottom: '1px solid rgba(255, 255, 255, 0.15)', textAlign: 'center' }}>
									<span style={{ fontSize: '11px', fontWeight: 700, color: isToday ? '#38bdf8' : '#ffffff', textTransform: 'capitalize', WebkitFontSmoothing: 'antialiased' }}>
										{formatDateHeader(day)}
									</span>
								</div>

								{/* Liste des cartes */}
								<div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
									{itemsForDay.length === 0 ? (
										<div style={{ textAlign: 'center', marginTop: '40px', fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)', fontStyle: 'italic' }}>
											Aucune échéance
										</div>
									) : (
										itemsForDay.map((item, idx) => (
											<div
												key={idx}
												draggable={true}
												onDragStart={(e) => handleDragStart(e, item)}
												style={{
													backgroundColor: item.isExamen ? 'rgba(127, 29, 29, 0.7)' : 'rgba(30, 41, 59, 0.95)',
													border: item.isExamen ? '1px solid #f87171' : '1px solid rgba(255, 255, 255, 0.25)',
													borderRadius: '8px',
													padding: '10px',
													cursor: 'grab',
													boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
													display: 'flex',
													flexDirection: 'column',
													gap: '8px',
													WebkitFontSmoothing: 'antialiased'
												}}
											>
												{/* LIGNE DU HAUT : Check à gauche + Titre du chapitre à côté */}
												<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
													{/* Bouton check ROUGE VIF */}
													{!item.isExamen && (
														<button
															type="button"
															onClick={async () => {
																const newStatus = !item.completed;
																await toggleEcheanceCompleted(item.echeanceId, newStatus);
															}}
															style={{
																width: '18px',
																height: '18px',
																minWidth: '18px',
																borderRadius: '4px',
																cursor: 'pointer',
																backgroundColor: 'rgba(15, 23, 42, 0.9)',
																border: item.completed ? '2px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.5)',
																display: 'flex',
																alignItems: 'center',
																justifyContent: 'center',
																color: '#ef4444',
																fontSize: '12px',
																fontWeight: 900,
																padding: 0,
																margin: 0
															}}
															title="Valider"
														>
															{item.completed ? '✓' : ''}
														</button>
													)}
													{/* Titre du chapitre net à côté du check */}
													<div style={{ fontSize: '11px', fontWeight: 700, color: '#ffffff', wordBreak: 'break-word', lineHeight: '1.2' }}>
														{item.titreChapitre}
													</div>
												</div>

												{/* LIGNE DU BAS : Badge J BLEU ÉLECTRIQUE TRÈS CLAIR à gauche, Matière en bas à droite */}
												<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '2px' }}>
													{/* Badge J : BLEU ÉLECTRIQUE LUMINEUX bien pétant */}
													<span style={{
														backgroundColor: item.isExamen ? '#dc2626' : '#38bdf8', 
														color: '#0f172a', // Texte sombre bien tranché sur le bleu clair lumineux
														padding: '2px 8px',
														borderRadius: '6px', // Forme plus arrondie / pilule
														fontSize: '9px',
														fontWeight: 800,
														textTransform: 'uppercase',
														boxShadow: '0 0 8px rgba(56, 189, 248, 0.4)', // Léger effet néon pour que ça pète bien
														WebkitFontSmoothing: 'antialiased'
													}}>
														{item.stepName}
													</span>

													{/* Matière en bas à droite */}
													<span style={{ fontSize: '9px', fontWeight: 600, color: '#93c5fd', backgroundColor: 'rgba(59, 130, 246, 0.25)', padding: '2px 6px', borderRadius: '4px', textAlign: 'right' }}>
														{item.matiereNom}
													</span>
												</div>
											</div>
										))
									)}
								</div>
							</div>
						  );
						})}
					  </div>

					  <GradeInput
						echeances={todayEcheances}
						inputRefs={inputRefs}
						saveNotesAction={handleSaveNote}
						averages={averages}
						handleCalculateAll={handleCalculateAll}
						notesValues={notesValues}
					  />
					</Stack>
				  );
				}
