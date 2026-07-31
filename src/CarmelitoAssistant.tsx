import React, { useState, useEffect, useRef, memo } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export interface CarmelitoAssistantProps {
  onAutoFillAnalytical?: () => void;
}

interface StepInfo {
  title: string;
  targetId: string;
  description: string;
}

const STEPS: StepInfo[] = [
  {
    title: 'Pronósticos Principales (P1 a P10)',
    targetId: 'zone-p1-p10',
    description: 'Elige tus 10 pronósticos principales seleccionando Local (L), Empate (E) o Visita (V).'
  },
  {
    title: 'Partido Suplente (P11)',
    targetId: 'zone-p11',
    description: '¡Importante! Marca el Partido Suplente (P11) por si se llega a suspender algún juego principal.'
  },
  {
    title: 'Añadir al Carrito (mín. 2 quinielas)',
    targetId: 'btn-add-quiniela',
    description: 'Guarda tu combinación en el carrito. El mínimo para participar es 2 quinielas por boleto. ¡Puedes agregar todas las que quieras!'
  },
  {
    title: '🏷️ Cupones de Promoción',
    targetId: 'zone-promo',
    description: '¿Tienes un código de descuento? Ingrésalo en el carrito antes de pagar. Esta semana los cupones están disponibles únicamente los lunes y martes.'
  },
  {
    title: 'Enviar Comprobante de Pago',
    targetId: 'zone-upload-receipt',
    description: 'Valida tus quinielas subiendo tu comprobante de pago bancario o transferencia para que el administrador confirme tu registro.'
  }
];


// Demo classes para simular selección L → E → V
const LEV_DEMO_CLASSES = ['demo-selected-l', 'demo-selected-e', 'demo-selected-v'] as const;
const LEV_TYPES = ['L', 'E', 'V'] as const;

/**
 * Aplica la clase demo SOLO al primer match-card de la zona.
 * Devuelve el DOMRect del botón activo (para posicionar el cursor flotante).
 */
function applyLevDemoToFirstMatch(zoneId: string, demoClass: string | null): DOMRect | null {
  const zone = document.getElementById(zoneId);
  if (!zone) return null;

  // Limpiar todas las clases demo en la zona entera
  zone.querySelectorAll('.lev-btn').forEach(btn => {
    LEV_DEMO_CLASSES.forEach(cls => btn.classList.remove(cls));
  });

  if (!demoClass) return null;

  // Solo el PRIMER match-card
  const firstCard = zone.querySelector<HTMLElement>('.match-card');
  if (!firstCard) return null;

  const targetText = demoClass === 'demo-selected-l' ? 'L'
    : demoClass === 'demo-selected-e' ? 'E' : 'V';

  let activeRect: DOMRect | null = null;

  firstCard.querySelectorAll<HTMLButtonElement>('.lev-btn').forEach(btn => {
    if (btn.textContent?.trim() === targetText) {
      btn.classList.add(demoClass);
      activeRect = btn.getBoundingClientRect();
    }
  });

  return activeRect;
}

const CarmelitoAssistant: React.FC<CarmelitoAssistantProps> = ({ onAutoFillAnalytical: _onAutoFillAnalytical }) => {
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [levDemoIndex, setLevDemoIndex] = useState(0);
  // Posición del cursor flotante (null = oculto)
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  // Texto tipado en el demo de código promo (Paso 4)
  const [promoTypedText, setPromoTypedText] = useState('');

  // Referencias a intervalos
  const levDemoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const levDemoIndexRef = useRef(0);
  const promoTypingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Spotlight ring + scroll ───────────────────────────────────────────────
  useEffect(() => {
    STEPS.forEach(s => {
      const el = document.getElementById(s.targetId);
      if (el) el.classList.remove('spotlight-active-ring');
    });

    if (isTutorialOpen) {
      const step = STEPS[currentStep];
      if (step) {
        const el = document.getElementById(step.targetId);
        if (el) {
          el.classList.add('spotlight-active-ring');
          // Paso 0: ya se hizo scroll to top en startTutorial, no mover
          if (currentStep !== 0) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }
    }

    return () => {
      STEPS.forEach(s => {
        const el = document.getElementById(s.targetId);
        if (el) el.classList.remove('spotlight-active-ring');
      });
    };
  }, [isTutorialOpen, currentStep]);

  // ─── Animación demo L→E→V en el Paso 1 ────────────────────────────────────
  useEffect(() => {
    // Limpiar intervalo anterior
    if (levDemoIntervalRef.current) {
      clearInterval(levDemoIntervalRef.current);
      levDemoIntervalRef.current = null;
    }
    // Limpiar clases demo y cursor
    applyLevDemoToFirstMatch('zone-p1-p10', null);
    setCursorPos(null);

    if (!isTutorialOpen || currentStep !== 0) return;

    levDemoIndexRef.current = 0;

    const runCycle = () => {
      const idx = levDemoIndexRef.current % LEV_DEMO_CLASSES.length;
      const rect = applyLevDemoToFirstMatch('zone-p1-p10', LEV_DEMO_CLASSES[idx]);
      levDemoIndexRef.current++;

      // Actualizar posición del cursor flotante
      if (rect) {
        setCursorPos({
          x: rect.left + rect.width / 2 + window.scrollX,
          y: rect.top - 28 + window.scrollY,
        });
      }
    };

    // Primera ejecución inmediata
    runCycle();

    levDemoIntervalRef.current = setInterval(() => {
      runCycle();
      setLevDemoIndex(prev => prev + 1);
    }, 900);

    return () => {
      if (levDemoIntervalRef.current) {
        clearInterval(levDemoIntervalRef.current);
        levDemoIntervalRef.current = null;
      }
      applyLevDemoToFirstMatch('zone-p1-p10', null);
      setCursorPos(null);
    };
  }, [isTutorialOpen, currentStep]);

  // ─── Animación tipeo código promo - Paso 4 ─────────────────────────────────
  useEffect(() => {
    if (promoTypingRef.current) clearTimeout(promoTypingRef.current);
    setPromoTypedText('');

    if (!isTutorialOpen || currentStep !== 3) return;

    const DEMO_CODE = 'PROMO2026';
    const PAUSE_FULL = 1800;   // ms visible completo
    const PAUSE_EMPTY = 600;   // ms antes de retipear
    const TYPE_SPEED = 120;    // ms por letra

    let cancelled = false;

    const typeSequence = async () => {
      while (!cancelled) {
        // Tipear letra a letra
        for (let i = 1; i <= DEMO_CODE.length; i++) {
          if (cancelled) return;
          await new Promise<void>(res => { promoTypingRef.current = setTimeout(res, TYPE_SPEED); });
          setPromoTypedText(DEMO_CODE.slice(0, i));
        }
        // Pausa con texto completo
        await new Promise<void>(res => { promoTypingRef.current = setTimeout(res, PAUSE_FULL); });
        if (cancelled) return;
        // Borrar de golpe
        setPromoTypedText('');
        // Pausa antes de reiniciar
        await new Promise<void>(res => { promoTypingRef.current = setTimeout(res, PAUSE_EMPTY); });
      }
    };

    typeSequence();

    return () => {
      cancelled = true;
      if (promoTypingRef.current) clearTimeout(promoTypingRef.current);
      setPromoTypedText('');
    };
  }, [isTutorialOpen, currentStep]);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleClose = () => {
    setIsTutorialOpen(false);
    setCurrentStep(0);
    setCursorPos(null);
    STEPS.forEach(s => {
      const el = document.getElementById(s.targetId);
      if (el) el.classList.remove('spotlight-active-ring');
    });
    applyLevDemoToFirstMatch('zone-p1-p10', null);
  };

  const startTutorial = () => {
    // Siempre regresar al top antes de abrir el tutorial
    // para que el cursor quede alineado con los botones visibles
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Esperar a que el scroll termine antes de montar el tutorial
    setTimeout(() => {
      setCurrentStep(0);
      setIsTutorialOpen(true);
    }, 380);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  // Necesitamos la posición en viewport (no en document) para usar position:fixed
  // getBoundingClientRect ya da coordenadas de viewport, no necesitamos scrollX/Y
  const [cursorViewport, setCursorViewport] = React.useState<{ x: number; y: number } | null>(null);

  // Sincroniza la posición viewport del cursor cuando cambia levDemoIndex O el usuario scrollea
  const recalcCursor = React.useCallback(() => {
    if (!isTutorialOpen || currentStep !== 0) { setCursorViewport(null); return; }
    const zone = document.getElementById('zone-p1-p10');
    if (!zone) return;
    const firstCard = zone.querySelector<HTMLElement>('.match-card');
    if (!firstCard) return;
    const levText = LEV_TYPES[levDemoIndex % 3];
    let found: HTMLButtonElement | null = null;
    firstCard.querySelectorAll<HTMLButtonElement>('.lev-btn').forEach(btn => {
      if (btn.textContent?.trim() === levText) found = btn;
    });
    if (found) {
      const r = (found as HTMLButtonElement).getBoundingClientRect();
      setCursorViewport({ x: r.left + r.width / 2, y: r.top + r.height * 0.15 });
    }
  }, [isTutorialOpen, currentStep, levDemoIndex]);

  React.useEffect(() => {
    recalcCursor();
    // Recalcular si el usuario scrollea o redimensiona mientras el tutorial está abierto
    window.addEventListener('scroll', recalcCursor, { passive: true });
    window.addEventListener('resize', recalcCursor, { passive: true });
    return () => {
      window.removeEventListener('scroll', recalcCursor);
      window.removeEventListener('resize', recalcCursor);
    };
  }, [recalcCursor]);

  return (
    <>
      {/* Cursor/Hand pointer flotante - Paso 1 del tutorial */}
      {isTutorialOpen && currentStep === 0 && cursorViewport && (
        <div
          style={{
            position: 'fixed',
            left: cursorViewport.x - 14,
            top: cursorViewport.y,
            zIndex: 9999,
            pointerEvents: 'none',
            fontSize: '1.6rem',
            lineHeight: 1,
            filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))',
            transition: 'left 0.35s cubic-bezier(0.34,1.56,0.64,1), top 0.35s cubic-bezier(0.34,1.56,0.64,1)',
            animation: 'cursorBounce 0.9s ease-in-out infinite',
            transformOrigin: 'bottom center'
          }}
        >
          👆
        </div>
      )}

      {/* Botón flotante pasivo (⚽) + Label Tutorial */}

      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '16px',
          zIndex: 45,
          display: 'flex',
          gap: '8px',
          alignItems: 'center'
        }}
      >
        {/* Label "Tutorial" — aparece/desaparece cuando el tutorial está cerrado */}
        {!isTutorialOpen && (
          <span
            style={{
              background: '#1E5E3A',
              color: '#E0B828',
              border: '1px solid #E0B828',
              borderRadius: '20px',
              padding: '4px 10px',
              fontSize: '0.72rem',
              fontWeight: 'bold',
              letterSpacing: '0.5px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
              animation: 'tutorialLabelPulse 2.4s ease-in-out infinite',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              userSelect: 'none'
            }}
          >
            Tutorial
          </span>
        )}

        <button
          type="button"
          onClick={startTutorial}
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #E0B828 0%, #C29F20 100%)',
            border: '2px solid #FFFFFF',
            color: '#11291F',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.3)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}
          title="Tutorial Interactivo: ¿Cómo jugar?"
        >
          <span style={{ fontSize: '1.3rem' }}>⚽</span>
        </button>
      </div>


      {/* Barra Guía Flotante Inferior (no invasiva) */}
      {isTutorialOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 50,
            width: 'calc(100% - 32px)',
            maxWidth: '460px',
            background: '#1E5E3A',
            border: '2px solid #E0B828',
            borderRadius: '16px',
            padding: '16px',
            color: '#FFFFFF',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(224, 184, 40, 0.35)',
            animation: 'modalFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Botón de Cierre */}
          <button
            type="button"
            onClick={handleClose}
            style={{
              position: 'absolute',
              top: '10px',
              right: '12px',
              background: 'none',
              border: 'none',
              color: '#9E9E9E',
              cursor: 'pointer',
              padding: '4px'
            }}
            title="Cerrar Guía"
          >
            <X size={18} />
          </button>

          {/* Cabecera */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>⚽</span>
            <div>
              <h4 style={{ margin: 0, color: '#E0B828', fontSize: '0.95rem', fontWeight: 'bold' }}>
                Guía Carmelita
              </h4>
              <span style={{ fontSize: '0.7rem', color: '#9E9E9E' }}>
                Paso {currentStep + 1} de {STEPS.length}
              </span>
            </div>
          </div>

          {/* Contenido del paso */}
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 12px', borderRadius: '8px', marginBottom: currentStep === 0 ? '10px' : '12px', borderLeft: '3px solid #E0B828' }}>
            <h5 style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: '#FFFFFF' }}>
              {STEPS[currentStep].title}
            </h5>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#EEEEEE', lineHeight: '1.35' }}>
              {STEPS[currentStep].description}
            </p>
          </div>

          {/* Preview mini de L/E/V solo en el Paso 1 */}
          {currentStep === 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              marginBottom: '12px',
              background: 'rgba(0,0,0,0.15)',
              borderRadius: '8px',
              padding: '8px 12px'
            }}>
              <span style={{ fontSize: '0.7rem', color: '#9E9E9E', marginRight: '2px' }}>Ejemplo:</span>
              {LEV_TYPES.map((lev, i) => {
                const colorMap: Record<string, { bg: string; shadow: string }> = {
                  L: { bg: '#1e7e34', shadow: 'rgba(40,167,69,0.7)' },
                  E: { bg: '#856404', shadow: 'rgba(255,193,7,0.7)' },
                  V: { bg: '#0062cc', shadow: 'rgba(0,123,255,0.7)' }
                };
                const isActive = (levDemoIndex % 3) === i;
                return (
                  <span
                    key={lev}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '34px',
                      height: '34px',
                      borderRadius: '6px',
                      background: colorMap[lev].bg,
                      color: '#fff',
                      fontWeight: 'bold',
                      fontSize: '0.95rem',
                      boxShadow: isActive ? `0 0 14px ${colorMap[lev].shadow}` : 'none',
                      opacity: isActive ? 1 : 0.28,
                      transform: isActive ? 'scale(1.15)' : 'scale(1)',
                      transition: 'opacity 0.35s ease, transform 0.35s ease, box-shadow 0.35s ease'
                    }}
                  >
                    {lev}
                  </span>
                );
              })}
            </div>
          )}

          {/* Demo tipeo de código promo - Paso 4 */}
          {currentStep === 3 && (
            <div style={{
              marginBottom: '12px',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '8px',
              padding: '10px 12px',
            }}>
              <span style={{ fontSize: '0.7rem', color: '#9E9E9E', display: 'block', marginBottom: '6px' }}>
                Ejemplo:
              </span>
              {/* Fake input con tipeo animado */}
              <div style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center'
              }}>
                <div style={{
                  flex: 1,
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid rgba(224,184,40,0.5)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  letterSpacing: '2px',
                  color: promoTypedText ? '#E0B828' : '#555',
                  minHeight: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  fontFamily: 'monospace'
                }}>
                  {promoTypedText || <span style={{ color: '#444', fontWeight: 'normal', letterSpacing: '0', fontSize: '0.78rem' }}>EJ. PROMO2026</span>}
                  {/* Cursor parpadeante */}
                  <span style={{
                    display: 'inline-block',
                    width: '2px',
                    height: '16px',
                    background: '#E0B828',
                    marginLeft: '2px',
                    animation: 'caretBlink 0.8s step-end infinite',
                    flexShrink: 0
                  }} />
                </div>
                {/* Botón "Aplicar" dummy */}
                <div style={{
                  background: promoTypedText.length === 9 ? '#E0B828' : 'rgba(224,184,40,0.2)',
                  color: promoTypedText.length === 9 ? '#11291F' : '#E0B828',
                  border: '1px solid #E0B828',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap',
                  transition: 'background 0.3s ease, color 0.3s ease',
                  userSelect: 'none'
                }}>
                  🏷️ Aplicar
                </div>
              </div>
              {/* Mensaje de éxito al completar */}
              {promoTypedText.length === 9 && (
                <div style={{
                  marginTop: '6px',
                  fontSize: '0.72rem',
                  color: '#4ade80',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  animation: 'modalFadeIn 0.3s ease'
                }}>
                  ✅ ¡Código válido! Descuento aplicado automáticamente.
                </div>
              )}
            </div>
          )}

          {/* Navegación */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentStep === 0}
              style={{
                background: 'none',
                border: '1px solid rgba(255,255,255,0.2)',
                color: currentStep === 0 ? '#666666' : '#FFFFFF',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <ChevronLeft size={14} /> Anterior
            </button>

            <button
              type="button"
              onClick={handleNext}
              style={{
                background: '#E0B828',
                border: 'none',
                color: '#11291F',
                fontWeight: 'bold',
                padding: '6px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
              }}
            >
              {currentStep === STEPS.length - 1 ? '¡Entendido!' : 'Siguiente'}
              {currentStep < STEPS.length - 1 && <ChevronRight size={14} />}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default memo(CarmelitoAssistant);
