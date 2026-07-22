"use client";
import { useState, useRef } from "react";
import { saveNotesAction, getMoyenneAction } from "@/app/actions/gradeActions";

export function GradeInput({ echeances }: { echeances: any[] }) {
  const [averages, setAverages] = useState<Record<string, number>>({});
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Passe au champ suivant dans le DOM
      if (inputRefs.current[index + 1]) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleCalculateAll = async () => {
    const newAverages: Record<string, number> = {};
    for (const echeance of echeances) {
      const avg = await getMoyenneAction(echeance.chapitreId);
      newAverages[echeance.chapitreId] = avg;
    }
    setAverages(newAverages);
  };

  return (
    <div>
      {echeances.map((e, index) => (
        <div key={e.id} className="flex gap-4 p-2">
          <span>{e.chapitre.titre}</span>
          <input
            ref={(el) => (inputRefs.current[index] = el)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onBlur={(e) => saveNotesAction(e.chapitre.id, e.target.value)}
            className="border p-1"
            placeholder="Notes (ex: 12 14 15)"
          />
          {averages[e.chapitre.id] && <span>Moyenne: {averages[e.chapitre.id]}</span>}
        </div>
      ))}
      <button onClick={handleCalculateAll}>Calculer moyenne</button>
    </div>
  );
}
