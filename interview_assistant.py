"""Interview response assistant with AI mode and local fallback."""

from __future__ import annotations

import json
import re
import unicodedata

try:
    import httpx
except ModuleNotFoundError:  # pragma: no cover - optional when fallback mode is enough.
    httpx = None

from backend.core.config import settings
from backend.schemas.interview import InterviewContext, InterviewReplyRequest, InterviewReplyResponse


INTENT_KEYWORDS: list[tuple[str, tuple[str, ...]]] = [
    ("intro", ("parlami di te", "parlarmi di te", "presentati", "presentarti", "chi sei", "raccontami di te", "mi racconti di te")),
    ("motivation", ("perche vuoi", "ti interessa", "questa posizione", "questa opportunita", "perche agentify", "cosa ti attrae")),
    ("sales", ("vendita", "sales", "telesales", "chiudere", "obiezioni", "obiezione", "kpi", "target")),
    ("strengths", ("punto di forza", "punti di forza", "pregio", "pregi", "forte")),
    ("weakness", ("debolezza", "difetto", "migliorare", "miglioramento", "limite")),
    ("availability", ("disponibilita", "quando puoi iniziare", "iniziare", "orario", "full time")),
    ("salary", ("stipendio", "ral", "retribuzione", "compenso", "salario")),
    ("language", ("italiano", "lingua", "parli italiano", "livello di italiano")),
    ("challenge", ("sfida", "difficolta", "problema", "cliente difficile", "pressione")),
]


def generate_interview_reply(payload: InterviewReplyRequest) -> InterviewReplyResponse:
    cleaned_transcript = _clean_text(payload.transcript)
    if len(cleaned_transcript) < 2:
        raise ValueError("A pergunta precisa ter pelo menos dois caracteres.")

    detected_intent = _detect_intent(cleaned_transcript)

    if settings.openai_api_key:
        try:
            return _generate_with_openai(
                cleaned_transcript=cleaned_transcript,
                detected_intent=detected_intent,
                payload=payload,
            )
        except Exception:
            # If the live call fails we still return a readable answer instead of blocking the flow.
            pass

    return _generate_fallback(
        cleaned_transcript=cleaned_transcript,
        detected_intent=detected_intent,
        context=payload.context,
    )


def _generate_with_openai(
    *,
    cleaned_transcript: str,
    detected_intent: str,
    payload: InterviewReplyRequest,
) -> InterviewReplyResponse:
    if httpx is None:
        raise RuntimeError("httpx nao esta instalado para chamadas de IA ao vivo.")

    messages = [
        {"role": "system", "content": _system_prompt(payload.context)},
        {
            "role": "user",
            "content": _user_prompt(
                cleaned_transcript=cleaned_transcript,
                detected_intent=detected_intent,
                payload=payload,
            ),
        },
    ]
    response = httpx.post(
        f"{settings.openai_api_base.rstrip('/')}/chat/completions",
        headers={
            "Authorization": f"Bearer {settings.openai_api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": settings.openai_model,
            "messages": messages,
            "temperature": 0.45,
            "response_format": {"type": "json_object"},
        },
        timeout=40.0,
    )
    response.raise_for_status()
    payload_json = response.json()
    content = payload_json["choices"][0]["message"]["content"]
    parsed = _parse_json_response(content)

    answer_it = _clean_text(parsed.get("answer_it") or "")
    answer_pt = _clean_text(parsed.get("answer_pt") or "")
    coaching_tip = _clean_text(parsed.get("coaching_tip") or "")

    if not answer_it or not answer_pt or not coaching_tip:
        raise ValueError("A resposta da IA veio incompleta.")

    return InterviewReplyResponse(
        mode="ai",
        detected_intent=detected_intent,
        cleaned_transcript=cleaned_transcript,
        answer_it=answer_it,
        answer_pt=answer_pt,
        coaching_tip=coaching_tip,
    )


def _generate_fallback(
    *,
    cleaned_transcript: str,
    detected_intent: str,
    context: InterviewContext,
) -> InterviewReplyResponse:
    job_line = _first_sentence(context.job_context) or context.job_context
    job_focus = _strip_terminal_punctuation(job_line).lower()
    strengths = ", ".join(item.strip() for item in context.strengths[:3] if item.strip()) or "ascolto, organizzazione e follow-up"
    company_name = context.company_name.strip() or "la vostra azienda"

    templates = {
        "intro": (
            (
                f"Certo. Sono Luiza e ho costruito il mio percorso soprattutto nel contatto diretto con le persone, "
                f"tra customer success, supporto operativo e contesti vicini al settore salute. "
                f"Questo mi ha dato una base forte in {strengths}. "
                f"Oggi mi sento molto a mio agio in un ruolo come {context.role_title}, perche unisco relazione, "
                f"organizzazione e orientamento al risultato."
            ),
            (
                "Claro. Sou a Luiza e construi meu caminho principalmente no contato direto com pessoas, "
                "entre customer success, suporte operacional e contextos proximos da area de saude. "
                f"Isso me deu uma base forte em {strengths}. Hoje me sinto muito a vontade em um papel como {context.role_title}, "
                "porque junto relacionamento, organizacao e foco em resultado."
            ),
            "Use como apresentacao curta: ritmo calmo, sorriso no inicio e pausa antes da ultima frase.",
        ),
        "motivation": (
            (
                f"Questa opportunita mi interessa perche vedo un buon incontro tra il mio profilo e il tipo di lavoro che fate in {company_name}. "
                f"Mi piace l'idea di una vendita consultiva, con ascolto vero del cliente, follow-up e responsabilita sui risultati. "
                f"In piu il contesto di {job_focus} mi motiva molto, perche riesco a portare empatia e disciplina commerciale insieme."
            ),
            (
                f"Essa oportunidade me interessa porque vejo um bom encontro entre meu perfil e o tipo de trabalho que voces fazem na {company_name}. "
                "Gosto da ideia de uma venda consultiva, com escuta real do cliente, follow-up e responsabilidade pelos resultados. "
                f"Alem disso, o contexto de {job_focus} me motiva bastante, porque consigo levar empatia e disciplina comercial ao mesmo tempo."
            ),
            "Fale como uma escolha consciente de carreira, nao como resposta decorada.",
        ),
        "sales": (
            (
                f"Nel lavoro commerciale, per me il punto centrale e capire bene il bisogno prima di proporre una soluzione. "
                f"Di solito parto con domande semplici, ascolto le obiezioni senza fretta e poi collego il beneficio giusto al profilo del cliente. "
                f"Le mie basi piu forti sono {strengths}, quindi riesco a mantenere un follow-up costante e a lavorare con KPI senza perdere qualita nella conversazione."
            ),
            (
                "No trabalho comercial, para mim o ponto central e entender bem a necessidade antes de propor uma solucao. "
                "Normalmente eu comeco com perguntas simples, escuto as objecoes sem pressa e depois conecto o beneficio certo ao perfil do cliente. "
                f"Minhas bases mais fortes sao {strengths}, entao consigo manter follow-up constante e trabalhar com KPI sem perder qualidade na conversa."
            ),
            "Entregue com energia um pouco mais alta para soar segura em vendas e atendimento.",
        ),
        "strengths": (
            (
                f"Direi che i miei punti di forza principali sono {strengths}. "
                f"Mi aiutano sia nella relazione con il cliente sia nell'organizzazione della giornata, soprattutto quando ci sono priorita diverse, follow-up e obiettivi da rispettare. "
                f"Mi riconosco molto in un modo di lavorare stabile, chiaro e responsabile."
            ),
            (
                f"Eu diria que meus principais pontos fortes sao {strengths}. "
                "Isso me ajuda tanto na relacao com o cliente quanto na organizacao do dia, principalmente quando existem prioridades diferentes, follow-ups e metas para cumprir. "
                "Eu me reconheco muito em uma forma de trabalhar estavel, clara e responsavel."
            ),
            "Use enumeracao natural com os dedos ou pequenas pausas para facilitar a leitura.",
        ),
        "weakness": (
            (
                "Un punto che ho dovuto migliorare e la tendenza a voler curare molti dettagli allo stesso tempo. "
                "Con l'esperienza ho imparato a dare priorita, a separare cio che e urgente da cio che puo essere rifinito dopo e a proteggere il ritmo del lavoro. "
                "Quindi oggi lo vedo piu come un aspetto gestito che come un vero limite."
            ),
            (
                "Um ponto que precisei melhorar foi a tendencia de querer cuidar de muitos detalhes ao mesmo tempo. "
                "Com a experiencia aprendi a priorizar, a separar o que e urgente do que pode ser refinado depois e a proteger o ritmo do trabalho. "
                "Entao hoje vejo isso mais como algo administrado do que como um limite real."
            ),
            "Fale com honestidade e termine mostrando aprendizado, nao so a fraqueza.",
        ),
        "availability": (
            (
                "Per quanto riguarda la disponibilita, sono aperta a iniziare in tempi rapidi e ad adattarmi bene a una routine remota con obiettivi chiari. "
                "Per me conta molto avere processo, priorita e comunicazione trasparente, quindi entro bene quando il ruolo ha ritmo e responsabilita."
            ),
            (
                "Sobre disponibilidade, estou aberta a comecar em pouco tempo e me adaptar bem a uma rotina remota com objetivos claros. "
                "Para mim conta muito ter processo, prioridades e comunicacao transparente, entao entro bem quando o papel tem ritmo e responsabilidade."
            ),
            "Soe objetiva aqui; respostas longas nessa pergunta tiram impacto.",
        ),
        "salary": (
            (
                "Sul tema economico, per me e importante trovare un allineamento corretto tra responsabilita, obiettivi e struttura del ruolo. "
                "Sono aperta a capire meglio la vostra proposta complessiva e a parlarne con flessibilita, mantenendo il focus sul valore che posso portare."
            ),
            (
                "Sobre a parte financeira, para mim e importante encontrar um alinhamento correto entre responsabilidades, objetivos e a estrutura da funcao. "
                "Estou aberta a entender melhor a proposta completa de voces e conversar com flexibilidade, mantendo o foco no valor que posso entregar."
            ),
            "Aqui vale voz calma e curta, sem se justificar demais.",
        ),
        "language": (
            (
                "Mi sento a mio agio a comunicare in italiano in modo pratico e naturale, soprattutto in conversazioni di lavoro dove conta ascoltare bene e rispondere con chiarezza. "
                "Continuo sempre a migliorare, ma oggi riesco a sostenere una conversazione professionale con sicurezza e attenzione ai dettagli."
            ),
            (
                "Eu me sinto a vontade para me comunicar em italiano de forma pratica e natural, principalmente em conversas de trabalho em que importa escutar bem e responder com clareza. "
                "Continuo sempre melhorando, mas hoje consigo sustentar uma conversa profissional com seguranca e atencao aos detalhes."
            ),
            "Responda sem pressa e com diccao mais lenta para passar seguranca no idioma.",
        ),
        "challenge": (
            (
                "Quando incontro una situazione difficile, la mia prima reazione e mantenere calma e ascolto. "
                "Cerco di capire cosa sta bloccando la persona, confermo che ho capito bene il punto e poi conduco la conversazione verso una soluzione concreta. "
                "Questo approccio mi aiuta a non entrare in difesa e a restare efficace anche sotto pressione."
            ),
            (
                "Quando encontro uma situacao dificil, minha primeira reacao e manter calma e escuta. "
                "Eu procuro entender o que esta travando a pessoa, confirmo que entendi bem o ponto e depois conduzo a conversa para uma solucao concreta. "
                "Esse jeito me ajuda a nao entrar na defensiva e a continuar eficaz mesmo sob pressao."
            ),
            "Se puder, enfatize a primeira frase e desacelere no exemplo de como voce age.",
        ),
        "default": (
            (
                f"Capisco. In generale risponderei cosi: porto un profilo molto orientato alla relazione con il cliente, "
                f"con esperienza in contesti dove ascolto, organizzazione e follow-up fanno davvero la differenza. "
                f"Per un ruolo come {context.role_title}, mi vedo bene perche unisco comunicazione chiara, senso di responsabilita e attenzione al risultato."
            ),
            (
                "Entendi. Em geral eu responderia assim: levo um perfil muito orientado ao relacionamento com o cliente, "
                "com experiencia em contextos em que escuta, organizacao e follow-up fazem diferenca de verdade. "
                f"Para um papel como {context.role_title}, eu me vejo bem porque junto comunicacao clara, senso de responsabilidade e atencao a resultado."
            ),
            "Leia como resposta-base e adapte a entonacao conforme a pergunta da recrutadora.",
        ),
    }

    answer_it, answer_pt, coaching_tip = templates.get(detected_intent, templates["default"])
    answer_it = _fit_answer_style(answer_it, detected_intent, context.answer_style)
    answer_pt = _fit_answer_style(answer_pt, detected_intent, context.answer_style)

    return InterviewReplyResponse(
        mode="fallback",
        detected_intent=detected_intent,
        cleaned_transcript=cleaned_transcript,
        answer_it=answer_it,
        answer_pt=answer_pt,
        coaching_tip=coaching_tip,
    )


def _system_prompt(context: InterviewContext) -> str:
    return (
        "You are an interview copilot for Luiza. "
        "You receive an Italian recruiter question and must write a first-person answer that Luiza can read out loud. "
        "Return JSON only with keys answer_it, answer_pt, coaching_tip. "
        "answer_it must be natural spoken Italian, truthful, concise, and aligned with the provided candidate context. "
        "answer_pt must be a faithful Portuguese translation of answer_it. "
        "coaching_tip must be one short sentence in Portuguese telling the user how to deliver the answer. "
        "Never invent employers, dates, KPIs, certifications, or fluency levels that are not in the prompt. "
        "Prefer consultative sales language, empathy, follow-up, remote discipline, and results orientation when relevant. "
        f"Tone requested: {context.tone}. "
        f"Answer style requested: {context.answer_style}."
    )


def _user_prompt(
    *,
    cleaned_transcript: str,
    detected_intent: str,
    payload: InterviewReplyRequest,
) -> str:
    context = payload.context
    history_lines = []
    for item in payload.history[-6:]:
        history_lines.append(f"Recruiter: {item.question_it}")
        history_lines.append(f"Luiza: {item.answer_it}")

    history_block = "\n".join(history_lines) if history_lines else "No prior turns."
    strengths = ", ".join(item.strip() for item in context.strengths if item.strip()) or "n/a"

    return (
        f"Detected intent: {detected_intent}\n"
        f"Recruiter question in Italian: {cleaned_transcript}\n\n"
        f"Company: {context.company_name}\n"
        f"Role: {context.role_title}\n"
        f"Job context:\n{context.job_context}\n\n"
        f"Candidate summary:\n{context.candidate_summary}\n\n"
        f"Strengths: {strengths}\n"
        f"Extra instructions: {context.extra_instructions or 'None'}\n\n"
        f"Conversation history:\n{history_block}\n"
    )


def _parse_json_response(raw_content: str) -> dict:
    content = raw_content.strip()
    if content.startswith("```"):
        content = re.sub(r"^```(?:json)?\s*|\s*```$", "", content, flags=re.IGNORECASE | re.DOTALL).strip()
    return json.loads(content)


def _detect_intent(transcript: str) -> str:
    normalized = _normalize_for_match(transcript)
    for intent, keywords in INTENT_KEYWORDS:
        if any(keyword in normalized for keyword in keywords):
            return intent
    return "default"


def _normalize_for_match(value: str) -> str:
    lowered = value.lower()
    collapsed = unicodedata.normalize("NFKD", lowered).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]+", " ", collapsed)).strip()


def _clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def _first_sentence(value: str) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    parts = re.split(r"(?<=[.!?])\s+|\n+", text, maxsplit=1)
    return parts[0].strip()


def _fit_answer_style(answer: str, intent: str, style: str) -> str:
    cleaned = _clean_text(answer)
    if style == "breve":
        sentences = re.split(r"(?<=[.!?])\s+", cleaned)
        return " ".join(sentences[:2]).strip()
    if style == "detalhada" and intent in {"intro", "motivation", "sales", "challenge"}:
        appendix = {
            "intro": " Credo che questa combinazione mi aiuti a creare fiducia velocemente e a rappresentare bene il valore della proposta.",
            "motivation": " Per questo vedo il ruolo non solo come una funzione commerciale, ma come un lavoro di relazione costruita bene nel tempo.",
            "sales": " Quando la conversazione e ben guidata, trovo che il cliente percepisca piu chiaramente fiducia e valore.",
            "challenge": " In questo modo riesco a proteggere sia la relazione sia l'obiettivo della conversazione.",
        }
        return f"{cleaned}{appendix[intent]}"
    return cleaned


def _strip_terminal_punctuation(value: str) -> str:
    return re.sub(r"[.!?]+$", "", value.strip())
