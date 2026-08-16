#!/usr/bin/env python3
"""
====================================================================
Extractor de Datos de Momios y Probabilidades Implícitas (Liga MX)
Fuentes: sports.caliente.mx & oddschecker.com/es/futbol/mexico
Tecnología: Playwright (Chromium Headless) + Algoritmo de Normalización
====================================================================
"""

import sys
import json
import re
from datetime import datetime
from pathlib import Path
from playwright.sync_api import sync_playwright

def parse_american_or_decimal_odd(text_val):
    """
    Convierte momio americano (ej. +150, -190) o decimal (ej. 2.50) a cuota decimal estándar (> 1.0)
    """
    if not text_val:
        return None
    try:
        clean = text_val.strip().replace(' ', '')
        val = float(clean)
        if val >= 100: # Momio americano positivo +150 -> 2.50
            return round((val / 100.0) + 1.0, 4)
        elif val <= -100: # Momio americano negativo -190 -> 1.526
            return round((100.0 / abs(val)) + 1.0, 4)
        elif val > 1.0 and val < 50.0: # Cuota decimal directa 2.25
            return round(val, 4)
    except Exception:
        pass
    return None

def calculate_implied_probabilities(odd_l, odd_e, odd_v):
    """
    Calcula el porcentaje de favoritismo real eliminando el Overround (Margen de la Casa)
    Formula: P_i = (1 / O_i) / sum(1 / O_k) * 100
    """
    if not odd_l or not odd_e or not odd_v or odd_l <= 1.0 or odd_e <= 1.0 or odd_v <= 1.0:
        return {'prob_l': 48.0, 'prob_e': 28.0, 'prob_v': 24.0, 'raw_margin_percent': 0.0}
    
    raw_l = 1.0 / odd_l
    raw_e = 1.0 / odd_e
    raw_v = 1.0 / odd_v
    
    total_overround = raw_l + raw_e + raw_v
    
    prob_l = round((raw_l / total_overround) * 100, 2)
    prob_e = round((raw_e / total_overround) * 100, 2)
    prob_v = round((raw_v / total_overround) * 100, 2)
    
    # Ajuste de redondeo a 100% exacto
    sum_probs = prob_l + prob_e + prob_v
    if sum_probs != 100.0:
        diff = round(100.0 - sum_probs, 2)
        prob_l = round(prob_l + diff, 2)

    return {
        'raw_margin_percent': round((total_overround - 1.0) * 100, 2),
        'prob_l': prob_l,
        'prob_e': prob_e,
        'prob_v': prob_v
    }

def scrape_caliente_liga_mx(page):
    url = "https://sports.caliente.mx/futbol/mexico/liga-mx"
    print(f"\n[+] Extrayendo partidos y momios desde Caliente.mx: {url}")
    
    extracted_matches = []
    
    try:
        page.goto(url, wait_until='domcontentloaded', timeout=30000)
        page.wait_for_timeout(4000)
        
        # Evaluar script en cliente para extraer filas de partidos
        items = page.evaluate('''() => {
            const results = [];
            const rows = Array.from(document.querySelectorAll('tr, .coupon-row, .event-card, [data-event-id]'));
            rows.forEach(r => {
                const text = r.innerText || '';
                const parts = text.split('\\n').map(p => p.trim()).filter(Boolean);
                if (parts.length >= 5) {
                    results.push(parts);
                }
            });
            return results;
        }''')
        
        for parts in items:
            # Buscar patrones con 2 nombres de equipo y 3 momios
            for idx in range(len(parts) - 4):
                p1 = parts[idx]
                p2 = parts[idx+1]
                # Si encontramos dos líneas de texto que podrían ser equipos
                if len(p1) > 2 and len(p2) > 2 and not p1.startswith('+') and not p2.startswith('+'):
                    # Intentar buscar los momios siguientes (+150, -120, etc.)
                    candidates = parts[idx+2:idx+8]
                    odds_found = []
                    for cand in candidates:
                        num = parse_american_or_decimal_odd(cand)
                        if num:
                            odds_found.append((cand, num))
                    
                    if len(odds_found) >= 3:
                        odd_l = odds_found[0][1]
                        odd_e = odds_found[1][1]
                        odd_v = odds_found[2][1]
                        
                        probs = calculate_implied_probabilities(odd_l, odd_e, odd_v)
                        
                        match_info = {
                            'source': 'Caliente.mx',
                            'home_team': p1,
                            'away_team': p2,
                            'odds_raw': [odds_found[0][0], odds_found[1][0], odds_found[2][0]],
                            'odds_decimal': {'L': odd_l, 'E': odd_e, 'V': odd_v},
                            'probabilities': probs
                        }
                        
                        # Evitar duplicados
                        if not any(m['home_team'] == p1 and m['away_team'] == p2 for m in extracted_matches):
                            extracted_matches.append(match_info)
                            print(f"  ✓ {p1} vs {p2} | Momios: [{odds_found[0][0]}, {odds_found[1][0]}, {odds_found[2][0]}] -> Favoritismo: L:{probs['prob_l']}% E:{probs['prob_e']}% V:{probs['prob_v']}%")
                            
    except Exception as e:
        print(f"[-] Error al procesar Caliente.mx: {e}")
        
    return extracted_matches

def scrape_oddschecker_liga_mx(page):
    url = "https://www.oddschecker.com/es/futbol/mexico"
    print(f"\n[+] Extrayendo partidos y momios desde Oddschecker: {url}")
    
    extracted_matches = []
    
    try:
        page.goto(url, wait_until='domcontentloaded', timeout=30000)
        page.wait_for_timeout(4000)
        
        body_text = page.inner_text('body')
        lines = [l.strip() for l in body_text.split('\n') if l.strip()]
        
        i = 0
        while i < len(lines):
            if re.match(r'^(\d{1,2}:\d{2}\s*(AM|PM)|EN VIVO)$', lines[i], re.IGNORECASE):
                try:
                    time_str = lines[i]
                    home_team = lines[i+1]
                    away_team = lines[i+2]
                    
                    odd_l_raw = lines[i+3]
                    odd_e_raw = lines[i+4]
                    odd_v_raw = lines[i+5]
                    
                    odd_l = parse_american_or_decimal_odd(odd_l_raw)
                    odd_e = parse_american_or_decimal_odd(odd_e_raw)
                    odd_v = parse_american_or_decimal_odd(odd_v_raw)
                    
                    if home_team and away_team and odd_l and odd_e and odd_v:
                        probs = calculate_implied_probabilities(odd_l, odd_e, odd_v)
                        
                        match_info = {
                            'source': 'Oddschecker',
                            'time': time_str,
                            'home_team': home_team,
                            'away_team': away_team,
                            'odds_raw': [odd_l_raw, odd_e_raw, odd_v_raw],
                            'odds_decimal': {'L': odd_l, 'E': odd_e, 'V': odd_v},
                            'probabilities': probs
                        }
                        extracted_matches.append(match_info)
                        print(f"  ✓ {home_team} vs {away_team} | Momios: [{odd_l_raw}, {odd_e_raw}, {odd_v_raw}] -> Favoritismo: L:{probs['prob_l']}% E:{probs['prob_e']}% V:{probs['prob_v']}%")
                        i += 6
                        continue
                except Exception:
                    pass
            i += 1
    except Exception as e:
        print(f"[-] Error al procesar Oddschecker: {e}")
        
    return extracted_matches

def main():
    print("====================================================================")
    print("   EXTRACTOR DE MOMIOS Y FAVORITISMO REAL - LIGA MX")
    print("====================================================================")
    
    all_matches = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=['--disable-blink-features=AutomationControlled', '--no-sandbox']
        )
        context = browser.new_context(
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            locale='es-MX'
        )
        page = context.new_page()
        page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        
        # Intentar con Oddschecker
        matches_oc = scrape_oddschecker_liga_mx(page)
        all_matches.extend(matches_oc)
        
        # Intentar con Caliente.mx si se requieren más partidos
        if len(all_matches) == 0:
            matches_cal = scrape_caliente_liga_mx(page)
            all_matches.extend(matches_cal)
            
        browser.close()
        
    # Exportar resultados a public/odds_liga_mx.json
    output_path = Path(__file__).parent.parent / "public" / "odds_liga_mx.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    result_data = {
        "status": "success",
        "updated_at": datetime.now().isoformat(),
        "total_matches": len(all_matches),
        "matches": all_matches
    }
    
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result_data, f, ensure_ascii=False, indent=2)
        
    print("====================================================================")
    print(f"[+] Proceso completado. {len(all_matches)} partidos exportados a:")
    print(f"    -> {output_path}")
    print("====================================================================")

if __name__ == "__main__":
    main()
