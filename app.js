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
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hoje = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d };
const dataLocal = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) };
const addDias = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x };
const fmt = d => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const diasAte = s => Math.round((dataLocal(s) - hoje()) / 864e5);
function toast(t) { const e = document.createElement('div'); e.className = 'toast'; e.textContent = t; document.body.appendChild(e); setTimeout(() => e.remove(), 2800) }
async function copiar(t) { try { await navigator.clipboard.writeText(t); toast('Copiado!') } catch { prompt('Copie:', t) } }

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

$('bSair').onclick = () => sb.auth.signOut();
$('bPainel').onclick = () => { location.hash = location.hash === '#painel' ? '#a-inicio' : '#painel' };
document.querySelectorAll('#nav [data-nav]').forEach(b => b.onclick = () => Aluno.ir(b.dataset.nav));
window.addEventListener('hashchange', () => usuario && rotear());

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
  } else { $('app').classList.add('hidden'); $('auth').classList.remove('hidden') }
});

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
    const [sem, mt, av, pm, ed] = await Promise.all([
      sb.from('semanas').select('id,numero,titulo,descricao,dias_para_liberar').eq('trilha_id', t.id).order('numero'),
      sb.from('materiais').select('id,semana_id,titulo,categoria,ordem').order('ordem'),
      sb.from('avisos').select('id,titulo,texto,link,trilha_id,criado_em').eq('ativo', true).or(`trilha_id.is.null,trilha_id.eq.${t.id}`).order('criado_em', { ascending: false }).limit(10),
      sb.from('progresso_materiais').select('material_id,concluido_em').eq('user_id', usuario.id),
      sb.from('editais').select('id,nome,data_prova').eq('trilha_id', t.id).limit(1).maybeSingle()
    ]);
    const ini = dataLocal(t.mat.inicio), h = hoje();
    const feitos = new Set((pm.data || []).map(x => x.material_id));
    const semanas = (sem.data || []).map(s => {
      const lib = addDias(ini, s.dias_para_liberar);
      const itens = (mt.data || []).filter(m => m.semana_id === s.id).sort((a, b) => ORDEM_CAT.indexOf(a.categoria) - ORDEM_CAT.indexOf(b.categoria) || a.ordem - b.ordem);
      const aberta = h >= lib;
      const feitosN = itens.filter(i => feitos.has(i.id)).length;
      return { ...s, lib, aberta, itens, feitosN, concluida: aberta && itens.length > 0 && feitosN === itens.length };
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
    this.d = { semanas, avisos: av.data || [], feitos, edital };
  },

  ir(aba) { this.aba = aba; history.replaceState(null, '', '#a-' + aba); this.render(); window.scrollTo(0, 0) },

  render() {
    const { semanas } = this.d;
    const abertas = semanas.filter(s => s.aberta);
    this.atual = abertas[abertas.length - 1] || null;
    $('nav').classList.remove('hidden');
    $('nav').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.nav === this.aba));
    const titulos = { inicio: 'Sua semana de estudos', materiais: 'Seus materiais', edital: 'Edital vivo', conta: 'Minha conta' };
    $('ttl').textContent = titulos[this.aba];
    $('prog').classList.add('hidden');
    const c = $('conteudo');
    c.innerHTML = (trilhas.length > 1 ? `<div class="pf" style="margin-bottom:12px"><select id="selTrilha">${trilhas.map(t => `<option value="${t.id}" ${t.id === this.trilha.id ? 'selected' : ''}>${esc(t.nome)}</option>`).join('')}</select></div>` : '') + this['tela_' + this.aba]();
    if ($('selTrilha')) $('selTrilha').onchange = async e => { this.trilha = trilhas.find(t => t.id === e.target.value); ls.set('trilha', this.trilha.id); c.innerHTML = '<div class="spin">Carregando…</div>'; await this.carregar(); this.render() };
    this.ligar(c);
  },

  // --- componentes
  item(i) {
    const [ic, nome] = CAT[i.categoria] || CAT.extra, feito = this.d.feitos.has(i.id);
    return `<div class="item ${feito ? 'feito' : ''}">
      <button class="chk" data-feito="${i.id}" aria-label="Marcar como concluído">${feito ? '✓' : ''}</button>
      <div class="itx"><div class="icat">${ic} ${nome}</div><div class="inm">${esc(i.titulo)}</div></div>
      <div class="mb"><button class="dl" data-ler="${i.id}" data-t="${esc(i.titulo)}">Abrir</button><button class="dl alt ico" data-baixar="${i.id}" data-t="${esc(i.titulo)}" aria-label="Baixar">⬇</button></div></div>`;
  },
  barra(pct, txt) { return `<div class="pbar"><div style="width:${pct}%"></div></div>${txt ? `<div class="ptxt">${txt}</div>` : ''}` },
  vencimento() {
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
      <ol><li>Toda semana libera um <b>pacote novo</b>: aula completa, legislação, mapa mental, questões e flashcards.</li>
      <li>Estude e toque no <b>círculo</b> de cada item para marcar como concluído.</li>
      <li>Ao concluir a semana, os assuntos são marcados no seu <b>Edital vivo</b>.</li>
      <li>Os <b>cadeados</b> mostram o que vem pela frente e quando chega.</li></ol></div>`;
    const stats = [];
    if (edital?.data_prova) { const f = diasAte(edital.data_prova); if (f >= 0) stats.push(`<div class="stat"><b>${f}</b><span>dias para a prova</span></div>`) }
    if (edital) stats.push(`<div class="stat destaque" data-ir="edital"><b>${edital.pct}%</b><span>do edital estudado</span></div>`);
    stats.push(`<div class="stat"><b>${semanas.filter(s => s.concluida).length}/${semanas.filter(s => s.aberta).length}</b><span>semanas concluídas</span></div>`);
    html += `<div class="stats">${stats.join('')}</div>`;
    if (a) {
      const pct = a.itens.length ? Math.round(a.feitosN / a.itens.length * 100) : 0;
      html += `<div class="sec">Estude esta semana</div><div class="card now semana">
        <div class="shead"><div class="dot">${a.numero}</div><div style="flex:1"><div class="wt">Semana ${a.numero} · ${esc(a.titulo)}</div>${a.descricao ? `<div class="wd">${esc(a.descricao)}</div>` : ''}</div>${a.concluida ? '<span class="tag okk">concluída</span>' : ''}</div>
        ${a.itens.length ? this.barra(pct, `${a.feitosN} de ${a.itens.length} itens concluídos`) + a.itens.map(i => this.item(i)).join('') : '<div class="wd" style="margin-top:8px">O material desta semana está sendo preparado. Fique de olho no mural!</div>'}</div>`;
      const pend = semanas.filter(s => s.aberta && s !== a && !s.concluida && s.itens.length);
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
        <div class="dot">${s.concluida ? '✓' : s.numero}</div><div style="flex:1;text-align:left"><div class="wt">Semana ${s.numero} · ${esc(s.titulo)}</div><div class="wd">${s.feitosN}/${s.itens.length} concluídos</div></div><span class="seta">${aberto ? '▴' : '▾'}</span></button>
        ${aberto ? (itens.length ? itens.map(i => this.item(i)).join('') : '<div class="wd" style="margin-top:8px">Material em preparação.</div>') : ''}</div>`;
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
    c.querySelectorAll('[data-ler]').forEach(b => b.onclick = () => Leitor.abrir(b.dataset.ler, b.dataset.t));
    c.querySelectorAll('[data-baixar]').forEach(b => b.onclick = () => Leitor.baixarDireto(b, b.dataset.baixar, b.dataset.t));
    c.querySelectorAll('[data-feito]').forEach(b => b.onclick = () => this.alternarFeito(b.dataset.feito, b));
    c.querySelectorAll('[data-ir]').forEach(b => b.onclick = () => this.ir(b.dataset.ir));
    c.querySelectorAll('[data-filtro]').forEach(b => b.onclick = () => { this.filtro = b.dataset.filtro; this.render() });
    c.querySelectorAll('[data-toggle]').forEach(b => b.onclick = () => { const k = b.dataset.toggle; this.abertas[k] = !(this.abertas[k] ?? (this.aba === 'materiais' && this.d.semanas.filter(s => s.aberta).slice(-1)[0]?.id === k)); this.render() });
    c.querySelectorAll('[data-topico]').forEach(b => b.onclick = () => this.alternarTopico(b.dataset.topico, b));
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
    a.download = (titulo || 'material').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') + '.pdf';
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
  async abrir(id, titulo) {
    this.titulo = titulo; $('lTitulo').textContent = titulo;
    const box = $('lPages'); box.innerHTML = '<div class="lstatus">Preparando seu material…</div>';
    $('leitor').classList.remove('hidden'); document.body.style.overflow = 'hidden';
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
$('lFechar').onclick = () => Leitor.fechar();
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
        ${materiais.filter(m => m.semana_id === s.id).map(m => `<div class="mt"><span>${(CAT[m.categoria] || CAT.extra)[0]} ${esc(m.titulo)}</span><button class="dl red" data-rmat="${m.id}" data-path="${esc(m.storage_path)}">Remover</button></div>`).join('') || '<div class="wd" style="margin-top:6px">Sem PDF ainda.</div>'}
        <div class="pf"><label>Enviar PDF para esta semana</label><input type="file" accept="application/pdf" data-arq="${s.id}"><select data-cat="${s.id}" style="margin-top:6px">${ORDEM_CAT.map(k => `<option value="${k}">${CAT[k][0]} ${CAT[k][1]}</option>`).join('')}</select><input placeholder="Nome do material (ex.: Lei de Drogas esquematizada)" data-tit="${s.id}" style="margin-top:6px"><button class="btn" data-up="${s.id}" data-num="${s.numero}">Enviar PDF</button></div></div>`).join('')}
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
    const r = await sb.from('materiais').insert({ semana_id: sid, titulo, storage_path: caminho, categoria });
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

// ---------- app instalável ----------
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { });
