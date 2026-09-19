"use client";

import { useEffect, Suspense, useState } from 'react';
import { useUser, SignInButton, SignUpButton, SignOutButton } from '@clerk/nextjs';
import { Container, Title, Text, Button, Stack, Grid, Card, Group, ThemeIcon } from '@mantine/core';
import { Calendar, Brain, RefreshCw, BarChart3, ArrowRight, CreditCard, Sliders, HelpCircle, Gift } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

function AuthAlertHandler() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('auth_alert') === 'true') {
      alert("Connectez-vous avant d'accéder à cette page !");
      window.history.replaceState({}, '', '/');
    }
  }, [searchParams]);

  return null;
}

export default function LandingPage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const [userStatus, setUserStatus] = useState<string | null>(null);
  const [periodEnd, setPeriodEnd] = useState<string | null>(null);
  const [customerPortalUrl, setCustomerPortalUrl] = useState<string | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    if (isSignedIn) {
      fetch('/api/user-status')
        .then((res) => res.json())
        .then((data) => {
          if (data) {
            setUserStatus(data.status);
            setPeriodEnd(data.periodEnd);
            setCustomerPortalUrl(data.customerPortalUrl);
          }
          setIsDataLoaded(true);
        })
        .catch((err) => {
          console.error("Erreur chargement statut user", err);
          setIsDataLoaded(true);
        });
    } else {
      setIsDataLoaded(true);
    }
  }, [isSignedIn]);

  if (!isLoaded || (isSignedIn && !isDataLoaded)) return null;

  const now = new Date();
  const hasTimeRemaining = periodEnd ? new Date(periodEnd) > now : false;

  // Le bouton d'abonnement classique reste visible uniquement pour trial, expired, canceled (ou non connectés)
  const shouldShowSubscriptionButton = !isSignedIn || ['trial', 'expired', 'canceled'].includes(userStatus || '');

  // Cas spécifique : En pause ET période finie -> Bouton orange pour gérer / reprendre l'abonnement
  const isPausedAndExpired = userStatus === 'paused' && !hasTimeRemaining;

  // Bannière d'essai gratuit affichée pour les non-connectés ou non en règle
  const showTrialBanner = !isSignedIn || (!['active', 'elite'].includes(userStatus || '') && !hasTimeRemaining);

  return (
    <main style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', paddingBottom: '80px' }}>
      <Suspense fallback={null}>
        <AuthAlertHandler />
      </Suspense>

      {/* HEADER / HERO SECTION */}
      <div style={{ backgroundColor: '#141517', minHeight: '100vh', padding: '20px 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div>
            <img
              src="/logo.png"
              alt="Logo Nesis"
              style={{ height: '140px', width: 'auto', filter: 'brightness(0) saturate(100%) invert(70%) sepia(80%) saturate(500%) hue-rotate(120deg)' }}
            />
          </div>
          <div>
            {isSignedIn && (
              <SignOutButton>
                <button style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 500
                }}>
                  Déconnexion
                </button>
              </SignOutButton>
            )}
          </div>
        </div>

        <Container size="md">
          <Stack align="center" gap="lg">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.1)', padding: '6px 16px', borderRadius: '20px', fontSize: '0.85rem', marginBottom: '10px' }}>
              <HelpCircle size={16} color="#4f9fa5" /> Finis les révisions au feeling : ton contrôle continu personnel
            </div>
           
            <Title order={1} style={{ fontSize: '2.8rem', fontWeight: 800, lineHeight: 1.2, color: 'white', textAlign: 'center' }}>
              Pilote tes révisions <br />sans mauvaise surprise.
            </Title>
           
            <Text size="lg" c="white" maw={700} ta="center" style={{ opacity: 0.9 }}>
              En études supérieures, entre la charge de travail et la liberté d'organisation, il est facile de se laisser submerger. Reprends le contrôle avec la répétition espacée, un planning intelligent et des graphiques de niveau infaillibles.
            </Text>

            {showTrialBanner && (
              <div style={{ background: 'rgba(79, 70, 229, 0.2)', border: '1px solid #4f46e5', padding: '10px 20px', borderRadius: '8px' }}>
                <Text size="sm" c="white" ta="center">
                  🎁 <b>3 jours d'essai gratuit offerts</b> : Teste l'intégralité de la méthode sans engagement. Tes données restent sécurisées.
                </Text>
              </div>
            )}
           
            <div style={{ marginTop: '5px' }}>
              {!isSignedIn ? (
                <Group gap="md" justify="center">
                  <SignUpButton mode="modal">
                    <Button size="lg" color="indigo" rightSection={<ArrowRight size={18} />}>
                      Commencer mes 3 jours d'essai
                    </Button>
                  </SignUpButton>
                 
                  <SignInButton mode="modal">
                    <Button size="lg" variant="outline" color="gray" style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'white' }}>
                      Se connecter
                    </Button>
                  </SignInButton>

                  <Button
                    size="lg"
                    variant="outline"
                    color="gray"
                    leftSection={<CreditCard size={18} />}
                    onClick={() => router.push('/subscription')}
                  >
                    Abonnement — 7,90 € / mois
                  </Button>
                </Group>
              ) : (
                <Group gap="md" justify="center">
                  {/* Bouton d'accès au dashboard */}
                  <Button size="lg" color="indigo" rightSection={<ArrowRight size={18} />} onClick={() => router.push('/protected/dashboard')}>
                    Accéder à mon espace
                  </Button>

                  {/* Bouton orange de gestion si paused et période finie */}
                  {isPausedAndExpired && customerPortalUrl && (
                    <Button
                      size="lg"
                      color="orange"
                      leftSection={<CreditCard size={18} />}
                      onClick={() => window.location.href = customerPortalUrl}
                    >
                      Gérer mon abonnement &amp; Reprendre
                    </Button>
                  )}

                  {/* Bouton d'abonnement classique affiché uniquement si trial, expired ou canceled */}
                  {shouldShowSubscriptionButton && (
                    <Button
                      size="lg"
                      variant="outline"
                      color="gray"
                      leftSection={<CreditCard size={18} />}
                      onClick={() => router.push('/subscription')}
                    >
                      Abonnement — 7,90 € / mois
                    </Button>
                  )}
                </Group>
              )}
            </div>
          </Stack>
        </Container>
      </div>

      {/* SECTION EXPLICATION : COMMENT ÇA MARCHE */}
      <Container size="lg" mt={60}>
        <Stack align="center" mb={40}>
          <Title order={2} ta="center" c="#141517">Comment ça fonctionne du début à la fin ?</Title>
          <Text c="gray.7" ta="center" maw={650} fw={500}>
            Un système pensé pour les étudiants en quête de performance, pour transformer chaque révision en point de progression mesurable.
          </Text>
        </Stack>

        <Grid gutter="lg">
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card withBorder p="xl" radius="md" style={{ height: '100%', backgroundColor: '#1b1c20', borderColor: '#2f3136' }}>
              <ThemeIcon size={50} radius="md" color="violet" mb="md">
                <Sliders size={26} />
              </ThemeIcon>
              <Title order={3} size="h4" mb="sm" c="white">1. Paramètres personnalisables</Title>
              <Text size="sm" c="white" style={{ lineHeight: 1.6, opacity: 0.9 }}>
                Règle ton cadencier de J exactement comme tu le souhaites, définis tes seuils de notes basses en fonction des J, et configure le nombre maximum de cours autorisé pour la réintégration afin de ne pas te rajouter de surcharge de travail.
              </Text>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card withBorder p="xl" radius="md" style={{ height: '100%', backgroundColor: '#1b1c20', borderColor: '#2f3136' }}>
              <ThemeIcon size={50} radius="md" color="indigo" mb="md">
                <Calendar size={26} />
              </ThemeIcon>
              <Title order={3} size="h4" mb="sm" c="white">2. Planning & Gestion des J</Title>
              <Text size="sm" c="white" style={{ lineHeight: 1.6, opacity: 0.9 }}>
                Tu crées ton dossier, ta matière, tes chapitres et la date d'examen pour générer tes J. Si tu décales le J0, cela entraîne un décalage global de tout le planning. En revanche, tous les autres J se déplacent de façon indépendante en cas d'imprévu.
              </Text>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card withBorder p="xl" radius="md" style={{ height: '100%', backgroundColor: '#1b1c20', borderColor: '#2f3136' }}>
              <ThemeIcon size={50} radius="md" color="orange" mb="md">
                <RefreshCw size={26} />
              </ThemeIcon>
              <Title order={3} size="h4" mb="sm" c="white">3. Réintégration Intelligente</Title>
              <Text size="sm" c="white" style={{ lineHeight: 1.6, opacity: 0.9 }}>
                Une note passe sous ton seuil ? Le chapitre bascule dans ton Dashboard. Un clic sur <b>"Réintégrer"</b> recase automatiquement la session de rattrapage en respectant strictement le seuil de cours maximum autorisé pour éviter toute surcharge.
              </Text>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card withBorder p="xl" radius="md" style={{ height: '100%', backgroundColor: '#1b1c20', borderColor: '#2f3136' }}>
              <ThemeIcon size={50} radius="md" color="teal" mb="md">
                <BarChart3 size={26} />
              </ThemeIcon>
              <Title order={3} size="h4" mb="sm" c="white">4. Graphiques & Suivi de Niveau</Title>
              <Text size="sm" c="white" style={{ lineHeight: 1.6, opacity: 0.9 }}>
                Visualise tes résultats sur de vrais graphiques clairs et précis. Suis l'évolution de la moyenne des J par matière et par chapitre, analyse tes tendances et garde un œil infaillible sur ton niveau réel.
              </Text>
            </Card>
          </Grid.Col>
        </Grid>

        {/* SECTION PAUSE ESTIVALE */}
        <Card withBorder mt={40} p="xl" radius="md" style={{ backgroundColor: '#1b1c20', borderColor: '#2f3136' }}>
          <Group align="flex-start" gap="md">
            <ThemeIcon size={50} radius="md" color="orange" mb="md">
              <Calendar size={26} />
            </ThemeIcon>
            <Stack gap={5} style={{ flex: 1 }}>
              <Title order={3} size="h4" c="white">☀️ Pause estivale : Soufflez sans stress en été</Title>
              <Text size="sm" c="white" style={{ opacity: 0.9, lineHeight: 1.6 }}>
                Pas question de payer pour rien pendant les grandes vacances ! Le bouton dédié, déjà présent dans votre menu latéral, sera actif du <b>25 juin au 31 août</b>. En un clic, vous suspendez votre abonnement : aucun prélèvement n'est effectué en juillet et en août, vous conservez l'accès à l'application durant toute cette période, les prélèvements reprendront leurs cycles à partir du <b>3 septembre</b>.
              </Text>
            </Stack>
          </Group>
        </Card>

        {/* SECTION PARRAINAGE */}
        <Card withBorder mt={50} p="xl" radius="md" style={{ backgroundColor: '#1b1c20', borderColor: '#2f3136' }}>
          <Group align="flex-start" gap="md">
            <ThemeIcon size={50} radius="md" color="pink" mb="md">
              <Gift size={26} />
            </ThemeIcon>
            <Stack gap={5} style={{ flex: 1 }}>
              <Title order={3} size="h4" c="white">Programme Parrainage : Gagne des commissions récurrentes</Title>
              <Text size="sm" c="white" style={{ opacity: 0.9, lineHeight: 1.6 }}>
                Chaque utilisateur actif disposant d'un abonnement reçoit <b>automatiquement par e-mail un lien de parrainage personnel</b> dès la validation de son premier paiement. Partage-le autour de toi : dès qu'une personne s'inscrit et s'abonne via ton lien, tu touches <b>15 % de commission</b> sur la valeur de son abonnement <b>chaque mois</b>, et ce, à chaque renouvellement, tant que son abonnement reste actif.
              </Text>
            </Stack>
          </Group>
        </Card>

        {/* SECTION VALEUR AJOUTÉE */}
        <Card withBorder mt={30} p="xl" radius="md" bg="white" style={{ borderColor: '#e2e8f0' }}>
          <Group justify="space-between" align="center">
            <Stack gap={5} maw={650}>
              <Title order={3} size="h4" c="#141517">L'outil indispensable pour réussir tes examens</Title>
              <Text size="sm" c="gray.8">
                Ne va plus aux examens en te disant "je crois que je sais". Les graphiques ne mentent pas, les courbes d'évolution t'offrent la certitude d'être prêt le jour J, tout en protégeant ton équilibre grâce au quota de cours max pour la réintégration.
              </Text>
            </Stack>
            {!isSignedIn && (
              <SignUpButton mode="modal">
                <Button size="md" color="indigo">Démarrer l'essai</Button>
              </SignUpButton>
            )}
          </Group>
        </Card>
      </Container>
    </main>
  );
}