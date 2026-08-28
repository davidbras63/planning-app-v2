"use client";

import { useState, useEffect } from 'react';
import { TextInput, Select, Button, Stack, Notification, Paper, Title, Group } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { createChapterAction } from '@/app/actions/createChapterAction';
import { useParams } from 'next/navigation';

interface ChapterCreatorProps {
    onCreated?: () => void;
}

export default function ChapterCreator({ onCreated }: ChapterCreatorProps) {
    const params = useParams();
    const folderId = params?.folderId ? Number(params.folderId) : undefined;

    const [matieres, setMatieres] = useState<any[]>([]);
    const [cadencier, setCadencier] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState(false);
   
    const [formData, setFormData] = useState({
        matiereId: '',
        nom: '',
        dateJ0: new Date(),
        dateExamen: null as Date | null,
    });

    useEffect(() => {
        async function loadData() {
            try {
                const resMatieres = await fetch(`/api/matieres?folderId=${folderId}`);
				if (resMatieres.ok) {
					const data = await resMatieres.json();
					setMatieres(Array.isArray(data) ? data : data.matieres || []);
				}
            } catch (e) {
                console.error("Erreur matières", e);
            }

            try {
                const resSettings = await fetch('/api/settings');
                if (resSettings.ok) {
                    const data = await resSettings.json();
                   
                    const rawCadencier = data?.cadencier ?? data;

                    if (Array.isArray(rawCadencier)) {
                        const cleanCadencier = rawCadencier
                            .map((val: any) => Number(val))
                            .filter((n: number) => !isNaN(n));

                        setCadencier(cleanCadencier);
                        console.log("Cadencier JSONB chargé avec succès :", cleanCadencier);
                    }
                }
            } catch (e) {
                console.error("Erreur settings", e);
            }
        }
        loadData();
    }, [folderId]);


    const handleGenerate = async () => {
        if (!formData.nom || !formData.matiereId || !formData.dateExamen) {
            alert("Merci de remplir tous les champs obligatoires.");
            return;
        }

        if (cadencier.length === 0) {
			alert(`Vous n'avez pas encore paramétré votre profil. Veuillez aller dans l'onglet Paramètres pour :

		1. Vérifier ou modifier votre cadencier de révision.
		2. Régler vos seuils de notes basses.
		3. Renseigner votre nombre de cours maximum par jour (la limite de saturation quotidienne : si une journée atteint ce quota, le système bloque la réintégration automatique pour éviter la surcharge et cherche le jour suivant).

		Une fois vos réglages enregistrés, vous pourrez créer votre chapitre.`);
			return;
		}

        try {
            setLoading(true);
            setSuccessMessage(false);
           
            await createChapterAction({
                ...formData,
                cadencier,
                folderId
            });

            setFormData({
                matiereId: '',
                nom: '',
                dateJ0: new Date(),
                dateExamen: null,
            });
            setSuccessMessage(true);

            window.location.reload();

            setTimeout(() => setSuccessMessage(false), 4000);

        } catch (error) {
            console.error("Erreur lors de la création", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Stack gap="xs" maw="100%" w="100%" mx="auto">
            <div style={{
                backgroundColor: 'rgba(15, 23, 42, 0.85)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
                padding: '16px',
                marginBottom: '20px',
                WebkitFontSmoothing: 'antialiased'
            }}>
                {successMessage && (
                    <Notification color="teal" title="Succès !" mb="sm" onClose={() => setSuccessMessage(false)}>
                        Le chapitre a bien été créé.
                    </Notification>
                )}

                <Group grow align="flex-end">
                    <Select
                        data={matieres?.map((m: any) => ({
                            value: String(m.id ?? m.id_matiere ?? m.matiereId ?? ''),
                            label: m.nom ?? m.label ?? ''
                        })) || []}
                        value={formData.matiereId}
                        onChange={(v) => setFormData({ ...formData, matiereId: v || '' })}
                        label="Matière"
                        placeholder="Matière"
                        clearable
                        size="xs"
                        styles={{
                            input: {
                                backgroundColor: 'rgba(30, 41, 59, 0.9)',
                                color: '#ffffff',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                            }
                        }}
                    />

                    <TextInput
                        label="Nom du chapitre"
                        placeholder="Nom"
                        value={formData.nom}
                        onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                        size="xs"
                        styles={{
                            input: {
                                backgroundColor: 'rgba(30, 41, 59, 0.9)',
                                color: '#ffffff',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                            }
                        }}
                    />
                   
                    <DateInput
                        label="Date J0"
                        value={formData.dateJ0}
                        onChange={(v) => setFormData({ ...formData, dateJ0: v || new Date() })}
                        size="xs"
                        styles={{
                            input: {
                                backgroundColor: 'rgba(30, 41, 59, 0.9)',
                                color: '#ffffff',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                            }
                        }}
                    />

                    <DateInput
                        label="Date Examen"
                        placeholder="Examen"
                        clearable
                        required
                        value={formData.dateExamen}
                        onChange={(v) => setFormData({ ...formData, dateExamen: v })}
                        size="xs"
                        styles={{
                            input: {
                                backgroundColor: 'rgba(30, 41, 59, 0.9)',
                                color: '#ffffff',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                            }
                        }}
                    />

                    <Button
                        onClick={handleGenerate}
                        loading={loading}
                        size="xs"
                        style={{
                            height: '30px',
                            backgroundColor: '#38bdf8', // Le même bleu électrique lumineux que les badges J
                            color: '#0f172a', // Texte sombre bien contrasté
                            fontWeight: 800,
                            boxShadow: '0 0 8px rgba(56, 189, 248, 0.4)',
                            border: 'none'
                        }}
                    >
                        Générer
                    </Button>
                </Group>
            </div>
        </Stack>
    );

}