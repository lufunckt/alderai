# Poker Study Backend

FastAPI backend para scouting de 8-game. Agora o projeto aceita arquivos de torneio e gera:

- perfil da `biawhite` por modalidade;
- leitura consolidada de leaks e ajustes;
- perfil individual dos oponentes detectados nos arquivos;
- demo pronta em `/analysis/demo` para o painel subir mesmo antes dos dados finais.

## Setup

1. Create a virtual environment: `python -m venv .venv`
2. Activate it: 
   - Windows PowerShell: `.\.venv\Scripts\Activate.ps1`
   - POSIX shells: `source .venv/bin/activate`
3. Install dependencies: `pip install -r requirements.txt`

> **Note for Windows + Python 3.13:** `pydantic` requires `pydantic-core`, which currently builds from source on Python 3.13. If the install step fails mentioning `cargo` or Rust, run [https://rustup.rs](https://rustup.rs) to install Rust (accept the default toolchain) and reopen your terminal before retrying `pip install`. Switching to Python 3.12 also works because `pydantic-core` already provides prebuilt wheels there.

## Run

Start the dev server with reload:

```
uvicorn backend.app:app --reload
```

This listens on `http://127.0.0.1:8000`.

Principais rotas:

- `GET /analysis/demo`
- `POST /analysis/run`
- `GET /players`
- `POST /notes`
- `POST /spots`
