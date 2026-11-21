const SUPABASE_URL = 'https://ewwuryyxuclzbrmeofhe.supabase.co';
const SUPABASE_KEY = 'sb_publishable_thljmXVSK9bkqDysfUmNgA_DF3orVZS';
const $ = id => document.getElementById(id);

if (!window.supabase) {
  $('mAuth').textContent = 'Não foi possível carregar o sistema. Verifique sua internet e atualize a página.';
  $('mAuth').className = 'msg err';
  throw new Error('supabase-js não carregou');
}
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let modo = 'entrar', usuario = null, ehAdmin = false, cfg = {}, trilhas = [], instalarEvt = null;

// ---------- utilidades ----------
// nome do arquivo que o aluno recebe ao baixar ou salvar em PDF
const nomeArq = i => ['Haroldo Concurso', i.disciplina, String(i.titulo || 'Material').replace(/:\s*/g, ' - ')].filter(Boolean).join(' - ').replace(/[\\/?*"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hoje = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d };
const dataLocal = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) };
const addDias = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x };
const fmt = d => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const diasAte = s => Math.round((dataLocal(s) - hoje()) / 864e5);
function toast(t) { const e = document.createElement('div'); e.className = 'toast'; e.textContent = t; document.body.appendChild(e); setTimeout(() => e.remove(), 2800) }
async function copiar(t) { try { await navigator.clipboard.writeText(t); toast('Copiado!') } catch { prompt('Copie:', t) } }

// ---------- AMOSTRA GRÁTIS (visitante sem cadastro) ----------
const WA_DEMO = 'https://wa.me/5565996818656?text=' + encodeURIComponent('Oi Haroldo! Vi a amostra grátis da Turma Carreiras Policiais e quero assinar.');
const Demo = {
  ativo: false, itens: null, abertas: { 1: true },
  ctx: { d: { feitos: new Set() } },
  async abrir() {
    if (usuario) return;
    this.ativo = true;
    document.body.classList.remove('login');
    $('auth').classList.add('hidden'); $('app').classList.remove('hidden');
    $('hello').textContent = 'Amostra grátis'; $('ttl').textContent = 'Conheça a Turma';
    $('bPainel').classList.add('hidden'); $('bSair').textContent = 'Entrar';
    $('nav').classList.add('hidden'); $('prog').classList.add('hidden');
    window.scrollTo(0, 0);
    const c = $('conteudo');
    if (!this.itens) {
      c.innerHTML = '<div class="spin">Carregando…</div>';
      const { data, error } = await sb.from('materiais').select('id,semana_id,dia,disciplina,categoria,titulo,ordem,storage_path').eq('amostra', true);
      if (error) { c.innerHTML = '<div class="empty"><p>Não foi possível carregar a amostra. Verifique sua internet e tente de novo.</p></div>'; return }
      this.itens = data || [];
    }
    if (this.ativo) this.render();
  },
  sair(modo) {
    this.ativo = false; $('bSair').textContent = 'Sair';
    if (location.hash === '#amostra') history.replaceState(null, '', location.pathname + location.search);
    document.body.classList.add('login'); $('app').classList.add('hidden'); $('auth').classList.remove('hidden');
    if (modo) setModo(modo);
    window.scrollTo(0, 0);
  },
  cta(final) {
    if (usuario) return '';
    return `<div class="cta ${final ? 'final' : ''}"><div class="cta-k">GOSTOU?</div><h3>Libere a trilha completa</h3>
      <p>Assinatura mensal de <b>R$ 49,90</b> no Pix. Uma semana nova de estudos por vez, do Dia 1 ao simulado.</p>
      <ol><li>Crie sua conta</li><li>Faça o Pix</li><li>O Haroldo libera seu acesso</li></ol>
      <button class="btn" data-assinar>Criar minha conta</button>
      <a class="wa" href="${WA_DEMO}" target="_blank" rel="noopener">Tirar dúvidas no WhatsApp</a></div>`;
  },
  render() {
    const c = $('conteudo'), its = this.itens;
    const como = [
      ['🗓️', 'Uma semana por vez', 'Do Dia 1 ao Dia 5, cerca de 4 horas por dia, com 2 disciplinas. No Dia 6, o simulado semanal.'],
      ['📘', 'Aula Completa', 'Teoria aprofundada no conteúdo do edital, com o texto da lei transcrito, jurisprudência separada e esquemas visuais. Leia no celular ou baixe em PDF.'],
      ['✍️', 'Questões comentadas', 'Inéditas, no estilo da UFMT. Cada comentário é uma mini aula: por que a certa está certa, por que cada errada está errada, como a banca cobra e onde está a armadilha.'],
      ['🃏', 'Flashcards', 'Revisão ativa da aula: cada card volta em 1, 3, 7, 15 e 30 dias, conforme você acerta.'],
      ['🧠', 'Mapa mental', 'O resumo visual de cada aula, para revisar rápido.'],
      ['🏆', 'Simulado semanal', '50 questões em 2h30 cronometradas, com nota por disciplina e gabarito comentado. Toda semana tem um novo.']
    ];
    const blocoDia = d => {
      const di = its.filter(i => i.dia === d);
      if (d >= 3 && d <= 5) return `<div class="dia lock"><div class="btnhead"><div class="ddot"><small>DIA</small>${d}</div>
        <div class="dinfo"><div class="dlbl">Dia ${d}</div><div class="wd">Aula, questões e flashcards de mais 2 disciplinas</div></div>
        <div class="dright"><span class="dpill soon">🔒 Assinantes</span></div></div></div>`;
      const aberto = this.abertas[d] ?? false;
      const discs = [...new Set(di.map(i => i.disciplina))];
      const chips = d === 6 ? '<span class="dchip sim">🏆 Simulado semanal · 2h30</span>' : discs.map(dn => `<span class="dchip" style="--dc:${corDisc(dn)}">${esc(dn)}</span>`).join('');
      let corpo = '';
      if (aberto) {
        if (d === 6) corpo = `<div class="rot">⏱ 50 questões das disciplinas da semana, em 2h30. Faça sem consulta, como no dia da prova: o gabarito comentado aparece depois que você entregar.</div>` + di.map(i => Aluno.item.call(this.ctx, i)).join('');
        else corpo = `<div class="rot">⏱ Cerca de 4h · comece pela revisão dos flashcards do dia anterior e depois estude as 2 disciplinas (aula + questões).</div>` + discs.map(dn => {
          const dd = di.filter(i => i.disciplina === dn), mapa = dd.find(i => i.categoria === 'mapa');
          const princ = dd.filter(i => i.categoria !== 'mapa').sort((a, b) => ORDEM_CAT.indexOf(a.categoria) - ORDEM_CAT.indexOf(b.categoria) || a.ordem - b.ordem);
          return `<div class="dsec" style="--dc:${corDisc(dn)}"><div class="disc-h"><i></i>${esc(dn)}</div>` + princ.map(i => Aluno.item.call(this.ctx, i, i.categoria === 'aula' ? mapa : null)).join('') + '</div>';
        }).join('');
      }
      return `<div class="dia ${d === 6 ? 'd6' : ''} ${aberto ? 'aberto' : ''}"><button class="btnhead" data-dtog="${d}">
        <div class="ddot"><small>DIA</small>${d}</div>
        <div class="dinfo"><div class="dlbl">Dia ${d}</div><div class="dchips">${chips}</div></div>
        <div class="dright"><span class="dpill hoje">Grátis</span><span class="seta">${aberto ? '▴' : '▾'}</span></div></button>${corpo}</div>`;
    };
    c.innerHTML = `<div class="demo">
      <div class="dhero"><div class="cta-k">TURMA CARREIRAS POLICIAIS · PJC-MT</div>
        <h2>Experimente antes de assinar</h2>
        <p>O <b>Dia 1</b>, o <b>Dia 2</b> e o <b>simulado semanal</b> da Semana 1 estão abertos para você, sem cadastro. Use do mesmo jeito que o aluno usa: leia a aula, resolva as questões, pratique os flashcards e faça o simulado.</p>
        <small>Preparação para Escrivão e Investigador (edital UFMT), com material feito pelo Haroldo, aprovado na Polícia Penal e na Polícia Civil.</small></div>
      <div class="sec">Como funciona</div>
      <div class="card comof">${como.map(([ic, t, d]) => `<div class="cf"><span>${ic}</span><div><b>${t}</b><p>${d}</p></div></div>`).join('')}
        <div class="cf-ext">Na área do assinante você também tem: progresso da semana, <b>revisão do dia</b>, <b>caderno de erros</b>, <b>edital vivo</b> (marca os tópicos que já estudou) e legislação.</div></div>
      <div class="sec">Semana 1 · amostra</div>
      <div class="wd" style="margin:-4px 4px 10px">Toque em um dia para abrir. Nesta amostra, suas respostas não ficam salvas.</div>
      <div class="dias">${[1, 2, 3, 4, 5, 6].map(blocoDia).join('')}</div>
      ${this.cta(true)}</div>`;
    c.querySelectorAll('[data-dtog]').forEach(b => b.onclick = () => { const d = +b.dataset.dtog; this.abertas[d] = !(this.abertas[d] ?? false); this.render() });
    c.querySelectorAll('[data-aula]').forEach(b => b.onclick = () => Aula.abrir(b.dataset.aula, b.dataset.t, b.dataset.n));
    c.querySelectorAll('[data-jogo]').forEach(b => b.onclick = () => b.dataset.jogo === 'flashcards' ? Flash.abrir(b.dataset.sem, b.dataset.mat) : b.dataset.jogo === 'simulado' ? Prova.abrir(b.dataset.mat) : Quiz.abrir(b.dataset.sem, b.dataset.mat, false));
  }
};
document.addEventListener('click', e => {
  if (!e.target.closest('[data-assinar]')) return;
  if (!$('jogo').classList.contains('hidden')) Jogo.fechar();
  Demo.sair('criar');
});

// ---------- login ----------
function setModo(m) {
  modo = m;
  $('tEntrar').classList.toggle('on', m === 'entrar');
  $('tCriar').classList.toggle('on', m === 'criar');
  $('campos-cad').classList.toggle('hidden', m !== 'criar');
  $('bAuth').textContent = m === 'entrar' ? 'Entrar' : 'Criar minha conta';
  $('senha').autocomplete = m === 'entrar' ? 'current-password' : 'new-password';
  msg('');
}
function msg(t, tipo) { const e = $('mAuth'); e.textContent = t; e.className = 'msg ' + (tipo || '') }
$('tEntrar').onclick = () => setModo('entrar');
$('tCriar').onclick = () => setModo('criar');

$('fAuth').onsubmit = async e => {
  e.preventDefault();
  const email = $('email').value.trim(), senha = $('senha').value;
  $('bAuth').disabled = true;
  try {
    if (modo === 'criar') {
      const nome = $('nome').value.trim(), whatsapp = $('whats').value.trim();
      if (!nome) { msg('Digite seu nome completo.', 'err'); return }
      const { data, error } = await sb.auth.signUp({ email, password: senha, options: { data: { nome, whatsapp }, emailRedirectTo: location.origin + location.pathname } });
      if (error) throw error;
      if (!data.session) { msg('Conta criada! Confira seu e-mail para confirmar e depois entre aqui.', 'ok'); setModo('entrar'); return }
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password: senha });
      if (error) throw error;
    }
  } catch (err) {
    const t = String(err.message || err);
    msg(t.includes('Invalid login') ? 'E-mail ou senha incorretos.' : t.includes('already registered') ? 'Esse e-mail já tem conta. Use a aba Entrar.' : t.includes('Password should') ? 'A senha precisa ter pelo menos 6 caracteres.' : 'Não deu certo: ' + t, 'err');
  } finally { $('bAuth').disabled = false }
};

$('bEsqueci').onclick = async () => {
  const email = $('email').value.trim();
  if (!email) { msg('Digite seu e-mail acima e toque em "Esqueci minha senha" de novo.', 'err'); return }
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
  msg(error ? 'Não deu certo: ' + error.message : 'Enviamos um link para redefinir a senha no seu e-mail.', error ? 'err' : 'ok');
};

$('bSair').onclick = () => Demo.ativo ? Demo.sair('entrar') : sb.auth.signOut();
$('bPainel').onclick = () => { location.hash = location.hash === '#painel' ? '#a-inicio' : '#painel' };
document.querySelectorAll('#nav [data-nav]').forEach(b => b.onclick = () => Aluno.ir(b.dataset.nav));
window.addEventListener('hashchange', () => usuario ? rotear() : location.hash === '#amostra' ? Demo.abrir() : Demo.ativo && Demo.sair());

sb.auth.onAuthStateChange(async (ev, session) => {
  if (ev === 'PASSWORD_RECOVERY') {
    const nova = prompt('Digite sua nova senha (mínimo 6 caracteres):');
    if (nova) { const { error } = await sb.auth.updateUser({ password: nova }); toast(error ? 'Erro: ' + error.message : 'Senha alterada!') }
  }
  document.body.classList.toggle('login', !session);
  const novo = session?.user?.id !== usuario?.id;
  usuario = session?.user || null;
  if (session) {
    $('auth').classList.add('hidden'); $('app').classList.remove('hidden');
    if (novo) iniciar();
  } else if (location.hash === '#amostra') Demo.abrir();
  else { Demo.ativo = false; $('app').classList.add('hidden'); $('auth').classList.remove('hidden') }
});
$('bDemo').onclick = () => { location.hash = '#amostra'; Demo.abrir() };

async function iniciar() {
  const nome = (usuario.user_metadata?.nome || '').split(' ')[0];
  $('hello').textContent = nome ? 'Olá, ' + nome : 'Olá!';
  const [{ data: ad }, { data: c }] = await Promise.all([
    sb.from('admins').select('user_id').eq('user_id', usuario.id).maybeSingle(),
    sb.from('config').select('*').maybeSingle()
  ]);
  ehAdmin = !!ad; cfg = c || {};
  $('bPainel').classList.toggle('hidden', !ehAdmin);
  rotear();
}
function rotear() {
  if (location.hash === '#painel' && ehAdmin) { $('bPainel').textContent = 'Área do aluno'; Painel.abrir() }
  else { $('bPainel').textContent = 'Painel'; carregarAluno() }
}

// ---------- área do aluno ----------
const CAT = {
  aula: ['📘', 'Aula Completa'], legislacao: ['⚖️', 'Legislação esquematizada'], mapa: ['🧠', 'Mapa mental'],
  questoes: ['✍️', 'Questões comentadas'], flashcards: ['🃏', 'Flashcards'], simulado: ['🏆', 'Simulado'], extra: ['📎', 'Material extra']
};
const ORDEM_CAT = ['aula', 'legislacao', 'mapa', 'questoes', 'flashcards', 'simulado', 'extra'];
const EXTRAS = ['mapa', 'extra'];
const DIA_NOME = { 6: 'Simulado da semana' };
const CORES_DISC = { 'Língua Portuguesa': '#2F6FB2', 'Direito Penal': '#B3261E', 'Processo Penal': '#8E3B8E', 'Direito Constitucional': '#1E7A4F', 'Direito Administrativo': '#C97A1F', 'Informática': '#0E8A8A', 'Raciocínio Lógico': '#5B4FC9' };
const corDisc = n => CORES_DISC[n] || ['#2F6FB2', '#1E7A4F', '#C97A1F', '#8E3B8E', '#0E8A8A', '#5B4FC9', '#B3261E'][[...String(n)].reduce((a, c) => a + c.charCodeAt(0), 0) % 7];
// semanas liberadas + aulas reaproveitadas de outros cursos (catálogo)
const filtroLib = (q, sem, mats) => mats && mats.length ? q.or(`semana_id.in.(${sem.join(',')}),material_id.in.(${mats.join(',')})`) : q.in('semana_id', sem);
const ls = { get: k => { try { return localStorage.getItem(k) } catch { return null } }, set: (k, v) => { try { localStorage.setItem(k, v) } catch { } } };

function cartaoInstalar() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const instalado = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (instalado || (!instalarEvt && !ios)) return '';
  return `<div class="install"><img src="icon-192.png" alt=""><div><b>Instale o app da Turma</b><br>${ios ? 'Toque em Compartilhar e depois em "Adicionar à Tela de Início".' : 'Acesse com um toque, direto da tela inicial.'}</div>${ios ? '' : '<button class="dl" style="background:var(--gold);color:var(--navy)" id="bInstalar">Instalar</button>'}</div>`;
}
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); instalarEvt = e; if (usuario && Aluno.d && Aluno.aba === 'inicio') Aluno.render() });
function ligarCopia(root) { root.querySelectorAll('[data-copia]').forEach(b => b.onclick = () => copiar(b.dataset.copia)) }
function ligarInstalar() { const b = $('bInstalar'); if (b) b.onclick = async () => { if (!instalarEvt) return; instalarEvt.prompt(); await instalarEvt.userChoice; instalarEvt = null; b.closest('.install').remove() } }
function carregarAluno() { Aluno.iniciar() }

const Aluno = {
  aba: 'inicio', d: null, trilha: null, filtro: 'todos', abertas: {},

  async iniciar() {
    const c = $('conteudo'); c.innerHTML = '<div class="spin">Carregando…</div>';
    $('prog').classList.add('hidden'); $('nav').classList.add('hidden');
    const { data: mats, error } = await sb.from('matriculas').select('id,inicio,ativo,vence_em,trilha_id').eq('user_id', usuario.id);
    if (error) { c.innerHTML = '<div class="empty"><p>Erro ao carregar: ' + esc(error.message) + '</p></div>'; return }
    const validas = (mats || []).filter(m => m.ativo && (!m.vence_em || diasAte(m.vence_em) >= 0));
    if (!validas.length) return this.semAcesso((mats || []).length > 0);
    const { data: tr } = await sb.from('trilhas').select('id,nome,descricao,ordem').order('ordem');
    trilhas = (tr || []).map(t => ({ ...t, mat: validas.find(m => m.trilha_id === t.id) })).filter(t => t.mat);
    const salva = ls.get('trilha');
    this.trilha = trilhas.find(t => t.id === salva) || trilhas[0];
    await this.carregar();
    if (location.hash.startsWith('#a-')) this.aba = location.hash.slice(3);
    this.render();
  },

  semAcesso(pausada) {
    $('ttl').textContent = pausada ? 'Acesso pausado' : 'Quase lá!';
    const txt = encodeURIComponent(pausada ? 'Oi Haroldo! Quero renovar meu acesso à Turma (' + usuario.email + ').' : 'Oi Haroldo! Criei minha conta na Turma (' + usuario.email + '). Pode liberar meu acesso?');
    const c = $('conteudo');
    c.innerHTML = `<div class="empty card"><h3>${pausada ? 'Sua mensalidade venceu' : 'Cadastro recebido ✅'}</h3>
      <p>${pausada ? 'Para continuar estudando, faça o Pix da mensalidade e envie o comprovante ao Haroldo.' : 'Agora é só o Haroldo confirmar seu pagamento e liberar sua trilha.'}</p>
      ${cfg.chave_pix ? `<div class="alerta venc" style="margin-top:16px;text-align:left">Pix (${esc(cfg.valor_mensal || '')}): <div class="pix"><code>${esc(cfg.chave_pix)}</code><button class="dl" data-copia="${esc(cfg.chave_pix)}">Copiar</button></div>${cfg.nome_pix ? '<div style="margin-top:6px">Nome: ' + esc(cfg.nome_pix) + '</div>' : ''}</div>` : ''}
      <a class="wa" href="https://wa.me/${esc(cfg.whatsapp || '5565996818656')}?text=${txt}" target="_blank" rel="noopener">Falar com o Haroldo no WhatsApp</a></div>`;
    ligarCopia(c);
  },

  async carregar() {
    const t = this.trilha;
    const [sem, mt, av, pm, ed, lei, lk] = await Promise.all([
      sb.from('semanas').select('id,numero,titulo,descricao,dias_para_liberar,plano').eq('trilha_id', t.id).order('numero'),
      sb.from('materiais').select('id,semana_id,titulo,categoria,ordem,storage_path,dia,disciplina').order('ordem'),
      sb.from('avisos').select('id,titulo,texto,link,trilha_id,criado_em').eq('ativo', true).or(`trilha_id.is.null,trilha_id.eq.${t.id}`).order('criado_em', { ascending: false }).limit(10),
      sb.from('progresso_materiais').select('material_id,concluido_em').eq('user_id', usuario.id),
      sb.from('editais').select('id,nome,data_prova').eq('trilha_id', t.id).limit(1).maybeSingle(),
      sb.from('leis').select('id,grupo,nome,numero,url_oficial,ordem,conferida_em').or(`trilha_id.is.null,trilha_id.eq.${t.id}`).order('ordem'),
      sb.from('semana_materiais').select('semana_id,material_id,dia,ordem')
    ]);
    const porId = new Map((mt.data || []).map(m => [m.id, m]));
    const ini = dataLocal(t.mat.inicio), h = hoje();
    const feitos = new Set((pm.data || []).map(x => x.material_id));
    const semanas = (sem.data || []).map(s => {
      const lib = addDias(ini, s.dias_para_liberar);
      const ligados = (lk.data || []).filter(l => l.semana_id === s.id && porId.has(l.material_id)).map(l => ({ ...porId.get(l.material_id), dia: l.dia ?? porId.get(l.material_id).dia, ordem: l.ordem ?? 0, ligado: true }));
      const itens = (mt.data || []).filter(m => m.semana_id === s.id).concat(ligados).sort((a, b) => ORDEM_CAT.indexOf(a.categoria) - ORDEM_CAT.indexOf(b.categoria) || a.ordem - b.ordem);
      const aberta = h >= lib;
      const conta = itens.filter(i => !EXTRAS.includes(i.categoria));
      const feitosN = conta.filter(i => feitos.has(i.id)).length;
      return { ...s, lib, aberta, itens, conta, feitosN, concluida: aberta && conta.length > 0 && feitosN === conta.length };
    });
    let edital = null;
    if (ed.data) {
      const [di, to, st, pt] = await Promise.all([
        sb.from('edital_disciplinas').select('id,nome,ordem').eq('edital_id', ed.data.id).order('ordem'),
        sb.from('edital_topicos').select('id,disciplina_id,texto,ordem').order('ordem'),
        sb.from('semana_topicos').select('semana_id,topico_id'),
        sb.from('progresso_topicos').select('topico_id').eq('user_id', usuario.id)
      ]);
      const concl = new Set(semanas.filter(s => s.concluida).map(s => s.id));
      const auto = new Set((st.data || []).filter(x => concl.has(x.semana_id)).map(x => x.topico_id));
      const manual = new Set((pt.data || []).map(x => x.topico_id));
      const disc = (di.data || []).map(d => {
        const tops = (to.data || []).filter(x => x.disciplina_id === d.id).map(x => ({ ...x, auto: auto.has(x.id), manual: manual.has(x.id) }));
        const ok = tops.filter(x => x.auto || x.manual).length;
        return { ...d, tops, ok, pct: tops.length ? Math.round(ok / tops.length * 100) : 0 };
      });
      const total = disc.reduce((a, d) => a + d.tops.length, 0), ok = disc.reduce((a, d) => a + d.ok, 0);
      edital = { ...ed.data, disc, total, ok, pct: total ? Math.round(ok / total * 100) : 0 };
    }
    const libIds = semanas.filter(s => s.aberta).map(s => s.id);
    const libLig = semanas.filter(s => s.aberta).flatMap(s => s.itens.filter(i => i.ligado).map(i => i.id));
    const [fc, rv, er] = await Promise.all([
      libIds.length ? filtroLib(sb.from('flashcards').select('id,semana_id'), libIds, libLig) : { data: [] },
      sb.from('flash_revisao').select('card_id,proxima').eq('user_id', usuario.id),
      sb.from('respostas').select('questao_id').eq('user_id', usuario.id).eq('acertou', false)
    ]);
    const prox = new Map((rv.data || []).map(r => [r.card_id, r.proxima]));
    const hojeIso = iso(hoje());
    const devidos = (fc.data || []).filter(c => !prox.has(c.id) || prox.get(c.id) <= hojeIso);
    this.d = { semanas, leis: lei.data || [], avisos: av.data || [], feitos, edital, revisar: devidos.filter(c => prox.has(c.id)).length, novos: devidos.filter(c => !prox.has(c.id)).length, erros: (er.data || []).length, libIds, libLig };
  },

  ir(aba, doVoltar) { if (!doVoltar && aba !== this.aba) history.pushState({ aba }, '', '#a-' + aba); this.aba = aba; this.render(); window.scrollTo(0, 0) },

  render() {
    const { semanas } = this.d;
    const abertas = semanas.filter(s => s.aberta);
    this.atual = abertas[abertas.length - 1] || null;
    $('nav').classList.remove('hidden');
    $('nav').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.nav === this.aba));
    const titulos = { inicio: 'Sua semana de estudos', materiais: 'Seus materiais', edital: 'Edital vivo', conta: 'Minha conta', leis: 'Legislação' };
    $('ttl').textContent = titulos[this.aba];
    $('prog').classList.add('hidden');
    const c = $('conteudo');
    c.innerHTML = (trilhas.length > 1 ? `<div class="pf" style="margin-bottom:12px"><select id="selTrilha">${trilhas.map(t => `<option value="${t.id}" ${t.id === this.trilha.id ? 'selected' : ''}>${esc(t.nome)}</option>`).join('')}</select></div>` : '') + this['tela_' + this.aba]();
    if ($('selTrilha')) $('selTrilha').onchange = async e => { this.trilha = trilhas.find(t => t.id === e.target.value); ls.set('trilha', this.trilha.id); c.innerHTML = '<div class="spin">Carregando…</div>'; await this.carregar(); this.render() };
    this.ligar(c);
  },

  // --- componentes
  item(i, mapa) {
    const [ic, nome] = CAT[i.categoria] || CAT.extra, feito = this.d.feitos.has(i.id);
    return `<div class="item ${feito ? 'feito' : ''}">
      <button class="chk" data-feito="${i.id}" aria-label="Marcar como concluído">${feito ? '✓' : ''}</button>
      <div class="itx"><div class="icat">${ic} ${nome}</div><div class="inm">${esc(i.titulo)}</div></div>
      <div class="mb">${!i.storage_path && (i.categoria === 'questoes' || i.categoria === 'flashcards' || i.categoria === 'simulado')
        ? `<button class="dl gold" data-jogo="${i.categoria}" data-sem="${i.semana_id}" data-mat="${i.id}">${i.categoria === 'questoes' ? 'Resolver' : i.categoria === 'simulado' ? 'Fazer simulado' : 'Praticar'}</button>`
        : !i.storage_path ? `<button class="dl gold" data-aula="${i.id}" data-t="${esc(i.titulo)}" data-n="${esc(nomeArq(i))}">Ler aula</button>`
        : `<button class="dl" data-ler="${i.id}" data-t="${esc(i.titulo)}" data-n="${esc(nomeArq(i))}">Abrir</button><button class="dl alt ico" data-baixar="${i.id}" data-t="${esc(i.titulo)}" data-n="${esc(nomeArq(i))}" aria-label="Baixar">⬇</button>`}</div></div>
      ${mapa ? `<div class="extra"><span>🧠 Mapa mental <em>(extra)</em></span>${mapa.storage_path ? `<button class="dl alt" data-ler="${mapa.id}" data-t="${esc(mapa.titulo)}" data-n="${esc(nomeArq(mapa))}">Ver</button><button class="dl alt ico" data-baixar="${mapa.id}" data-t="${esc(mapa.titulo)}" data-n="${esc(nomeArq(mapa))}" aria-label="Baixar">⬇</button>` : `<button class="dl alt" data-aula="${mapa.id}" data-t="${esc(mapa.titulo)}" data-n="${esc(nomeArq(mapa))}">Ver</button>`}</div>` : ''}`;
  },
  // semana organizada em dias, com 2 disciplinas por dia
  dias(s) {
    const temDia = s.itens.some(i => i.dia) || !!s.plano;
    if (!temDia) return s.itens.map(i => this.item(i)).join('');
    const fe = this.d.feitos, html = [];
    const prox = this.proxDia(s);
    for (let d = 1; d <= 6; d++) {
      const its = s.itens.filter(i => i.dia === d);
      const conta = its.filter(i => !EXTRAS.includes(i.categoria));
      const feitosD = conta.filter(i => fe.has(i.id)).length;
      const plano = d === 6 ? [] : ((s.plano && s.plano[d]) || []);
      const discs = d === 6 ? [] : [...new Set([...plano, ...its.map(i => i.disciplina || 'Geral')])];
      const ok = conta.length && feitosD === conta.length;
      const k = 'd' + s.id + d, aberto = this.abertas[k] ?? (d === prox);
      const estado = ok ? 'ok' : d === prox ? 'hoje' : '';
      const pill = ok ? '<span class="dpill ok">✓ Concluído</span>' : d === prox ? '<span class="dpill hoje">Hoje</span>' : conta.length ? `<span class="dpill">${feitosD}/${conta.length}</span>` : '<span class="dpill soon">Em breve</span>';
      const chips = d === 6 ? '<span class="dchip sim">🏆 Simulado semanal · 2h30</span>' : discs.map(dn => `<span class="dchip" style="--dc:${corDisc(dn)}">${esc(dn)}</span>`).join('');
      let corpo = '';
      if (aberto) {
        if (!its.length) corpo = '<div class="wd dvazio">📦 O material deste dia está sendo preparado.</div>';
        else if (d === 6) corpo = `<div class="rot">⏱ Reserve 2h30 sem interrupção. O gabarito comentado aparece depois que você entregar.</div>` + its.map(i => this.item(i)).join('');
        else corpo = `<div class="rot">⏱ Cerca de 4h · comece pela revisão dos flashcards e depois estude as 2 disciplinas (aula + questões).</div>` + discs.map(dn => {
          const di = its.filter(i => (i.disciplina || 'Geral') === dn);
          const cor = corDisc(dn);
          if (!di.length) return `<div class="dsec" style="--dc:${cor}"><div class="disc-h"><i></i>${esc(dn)}</div><div class="wd" style="margin:4px 0 2px">📦 Material em preparação.</div></div>`;
          const mapas = di.filter(i => i.categoria === 'mapa');
          const princ = di.filter(i => i.categoria !== 'mapa').sort((a, b) => ORDEM_CAT.indexOf(a.categoria) - ORDEM_CAT.indexOf(b.categoria) || a.ordem - b.ordem);
          const cf = princ.filter(i => fe.has(i.id)).length;
          let usado = false;
          return `<div class="dsec" style="--dc:${cor}"><div class="disc-h"><i></i>${esc(dn)}<span>${cf}/${princ.length}</span></div>` + princ.map(i => { const m = !usado && i.categoria === 'aula' ? mapas[0] : null; if (m) usado = true; return this.item(i, m) }).join('') + (!usado ? mapas.map(m => this.item(m)).join('') : '') + '</div>';
        }).join('');
      }
      const pct = conta.length ? Math.round(feitosD / conta.length * 100) : 0;
      html.push(`<div class="dia ${estado} ${d === 6 ? 'd6' : ''} ${aberto ? 'aberto' : ''}"><button class="btnhead" data-toggle="${k}">
        <div class="ddot"><small>DIA</small>${ok ? '✓' : d}</div>
        <div class="dinfo"><div class="dlbl">Dia ${d}</div><div class="dchips">${chips}</div></div>
        <div class="dright">${pill}<span class="seta">${aberto ? '▴' : '▾'}</span></div></button>
        ${conta.length && !ok ? `<div class="dbar"><div style="width:${pct}%"></div></div>` : ''}${corpo}</div>`);
    }
    const sem = s.itens.filter(i => !i.dia);
    if (sem.length) html.push(`<div class="disc-h" style="margin-top:14px">Extras da semana</div>` + sem.map(i => this.item(i)).join(''));
    return `<div class="dias">${html.join('')}</div>`;
  },
  proxDia(s) {
    for (let d = 1; d <= 6; d++) { const c = s.itens.filter(i => i.dia === d && !EXTRAS.includes(i.categoria)); if (c.length && !c.every(i => this.d.feitos.has(i.id))) return d }
    return 0;
  },
  barra(pct, txt) { return `<div class="pbar"><div style="width:${pct}%"></div></div>${txt ? `<div class="ptxt">${txt}</div>` : ''}` },
  vencimento() {
    const m = this.trilha.mat; if (!m.vence_em) return '';
    const d = diasAte(m.vence_em), urg = d <= 5, ab = this.renovarAberto || urg;
    const tz = encodeURIComponent('Oi Haroldo! Fiz o Pix da renovação da Turma (' + usuario.email + '). Segue o comprovante:');
    return `<div class="assin ${urg ? 'urg' : ''}"><button class="assin-h" id="bRenovar">
      <span class="assin-ic">${urg ? '⏰' : '✅'}</span><div style="flex:1;text-align:left"><b>${urg ? (d === 0 ? 'Sua assinatura vence hoje' : `Sua assinatura vence em ${d} dia${d > 1 ? 's' : ''}`) : 'Assinatura ativa'}</b><small>válida até ${dataLocal(m.vence_em).toLocaleDateString('pt-BR')}${urg ? '' : ` · faltam ${d} dias`}</small></div>
      <span class="assin-btn">${ab ? 'Fechar' : 'Renovar'}</span></button>
      ${ab ? `<div class="assin-c">${cfg.chave_pix ? `<div>Renove com Pix (${esc(cfg.valor_mensal || '')}):</div><div class="pix"><code>${esc(cfg.chave_pix)}</code><button class="dl" data-copia="${esc(cfg.chave_pix)}">Copiar Pix</button></div>${cfg.nome_pix ? `<div class="wd">Nome: ${esc(cfg.nome_pix)}</div>` : ''}` : '<div>Fale com o Haroldo para receber os dados do Pix.</div>'}
        <a class="wa" href="https://wa.me/${esc(cfg.whatsapp || '5565996818656')}?text=${tz}" target="_blank" rel="noopener">Enviar comprovante no WhatsApp</a>
        <div class="wd" style="margin-top:6px">Assim que o Haroldo confirmar, sua assinatura ganha mais 30 dias.</div></div>` : ''}</div>`;
  },
  vencimentoAntigo() {
    const m = this.trilha.mat; if (!m.vence_em) return '';
    const d = diasAte(m.vence_em); if (d > 3) return '';
    const quando = d === 0 ? '<b>vence hoje</b>' : `vence em <b>${d} dia${d > 1 ? 's' : ''}</b> (${fmt(dataLocal(m.vence_em))})`;
    return `<div class="alerta venc">⏰ Sua mensalidade ${quando}. Renove para não perder o acesso.
      ${cfg.chave_pix ? `<div class="pix"><code>${esc(cfg.chave_pix)}</code><button class="dl" data-copia="${esc(cfg.chave_pix)}">Copiar Pix</button></div><div style="margin-top:6px">${esc(cfg.valor_mensal || '')}${cfg.nome_pix ? ' · ' + esc(cfg.nome_pix) : ''} · envie o comprovante no WhatsApp.</div>` : ''}</div>`;
  },

  // --- telas
  tela_inicio() {
    const { semanas, avisos, edital } = this.d, a = this.atual, h = hoje();
    let html = this.vencimento();
    if (!ls.get('comoFunciona')) html += `<div class="explica"><button class="x" id="bFecharExp" aria-label="Fechar">×</button><b>Como funciona a Turma</b>
      <ol><li>Toda semana libera um <b>pacote novo</b>, dividido em <b>6 dias</b> de 4h, com 2 disciplinas por dia.</li>
      <li>Em cada dia: <b>revisão</b> (flashcards), <b>Aula Completa</b> (teoria + lei seca) e <b>questões</b>. O mapa mental é extra.</li>
      <li>Toque no <b>círculo</b> de cada item para marcar como concluído.</li>
      <li>Ao concluir a semana, os assuntos são marcados no seu <b>Edital vivo</b>.</li>
      <li>Os <b>cadeados</b> mostram o que vem pela frente e quando chega.</li></ol></div>`;
    const stats = [];
    if (edital?.data_prova) { const f = diasAte(edital.data_prova); if (f >= 0) stats.push(`<div class="stat"><b>${f}</b><span>dias para a prova</span></div>`) }
    if (edital) stats.push(`<div class="stat destaque" data-ir="edital"><b>${edital.pct}%</b><span>do edital estudado</span></div>`);
    stats.push(`<div class="stat"><b>${semanas.filter(s => s.concluida).length}/${semanas.filter(s => s.aberta).length}</b><span>semanas concluídas</span></div>`);
    html += `<div class="stats">${stats.join('')}</div>`;
    const { revisar, novos, erros } = this.d;
    if (revisar || novos || erros) html += `<div class="atalhos">
      ${revisar || novos ? `<button class="atalho a1" data-jogo="flashcards" data-sem="todas"><span>🃏</span><div><b>Revisão do dia</b><small>${revisar ? revisar + ' card' + (revisar > 1 ? 's' : '') + ' para revisar' : ''}${revisar && novos ? ' · ' : ''}${novos ? novos + ' novo' + (novos > 1 ? 's' : '') : ''}</small></div></button>` : ''}
      ${erros ? `<button class="atalho a2" data-jogo="erros" data-sem="todas"><span>📕</span><div><b>Caderno de erros</b><small>${erros} questão${erros > 1 ? 'ões' : ''} para refazer</small></div></button>` : ''}</div>`;
    if (a) {
      const pct = a.conta.length ? Math.round(a.feitosN / a.conta.length * 100) : 0;
      html += `<div class="sec">Estude esta semana</div><div class="card now semana">
        <div class="shead"><div class="dot">${a.numero}</div><div style="flex:1"><div class="wt">Semana ${a.numero} · ${esc(a.titulo)}</div>${a.descricao ? `<div class="wd">${esc(a.descricao)}</div>` : ''}</div>${a.concluida ? '<span class="tag okk">concluída</span>' : ''}</div>
        ${a.itens.length ? this.barra(pct, `${a.feitosN} de ${a.conta.length} itens concluídos`) + this.dias(a) : '<div class="wd" style="margin-top:8px">O material desta semana está sendo preparado. Fique de olho no mural!</div>'}</div>`;
      const pend = semanas.filter(s => s.aberta && s !== a && !s.concluida && s.conta.length);
      if (pend.length) html += `<div class="alerta pend">📌 Você tem ${pend.length} semana${pend.length > 1 ? 's' : ''} anterior${pend.length > 1 ? 'es' : ''} com itens pendentes. <button class="lnk" data-ir="materiais">Ver materiais ›</button></div>`;
    }
    const prox = semanas.filter(s => !s.aberta).slice(0, 3);
    if (prox.length) html += `<div class="sec">Próximas semanas</div><div class="card">${prox.map(s => { const d = Math.round((s.lib - h) / 864e5); return `<div class="prox"><span class="cad">🔒</span><div style="flex:1"><div class="wt" style="font-size:14px">Semana ${s.numero} · ${esc(s.titulo)}</div><div class="wd">chega em ${fmt(s.lib)} · faltam ${d} dia${d > 1 ? 's' : ''}</div></div></div>` }).join('')}</div>`;
    if (avisos.length) html += `<div class="sec">Avisos do Haroldo</div>` + avisos.slice(0, 3).map(av => this.aviso(av)).join('');
    html += cartaoInstalar();
    return html;
  },
  aviso(a) { return `<div class="aviso"><h4>📌 ${esc(a.titulo)}</h4>${a.texto ? `<p>${esc(a.texto)}</p>` : ''}${a.link ? `<a href="${esc(a.link)}" target="_blank" rel="noopener">Abrir link ›</a>` : ''}<div class="wd" style="margin-top:4px;font-size:11px">${new Date(a.criado_em).toLocaleDateString('pt-BR')}</div></div>` },

  tela_materiais() {
    const abertas = this.d.semanas.filter(s => s.aberta).reverse();
    const cats = ORDEM_CAT.filter(k => abertas.some(s => s.itens.some(i => i.categoria === k)));
    let html = `<div class="chips"><button data-filtro="todos" class="${this.filtro === 'todos' ? 'on' : ''}">Tudo</button>${cats.map(k => `<button data-filtro="${k}" class="${this.filtro === k ? 'on' : ''}">${CAT[k][0]} ${CAT[k][1]}</button>`).join('')}</div>`;
    html += abertas.map((s, idx) => {
      const itens = s.itens.filter(i => this.filtro === 'todos' || i.categoria === this.filtro);
      if (this.filtro !== 'todos' && !itens.length) return '';
      const aberto = this.abertas[s.id] ?? (idx === 0);
      return `<div class="card ${s === this.atual ? 'now' : s.concluida ? 'ok' : ''} semana"><button class="shead btnhead" data-toggle="${s.id}">
        <div class="dot">${s.concluida ? '✓' : s.numero}</div><div style="flex:1;text-align:left"><div class="wt">Semana ${s.numero} · ${esc(s.titulo)}</div><div class="wd">${s.feitosN}/${s.conta.length} concluídos</div></div><span class="seta">${aberto ? '▴' : '▾'}</span></button>
        ${aberto ? (itens.length || (s.plano && this.filtro === 'todos') ? (this.filtro === 'todos' ? this.dias(s) : itens.map(i => this.item(i)).join('')) : '<div class="wd" style="margin-top:8px">Material em preparação.</div>') : ''}</div>`;
    }).join('');
    const bloq = this.d.semanas.filter(s => !s.aberta).length;
    if (bloq) html += `<div class="wd" style="text-align:center;margin:10px">🔒 Mais ${bloq} semana${bloq > 1 ? 's' : ''} chegando. Veja as datas no Início.</div>`;
    return html;
  },

  tela_edital() {
    const e = this.d.edital;
    if (!e) return `<div class="empty card"><h3>📋 Edital vivo</h3><p>Em breve aqui você vai acompanhar o edital da sua prova tópico por tópico e ver quanto já estudou de cada disciplina.</p></div>`;
    let html = `<div class="card edtop"><div class="ring" style="--p:${e.pct}"><span>${e.pct}%</span></div><div style="flex:1"><div class="wt">${esc(e.nome)}</div>
      <div class="wd">${e.ok} de ${e.total} tópicos estudados${e.data_prova && diasAte(e.data_prova) >= 0 ? ` · prova em ${diasAte(e.data_prova)} dias` : ''}</div></div></div>
      <div class="wd" style="margin:0 4px 12px">Os tópicos são marcados sozinhos quando você conclui a semana correspondente. Estudou por conta própria? Toque no tópico para marcar.</div>`;
    html += e.disc.map(d => {
      const aberto = this.abertas[d.id];
      return `<div class="card disc"><button class="btnhead" data-toggle="${d.id}"><div style="flex:1;text-align:left"><div class="wt" style="font-size:14px">${esc(d.nome)}</div>${this.barra(d.pct, `${d.ok}/${d.tops.length} tópicos · ${d.pct}%`)}</div><span class="seta">${aberto ? '▴' : '▾'}</span></button>
        ${aberto ? `<div class="tops">${d.tops.map(t => `<button class="etop ${t.auto || t.manual ? 'ok' : ''} ${t.auto ? 'auto' : ''}" data-topico="${t.id}" ${t.auto ? 'disabled' : ''}><span class="chk sm">${t.auto || t.manual ? '✓' : ''}</span><span>${esc(t.texto)}${t.auto ? ' <em>(pela trilha)</em>' : ''}</span></button>`).join('')}</div>` : ''}</div>`;
    }).join('');
    return html;
  },

  tela_leis() {
    const L = this.d.leis;
    if (!L.length) return `<div class="empty card"><h3>⚖️ Legislação</h3><p>Em breve aqui você vai encontrar todas as leis do seu edital.</p></div>`;
    const grupos = [...new Set(L.map(l => l.grupo))];
    return `<div class="explica" style="margin-bottom:10px"><b>Lei seca completa do edital</b><br>Na Aula Completa você estuda os artigos de cada assunto. Aqui fica a lei inteira, sempre pelo texto oficial e atualizado.</div>
      <div class="pf"><input id="buscaLei" placeholder="🔎 Buscar lei (ex.: drogas, 11.343, Maria da Penha)" autocomplete="off"></div>
      ${grupos.map(g => `<div class="lgrupo"><div class="sec">${esc(g)}</div><div class="card">${L.filter(l => l.grupo === g).map(l => `<div class="lei" data-busca="${esc((l.nome + ' ' + (l.numero || '') + ' ' + g).toLowerCase())}">
        <div style="flex:1"><div class="inm">${esc(l.nome)}</div><div class="wd">${esc(l.numero || '')}${l.conferida_em ? ' · conferida em ' + dataLocal(l.conferida_em).toLocaleDateString('pt-BR') : ''}</div></div>
        ${l.url_oficial ? `<a class="dl" href="${esc(l.url_oficial)}" target="_blank" rel="noopener">Ler ↗</a>` : '<span class="tag">em breve</span>'}</div>`).join('')}</div></div>`).join('')}
      <div class="wd" style="text-align:center;margin:10px">Texto oficial do Planalto, sempre na versão atualizada.</div>`;
  },

  tela_conta() {
    const m = this.trilha.mat, d = m.vence_em ? diasAte(m.vence_em) : null;
    const nome = usuario.user_metadata?.nome || '';
    return `<div class="card"><div class="wt">${esc(nome)}</div><div class="wd">${esc(usuario.email)}</div></div>
      <div class="card"><div class="sec" style="margin-top:0">Sua assinatura</div>
        <div class="linha"><span>Trilha</span><b>${esc(this.trilha.nome)}</b></div>
        <div class="linha"><span>Aluno desde</span><b>${fmt(dataLocal(m.inicio))}</b></div>
        ${m.vence_em ? `<div class="linha"><span>Próximo vencimento</span><b>${dataLocal(m.vence_em).toLocaleDateString('pt-BR')} ${d <= 3 ? '<span class="tag new">em ' + d + 'd</span>' : '<span class="tag okk">em dia</span>'}</b></div>` : ''}
        ${cfg.chave_pix ? `<div class="alerta venc" style="margin:10px 0 0">Para renovar (${esc(cfg.valor_mensal || '')}):<div class="pix"><code>${esc(cfg.chave_pix)}</code><button class="dl" data-copia="${esc(cfg.chave_pix)}">Copiar Pix</button></div></div>` : ''}
        <a class="wa" style="display:block;text-align:center" href="https://wa.me/${esc(cfg.whatsapp || '5565996818656')}" target="_blank" rel="noopener">Falar com o Haroldo</a></div>
      ${cartaoInstalar()}
      <div class="card pf"><div class="wt">Trocar senha</div><input id="novaSenha" type="password" placeholder="Nova senha (mínimo 6 caracteres)" style="margin-top:8px"><button class="btn" id="bSenha">Salvar nova senha</button></div>
      <button class="btn" style="background:#fff;color:var(--red);border:1px solid var(--line)" id="bSair2">Sair da conta</button>`;
  },

  // --- ações
  ligar(c) {
    c.querySelectorAll('[data-ler]').forEach(b => b.onclick = () => Leitor.abrir(b.dataset.ler, b.dataset.t, b.dataset.n));
    c.querySelectorAll('[data-aula]').forEach(b => b.onclick = () => Aula.abrir(b.dataset.aula, b.dataset.t, b.dataset.n));
    c.querySelectorAll('[data-baixar]').forEach(b => b.onclick = () => Leitor.baixarDireto(b, b.dataset.baixar, b.dataset.n || b.dataset.t));
    c.querySelectorAll('[data-feito]').forEach(b => b.onclick = () => this.alternarFeito(b.dataset.feito, b));
    c.querySelectorAll('[data-jogo]').forEach(b => b.onclick = () => b.dataset.jogo === 'flashcards' ? Flash.abrir(b.dataset.sem, b.dataset.mat) : b.dataset.jogo === 'simulado' ? Prova.abrir(b.dataset.mat) : Quiz.abrir(b.dataset.sem, b.dataset.mat, b.dataset.jogo === 'erros'));
    c.querySelectorAll('[data-ir]').forEach(b => b.onclick = () => this.ir(b.dataset.ir));
    c.querySelectorAll('[data-filtro]').forEach(b => b.onclick = () => { this.filtro = b.dataset.filtro; this.render() });
    c.querySelectorAll('[data-toggle]').forEach(b => b.onclick = () => { const k = b.dataset.toggle; this.abertas[k] = !(this.abertas[k] ?? (this.aba === 'materiais' && this.d.semanas.filter(s => s.aberta).slice(-1)[0]?.id === k)); this.render() });
    c.querySelectorAll('[data-topico]').forEach(b => b.onclick = () => this.alternarTopico(b.dataset.topico, b));
    if ($('buscaLei')) $('buscaLei').oninput = e => { const q = e.target.value.toLowerCase().trim(); c.querySelectorAll('.lei').forEach(x => x.style.display = !q || x.dataset.busca.includes(q) ? '' : 'none'); c.querySelectorAll('.lgrupo').forEach(g => g.style.display = [...g.querySelectorAll('.lei')].some(x => x.style.display !== 'none') ? '' : 'none') };
    if ($('bRenovar')) $('bRenovar').onclick = () => { this.renovarAberto = !this.renovarAberto; this.render() };
    if ($('bFecharExp')) $('bFecharExp').onclick = () => { ls.set('comoFunciona', '1'); this.render() };
    if ($('bSenha')) $('bSenha').onclick = async () => { const s = $('novaSenha').value; if (s.length < 6) { toast('A senha precisa ter pelo menos 6 caracteres.'); return } const { error } = await sb.auth.updateUser({ password: s }); toast(error ? 'Erro: ' + error.message : 'Senha alterada!'); $('novaSenha').value = '' };
    if ($('bSair2')) $('bSair2').onclick = () => sb.auth.signOut();
    ligarCopia(c); ligarInstalar();
  },
  async alternarFeito(id, b) {
    b.disabled = true;
    const feito = this.d.feitos.has(id);
    const r = feito ? await sb.from('progresso_materiais').delete().eq('user_id', usuario.id).eq('material_id', id)
      : await sb.from('progresso_materiais').insert({ material_id: id });
    if (r.error) { toast('Erro: ' + r.error.message); b.disabled = false; return }
    const antes = this.d.semanas.find(s => s.itens.some(i => i.id === id));
    await this.carregar();
    const depois = this.d.semanas.find(s => s.id === antes?.id);
    if (depois?.concluida && !antes.concluida) toast('🎉 Semana ' + depois.numero + ' concluída! Edital atualizado.');
    this.render();
  },
  async alternarTopico(id, b) {
    b.disabled = true;
    const t = this.d.edital.disc.flatMap(d => d.tops).find(x => x.id === id);
    const r = t.manual ? await sb.from('progresso_topicos').delete().eq('user_id', usuario.id).eq('topico_id', id)
      : await sb.from('progresso_topicos').insert({ topico_id: id });
    if (r.error) { toast('Erro: ' + r.error.message); b.disabled = false; return }
    await this.carregar(); this.render();
  }
};

// ---------- PDF protegido ----------
const Leitor = {
  blob: null, titulo: '',
  async buscar(id) {
    const { data, error } = await sb.functions.invoke('baixar-pdf', { body: { material_id: id } });
    if (error) {
      let m = 'Não foi possível abrir o material.';
      try { const j = await error.context.json(); if (j.erro) m = j.erro } catch { }
      throw new Error(m);
    }
    return data instanceof Blob ? data : new Blob([data], { type: 'application/pdf' });
  },
  salvar(blob, titulo) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (titulo || 'material').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w\- ()]+/g, '').replace(/\s+/g, ' ').trim() + '.pdf';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  },
  async baixarDireto(btn, id, titulo) {
    const o = btn.textContent; btn.textContent = 'Gerando…'; btn.disabled = true;
    try { this.salvar(await this.buscar(id), titulo) } catch (e) { toast(e.message) }
    btn.textContent = o; btn.disabled = false;
  },
  async carregarPdfJs() {
    if (window.pdfjsLib) return;
    await new Promise((ok, erro) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'; s.onload = ok; s.onerror = erro; document.head.appendChild(s) });
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  },
  async abrir(id, titulo, nome) {
    this.titulo = nome || titulo; $('lTitulo').textContent = titulo;
    const box = $('lPages'); box.innerHTML = '<div class="lstatus">Preparando seu material…</div>';
    $('leitor').classList.remove('hidden'); document.body.style.overflow = 'hidden'; abrirCamada('leitor');
    try {
      const [blob] = await Promise.all([this.buscar(id), this.carregarPdfJs()]);
      this.blob = blob;
      const pdf = await pdfjsLib.getDocument({ data: await blob.arrayBuffer() }).promise;
      box.innerHTML = '';
      const larg = Math.min(box.clientWidth - 20, 900), dpr = Math.min(window.devicePixelRatio || 1, 2);
      for (let i = 1; i <= pdf.numPages; i++) {
        if ($('leitor').classList.contains('hidden')) return;
        const pg = await pdf.getPage(i);
        const v1 = pg.getViewport({ scale: 1 }), esc2 = larg / v1.width, vp = pg.getViewport({ scale: esc2 * dpr });
        const cv = document.createElement('canvas'); cv.width = vp.width; cv.height = vp.height; cv.style.width = Math.floor(vp.width / dpr) + 'px';
        box.appendChild(cv);
        await pg.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
      }
    } catch (e) { box.innerHTML = `<div class="lstatus">${esc(e.message || 'Não foi possível abrir.')}</div>` }
  },
  fechar() { $('leitor').classList.add('hidden'); $('lPages').innerHTML = ''; document.body.style.overflow = ''; this.blob = null }
};
$('lFechar').onclick = () => fecharCamada(() => Leitor.fechar());
$('lBaixar').onclick = () => { if (Leitor.blob) Leitor.salvar(Leitor.blob, Leitor.titulo); else toast('Aguarde o material carregar.') };

// ---------- PAINEL DO HAROLDO ----------
const Painel = {
  aba: 'alunos', dados: null,
  async abrir() {
    $('ttl').textContent = 'Painel do Haroldo'; $('prog').classList.add('hidden'); $('nav').classList.add('hidden');
    this.render();
  },
  async carregar() {
    const [a, m, t, s, mt, av] = await Promise.all([
      sb.from('alunos').select('*').order('criado_em', { ascending: false }),
      sb.from('matriculas').select('*'),
      sb.from('trilhas').select('*').order('ordem'),
      sb.from('semanas').select('*').order('numero'),
      sb.from('materiais').select('*').order('ordem'),
      sb.from('avisos').select('*').order('criado_em', { ascending: false })
    ]);
    this.dados = { alunos: a.data || [], mats: m.data || [], trilhas: t.data || [], semanas: s.data || [], materiais: mt.data || [], avisos: av.data || [] };
  },
  async render() {
    const c = $('conteudo'); c.innerHTML = '<div class="spin">Carregando painel…</div>';
    await this.carregar();
    const abas = [['alunos', 'Alunos'], ['avisos', 'Mural'], ['material', 'Semanas e PDFs'], ['pix', 'Pix']];
    c.innerHTML = `<div class="ptabs">${abas.map(([k, n]) => `<button data-aba="${k}" class="${this.aba === k ? 'on' : ''}">${n}</button>`).join('')}</div><div id="pBody"></div>`;
    c.querySelectorAll('[data-aba]').forEach(b => b.onclick = () => { this.aba = b.dataset.aba; this.render() });
    this['aba_' + this.aba]();
  },
  opcoesTrilha(sel) { return this.dados.trilhas.map(t => `<option value="${t.id}" ${t.id === sel ? 'selected' : ''}>${esc(t.nome)}</option>`).join('') },
  nomeTrilha(id) { return this.dados.trilhas.find(t => t.id === id)?.nome || '—' },

  // --- Alunos
  aba_alunos() {
    const { alunos, mats } = this.dados;
    const grupo = { pend: [], ativos: [], venc: [] };
    alunos.forEach(a => {
      const ms = mats.filter(m => m.user_id === a.user_id);
      const ok = ms.some(m => m.ativo && (!m.vence_em || diasAte(m.vence_em) >= 0));
      (ms.length === 0 ? grupo.pend : ok ? grupo.ativos : grupo.venc).push({ ...a, ms });
    });
    const card = a => {
      const zap = (a.whatsapp || '').replace(/\D/g, '');
      const linhas = a.ms.map(m => {
        const d = m.vence_em ? diasAte(m.vence_em) : null;
        const st = !m.ativo ? '<span class="tag bad">bloqueado</span>' : d === null ? '<span class="tag okk">ativo</span>' : d < 0 ? '<span class="tag bad">vencido ' + fmt(dataLocal(m.vence_em)) + '</span>' : d <= 3 ? '<span class="tag new">vence ' + fmt(dataLocal(m.vence_em)) + '</span>' : '<span class="tag okk">até ' + fmt(dataLocal(m.vence_em)) + '</span>';
        return `<div class="mt"><div>${esc(this.nomeTrilha(m.trilha_id))} ${st}<div class="wd">desde ${fmt(dataLocal(m.inicio))}</div></div>
          <div class="mb"><button class="dl green" data-renovar="${m.id}">+30 dias</button>${m.ativo ? `<button class="dl red" data-bloq="${m.id}">Bloquear</button>` : ''}</div></div>`;
      }).join('');
      return `<div class="card al"><div class="nm">${esc(a.nome || 'Sem nome')}</div><div class="em">${esc(a.email || '')}${zap ? ` · <a href="https://wa.me/${zap.length <= 11 ? '55' + zap : zap}" target="_blank" rel="noopener">WhatsApp ${esc(a.whatsapp)}</a>` : ''}</div>
        ${linhas}
        <div class="row"><select data-tsel="${a.user_id}">${this.opcoesTrilha()}</select><button class="dl" data-liberar="${a.user_id}">Liberar 30 dias</button></div></div>`;
    };
    const busca = `<div class="pf" style="margin-bottom:10px"><input id="pBusca" placeholder="Buscar aluno por nome ou e-mail"></div>`;
    $('pBody').innerHTML = busca +
      `<div class="sec">Aguardando liberação<span class="count">${grupo.pend.length}</span></div>${grupo.pend.map(card).join('') || '<div class="wd" style="margin:0 4px 12px">Ninguém esperando.</div>'}` +
      `<div class="sec">Vencidos ou bloqueados<span class="count">${grupo.venc.length}</span></div>${grupo.venc.map(card).join('') || '<div class="wd" style="margin:0 4px 12px">Nenhum.</div>'}` +
      `<div class="sec">Ativos<span class="count">${grupo.ativos.length}</span></div>${grupo.ativos.map(card).join('') || '<div class="wd" style="margin:0 4px 12px">Nenhum ainda.</div>'}`;
    $('pBusca').oninput = e => { const q = e.target.value.toLowerCase(); document.querySelectorAll('#pBody .al').forEach(el => el.style.display = el.textContent.toLowerCase().includes(q) ? '' : 'none') };
    $('pBody').querySelectorAll('[data-liberar]').forEach(b => b.onclick = () => this.liberar(b.dataset.liberar, document.querySelector(`[data-tsel="${b.dataset.liberar}"]`).value, b));
    $('pBody').querySelectorAll('[data-renovar]').forEach(b => b.onclick = () => this.renovar(b.dataset.renovar, b));
    $('pBody').querySelectorAll('[data-bloq]').forEach(b => b.onclick = () => this.bloquear(b.dataset.bloq, b));
  },
  async liberar(uid, trilha, b) {
    b.disabled = true;
    const ex = this.dados.mats.find(m => m.user_id === uid && m.trilha_id === trilha);
    const venc = iso(addDias(hoje(), 30));
    const r = ex ? await sb.from('matriculas').update({ ativo: true, vence_em: venc }).eq('id', ex.id)
      : await sb.from('matriculas').insert({ user_id: uid, trilha_id: trilha, inicio: iso(hoje()), ativo: true, vence_em: venc });
    toast(r.error ? 'Erro: ' + r.error.message : 'Acesso liberado até ' + fmt(dataLocal(venc)));
    this.render();
  },
  async renovar(id, b) {
    b.disabled = true;
    const m = this.dados.mats.find(x => x.id === id);
    const base = m.vence_em && diasAte(m.vence_em) >= 0 ? dataLocal(m.vence_em) : hoje();
    const venc = iso(addDias(base, 30));
    const r = await sb.from('matriculas').update({ ativo: true, vence_em: venc }).eq('id', id);
    toast(r.error ? 'Erro: ' + r.error.message : 'Renovado até ' + fmt(dataLocal(venc)));
    this.render();
  },
  async bloquear(id, b) {
    if (b.dataset.conf !== '1') { b.dataset.conf = '1'; b.textContent = 'Confirmar?'; return }
    const r = await sb.from('matriculas').update({ ativo: false }).eq('id', id);
    toast(r.error ? 'Erro: ' + r.error.message : 'Acesso bloqueado');
    this.render();
  },

  // --- Mural
  aba_avisos() {
    const lista = this.dados.avisos.filter(a => a.ativo);
    $('pBody').innerHTML = `<div class="card pf"><div class="wt">Novo aviso</div>
      <label>Título</label><input id="aTit" placeholder="Simulado 03 liberado!">
      <label>Texto (opcional)</label><textarea id="aTxt" placeholder="Detalhes do aviso"></textarea>
      <label>Link (opcional)</label><input id="aLink" placeholder="https://… (live, grupo, formulário)">
      <label>Para quem</label><select id="aTri"><option value="">Todas as trilhas</option>${this.opcoesTrilha()}</select>
      <button class="btn" id="aSalvar">Publicar no mural</button></div>
      <div class="sec">Avisos publicados<span class="count">${lista.length}</span></div>
      ${lista.map(a => `<div class="aviso"><h4>${esc(a.titulo)}</h4>${a.texto ? `<p>${esc(a.texto)}</p>` : ''}<div class="wd">${a.trilha_id ? esc(this.nomeTrilha(a.trilha_id)) : 'Todas as trilhas'} · ${new Date(a.criado_em).toLocaleDateString('pt-BR')}</div><div class="row"><button class="dl red" data-rem="${a.id}">Remover</button></div></div>`).join('') || '<div class="wd" style="margin:0 4px">Nenhum aviso ainda.</div>'}`;
    $('aSalvar').onclick = async () => {
      const titulo = $('aTit').value.trim(); if (!titulo) { toast('Escreva um título.'); return }
      let link = $('aLink').value.trim(); if (link && !/^https?:\/\//.test(link)) link = 'https://' + link;
      const r = await sb.from('avisos').insert({ titulo, texto: $('aTxt').value.trim() || null, link: link || null, trilha_id: $('aTri').value || null });
      toast(r.error ? 'Erro: ' + r.error.message : 'Aviso publicado!'); this.render();
    };
    $('pBody').querySelectorAll('[data-rem]').forEach(b => b.onclick = async () => { await sb.from('avisos').update({ ativo: false }).eq('id', b.dataset.rem); toast('Aviso removido'); this.render() });
  },

  // --- Semanas e PDFs
  trilhaSel: null,
  aba_material() {
    const { trilhas, semanas, materiais } = this.dados;
    if (!this.trilhaSel) this.trilhaSel = trilhas[0]?.id;
    const ss = semanas.filter(s => s.trilha_id === this.trilhaSel);
    const prox = (ss.length ? Math.max(...ss.map(s => s.numero)) : 0) + 1;
    $('pBody').innerHTML = `<div class="card pf"><label style="margin-top:0">Trilha</label><select id="mTri">${this.opcoesTrilha(this.trilhaSel)}</select></div>
      ${ss.map(s => `<div class="card"><div class="wt">Semana ${s.numero} · ${esc(s.titulo)}</div><div class="wd">${esc(s.descricao || '')} · libera ${s.dias_para_liberar} dias após a entrada</div>
        ${materiais.filter(m => m.semana_id === s.id).map(m => `<div class="mt"><span>${(CAT[m.categoria] || CAT.extra)[0]} ${m.dia ? '<b>D' + m.dia + '</b> ' : ''}${esc(m.titulo)}</span><button class="dl red" data-rmat="${m.id}" data-path="${esc(m.storage_path)}">Remover</button></div>`).join('') || '<div class="wd" style="margin-top:6px">Sem PDF ainda.</div>'}
        <div class="pf"><label>Enviar PDF para esta semana</label><input type="file" accept="application/pdf" data-arq="${s.id}"><select data-cat="${s.id}" style="margin-top:6px">${ORDEM_CAT.map(k => `<option value="${k}">${CAT[k][0]} ${CAT[k][1]}</option>`).join('')}</select><input placeholder="Nome do material (ex.: Lei de Drogas esquematizada)" data-tit="${s.id}" style="margin-top:6px"><select data-dia="${s.id}" style="margin-top:6px"><option value="">Dia: sem dia (extra da semana)</option>${[1,2,3,4,5,6].map(d => `<option value="${d}">Dia ${d}</option>`).join('')}</select><input placeholder="Disciplina (ex.: Direito Penal)" data-disc="${s.id}" list="listaDisc" style="margin-top:6px"><datalist id="listaDisc">${['Direito Penal','Processo Penal','Direito Constitucional','Direito Administrativo','Português','Informática','Legislação Penal Especial','Raciocínio Lógico','Estatuto PJC-MT','Ética e Filosofia','História e Geografia de MT'].map(x => `<option value="${x}">`).join('')}</datalist><button class="btn" data-up="${s.id}" data-num="${s.numero}">Enviar PDF</button></div></div>`).join('')}
      <div class="card pf"><div class="wt">Nova semana</div>
        <label>Número</label><input id="sNum" type="number" value="${prox}">
        <label>Título</label><input id="sTit" placeholder="Ex.: Organização Criminosa">
        <label>Descrição (opcional)</label><input id="sDes" placeholder="Ex.: Lei 12.850/13 + simulado">
        <button class="btn" id="sAdd">Criar semana</button>
        <div class="wd" style="margin-top:8px">A semana N libera ${'(N − 1) × 7'} dias depois da entrada de cada aluno.</div></div>`;
    $('mTri').onchange = e => { this.trilhaSel = e.target.value; this.aba_material() };
    $('sAdd').onclick = async () => {
      const numero = parseInt($('sNum').value, 10), titulo = $('sTit').value.trim();
      if (!numero || !titulo) { toast('Preencha número e título.'); return }
      const r = await sb.from('semanas').insert({ trilha_id: this.trilhaSel, numero, titulo, descricao: $('sDes').value.trim() || null, dias_para_liberar: (numero - 1) * 7 });
      toast(r.error ? (r.error.code === '23505' ? 'Já existe a semana ' + numero : 'Erro: ' + r.error.message) : 'Semana criada!'); this.render();
    };
    $('pBody').querySelectorAll('[data-up]').forEach(b => b.onclick = () => this.enviarPdf(b));
    $('pBody').querySelectorAll('[data-rmat]').forEach(b => b.onclick = async () => {
      if (b.dataset.conf !== '1') { b.dataset.conf = '1'; b.textContent = 'Confirmar?'; return }
      await sb.storage.from('materiais').remove([b.dataset.path]);
      await sb.from('materiais').delete().eq('id', b.dataset.rmat);
      toast('Material removido'); this.render();
    });
  },
  async enviarPdf(b) {
    const sid = b.dataset.up, arq = document.querySelector(`[data-arq="${sid}"]`).files[0];
    const titulo = document.querySelector(`[data-tit="${sid}"]`).value.trim() || (arq && arq.name.replace(/\.pdf$/i, ''));
    if (!arq) { toast('Escolha o arquivo PDF.'); return }
    const slug = this.dados.trilhas.find(t => t.id === this.trilhaSel)?.slug || 'trilha';
    const caminho = `${slug}/semana-${String(b.dataset.num).padStart(2, '0')}-${Date.now()}.pdf`;
    b.disabled = true; b.textContent = 'Enviando…';
    const up = await sb.storage.from('materiais').upload(caminho, arq, { contentType: 'application/pdf' });
    if (up.error) { toast('Erro no envio: ' + up.error.message); b.disabled = false; b.textContent = 'Enviar PDF'; return }
    const categoria = document.querySelector(`[data-cat="${sid}"]`).value;
    const dia = Number(document.querySelector(`[data-dia="${sid}"]`).value) || null, disciplina = document.querySelector(`[data-disc="${sid}"]`).value.trim() || null;
    const r = await sb.from('materiais').insert({ semana_id: sid, titulo, storage_path: caminho, categoria, dia, disciplina });
    toast(r.error ? 'Erro: ' + r.error.message : 'PDF publicado!'); this.render();
  },

  // --- Pix
  aba_pix() {
    $('pBody').innerHTML = `<div class="card pf"><div class="wt">Dados de pagamento</div><div class="wd">Aparecem para o aluno quando a mensalidade estiver para vencer ou vencida.</div>
      <label>Chave Pix</label><input id="xChave" value="${esc(cfg.chave_pix || '')}">
      <label>Nome que aparece no Pix</label><input id="xNome" value="${esc(cfg.nome_pix || '')}">
      <label>Valor da mensalidade</label><input id="xValor" value="${esc(cfg.valor_mensal || 'R$ 49,90')}">
      <label>WhatsApp (com DDI e DDD, só números)</label><input id="xZap" value="${esc(cfg.whatsapp || '5565996818656')}">
      <button class="btn" id="xSalvar">Salvar</button></div>`;
    $('xSalvar').onclick = async () => {
      const novo = { chave_pix: $('xChave').value.trim() || null, nome_pix: $('xNome').value.trim() || null, valor_mensal: $('xValor').value.trim(), whatsapp: $('xZap').value.replace(/\D/g, '') };
      const r = await sb.from('config').update(novo).eq('id', 1);
      if (!r.error) cfg = { ...cfg, ...novo };
      toast(r.error ? 'Erro: ' + r.error.message : 'Salvo!');
    };
  }
};

// ---------- botão voltar do celular: fecha a tela aberta em vez de sair do site ----------
function abrirCamada(nome) { history.pushState({ camada: nome }, '') }
function fecharCamada(fn) { if (history.state?.camada) history.back(); else fn() }
window.addEventListener('popstate', e => {
  if (!$('leitor').classList.contains('hidden')) return Leitor.fechar();
  if (!$('jogo').classList.contains('hidden')) return Jogo.fechar();
  if (location.hash !== '#painel' && typeof Aluno !== 'undefined' && Aluno.d) { const a = location.hash.startsWith('#a-') ? location.hash.slice(3) : 'inicio'; Aluno.ir(a, true) }
});

// ---------- app instalável ----------
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { });

// ---------- QUESTÕES INTERATIVAS ----------
// ---------- AULA DENTRO DO SITE ----------
const Aula = {
  async abrir(id, titulo, arquivo) {
    Jogo.abrir(titulo);
    const { data, error } = await sb.from('materiais').select('html').eq('id', id).maybeSingle();
    if (error || !data?.html) { $('jCorpo').innerHTML = '<div class="empty"><h3>Não foi possível abrir a aula.</h3><p>Verifique sua internet e tente de novo.</p></div>'; return }
    let html = data.html;
    if (html.startsWith('gz:')) { const bin = Uint8Array.from(atob(html.slice(3)), c => c.charCodeAt(0)); html = await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'))).text() }
    const marca = usuario ? esc(`${usuario.user_metadata?.nome || ''} · ${usuario.email}`) : 'Amostra grátis · Haroldo Concurso';
    $('jCorpo').innerHTML = `<div class="aulabar"><span>Leia aqui ou salve em PDF para estudar offline.</span><button class="dl gold" id="aPdf">Baixar PDF</button></div>
      <div class="wm" aria-hidden="true">${Array(40).fill(`<span>${marca}</span>`).join('')}</div>
      <article class="aula">${html}<p class="uso">${usuario ? `Material de uso exclusivo de ${marca}.` : 'Amostra grátis da Turma Carreiras Policiais.'} Proibida a reprodução ou o compartilhamento.</p></article>${Demo.cta()}`;
    $('jCorpo').scrollTop = 0;
    $('jCorpo').querySelectorAll('figure.esq').forEach(f => f.onclick = () => f.classList.toggle('zoom'));
    $('aPdf').onclick = () => {
      // o navegador usa o título da página como nome do PDF salvo
      const t0 = document.title; document.title = arquivo || titulo || t0;
      document.body.classList.add('imprimindo');
      setTimeout(() => { window.print(); document.body.classList.remove('imprimindo'); setTimeout(() => { document.title = t0 }, 1000) }, 50)
    };
  }
};

const Jogo = {
  abrir(titulo) { $('jTitulo').textContent = titulo; if ($('jogo').classList.contains('hidden')) abrirCamada('jogo'); $('jogo').classList.remove('hidden'); document.body.style.overflow = 'hidden'; $('jCorpo').innerHTML = '<div class="spin">Carregando…</div>' },
  fechar() { clearInterval(Prova.tm); $('jogo').classList.add('hidden'); document.body.style.overflow = ''; if (Jogo.mudou && usuario) { Jogo.mudou = false; Aluno.carregar().then(() => Aluno.render()) } }
};
$('jFechar').onclick = () => fecharCamada(() => Jogo.fechar());
const limpaHtml = s => esc(s || '').replace(/&lt;(\/?)(b|i|p)&gt;/g, '<$1$2>').replace(/&lt;br\s*\/?&gt;/g, '<br>');

// esquema visual da questão (SVG guardado compactado, "gz:")
async function esquemaQ(q, alvo) {
  if (!q.esquema || !alvo) return;
  try {
    let s = q.esquema;
    if (s.startsWith('gz:')) { const bin = Uint8Array.from(atob(s.slice(3)), c => c.charCodeAt(0)); s = await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'))).text() }
    if (!s.trim().startsWith('<svg')) return;
    alvo.innerHTML = `<figure class="esq"><figcaption><b>ESQUEMA</b> | ${esc(q.esquema_titulo || '')}</figcaption>${s}</figure>`;
    alvo.querySelector('figure').onclick = e => e.currentTarget.classList.toggle('zoom');
  } catch (e) { }
}

const Quiz = {
  async abrir(semana, matId, soErros) {
    Jogo.abrir(soErros ? 'Caderno de erros' : 'Questões comentadas');
    this.matId = matId; this.soErros = soErros;
    let q = sb.from('questoes').select('*').order('ordem');
    q = semana === 'todas' ? filtroLib(q, Aluno.d.libIds, Aluno.d.libLig) : matId ? q.eq('material_id', matId) : q.eq('semana_id', semana);
    const [{ data: qs }, { data: rs }] = await Promise.all([q, usuario ? sb.from('respostas').select('questao_id,resposta,acertou,tentativas').eq('user_id', usuario.id) : { data: [] }]);
    this.resp = new Map((rs || []).map(r => [r.questao_id, r]));
    this.todas = qs || [];
    if (soErros) { this.fila = this.todas.filter(x => this.resp.get(x.id)?.acertou === false); return this.fila.length ? this.mostrar(0) : this.vazio('Seu caderno de erros está vazio. 🎉') }
    this.inicio();
  },
  vazio(t) { $('jCorpo').innerHTML = `<div class="empty"><h3>${t}</h3></div>` },
  inicio() {
    const tot = this.todas.length, resp = this.todas.filter(x => this.resp.has(x.id)), ac = resp.filter(x => this.resp.get(x.id).acertou).length;
    const erradas = resp.length - ac, pend = this.todas.findIndex(x => !this.resp.has(x.id));
    $('jCorpo').innerHTML = `<div class="qstart"><div class="ring" style="--p:${tot ? Math.round(resp.length / tot * 100) : 0}"><span>${resp.length}/${tot}</span></div>
      <h3>${tot} questões comentadas</h3><p class="wd">${resp.length ? `Você já respondeu ${resp.length} · acertou ${ac} (${Math.round(ac / resp.length * 100)}%)` : 'Responda e veja na hora o comentário de cada questão.'}</p>
      ${pend >= 0 ? `<button class="btn" id="qCont">${resp.length ? 'Continuar de onde parei' : 'Começar'}</button>` : ''}
      ${erradas ? `<button class="btn sec2" id="qErr">Refazer só as que errei (${erradas})</button>` : ''}
      ${resp.length ? `<button class="btn sec2" id="qTudo">Recomeçar do início</button>` : ''}</div>`;
    if ($('qCont')) $('qCont').onclick = () => { this.fila = this.todas; this.mostrar(pend) };
    if ($('qErr')) $('qErr').onclick = () => { this.fila = this.todas.filter(x => this.resp.get(x.id)?.acertou === false); this.mostrar(0) };
    if ($('qTudo')) $('qTudo').onclick = () => { this.fila = this.todas; this.mostrar(0) };
  },
  mostrar(i) {
    this.i = i; const q = this.fila[i]; if (!q) return this.fim();
    const ops = q.tipo === 'ce' ? [['C', 'Certo'], ['E', 'Errado']] : (q.alternativas || []).map((t, k) => ['ABCDE'[k], t]);
    $('jCorpo').innerHTML = `<div class="qbar"><div style="width:${Math.round(i / this.fila.length * 100)}%"></div></div>
      <div class="qmeta">Questão ${i + 1} de ${this.fila.length}${q.assunto ? ' · ' + esc(q.assunto) : ''}${q.tipo === 'ce' ? ' · <b>Certo ou Errado</b>' : ''}</div>
      ${q.texto_base ? `<details class="qtexto" ${i === 0 || this.fila[i - 1]?.texto_base !== q.texto_base ? 'open' : ''}><summary>📄 Leia o texto</summary><div>${q.texto_base.startsWith('<svg') ? q.texto_base : esc(q.texto_base)}</div></details>` : ''}
      <div class="qenun">${esc(q.enunciado)}</div>
      <div class="qops ${q.tipo === 'ce' ? 'ce' : ''}">${ops.map(([L, t]) => `<button class="qop" data-op="${L}"><b>${q.tipo === 'ce' ? '' : L + ')'}</b> <span>${esc(t)}</span></button>`).join('')}</div>
      <div id="qFeed"></div>`;
    $('jCorpo').scrollTop = 0;
    $('jCorpo').querySelectorAll('.qop').forEach(b => b.onclick = () => this.responder(q, b.dataset.op));
  },
  async responder(q, op) {
    const ok = op === q.gabarito;
    $('jCorpo').querySelectorAll('.qop').forEach(b => { b.disabled = true; if (b.dataset.op === q.gabarito) b.classList.add('certa'); else if (b.dataset.op === op) b.classList.add('errada') });
    const ant = this.resp.get(q.id);
    const linha = { questao_id: q.id, resposta: op, acertou: ok, tentativas: (ant?.tentativas || 0) + 1, respondido_em: new Date().toISOString() };
    this.resp.set(q.id, linha); Jogo.mudou = true;
    if (usuario) sb.from('respostas').upsert(linha, { onConflict: 'user_id,questao_id' }).then(r => r.error && toast('Erro ao salvar: ' + r.error.message));
    const gab = q.tipo === 'ce' ? (q.gabarito === 'C' ? 'Certo' : 'Errado') : 'letra ' + q.gabarito;
    $('qFeed').innerHTML = `<div class="qres ${ok ? 'ok' : 'no'}">${ok ? '✅ Você acertou!' : '❌ Não foi dessa vez.'}</div>
      <div class="qcom"><div class="qct">Comentário</div>${limpaHtml(q.comentario)}<div class="qesq"></div>
      ${q.como_cobra ? (q.como_cobra.startsWith('<b>') ? `<p class="cbx">${limpaHtml(q.como_cobra)}</p>` : `<p><b class="cb">Como a banca cobra:</b> ${limpaHtml(q.como_cobra)}</p>`) : ''}
      ${q.armadilha ? `<p><b class="ar">Armadilha:</b> ${limpaHtml(q.armadilha)}</p>` : ''}
      <p class="qgab">Gabarito: ${gab}</p></div>
      <button class="btn" id="qProx">${this.i + 1 < this.fila.length ? 'Próxima questão ›' : 'Ver resultado'}</button>`;
    $('qProx').onclick = () => this.mostrar(this.i + 1);
    esquemaQ(q, $('qFeed').querySelector('.qesq'));
    $('qFeed').scrollIntoView({ behavior: 'smooth', block: 'start' });
  },
  async fim() {
    const ids = this.fila.map(x => x.id), ac = ids.filter(id => this.resp.get(id)?.acertou).length, pct = ids.length ? Math.round(ac / ids.length * 100) : 0;
    if (usuario && this.matId && this.todas.every(x => this.resp.has(x.id)) && !Aluno.d.feitos.has(this.matId)) { await sb.from('progresso_materiais').insert({ material_id: this.matId }); Jogo.mudou = true }
    $('jCorpo').innerHTML = `<div class="qstart"><div class="ring" style="--p:${pct}"><span>${pct}%</span></div>
      <h3>${pct >= 80 ? 'Excelente! 🔥' : pct >= 60 ? 'Bom resultado! 💪' : 'Continue treinando! 📚'}</h3>
      <p class="wd">Você acertou ${ac} de ${ids.length} nesta rodada.${ids.length - ac ? (usuario ? ' As que você errou foram para o seu Caderno de erros.' : ' Na assinatura, as que você errou vão para o seu Caderno de erros.') : ''}</p>
      ${ids.length - ac ? '<button class="btn" id="qErr2">Refazer as que errei</button>' : ''}<button class="btn sec2" id="qSair">Voltar</button></div>${Demo.cta()}`;
    if ($('qErr2')) $('qErr2').onclick = () => { this.fila = this.fila.filter(x => !this.resp.get(x.id)?.acertou); this.mostrar(0) };
    $('qSair').onclick = () => fecharCamada(() => Jogo.fechar());
  }
};

// ---------- SIMULADO (MODO PROVA) ----------
const Prova = {
  DUR: 150 * 60 * 1000,
  chave() { return 'prova_' + (usuario ? usuario.id : 'amostra') + '_' + this.matId },
  salvar() { ls.set(this.chave(), JSON.stringify(this.st)) },
  async abrir(matId) {
    Jogo.abrir('Simulado'); this.matId = matId; clearInterval(this.tm);
    const [{ data: qs }, { data: rs }] = await Promise.all([sb.from('questoes').select('*').eq('material_id', matId).order('ordem'), usuario ? sb.from('respostas').select('questao_id,resposta,acertou').eq('user_id', usuario.id) : { data: [] }]);
    this.qs = qs || []; this.resp = new Map((rs || []).map(r => [r.questao_id, r]));
    try { this.st = JSON.parse(ls.get(this.chave()) || 'null') } catch { this.st = null }
    if (!this.st && this.qs.length && this.qs.every(q => this.resp.has(q.id))) this.st = { ini: 0, fim: 0, marc: Object.fromEntries(this.qs.map(q => [q.id, this.resp.get(q.id).resposta])), entregue: true };
    if (!this.qs.length) return Quiz.vazio('Simulado em preparação.');
    if (this.st?.entregue) return this.resultado();
    if (this.st?.ini) return this.mostrar(this.st.i || 0);
    this.inicio();
  },
  disc(q) { return (q.assunto || 'Geral').split(' · ')[0] },
  inicio() {
    const n = this.qs.length, ce = this.qs.filter(q => q.tipo === 'ce').length;
    $('jCorpo').innerHTML = `<div class="qstart"><div class="ring" style="--p:0"><span>${n}</span></div>
      <h3>Simulado semanal</h3>
      <p class="wd">${n} questões (${n - ce} de múltipla escolha e ${ce} de certo ou errado) · <b>2h30</b> de prova.</p>
      <div class="pv-reg"><p>• Faça sem consulta, como no dia da prova.</p><p>• Você pode trocar a resposta e navegar entre as questões até entregar.</p><p>• O gabarito e os comentários aparecem <b>só depois de entregar</b>.</p><p>• 1 ponto por acerto; errada ou em branco vale zero; não há desconto.</p><p>• Ao fim do tempo, a prova é entregue automaticamente. Se fechar o app, o tempo continua correndo.</p></div>
      <button class="btn" id="pIni">Começar o simulado</button></div>`;
    $('pIni').onclick = () => { this.st = { ini: Date.now(), marc: {}, i: 0 }; this.salvar(); this.mostrar(0) };
  },
  resta() { return this.st.ini + this.DUR - Date.now() },
  relogio() {
    const r = this.resta(), el = $('pTimer');
    if (!el) return clearInterval(this.tm);
    if (r <= 0) { clearInterval(this.tm); return this.entregar(true) }
    const t = Math.ceil(r / 1000), h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), sg = t % 60;
    el.textContent = `⏱ ${h}:${String(m).padStart(2, '0')}:${String(sg).padStart(2, '0')}`;
    el.classList.toggle('urg', r < 10 * 60 * 1000);
  },
  mostrar(i) {
    if (this.resta() <= 0) return this.entregar(true);
    this.st.i = i; this.salvar();
    const q = this.qs[i], n = this.qs.length, marc = this.st.marc[q.id], resp = Object.keys(this.st.marc).length;
    const ops = q.tipo === 'ce' ? [['C', 'Certo'], ['E', 'Errado']] : (q.alternativas || []).map((t, k) => ['ABCDE'[k], t]);
    $('jCorpo').innerHTML = `<div class="pv-top"><span id="pTimer" class="pv-timer"></span><span class="wd">${resp}/${n} respondidas</span><button class="dl alt" id="pMapa">Questões</button></div>
      <div id="pGrade" class="pv-grade hidden">${this.qs.map((x, k) => `<button class="pv-n ${this.st.marc[x.id] ? 'ok' : ''} ${k === i ? 'at' : ''}" data-ir="${k}">${k + 1}</button>`).join('')}</div>
      <div class="qmeta">Questão ${i + 1} de ${n} · ${esc(this.disc(q))}${q.tipo === 'ce' ? ' · <b>Certo ou Errado</b>' : ''}</div>
      ${q.texto_base ? `<details class="qtexto" ${i === 0 || this.qs[i - 1]?.texto_base !== q.texto_base ? 'open' : ''}><summary>📄 Leia o texto</summary><div>${esc(q.texto_base)}</div></details>` : ''}
      <div class="qenun">${esc(q.enunciado)}</div>
      <div class="qops ${q.tipo === 'ce' ? 'ce' : ''}">${ops.map(([L, t]) => `<button class="qop ${marc === L ? 'marc' : ''}" data-op="${L}"><b>${q.tipo === 'ce' ? '' : L + ')'}</b> <span>${esc(t)}</span></button>`).join('')}</div>
      <div class="pv-nav"><button class="btn sec2" id="pAnt" ${i ? '' : 'disabled'}>‹ Anterior</button><button class="btn" id="pProx">${i + 1 < n ? 'Próxima ›' : 'Revisar e entregar'}</button></div>
      <button class="btn sec2" id="pEnt" style="margin-top:8px">Entregar o simulado</button>`;
    $('jCorpo').scrollTop = 0; this.relogio(); clearInterval(this.tm); this.tm = setInterval(() => this.relogio(), 1000);
    $('jCorpo').querySelectorAll('.qop').forEach(b => b.onclick = () => {
      if (this.st.marc[q.id] === b.dataset.op) delete this.st.marc[q.id]; else this.st.marc[q.id] = b.dataset.op;
      this.salvar(); this.mostrar(i);
    });
    $('pMapa').onclick = () => $('pGrade').classList.toggle('hidden');
    $('jCorpo').querySelectorAll('[data-ir]').forEach(b => b.onclick = () => this.mostrar(+b.dataset.ir));
    $('pAnt').onclick = () => this.mostrar(i - 1);
    $('pProx').onclick = () => i + 1 < n ? this.mostrar(i + 1) : this.confirmar();
    $('pEnt').onclick = () => this.confirmar();
  },
  confirmar() {
    const n = this.qs.length, br = this.qs.filter(q => !this.st.marc[q.id]).length;
    $('jCorpo').innerHTML = `<div class="pv-top"><span id="pTimer" class="pv-timer"></span></div><div class="qstart">
      <h3>Entregar o simulado?</h3><p class="wd">${br ? `Você deixou <b>${br}</b> ${br > 1 ? 'questões' : 'questão'} em branco.` : 'Você respondeu todas as questões.'} Depois de entregar, não dá para mudar as respostas.</p>
      <button class="btn" id="pSim">Entregar agora</button><button class="btn sec2" id="pVolta">Voltar à prova</button>
      ${br ? `<div class="pv-grade">${this.qs.map((x, k) => this.st.marc[x.id] ? '' : `<button class="pv-n" data-ir="${k}">${k + 1}</button>`).join('')}</div>` : ''}</div>`;
    this.relogio();
    $('pSim').onclick = () => this.entregar(false);
    $('pVolta').onclick = () => this.mostrar(this.st.i || 0);
    $('jCorpo').querySelectorAll('[data-ir]').forEach(b => b.onclick = () => this.mostrar(+b.dataset.ir));
  },
  async entregar(auto) {
    clearInterval(this.tm);
    if (this.st.entregue) return this.resultado();
    this.st.entregue = true; this.st.fim = Math.min(Date.now(), this.st.ini + this.DUR); this.st.auto = auto; this.salvar();
    $('jCorpo').innerHTML = '<div class="spin">Corrigindo…</div>';
    const linhas = this.qs.filter(q => this.st.marc[q.id]).map(q => {
      const ant = this.resp.get(q.id), op = this.st.marc[q.id];
      return { questao_id: q.id, resposta: op, acertou: op === q.gabarito, tentativas: (ant?.tentativas || 0) + 1, respondido_em: new Date().toISOString() };
    });
    if (linhas.length && usuario) { const r = await sb.from('respostas').upsert(linhas, { onConflict: 'user_id,questao_id' }); if (r.error) toast('Erro ao salvar: ' + r.error.message) }
    linhas.forEach(l => this.resp.set(l.questao_id, l));
    if (usuario && !Aluno.d.feitos.has(this.matId)) await sb.from('progresso_materiais').insert({ material_id: this.matId });
    Jogo.mudou = true;
    this.resultado();
  },
  resultado() {
    const m = this.st.marc, n = this.qs.length, ac = this.qs.filter(q => m[q.id] === q.gabarito).length, pct = Math.round(ac / n * 100);
    const por = {};
    this.qs.forEach(q => { const d = this.disc(q); por[d] = por[d] || { t: 0, a: 0, b: 0 }; por[d].t++; if (m[q.id] === q.gabarito) por[d].a++; if (!m[q.id]) por[d].b++ });
    const min = this.st.ini && this.st.fim ? Math.round((this.st.fim - this.st.ini) / 60000) : null;
    $('jCorpo').innerHTML = `<div class="qstart"><div class="ring" style="--p:${pct}"><span>${ac}/${n}</span></div>
      <h3>${pct >= 80 ? 'Excelente! 🔥' : pct >= 60 ? 'Bom resultado! 💪' : 'Continue treinando! 📚'}</h3>
      <p class="wd">Você fez <b>${ac} pontos</b> de ${n} (${pct}%)${min !== null ? ` em ${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}` : ''}.${this.st.auto ? ' A prova foi entregue ao fim do tempo.' : ''}</p></div>
      <div class="pv-tab"><div class="pv-row h"><span>Disciplina</span><span>Acertos</span><span>%</span></div>
      ${Object.entries(por).map(([d, v]) => { const p = Math.round(v.a / v.t * 100); return `<div class="pv-row ${p < 60 ? 'low' : ''}"><span>${esc(d)}</span><span>${v.a}/${v.t}</span><span>${p}%</span></div>` }).join('')}</div>
      <p class="wd" style="margin:8px 2px">São poucas questões por disciplina: use o quadro como orientação. Onde ficou abaixo de 60%, reveja a aula e os flashcards. Revise também os acertos que vieram de chute.</p>
      <button class="btn" id="pRev">Ver gabarito e comentários</button>
      <button class="btn sec2" id="pNovo">Refazer o simulado</button><button class="btn sec2" id="pSair">Voltar</button>${Demo.cta()}`;
    $('pRev').onclick = () => this.revisar(0);
    $('pNovo').onclick = () => { ls.set(this.chave(), ''); this.st = null; this.inicio() };
    $('pSair').onclick = () => fecharCamada(() => Jogo.fechar());
  },
  revisar(i) {
    const q = this.qs[i], n = this.qs.length, marc = this.st.marc[q.id];
    const ops = q.tipo === 'ce' ? [['C', 'Certo'], ['E', 'Errado']] : (q.alternativas || []).map((t, k) => ['ABCDE'[k], t]);
    const gab = q.tipo === 'ce' ? (q.gabarito === 'C' ? 'Certo' : 'Errado') : 'letra ' + q.gabarito;
    $('jCorpo').innerHTML = `<div class="qbar"><div style="width:${Math.round((i + 1) / n * 100)}%"></div></div>
      <div class="qmeta">Correção · questão ${i + 1} de ${n}${q.assunto ? ' · ' + esc(q.assunto) : ''}</div>
      ${q.texto_base ? `<details class="qtexto"><summary>📄 Leia o texto</summary><div>${esc(q.texto_base)}</div></details>` : ''}
      <div class="qenun">${esc(q.enunciado)}</div>
      <div class="qops ${q.tipo === 'ce' ? 'ce' : ''}">${ops.map(([L, t]) => `<button class="qop ${L === q.gabarito ? 'certa' : L === marc ? 'errada' : ''}" disabled><b>${q.tipo === 'ce' ? '' : L + ')'}</b> <span>${esc(t)}</span></button>`).join('')}</div>
      <div class="qres ${marc === q.gabarito ? 'ok' : 'no'}">${!marc ? '⬜ Em branco.' : marc === q.gabarito ? '✅ Você acertou.' : '❌ Você marcou ' + (q.tipo === 'ce' ? (marc === 'C' ? 'Certo' : 'Errado') : marc) + '.'}</div>
      <div class="qcom"><div class="qct">Comentário</div>${limpaHtml(q.comentario)}<div class="qesq"></div>
      ${q.como_cobra ? (q.como_cobra.startsWith('<b>') ? `<p class="cbx">${limpaHtml(q.como_cobra)}</p>` : `<p><b class="cb">Como a banca cobra:</b> ${limpaHtml(q.como_cobra)}</p>`) : ''}
      ${q.armadilha ? `<p><b class="ar">Armadilha:</b> ${limpaHtml(q.armadilha)}</p>` : ''}
      <p class="qgab">Gabarito: ${gab}</p></div>
      <div class="pv-nav"><button class="btn sec2" id="rAnt" ${i ? '' : 'disabled'}>‹ Anterior</button><button class="btn" id="rProx">${i + 1 < n ? 'Próxima ›' : 'Ver resultado'}</button></div>`;
    $('jCorpo').scrollTop = 0;
    $('rAnt').onclick = () => this.revisar(i - 1);
    $('rProx').onclick = () => i + 1 < n ? this.revisar(i + 1) : this.resultado();
    esquemaQ(q, $('jCorpo').querySelector('.qesq'));
  }
};

// ---------- FLASHCARDS COM REVISÃO ESPAÇADA ----------
const INTERVALOS = [1, 3, 7, 15, 30];
const FTIPO = { lei: ['📜 LEI SECA', '#C9971F'], peg: ['⚠️ PEGADINHA', '#C0392B'], jur: ['⚖️ JURISPRUDÊNCIA', '#6B4FA0'], con: ['💡 CONCEITO', '#2F6FB2'], cmp: ['🔀 COMPARATIVO', '#1E7A4F'] };
const limpaCard = s => esc(s || '').replace(/&lt;(\/?)(b|i|table|tr|th|td)&gt;/g, '<$1$2>').replace(/&lt;br\s*\/?&gt;/g, '<br>');
const Flash = {
  async abrir(semana, matId) {
    Jogo.abrir('Flashcards'); this.matId = matId;
    let q = sb.from('flashcards').select('*').order('ordem');
    q = semana === 'todas' ? filtroLib(q, Aluno.d.libIds, Aluno.d.libLig) : matId ? q.eq('material_id', matId) : q.eq('semana_id', semana);
    const [{ data: cs }, { data: rv }] = await Promise.all([q, usuario ? sb.from('flash_revisao').select('card_id,caixa,proxima').eq('user_id', usuario.id) : { data: [] }]);
    this.rev = new Map((rv || []).map(r => [r.card_id, r])); this.cards = cs || [];
    const h = iso(hoje());
    const dev = this.cards.filter(c => !this.rev.has(c.id) || this.rev.get(c.id).proxima <= h);
    const vistos = this.cards.filter(c => this.rev.has(c.id)).length;
    $('jCorpo').innerHTML = `<div class="qstart"><div class="ring" style="--p:${this.cards.length ? Math.round(vistos / this.cards.length * 100) : 0}"><span>${vistos}/${this.cards.length}</span></div>
      <h3>${dev.length ? dev.length + ' card' + (dev.length > 1 ? 's' : '') + ' para hoje' : 'Tudo revisado por hoje! ✅'}</h3>
      <p class="wd">Leia a pergunta, tente lembrar e vire o card. Marque <b>Sabia</b> ou <b>Revisar</b>: os que você marcar para revisar voltam antes.</p>
      ${dev.length ? '<button class="btn" id="fIni">Começar</button>' : ''}<button class="btn sec2" id="fTodos">Praticar todos os ${this.cards.length}</button></div>`;
    if ($('fIni')) $('fIni').onclick = () => this.sessao(dev);
    $('fTodos').onclick = () => this.sessao([...this.cards]);
  },
  sessao(lista) { this.fila = lista; this.feitos = 0; this.revisar = 0; this.mostrar() },
  mostrar() {
    const c = this.fila[0]; if (!c) return this.fim();
    const t = FTIPO[c.tipo], cor = t ? t[1] : 'var(--gold)';
    $('jCorpo').innerHTML = `<div class="qmeta">Restam ${this.fila.length} · ✅ ${this.feitos} · 🔁 ${this.revisar}</div>
      <div class="fc2" id="fCard"><div class="ffr2">${t ? `<span class="ftag" style="background:${cor}">${t[0]}</span>` : '<span class="ftag" style="background:var(--gold)">PERGUNTA</span>'}
        <div class="fq"><span>${limpaCard(c.frente)}</span></div><em>Toque para ver a resposta</em></div>
        <div class="fbk2 hidden" style="border-color:${cor}"><div class="fvt" style="background:${cor}">RESPOSTA</div>
        <div class="fv" style="--fc:${cor}">${limpaCard(c.verso)}</div>
        ${c.fonte || c.dica ? `<div class="fft">${c.fonte ? `<span class="fsrc">📌 ${esc(c.fonte)}</span>` : ''}${c.dica ? `<div class="fdica">🧠 <b>Gancho:</b> ${esc(c.dica)}</div>` : ''}</div>` : ''}</div></div>
      <div class="fbtns hidden" id="fBtns"><button class="btn rv" id="fRev">🔁 Revisar</button><button class="btn sb" id="fSab">✅ Sabia</button></div>`;
    $('fCard').onclick = () => { $('fCard').querySelector('.fbk2').classList.remove('hidden'); $('fCard').querySelector('em').classList.add('hidden'); $('fBtns').classList.remove('hidden') };
    $('fRev').onclick = () => this.marcar(c, false);
    $('fSab').onclick = () => this.marcar(c, true);
  },
  marcar(c, sabia) {
    const ant = this.rev.get(c.id), cx = sabia ? Math.min((ant?.caixa ?? -1) + 1, INTERVALOS.length - 1) : 0;
    const prox = iso(addDias(hoje(), sabia ? INTERVALOS[cx] : 0));
    const linha = { card_id: c.id, caixa: cx, proxima: prox, atualizado_em: new Date().toISOString() };
    this.rev.set(c.id, linha); Jogo.mudou = true;
    if (usuario) sb.from('flash_revisao').upsert(linha, { onConflict: 'user_id,card_id' }).then(r => r.error && toast('Erro ao salvar: ' + r.error.message));
    this.fila.shift();
    if (sabia) this.feitos++; else { this.revisar++; this.fila.push(c) }
    this.mostrar();
  },
  async fim() {
    if (usuario && this.matId && this.cards.every(c => this.rev.has(c.id)) && !Aluno.d.feitos.has(this.matId)) { await sb.from('progresso_materiais').insert({ material_id: this.matId }); Jogo.mudou = true }
    $('jCorpo').innerHTML = `<div class="qstart"><div style="font-size:48px">🎉</div><h3>Sessão concluída!</h3>
      <p class="wd">${usuario ? 'Os cards voltam para revisão em 1, 3, 7, 15 e 30 dias, conforme você for acertando. Fique de olho na <b>Revisão do dia</b> no Início.' : 'Na assinatura, os cards voltam sozinhos para revisão em 1, 3, 7, 15 e 30 dias, conforme você for acertando.'}</p>
      <button class="btn" id="fSair">Voltar</button></div>${Demo.cta()}`;
    $('fSair').onclick = () => fecharCamada(() => Jogo.fechar());
  }
};
