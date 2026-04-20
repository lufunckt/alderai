"""Tournament analysis service for mixed-game scouting uploads."""

from __future__ import annotations

import base64
import csv
import io
import json
import re
import zipfile
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Iterable


GAME_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\bbadugi\b", re.IGNORECASE), "Badugi"),
    (re.compile(r"\b(?:2-7|deuce[- ]to[- ]seven|triple draw)\b", re.IGNORECASE), "2-7 Triple Draw"),
    (re.compile(r"\brazz\b", re.IGNORECASE), "Razz"),
    (re.compile(r"\bstud[\s-]*(?:8|hi[- ]lo|eight)\b", re.IGNORECASE), "Stud Hi-Lo"),
    (re.compile(r"\b7\s*card\s*stud\s*hi[/ -]?lo\b", re.IGNORECASE), "Stud Hi-Lo"),
    (re.compile(r"\b7\s*card\s*stud\b|\bseven card stud\b|\bstud high\b|\bstud\b", re.IGNORECASE), "Seven Card Stud"),
    (re.compile(r"\bomaha[\s-]*(?:hi[- ]lo|8|eight)\b|\bo8\b|\bplo8\b", re.IGNORECASE), "Omaha Hi-Lo"),
    (re.compile(r"\bomaha[\s-]*pot[\s-]*limit\b|\bplo\b", re.IGNORECASE), "Pot-Limit Omaha"),
    (re.compile(r"\bhold'?em[\s-]*no[\s-]*limit\b|\bnlhe\b", re.IGNORECASE), "No-Limit Hold'em"),
    (re.compile(r"\blimit hold'?em\b|\blhe\b", re.IGNORECASE), "Limit Hold'em"),
    (re.compile(r"\bhold'?em\b", re.IGNORECASE), "Hold'em"),
]

EXACT_GAME_NAMES = {
    "hold'em no limit": "No-Limit Hold'em",
    "holdem no limit": "No-Limit Hold'em",
    "hold'em limit": "Limit Hold'em",
    "holdem limit": "Limit Hold'em",
    "omaha pot limit": "Pot-Limit Omaha",
    "omaha hi/lo limit": "Omaha Hi-Lo",
    "omaha hi-lo limit": "Omaha Hi-Lo",
    "triple draw 2-7 lowball limit": "2-7 Triple Draw",
    "2-7 triple draw": "2-7 Triple Draw",
    "7 card stud limit": "Seven Card Stud",
    "7 card stud hi/lo limit": "Stud Hi-Lo",
    "7 card stud hi-lo limit": "Stud Hi-Lo",
    "razz limit": "Razz",
    "badugi limit": "Badugi",
}

AGGRESSIVE_PATTERN = re.compile(
    r"\b(?:raise|raises|raised|re-raise|reraises|3-bet|three-bet|4-bet|bet|bets|all-in|caps|cap|completes|bring-in)\b",
    re.IGNORECASE,
)
PASSIVE_PATTERN = re.compile(r"\b(?:call|calls|called|check|checks|limp|limps|draws|pat)\b", re.IGNORECASE)
FOLD_PATTERN = re.compile(r"\b(?:fold|folds|folded|muck|mucks|mucked|desistiu)\b", re.IGNORECASE)
SHOWDOWN_PATTERN = re.compile(r"\b(?:showdown|shows|showed|reveals|revealed|mostrou|escondeu)\b", re.IGNORECASE)
WIN_PATTERN = re.compile(r"\b(?:won|wins|winner|collected|collects|scoop|scoops|scooped|ganhou|recebeu)\b", re.IGNORECASE)
LOSS_PATTERN = re.compile(r"\b(?:lost|loses|bust(?:ed)?|eliminated|brick(?:ed)?|perdeu)\b", re.IGNORECASE)
BUBBLE_PATTERN = re.compile(r"\b(?:bubble|itm|in the money|money bubble|final table bubble|bolha|mesa final)\b", re.IGNORECASE)
ACTION_NAME_PATTERN = re.compile(
    r"\b([A-Za-z][A-Za-z0-9_.-]{2,})\s*:\s*(?:raises|bets|calls|checks|folds|shows|wins|posts|completes|brings-in)",
    re.IGNORECASE,
)
SEAT_NAME_PATTERN = re.compile(r"Seat\s+\d+:\s*([A-Za-z][A-Za-z0-9_.-]{1,})", re.IGNORECASE)
DEALT_TO_PATTERN = re.compile(r"Dealt to\s+([A-Za-z][A-Za-z0-9_.-]{1,})", re.IGNORECASE)
VS_PATTERN = re.compile(r"\b([A-Za-z][A-Za-z0-9_.-]{2,})\s+vs\.?\s+([A-Za-z][A-Za-z0-9_.-]{2,})", re.IGNORECASE)
PLACE_PATTERN = re.compile(r"\b(?:place|finish(?:ed)?|rank)\s*[:#=-]?\s*(\d+)\b", re.IGNORECASE)
PLAYER_KEYWORDS = ("player", "hero", "villain", "opponent", "name", "screen", "alias", "nick")
GAME_FIELD_KEYWORDS = ("game", "variant", "format", "modality")
TOURNAMENT_FIELD_KEYWORDS = ("tournament", "event", "series", "session", "match")
RESULT_FIELD_KEYWORDS = ("result", "profit", "net", "won", "loss", "finish", "place", "rank", "score")
TEXT_EXTENSIONS = {".txt", ".log", ".csv", ".tsv", ".json", ".ndjson"}
IGNORED_NAME_TOKENS = {
    "ante",
    "bets",
    "bring",
    "button",
    "call",
    "check",
    "dealer",
    "dealt",
    "final",
    "fold",
    "hand",
    "hero",
    "limit",
    "lost",
    "player",
    "pot",
    "raise",
    "seat",
    "showdown",
    "small",
    "table",
    "turn",
    "villain",
    "won",
}

EARLY_STREET_TOKENS = (
    "pre-draw/preflop",
    "preflop",
    "predraw",
    "before flop",
    "antes flop",
    "antes o draw",
)
LATE_STREET_TOKENS = (
    "turn",
    "river",
    "showdown",
    "5th street",
    "6th street",
    "7th street",
    "5o street",
    "6o street",
    "7o street",
)


@dataclass
class RecordSignal:
    source_name: str
    tournament: str
    game: str
    players: set[str]
    opponents: set[str]
    target_involved: bool
    aggressive_actions: int
    passive_actions: int
    folds: int
    showdowns: int
    wins: int
    losses: int
    bubbles: int
    vpip: int
    early_folds: int
    late_street_reaches: int
    event_time: datetime | None
    structured_schema: bool
    evidence: list[str] = field(default_factory=list)


@dataclass
class SupplementalOpponentSummary:
    name: str
    display_name: str
    hands_with_hero: int
    tournaments_with_hero: int
    most_seen_variant: str
    variant_mix: list[str]
    source_name: str


@dataclass
class SupplementalTournamentSummary:
    tournament_id: str
    file_date: str
    buy_in_text: str
    hands: int
    unique_opponents: int
    variants_played: list[str]
    first_hand_brt: datetime | None
    last_hand_brt: datetime | None
    source_file: str
    source_name: str


def analyze_tournament_payload(payload: dict) -> dict:
    target_player = str(payload.get("target_player") or "biawhite").strip()
    files = payload.get("files") or []
    if not files:
        raise ValueError("Envie pelo menos um arquivo para analisar.")

    return _build_analysis(files=files, target_player=target_player)


def build_demo_analysis() -> dict:
    demo_files = [
        {
            "name": "biawhite_mixed_results.csv",
            "encoding": "text",
            "content": """tournament,game,player,opponent,result,notes
Spring Mixed,Limit Hold'em,biawhite,riverfox,won,raised river and value bet thin
Spring Mixed,Omaha Hi-Lo,biawhite,aceorbit,lost,called down with second nut low and got quartered
Spring Mixed,Razz,biawhite,riverfox,won,completed on third and kept pressure through sixth
Sunday 8-Game,Badugi,biawhite,studpilot,won,snowed river after pat line
Sunday 8-Game,Stud Hi-Lo,biawhite,aceorbit,lost,defended too wide on bubble
Sunday 8-Game,2-7 Triple Draw,biawhite,drawsmith,won,three-bet pre draw and pat on second draw
Sunday 8-Game,Seven Card Stud,biawhite,studpilot,won,value bet river after board lock
Sunday 8-Game,Limit Hold'em,biawhite,drawsmith,lost,folded turn after check raise
""",
        },
        {
            "name": "final_table_notes.txt",
            "encoding": "text",
            "content": """
Tournament: SCOOP Mixed Main
Game: Omaha Hi-Lo
biawhite: raises flop, bets turn, shows nut low and wins half against aceorbit

Tournament: SCOOP Mixed Main
Game: Razz
Seat 1: biawhite
Seat 2: riverfox
biawhite: completes
riverfox: calls
biawhite: bets
riverfox: folds

Tournament: SCOOP Mixed Main
Game: Badugi
biawhite vs studpilot
studpilot keeps pat too often and calls river
biawhite snowed and won
""",
        },
    ]
    return _build_analysis(files=demo_files, target_player="biawhite")


def _build_analysis(files: list[dict], target_player: str) -> dict:
    target_norm = _normalize_name(target_player)
    ingested_files: list[dict] = []
    signals: list[RecordSignal] = []
    discovered_names: Counter[str] = Counter()
    source_notes: list[str] = []
    structured_file_count = 0
    supplemental_file_count = 0
    supplemental_opponents: dict[str, SupplementalOpponentSummary] = {}
    supplemental_tournament_file_count = 0
    supplemental_tournaments: dict[str, SupplementalTournamentSummary] = {}

    for uploaded in files:
        expanded_files = _expand_uploaded_file(uploaded)
        if not expanded_files:
            ingested_files.append(
                {
                    "name": uploaded.get("name", "arquivo"),
                    "records": 0,
                    "target_mentions": 0,
                    "detected_players": [],
                    "notes": ["Arquivo ignorado: formato nao suportado ou vazio."],
                }
            )
            continue

        for file_name, content, notes in expanded_files:
            extracted_records = _extract_records(file_name, content)
            file_signals: list[RecordSignal] = []
            file_players: Counter[str] = Counter()
            structured_detected = False
            supplemental_detected = False
            supplemental_rows = 0
            tournament_summary_detected = False
            tournament_summary_rows = 0

            for record in extracted_records:
                tournament_summary = _extract_supplemental_tournament(record=record, source_name=file_name)
                if tournament_summary is not None:
                    tournament_summary_detected = True
                    tournament_summary_rows += 1
                    tournament_key = tournament_summary.tournament_id or tournament_summary.source_file or file_name
                    current_tournament = supplemental_tournaments.get(tournament_key)
                    if current_tournament is None or tournament_summary.hands >= current_tournament.hands:
                        supplemental_tournaments[tournament_key] = tournament_summary
                    continue

                supplemental_summary = _extract_supplemental_opponent(record=record, source_name=file_name)
                if supplemental_summary is not None:
                    supplemental_detected = True
                    supplemental_rows += 1
                    file_players[supplemental_summary.name] += 1
                    discovered_names[supplemental_summary.name] += 1
                    current = supplemental_opponents.get(supplemental_summary.name)
                    if current is None or supplemental_summary.hands_with_hero >= current.hands_with_hero:
                        supplemental_opponents[supplemental_summary.name] = supplemental_summary
                    continue

                signal = _signal_from_record(record=record, source_name=file_name, target_norm=target_norm)
                if signal is None:
                    continue
                structured_detected = structured_detected or signal.structured_schema
                file_signals.append(signal)
                for player in signal.players:
                    file_players[player] += 1
                    discovered_names[player] += 1

            if structured_detected:
                structured_file_count += 1
            if supplemental_detected:
                supplemental_file_count += 1
            if tournament_summary_detected:
                supplemental_tournament_file_count += 1

            target_mentions = sum(1 for signal in file_signals if signal.target_involved)
            signals.extend(file_signals)
            file_notes = list(notes)
            if structured_detected:
                file_notes.append("Schema estruturado detectado: hand_id/game_variant/vpip_flag/players_list.")
            if supplemental_detected:
                file_notes.append("CSV agregado de oponentes detectado: Opponent/Hands with hero/Variant mix.")
            if tournament_summary_detected:
                file_notes.append("CSV agregado de torneios detectado: Tournament ID/Hands/Variants played.")
            elif file_signals:
                file_notes.append("Arquivo lido com parser heuristico.")
            ingested_files.append(
                {
                    "name": file_name,
                    "records": len(file_signals) + supplemental_rows + tournament_summary_rows,
                    "target_mentions": target_mentions,
                    "detected_players": [name for name, _ in file_players.most_common(6)],
                    "notes": file_notes or ["Arquivo lido com parser heuristico."],
                }
            )

    if not signals:
        raise ValueError("Nao consegui extrair maos ou linhas legiveis dos arquivos enviados.")

    target_records = [signal for signal in signals if signal.target_involved]
    if not target_records:
        candidate_names = [name for name, _ in discovered_names.most_common(8)]
        hint = "Nenhuma linha mencionou o jogador alvo."
        if candidate_names:
            hint += f" Jogadores detectados: {', '.join(candidate_names)}."
        raise ValueError(hint)

    source_notes.extend(
        _build_source_notes(
            target_records=target_records,
            structured_file_count=structured_file_count,
            supplemental_file_count=supplemental_file_count,
            supplemental_opponents=supplemental_opponents,
            supplemental_tournament_file_count=supplemental_tournament_file_count,
            supplemental_tournaments=supplemental_tournaments,
        )
    )

    modalities = _aggregate_modalities(target_records)
    opponents = _aggregate_opponents(target_records, target_norm, supplemental_opponents)
    tournaments = _aggregate_tournaments(supplemental_tournaments)
    player_profile = _build_player_profile(target_player=target_player, target_records=target_records, modalities=modalities)

    confidence = _confidence_label(len(target_records))
    metrics = {
        "files_processed": len(ingested_files),
        "extracted_records": len(signals),
        "target_records": len(target_records),
        "tournaments": len(tournaments),
        "modalities": len(modalities),
        "opponents": len(opponents),
        "confidence": confidence,
        "source_notes": source_notes,
    }

    return {
        "metrics": metrics,
        "player_profile": player_profile,
        "modalities": modalities,
        "opponents": opponents,
        "tournaments": tournaments,
        "files": ingested_files,
        "discovered_players": [name for name, _ in discovered_names.most_common(12)],
    }


def _expand_uploaded_file(uploaded: dict) -> list[tuple[str, str, list[str]]]:
    file_name = str(uploaded.get("name") or "arquivo")
    encoding = str(uploaded.get("encoding") or "base64")
    raw_content = uploaded.get("content") or ""
    suffix = Path(file_name).suffix.lower()

    if encoding == "text":
        return [(file_name, str(raw_content), ["Arquivo recebido como texto puro."])]

    if encoding != "base64":
        return []

    raw_bytes = base64.b64decode(raw_content)
    if suffix == ".zip":
        return _expand_zip(file_name, raw_bytes)

    decoded = _decode_bytes(raw_bytes)
    return [(file_name, decoded, ["Arquivo binario decodificado automaticamente."])]


def _expand_zip(file_name: str, raw_bytes: bytes) -> list[tuple[str, str, list[str]]]:
    extracted: list[tuple[str, str, list[str]]] = []
    with zipfile.ZipFile(io.BytesIO(raw_bytes)) as archive:
        for member in archive.infolist():
            if member.is_dir():
                continue
            suffix = Path(member.filename).suffix.lower()
            if suffix not in TEXT_EXTENSIONS:
                continue
            with archive.open(member) as handle:
                decoded = _decode_bytes(handle.read())
            extracted.append(
                (
                    f"{file_name}:{member.filename}",
                    decoded,
                    ["Extraido de .zip e processado como texto."],
                )
            )
    return extracted


def _decode_bytes(raw_bytes: bytes) -> str:
    for encoding in ("utf-8", "utf-8-sig", "utf-16", "latin-1"):
        try:
            return raw_bytes.decode(encoding)
        except UnicodeDecodeError:
            continue
    return raw_bytes.decode("utf-8", errors="ignore")


def _extract_records(file_name: str, content: str) -> list[dict]:
    suffix = Path(file_name.split(":", 1)[-1]).suffix.lower()
    if suffix == ".csv":
        return _extract_csv_records(content, delimiter=",")
    if suffix == ".tsv":
        return _extract_csv_records(content, delimiter="\t")
    if suffix in {".json", ".ndjson"}:
        return _extract_json_records(content)
    return _extract_text_records(content)


def _extract_csv_records(content: str, delimiter: str) -> list[dict]:
    stream = io.StringIO(content)
    reader = csv.DictReader(stream, delimiter=delimiter)
    rows: list[dict] = []
    for row in reader:
        if not row:
            continue
        cleaned = {str(key or "").strip(): str(value or "").strip() for key, value in row.items()}
        cleaned["_raw_text"] = " | ".join(f"{key}: {value}" for key, value in cleaned.items() if key and value)
        rows.append(cleaned)
    return rows


def _extract_supplemental_opponent(record: dict, source_name: str) -> SupplementalOpponentSummary | None:
    if not _is_opponent_summary_record(record):
        return None

    raw_name = _value_for(record, "opponent")
    normalized_name = _normalize_name(raw_name or "")
    if not normalized_name:
        return None

    hands_with_hero = int(_extract_number(_value_for(record, "hands with hero") or "0") or 0)
    tournaments_with_hero = int(_extract_number(_value_for(record, "tournaments with hero") or "0") or 0)
    most_seen_variant = _normalize_variant_label(_value_for(record, "most seen variant") or "")
    variant_mix = _parse_variant_mix(_value_for(record, "variant mix") or "")

    if not most_seen_variant and variant_mix:
        most_seen_variant = variant_mix[0].split(":", 1)[0].strip()

    return SupplementalOpponentSummary(
        name=normalized_name,
        display_name=(raw_name or "").strip() or _display_name(normalized_name),
        hands_with_hero=hands_with_hero,
        tournaments_with_hero=tournaments_with_hero,
        most_seen_variant=most_seen_variant,
        variant_mix=variant_mix,
        source_name=source_name,
    )


def _extract_supplemental_tournament(record: dict, source_name: str) -> SupplementalTournamentSummary | None:
    if not _is_tournament_summary_record(record):
        return None

    tournament_id = (_value_for(record, "tournament id", "tournament_id") or "").strip()
    source_file = (_value_for(record, "source file", "source_file") or "").strip()
    if not tournament_id and not source_file:
        return None

    hands = int(_extract_number(_value_for(record, "hands") or "0") or 0)
    unique_opponents = int(_extract_number(_value_for(record, "unique opponents", "unique_opponents") or "0") or 0)
    variants_played = _parse_variants_played(_value_for(record, "variants played", "variants_played") or "")

    return SupplementalTournamentSummary(
        tournament_id=tournament_id or source_file or source_name,
        file_date=(_value_for(record, "file date", "file_date") or "").strip(),
        buy_in_text=(_value_for(record, "buy-in text", "buy_in_text") or "").strip(),
        hands=hands,
        unique_opponents=unique_opponents,
        variants_played=variants_played,
        first_hand_brt=_parse_datetime_value(_value_for(record, "first hand (brt)", "first_hand_brt")),
        last_hand_brt=_parse_datetime_value(_value_for(record, "last hand (brt)", "last_hand_brt")),
        source_file=source_file or source_name,
        source_name=source_name,
    )


def _is_opponent_summary_record(record: dict) -> bool:
    keys = {key.lower() for key in record if key != "_raw_text"}
    required = {"opponent", "hands with hero", "tournaments with hero", "variant mix"}
    return len(keys.intersection(required)) >= 3


def _is_tournament_summary_record(record: dict) -> bool:
    keys = {key.lower() for key in record if key != "_raw_text"}
    required = {"tournament id", "hands", "variants played", "source file"}
    return len(keys.intersection(required)) >= 3


def _parse_variant_mix(value: str) -> list[str]:
    entries: list[tuple[str, int]] = []
    for raw_name, raw_count in re.findall(r"([^:,]+):\s*(\d+)", value):
        normalized_name = _normalize_variant_label(raw_name)
        if not normalized_name:
            continue
        entries.append((normalized_name, int(raw_count)))

    if not entries:
        return []

    entries.sort(key=lambda item: item[1], reverse=True)
    return [f"{name}: {count}" for name, count in entries[:6]]


def _parse_variants_played(value: str) -> list[str]:
    variants: list[str] = []
    for chunk in re.split(r"[,;|]", value):
        normalized = _normalize_variant_label(chunk)
        if normalized and normalized not in variants:
            variants.append(normalized)
    return variants


def _normalize_variant_label(value: str) -> str:
    stripped = value.strip()
    if not stripped:
        return ""
    normalized = stripped.lower().replace("''", "'")
    exact = EXACT_GAME_NAMES.get(normalized)
    if exact:
        return exact
    matched = _match_game(stripped)
    return matched or stripped


def _extract_json_records(content: str) -> list[dict]:
    text = content.strip()
    if not text:
        return []
    try:
        payload = json.loads(text)
    except json.JSONDecodeError:
        return _extract_text_records(content)
    return list(_flatten_json_records(payload))


def _flatten_json_records(payload: object) -> Iterable[dict]:
    if isinstance(payload, list):
        for item in payload:
            yield from _flatten_json_records(item)
        return
    if isinstance(payload, dict):
        if any(not isinstance(value, (dict, list)) for value in payload.values()):
            record = {str(key): _to_text(value) for key, value in payload.items()}
            record["_raw_text"] = " | ".join(f"{key}: {value}" for key, value in record.items() if value)
            yield record
        for value in payload.values():
            if isinstance(value, (dict, list)):
                yield from _flatten_json_records(value)


def _extract_text_records(content: str) -> list[dict]:
    blocks = [block.strip() for block in re.split(r"\n\s*\n", content) if block.strip()]
    if not blocks:
        return []
    if len(blocks) == 1:
        single_block = blocks[0]
        if len(single_block) <= 12000:
            return [{"_raw_text": single_block}]
        if re.search(r"(?im)^hand\s*#", content):
            blocks = [chunk.strip() for chunk in re.split(r"(?im)(?=^hand\s*#)", content) if chunk.strip()]
        else:
            blocks = [line.strip() for line in content.splitlines() if line.strip()]
    return [{"_raw_text": block} for block in blocks if len(block) >= 8]


def _signal_from_record(record: dict, source_name: str, target_norm: str) -> RecordSignal | None:
    raw_text = str(record.get("_raw_text") or "").strip()
    field_text = " | ".join(f"{key}: {value}" for key, value in record.items() if key != "_raw_text" and value)
    text = f"{raw_text} | {field_text}".strip(" |")
    if not text:
        return None

    structured_schema = _is_structured_hand_record(record)
    players = _extract_players(record, text)
    target_involved = (
        target_norm in players
        or bool(re.search(rf"\b{re.escape(target_norm)}\b", _normalize_free_text(text)))
        or structured_schema
        or any("hero" in key.lower() for key in record)
    )
    if not players and not target_involved:
        return None

    if target_involved:
        players.add(target_norm)

    game = _detect_game(record, text)
    tournament = _detect_tournament(record, source_name)
    aggressive_actions = len(AGGRESSIVE_PATTERN.findall(text))
    passive_actions = len(PASSIVE_PATTERN.findall(text))
    folds = _detect_fold(record, text)
    showdowns = _detect_showdown(record, text)
    wins, losses = _detect_results(record, text)
    bubbles = len(BUBBLE_PATTERN.findall(text))
    vpip = _detect_vpip(record, text)
    early_folds = _detect_early_fold(record, text, game, folds)
    late_street_reaches = _detect_late_street(record, text, showdowns)
    evidence = _collect_evidence(record, text)
    opponents = {name for name in players if name != target_norm}
    event_time = _parse_event_time(record)

    return RecordSignal(
        source_name=source_name,
        tournament=tournament,
        game=game,
        players=players,
        opponents=opponents,
        target_involved=target_involved,
        aggressive_actions=aggressive_actions,
        passive_actions=passive_actions,
        folds=folds,
        showdowns=showdowns,
        wins=wins,
        losses=losses,
        bubbles=bubbles,
        vpip=vpip,
        early_folds=early_folds,
        late_street_reaches=late_street_reaches,
        event_time=event_time,
        structured_schema=structured_schema,
        evidence=evidence,
    )


def _is_structured_hand_record(record: dict) -> bool:
    keys = {key.lower() for key in record if key != "_raw_text"}
    structured_keys = {"hand_id", "tournament_id", "game_variant", "vpip_flag", "players_list", "hero_result"}
    return len(keys.intersection(structured_keys)) >= 3


def _extract_players(record: dict, text: str) -> set[str]:
    names: set[str] = set()

    players_list = _value_for(record, "players_list", "players", "player_list")
    if players_list:
        for chunk in re.split(r"[,;/|]", players_list):
            normalized = _normalize_name(chunk)
            if normalized:
                names.add(normalized)
        return {name for name in names if name and name not in IGNORED_NAME_TOKENS}

    for key, value in record.items():
        if key == "_raw_text" or not value:
            continue
        lowered = key.lower()
        if any(keyword in lowered for keyword in PLAYER_KEYWORDS):
            for chunk in re.split(r"[,;/|]", str(value)):
                normalized = _normalize_name(chunk)
                if normalized:
                    names.add(normalized)

    for pattern in (ACTION_NAME_PATTERN, SEAT_NAME_PATTERN, DEALT_TO_PATTERN):
        for match in pattern.findall(text):
            normalized = _normalize_name(match)
            if normalized:
                names.add(normalized)

    for first, second in VS_PATTERN.findall(text):
        first_name = _normalize_name(first)
        second_name = _normalize_name(second)
        if first_name:
            names.add(first_name)
        if second_name:
            names.add(second_name)

    return {name for name in names if name and name not in IGNORED_NAME_TOKENS}


def _normalize_name(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9_.-]+", "", value.strip().lower())
    if len(cleaned) < 2 or cleaned.isdigit():
        return ""
    return cleaned


def _normalize_free_text(value: str) -> str:
    return re.sub(r"[^a-z0-9_.-]+", " ", value.lower())


def _detect_game(record: dict, text: str) -> str:
    direct_field = _value_for(record, "game_variant", "game", "variant", "format")
    if direct_field:
        normalized_field = direct_field.strip().lower().replace("''", "'")
        exact = EXACT_GAME_NAMES.get(normalized_field)
        if exact:
            return exact
        direct = _match_game(normalized_field)
        if direct:
            return direct

    for key, value in record.items():
        if any(token in key.lower() for token in GAME_FIELD_KEYWORDS):
            direct = _match_game(str(value))
            if direct:
                return direct

    direct = _match_game(text)
    if direct:
        return direct
    return "Mixed / Unknown"


def _match_game(value: str) -> str | None:
    for pattern, name in GAME_PATTERNS:
        if pattern.search(value):
            return name
    return None


def _detect_tournament(record: dict, source_name: str) -> str:
    tournament_id = _value_for(record, "tournament_id")
    source_file = _value_for(record, "source_file")
    if tournament_id and source_file:
        return f"{source_file} / T{tournament_id}"

    for key, value in record.items():
        if any(token in key.lower() for token in TOURNAMENT_FIELD_KEYWORDS) and str(value).strip():
            return str(value).strip()
    return Path(source_name).name


def _detect_results(record: dict, text: str) -> tuple[int, int]:
    result_type = (_value_for(record, "result_type") or "").strip().lower()
    hero_result = (_value_for(record, "hero_result") or "").strip()
    wins = 0
    losses = 0

    if result_type == "won":
        wins += 1
    elif result_type == "lost at showdown":
        losses += 1
    elif result_type == "other" and re.search(r"\bescondeu\b", hero_result, re.IGNORECASE):
        pass
    else:
        wins += len(WIN_PATTERN.findall(text))
        losses += len(LOSS_PATTERN.findall(text))

    for key, value in record.items():
        lowered = key.lower()
        if lowered == "hero_result":
            continue
        if not any(token in lowered for token in RESULT_FIELD_KEYWORDS):
            continue
        numeric = _extract_number(str(value))
        if numeric is None:
            continue
        if any(token in lowered for token in ("profit", "net", "won", "loss", "score", "result")):
            if numeric > 0:
                wins += 1
            elif numeric < 0:
                losses += 1
        if any(token in lowered for token in ("finish", "place", "rank")):
            if numeric <= 3:
                wins += 1
            elif numeric >= 8:
                losses += 1

    place_match = PLACE_PATTERN.search(text)
    if place_match:
        place = int(place_match.group(1))
        if place <= 3:
            wins += 1
        elif place >= 8:
            losses += 1

    return wins, losses


def _extract_number(value: str) -> float | None:
    match = re.search(r"-?\d+(?:[.,]\d+)?", value)
    if not match:
        return None
    return float(match.group(0).replace(",", "."))


def _detect_fold(record: dict, text: str) -> int:
    result_type = (_value_for(record, "result_type") or "").strip().lower()
    hero_result = (_value_for(record, "hero_result") or "").strip().lower()
    if result_type == "folded":
        return 1
    if "desistiu" in hero_result or "fold" in hero_result:
        return 1
    return 1 if FOLD_PATTERN.search(text) else 0


def _detect_showdown(record: dict, text: str) -> int:
    result_type = (_value_for(record, "result_type") or "").strip().lower()
    street = (_value_for(record, "street_reached") or "").strip().lower()
    hero_result = (_value_for(record, "hero_result") or "").strip().lower()
    if result_type == "folded":
        return 1 if "mostrou" in hero_result or "escondeu" in hero_result else 0
    if result_type in {"won", "lost at showdown", "other"}:
        return 1
    if "showdown" in street:
        return 1
    if "mostrou" in hero_result or "escondeu" in hero_result:
        return 1
    return 1 if SHOWDOWN_PATTERN.search(text) else 0


def _detect_vpip(record: dict, text: str) -> int:
    raw_vpip = _value_for(record, "vpip_flag")
    if raw_vpip is not None:
        numeric = _extract_number(raw_vpip)
        if numeric is not None:
            return 1 if numeric > 0 else 0
    return 1 if AGGRESSIVE_PATTERN.search(text) or PASSIVE_PATTERN.search(text) else 0


def _detect_early_fold(record: dict, text: str, game: str, folds: int) -> int:
    if not folds:
        return 0

    street = (_value_for(record, "street_reached") or "").strip().lower()
    hero_result = (_value_for(record, "hero_result") or "").strip().lower()
    if any(token in street for token in EARLY_STREET_TOKENS):
        return 1
    if "antes flop" in hero_result or "antes o draw" in hero_result:
        return 1
    if game in {"Razz", "Seven Card Stud", "Stud Hi-Lo"} and "3o street" in _ascii_fold_text(hero_result):
        return 1
    return 0


def _detect_late_street(record: dict, text: str, showdowns: int) -> int:
    result_type = (_value_for(record, "result_type") or "").strip().lower()
    street = (_value_for(record, "street_reached") or "").strip().lower()
    hero_result = (_value_for(record, "hero_result") or "").strip().lower()
    ascii_result = _ascii_fold_text(hero_result)

    if result_type == "folded":
        if any(token in ascii_result for token in ("turn", "river", "5o street", "6o street", "7o street")):
            return 1
        return 0

    if showdowns:
        return 1

    if any(token in street for token in LATE_STREET_TOKENS):
        return 1
    if any(token in ascii_result for token in ("turn", "river", "5o street", "6o street", "7o street")):
        return 1
    return 0


def _ascii_fold_text(value: str) -> str:
    return (
        value.replace("º", "o")
        .replace("ó", "o")
        .replace("ô", "o")
        .replace("á", "a")
        .replace("é", "e")
        .replace("í", "i")
        .replace("ú", "u")
        .replace("ã", "a")
        .replace("ç", "c")
    )


def _collect_evidence(record: dict, text: str) -> list[str]:
    hero_result = (_value_for(record, "hero_result") or "").strip()
    if hero_result:
        compact_result = re.sub(r"\s+", " ", hero_result).strip()
        if compact_result:
            if len(compact_result) <= 140:
                return [compact_result]
            return [compact_result[:137].rstrip() + "..."]

    compact = re.sub(r"\s+", " ", text).strip()
    if not compact:
        return []
    if len(compact) <= 140:
        return [compact]
    return [compact[:137].rstrip() + "..."]


def _parse_event_time(record: dict) -> datetime | None:
    raw_value = _value_for(record, "date/time_brt", "datetime_brt", "date", "timestamp")
    return _parse_datetime_value(raw_value)


def _parse_datetime_value(raw_value: str | None) -> datetime | None:
    if not raw_value:
        return None

    for fmt in ("%Y/%m/%d %H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y/%m/%d %H:%M", "%Y-%m-%d %H:%M"):
        try:
            return datetime.strptime(raw_value.strip(), fmt)
        except ValueError:
            continue
    return None


def _aggregate_modalities(target_records: list[RecordSignal]) -> list[dict]:
    grouped: dict[str, list[RecordSignal]] = defaultdict(list)
    for signal in target_records:
        grouped[signal.game].append(signal)

    profiles: list[dict] = []
    for game_name, records in sorted(grouped.items(), key=lambda item: len(item[1]), reverse=True):
        sample = len(records)
        aggressive = sum(item.aggressive_actions for item in records)
        passive = sum(item.passive_actions for item in records)
        showdowns = sum(item.showdowns for item in records)
        wins = sum(item.wins for item in records)
        losses = sum(item.losses for item in records)
        bubbles = sum(item.bubbles for item in records)
        vpip = sum(item.vpip for item in records)
        early_folds = sum(item.early_folds for item in records)
        late_reaches = sum(item.late_street_reaches for item in records)
        opponents = Counter(opponent for item in records for opponent in item.opponents)

        vpip_rate = _ratio(vpip, sample)
        win_rate = _ratio(wins, sample)
        showdown_rate = _ratio(showdowns, sample)
        early_fold_rate = _ratio(early_folds, sample)
        late_rate = _ratio(late_reaches, sample)

        strengths: list[str] = []
        risks: list[str] = []
        adjustments: list[str] = []

        if vpip_rate >= 0.34:
            strengths.append("Entra em volume saudavel de potes nessa modalidade, sem ficar excessivamente nit.")
        elif vpip_rate <= 0.16:
            risks.append("Participa pouco das maos e pode deixar edge na mesa nessa modalidade.")

        if win_rate >= 0.24:
            strengths.append("Converte uma fatia relevante das maos em resultado positivo.")
        elif wins + losses >= 4 and wins < losses:
            risks.append("Os desfechos resolvidos estao mais negativos do que positivos nessa modalidade.")

        if showdown_rate >= 0.38 and win_rate >= 0.22:
            strengths.append("Quando a mao vai longe, a conversao ainda se sustenta em bom nivel.")
        elif showdown_rate >= 0.38 and win_rate < 0.18:
            risks.append("Chega a muitas decisoes longas sem transformar isso em resultado suficiente.")

        if early_fold_rate >= 0.5:
            risks.append("Abandona cedo demais em parte relevante das maos desse jogo.")
            adjustments.append("Revisar spots de defesa inicial para nao overfoldar antes de realizar equidade.")

        if late_rate >= 0.42 and win_rate < 0.2:
            adjustments.append("Refinar selecao de bluff-catch e thin calls nas streets finais.")

        if bubbles:
            risks.append("Ha sinais de sensibilidade a bolha ou ICM nas amostras enviadas.")
            adjustments.append("Separar spots de sobrevivencia dos spots de edge real na bolha.")

        if aggressive >= passive + 3:
            strengths.append("Os registros textuais sugerem inclinacao a tomar a frente da acao.")
        elif passive > aggressive + 2:
            risks.append("As linhas registradas parecem mais reativas do que proativas.")

        if not adjustments:
            adjustments.append("Seguir refinando sizings e selecao de spots com base no field mais frequente desse jogo.")

        evidence = _unique_limited(item for record in records for item in record.evidence)
        style = _modality_style_label(
            vpip_rate=vpip_rate,
            win_rate=win_rate,
            showdown_rate=showdown_rate,
            early_fold_rate=early_fold_rate,
        )

        profiles.append(
            {
                "name": game_name,
                "sample_size": sample,
                "confidence": _confidence_label(sample),
                "style": style,
                "vpip_rate": vpip_rate,
                "win_rate": win_rate,
                "showdown_rate": showdown_rate,
                "early_fold_rate": early_fold_rate,
                "strengths": strengths[:3] or ["Amostra neutra, sem edge gritante nem leak gritante."],
                "risks": risks[:3] or ["Nao apareceu fragilidade dominante nessa amostra da modalidade."],
                "adjustments": adjustments[:3],
                "opponents": [_display_name(name) for name, _ in opponents.most_common(4)],
                "evidence": evidence[:3],
            }
        )

    return profiles


def _aggregate_opponents(
    target_records: list[RecordSignal],
    target_norm: str,
    supplemental_opponents: dict[str, SupplementalOpponentSummary],
) -> list[dict]:
    grouped: dict[str, list[RecordSignal]] = defaultdict(list)
    for signal in target_records:
        for opponent in signal.opponents:
            if opponent == target_norm:
                continue
            grouped[opponent].append(signal)

    profiles: list[dict] = []
    all_opponents = set(grouped) | set(supplemental_opponents)
    for opponent in sorted(
        all_opponents,
        key=lambda name: max(len(grouped.get(name, [])), supplemental_opponents.get(name).hands_with_hero if name in supplemental_opponents else 0),
        reverse=True,
    ):
        records = grouped.get(opponent, [])
        supplemental = supplemental_opponents.get(opponent)
        sample = len(records)
        wins = sum(item.wins for item in records)
        losses = sum(item.losses for item in records)
        vpip = sum(item.vpip for item in records)
        showdowns = sum(item.showdowns for item in records)
        early_folds = sum(item.early_folds for item in records)
        games = Counter(item.game for item in records)
        if supplemental is not None:
            for item in supplemental.variant_mix:
                variant_name = item.split(":", 1)[0].strip()
                if variant_name:
                    games[variant_name] += 1

        vpip_rate = _ratio(vpip, sample)
        win_rate = _ratio(wins, sample)
        showdown_rate = _ratio(showdowns, sample)
        early_fold_rate = _ratio(early_folds, sample)
        hands_with_hero = supplemental.hands_with_hero if supplemental is not None else sample
        tournaments_with_hero = supplemental.tournaments_with_hero if supplemental is not None else len(
            {item.tournament for item in records if item.tournament}
        )
        most_seen_variant = (
            supplemental.most_seen_variant
            if supplemental is not None and supplemental.most_seen_variant
            else (games.most_common(1)[0][0] if games else "Mixed / Unknown")
        )
        variant_mix = supplemental.variant_mix if supplemental is not None else [f"{name}: {count}" for name, count in games.most_common(6)]
        threats: list[str] = []
        opportunities: list[str] = []

        if early_fold_rate >= 0.45:
            threats.append("Nas maos em que esse nome aparece, a biawhite larga cedo com frequencia acima do ideal.")
        if showdown_rate >= 0.42 and win_rate < 0.2:
            threats.append("Os confrontos com esse pool costumam ir longe sem conversao suficiente da biawhite.")
        if losses > wins and wins + losses >= 4:
            threats.append("O saldo resolvido contra esse recorte de mesa nao esta favoravel.")

        if win_rate >= 0.24:
            opportunities.append("A amostra e lucrativa quando esse adversario aparece no field da mao.")
        if showdown_rate <= 0.26 and vpip_rate >= 0.26:
            opportunities.append("Existe espaco para capturar potes sem showdown nessa dinamica de mesa.")
        if early_fold_rate <= 0.22 and vpip_rate >= 0.28:
            opportunities.append("A biawhite segue disputando maos sem se retrair demais quando esse nome esta presente.")

        if not threats:
            threats.append("A dinamica contra esse adversario parece relativamente neutra na amostra atual.")
        if not opportunities:
            opportunities.append("Continuar coletando maos para separar melhor pressao real de variancia de curto prazo.")
        if hands_with_hero >= 80:
            threats.append("Reg recorrente no dataset; provavelmente ja viu bastante das rotacoes da biawhite.")
        if most_seen_variant and most_seen_variant != "Mixed / Unknown":
            opportunities.append(f"Priorizar estudo de {most_seen_variant}, onde esse nome mais se repete.")

        read = _opponent_read(
            vpip_rate=vpip_rate,
            win_rate=win_rate,
            showdown_rate=showdown_rate,
            early_fold_rate=early_fold_rate,
            sample=sample,
            hands_with_hero=hands_with_hero,
            tournaments_with_hero=tournaments_with_hero,
            most_seen_variant=most_seen_variant,
        )
        evidence = _unique_limited(item for record in records for item in record.evidence)
        if supplemental is not None:
            evidence = _unique_limited(
                [
                    f"{supplemental.hands_with_hero} maos com hero em {supplemental.tournaments_with_hero} torneios.",
                    f"Most seen variant: {most_seen_variant}.",
                    *variant_mix,
                    *evidence,
                ]
            )

        profiles.append(
            {
                "name": supplemental.display_name if supplemental is not None else _display_name(opponent),
                "sample_size": sample,
                "hands_with_hero": hands_with_hero,
                "tournaments_with_hero": tournaments_with_hero,
                "most_seen_variant": most_seen_variant,
                "variant_mix": variant_mix,
                "games": [name for name, _ in games.most_common(4)],
                "read": read,
                "vpip_rate": vpip_rate,
                "win_rate": win_rate,
                "showdown_rate": showdown_rate,
                "threats": threats[:3],
                "opportunities": opportunities[:3],
                "evidence": evidence[:3],
            }
        )

    return profiles


def _build_player_profile(target_player: str, target_records: list[RecordSignal], modalities: list[dict]) -> dict:
    sample = len(target_records)
    aggressive = sum(item.aggressive_actions for item in target_records)
    passive = sum(item.passive_actions for item in target_records)
    showdowns = sum(item.showdowns for item in target_records)
    wins = sum(item.wins for item in target_records)
    losses = sum(item.losses for item in target_records)
    vpip = sum(item.vpip for item in target_records)
    early_folds = sum(item.early_folds for item in target_records)

    vpip_rate = _ratio(vpip, sample)
    win_rate = _ratio(wins, sample)
    showdown_rate = _ratio(showdowns, sample)
    early_fold_rate = _ratio(early_folds, sample)

    strengths: list[str] = []
    leaks: list[str] = []
    adjustments: list[str] = []

    if vpip_rate >= 0.3:
        strengths.append("Participa de volume saudavel de maos para um field mixed, sem ficar excessivamente travada.")
    else:
        leaks.append("A amostra mostra volume de entrada abaixo do ideal em varias modalidades.")

    if win_rate >= 0.22:
        strengths.append("Transforma um percentual consistente das maos em resultado positivo.")
    else:
        leaks.append("A conversao geral da amostra ainda fica aquem do desejado.")

    if showdown_rate <= 0.28 and win_rate >= 0.18:
        strengths.append("Consegue encerrar parte dos pots sem depender demais de showdown.")
    elif showdown_rate >= 0.38 and win_rate < 0.2:
        leaks.append("Vai longe demais em parte das maos sem a conversao correspondente.")

    if early_fold_rate >= 0.42:
        leaks.append("Ha sinais de excesso de folds cedo demais, especialmente antes de realizar equidade.")
        adjustments.append("Revisar os folds iniciais por modalidade e separar spots de disciplina de spots de overfold.")

    if aggressive >= passive + 4:
        strengths.append("Os registros textuais apontam inclinacao a assumir a iniciativa quando a linha permite.")
    elif passive > aggressive + 3:
        leaks.append("As linhas descritas parecem mais reativas do que proativas em varios spots.")

    if not adjustments:
        adjustments.append("Usar o recorte por modalidade para calibrar ranges de entrada e insistencia nas streets finais.")
    adjustments.append("Cruzar o VPIP por jogo com os oponentes mais frequentes para escolher exploits mais objetivos.")

    dominant_modalities = [item["name"] for item in modalities[:4]]
    overview = (
        f"{target_player} aparece como um perfil {_player_style_label(vpip_rate, win_rate, showdown_rate, early_fold_rate).lower()}, "
        f"com {sample} registros uteis distribuidos em {len(modalities)} modalidades."
    )

    return {
        "player_name": target_player,
        "overview": overview,
        "sample_size": sample,
        "primary_style": _player_style_label(vpip_rate, win_rate, showdown_rate, early_fold_rate),
        "vpip_rate": vpip_rate,
        "win_rate": win_rate,
        "showdown_rate": showdown_rate,
        "strengths": strengths[:4],
        "leaks": leaks[:4] or ["Amostra ainda pequena para cravar leak estrutural unico."],
        "adjustments": adjustments[:4],
        "dominant_modalities": dominant_modalities,
        "evidence": _unique_limited(item for record in target_records for item in record.evidence)[:4],
    }


def _aggregate_tournaments(supplemental_tournaments: dict[str, SupplementalTournamentSummary]) -> list[dict]:
    summaries = sorted(
        supplemental_tournaments.values(),
        key=lambda item: (
            item.hands,
            item.last_hand_brt or datetime.min,
            item.first_hand_brt or datetime.min,
        ),
        reverse=True,
    )

    tournaments: list[dict] = []
    for item in summaries:
        first_label = item.first_hand_brt.strftime("%d/%m/%Y %H:%M") if item.first_hand_brt else ""
        last_label = item.last_hand_brt.strftime("%d/%m/%Y %H:%M") if item.last_hand_brt else ""
        if first_label and last_label:
            window_label = f"{first_label} - {last_label}"
        else:
            window_label = first_label or last_label or "Janela nao informada"

        tournaments.append(
            {
                "tournament_id": item.tournament_id,
                "file_date": item.file_date,
                "buy_in_text": item.buy_in_text,
                "hands": item.hands,
                "unique_opponents": item.unique_opponents,
                "variants_played": item.variants_played[:8],
                "first_hand_brt": first_label,
                "last_hand_brt": last_label,
                "source_file": item.source_file,
                "window_label": window_label,
            }
        )

    return tournaments


def _modality_style_label(vpip_rate: float, win_rate: float, showdown_rate: float, early_fold_rate: float) -> str:
    if vpip_rate >= 0.34 and win_rate >= 0.24:
        return "Participa e converte"
    if early_fold_rate >= 0.5:
        return "Seletiva demais na entrada"
    if showdown_rate >= 0.4 and win_rate < 0.18:
        return "Vai longe, mas converte pouco"
    if vpip_rate <= 0.16:
        return "Nit ou pouco ativa"
    return "Equilibrada com leitura em desenvolvimento"


def _player_style_label(vpip_rate: float, win_rate: float, showdown_rate: float, early_fold_rate: float) -> str:
    if vpip_rate >= 0.3 and win_rate >= 0.22:
        return "Ativa com boa conversao"
    if early_fold_rate >= 0.42:
        return "Cautelosa antes de realizar equidade"
    if showdown_rate >= 0.38 and win_rate < 0.2:
        return "Curiosa ate o showdown"
    return "Balanceada com ajustes por modalidade"


def _opponent_read(
    vpip_rate: float,
    win_rate: float,
    showdown_rate: float,
    early_fold_rate: float,
    sample: int,
    hands_with_hero: int,
    tournaments_with_hero: int,
    most_seen_variant: str,
) -> str:
    if sample < 4:
        if hands_with_hero >= 20:
            return (
                f"Contexto forte de recorrencia: {hands_with_hero} maos com a biawhite em "
                f"{tournaments_with_hero} torneios, com maior incidencia em {most_seen_variant}."
            )
        return "Amostra curta: por enquanto este nome vale mais como contexto de mesa do que como read fechado."
    if win_rate >= 0.25 and showdown_rate >= 0.25:
        return "A dinamica contra esse nome e saudavel: a biawhite participa e ainda converte bem."
    if early_fold_rate >= 0.45:
        return "Esse nome aparece em spots em que a biawhite recua cedo; vale revisar se ha respeito excessivo."
    if showdown_rate >= 0.42 and win_rate < 0.2:
        return "Os pots contra esse recorte de mesa costumam ir fundo e gerar mais atrito do que lucro."
    return "Dinamica relativamente neutra, mas ja com base para explorar por modalidade."


def _confidence_label(sample_size: int) -> str:
    if sample_size >= 18:
        return "alta"
    if sample_size >= 8:
        return "media"
    return "baixa"


def _display_name(name: str) -> str:
    if not name:
        return name
    return name[0].upper() + name[1:]


def _unique_limited(values: Iterable[str], limit: int = 8) -> list[str]:
    ordered: list[str] = []
    seen: set[str] = set()
    for value in values:
        if not value or value in seen:
            continue
        ordered.append(value)
        seen.add(value)
        if len(ordered) >= limit:
            break
    return ordered


def _build_source_notes(
    target_records: list[RecordSignal],
    structured_file_count: int,
    supplemental_file_count: int,
    supplemental_opponents: dict[str, SupplementalOpponentSummary],
    supplemental_tournament_file_count: int,
    supplemental_tournaments: dict[str, SupplementalTournamentSummary],
) -> list[str]:
    tournaments = Counter(record.tournament for record in target_records)
    notes = [
        f"{len(target_records)} registros do alvo foram consolidados para montar os perfis.",
    ]
    if tournaments:
        top_name, top_count = tournaments.most_common(1)[0]
        notes.append(f"O torneio/arquivo com maior peso foi {top_name} ({top_count} registros).")

    if structured_file_count:
        notes.append(
            f"{structured_file_count} arquivo(s) usaram schema estruturado com game_variant, vpip_flag e players_list."
        )
    if supplemental_file_count:
        notes.append(
            f"{supplemental_file_count} arquivo(s) agregados de oponentes enriqueceram maos com hero, torneios e variant mix."
        )
    if supplemental_opponents:
        top_opponent = max(supplemental_opponents.values(), key=lambda item: item.hands_with_hero)
        notes.append(
            f"O adversario mais recorrente no agregado foi {top_opponent.display_name} "
            f"({top_opponent.hands_with_hero} maos com hero)."
        )
    if supplemental_tournament_file_count:
        notes.append(
            f"{supplemental_tournament_file_count} arquivo(s) agregados de torneio enriqueceram buy-in, volume e janela temporal."
        )
    if supplemental_tournaments:
        total_hands = sum(item.hands for item in supplemental_tournaments.values())
        notes.append(
            f"O agregado de torneios cobre {len(supplemental_tournaments)} torneios e {total_hands} maos resumidas."
        )

    date_values = sorted(record.event_time for record in target_records if record.event_time is not None)
    if date_values:
        notes.append(
            "Janela temporal analisada: "
            f"{date_values[0].strftime('%d/%m/%Y %H:%M')} ate {date_values[-1].strftime('%d/%m/%Y %H:%M')}."
        )

    if any(record.game == "Mixed / Unknown" for record in target_records):
        notes.append("Parte da amostra nao trazia modalidade explicita e ficou marcada como Mixed / Unknown.")
    avg_players = _average_players_per_hand(target_records)
    if avg_players is not None:
        notes.append(f"Media de jogadores por mao nas linhas do alvo: {avg_players:.1f}.")
    return notes


def _average_players_per_hand(target_records: list[RecordSignal]) -> float | None:
    sizes = [len(record.players) for record in target_records if record.players]
    if not sizes:
        return None
    return sum(sizes) / len(sizes)


def _value_for(record: dict, *keys: str) -> str | None:
    lowered = {key.lower(): value for key, value in record.items()}
    for key in keys:
        value = lowered.get(key.lower())
        if value is not None and str(value).strip():
            return str(value).strip()
    return None


def _ratio(numerator: int, denominator: int) -> float:
    if denominator <= 0:
        return 0.0
    return round(numerator / denominator, 4)


def _ascii_fold_text(value: str) -> str:
    translation = str.maketrans(
        {
            "º": "o",
            "ó": "o",
            "ô": "o",
            "á": "a",
            "é": "e",
            "í": "i",
            "ú": "u",
            "ã": "a",
            "ç": "c",
        }
    )
    return value.translate(translation)


def _to_text(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=True)
    return str(value)


def _ascii_fold_text(value: str) -> str:
    normalized = value.lower().replace(chr(186), "o")
    return re.sub(r"[^a-z0-9 ]+", "", normalized)
