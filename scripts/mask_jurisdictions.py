#!/usr/bin/env python3
"""One-off copy migration: mask EU/Singapore -> generic 'Privacy Jurisdiction' in
the site marketing locales (en/es/fr). Each replacement is asserted so a typo in
`old` fails loudly instead of silently doing nothing."""
import io, sys

BASE = "/app/frontend/src/locales"

EN = [
    ('Root access in the EU or Singapore', 'Root access in privacy-respecting jurisdictions'),
    ('"EU & Singapore regions"', '"Privacy jurisdictions"'),
    ('sub: "EU or Singapore today"', 'sub: "Privacy jurisdictions"'),
    ('region: "EU · Frankfurt"', 'region: "Privacy Jurisdiction A"'),
    ('region: "SG · Singapore"', 'region: "Privacy Jurisdiction B"'),
    ('sub: "EU & Singapore"', 'sub: "Privacy jurisdictions"'),
    ('Infrastructure in privacy-respecting jurisdictions — the EU and Singapore today. You choose where your data lives.',
     'Infrastructure in privacy-respecting jurisdictions. You choose where your data lives.'),
    ('Linux servers with full root access, deployed in the EU or Singapore in seconds.',
     'Linux servers with full root access, deployed in privacy-respecting jurisdictions in seconds.'),
    ('Search a domain, pick the EU or Singapore for your servers, and add WHOIS privacy — included.',
     'Search a domain, pick a privacy jurisdiction for your servers, and add WHOIS privacy — included.'),
    ('"Infrastructure in privacy-respecting jurisdictions — EU and Singapore"',
     '"Infrastructure in privacy-respecting jurisdictions"'),
    ('Accounts are served from infrastructure in the EU. You know where your site lives.',
     'Accounts are served from infrastructure in privacy-respecting jurisdictions. You know where your site lives.'),
    ('Linux servers with root access, in the EU or Singapore',
     'Linux servers with root access, in privacy-respecting jurisdictions'),
    ('regions: { EU: "European Union", SG: "Singapore" }',
     'regions: { EU: "Privacy Jurisdiction A", SG: "Privacy Jurisdiction B" }'),
    ('jurisdictionNote: "Infrastructure in the EU and Singapore."',
     'jurisdictionNote: "Infrastructure in privacy-respecting jurisdictions."'),
]
EN_ALL = [('"Choose EU or Singapore"', '"Choose your jurisdiction"')]  # 2 occurrences

ES = [
    ('Acceso root en la UE o Singapur', 'Acceso root en jurisdicciones que respetan la privacidad'),
    ('"Regiones UE y Singapur"', '"Jurisdicciones privadas"'),
    ('sub: "UE o Singapur hoy"', 'sub: "Jurisdicciones privadas"'),
    ('region: "UE · Fráncfort"', 'region: "Jurisdicción privada A"'),
    ('region: "SG · Singapur"', 'region: "Jurisdicción privada B"'),
    ('sub: "UE y Singapur"', 'sub: "Jurisdicciones privadas"'),
    ('Infraestructura en jurisdicciones que respetan la privacidad: la UE y Singapur hoy. Tú eliges dónde viven tus datos.',
     'Infraestructura en jurisdicciones que respetan la privacidad. Tú eliges dónde viven tus datos.'),
    ('Servidores Linux con acceso root completo, desplegados en la UE o Singapur en segundos.',
     'Servidores Linux con acceso root completo, desplegados en jurisdicciones que respetan la privacidad en segundos.'),
    ('Busca un dominio, elige la UE o Singapur para tus servidores y añade privacidad WHOIS, incluida.',
     'Busca un dominio, elige una jurisdicción privada para tus servidores y añade privacidad WHOIS, incluida.'),
    ('"Infraestructura en jurisdicciones que respetan la privacidad: UE y Singapur"',
     '"Infraestructura en jurisdicciones que respetan la privacidad"'),
    ('Las cuentas se sirven desde infraestructura en la UE. Sabes dónde vive tu sitio.',
     'Las cuentas se sirven desde infraestructura en jurisdicciones que respetan la privacidad. Sabes dónde vive tu sitio.'),
    ('Servidores Linux con acceso root, en la UE o Singapur',
     'Servidores Linux con acceso root, en jurisdicciones que respetan la privacidad'),
    ('regions: { EU: "Unión Europea", SG: "Singapur" }',
     'regions: { EU: "Jurisdicción privada A", SG: "Jurisdicción privada B" }'),
    ('jurisdictionNote: "Infraestructura en la UE y Singapur."',
     'jurisdictionNote: "Infraestructura en jurisdicciones que respetan la privacidad."'),
]
ES_ALL = [('"Elige UE o Singapur"', '"Elige tu jurisdicción"')]  # 2 occurrences

FR = [
    ("Accès root dans l'UE ou à Singapour", 'Accès root dans des juridictions respectueuses de la vie privée'),
    ('"Régions UE et Singapour"', '"Juridictions privées"'),
    ('sub: "UE et Singapour"', 'sub: "Juridictions privées"'),
    ('region: "UE · Francfort"', 'region: "Juridiction privée A"'),
    ('region: "SG · Singapour"', 'region: "Juridiction privée B"'),
    ("Infrastructure dans des juridictions respectueuses de la vie privée — l'UE et Singapour aujourd'hui. Vous choisissez où vivent vos données.",
     'Infrastructure dans des juridictions respectueuses de la vie privée. Vous choisissez où vivent vos données.'),
    ("Serveurs Linux avec accès root, dans l'UE ou à Singapour",
     'Serveurs Linux avec accès root, dans des juridictions respectueuses de la vie privée'),
    ('"Infrastructure dans des juridictions respectueuses de la vie privée — UE et Singapour"',
     '"Infrastructure dans des juridictions respectueuses de la vie privée"'),
    ('regions: { EU: "Union européenne", SG: "Singapour" }',
     'regions: { EU: "Juridiction privée A", SG: "Juridiction privée B" }'),
    ("jurisdictionNote: \"Infrastructure dans l'UE et à Singapour.\"",
     'jurisdictionNote: "Infrastructure dans des juridictions respectueuses de la vie privée."'),
]
FR_ALL = [('"UE ou Singapour"', '"Choisissez votre juridiction"')]  # 2 occurrences


def apply(path, singles, multis):
    with io.open(path, "r", encoding="utf-8") as f:
        text = f.read()
    for old, new in singles:
        c = text.count(old)
        assert c == 1, f"[{path}] expected 1 of: {old!r} but found {c}"
        text = text.replace(old, new)
    for old, new in multis:
        c = text.count(old)
        assert c >= 1, f"[{path}] expected >=1 of: {old!r} but found {c}"
        text = text.replace(old, new)
        print(f"  replaced {c}x: {old[:40]}...")
    with io.open(path, "w", encoding="utf-8") as f:
        f.write(text)
    print(f"OK {path}")


apply(f"{BASE}/site.en.js", EN, EN_ALL)
apply(f"{BASE}/site.es.js", ES, ES_ALL)
apply(f"{BASE}/site.fr.js", FR, FR_ALL)
print("DONE")
