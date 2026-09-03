"use client";
import React, { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Paper, Group, Text, Button, ActionIcon, ScrollArea } from "@mantine/core";
import { Sparkles, ChevronDown, ChevronUp, ArrowRight, RefreshCcw, GripHorizontal, X } from "lucide-react";

export function OnboardingGuide() {
  const [currentStep, setCurrentStep] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const savedStep = localStorage.getItem("nesis_current_step");
      const parsed = savedStep ? parseInt(savedStep, 10) : 1;
      return isNaN(parsed) ? 1 : parsed;
    }
    return 1;
  });

  // On vérifie au démarrage si le guide a été explicitement fermé ou terminé
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const isFinished = localStorage.getItem("nesis_onboarding_completed");
      const isClosed = localStorage.getItem("nesis_guide_closed");
      if (isFinished === "true" || isClosed === "true") {
        return false;
      }
    }
    return true;
  });

  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const pathname = usePathname();

  const [position, setPosition] = useState({ x: window.innerWidth - 440, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0 });

  const handleStepChange = (step: number) => {
    setCurrentStep(step);
    if (typeof window !== "undefined") {
      localStorage.setItem("nesis_current_step", step.toString());
    }
  };

  useEffect(() => {
    const currentPath = pathname || "";
    if (currentPath.includes("/planning")) {
      const saved = localStorage.getItem("nesis_current_step");
      const current = saved ? parseInt(saved, 10) : 1;
      if (current < 4) {
        handleStepChange(4);
      }
    }
  }, [pathname]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPosition({
        x: dragRef.current.initialX + dx,
        y: dragRef.current.initialY + dy,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const handleCompletePlanning = () => {
    localStorage.setItem("nesis_planning_tested", "true");
    handleStepChange(6);
  };

  const handleFinishStep6 = () => {
    localStorage.setItem("nesis_onboarding_completed", "true");
    setIsOpen(false);
  };

  // Ferme le guide et mémorise le choix pour qu'il ne s'ouvre plus tout seul
  const handleCloseGuide = () => {
    setIsOpen(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("nesis_guide_closed", "true");
    }
  };

  // Permet de le réouvrir manuellement via le bouton du bas
  const handleOpenGuide = () => {
    setIsOpen(true);
    if (typeof window !== "undefined") {
      localStorage.removeItem("nesis_guide_closed");
    }
  };

  const handleResetGuide = () => {
    localStorage.removeItem("nesis_onboarding_completed");
    localStorage.removeItem("nesis_planning_tested");
    localStorage.removeItem("nesis_current_step");
    localStorage.removeItem("nesis_guide_closed");
    setIsOpen(true);
    handleStepChange(1);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={handleOpenGuide}
        size="compact-xs"
        variant="filled"
        color="indigo"
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          zIndex: 99999,
        }}
        leftSection={<RefreshCcw size={12} />}
      >
        Afficher le guide
      </Button>
    );
  }

  if (isMinimized) {
    return (
      <Paper
        shadow="xl"
        p="xs"
        radius="md"
        style={{
          position: "fixed",
          top: position.y,
          left: position.x,
          zIndex: 99999,
          cursor: "pointer",
          backgroundColor: "#4f46e5",
          color: "white",
        }}
        onClick={() => setIsMinimized(false)}
      >
        <Group gap="xs">
          <Sparkles size={16} />
          <Text size="xs" fw={700} tt="uppercase" c="white">
            Guide (Étape {currentStep}/6)
          </Text>
          <ActionIcon size="sm" variant="subtle" color="white">
            <ChevronDown size={14} />
          </ActionIcon>
        </Group>
      </Paper>
    );
  }

  return (
    <Paper
      shadow="xl"
      p="md"
      radius="lg"
      withBorder
      style={{
        position: "fixed",
        top: position.y,
        left: position.x,
        zIndex: 99999,
        width: "420px",
        maxHeight: "85vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "white",
      }}
    >
      <Group
        justify="space-between"
        mb="sm"
        pb="xs"
        onMouseDown={handleMouseDown}
        style={{ borderBottom: "1px solid #cbd5e1", flexShrink: 0, cursor: "grab", userSelect: "none" }}
      >
        <Group gap="xs">
          <div style={{ padding: 4, borderRadius: 6, backgroundColor: "#f1f5f9", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <GripHorizontal size={16} />
          </div>
          <div style={{ padding: 6, borderRadius: 6, backgroundColor: "#eef2ff", color: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sparkles size={16} />
          </div>
          <Text size="xs" fw={700} style={{ color: "#4f46e5" }} tt="uppercase">
            Étape {currentStep} sur 6
          </Text>
        </Group>
        
        <Group gap="xs">
          <Button
            size="compact-xs"
            variant="light"
            color="gray"
            rightSection={<ChevronUp size={14} />}
            onClick={() => setIsMinimized(true)}
          >
            Réduire
          </Button>
          <ActionIcon
            size="sm"
            variant="light"
            color="gray"
            onClick={handleCloseGuide}
            title="Fermer le guide"
          >
            <X size={14} />
          </ActionIcon>
        </Group>
      </Group>

      <ScrollArea style={{ flexGrow: 1 }} offsetScrollbars pr="xs">
        <div style={{ fontSize: "13px", lineHeight: 1.6, color: "#1e293b" }}>
          <Group mb="md" gap={4}>
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <Button
                key={s}
                size="compact-xs"
                variant={currentStep === s ? "filled" : "light"}
                color="indigo"
                onClick={() => handleStepChange(s)}
              >
                Étape {s}
              </Button>
            ))}
          </Group>

          {currentStep === 1 && (
            <div>
              <Text fw={700} style={{ color: "#0f172a" }} size="sm" mb={6}>🚀 Bienvenue sur Nesis !</Text>
              <Text size="xs" style={{ color: "#334155" }} mb="sm">
                Pour commencer, clique sur le bouton <strong>Créer dossier</strong> dans la sidebar. Donne un nom clair à ton dossier comme par exemple PASS S1, SIGMA CHIMIE ou INSA S2.
              </Text>
              <Paper p="sm" radius="md" withBorder style={{ backgroundColor: "#f8fafc" }}>
                <Text size="xs" style={{ color: "#334155" }}>
                  <strong>Conseil indispensable :</strong> si le contenu change entre les semestres (tronc commun au S1 et spécialités au S2), crée deux dossiers bien séparés : un premier dossier nommé <em>"Nom de votre formation - Semestre 1"</em> et un second nommé <em>"Nom de votre formation - Semestre 2"</em>. Ne mélangez pas tout. C'est le conteneur global qui va regrouper tes cours.
                </Text>
              </Paper>
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <Text fw={700} style={{ color: "#0f172a" }} size="sm" mb={6}>✨ Premier dossier en poche !</Text>
              <Text size="xs" style={{ color: "#334155" }}>
                Maintenant, clique sur l'onglet <strong>Créer matière</strong> dans la sidebar. C'est ici que tu ajoutes tes modules d'enseignement à l'intérieur de ce dossier (ex: <em>Chimie</em>, <em>Anatomie</em>).
              </Text>
            </div>
          )}

          {currentStep === 3 && (
            <div>
              <Text fw={700} style={{ color: "#0f172a" }} size="sm" mb={6}>⚙️ Réglage du cadencier</Text>
              <Text size="xs" style={{ color: "#334155" }}>
                Parfait ! Rends-toi maintenant dans l'onglet <strong>Paramètres</strong>. Affine le cadencier de base suivant tes propres exigences, règle tes seuils de note basse (car ce sont elles qui déclancheront les J de rattrapage), et définis ta <strong>limite de cours max par jour</strong> pour empêcher la réintégration automatique de saturer ton planning. Une fois tes réglages faits, rends-toi sur l'onglet <strong>Planning</strong> de ton dossier pour passer à la suite !
              </Text>
            </div>
          )}

          {currentStep === 4 && (
            <div>
              <Text fw={700} style={{ color: "#0f172a" }} size="sm" mb={6}>📅 Ton premier chapitre</Text>
              <Text size="xs" style={{ color: "#334155" }} mb="sm">
                Direction l'onglet <strong>Planning</strong> ! Choisis ta matière, nomme ton chapitre selon l'avancement réel du prof.
              </Text>
              <Paper p="sm" radius="md" withBorder style={{ backgroundColor: "#f8fafc" }}>
                <Text size="xs" style={{ color: "#334155" }}>
                  <em>Règle d'or : si un chapitre s'étale sur plusieurs cours, crée un bloc par séance (ex: Chapitre 1 - Partie 1, Chapitre 1 - Partie 2) pour que le calcul du J0 tombe juste.</em> Surtout, <strong>renseigne bien ta date d'examen</strong> (c'est la date butoir indispensable pour caler tous tes J). Puis clique sur <strong>Générer le planning</strong>.
                </Text>
              </Paper>
            </div>
          )}

          {currentStep === 5 && (
            <div>
              <Text fw={700} style={{ color: "#0f172a" }} size="sm" mb={6}>Magie du planning interactif !</Text>
              <Text size="xs" style={{ color: "#334155" }} mb="xs">
                Ton planning est affiché sous tes yeux ! Fais ces 3 petits tests pour comprendre la logique :
              </Text>
              <ol style={{ paddingLeft: "18px", margin: "0 0 16px 0", fontSize: "12px", color: "#334155" }}>
                <li>Prends un J0 avec la souris et décale-le (tout se décale en cascade). Remets-le à sa place.</li>
                <li>Déplace juste un J tout seul pour voir qu'il bouge indépendamment. Remets-le à sa place.</li>
                <li>Prends un J, glisse-le sur Semaine suivante pour changer de semaine, puis ramène-le à sa place.</li>
              </ol>
              
            </div>
          )}

          {currentStep === 6 && (
            <div>
              <Text fw={700} style={{ color: "#0f172a" }} size="sm" mb={6}>📊 C'est prêt, tu es autonome !</Text>
              <Text size="xs" style={{ color: "#334155" }} mb="sm">
                Le tutoriel est maintenant terminé. Tu peux aller rentrer tes notes dans le tableau de saisie.
              </Text>
              <div style={{ fontSize: "11px", color: "#334155", display: "flex", flexDirection: "column", gap: "8px" }} className="mb-4">
                <p>• <strong>Le tableau de rattrapage :</strong> Si tu saisis des notes inférieures aux seuils fixés dans les paramètres, tu les retrouveras dans le <strong>dashboard</strong> sous le tableau de rattrapage. Tu pourras alors choisir de <strong>les réintégrer</strong> ou de <strong>les ignorer</strong>.</p>
                <p>• <strong>En cas de blocage :</strong> Si la réintégration intelligente ne trouve pas de place (soit à cause de ta limite max de cours par jour, soit parce que le J de révision suivant tomberait trop près et n'aurait aucun intérêt pédagogique), tu pourras <strong>forcer manuellement la date</strong> si tu tiens absolument à le placer, ou tout simplement <strong>ignorer</strong> le cours.</p>
                <p>• <strong>Les liens rapides :</strong> Petit bonus, tu peux utiliser la fonctionnalité <strong>Créer un lien</strong> dans la sidebar pour ajouter tes accès rapides (portail de la fac, prépa, documents utiles) et les retrouver directement depuis l'application.</p>
                <p>• <strong>Pour la suite :</strong> Une fois tes notes rentrées, file voir l'onglet <strong>Graphisme</strong> pour suivre tes évolutions.</p>
              </div>
              <Button
                fullWidth
                size="xs"
                color="indigo"
                onClick={handleFinishStep6}
              >
                Fermer le guide
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </Paper>
  );
}






















