/**
 * Servicio de Consulta y Normalización de Momios
 * Proveedor: The Odds API (https://the-odds-api.com)
 */

export interface NormalizedMatchOdds {
  source: string;
  sport_key: string;
  commence_time?: string;
  home_team: string;
  away_team: string;
  odds_decimal: {
    L: number;
    E: number;
    V: number;
  };
  probabilities: {
    raw_margin_percent: number;
    prob_l: number;
    prob_e: number;
    prob_v: number;
  };
}

export interface OddsDataResult {
  status: 'success' | 'error';
  updated_at: string;
  total_matches: number;
  matches: NormalizedMatchOdds[];
  error?: string;
}

const DEFAULT_API_KEY = '1e4698e39cc00135825de71a907c69ed';

const SOCCER_SPORTS = [
  'soccer_mexico_ligamx',
  'soccer_spain_la_liga',
  'soccer_italy_serie_a',
  'soccer_epl',
  'soccer_uefa_champs_league'
];

/**
 * Calcula probabilidades implícitas normalizadas sin overround (margen de casa de apuestas)
 */
export function calculateImpliedProbabilities(oddL: number, oddE: number, oddV: number) {
  if (!oddL || !oddE || !oddV || oddL <= 1.0 || oddE <= 1.0 || oddV <= 1.0) {
    return { prob_l: 46, prob_e: 30, prob_v: 24, raw_margin_percent: 0 };
  }

  const rawL = 1.0 / oddL;
  const rawE = 1.0 / oddE;
  const rawV = 1.0 / oddV;

  const totalOverround = rawL + rawE + rawV;

  let probL = Math.round((rawL / totalOverround) * 100);
  let probE = Math.round((rawE / totalOverround) * 100);
  let probV = Math.max(0, 100 - probL - probE);

  return {
    raw_margin_percent: Math.round((totalOverround - 1.0) * 1000) / 10,
    prob_l: probL,
    prob_e: probE,
    prob_v: probV
  };
}

/**
 * Consulta momios en vivo desde The Odds API para todas las ligas configuradas
 */
export async function fetchLiveOddsFromApi(customApiKey?: string): Promise<OddsDataResult> {
  const apiKey = (customApiKey || (import.meta as any).env?.VITE_ODDS_API_KEY || DEFAULT_API_KEY).trim();

  if (!apiKey) {
    throw new Error('API Key de The Odds API no configurada.');
  }

  const allMatches: NormalizedMatchOdds[] = [];

  const promises = SOCCER_SPORTS.map(async (sportKey) => {
    try {
      const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/odds/?apiKey=${apiKey}&regions=us,eu&markets=h2h&oddsFormat=decimal`;
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`Error al consultar ${sportKey}: HTTP ${res.status}`);
        return [];
      }
      const events: any[] = await res.json();
      if (!Array.isArray(events)) return [];

      const sportMatches: NormalizedMatchOdds[] = [];

      for (const ev of events) {
        if (!ev.home_team || !ev.away_team || !Array.isArray(ev.bookmakers) || ev.bookmakers.length === 0) {
          continue;
        }

        // Promediar momios de todas las casas disponibles
        const lOdds: number[] = [];
        const eOdds: number[] = [];
        const vOdds: number[] = [];

        for (const bm of ev.bookmakers) {
          const h2hMarket = bm.markets?.find((m: any) => m.key === 'h2h');
          if (!h2hMarket || !Array.isArray(h2hMarket.outcomes)) continue;

          for (const outcome of h2hMarket.outcomes) {
            const price = Number(outcome.price);
            if (!price || isNaN(price) || price <= 1.0) continue;

            if (outcome.name === ev.home_team) {
              lOdds.push(price);
            } else if (outcome.name === ev.away_team) {
              vOdds.push(price);
            } else if (outcome.name?.toLowerCase().includes('draw') || outcome.name?.toLowerCase().includes('empate')) {
              eOdds.push(price);
            }
          }
        }

        if (lOdds.length > 0 && eOdds.length > 0 && vOdds.length > 0) {
          const avgL = lOdds.reduce((a, b) => a + b, 0) / lOdds.length;
          const avgE = eOdds.reduce((a, b) => a + b, 0) / eOdds.length;
          const avgV = vOdds.reduce((a, b) => a + b, 0) / vOdds.length;

          const probs = calculateImpliedProbabilities(avgL, avgE, avgV);

          sportMatches.push({
            source: 'The Odds API',
            sport_key: sportKey,
            commence_time: ev.commence_time,
            home_team: ev.home_team,
            away_team: ev.away_team,
            odds_decimal: {
              L: Math.round(avgL * 100) / 100,
              E: Math.round(avgE * 100) / 100,
              V: Math.round(avgV * 100) / 100
            },
            probabilities: probs
          });
        }
      }

      return sportMatches;
    } catch (err) {
      console.error(`Error al procesar deporte ${sportKey}:`, err);
      return [];
    }
  });

  const results = await Promise.allSettled(promises);
  for (const r of results) {
    if (r.status === 'fulfilled' && Array.isArray(r.value)) {
      allMatches.push(...r.value);
    }
  }

  const resultData: OddsDataResult = {
    status: 'success',
    updated_at: new Date().toISOString(),
    total_matches: allMatches.length,
    matches: allMatches
  };

  // Guardar en caché local
  try {
    localStorage.setItem('la_carmelita_odds_cache', JSON.stringify(resultData));
  } catch (e) {
    // Ignorar si falla localStorage
  }

  return resultData;
}
