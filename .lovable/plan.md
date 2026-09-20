# Capa (poster) para vídeos MP4 — fim da tela cinza no Android

Objetivo: todo vídeo MP4 direto exibe uma imagem de capa imediatamente, em vez do placeholder cinza com play gigante do Android. Nada de YouTube é tocado.

## 1. Player compartilhado

`src/components/DirectVideoPlayer.tsx` hoje repassa `...props` para o `<video>`, então `poster` já chega ao elemento — mas vamos torná-lo explícito na tipagem e adicionar:

- `poster?: string | null` (converte `null` para `undefined`).
- `onPosterCaptured?: (blob: Blob) => void` — disparado só quando o vídeo é direto, **não** tem poster e o evento `loadeddata` acontece. Captura o frame atual num `<canvas>` e devolve um JPEG (~0.7 de qualidade, largura máx. 640px).
- O `<video>` usa `crossOrigin="anonymous"` quando `onPosterCaptured` está ativo, para o canvas não ser bloqueado. Se a captura falhar (canvas bloqueado, codec), falha em silêncio — o vídeo continua normal.

## 2. Captura no envio (3 pontos de upload)

Novo utilitário `src/lib/video-poster.ts`:
- `captureVideoPoster(file: File): Promise<Blob | null>` — cria um `<video>` temporário com `URL.createObjectURL`, busca ~1s (ou o meio, se for mais curto), desenha num canvas e devolve JPEG.
- `uploadPoster(bucket, path, blob)` — sobe e devolve a URL pública.

Aplicado em:

| Tela | Bucket | Coluna gravada |
|---|---|---|
| Nova Publicação da Comunidade (`src/pages/aluno/Comunidade.tsx`) | `comunidade_uploads` | `comunidade_posts.poster_url` |
| Upload de vlog (`src/components/admin/VlogsAdmin.tsx`) | `vlog_videos` | `vlog_posts.thumbnail_url` (só quando o coach não enviou capa própria) |
| Upload de exercício (`src/pages/site-admin/VideosTecnicos.tsx`) | `comunidade_uploads` | `referencia_exercicios.thumbnail_url` |

Se a captura falhar, o envio do vídeo continua normalmente, só sem capa.

## 3. Exibição

- `Comunidade.tsx`: incluir `poster_url` no select e no tipo do post; passar `poster={post.poster_url}` ao player.
- `VlogPlayerModal.tsx`: no ramo de vídeo direto, passar `poster={thumbnailUrl}` (prop que o modal já recebe). A lógica de YouTube fica intacta.
- `ExercisePlayer.tsx`: nova prop opcional `posterUrl`; repassada ao `DirectVideoPlayer`. `ExerciseCard.tsx` e `ExerciseVideoButton.tsx` passam a capa quando a conhecem.

## 4. Correção retroativa (sem job em lote)

Quando o player carrega um vídeo direto **sem** poster, ele captura o frame no `loadeddata` e chama `onPosterCaptured`. Cada tela trata isso:

- Comunidade: sobe em `comunidade_uploads/<user>/posters/` e faz update de `poster_url` do post.
- Vlog: sobe em `vlog_videos/<tenant>/posters/` e faz update de `thumbnail_url`.
- Exercício: sobe em `comunidade_uploads/...` e faz update de `thumbnail_url` na linha de `referencia_exercicios`.

Tudo silencioso: erro de upload ou de permissão apenas registra no console, nunca mostra alerta nem quebra a reprodução. Cada vídeo tenta uma única vez por sessão.

## Premissas e detalhes técnicos

- `comunidade_posts.poster_url`, `vlog_posts.thumbnail_url` e `referencia_exercicios.thumbnail_url` já existem — confirmado no banco. **Nenhuma migração nova é necessária.**
- No exercício, o `ExerciseCard` só conhece a URL do vídeo, não a linha da biblioteca. A gravação retroativa localiza a linha de `referencia_exercicios` pelo `url_video` igual ao vídeo tocado; se não achar nenhuma (ou se o aluno não tiver permissão de escrita), apenas não grava — a capa da sessão atual continua funcionando.
- A escrita retroativa respeita as regras de acesso existentes: o aluno consegue gravar a capa do próprio post; capas de exercícios e vlogs só serão gravadas por quem já tem permissão de edição. Se isso ficar restritivo demais na prática, o passo seguinte seria uma função de servidor dedicada — fora deste escopo.
- Sem mudanças em YouTube, em pausa de mídia no logout ou em qualquer outra lógica do player.
