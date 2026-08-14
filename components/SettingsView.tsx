"use client";

import { useState, useEffect } from 'react';
import { Container, Title, Card, TextInput, NumberInput, Button, Table, Group, Stack, Text, Slider } from '@mantine/core';
import { Save } from 'lucide-react';
import { saveSettingsAction } from '@/app/actions/settingsActions';
import { actionRecalculerCadencierComplet } from "@/app/actions/recalculerCadencier";

export default function SettingsView({ initialData, clerkId, folderId }: { initialData: any, clerkId: string, folderId: string }) {
 
  const parseCadencier = (dataCadencier: any) => {
    if (Array.isArray(dataCadencier)) return dataCadencier.join(',');
    return dataCadencier || '0,1,3,7,14,30,60,90';
  };

  const parseEchelleMax = (dataSeuilHaut: any) => {
    let firstHaut = 20;
    if (Array.isArray(dataSeuilHaut)) {
      firstHaut = Number(dataSeuilHaut?.[0]);
    } else if (typeof dataSeuilHaut === 'string') {
      firstHaut = Number(dataSeuilHaut.split(',')[0]);
    }
    return !isNaN(firstHaut) && firstHaut > 0 ? firstHaut : 20;
  };

  const [cadencier, setCadencier] = useState<string>(() => parseCadencier(initialData?.cadencier));
  const [joursMax, setJourMax] = useState<number>(() => Number(initialData?.maxCoursParJour ?? initialData?.maxJoueurs) || 5);
  const [loading, setLoading] = useState<boolean>(false);
  const echelleMax = 20;

  const listeDesJours = cadencier.split(',').map((j: string) => j.trim()).filter((j: string) => j !== '');

  const parseSeuilsBas = (dataSeuilBas: any, currentJours: string[], maxEchelle: number) => {
    const temp: Record<string, number> = {};
    let basArr: any[] = [];
    if (Array.isArray(dataSeuilBas)) {
      basArr = dataSeuilBas;
    } else if (typeof dataSeuilBas === 'string') {
      basArr = dataSeuilBas.split(',');
    }
    currentJours.forEach((jour: string, index: number) => {
      const val = Number(basArr[index]);
      temp[jour] = !isNaN(val) ? val : Math.min(10, maxEchelle);
    });
    return temp;
  };

  const [seuilsBasParJour, setSeuilsBasParJour] = useState<Record<string, number>>(() => 
    parseSeuilsBas(initialData?.seuilBasNote, listeDesJours, echelleMax)
  );

  // Synchronise les états si les données de la base changent (évite le cache persistant)
  useEffect(() => {
    if (initialData) {
      const newCadencierStr = parseCadencier(initialData.cadencier);
      setCadencier(newCadencierStr);
      setJourMax(Number(initialData.maxCoursParJour ?? initialData.maxJoueurs) || 5);
      
      

      const newJoursList = newCadencierStr.split(',').map((j: string) => j.trim()).filter((j: string) => j !== '');
      setSeuilsBasParJour(parseSeuilsBas(initialData.seuilBasNote, newJoursList, echelleMax));
    }
  }, [initialData]);

  const handleRecalcClick = async () => {
    try {
      setLoading(true);
      const cadencierArray = listeDesJours.map((j) => Number(j));
      const result = await actionRecalculerCadencierComplet(clerkId, folderId, cadencierArray);
     
      if (result && "success" in result && !result.success) {
        alert("Erreur : " + result.message);
      } else {
        alert("Cadencier enregistré et recalculé avec succès !");
      }
    } catch (err) {
      alert("Une erreur est survenue lors du recalcul.");
    } finally {
      setLoading(false);
    }
  };
 
  const handleSave = async () => {
    setLoading(true);
   
    const cadencierArray = listeDesJours.map((j) => Number(j));
    const seuilBasArray = listeDesJours.map((jour: string) => Number(seuilsBasParJour[jour] ?? 0));
    const seuilHautArray = listeDesJours.map(() => Number(echelleMax));

    const payload = {
      cadencier: cadencierArray,
      maxCoursParJour: joursMax,
      seuilBasNote: seuilBasArray,
      seuilHautNote: seuilHautArray,
    };

    try {
      await saveSettingsAction(clerkId, folderId, payload);
      alert("Enregistré avec succès !");
    } catch (e: any) {
      console.error("Erreur front:", e);
      alert("Erreur lors de l'enregistrement : " + (e.message || "Erreur inconnue"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container fluid p="xl">
      <Stack gap="lg">
        <Title order={2}>Paramètres du cadencier et des seuils</Title>
       
        <Card withBorder shadow="sm" p="md">
          <Stack gap="md">
            <TextInput
              label="Cadencier (jours séparés par des virgules)"
              value={cadencier}
              onChange={(e) => setCadencier(e.currentTarget.value)}
            />
           
            <Group grow>
              <NumberInput
                label="Nombre max de cours par jour"
                value={joursMax}
                onChange={(val) => setJourMax(Number(val) || 5)}
                min={1}
                max={10}
              />
              
            </Group>

            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: '15%' }}>Jour</Table.Th>
                  <Table.Th style={{ width: '70%' }}>Curseur Seuil Bas (Max: {echelleMax})</Table.Th>
                  <Table.Th style={{ width: '15%', textAlign: 'center' }}>Valeur</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {listeDesJours.map((jour, index) => {
                  const bas = seuilsBasParJour[jour] ?? 0;

                  return (
                    <Table.Tr key={`${jour}-${index}`}>
                      <Table.Td>
                        <Text fw={500}>Jour {jour}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Slider
                          min={0}
                          max={echelleMax}
                          step={1}
                          value={bas > echelleMax ? echelleMax : bas}
                          onChange={(newBas) => {
                            setSeuilsBasParJour(prev => ({ ...prev, [jour]: newBas }));
                          }}
                          marks={[
                            { value: 0, label: '0' },
                            { value: Math.round(echelleMax / 2), label: `${Math.round(echelleMax / 2)}` },
                            { value: echelleMax, label: `${echelleMax}` },
                          ]}
                        />
                      </Table.Td>
                      <Table.Td align="center">
                        <Text size="sm" c="dimmed" fw={700}>
                          {bas} / {echelleMax}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>

            <Group justify="flex-end">
              <Button
                variant="outline"
                onClick={handleRecalcClick}
              >
                Recalculer le cadencier
              </Button>

              <Button loading={loading} onClick={handleSave} leftSection={<Save size={16} />}>
                Enregistrer
              </Button>
            </Group>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}