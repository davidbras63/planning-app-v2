"use client";

import { useState } from 'react';
import { TextInput, Select, DateInput, Button, Stack } from '@mantine/core';
import { createChapterAction } from '@/app/actions/createChapterAction';

export defaut function ChapterCreator({ matieres }: { matieres: any[] }) {
    // J'ai ajouté 'cadencier' ici pour qu'il soit envoyé à l'action serveur
    const [formData, setFormData] = useState({ 
        matiereId: '', 
        nom: '', 
        dateJ0: new Date(), 
        dateExamen: new Date(),
        cadencier: [0, 1, 3, 7, 14, 30] 
    });

    const handleGenerate = async () => {
        await createChapterAction(formData);
        // Optionnel : Trigger un rafraîchissement global ou fermer une modale
    };

    return (
        <Stack>
            <Select data={matieres} onChange={(v) => setFormData({...formData, matiereId: v!})} label="Matière" />
            <TextInput label="Nom du chapitre" onChange={(e) => setFormData({...formData, nom: e.target.value})} />
            <DateInput label="Date J0" value={formData.dateJ0} onChange={(v) => setFormData({...formData, dateJ0: v!})} />
            <DateInput label="Date Examen" value={formData.dateExamen} onChange={(v) => setFormData({...formData, dateExamen: v!})} />
            
            <Button onClick={handleGenerate} color="blue">Générer Planning</Button>
        </Stack>
    );
}
