"use client";

import React from 'react';
import { useRouter } from 'next/navigation';

export default function GradeInput({
  echeances = [],
  inputRefs,
  saveNotesAction,
  averages = {},
  handleCalculateAll,
  notesValues = {}
}) {
  const router = useRouter();
  const filteredEcheances = (echeances || []).filter(e => e && !e.isExamen);
  
  console.log("DEBUG -notesValues reçues :", notesValues);
  return (
	
    <div style={{ backgroundColor: '#ffffff', color: '#000000', padding: '20px', borderRadius: '8px', marginTop: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px', color: '#000000' }}>
        Tableau de saisie des notes
      </h3>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', backgroundColor: '#ffffff', color: '#000000' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
              <th style={{ padding: '12px', fontWeight: 'bold', color: '#000000' }}>Étape</th>
              <th style={{ padding: '12px', fontWeight: 'bold', color: '#000000' }}>Chapitre</th>
              <th style={{ padding: '12px', fontWeight: 'bold', color: '#000000' }}>Notes</th>
              <th style={{ padding: '12px', fontWeight: 'bold', color: '#000000' }}>Moyenne</th>
            </tr>
          </thead>
          <tbody>
            {filteredEcheances.length > 0 ? (
              filteredEcheances.map((e, index) => {
                const cleanEcheanceId = String(e.echeanceId || '').trim();
				const cleanChapitreId = String(e.chapitreId || '').trim(); 

				// On cherche la clé dans notesValues qui commence par notre ID d'échéance suivi d'un underscore
				const matchingKey = Object.keys(notesValues || {}).find(k => k === cleanEcheanceId || k.startsWith(cleanEcheanceId + '_'));

				const noteValue = matchingKey ? notesValues[matchingKey] : '';

				
				
                console.log("OBJET ECHEANCE BRUT :", e);

				console.log("LIGNE INDEX :", index, "-> matchingKey trouvé :", matchingKey, "-> Valeur :", noteValue);
				
                

                return (
                  <tr key={cleanEcheanceId} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px', color: '#000000', fontWeight: '600' }}>
                      <span style={{ padding: '4px 8px', backgroundColor: '#dbeafe', color: '#1e40af', borderRadius: '4px', fontSize: '12px' }}>
                        {e.stepName || e.step || "Étape"}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: '#000000', fontWeight: '500', fontSize: '14px' }}>
                      {e.titreChapitre || e.chapitre_titre || e.titre || "Chapitre sans nom"}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <input
                        ref={(el) => {
                          if (inputRefs && inputRefs.current) {
                            inputRefs.current[index] = el;
                          }
                        }}
                        defaultValue={noteValue ?? ''}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
                            const nextInput = inputs[index + 1] as HTMLInputElement;
                            if (nextInput) {
                              nextInput.focus();
                            }
                          }
                        }}
                        onBlur={async (event) => {
                          if (saveNotesAction && cleanEcheanceId && cleanChapitreId) {
                            let rawValue = event.target.value;

                            // 1. On découpe par rapport aux espaces pour gérer plusieurs notes
                            const parts = rawValue.trim().split(/\s+/);
                            const convertedParts = parts.map(part => {
                              // 2. Si la partie contient un slash (ex: 14/30)
                              if (part.includes('/')) {
                                const [num, den] = part.split('/').map(Number);
                                if (!isNaN(num) && !isNaN(den) && den !== 0) {
                                  // 3. Calcul de la conversion sur 20 et arrondi à 2 décimales
                                  const converted = (num / den) * 20;
                                  return Number(converted.toFixed(2));
                                }
                              }
                              // Sinon on laisse la note telle quelle (ex: 15 ou 12.5)
                              return part;
                            });

                            // 4. On reconstitue la chaîne propre avec les espaces
                            const finalValue = convertedParts.join(' ');
                            
                            // On met à jour visuellement l'input avec la valeur convertie
                            event.target.value = finalValue;

                            // On sauvegarde la valeur convertie
                            await saveNotesAction(cleanEcheanceId, cleanChapitreId, finalValue);
                            router.refresh();
                          }
                        }}
                        style={{ border: '1px solid #343365', padding: '2px', borderRadius: '4px', width: '200px', color: '#000000' }}
                        placeholder="Ex: 15 ou 14/30 18/20"
                      />


                    </td>
                    <td style={{ padding: '12px', color: '#15803d', fontWeight: 'bold' }}>
					  {matchingKey && averages && averages[matchingKey] !== undefined ? `Moyenne : ${averages[matchingKey]}` : '-'}
					</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4} style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>
                  Aucune révision prévue.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '15px' }}>
        <button
          onClick={handleCalculateAll}
          style={{ padding: '10px 16px', backgroundColor: '#2563eb', color: '#ffffff', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: '500', fontSize: '14px' }}
        >
          Calculer moyenne
        </button>
      </div>
    </div>
  );
}
