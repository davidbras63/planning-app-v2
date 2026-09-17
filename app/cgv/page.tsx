import { Container, Title, Text, Stack } from '@mantine/core';

export default function CGVPage() {
  return (
    <Container size="md" py={60}>
      <Stack gap="lg" style={{ color: '#fff', lineHeight: 1.7 }}>
        <Title order={1} c="white" mb="sm">Conditions Générales de Vente (CGV)</Title>
        
        <Text size="sm" c="dimmed">
          Dernière mise à jour : Septembre 2026
        </Text>

        <Text>
          Les présentes Conditions Générales de Vente (CGV) régissent l'utilisation du service d'abonnement proposé par <b>Nesis</b>. Toute souscription à un abonnement implique l'acceptation sans réserve des présentes conditions.
        </Text>

        <Title order={2} size="h3" c="white" mt="md">1. Objet du service</Title>
        <Text>
          Nesis propose un accès sous forme d'abonnement à des outils et fonctionnalités de planification et de gestion. Les détails précis des services inclus sont décrits sur le site.
        </Text>

        <Title order={2} size="h3" c="white" mt="md">2. Tarifs et Paiement</Title>
        <Text>
          Les prix de nos abonnements sont indiqués en euros. Le paiement est exigible immédiatement à la souscription et est géré de manière sécurisée par notre prestataire de paiement partenaire (Lemon Squeezy). L'abonnement est renouvelé tacitement chaque mois, sauf résiliation de votre part avant la date d'échéance.
        </Text>

        <Title order={2} size="h3" c="white" mt="md">3. Droit de rétractation et Accès immédiat</Title>
        <Text>
          Conformément à la législation en vigueur, en souscrivant à un service numérique avec un accès immédiat, vous consentez expressément à l'exécution immédiate du contrat et renoncez à votre droit de rétractation dès lors que le service a débuté.
        </Text>

        <Title order={2} size="h3" c="white" mt="md">4. Résiliation</Title>
        <Text>
          Vous pouvez résilier votre abonnement à tout moment directement depuis votre espace de gestion ou en effectuant la demande. La résiliation prendra effet à la fin de la période de facturation en cours. Aucun remboursement partiel ne sera effectué pour la période entamée.
        </Text>

        <Title order={2} size="h3" c="white" mt="md">5. Programme de Parrainage</Title>
        <Text>
          Les utilisateurs abonnés peuvent participer au programme de parrainage et percevoir des commissions selon les modalités en vigueur (seuil minimal de versement fixé à 9 €). Les commissions sont versées conformément aux conditions techniques et financières définies sur la plateforme.
        </Text>

        <Title order={2} size="h3" c="white" mt="md">6. Données personnelles</Title>
        <Text>
          Vos données personnelles sont traitées conformément aux règles de sécurité en vigueur. En cas de résiliation ou d'expiration de l'abonnement, vos données sont conservées pendant une durée de 30 jours avant purge définitive, sauf obligation légale contraignante.
        </Text>

        <Title order={2} size="h3" c="white" mt="md">7. Contact</Title>
        <Text>
          Pour toute question relative aux présentes CGV, vous pouvez nous contacter directement via les canaux de support de l'application.
        </Text>
      </Stack>
    </Container>
  );
}

