"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Title } from '@mantine/core';

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
    <div style={{ width: '100%', WebkitFontSmoothing: 'antialiased' }}>
      {/* Ligne de séparation */}
      <hr style={{ border: 'none', height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.15)', margin: '40px 0 20px 0' }} />

      {/* Le titre est DIRECTEMENT sur le fond de page, exactement comme "Planning de la semaine" */}
      <Title order={3} c="dimmed" style={{ margin: 0, marginBottom: '16px' }}>
                Tableau de saisie des notes
      </Title>

      {/* Le cadre stylisé s'applique UNIQUEMENT au tableau lui-même, pas au titre */}
      <div style={{ 
        backgroundColor: 'rgba(15, 23, 42, 0.4)', 
        color: '#ffffff', 
        borderRadius: '16px', 
        border: '1px solid rgba(56, 189, 248, 0.3)',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        padding: '24px'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', color: '#ffffff' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.15)' }}>
                <th style={{ padding: '16px 12px', fontWeight: 'bold', color: '#ffffff', fontSize: '14px' }}>Étape</th>
                <th style={{ padding: '16px 12px', fontWeight: 'bold', color: '#ffffff', fontSize: '14px' }}>Chapitre</th>
                <th style={{ padding: '16px 12px', fontWeight: 'bold', color: '#ffffff', fontSize: '14px' }}>Notes</th>
                <th style={{ padding: '16px 12px', fontWeight: 'bold', color: '#ffffff', fontSize: '14px' }}>Moyenne</th>
              </tr>
            </thead>
            <tbody>
              {filteredEcheances.length > 0 ? (
                filteredEcheances.map((e, index) => {
                  const cleanEcheanceId = String(e.echeanceId || '').trim();
                  const cleanChapitreId = String(e.chapitreId || '').trim();

                  const matchingKey = Object.keys(notesValues || {}).find(k => k === cleanEcheanceId || k.startsWith(cleanEcheanceId + '_'));
                  const noteValue = matchingKey ? notesValues[matchingKey] : '';

                  return (
                    <tr key={cleanEcheanceId} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <td style={{ padding: '16px 12px' }}>
                        <span style={{ 
                          padding: '4px 10px', 
                          backgroundColor: '#38bdf8', 
                          color: '#0f172a', 
                          borderRadius: '6px', 
                          fontSize: '11px',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          boxShadow: '0 0 8px rgba(56, 189, 248, 0.4)'
                        }}>
                          {e.stepName || e.step || "Étape"}
                        </span>
                      </td>
                      <td style={{ padding: '16px 12px', color: '#ffffff', fontWeight: '600', fontSize: '15px' }}>
                        {e.titreChapitre || e.chapitre_titre || e.titre || "Chapitre sans nom"}
                      </td>
                      <td style={{ padding: '16px 12px' }}>
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
                              // On utilise directement inputRefs pour sauter à la ligne suivante instantanément
                              const nextInput = inputRefs.current[index + 1];
                              if (nextInput) {
                                nextInput.focus();
                              }
                            }
                          }}
                          onBlur={async (event) => {
                            if (saveNotesAction && cleanEcheanceId && cleanChapitreId) {
                              let rawValue = event.target.value;

                              const parts = rawValue.trim().split(/\s+/);
                              const convertedParts = parts.map(part => {
                                if (part.includes('/')) {
                                  const [num, den] = part.split('/').map(Number);
                                  if (!isNaN(num) && !isNaN(den) && den !== 0) {
                                    const converted = (num / den) * 20;
                                    return Number(converted.toFixed(2));
                                  }
                                }
                                return part;
                              });

                              const finalValue = convertedParts.join(' ');
                              event.target.value = finalValue;

                              await saveNotesAction(cleanEcheanceId, cleanChapitreId, finalValue);
                              router.refresh();
                            }
                          }}
                          style={{
                            border: '1px solid rgba(255, 255, 255, 0.25)',
                            backgroundColor: 'rgba(30, 41, 59, 0.9)',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            width: '240px',
                            color: '#ffffff',
                            fontSize: '14px',
                            outline: 'none'
                          }}
                          placeholder="Ex: 15 ou 14/30 18/20"
                        />
                      </td>
                      <td style={{ padding: '16px 12px', color: '#34d399', fontWeight: 'bold', fontSize: '15px' }}>
                        {matchingKey && averages && averages[matchingKey] !== undefined ? `Moyenne : ${averages[matchingKey]}` : '-'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} style={{ padding: '24px 12px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)', fontStyle: 'italic', fontSize: '14px' }}>
                    Aucune révision prévue.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Bouton de calcul */}
        <div style={{ marginTop: '20px' }}>
          <button
            onClick={handleCalculateAll}
            style={{ 
              padding: '10px 18px', 
              backgroundColor: '#38bdf8', 
              color: '#0f172a', 
              borderRadius: '6px', 
              border: 'none', 
              cursor: 'pointer', 
              fontWeight: 800, 
              fontSize: '14px',
              boxShadow: '0 0 8px rgba(56, 189, 248, 0.4)'
            }}
          >
            Calculer moyenne
          </button>
        </div>
      </div>
    </div>
  );
}
