"use client";

import { Container, Title, Text, Stack, Accordion, Button, Card, Group } from '@mantine/core';
import { HelpCircle, ArrowLeft, Mail, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function FAQPage() {
  const router = useRouter();

  return (
    <main style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', padding: '40px 20px' }}>
      <Container size="md">
       
        {/* BOUTONS DE NAVIGATION */}
        <Group justify="space-between" mb="lg">
          <Button
            variant="subtle"
            color="gray"
            leftSection={<ArrowLeft size={16} />}
            onClick={() => router.push('/')}
          >
            Retour à l'accueil
          </Button>

          <Button
            variant="light"
            color="indigo"
            leftSection={<Home size={16} />}
            onClick={() => router.push('/protected/dashboard')}
          >
            Revenir à l'application
          </Button>
        </Group>

        {/* EN-TÊTE */}
        <Stack align="center" mb={40} style={{ textAlign: 'center' }}>
          <div style={{ background: '#e0e7ff', color: '#4f46e5', padding: '12px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HelpCircle size={32} />
          </div>
          <Title order={1}>Prise en main de Nesis App</Title>
          <Text c="dimmed" maw={600}>
            Tout ce que tu dois savoir pour maîtriser l'application, organiser tes révisions et piloter ton succès.
          </Text>
        </Stack>

        {/* ACCORDÉON DES QUESTIONS / RÉPONSES */}
        <Accordion variant="separated" defaultValue="q1">
         
          <Accordion.Item value="q1">
            <Accordion.Control>1. Comment débuter et structurer mes révisions sur l'application ?</Accordion.Control>
            <Accordion.Panel>
              <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
                La structure est pensée en cascade pour s'y retrouver facilement :
                <br />• <b>Étape 1 :</b> Crée un <b>dossier</b>.
                <br />• <b>Étape 2 :</b> Crée tes <b>matières</b>.
                <br />• <b>Étape 3 :</b> Va dans les <b>paramètres</b>, règle ton cadencier, tes seuils de notes basses et ta charge de travail autorisée pour la réintégration.
                <br />• <b>Étape 4 :</b> Crée tes <b>chapitres</b> en étant sur l'onglet planning.
              </Text>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="q2">
            <Accordion.Control>2. Comment fonctionne le planning et la méthode des J ?</Accordion.Control>
            <Accordion.Panel>
              <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
                Dès que tu crées un chapitre, l'application génère automatiquement les dates. Si tu décales le J0, cela entraîne un décalage global de tout le cycle. 
                <br /><br />
                Tu peux également déplacer n'importe quel J de manière indépendante (en cas de retard ou d'imprévu) : tous les J se déplacent de façon indépendante, sauf le J0 qui fait un déplacement global. 
                <br /><br />
                <b>Pour déplacer un J d'une semaine à l'autre :</b> clique sur la vignette (le curseur se transforme en petite main), glisse-la vers le haut ou le bas sur l'onglet de la semaine précédente ou suivante pour changer de vue, puis dépose-la dans le jour souhaité du planning.
              </Text>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="q3">
            <Accordion.Control>3. Comment saisir mes notes au quotidien ?</Accordion.Control>
            <Accordion.Panel>
              <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
                Dans l'onglet <b>planning / tableau de saisie de notes</b>, tape tes notes séparées d'espaces. Si tu fais des QCM sur 100 ou des notations spécifiques, entre ta note sous format fractionnaire (par exemple <code>80/100</code> ou <code>30/50</code>). Si ce sont des notes classiques sur 20, tape simplement la note. L'application se charge de tout convertir et de calculer automatiquement les moyennes sur 20.
              </Text>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="q4">
            <Accordion.Control>4. Que se passe-t-il si une note est trop basse ? (Le Dashboard et la Réintégration)</Accordion.Control>
            <Accordion.Panel>
              <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
                Si ta note passe sous ton seuil, le chapitre bascule dans ton Dashboard. Un clic sur le bouton de réintégration recase automatiquement la session. 
                <br /><br />
                Le nombre maximum de cours autorisé sert uniquement à fixer un seuil de cours maximum qu'on autorise pour ne pas rajouter de surcharge de travail lors de la réintégration. Si l'application ne trouve pas de place automatiquement, tu peux <b>forcer la réintégration</b> : un petit calendrier interactif s'ouvre alors pour te permettre de placer la session manuellement.
              </Text>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="q5">
            <Accordion.Control>5. À quoi servent les graphiques de niveau ?</Accordion.Control>
            <Accordion.Panel>
              <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
                Les graphiques affichent de vraies courbes d'évolution par matière et par chapitre grâce aux notes que tu saisis. Ils ne mentent pas : ils te montrent précisément ton niveau réel pour ajuster ton effort avant tes examens.
              </Text>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="q6">
            <Accordion.Control>6. Comment fonctionnent la période d'essai et la conservation des données ?</Accordion.Control>
            <Accordion.Panel>
              <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
                Tu bénéficies de <b>30 jours d'essai</b> complets pour tester l'outil. Si ton essai se termine et que tu n'as pas encore validé ton abonnement, tes données et ton planning sont conservés en sécurité pendant une période de grâce pour ne pas perdre ton travail.
              </Text>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="q7">
            <Accordion.Control>7. Comment contacter le support en cas de besoin ?</Accordion.Control>
            <Accordion.Panel>
              <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
                Si tu ne trouves pas la réponse dans cette notice, tu peux utiliser l'onglet <b>Contact</b> présent tout en bas de ta barre de navigation pour nous envoyer un e-mail directement.
              </Text>
            </Accordion.Panel>
          </Accordion.Item>

        </Accordion>

        {/* CARTE DE CONTACT RAPIDE */}
        <Card withBorder mt={50} p="xl" radius="md" bg="white" ta="center">
          <Stack align="center" gap="xs">
            <Mail size={24} color="#4f46e5" />
            <Title order={3} size="h4">Tu as besoin d'aide supplémentaire ?</Title>
            <Text size="sm" c="dimmed">Notre équipe technique reste à ta disposition via la messagerie de l'application.</Text>
            <Link href="/contact" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '10px', color: '#4f46e5', textDecoration: 'none', fontWeight: 500 }}>
              <Mail size={20} />
              Contactez le support
            </Link>
          </Stack>
        </Card>

      </Container>
    </main>
  );
}
