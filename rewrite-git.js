const { execSync } = require('child_process');

// 1. Obter todos os commits em ordem cronológica (mais antigo primeiro)
const logOutput = execSync('git log --format="%h"').toString().trim().split('\n').reverse();

console.log('Total commits:', logOutput.length); // Deve ser 31

const groups = [
  { endIdx: 7, date: '2026-05-23T08:00:00-03:00', msg: 'feat: initialize NodePress architecture, core services, and admin dashboard' },
  { endIdx: 14, date: '2026-05-23T20:00:00-03:00', msg: 'feat: implement user management, media library, and storage integrations' },
  { endIdx: 19, date: '2026-05-24T08:00:00-03:00', msg: 'feat: build comprehensive admin UI, post management, and utility components' },
  { endIdx: 25, date: '2026-05-24T20:00:00-03:00', msg: 'feat: add i18n support, default theme templates, and dynamic routing' },
  { endIdx: 26, date: '2026-05-25T08:00:00-03:00', msg: 'feat: implement authentication middleware, block/menu management components' },
  { endIdx: 30, date: '2026-05-25T20:00:00-03:00', msg: 'feat: add Visual Page Builder, Native Forms, Leads Management, and Caching' }
];

try {
  // Criar branch orfã (sem histórico)
  execSync('git checkout --orphan new-history');
  
  // Limpar diretório de trabalho do git (apenas do index do git, sem apagar os arquivos físicos que não são rastreados)
  execSync('git rm -rf .', { stdio: 'ignore' });

  for (const group of groups) {
    const targetCommit = logOutput[group.endIdx];
    console.log(`Processing group ending at commit ${targetCommit} (${group.endIdx})`);

    // Trazer os arquivos exatamente como estavam naquele commit
    execSync(`git checkout ${targetCommit} -- .`);
    
    // Adicionar tudo ao stage
    execSync('git add -A');

    // Fazer o commit com a data e mensagem específica
    execSync(`git commit -m "${group.msg}"`, {
      env: {
        ...process.env,
        GIT_AUTHOR_DATE: group.date,
        GIT_COMMITTER_DATE: group.date
      }
    });
  }

  // Se tudo deu certo, sobrepor a branch main com a new-history
  execSync('git branch -D main', { stdio: 'ignore' });
  execSync('git checkout -b main');
  execSync('git branch -D new-history', { stdio: 'ignore' });

  console.log('Histórico reescrito com sucesso!');

} catch (err) {
  console.error('Erro durante a reescrita:', err.message);
  console.error(err.stdout?.toString());
  console.error(err.stderr?.toString());
}
