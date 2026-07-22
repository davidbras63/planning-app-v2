"use client";

import { Container, Title, SimpleGrid, Card, Text, Stack, Box, Center } from '@mantine/core';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AnalyticsView({ initialData }: { initialData: any[] }) {
  const SEUIL = 10; // Tu peux le rendre dynamique si besoin

  return (
    <Container fluid p="xl">
      <Title order={1} size="h2" fw={700} mb="lg">Tableau de Suivi & Statistiques</Title>

      <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="lg">
        {initialData.map((chap) => {
          // On utilise chap.notes (au lieu de individual_notes) grâce à la jointure
          const chartData = chap.notes?.map((n: any, index: number) => ({
            name: `QCM ${index + 1}`,
            Note: Number(n.contenu) || 0,
          })) || [];

          return (
            <Card key={chap.id} withBorder shadow="sm" radius="md" p="md">
              <Stack gap="xs">
                <Text fw={700} size="lg" truncate>{chap.titre}</Text>
                
                <Box style={{ height: 140, marginTop: '8px' }}>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" hide />
                        <YAxis domain={[0, 20]} hide />
                        <Tooltip />
                        <Line type="monotone" dataKey="Note" stroke="#4f46e5" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <Center h="100%"><Text size="xs" c="dimmed">Aucune note</Text></Center>
                  )}
                </Box>
              </Stack>
            </Card>
          );
        })}
      </SimpleGrid>
    </Container>
  );
}