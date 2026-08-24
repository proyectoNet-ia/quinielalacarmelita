/**
 * Módulo de Normalización de Nombres de Equipos de Fútbol
 * Mapea variaciones, alias y apodos hacia nombres estandarizados
 */

function stripAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const ALIAS_MAP: Record<string, string> = {
  // Liga MX
  'america': 'america',
  'club america': 'america',
  'aguilas': 'america',
  'chivas': 'guadalajara',
  'chivas guadalajara': 'guadalajara',
  'guadalajara': 'guadalajara',
  'cruz azul': 'cruz azul',
  'pumas': 'pumas',
  'pumas unam': 'pumas',
  'unam': 'pumas',
  'tigres': 'tigres',
  'tigres uanl': 'tigres',
  'monterrey': 'monterrey',
  'rayados': 'monterrey',
  'toluca': 'toluca',
  'diablos': 'toluca',
  'pachuca': 'pachuca',
  'tuzos': 'pachuca',
  'atlas': 'atlas',
  'santos': 'santos',
  'santos laguna': 'santos',
  'queretaro': 'queretaro',
  'gallos': 'queretaro',
  'puebla': 'puebla',
  'camoteros': 'puebla',
  'juarez': 'juarez',
  'juarez fc': 'juarez',
  'bravos': 'juarez',
  'san luis': 'san luis',
  'atletico san luis': 'san luis',
  'atletico de san luis': 'san luis',
  'necaxa': 'necaxa',
  'rayos': 'necaxa',
  'leon': 'leon',
  'fieras': 'leon',
  'mazatlan': 'mazatlan',
  'cañoneros': 'mazatlan',
  'tijuana': 'tijuana',
  'xolos': 'tijuana',

  // Ligas Internacionales
  'barcelona': 'barcelona',
  'fc barcelona': 'barcelona',
  'barca': 'barcelona',
  'real madrid': 'real madrid',
  'real madrid cf': 'real madrid',
  'atletico madrid': 'atletico madrid',
  'atletico de madrid': 'atletico madrid',
  'arsenal': 'arsenal',
  'aston villa': 'aston villa',
  'napoli': 'napoli',
  'como': 'como',
  'celta': 'celta',
  'celta de vigo': 'celta',
  'athletic': 'athletic',
  'athletic club': 'athletic',
  'athletic bilbao': 'athletic'
};

export function getCanonicalTeamKey(name: string): string {
  const clean = stripAccents(name);
  if (ALIAS_MAP[clean]) return ALIAS_MAP[clean];
  
  // Buscar si alguna palabra clave coincide
  for (const [alias, canonical] of Object.entries(ALIAS_MAP)) {
    if (clean.includes(alias) || alias.includes(clean)) {
      return canonical;
    }
  }
  return clean;
}

export function matchTeamNames(nameA: string, nameB: string): boolean {
  if (!nameA || !nameB) return false;
  const keyA = getCanonicalTeamKey(nameA);
  const keyB = getCanonicalTeamKey(nameB);
  return keyA === keyB || keyA.includes(keyB) || keyB.includes(keyA);
}
