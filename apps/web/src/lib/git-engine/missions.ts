import {
  createCommitHash,
  findCommitByHash,
  getCurrentBranchName,
  getHeadCommit,
  getHeadCommitHash,
  isCommitAncestor,
  isIgnoredByGitignore,
} from './engine';
import {
  CheatSheetCategory,
  GitCommit,
  GitMission,
  GitRepoState,
  SandboxPreset,
} from './types';

function createBaseRepo(
  overrides: Partial<GitRepoState> = {},
): GitRepoState {
  return {
    projectName: 'meu-projeto',
    initialized: false,
    config: {
      userName: '',
      userEmail: '',
    },
    workingDirectory: {},
    stagingArea: {},
    commits: [],
    branches: {},
    head: { type: 'branch', ref: 'main' },
    remotes: {},
    remoteCatalog: {},
    mergeConflict: null,
    commandHistory: [],
    executedCommands: [],
    ...overrides,
  };
}

function makeCommit(
  message: string,
  tree: Record<string, string>,
  parentHashes: string[] = [],
  authorName = 'Instrutor Tech',
  authorEmail = 'tech@brilhamais.org',
  step = 1,
): GitCommit {
  return {
    hash: createCommitHash(`${message}|${parentHashes.join(',')}|${step}`),
    message,
    authorName,
    authorEmail,
    timestamp: new Date(Date.UTC(2026, 10, 12, 10, step)).toISOString(),
    parentHashes,
    tree: { ...tree },
  };
}

function createMission01(): GitMission {
  return {
    slug: 'git-01-config-init',
    order: 1,
    stageGroup: '1. Fundamentos Locais',
    title: 'Identidade e Primeiro Repositório',
    subtitle: 'Configure quem você é e inicialize o versionamento do projeto.',
    difficulty: 'Iniciante',
    estimatedMinutes: 3,
    conceptSummary:
      'Antes de salvar qualquer alteração no Git, configuramos nosso nome e e-mail (para que o histórico saiba quem fez cada commit) e rodamos git init para transformar uma pasta comum em um repositório versionado.',
    exampleCommands: [
      'git config --global user.name "Maria Silva"',
      'git config --global user.email "maria@email.com"',
      'git init',
      'git status',
    ],
    scenario:
      'Você acabou de criar a pasta "meu-portfolio" e quer começar a controlar as versões do seu código com Git.',
    hints: [
      'Use git config --global user.name "Seu Nome" e git config --global user.email "seu@email.com".',
      'Depois execute git init para criar a pasta oculta .git/ e git status para inspecionar o estado atual.',
    ],
    initialState: () =>
      createBaseRepo({
        projectName: 'meu-portfolio',
        workingDirectory: {
          'README.md': '# Meu Portfólio\nPrimeiro projeto em tecnologia.',
        },
      }),
    objectives: [
      {
        id: 'config-name',
        label: 'Configurar seu nome com git config user.name',
        commandHint: 'git config --global user.name "Seu Nome"',
        check: (state) => state.config.userName.trim().length > 0,
      },
      {
        id: 'config-email',
        label: 'Configurar seu e-mail com git config user.email',
        commandHint: 'git config --global user.email "voce@brilhamais.org"',
        check: (state) => state.config.userEmail.includes('@'),
      },
      {
        id: 'git-init',
        label: 'Inicializar o repositório com git init',
        commandHint: 'git init',
        check: (state) => state.initialized,
      },
      {
        id: 'git-status',
        label: 'Verificar o estado do repositório com git status',
        commandHint: 'git status',
        check: (state) =>
          state.initialized &&
          state.executedCommands.some((c) => /^git\s+status(\s|$)/i.test(c)),
      },
    ],
    solutionCommands: [
      'git config --global user.name "Aluno Brilha Mais"',
      'git config --global user.email "aluno@brilhamais.org"',
      'git init',
      'git status',
    ],
  };
}

function createMission02(): GitMission {
  return {
    slug: 'git-02-stage-commit',
    order: 2,
    stageGroup: '1. Fundamentos Locais',
    title: 'Preparando e Salvando Versões',
    subtitle: 'Domine o ciclo clássico: Working Tree → Stage → Commit.',
    difficulty: 'Iniciante',
    estimatedMinutes: 4,
    conceptSummary:
      'No Git, salvar uma versão acontece em duas etapas: primeiro você escolhe quais arquivos entram na foto usando git add (Staging Area), e depois registra a foto permanente no histórico com git commit -m "mensagem".',
    exampleCommands: [
      'ls',
      'git add index.html styles.css',
      'git add .',
      'git commit -m "Cria estrutura inicial"',
    ],
    scenario:
      'A pasta do site já tem os arquivos index.html e styles.css esperando para serem versionados no primeiro commit.',
    hints: [
      'Digite ls ou git status para enxergar os arquivos não monitorados.',
      'Use git add . (ou adicione um por um) e depois git commit -m "Primeiro commit".',
    ],
    initialState: () =>
      createBaseRepo({
        projectName: 'landing-page',
        initialized: true,
        config: {
          userName: 'Aluno Brilha Mais',
          userEmail: 'aluno@brilhamais.org',
        },
        workingDirectory: {
          'index.html': '<!DOCTYPE html><html><body><h1>Olá Mundo</h1></body></html>',
          'styles.css': 'body { font-family: sans-serif; background: #FAFAF9; }',
        },
      }),
    objectives: [
      {
        id: 'stage-files',
        label: 'Preparar index.html e styles.css na Staging Area (git add)',
        commandHint: 'git add .',
        check: (state) =>
          Object.prototype.hasOwnProperty.call(state.stagingArea, 'index.html') &&
          Object.prototype.hasOwnProperty.call(state.stagingArea, 'styles.css'),
      },
      {
        id: 'first-commit',
        label: 'Registrar o primeiro commit com mensagem descritiva',
        commandHint: 'git commit -m "Cria pagina inicial"',
        check: (state) => {
          const head = getHeadCommit(state);
          return Boolean(
            head &&
              head.tree['index.html'] !== undefined &&
              head.tree['styles.css'] !== undefined,
          );
        },
      },
    ],
    solutionCommands: ['ls', 'git add .', 'git commit -m "Cria pagina inicial"'],
  };
}

function createMission03(): GitMission {
  const c1 = makeCommit(
    'chore: inicia projeto',
    { 'README.md': '# App Financeiro' },
    [],
    'Aluno Brilha Mais',
    'aluno@brilhamais.org',
    1,
  );

  return {
    slug: 'git-03-gitignore-log',
    order: 3,
    stageGroup: '1. Fundamentos Locais',
    title: 'Protegendo Segredos (.gitignore) e Histórico',
    subtitle: 'Impeça que senhas em .env vazem no repositório e consulte o log.',
    difficulty: 'Iniciante',
    estimatedMinutes: 5,
    conceptSummary:
      'Nunca devemos enviar arquivos com senhas e chaves de API (como .env) para o Git! O arquivo .gitignore lista padrões que o Git deve ignorar automaticamente mesmo quando rodamos git add .',
    exampleCommands: [
      'echo ".env" > .gitignore',
      'git status',
      'git add .',
      'git log --oneline',
    ],
    scenario:
      'Existem dois arquivos novos na pasta: app.js (código que deve ser salvo) e .env (contém senhas secretas). Proteja o .env antes de commitar!',
    hints: [
      'Crie o .gitignore digitando: echo ".env" > .gitignore (ou pelo painel de arquivos).',
      'Depois rode git add . e verifique com git status que o .env sumiu da lista! Finalize com git commit -m "..." e git log --oneline.',
    ],
    initialState: () =>
      createBaseRepo({
        projectName: 'app-seguro',
        initialized: true,
        config: {
          userName: 'Aluno Brilha Mais',
          userEmail: 'aluno@brilhamais.org',
        },
        workingDirectory: {
          'README.md': '# App Financeiro',
          'app.js': 'console.log("Sistema conectado");',
          '.env': 'API_SECRET=nao-subir-para-o-github-1234',
        },
        stagingArea: {
          'README.md': '# App Financeiro',
        },
        commits: [c1],
        branches: { main: c1.hash },
      }),
    objectives: [
      {
        id: 'create-gitignore',
        label: 'Criar arquivo .gitignore ignorando o arquivo .env',
        commandHint: 'echo ".env" > .gitignore',
        check: (state) =>
          Boolean(
            state.workingDirectory['.gitignore'] &&
              isIgnoredByGitignore('.env', state.workingDirectory['.gitignore']),
          ),
      },
      {
        id: 'commit-without-env',
        label: 'Commitar .gitignore e app.js sem incluir o .env',
        commandHint: 'git add . && git commit -m "..."',
        check: (state) => {
          const head = getHeadCommit(state);
          return Boolean(
            state.commits.length >= 2 &&
              head &&
              head.tree['.gitignore'] !== undefined &&
              head.tree['app.js'] !== undefined &&
              head.tree['.env'] === undefined,
          );
        },
      },
      {
        id: 'view-log',
        label: 'Consultar o histórico de commits com git log',
        commandHint: 'git log --oneline',
        check: (state) =>
          state.executedCommands.some((c) => /^git\s+log(\s|$)/i.test(c)),
      },
    ],
    solutionCommands: [
      'echo ".env" > .gitignore',
      'git add .',
      'git commit -m "Adiciona app e protege .env"',
      'git log --oneline',
    ],
  };
}

function createMission04(): GitMission {
  const c1 = makeCommit(
    'feat: cria estrutura base',
    { 'index.html': '<h1>Portal Aluno</h1>' },
    [],
    'Aluno Brilha Mais',
    'aluno@brilhamais.org',
    1,
  );

  return {
    slug: 'git-04-branches-switch',
    order: 4,
    stageGroup: '2. Branches e Merge',
    title: 'Criando e Navegando entre Branches',
    subtitle: 'Desenvolva uma nova funcionalidade isolada da branch main.',
    difficulty: 'Iniciante',
    estimatedMinutes: 5,
    conceptSummary:
      'Branches permitem trabalhar em uma nova tela ou correção sem quebrar o código principal (main). Use git switch -c nome-da-branch (ou git checkout -b) para criar e entrar nela em um único passo.',
    exampleCommands: [
      'git branch',
      'git switch -c feature/login',
      'echo "export function login() {}" > login.js',
      'git add login.js',
    ],
    scenario:
      'Você precisa criar a tela de login em uma nova branch chamada feature/login, mantendo a branch main intacta.',
    hints: [
      'Crie e entre na branch com: git switch -c feature/login',
      'Crie o arquivo login.js usando: touch login.js (ou echo "..." > login.js), depois git add . e git commit -m "feat: tela de login".',
    ],
    initialState: () =>
      createBaseRepo({
        projectName: 'portal-web',
        initialized: true,
        config: {
          userName: 'Aluno Brilha Mais',
          userEmail: 'aluno@brilhamais.org',
        },
        workingDirectory: { ...c1.tree },
        stagingArea: { ...c1.tree },
        commits: [c1],
        branches: { main: c1.hash },
      }),
    objectives: [
      {
        id: 'create-feature-branch',
        label: 'Criar e alternar para a branch feature/login',
        commandHint: 'git switch -c feature/login',
        check: (state) =>
          Boolean(state.branches['feature/login']) &&
          getCurrentBranchName(state) === 'feature/login',
      },
      {
        id: 'commit-in-feature',
        label: 'Criar login.js e commitar dentro de feature/login (sem alterar main)',
        commandHint: 'touch login.js / git add . / git commit -m "..."',
        check: (state) => {
          const featureHash = state.branches['feature/login'];
          const mainHash = state.branches['main'];
          const featureCommit = findCommitByHash(state.commits, featureHash ?? null);
          return Boolean(
            featureHash &&
              featureHash !== mainHash &&
              featureCommit &&
              featureCommit.tree['login.js'] !== undefined &&
              mainHash === c1.hash,
          );
        },
      },
    ],
    solutionCommands: [
      'git switch -c feature/login',
      'echo "export function login() { return true; }" > login.js',
      'git add login.js',
      'git commit -m "feat: implementa modulo de login"',
    ],
  };
}

function createMission05(): GitMission {
  const c1 = makeCommit(
    'chore: base do projeto',
    { 'app.js': 'const app = "Brilha Mais";' },
    [],
    'Aluno Brilha Mais',
    'aluno@brilhamais.org',
    1,
  );
  const c2 = makeCommit(
    'feat: adiciona componente card',
    {
      'app.js': 'const app = "Brilha Mais";',
      'card.js': 'export const Card = () => "<div class=\'card\'>Curso</div>";',
    },
    [c1.hash],
    'Aluno Brilha Mais',
    'aluno@brilhamais.org',
    2,
  );

  return {
    slug: 'git-05-merge-feature',
    order: 5,
    stageGroup: '2. Branches e Merge',
    title: 'Integrando Entregas com git merge',
    subtitle: 'Traga o código testado da branch secundária para a main.',
    difficulty: 'Intermediário',
    estimatedMinutes: 4,
    conceptSummary:
      'Depois que uma funcionalidade fica pronta em sua branch, voltamos para a branch de destino (main) e usamos git merge <branch> para unir os commits no histórico principal.',
    exampleCommands: [
      'git branch',
      'git switch main',
      'git merge feature/card',
      'git branch -d feature/card',
    ],
    scenario:
      'Você está na branch feature/card, onde o componente card.js já foi finalizado. Volte para a main e integre a entrega!',
    hints: [
      'Primeiro volte para a branch principal: git switch main',
      'Em seguida, integre a branch rodando: git merge feature/card',
    ],
    initialState: () =>
      createBaseRepo({
        projectName: 'ui-components',
        initialized: true,
        config: {
          userName: 'Aluno Brilha Mais',
          userEmail: 'aluno@brilhamais.org',
        },
        workingDirectory: { ...c2.tree },
        stagingArea: { ...c2.tree },
        commits: [c1, c2],
        branches: {
          main: c1.hash,
          'feature/card': c2.hash,
        },
        head: { type: 'branch', ref: 'feature/card' },
      }),
    objectives: [
      {
        id: 'switch-main',
        label: 'Voltar para a branch main',
        commandHint: 'git switch main',
        check: (state) => getCurrentBranchName(state) === 'main',
      },
      {
        id: 'merge-card',
        label: 'Fazer merge de feature/card dentro da main',
        commandHint: 'git merge feature/card',
        check: (state) => {
          const mainHash = state.branches['main'];
          return Boolean(
            mainHash && isCommitAncestor(state.commits, c2.hash, mainHash),
          );
        },
      },
    ],
    solutionCommands: ['git switch main', 'git merge feature/card'],
  };
}

function createMission06(): GitMission {
  const c1 = makeCommit(
    'chore: cria header inicial',
    { 'header.html': '<h1>Brilha Mais</h1>' },
    [],
    'Equipe Tech',
    'time@brilhamais.org',
    1,
  );
  const c2 = makeCommit(
    'docs: ajusta titulo na main',
    { 'header.html': '<h1>Brilha Mais Tecnologia</h1>' },
    [c1.hash],
    'Ana Tech',
    'ana@brilhamais.org',
    2,
  );
  const c3 = makeCommit(
    'feat: novo titulo na feature',
    { 'header.html': '<h1>Portal Tech Brilha Mais</h1>' },
    [c1.hash],
    'Aluno Brilha Mais',
    'aluno@brilhamais.org',
    3,
  );

  return {
    slug: 'git-06-merge-conflict',
    order: 6,
    stageGroup: '2. Branches e Merge',
    title: 'Resolvendo um Conflito de Merge',
    subtitle: 'Aprenda a lidar com alterações concorrentes sem pânico.',
    difficulty: 'Intermediário',
    estimatedMinutes: 6,
    conceptSummary:
      'Quando duas branches editam a mesma linha de um arquivo, o Git pausa o merge e marca o trecho com <<<<<<<, ======= e >>>>>>> para você decidir o resultado final. Após editar e remover os marcadores, rode git add e git commit.',
    exampleCommands: [
      'git merge feature/titulo',
      'echo "<h1>Portal Brilha Mais Tecnologia</h1>" > header.html',
      'git add header.html',
      'git commit -m "Resolve conflito no header"',
    ],
    scenario:
      'Tanto a main quanto a branch feature/titulo alteraram header.html. Inicie o merge na main, resolva o conflito (pelo terminal ou clicando no arquivo na aba Arquivos ao lado) e conclua o commit!',
    hints: [
      'Passo 1: rode git merge feature/titulo para disparar o conflito.',
      'Passo 2: clique em header.html na aba "Arquivos" ao lado (ou rode echo "<h1>Portal Brilha Mais</h1>" > header.html) para apagar os marcadores <<<<<<<, ======= e >>>>>>>.',
      'Passo 3: rode git add header.html e depois git commit -m "Resolve conflito".',
    ],
    initialState: () =>
      createBaseRepo({
        projectName: 'portal-conflito',
        initialized: true,
        config: {
          userName: 'Aluno Brilha Mais',
          userEmail: 'aluno@brilhamais.org',
        },
        workingDirectory: { ...c2.tree },
        stagingArea: { ...c2.tree },
        commits: [c1, c2, c3],
        branches: {
          main: c2.hash,
          'feature/titulo': c3.hash,
        },
        head: { type: 'branch', ref: 'main' },
      }),
    objectives: [
      {
        id: 'start-merge',
        label: 'Iniciar o merge de feature/titulo na main',
        commandHint: 'git merge feature/titulo',
        check: (state) =>
          state.mergeConflict !== null ||
          state.commits.some((c) => c.parentHashes.length === 2),
      },
      {
        id: 'resolve-conflict-file',
        label: 'Limpar os marcadores de conflito em header.html e rodar git add',
        commandHint: 'Editar header.html + git add header.html',
        check: (state) => {
          const mergeStarted =
            state.mergeConflict !== null ||
            state.commits.some((c) => c.parentHashes.length === 2);
          if (!mergeStarted) return false;
          const stagedContent = state.stagingArea['header.html'] || '';
          const stillConflicted =
            state.mergeConflict?.conflictedFiles.includes('header.html') ?? false;
          return (
            !stillConflicted &&
            stagedContent.length > 0 &&
            !stagedContent.includes('<<<<<<<') &&
            !stagedContent.includes('=======') &&
            !stagedContent.includes('>>>>>>>')
          );
        },
      },
      {
        id: 'finish-merge-commit',
        label: 'Finalizar o merge commit com git commit -m "..."',
        commandHint: 'git commit -m "Resolve conflito"',
        check: (state) =>
          state.mergeConflict === null &&
          state.commits.some(
            (c) =>
              c.parentHashes.length === 2 && c.parentHashes.includes(c3.hash),
          ),
      },
    ],
    solutionCommands: [
      'git merge feature/titulo',
      'echo "<h1>Portal Tech Brilha Mais</h1>" > header.html',
      'git add header.html',
      'git commit -m "Resolve conflito do cabecalho"',
    ],
  };
}

function createMission07(): GitMission {
  const baseTree = {
    'README.md': '# Portal Tech\nDocumentação oficial.',
    'config.json': '{"debug": false}',
  };
  const c1 = makeCommit(
    'chore: configuracao estavel',
    baseTree,
    [],
    'Aluno Brilha Mais',
    'aluno@brilhamais.org',
    1,
  );
  const c2 = makeCommit(
    'wip: commit de teste acidental',
    {
      ...baseTree,
      'rascunho.txt': 'arquivo temporário que não devia ter ido no commit',
    },
    [c1.hash],
    'Aluno Brilha Mais',
    'aluno@brilhamais.org',
    2,
  );

  return {
    slug: 'git-07-undo-restore-reset',
    order: 7,
    stageGroup: '3. Desfazendo Erros',
    title: 'Desfazendo Erros sem Medo',
    subtitle: 'Use git restore e git reset para voltar atrás com segurança.',
    difficulty: 'Intermediário',
    estimatedMinutes: 5,
    conceptSummary:
      'Errou? O Git protege você: git restore --staged <arq> tira um arquivo da Staging Area; git restore <arq> desfaz alterações locais no arquivo; e git reset HEAD~1 volta o último commit mantendo os arquivos para você corrigir.',
    exampleCommands: [
      'git status',
      'git restore --staged config.json',
      'git restore README.md',
      'git reset --soft HEAD~1',
    ],
    scenario:
      'Três pequenos acidentes aconteceram: config.json foi colocado no Stage por engano, README.md teve o texto local estragado e o último commit ("wip: commit de teste acidental") precisa ser desfeito.',
    hints: [
      '1) Tire config.json da Staging Area com: git restore --staged config.json',
      '2) Restaure o texto original do README.md com: git restore README.md',
      '3) Desfaça o último commit voltando para o primeiro commit com: git reset HEAD~1 (ou --soft HEAD~1).',
    ],
    initialState: () =>
      createBaseRepo({
        projectName: 'api-rest',
        initialized: true,
        config: {
          userName: 'Aluno Brilha Mais',
          userEmail: 'aluno@brilhamais.org',
        },
        workingDirectory: {
          'README.md': '# Ooops apaguei tudo por acidente',
          'config.json': '{"debug": true}',
          'rascunho.txt': 'arquivo temporário que não devia ter ido no commit',
        },
        stagingArea: {
          'README.md': '# Portal Tech\nDocumentação oficial.',
          'config.json': '{"debug": true}',
          'rascunho.txt': 'arquivo temporário que não devia ter ido no commit',
        },
        commits: [c1, c2],
        branches: { main: c2.hash },
      }),
    objectives: [
      {
        id: 'unstage-config',
        label: 'Remover config.json da Staging Area (git restore --staged)',
        commandHint: 'git restore --staged config.json',
        check: (state) =>
          state.stagingArea['config.json'] === '{"debug": false}',
      },
      {
        id: 'restore-readme',
        label: 'Restaurar o conteúdo original de README.md (git restore)',
        commandHint: 'git restore README.md',
        check: (state) =>
          state.workingDirectory['README.md'] ===
          '# Portal Tech\nDocumentação oficial.',
      },
      {
        id: 'reset-last-commit',
        label: 'Voltar 1 commit no histórico da main (git reset HEAD~1)',
        commandHint: 'git reset --soft HEAD~1',
        check: (state) => state.branches['main'] === c1.hash,
      },
    ],
    solutionCommands: [
      'git restore --staged config.json',
      'git restore README.md',
      'git reset --soft HEAD~1',
    ],
  };
}

function createMission08(): GitMission {
  const c1 = makeCommit(
    'chore: cria estrutura do portfolio',
    { 'index.html': '<h1>Portfólio Dev</h1>' },
    [],
    'Aluno Brilha Mais',
    'aluno@brilhamais.org',
    1,
  );
  const c2 = makeCommit(
    'feat: adiciona secao de projetos',
    {
      'index.html': '<h1>Portfólio Dev</h1>',
      'projetos.html': '<ul><li>Brilha Git Lab</li></ul>',
    },
    [c1.hash],
    'Aluno Brilha Mais',
    'aluno@brilhamais.org',
    2,
  );

  return {
    slug: 'git-08-remote-push',
    order: 8,
    stageGroup: '4. Remoto e Mercado',
    title: 'Conectando e Publicando na Nuvem',
    subtitle: 'Vincule um repositório remoto origin e envie seu código com push.',
    difficulty: 'Intermediário',
    estimatedMinutes: 4,
    conceptSummary:
      'Para compartilhar seu projeto no GitHub/GitLab, registramos o endereço remoto chamado origin (git remote add origin <url>) e enviamos nossos commits locais com git push -u origin main.',
    exampleCommands: [
      'git remote -v',
      'git remote add origin https://github.com/brilha-mais/meu-portfolio.git',
      'git push -u origin main',
    ],
    scenario:
      'Seu portfólio local já tem 2 commits na branch main. Conecte o remoto origin usando https://github.com/brilha-mais/meu-portfolio.git e faça o push!',
    hints: [
      'Conecte o servidor remoto: git remote add origin https://github.com/brilha-mais/meu-portfolio.git',
      'Envie a branch main para o servidor: git push -u origin main',
    ],
    initialState: () =>
      createBaseRepo({
        projectName: 'meu-portfolio',
        initialized: true,
        config: {
          userName: 'Aluno Brilha Mais',
          userEmail: 'aluno@brilhamais.org',
        },
        workingDirectory: { ...c2.tree },
        stagingArea: { ...c2.tree },
        commits: [c1, c2],
        branches: { main: c2.hash },
        remoteCatalog: {
          'https://github.com/brilha-mais/meu-portfolio.git': {
            projectName: 'meu-portfolio',
            branches: {},
            commits: [],
          },
        },
      }),
    objectives: [
      {
        id: 'add-origin',
        label: 'Adicionar o repositório remoto origin (git remote add origin ...)',
        commandHint:
          'git remote add origin https://github.com/brilha-mais/meu-portfolio.git',
        check: (state) => Boolean(state.remotes['origin']),
      },
      {
        id: 'push-main',
        label: 'Enviar os commits da branch main com git push -u origin main',
        commandHint: 'git push -u origin main',
        check: (state) => {
          const remoteMain = state.remotes['origin']?.branches['main'];
          return Boolean(remoteMain && remoteMain === state.branches['main']);
        },
      },
    ],
    solutionCommands: [
      'git remote add origin https://github.com/brilha-mais/meu-portfolio.git',
      'git push -u origin main',
    ],
  };
}

function createMission09(): GitMission {
  const c1 = makeCommit(
    'chore: setup inicial da API',
    {
      'README.md': '# API da Equipe',
      'server.ts': 'console.log("Servidor online");',
    },
    [],
    'Equipe Tech',
    'time@brilhamais.org',
    1,
  );
  const c2Team = makeCommit(
    'feat(team): adiciona rota /health',
    {
      'README.md': '# API da Equipe',
      'server.ts': 'console.log("Servidor online");',
      'health.ts': 'export const health = () => ({ ok: true });',
    },
    [c1.hash],
    'Carla Dev',
    'carla@brilhamais.org',
    2,
  );

  const repoUrl = 'https://github.com/brilha-mais/api-equipe.git';

  return {
    slug: 'git-09-clone-pull',
    order: 9,
    stageGroup: '4. Remoto e Mercado',
    title: 'Clonando e Sincronizando com o Time',
    subtitle: 'Baixe um projeto existente com git clone e atualize com git pull.',
    difficulty: 'Intermediário',
    estimatedMinutes: 5,
    conceptSummary:
      'Ao entrar em uma empresa, você baixa o projeto da equipe com git clone <url>. Enquanto você trabalha, colegas enviam novidades para a nuvem — você busca e integra essas novidades com git fetch e git pull.',
    exampleCommands: [
      'git clone https://github.com/brilha-mais/api-equipe.git',
      'git fetch',
      'git status',
      'git pull',
    ],
    scenario:
      'Clone o repositório https://github.com/brilha-mais/api-equipe.git. Logo após você clonar, uma colega fará um novo commit no servidor — use git fetch/status para ver a diferença e git pull para atualizar!',
    hints: [
      'Primeiro clone o projeto: git clone https://github.com/brilha-mais/api-equipe.git',
      'Depois baixe as novidades da colega rodando: git pull',
    ],
    initialState: () =>
      createBaseRepo({
        projectName: 'workspace',
        initialized: false,
        config: {
          userName: 'Aluno Brilha Mais',
          userEmail: 'aluno@brilhamais.org',
        },
        remoteCatalog: {
          [repoUrl]: {
            projectName: 'api-equipe',
            branches: { main: c1.hash },
            commits: [c1],
            postCloneRemoteCommits: {
              branch: 'main',
              commits: [c2Team],
            },
          },
        },
      }),
    objectives: [
      {
        id: 'clone-repo',
        label: 'Clonar o repositório da equipe com git clone',
        commandHint: 'git clone https://github.com/brilha-mais/api-equipe.git',
        check: (state) => state.initialized && Boolean(state.remotes['origin']),
      },
      {
        id: 'pull-updates',
        label: 'Atualizar o projeto local com o novo commit da equipe (git pull)',
        commandHint: 'git pull',
        check: (state) => {
          const mainHash = state.branches['main'];
          return Boolean(
            mainHash &&
              isCommitAncestor(state.commits, c2Team.hash, mainHash) &&
              state.workingDirectory['health.ts'] !== undefined,
          );
        },
      },
    ],
    solutionCommands: [
      'git clone https://github.com/brilha-mais/api-equipe.git',
      'git fetch',
      'git pull',
    ],
  };
}

function createMission10(): GitMission {
  const c1 = makeCommit(
    'chore: base da plataforma',
    {
      'README.md': '# Plataforma Brilha Mais',
      'index.ts': 'console.log("App iniciado");',
    },
    [],
    'Equipe Tech',
    'time@brilhamais.org',
    1,
  );
  const c2 = makeCommit(
    'style: ajusta tema V2',
    {
      'README.md': '# Plataforma Brilha Mais',
      'index.ts': 'console.log("App iniciado");',
      'theme.css': ':root { --brand: #F19B0A; }',
    },
    [c1.hash],
    'Líder Tech',
    'lider@brilhamais.org',
    2,
  );

  return {
    slug: 'git-10-final-workflow',
    order: 10,
    stageGroup: '4. Remoto e Mercado',
    title: 'Desafio Final: Fluxo Completo de Mercado',
    subtitle: 'Execute o ciclo profissional do dia a dia de uma equipe dev.',
    difficulty: 'Prática de Mercado',
    estimatedMinutes: 7,
    conceptSummary:
      'Na rotina real de desenvolvimento, você: 1) Atualiza a main com git pull; 2) Cria uma branch para sua tarefa; 3) Desenvolve e commita; 4) Publica sua branch remota com git push -u origin <branch> para abrir um Pull Request!',
    exampleCommands: [
      'git pull',
      'git switch -c feat/perfil',
      'echo "export const perfil = true;" > perfil.ts',
      'git push -u origin feat/perfil',
    ],
    scenario:
      'Sua tarefa do sprint é criar o módulo perfil.ts na branch feat/perfil e publicá-la no origin para revisão da equipe.',
    hints: [
      '1) Atualize a main primeiro: git pull',
      '2) Crie a branch: git switch -c feat/perfil',
      '3) Crie perfil.ts (touch perfil.ts ou echo "..." > perfil.ts), rode git add . e git commit -m "feat: modulo perfil"',
      '4) Publique sua branch com: git push -u origin feat/perfil',
    ],
    initialState: () =>
      createBaseRepo({
        projectName: 'plataforma-brilha',
        initialized: true,
        config: {
          userName: 'Aluno Brilha Mais',
          userEmail: 'aluno@brilhamais.org',
        },
        workingDirectory: { ...c1.tree },
        stagingArea: { ...c1.tree },
        commits: [c1],
        branches: { main: c1.hash },
        head: { type: 'branch', ref: 'main' },
        remotes: {
          origin: {
            name: 'origin',
            url: 'https://github.com/brilha-mais/plataforma-brilha.git',
            branches: { main: c2.hash },
            commits: [c1, c2],
          },
        },
      }),
    objectives: [
      {
        id: 'pull-main',
        label: 'Sincronizar a branch main local com git pull',
        commandHint: 'git pull',
        check: (state) =>
          Boolean(
            state.branches['main'] &&
              isCommitAncestor(state.commits, c2.hash, state.branches['main']),
          ),
      },
      {
        id: 'create-feat-perfil',
        label: 'Criar a branch feat/perfil',
        commandHint: 'git switch -c feat/perfil',
        check: (state) => Boolean(state.branches['feat/perfil']),
      },
      {
        id: 'commit-perfil',
        label: 'Criar e commitar perfil.ts na branch feat/perfil',
        commandHint: 'echo "..." > perfil.ts + git add . + git commit -m "..."',
        check: (state) => {
          const featHash = state.branches['feat/perfil'];
          const commit = findCommitByHash(state.commits, featHash ?? null);
          return Boolean(
            featHash &&
              featHash !== state.branches['main'] &&
              commit &&
              commit.tree['perfil.ts'] !== undefined,
          );
        },
      },
      {
        id: 'push-feat-perfil',
        label: 'Publicar a branch feat/perfil no remoto origin (git push)',
        commandHint: 'git push -u origin feat/perfil',
        check: (state) => {
          const localHash = state.branches['feat/perfil'];
          const remoteHash = state.remotes['origin']?.branches['feat/perfil'];
          return Boolean(localHash && remoteHash && localHash === remoteHash);
        },
      },
    ],
    solutionCommands: [
      'git pull',
      'git switch -c feat/perfil',
      'echo "export const perfil = { ativo: true };" > perfil.ts',
      'git add .',
      'git commit -m "feat: adiciona modulo de perfil"',
      'git push -u origin feat/perfil',
    ],
  };
}

export const GIT_MISSIONS: GitMission[] = [
  createMission01(),
  createMission02(),
  createMission03(),
  createMission04(),
  createMission05(),
  createMission06(),
  createMission07(),
  createMission08(),
  createMission09(),
  createMission10(),
];

export const SANDBOX_PRESETS: SandboxPreset[] = [
  {
    id: 'empty',
    title: 'Pasta do Zero',
    description: 'Ambiente limpo sem .git para testar git init, config e primeiros commits.',
    badge: 'Iniciante',
    initialState: () =>
      createBaseRepo({
        projectName: 'sandbox-zero',
        initialized: false,
        config: {
          userName: 'Aluno Brilha Mais',
          userEmail: 'aluno@brilhamais.org',
        },
        workingDirectory: {
          'README.md': '# Projeto Sandbox\nExperimente comandos Git livremente!',
          'index.js': 'console.log("Olá, Git!");',
        },
      }),
  },
  {
    id: 'webapp',
    title: 'Projeto Web em Andamento',
    description: 'Repositório com histórico e branches prontas para praticar switch, diff e merge.',
    badge: 'Branches',
    initialState: () => {
      const c1 = makeCommit(
        'chore: inicia aplicacao web',
        {
          'index.html': '<h1>Brilha Mais</h1>',
          'app.css': 'body { color: #18181b; }',
        },
        [],
        'Aluno Brilha Mais',
        'aluno@brilhamais.org',
        1,
      );
      const c2 = makeCommit(
        'feat: cria rodape na branch feature/footer',
        {
          'index.html': '<h1>Brilha Mais</h1><footer>2026</footer>',
          'app.css': 'body { color: #18181b; }',
        },
        [c1.hash],
        'Aluno Brilha Mais',
        'aluno@brilhamais.org',
        2,
      );

      return createBaseRepo({
        projectName: 'webapp-sandbox',
        initialized: true,
        config: {
          userName: 'Aluno Brilha Mais',
          userEmail: 'aluno@brilhamais.org',
        },
        workingDirectory: { ...c1.tree },
        stagingArea: { ...c1.tree },
        commits: [c1, c2],
        branches: {
          main: c1.hash,
          'feature/footer': c2.hash,
        },
        head: { type: 'branch', ref: 'main' },
      });
    },
  },
  {
    id: 'team-remote',
    title: 'Time com GitHub Simulado',
    description: 'Conectado a um origin onde há atualizações de colegas para praticar fetch, pull e push.',
    badge: 'Remoto',
    initialState: () => {
      const c1 = makeCommit(
        'chore: setup inicial',
        { 'README.md': '# Projeto em Time' },
        [],
        'Equipe Tech',
        'time@brilhamais.org',
        1,
      );
      const c2 = makeCommit(
        'feat: adiciona api de usuarios',
        {
          'README.md': '# Projeto em Time',
          'users.ts': 'export const getUsers = () => [];',
        },
        [c1.hash],
        'Colega Dev',
        'colega@brilhamais.org',
        2,
      );
      return createBaseRepo({
        projectName: 'time-github',
        initialized: true,
        config: {
          userName: 'Aluno Brilha Mais',
          userEmail: 'aluno@brilhamais.org',
        },
        workingDirectory: { ...c1.tree },
        stagingArea: { ...c1.tree },
        commits: [c1],
        branches: { main: c1.hash },
        head: { type: 'branch', ref: 'main' },
        remotes: {
          origin: {
            name: 'origin',
            url: 'https://github.com/brilha-mais/time-github.git',
            branches: { main: c2.hash },
            commits: [c1, c2],
          },
        },
      });
    },
  },
  {
    id: 'conflict-lab',
    title: 'Treino de Conflito',
    description: 'Branches divergentes editando o mesmo arquivo para treinar resolução de conflitos.',
    badge: 'Conflito',
    initialState: () => {
      const m = createMission06();
      return m.initialState();
    },
  },
];

export const GIT_CHEAT_SHEET: CheatSheetCategory[] = [
  {
    id: 'setup',
    title: 'Configuração Inicial',
    items: [
      {
        cmd: 'git config --global user.name "Seu Nome"',
        description: 'Define o autor dos seus commits',
        insertText: 'git config --global user.name ""',
      },
      {
        cmd: 'git config --global user.email "email@exemplo.com"',
        description: 'Define seu e-mail no histórico Git',
        insertText: 'git config --global user.email ""',
      },
      {
        cmd: 'git init',
        description: 'Inicializa um novo repositório Git na pasta',
        insertText: 'git init',
      },
      {
        cmd: 'git clone <url>',
        description: 'Baixa um repositório remoto completo',
        insertText: 'git clone ',
      },
    ],
  },
  {
    id: 'daily',
    title: 'Ciclo do Dia a Dia',
    items: [
      {
        cmd: 'git status',
        description: 'Mostra arquivos alterados, no Stage e não monitorados',
        insertText: 'git status',
      },
      {
        cmd: 'git add <arquivo> | git add .',
        description: 'Prepara alterações na Staging Area para o commit',
        insertText: 'git add .',
      },
      {
        cmd: 'git commit -m "mensagem"',
        description: 'Salva permanentemente o snapshot no histórico',
        insertText: 'git commit -m ""',
      },
      {
        cmd: 'git diff [--staged]',
        description: 'Compara linhas modificadas antes do commit',
        insertText: 'git diff',
      },
      {
        cmd: 'git log --oneline',
        description: 'Lista o histórico resumido de commits',
        insertText: 'git log --oneline',
      },
    ],
  },
  {
    id: 'branches',
    title: 'Branches & Merge',
    items: [
      {
        cmd: 'git branch',
        description: 'Lista todas as branches locais',
        insertText: 'git branch',
      },
      {
        cmd: 'git switch -c <branch>',
        description: 'Cria uma nova branch e já entra nela',
        insertText: 'git switch -c ',
      },
      {
        cmd: 'git switch <branch>',
        description: 'Troca para uma branch existente',
        insertText: 'git switch ',
      },
      {
        cmd: 'git merge <branch>',
        description: 'Une commits de outra branch na branch atual',
        insertText: 'git merge ',
      },
    ],
  },
  {
    id: 'undo',
    title: 'Desfazendo Alterações',
    items: [
      {
        cmd: 'git restore --staged <arquivo>',
        description: 'Tira o arquivo da Staging Area sem apagar seu código',
        insertText: 'git restore --staged ',
      },
      {
        cmd: 'git restore <arquivo>',
        description: 'Descarta modificações locais não salvas do arquivo',
        insertText: 'git restore ',
      },
      {
        cmd: 'git reset --soft HEAD~1',
        description: 'Desfaz o último commit mantendo alterações no Stage',
        insertText: 'git reset --soft HEAD~1',
      },
    ],
  },
  {
    id: 'remote',
    title: 'Repositório Remoto',
    items: [
      {
        cmd: 'git remote add origin <url>',
        description: 'Conecta seu repo local a um servidor remoto',
        insertText: 'git remote add origin ',
      },
      {
        cmd: 'git fetch',
        description: 'Verifica se há novidades no remoto sem alterar seus arquivos',
        insertText: 'git fetch',
      },
      {
        cmd: 'git pull',
        description: 'Baixa e integra commits novos da equipe',
        insertText: 'git pull',
      },
      {
        cmd: 'git push -u origin <branch>',
        description: 'Envia sua branch e commits para o remoto',
        insertText: 'git push -u origin ',
      },
    ],
  },
  {
    id: 'shell',
    title: 'Terminal Básico',
    items: [
      {
        cmd: 'ls -a',
        description: 'Lista arquivos incluindo ocultos (.gitignore, .env)',
        insertText: 'ls -a',
      },
      {
        cmd: 'cat <arquivo>',
        description: 'Exibe o conteúdo do arquivo no terminal',
        insertText: 'cat ',
      },
      {
        cmd: 'touch <arquivo>',
        description: 'Cria um novo arquivo vazio',
        insertText: 'touch ',
      },
      {
        cmd: 'echo "texto" > <arquivo>',
        description: 'Grava conteúdo em um arquivo (>> adiciona linha)',
        insertText: 'echo "" > ',
      },
    ],
  },
];
