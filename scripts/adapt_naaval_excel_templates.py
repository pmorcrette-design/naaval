#!/usr/bin/env python3
from __future__ import annotations

from copy import deepcopy
from datetime import date
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
DOWNLOADS = Path.home() / "Downloads"
OUTPUT_DIR = ROOT / "deliverables" / "excel-templates"
NS_URI = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL_NS_URI = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKG_REL_NS_URI = "http://schemas.openxmlformats.org/package/2006/relationships"
NS = {"a": NS_URI, "r": REL_NS_URI}

ET.register_namespace("", NS_URI)


def excel_serial(value: date) -> int:
    return (value - date(1899, 12, 30)).days


TODAY_SERIAL = excel_serial(date(2026, 4, 10))
VALID_UNTIL_SERIAL = excel_serial(date(2026, 5, 10))

COMMON = {
    "company_name": "Naaval.io",
    "address_1": "[adresse du siege]",
    "address_2": "[code postal] [ville]",
    "phone": "[telephone]",
    "email": "finance@naaval.io",
    "website": "www.naaval.io",
    "logo_text": "Inserez le logo Naaval ici",
    "client_block": "Entreprise cliente\nAdresse du siege\nCode postal Ville",
    "quote_title": "Offre logistique Naaval.io - livraison dernier kilometre",
    "quote_item_1": "Tournee de livraison dernier kilometre",
    "quote_item_1_desc": "- Mise a disposition d'un chauffeur, suivi operationnel et preuve de livraison",
    "quote_item_2": "Option multi-drop / route optimisee",
    "quote_item_2_desc": "- Ajustez quantite, prix unitaire et niveau de service selon le besoin client",
    "quote_comments": "Commentaires :\n\nPrecisez ici le perimetre, les horaires, le SLA, les acces site et toute contrainte logistique utile.",
    "legal_footer": "Naaval.io - Societe [forme juridique a completer] - SIREN [a completer] - RCS [ville] - Code APE [a completer] - N° TVA intracommunautaire : [a completer]",
    "insurance_footer": "Assurance RC Pro : [a completer] - Couverture geographique : [a completer]",
    "credit_footer": "Modele adapte pour Naaval.io. Completez les mentions legales, bancaires et fiscales avant emission du document.",
    "invoice_title": "Prestations logistiques et livraison dernier kilometre",
    "invoice_item": "Tournee de livraison dernier kilometre",
    "invoice_payment": "Virement bancaire - IBAN/BIC a completer",
    "invoice_customer_name": "Entreprise cliente / contact",
    "invoice_customer_address": "Adresse du siege",
    "invoice_customer_postal": "Code postal - Ville",
    "invoice_customer_vat": "TVA / SIRET client"
}


TEMPLATES = [
    {
        "source": DOWNLOADS / "Modele-de-devis-auto-entrepreneur-gratuit-sans-TVA-Excel.xlsx",
        "output_name": "Naaval-devis-sans-TVA.xlsx",
        "updates": {
            "E6": ("string", COMMON["logo_text"]),
            "I5": ("string", "NAAV-DEV-2026-001"),
            "I6": ("number", TODAY_SERIAL),
            "I7": ("number", 30),
            "I8": ("number", VALID_UNTIL_SERIAL),
            "B11": ("string", COMMON["company_name"]),
            "B12": ("string", COMMON["address_1"]),
            "B13": ("string", COMMON["address_2"]),
            "B14": ("string", COMMON["phone"]),
            "B15": ("string", COMMON["email"]),
            "H13": ("string", COMMON["client_block"]),
            "B18": ("string", "DEVIS N° NAAV-DEV-2026-001"),
            "B20": ("string", COMMON["quote_title"]),
            "B25": ("string", COMMON["quote_item_1"]),
            "B26": ("string", COMMON["quote_item_1_desc"]),
            "B29": ("string", COMMON["quote_item_2"]),
            "B30": ("string", COMMON["quote_item_2_desc"]),
            "B49": ("string", COMMON["quote_comments"]),
            "B65": ("string", "Le present devis est valable 30 jours a compter de sa date d'emission."),
            "B67": ("string", COMMON["legal_footer"]),
            "B68": ("string", COMMON["insurance_footer"]),
            "B69": ("string", COMMON["website"]),
            "B71": ("string", COMMON["credit_footer"]),
        },
    },
    {
        "source": DOWNLOADS / "Modele-de-devis-auto-entrepreneur-gratuit-avec-TVA-Excel.xlsx",
        "output_name": "Naaval-devis-avec-TVA.xlsx",
        "updates": {
            "E6": ("string", COMMON["logo_text"]),
            "L5": ("string", "NAAV-DEV-2026-001"),
            "L6": ("number", TODAY_SERIAL),
            "L7": ("number", 30),
            "L8": ("number", VALID_UNTIL_SERIAL),
            "B11": ("string", COMMON["company_name"]),
            "B12": ("string", COMMON["address_1"]),
            "B13": ("string", COMMON["address_2"]),
            "B14": ("string", COMMON["phone"]),
            "B15": ("string", COMMON["email"]),
            "K13": ("string", COMMON["client_block"]),
            "B18": ("string", "DEVIS N° NAAV-DEV-2026-001"),
            "B20": ("string", COMMON["quote_title"]),
            "B25": ("string", COMMON["quote_item_1"]),
            "B26": ("string", COMMON["quote_item_1_desc"]),
            "B29": ("string", COMMON["quote_item_2"]),
            "B30": ("string", COMMON["quote_item_2_desc"]),
            "H49": ("string", "TVA applicable selon le regime fiscal de Naaval.io. Ajustez le taux ou la mention speciale si necessaire."),
            "B52": ("string", COMMON["quote_comments"]),
            "B68": ("string", "Le present devis est valable 30 jours a compter de sa date d'emission."),
            "B70": ("string", COMMON["legal_footer"]),
            "B71": ("string", COMMON["insurance_footer"]),
            "B72": ("string", COMMON["website"]),
            "B74": ("string", COMMON["credit_footer"]),
        },
    },
    {
        "source": DOWNLOADS / "Modele-de-facture-auto-entrepreneur-gratuit.xlsx",
        "output_name": "Naaval-facture-sans-TVA.xlsx",
        "updates": {
            "E3": ("string", COMMON["company_name"]),
            "E4": ("string", COMMON["address_1"]),
            "E5": ("string", COMMON["address_2"]),
            "E6": ("string", COMMON["email"]),
            "E7": ("string", COMMON["phone"]),
            "E8": ("string", COMMON["website"]),
            "E9": ("string", "SIREN [a completer] - Code APE [a completer]"),
            "E10": ("string", "TVA intracom [a completer] - RCS [ville]"),
            "I4": ("string", "PO-CLIENT-001"),
            "I5": ("string", "NAAV-FAC-2026-001"),
            "I6": ("number", TODAY_SERIAL),
            "I7": ("number", VALID_UNTIL_SERIAL),
            "I8": ("string", "30 jours"),
            "I9": ("string", "A reception par virement bancaire"),
            "I10": ("number", TODAY_SERIAL),
            "D15": ("string", COMMON["invoice_customer_name"]),
            "D16": ("string", COMMON["invoice_customer_address"]),
            "D17": ("string", COMMON["invoice_customer_postal"]),
            "D18": ("string", COMMON["invoice_customer_vat"]),
            "H15": ("string", COMMON["invoice_customer_name"]),
            "H16": ("string", COMMON["invoice_customer_address"]),
            "H17": ("string", COMMON["invoice_customer_postal"]),
            "H18": ("string", COMMON["invoice_customer_vat"]),
            "B24": ("string", "FACTURE N° NAAV-FAC-2026-001"),
            "B26": ("string", COMMON["invoice_title"]),
            "B31": ("string", COMMON["invoice_item"]),
            "B57": ("string", COMMON["invoice_payment"]),
            "B84": ("string", COMMON["credit_footer"]),
        },
    },
    {
        "source": DOWNLOADS / "Modele-facture-auto-entrepreneur-gratuit-avec-TVA.xlsx",
        "output_name": "Naaval-facture-avec-TVA.xlsx",
        "updates": {
            "E3": ("string", COMMON["company_name"]),
            "E4": ("string", COMMON["address_1"]),
            "E5": ("string", COMMON["address_2"]),
            "E6": ("string", COMMON["email"]),
            "E7": ("string", COMMON["phone"]),
            "E8": ("string", COMMON["website"]),
            "I4": ("string", "PO-CLIENT-001"),
            "I5": ("string", "NAAV-FAC-2026-001"),
            "I6": ("number", TODAY_SERIAL),
            "I7": ("number", VALID_UNTIL_SERIAL),
            "I8": ("string", "30 jours"),
            "I10": ("string", "Virement bancaire"),
            "D15": ("string", COMMON["invoice_customer_name"]),
            "D16": ("string", COMMON["invoice_customer_address"]),
            "D17": ("string", COMMON["invoice_customer_postal"]),
            "D18": ("string", COMMON["invoice_customer_vat"]),
            "H15": ("string", COMMON["invoice_customer_name"]),
            "H16": ("string", COMMON["invoice_customer_address"]),
            "H17": ("string", COMMON["invoice_customer_postal"]),
            "H18": ("string", COMMON["invoice_customer_vat"]),
            "B24": ("string", "FACTURE N° NAAV-FAC-2026-001"),
            "B26": ("string", COMMON["invoice_title"]),
            "B31": ("string", COMMON["invoice_item"]),
            "B33": ("string", "Option multi-drop / suivi temps reel"),
            "B57": ("string", COMMON["invoice_payment"]),
            "B81": ("string", COMMON["credit_footer"]),
        },
    },
]


def col_to_number(column: str) -> int:
    value = 0
    for char in column:
        value = value * 26 + (ord(char.upper()) - 64)
    return value


def split_ref(ref: str) -> tuple[str, int]:
    column = "".join(char for char in ref if char.isalpha())
    row = int("".join(char for char in ref if char.isdigit()))
    return column, row


class XlsxEditor:
    def __init__(self, source: Path):
        self.source = source
        with ZipFile(source) as archive:
            self.files = {name: archive.read(name) for name in archive.namelist()}

        self.workbook = ET.fromstring(self.files["xl/workbook.xml"])
        self.workbook_rels = ET.fromstring(self.files["xl/_rels/workbook.xml.rels"])
        self.sheet_target = self._resolve_first_sheet_target()
        self.sheet = ET.fromstring(self.files[self.sheet_target])
        self.shared_strings = ET.fromstring(self.files["xl/sharedStrings.xml"])
        self.shared_values = [
            "".join(node.text or "" for node in item.findall(".//a:t", NS))
            for item in self.shared_strings.findall("a:si", NS)
        ]

    def _resolve_first_sheet_target(self) -> str:
        relationship_map = {
            rel.attrib["Id"]: rel.attrib["Target"]
            for rel in self.workbook_rels.findall(f"{{{PKG_REL_NS_URI}}}Relationship")
        }
        first_sheet = self.workbook.find("a:sheets/a:sheet", NS)
        rel_id = first_sheet.attrib[f"{{{REL_NS_URI}}}id"]
        return "xl/" + relationship_map[rel_id].lstrip("/")

    def _sheet_data(self) -> ET.Element:
        return self.sheet.find("a:sheetData", NS)

    def _ensure_row(self, row_number: int) -> ET.Element:
        sheet_data = self._sheet_data()
        rows = sheet_data.findall("a:row", NS)
        for row in rows:
            if int(row.attrib["r"]) == row_number:
                return row

        new_row = ET.Element(f"{{{NS_URI}}}row", {"r": str(row_number)})
        inserted = False
        for index, row in enumerate(rows):
            if int(row.attrib["r"]) > row_number:
                sheet_data.insert(index, new_row)
                inserted = True
                break
        if not inserted:
            sheet_data.append(new_row)
        return new_row

    def _find_cell(self, ref: str) -> ET.Element | None:
        return self.sheet.find(f".//a:c[@r='{ref}']", NS)

    def _ensure_cell(self, ref: str) -> ET.Element:
        cell = self._find_cell(ref)
        if cell is not None:
            return cell

        column, row_number = split_ref(ref)
        row = self._ensure_row(row_number)
        new_cell = ET.Element(f"{{{NS_URI}}}c", {"r": ref})
        target_col = col_to_number(column)
        inserted = False
        for index, candidate in enumerate(list(row)):
            candidate_column, _ = split_ref(candidate.attrib["r"])
            if col_to_number(candidate_column) > target_col:
                row.insert(index, new_cell)
                inserted = True
                break
        if not inserted:
            row.append(new_cell)
        return new_cell

    def _shared_string_index(self, value: str) -> int:
        if value in self.shared_values:
            return self.shared_values.index(value)

        item = ET.SubElement(self.shared_strings, f"{{{NS_URI}}}si")
        text = ET.SubElement(item, f"{{{NS_URI}}}t")
        text.text = value
        self.shared_values.append(value)
        self.shared_strings.set("count", str(len(self.shared_values)))
        self.shared_strings.set("uniqueCount", str(len(self.shared_values)))
        return len(self.shared_values) - 1

    def set_string(self, ref: str, value: str) -> None:
        cell = self._ensure_cell(ref)
        for child in list(cell):
            if child.tag in {f"{{{NS_URI}}}v", f"{{{NS_URI}}}is"}:
                cell.remove(child)
        if cell.find("a:f", NS) is not None:
            cell.remove(cell.find("a:f", NS))
        cell.set("t", "s")
        value_node = cell.find("a:v", NS)
        if value_node is None:
            value_node = ET.SubElement(cell, f"{{{NS_URI}}}v")
        value_node.text = str(self._shared_string_index(value))

    def set_number(self, ref: str, value: int | float) -> None:
        cell = self._ensure_cell(ref)
        if "t" in cell.attrib:
            del cell.attrib["t"]
        value_node = cell.find("a:v", NS)
        if value_node is None:
            value_node = ET.SubElement(cell, f"{{{NS_URI}}}v")
        value_node.text = str(value)

    def apply_updates(self, updates: dict[str, tuple[str, str | int | float]]) -> None:
        for ref, (kind, value) in updates.items():
            if kind == "string":
                self.set_string(ref, str(value))
            elif kind == "number":
                self.set_number(ref, value)
            else:
                raise ValueError(f"Unsupported update kind: {kind}")

    def save(self, output_path: Path) -> None:
        self.files["xl/workbook.xml"] = ET.tostring(self.workbook, encoding="utf-8", xml_declaration=True)
        self.files["xl/_rels/workbook.xml.rels"] = ET.tostring(self.workbook_rels, encoding="utf-8", xml_declaration=True)
        self.files[self.sheet_target] = ET.tostring(self.sheet, encoding="utf-8", xml_declaration=True)
        self.files["xl/sharedStrings.xml"] = ET.tostring(self.shared_strings, encoding="utf-8", xml_declaration=True)

        with ZipFile(output_path, "w", compression=ZIP_DEFLATED) as archive:
            for name, raw in self.files.items():
                archive.writestr(name, raw)


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    for template in TEMPLATES:
        editor = XlsxEditor(template["source"])
        editor.apply_updates(template["updates"])
        editor.save(OUTPUT_DIR / template["output_name"])
        print(f"Created {OUTPUT_DIR / template['output_name']}")


if __name__ == "__main__":
    main()
