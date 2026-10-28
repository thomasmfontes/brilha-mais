# Brilha Mais - Diretrizes do Design System V2

Ao criar ou refatorar telas e componentes no front-end (`apps/web`), siga rigorosamente este guia estético minimalista, moderno e autêntico (estilo Linear, Vercel, Apple, Netflix).

## 🚫 Anti-Patterns Estritamente Proibidos (Clichês de IA)
1. **Sem manchas de borrão nos cantos:** Não use `blur-[120px]`, `rounded-full` coloridos de fundo nem luzes difusas desordenadas.
2. **Sem micro-grades artificiais:** Não use `bg-subtle-grid` ou linhas geométricas decorativas no canvas.
3. **Sem tipografia gritada ou itálico forçado:** Proibido usar `font-black uppercase italic tracking-tighter` em títulos ou subtítulos.
4. **Sem barras verticais neon nos títulos:** Não adicione divisores verticais laranjas com sombra neon (`<div className="h-8 w-1 bg-primary ... shadow-lg" />`) ao lado de títulos.
5. **Sem cantos caricatos de pílula gigante:** Evite `rounded-[2.5rem]` ou `rounded-[2rem]` em cards de conteúdo. Use raios proporcionais (`rounded-xl` ou `rounded-2xl`).
6. **Sem degradês multicoloridos ou sombras neon nos textos:** Evite `bg-clip-text` com gradientes excessivos em palavras-chave.
7. **Sem excesso de caixas-altas:** Evite `text-[9px] uppercase tracking-[0.2em] italic` em textos secundários e categorias.

## ✨ Padrões Obrigatórios da V2
1. **Canvas e Fundo:**
   - Fundo neutro e suave: `#FAFAF9` (`bg-[#FAFAF9]`).
2. **Paleta de Cores e Foco:**
   - Tom âmbar/dourado da marca (`#F19B0A` e `#D98B08`) deve ser usado com parcimônia, exclusivamente como ponto de conversão e foco (CTAs, barras de progresso ativas e destaques pontuais).
   - Textos: `text-zinc-950` / `text-zinc-900` para títulos e `text-zinc-500` para metadados/subtítulos.
3. **Hierarquia Tipográfica:**
   - Títulos em Title Case ou caixa natural: `text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900`.
   - Subtítulos claros em tom cinza neutro com entrelinha confortável.
4. **Cards e Superfícies:**
   - Fundo branco puro (`bg-white`), bordas nítidas e suaves (`border border-zinc-200/80`), cantos modernos (`rounded-xl` ou `rounded-2xl`).
   - Sombras físicas discretas e naturais (`shadow-xs` ou `shadow-sm`), sem brilho neon.
5. **Botões e Ações:**
   - Botões com altura ergonômica (40px a 48px), cantos `rounded-xl`, tipografia `font-semibold text-sm` e micro-interação no clique (`active:scale-[0.98]`).
   - Botões de reprodução em mídia: estilo streaming limpo (fundo branco nítido com texto escuro e ícone play).
6. **Grids e Categorias:**
   - Ícones limpos abrigados em contêineres discretos (`w-9 h-9 rounded-lg bg-zinc-50 border border-zinc-100`).
   - Rótulos em texto natural sem forçar caixa alta.
