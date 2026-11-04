import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const BASE = process.env.PORTAL_URL ?? 'http://localhost:54321';
const SHOTS = process.env.SHOTS_DIR ?? 'testes/capturas';
fs.mkdirSync(SHOTS, { recursive: true });
fs.mkdirSync('testes/downloads', { recursive: true });
const results = [];
const ok = (name) => { results.push(['PASS', name]); console.log('PASS', name); };
const fail = (name, e) => { results.push(['FAIL', name, String(e)]); console.log('FAIL', name, e); };
const pagesForShots = [];
let failN = 0;
async function step(name, fn) {
  try { await fn(); ok(name); } catch (e) {
    fail(name, e?.message ?? e);
    failN++;
    for (const [i, p] of pagesForShots.entries()) {
      try { await p.screenshot({ path: `${SHOTS}/FAIL-${failN}-p${i}.png` }); console.log('   url', i, p.url()); } catch {}
    }
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--no-proxy-server', '--lang=pt-BR', '--font-render-hinting=none'],
});

async function newPage(w = 1366, h = 768) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  pagesForShots.push(page);
  await page.setViewport({ width: w, height: h });
  page.on('pageerror', (e) => console.log('  [pageerror]', e.message));
  page.on('console', (m) => m.type() === 'error' && !/realtime|websocket|404/i.test(m.text()) && console.log('  [console]', m.text()));
  return page;
}

async function setValue(page, selector, value) {
  await page.$eval(selector, (el, v) => {
    const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}
const text = (page) => page.evaluate(() => document.body.innerText);
async function waitText(page, t, timeout = 8000) {
  await page.waitForFunction((s) => document.body.innerText.includes(s), { timeout }, t);
}
async function clickText(page, t, tag = 'button') {
  const handle = await page.waitForFunction(
    (s, tg) => [...document.querySelectorAll(tg)].reverse().find((b) => b.innerText.trim().includes(s) && !b.disabled && b.offsetParent),
    { timeout: 8000 }, t, tag,
  );
  await handle.asElement().click();
}
async function login(page, email, password) {
  await page.goto(`${BASE}/entrar`, { waitUntil: 'networkidle0' });
  await page.type('input[type=email]', email);
  await page.type('input[type=password]', password);
  await clickText(page, 'Entrar');
}
async function fillAuthorization(page, a) {
  await setValue(page, '[name=teacher_name]', a.teacher ?? (await page.$eval('[name=teacher_name]', (e) => e.value)));
  await setValue(page, '[name=student_name]', a.student);
  await setValue(page, '[name=school_year]', a.year);
  await setValue(page, '[name=class_group]', a.group);
  if (a.date) await setValue(page, '[name=authorization_date]', a.date);
  if (a.time) await setValue(page, '[name=exit_time]', a.time);
  await setValue(page, '[name=reason]', a.reason);
  await setValue(page, '[name=notes]', a.notes ?? '');
}
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const daysAgo = (n) => { const d = new Date(today + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); };

// ====================================================================
const admin = await newPage();

await step('Rota protegida redireciona para login sem sessão', async () => {
  await admin.goto(`${BASE}/historico`, { waitUntil: 'networkidle0' });
  if (!admin.url().endsWith('/entrar')) throw new Error(admin.url());
  await admin.screenshot({ path: `${SHOTS}/01-login.png` });
});

await step('Login com senha errada mostra erro claro', async () => {
  await login(admin, 'coordenacao@escola.test', 'senhaErrada1');
  await waitText(admin, 'E-mail ou senha incorretos.');
});

await step('Login do administrador abre o painel', async () => {
  await login(admin, 'coordenacao@escola.test', 'Teste1234');
  await admin.waitForFunction(() => location.pathname !== '/entrar', { timeout: 8000 });
  await admin.goto(`${BASE}/`, { waitUntil: 'networkidle0' });
  await waitText(admin, 'Saídas hoje');
  const t = await text(admin);
  if (!t.includes('Usuários') || !t.includes('Relatórios') || !t.includes('Auditoria')) throw new Error('menu admin incompleto');
  await admin.screenshot({ path: `${SHOTS}/02-painel-vazio.png` });
});

await step('Admin cria professores pela tela Usuários (Edge Function)', async () => {
  for (const [name, email] of [['Paulo Professor Teste', 'paulo@escola.test'], ['Pedro Professor Teste', 'pedro@escola.test']]) {
    await admin.goto(`${BASE}/usuarios`, { waitUntil: 'networkidle0' });
    await clickText(admin, 'Novo usuário');
    await admin.waitForSelector('#new-user-form');
    const inputs = await admin.$$('#new-user-form input');
    await setValue(admin, '#new-user-form input:nth-of-type(1)', '');
    await inputs[0].type(name);
    await inputs[1].type(email);
    await admin.$eval('#new-user-form', () => {});
    // senha provisória conhecida
    await setValue(admin, '#new-user-form input[autocomplete=off]', 'Prof12345');
    if (email.startsWith('paulo')) await admin.screenshot({ path: `${SHOTS}/03-novo-usuario.png` });
    await clickText(admin, 'Criar usuário');
    await waitText(admin, 'Usuário criado');
    await waitText(admin, email);
  }
  await admin.screenshot({ path: `${SHOTS}/04-usuarios.png` });
});

await step('Validação do formulário bloqueia campos vazios', async () => {
  await admin.goto(`${BASE}/nova`, { waitUntil: 'networkidle0' });
  await admin.screenshot({ path: `${SHOTS}/05-nova-autorizacao.png` });
  await setValue(admin, '[name=teacher_name]', '');
  await clickText(admin, 'Registrar autorização');
  await waitText(admin, 'Informe o nome do professor.');
  const t = await text(admin);
  for (const m of ['Informe o nome do aluno.', 'Informe o ano escolar.', 'Informe a turma.', 'Selecione o motivo da saída.']) if (!t.includes(m)) throw new Error('faltou: ' + m);
  await admin.screenshot({ path: `${SHOTS}/06-validacao.png` });
});

await step('Motivo "Outro" exige observação; data futura bloqueada', async () => {
  await fillAuthorization(admin, { teacher: 'Marina Coordenação Teste', student: 'Lucas Andrade', year: '7º ano', group: 'a', reason: 'outro', date: daysAgo(-1) });
  await clickText(admin, 'Registrar autorização');
  await waitText(admin, 'Descreva o motivo da saída.');
  await waitText(admin, 'A data não pode estar no futuro.');
});

await step('Limpar formulário zera os campos', async () => {
  await clickText(admin, 'Limpar formulário');
  const v = await admin.$eval('[name=student_name]', (e) => e.value);
  if (v !== '') throw new Error('não limpou');
});

await step('Admin registra autorização com confirmação visual', async () => {
  await fillAuthorization(admin, { student: 'Lucas  Andrade  Souza', year: '7º ano', group: 'a', reason: 'outro', notes: 'Chamado pela secretaria', time: '08:40' });
  await clickText(admin, 'Registrar autorização');
  await waitText(admin, 'Autorização registrada com sucesso');
  const t = await text(admin);
  if (!t.includes('Lucas Andrade Souza') || !t.includes('7º ano A')) throw new Error('normalização/resumo');
  await admin.screenshot({ path: `${SHOTS}/07-sucesso.png` });
});

await step('Registros adicionais (vários motivos, turmas e datas)', async () => {
  const items = [
    { student: 'Beatriz Lima Rocha', year: '8º ano', group: 'B', reason: 'banheiro', time: '09:10' },
    { student: 'Carlos Eduardo Pires', year: '8º ano', group: 'B', reason: 'biblioteca', time: '10:05', date: daysAgo(1) },
    { student: 'Daniela Matos Silva', year: '9º ano', group: 'C', reason: 'setor_pedagogico', time: '11:20', date: daysAgo(3) },
  ];
  for (const it of items) {
    await clickText(admin, 'Registrar outra saída');
    await admin.waitForSelector('[name=student_name]');
    await fillAuthorization(admin, it);
    await clickText(admin, 'Registrar autorização');
    await waitText(admin, 'Autorização registrada com sucesso');
  }
});

// -------- Professor --------
const prof = await newPage(1920, 1080);
await step('Professor entra e vê menu sem área administrativa', async () => {
  await login(prof, 'paulo@escola.test', 'Prof12345');
  await waitText(prof, 'Saídas hoje');
  const t = await text(prof);
  if (t.includes('Auditoria') || t.includes('Relatórios\n')) throw new Error('professor vê admin');
});

await step('Professor não acessa rotas de administrador pela URL', async () => {
  for (const r of ['/relatorios', '/usuarios', '/auditoria']) {
    await prof.goto(`${BASE}${r}`, { waitUntil: 'networkidle0' });
    if (new URL(prof.url()).pathname !== '/') throw new Error(`acessou ${r}`);
  }
});

await step('Professor vê apenas os próprios registros (padrão)', async () => {
  await prof.goto(`${BASE}/historico`, { waitUntil: 'networkidle0' });
  await waitText(prof, 'Nenhuma autorização registrada');
});

await step('Professor registra autorização (nome do professor pré-preenchido)', async () => {
  await prof.goto(`${BASE}/nova`, { waitUntil: 'networkidle0' });
  const teacher = await prof.$eval('[name=teacher_name]', (e) => e.value);
  if (teacher !== 'Paulo Professor Teste') throw new Error('prefill: ' + teacher);
  await fillAuthorization(prof, { student: 'Eduarda Nunes Costa', year: '6º ano', group: 'A', reason: 'banheiro', time: '13:15' });
  await clickText(prof, 'Registrar autorização');
  await waitText(prof, 'Autorização registrada com sucesso');
  await prof.goto(`${BASE}/historico`, { waitUntil: 'networkidle0' });
  await waitText(prof, 'Eduarda Nunes Costa');
  const t = await text(prof);
  if (t.includes('Lucas Andrade Souza')) throw new Error('vê registro do admin');
  await prof.screenshot({ path: `${SHOTS}/08-historico-professor-1080p.png` });
});

await step('Professor não vê botões de editar/excluir', async () => {
  await clickText(prof, 'Eduarda Nunes Costa', 'tr');
  await waitText(prof, 'Detalhes da autorização');
  const t = await text(prof);
  if (t.includes('Editar') || t.includes('Excluir')) throw new Error('botões admin visíveis');
  await prof.keyboard.press('Escape');
});

await step('Banco compartilhado: admin (outro computador) vê o registro do professor', async () => {
  await admin.goto(`${BASE}/`, { waitUntil: 'networkidle0' });
  await waitText(admin, 'Eduarda Nunes Costa');
  await admin.screenshot({ path: `${SHOTS}/09-painel.png` });
});

await step('Permissão ampliada: professor passa a consultar todos', async () => {
  await admin.goto(`${BASE}/usuarios`, { waitUntil: 'networkidle0' });
  await clickText(admin, 'Todos os registros');
  await waitText(admin, 'Permissão atualizada');
  await prof.goto(`${BASE}/historico`, { waitUntil: 'networkidle0' });
  await waitText(prof, 'Lucas Andrade Souza');
  await clickText(prof, 'Somente registros feitos por mim', 'label');
  await prof.waitForFunction(() => !document.body.innerText.includes('Lucas Andrade Souza'), { timeout: 6000 });
  await clickText(admin, 'Somente os próprios registros');
  await waitText(admin, 'Permissão atualizada');
});

// -------- Histórico: pesquisa e filtros --------
await step('Pesquisa por aluno', async () => {
  await admin.goto(`${BASE}/historico`, { waitUntil: 'networkidle0' });
  await waitText(admin, '5 autorizações encontradas');
  await admin.screenshot({ path: `${SHOTS}/10-historico-admin.png` });
  await admin.type('#f-student', 'beatriz');
  await waitText(admin, '1 autorização encontrada');
  if ((await text(admin)).includes('Carlos Eduardo')) throw new Error('filtro aluno');
  await setValue(admin, '#f-student', '');
});
await step('Pesquisa por professor', async () => {
  await admin.type('#f-teacher', 'paulo');
  await waitText(admin, '1 autorização encontrada');
  await waitText(admin, 'Eduarda Nunes Costa');
  await setValue(admin, '#f-teacher', '');
  await waitText(admin, '5 autorizações encontradas');
});
await step('Filtro por turma', async () => {
  await setValue(admin, '#f-class', '8º ano|B');
  await waitText(admin, '2 autorizações encontradas');
  await setValue(admin, '#f-class', '');
});
await step('Filtro por motivo', async () => {
  await setValue(admin, '#f-reason', 'banheiro');
  await waitText(admin, '2 autorizações encontradas');
  await setValue(admin, '#f-reason', '');
});
await step('Filtro por data', async () => {
  await setValue(admin, '#f-from', daysAgo(1));
  await setValue(admin, '#f-to', daysAgo(1));
  await waitText(admin, '1 autorização encontrada');
  await waitText(admin, 'Carlos Eduardo Pires');
  await clickText(admin, 'Limpar filtros');
  await waitText(admin, '5 autorizações encontradas');
});
await step('Ordenação por data e horário (mais antigas / recentes)', async () => {
  const first = () => admin.$eval('tbody tr td:nth-child(2) p', (e) => e.innerText);
  if ((await first()) !== 'Eduarda Nunes Costa') throw new Error('desc: ' + (await first()));
  await admin.click('#f-sort');
  await admin.waitForFunction(() => document.querySelector('tbody tr td:nth-child(2) p')?.innerText === 'Daniela Matos Silva', { timeout: 5000 });
  await admin.click('#f-sort');
});

await step('Visualização detalhada', async () => {
  await clickText(admin, 'Beatriz Lima Rocha', 'tr');
  await waitText(admin, 'Detalhes da autorização');
  await admin.screenshot({ path: `${SHOTS}/11-detalhes.png` });
});

await step('Edição pelo administrador (com auditoria)', async () => {
  await clickText(admin, 'Editar');
  await admin.waitForSelector('[name=student_name]');
  await setValue(admin, '[name=student_name]', 'Beatriz Lima Rocha Alves');
  await setValue(admin, '[name=notes]', 'Retornou às 9h20');
  await admin.screenshot({ path: `${SHOTS}/12-edicao.png` });
  await clickText(admin, 'Salvar alterações');
  await waitText(admin, 'Autorização atualizada');
  await waitText(admin, 'Beatriz Lima Rocha Alves');
});

await step('Impressão da autorização (documento A4)', async () => {
  await clickText(admin, 'Beatriz Lima Rocha Alves', 'tr');
  await waitText(admin, 'Detalhes da autorização');
  await admin.evaluate(() => { window.__printed = 0; window.print = () => { window.__printed++; }; });
  await clickText(admin, 'Imprimir');
  await admin.waitForFunction(() => window.__printed === 1 && document.getElementById('print-root'), { timeout: 4000 });
  await admin.emulateMediaType('print');
  await admin.pdf({ path: 'testes/downloads/impressao-autorizacao.pdf', format: 'A4', printBackground: true });
  await admin.screenshot({ path: `${SHOTS}/13-impressao.png`, fullPage: true });
  await admin.emulateMediaType('screen');
  await admin.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await admin.keyboard.press('Escape');
});

await step('Exclusão com confirmação', async () => {
  await clickText(admin, 'Daniela Matos Silva', 'tr');
  await clickText(admin, 'Excluir');
  await waitText(admin, 'Excluir autorização?');
  await admin.screenshot({ path: `${SHOTS}/14-confirma-exclusao.png` });
  await clickText(admin, 'Excluir definitivamente');
  await waitText(admin, 'Autorização excluída');
  await waitText(admin, '4 autorizações encontradas');
});

// -------- Relatórios --------
await step('Relatórios: totais por dia, turma, professor e motivo', async () => {
  await admin.goto(`${BASE}/relatorios`, { waitUntil: 'networkidle0' });
  await clickText(admin, 'Últimos 7 dias');
  await waitText(admin, 'Por professor(a)');
  const t = await text(admin);
  for (const s of ['Total no período', '8º ano B', 'Paulo Professor Teste', 'Banheiro']) if (!t.includes(s)) throw new Error('faltou ' + s);
  await admin.screenshot({ path: `${SHOTS}/15-relatorios.png`, fullPage: true });
});
await step('Relatórios: filtro por período (mês anterior vazio)', async () => {
  await clickText(admin, 'Hoje');
  await waitText(admin, 'Total no período');
  await clickText(admin, 'Personalizado');
  await setValue(admin, '#r-start', '2020-01-01');
  await setValue(admin, '#r-end', '2020-01-31');
  await waitText(admin, 'Nenhuma autorização no período');
  await clickText(admin, 'Últimos 7 dias');
  await waitText(admin, 'Por turma');
});
await step('Exportação CSV e PDF', async () => {
  const cdp = await admin.createCDPSession();
  await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: 'testes/downloads' });
  await clickText(admin, 'Exportar CSV');
  await waitText(admin, 'O relatório em CSV foi baixado.');
  await clickText(admin, 'Exportar PDF');
  await waitText(admin, 'O relatório em PDF foi baixado.', 15000);
  await sleep(1500);
  const files = fs.readdirSync('testes/downloads');
  if (!files.some((f) => f.endsWith('.csv')) || !files.some((f) => f.startsWith('relatorio') && f.endsWith('.pdf'))) throw new Error(files.join(','));
});

await step('Auditoria registra criação, alteração e exclusão', async () => {
  await admin.goto(`${BASE}/auditoria`, { waitUntil: 'networkidle0' });
  await waitText(admin, 'Exclusão');
  const t = await text(admin);
  if (!t.includes('Alteração') || !t.includes('Criação')) throw new Error('eventos');
  await clickText(admin, 'Alteração');
  await admin.screenshot({ path: `${SHOTS}/16-auditoria.png` });
});

// -------- Senhas e contas --------
await step('Recuperação de senha por e-mail (link + nova senha + login)', async () => {
  const p = await newPage();
  fs.writeFileSync('testes/mail.jsonl', '');
  await p.goto(`${BASE}/esqueci-senha`, { waitUntil: 'networkidle0' });
  await p.type('input[type=email]', 'pedro@escola.test');
  await clickText(p, 'Enviar link');
  await waitText(p, 'Verifique seu e-mail');
  await sleep(1500);
  const mail = JSON.parse(fs.readFileSync('testes/mail.jsonl', 'utf8').trim().split('\n').pop());
  const link = mail.html.match(/href="([^"]+)"/)[1].replace(/&amp;/g, '&');
  await p.goto(link, { waitUntil: 'networkidle0' });
  await waitText(p, 'Criar nova senha');
  await p.waitForSelector('input[type=password]');
  await p.screenshot({ path: `${SHOTS}/17-nova-senha.png` });
  const [a, b] = await p.$$('input[type=password]');
  await a.type('NovaSenha99');
  await b.type('NovaSenha99');
  await clickText(p, 'Salvar nova senha');
  await p.waitForFunction(() => location.pathname === '/entrar', { timeout: 8000 });
  await login(p, 'pedro@escola.test', 'NovaSenha99');
  await waitText(p, 'Saídas hoje');
  await p.browserContext().close();
});

await step('Desativar usuário bloqueia o login', async () => {
  await admin.goto(`${BASE}/usuarios`, { waitUntil: 'networkidle0' });
  const btn = await admin.waitForFunction(() =>
    [...document.querySelectorAll('tr')].find((tr) => tr.innerText.includes('pedro@escola.test'))?.querySelector('button[aria-label="Desativar acesso"]'));
  await btn.asElement().click();
  await clickText(admin, 'Desativar');
  await waitText(admin, 'Usuário desativado');
  const p = await newPage();
  await login(p, 'pedro@escola.test', 'NovaSenha99');
  await waitText(p, 'desativada');
  await p.browserContext().close();
});

await step('Senha provisória definida pelo admin', async () => {
  const btn = await admin.waitForFunction(() =>
    [...document.querySelectorAll('tr')].find((tr) => tr.innerText.includes('paulo@escola.test'))?.querySelector('button[aria-label="Redefinir senha"]'));
  await btn.asElement().click();
  await waitText(admin, 'Definir senha provisória');
  const input = await admin.$('input[aria-label="Senha provisória"]');
  await setValue(admin, 'input[aria-label="Senha provisória"]', 'Troca5678');
  await clickText(admin, 'Definir');
  await waitText(admin, 'Senha provisória definida');
  const p = await newPage();
  await login(p, 'paulo@escola.test', 'Troca5678');
  await waitText(p, 'Saídas hoje');
  await p.browserContext().close();
});

await step('Último administrador não pode ser rebaixado', async () => {
  const btn = await admin.waitForFunction(() =>
    [...document.querySelectorAll('tr')].find((tr) => tr.innerText.includes('coordenacao@escola.test'))?.querySelector('button[aria-label="Editar nome e perfil"]'));
  await btn.asElement().click();
  await admin.waitForSelector('[role=dialog] select');
  await admin.select('[role=dialog] select', 'professor');
  await clickText(admin, 'Salvar');
  await waitText(admin, 'pelo menos um administrador ativo');
  await admin.keyboard.press('Escape');
});

await step('Sair da conta encerra a sessão', async () => {
  await clickText(admin, 'Sair da conta');
  await clickText(admin, 'Sair');
  await admin.waitForFunction(() => location.pathname === '/entrar', { timeout: 6000 });
  await admin.goto(`${BASE}/`, { waitUntil: 'networkidle0' });
  if (!admin.url().endsWith('/entrar')) throw new Error('sessão continuou');
});

await step('Layout 1920x1080 do painel', async () => {
  const p = await newPage(1920, 1080);
  await login(p, 'coordenacao@escola.test', 'Teste1234');
  await waitText(p, 'Últimas autorizações');
  await sleep(500);
  await p.screenshot({ path: `${SHOTS}/18-painel-1080p.png` });
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (overflow) throw new Error('rolagem horizontal');
});

await browser.close();
const failed = results.filter((r) => r[0] === 'FAIL');
console.log(`\n${results.length - failed.length}/${results.length} testes passaram`);
fs.writeFileSync('testes/resultado-e2e.json', JSON.stringify(results, null, 2));
process.exit(failed.length ? 1 : 0);
