"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Container, Title, SimpleGrid, Card, Text, Stack, Box, Center } from '@mantine/core';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AnalyticsPage() {
  const [data, setData] = useState<any[]>([]);
  const [seuil, setSeuil] = useState<number>(10); // Valeur par défaut de secours

  useEffect(() => {
    async function loadStats() {
      // 1. Récupérer le seuil personnalisé depuis la base
      const { data: settings } = await supabase.from('settings').select('min_note');
      if (settings && settings.length > 0) {
        setSeuil(settings[0].min_note);
      }

      // 2. Récupérer les chapitres et leurs notes
      const { data: chapitres } = await supabase
        .from('chapters')
        .select(`
          id,
          title,
          last_average,
          individual_notes ( id, note_value )
        `);

      if (chapitres) {
        setData(chapitres);
      }
    }
    loadStats();
  }, []);

  return (
    <Container fluid p="xl">
      <Title order={1} size="h2" fw={700} mb="lg">
        Tableau de Suivi & Statistiques
      </Title>

      <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="lg">
        {data.map((chap) => {
          const chartData = chap.individual_notes?.map((n: any, index: number) => ({
            name: `QCM ${index + 1}`,
            Note: n.note_value || 0,
          })) || [];

          return (
            <Card key={chap.id} withBorder shadow="sm" radius="md" p="md" bg="var(--mantine-color-body)">
              <Stack gap="xs">
                <Box>
                  <Text fw={700} size="lg" truncate>
                    {chap.title}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Moyenne actuelle : <Text span fw={700} c={chap.last_average >= seuil ? "green.4" : "red.4"}>
                      {chap.last_average ? `${chap.last_average}/20` : "N/A"}
                    </Text>
                  </Text>
                </Box>

                <Box style={{ height: 140, marginTop: '8px' }}>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--mantine-color-dark-4)" />
                        <XAxis dataKey="name" hide />
                        <YAxis domain={[0, 20]} hide />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--mantine-color-dark-6)',
                            borderColor: 'var(--mantine-color-dark-4)',
                            color: '#fff',
                            borderRadius: '4px'
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="Note"
                          stroke={chap.last_average >= seuil ? "var(--mantine-color-indigo-5)" : "var(--mantine-color-red-5)"}
                          strokeWidth={2.5}
                          dot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <Center style={{ height: '100%', border: '1px dashed var(--mantine-color-dark-4)', borderRadius: 'var(--mantine-radius-sm)' }}>
                      <Text size="xs" c="dimmed" fs="italic">Aucune note enregistrée</Text>
                    </Center>
                  )}
                </Box>

                <Box style={{ backgroundColor: 'var(--mantine-color-dark-8)', padding: '10px', borderRadius: 'var(--mantine-radius-sm)' }} mt="xs">
                  <Text size="xs" c="dimmed" ta="center">Total QCM faits</Text>
                  <Text ta="center" size="xl" fw={900} c="indigo.4">
                    {chap.individual_notes?.length || 0}
                  </Text>
                </Box>
              </Stack>
            </Card>
          );
        })}
      </SimpleGrid>
    </Container>
  );
}