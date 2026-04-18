# Naaval Excel Templates

Ces fichiers sont les modeles de devis et de facture adaptes a `Naaval.io` a partir des templates Excel fournis.

Fichiers generes :
- `Naaval-devis-sans-TVA.xlsx`
- `Naaval-devis-avec-TVA.xlsx`
- `Naaval-facture-sans-TVA.xlsx`
- `Naaval-facture-avec-TVA.xlsx`

Personnalisation deja appliquee :
- marque `Naaval.io`
- libelles devis / facture
- placeholders client
- website `www.naaval.io`
- email `finance@naaval.io`
- exemples de prestations last-mile delivery

Champs a completer avant usage reel :
- adresse du siege
- telephone
- forme juridique
- SIREN / RCS / APE
- numero de TVA intracommunautaire
- assurance RC Pro
- coordonnees bancaires
- logo final si tu veux remplacer le placeholder

Pour regenerer les fichiers :

```bash
cd "/Users/pierre/Documents/New project"
python3 scripts/adapt_naaval_excel_templates.py
```
