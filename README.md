# Atlas de Negocios no Android

Este pacote serve para transformar o dashboard HTML em APK usando Capacitor + Android Studio.

## O que tem aqui

- `capacitor.config.json`: configuracao basica do app Android
- `sync-dashboard.ps1`: copia o HTML principal para `www/index.html`
- `package.json`: atalhos para sincronizar e abrir o projeto Android

## Antes de comecar

Voce vai precisar de:

1. Node.js LTS instalado
2. Android Studio instalado com Android SDK
3. Java/JDK configurado pelo proprio Android Studio

## Passo a passo

Abra o terminal dentro desta pasta:

`C:\Users\luiza\OneDrive\Documentos\New project\atlas-negocios-android`

### 1. Sincronizar o HTML

```powershell
powershell -ExecutionPolicy Bypass -File .\sync-dashboard.ps1
```

Isso copia o arquivo principal para:

`www/index.html`

### 2. Instalar o Capacitor

```powershell
npm install @capacitor/cli @capacitor/core @capacitor/android
```

### 3. Criar a pasta nativa Android

```powershell
npx cap add android
```

### 4. Sempre que atualizar o dashboard, sincronize de novo

```powershell
npm run android:sync
```

### 5. Abrir no Android Studio

```powershell
npm run android:open
```

## Como gerar o APK

### APK de teste (debug)

No Android Studio:

1. Espere o Gradle terminar de sincronizar
2. Va em `Build`
3. Clique em `Build Bundle(s) / APK(s)`
4. Clique em `Build APK(s)`

O APK de teste costuma sair em:

`android\app\build\outputs\apk\debug\app-debug.apk`

### APK para enviar/publicar (release)

No Android Studio:

1. Va em `Build`
2. Clique em `Generate Signed Bundle / APK`
3. Escolha `APK`
4. Crie ou selecione sua keystore
5. Gere o build `release`

O APK release costuma sair em:

`android\app\build\outputs\apk\release\app-release.apk`

## Fluxo recomendado

Quando mexer no dashboard:

1. Edite `dashboard-negocios.html` na raiz
2. Rode `npm run android:sync`
3. Abra ou atualize o projeto no Android Studio
4. Gere o APK

## Dica

Se quiser trocar nome, icone ou identificador do app:

- nome do app: `capacitor.config.json`
- identificador: `appId` em `capacitor.config.json`
- icones e splash: depois que o Android estiver criado, isso pode ser feito no projeto `android`
