"""Medication search helpers for Adler.

The public APIs are used as validation/normalization aids. The clinical
interpretation stays anchored in Adler's curated CSV base so the demo remains
usable when public networks are unavailable.
"""

from __future__ import annotations

from typing import Any

import httpx

from backend.services.adler_science import load_scientific_base


RXNAV_DRUGS_URL = "https://rxnav.nlm.nih.gov/REST/drugs.json"
OPENFDA_LABEL_URL = "https://api.fda.gov/drug/label.json"

MEDICATION_ALIASES = {
    "alcool": "alcohol",
    "álcool": "alcohol",
    "bupropiona": "bupropion",
    "carbamazepina": "carbamazepine",
    "fluoxetina": "fluoxetine",
    "ibuprofeno": "ibuprofen",
    "lamotrigina": "lamotrigine",
    "litio": "lithium",
    "lítio": "lithium",
    "lorazepam": "lorazepam",
    "naltrexona": "naltrexone",
    "quetiapina": "quetiapine",
    "sertralina": "sertraline",
    "venlafaxina": "venlafaxine",
}

LOCAL_MEDICATION_NAMES = {
    "alcohol": "alcool",
    "bupropion": "bupropiona",
    "carbamazepine": "carbamazepina",
    "fluoxetine": "fluoxetina",
    "ibuprofen": "ibuprofeno",
    "lamotrigine": "lamotrigina",
    "lithium": "litio",
    "lorazepam": "lorazepam",
    "naltrexone": "naltrexona",
    "quetiapine": "quetiapina",
    "sertraline": "sertralina",
    "venlafaxine": "venlafaxina",
}


def _clean_query(value: str) -> str:
    return " ".join(value.strip().lower().split())


def _canonical_medication(value: str) -> str:
    cleaned = _clean_query(value)
    return MEDICATION_ALIASES.get(cleaned, cleaned)


def _local_medication(value: str) -> str:
    canonical = _canonical_medication(value)
    return LOCAL_MEDICATION_NAMES.get(canonical, _clean_query(value))


def _shorten(value: Any, limit: int = 360) -> str:
    if isinstance(value, list):
        value = " ".join(str(item) for item in value if item)
    text = " ".join(str(value or "").split())
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "..."


def _public_get_json(
    url: str,
    *,
    params: dict[str, str | int],
    timeout_seconds: float = 4.0,
) -> tuple[dict[str, Any] | None, str | None]:
    try:
        with httpx.Client(timeout=timeout_seconds) as client:
            response = client.get(url, params=params)
            response.raise_for_status()
            return response.json(), None
    except httpx.HTTPStatusError as exc:
        return None, f"{exc.response.status_code}: {exc.response.text[:160]}"
    except httpx.HTTPError as exc:
        return None, str(exc)


def _search_rxnorm(name: str) -> tuple[list[dict[str, str]], str]:
    payload, error = _public_get_json(RXNAV_DRUGS_URL, params={"name": name})
    if error:
        return [], f"RxNorm indisponivel nesta execucao: {error}"

    concept_groups = payload.get("drugGroup", {}).get("conceptGroup", []) if payload else []
    results: list[dict[str, str]] = []

    for group in concept_groups:
        term_type = str(group.get("tty", "")).strip()
        for item in group.get("conceptProperties", []) or []:
            results.append(
                {
                    "name": str(item.get("name", "")).strip(),
                    "rxcui": str(item.get("rxcui", "")).strip(),
                    "synonym": str(item.get("synonym", "")).strip(),
                    "term_type": term_type,
                    "source": "RxNorm/RxNav",
                }
            )
            if len(results) >= 8:
                return results, "RxNorm/RxNav retornou conceitos normalizados."

    return results, "RxNorm/RxNav consultado sem conceitos equivalentes relevantes."


def _search_openfda_label(name: str) -> tuple[dict[str, str] | None, str]:
    search = f'openfda.generic_name:"{name}" OR openfda.brand_name:"{name}"'
    payload, error = _public_get_json(
        OPENFDA_LABEL_URL,
        params={"search": search, "limit": 1},
    )
    if error:
        return None, f"openFDA indisponivel nesta execucao: {error}"

    results = payload.get("results", []) if payload else []
    if not results:
        return None, "openFDA Drug Label consultado sem bula correspondente."

    label = results[0]
    openfda = label.get("openfda", {}) if isinstance(label, dict) else {}
    return (
        {
            "brand_name": _shorten(openfda.get("brand_name", []), 180),
            "generic_name": _shorten(openfda.get("generic_name", []), 180),
            "indications": _shorten(label.get("indications_and_usage", [])),
            "warnings": _shorten(label.get("warnings", []) or label.get("boxed_warning", [])),
            "adverse_reactions": _shorten(label.get("adverse_reactions", [])),
            "drug_interactions": _shorten(label.get("drug_interactions", [])),
            "source": "openFDA Drug Label",
        },
        "openFDA retornou rotulagem estruturada do medicamento.",
    )


def _local_science_for_medication(query: str) -> dict[str, Any]:
    local_term = _local_medication(query)
    payload = load_scientific_base(medicamento=local_term)

    if (
        payload["interactions"]
        or payload["laboratory_monitoring"]
        or payload["clinical_concepts"]
        or payload["documents"]
    ):
        return payload

    return load_scientific_base(query=local_term)


def search_medication(query: str) -> dict[str, Any]:
    cleaned_query = _clean_query(query)
    canonical = _canonical_medication(cleaned_query)
    local_term = _local_medication(cleaned_query)
    rxnorm_results, rxnorm_note = _search_rxnorm(canonical)
    label, label_note = _search_openfda_label(canonical)
    local_science = _local_science_for_medication(cleaned_query)

    interactions = local_science["interactions"]
    laboratory_monitoring = local_science["laboratory_monitoring"]
    clinical_concepts = local_science["clinical_concepts"]
    documents = local_science["documents"]

    treatment_notes: list[str] = []
    if label and label.get("indications"):
        treatment_notes.append(
            "Rotulagem oficial localizada para apoiar checagem de indicacao, advertencias e interacoes."
        )
    if clinical_concepts:
        treatment_notes.append(
            f"{len(clinical_concepts)} conceito(s) da base Adler conectam mecanismo, evidencia e aplicacao pratica."
        )
    if laboratory_monitoring:
        treatment_notes.append(
            "Medicamento exige trilha de monitoramento laboratorial na base Adler."
        )
    if interactions:
        treatment_notes.append(
            "Foram encontradas interacoes medicamento/substancia/alimento na curadoria local."
        )
    if not treatment_notes:
        treatment_notes.append(
            "Sem protocolo local especifico; revisar bula e diretrizes antes de inserir no prontuario."
        )

    return {
        "query": cleaned_query,
        "normalized_query": canonical,
        "local_query": local_term,
        "results": rxnorm_results,
        "label": label,
        "curated_insights": {
            "clinical_concepts": clinical_concepts[:6],
            "documents": documents[:6],
            "interactions": interactions[:8],
            "laboratory_monitoring": laboratory_monitoring[:8],
        },
        "treatment_notes": treatment_notes,
        "source_notes": [
            rxnorm_note,
            label_note,
            "Interacoes, exames e conceitos sao filtrados pela base cientifica local do Adler.",
            "Uso clinico requer revisao do profissional; o sistema nao substitui prescricao.",
        ],
        "sources": [
            {
                "name": "RxNorm/RxNav",
                "url": RXNAV_DRUGS_URL,
                "purpose": "normalizacao de nomes e conceitos medicamentosos",
            },
            {
                "name": "openFDA Drug Label",
                "url": OPENFDA_LABEL_URL,
                "purpose": "rotulagem estruturada enviada por fabricantes/distribuidores",
            },
            {
                "name": "Base cientifica Adler",
                "url": "local://adler_base_cientifica_template",
                "purpose": "protocolos, exames, interacoes e conceitos curados",
            },
        ],
    }
