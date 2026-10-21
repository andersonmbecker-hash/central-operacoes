// ============================================================
// Central de Operações — Página do Cliente
// ============================================================

let PAGE_SLUG    = '';
let PAGE_CLIENTE = null;
let PAGE_RESP    = [];
let PAGE_CONQUISTAS = [];
let PAGE_IDEIAS  = [];
let PAGE_ROTEIROS = [];
let PAGE_EVENTOS = [];
let IS_ADMIN     = false;
let ACTIVE_TAB   = 'ideias';

// Ideia/roteiro em foco (modal)
let _focusIdeia   = null;
let _focusRoteiro = null;

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Pega slug da URL: /lpbasics  ou  ?slug=lpbasics
  const path = window.location.pathname.replace(/^\//, '');
  const params = new URLSearchParams(window.location.search);
  PAGE_SLUG = path || params.get('slug') || '';

  if (!PAGE_SLUG) {
    showError('URL inválida. Nenhum slug encontrado.');
    return;
  }

  // Verifica se é admin
  const user = await dbGetUser();
  IS_ADMIN = !!user;

  // Tema e feedback
  updateThemeBtn();
  injectFeedbackButton(PAGE_SLUG);

  // Ajusta sidebar
  if (!IS_ADMIN) {
    document.getElementById('sidebar-admin-section')?.remove();
    document.getElementById('btn-logout')?.remove();
    document.getElementById('sidebar-voltar')?.remove();
  }

  // Portão de senha (apenas para clientes não-admin)
  if (!IS_ADMIN) {
    const authed = localStorage.getItem(`bz-auth-${PAGE_SLUG}`);
    if (!authed) {
      // Mostra modal de senha — aguarda verificação
      document.getElementById('modal-senha').style.display = 'flex';
      return; // interrompe; verificarSenha() chama initPage() depois
    }
  } else {
    document.getElementById('modal-senha').style.display = 'none';
  }

  await initPage();
});

async function verificarSenha() {
  const input = document.getElementById('input-senha-cliente');
  const erro  = document.getElementById('senha-erro');
  const senha = input.value.trim();
  if (!senha) return;

  try {
    const cliente = await dbGetCliente(PAGE_SLUG);
    if (!cliente.senha || cliente.senha === senha) {
      // Correta (ou cliente sem senha definida)
      localStorage.setItem(`bz-auth-${PAGE_SLUG}`, '1');
      document.getElementById('modal-senha').style.display = 'none';
      await initPage();
    } else {
      erro.style.display = 'block';
      input.value = '';
      input.focus();
    }
  } catch (err) {
    erro.textContent = 'Erro ao verificar. Tente novamente.';
    erro.style.display = 'block';
  }
}

async function initPage() {
  try {
    await loadTudo();
  } catch (err) {
    showError('Erro ao carregar cliente: ' + err.message);
  }
}

async function loadTudo() {
  [PAGE_CLIENTE, PAGE_RESP, PAGE_CONQUISTAS, PAGE_IDEIAS, PAGE_ROTEIROS, PAGE_EVENTOS] =
    await Promise.all([
      dbGetCliente(PAGE_SLUG),
      dbListResponsaveis(PAGE_SLUG).catch(() => []),
      dbListConquistas(PAGE_SLUG).catch(() => []),
      dbListIdeias(PAGE_SLUG).catch(() => []),
      dbListRoteiros(PAGE_SLUG).catch(() => []),
      dbListEventos(PAGE_SLUG).catch(() => []),
    ]);

  // Responsaveis precisam do cliente_id
  PAGE_RESP    = await dbListResponsaveis(PAGE_CLIENTE.id);
  PAGE_CONQUISTAS = await dbListConquistas(PAGE_CLIENTE.id);
  PAGE_IDEIAS  = await dbListIdeias(PAGE_CLIENTE.id);
  PAGE_ROTEIROS= await dbListRoteiros(PAGE_CLIENTE.id);
  PAGE_EVENTOS = await dbListEventos(PAGE_CLIENTE.id);

  renderHeader();
  renderMeta();
  renderConquistas();
  switchTab(ACTIVE_TAB);
}

// Wrapper para corrigir bug do Promise.all acima
async function dbListResponsaveis_fix(clienteId) {
  return dbListResponsaveis(clienteId);
}

// ── Header ────────────────────────────────────────────────────
function renderHeader() {
  const c = PAGE_CLIENTE;
  document.title = `${c.nome} — Central de Operações`;

  const av = document.getElementById('client-av');
  const nome = document.getElementById('client-nome');
  const sub  = document.getElementById('client-sub');
  if (av)   { av.textContent = c.iniciais; av.style.background = avatarColor(c.iniciais); }
  if (nome) nome.textContent = c.nome;
  if (sub)  sub.textContent  = `${c.instagram} · ${c.plano} · Início: ${c.inicio} · ${c.duracao}`;
}

function avatarColor(ini) {
  const colors = ['#e84d2e','#2563eb','#2e9e6b','#d4a01a','#7c3aed','#db2777'];
  let h = 0;
  for (const ch of ini) h = (h * 31 + ch.charCodeAt(0)) & 0xffff;
  return colors[h % colors.length];
}

// ── Meta Grid ─────────────────────────────────────────────────
function renderMeta() {
  const c = PAGE_CLIENTE;
  const delta = parseFollowers(c.seguidores_atual) - parseFollowers(c.seguidores_inicial);
  const deltaStr = fmtDeltaFollowers(delta);

  const container = document.getElementById('meta-grid');
  if (!container) return;

  container.innerHTML = `
    <div class="meta-card">
      <div class="label">Seguidores iniciais</div>
      <div class="value">${c.seguidores_inicial}</div>
      <div class="sub">Na entrada do plano</div>
    </div>
    <div class="meta-card">
      <div class="label">Seguidores atuais</div>
      <div class="value">${c.seguidores_atual}</div>
      ${deltaStr ? `<div class="delta">▲ ${deltaStr}</div>` : ''}
      ${c.seguidores_atualizado_em ? `<div class="sub">Atualizado em ${fmtDate(c.seguidores_atualizado_em)}</div>` : ''}
      ${IS_ADMIN ? `<button class="btn btn-secondary btn-sm" style="margin-top:8px" onclick="openEditFollowers()">✏️ Atualizar</button>` : ''}
    </div>
    <div class="meta-card">
      <div class="label">Média de views</div>
      <div class="value">${c.media_views_inicial}</div>
      <div class="sub">Últimos 20 conteúdos (pré-plano)</div>
    </div>
    <div class="meta-card">
      <div class="label">Responsáveis</div>
      <div class="value" style="font-size:13px">
        ${PAGE_RESP.map(r => `
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
            <div style="width:22px;height:22px;border-radius:50%;background:var(--accent);color:#fff;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center">${r.iniciais}</div>
            <span>${r.nome}</span>
            ${r.is_admin ? `<span class="badge badge-admin" style="font-size:9px">Admin</span>` : ''}
          </div>
        `).join('')}
      </div>
      ${IS_ADMIN ? `<button class="btn btn-secondary btn-sm" style="margin-top:8px" onclick="openRespManager()">✏️ Gerenciar</button>` : ''}
    </div>
  `;
}

// ── Conquistas ────────────────────────────────────────────────
function renderConquistas() {
  const bar = document.getElementById('conquistas-bar');
  if (!bar) return;
  bar.innerHTML = PAGE_CONQUISTAS.map(c => `
    <div class="conquista-item" title="${c.texto}">${c.texto}
      ${IS_ADMIN ? `<button onclick="removerConquista('${c.id}')" style="margin-left:6px;color:inherit;opacity:.6;font-size:12px">×</button>` : ''}
    </div>
  `).join('');
  if (IS_ADMIN) {
    bar.innerHTML += `<button class="btn-add-conquista" onclick="openModal('modal-conquista')">＋ Conquista</button>`;
  }
}

async function salvarConquista() {
  const texto = document.getElementById('conquista-texto').value.trim();
  const data  = document.getElementById('conquista-data').value || null;
  if (!texto) { showToast('Digite o texto da conquista.', 'error'); return; }
  try {
    const c = await dbAddConquista(PAGE_CLIENTE.id, texto, data);
    PAGE_CONQUISTAS.push(c);
    renderConquistas();
    closeModal('modal-conquista');
    document.getElementById('conquista-texto').value = '';
    document.getElementById('conquista-data').value = '';
  } catch (err) { showToast(err.message, 'error'); }
}

async function removerConquista(id) {
  try {
    await dbRemoveConquista(id);
    PAGE_CONQUISTAS = PAGE_CONQUISTAS.filter(c => c.id !== id);
    renderConquistas();
  } catch (err) { showToast(err.message, 'error'); }
}

// ── Tabs ──────────────────────────────────────────────────────
function switchTab(tabId) {
  ACTIVE_TAB = tabId;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${tabId}`));
  if (tabId === 'ideias')     renderIdeias();
  if (tabId === 'aprovadas')  renderAprovadas();
  if (tabId === 'calendario') renderCalendario();
  if (tabId === 'roteiros')   renderRoteiros();
}

// ── Tab: Ideias ───────────────────────────────────────────────
function renderIdeias() {
  const container = document.getElementById('ideias-list');
  const pendentes = PAGE_IDEIAS.filter(i => !i.aprovada);

  let html = '';
  if (IS_ADMIN) {
    html += `<div style="margin-bottom:16px">
      <button class="btn btn-primary" onclick="openNovaIdeia()">＋ Nova ideia</button>
    </div>`;
  }

  if (!pendentes.length) {
    html += `<div class="empty-state"><div class="icon">💡</div><h3>Nenhuma ideia pendente</h3><p>Adicione novas ideias para o cliente revisar.</p></div>`;
  } else {
    html += `<div class="ideias-grid">${pendentes.map(i => ideiaCardHTML(i, false)).join('')}</div>`;
  }
  container.innerHTML = html;
}

function ideiaCardHTML(i, isAprovada) {
  return `
    <div class="ideia-card" onclick="openIdeia('${i.id}')">
      <div class="card-top">
        <div class="card-title">${i.titulo}</div>
        ${badgeFormato(i.formato)}
      </div>
      <div class="card-desc">${i.descricao || i.conceito || ''}</div>
      <div class="card-meta">
        ${i.data_prevista ? `<span class="data-tag">📅 ${fmtDate(i.data_prevista)}</span>` : ''}
        ${isAprovada ? `<span class="badge badge-green">✓ Aprovada</span>` : ''}
      </div>
    </div>
  `;
}

// ── Tab: Aprovadas ────────────────────────────────────────────
function renderAprovadas() {
  const container = document.getElementById('aprovadas-list');
  const aprovadas = PAGE_IDEIAS.filter(i => i.aprovada);

  if (!aprovadas.length) {
    container.innerHTML = `<div class="empty-state"><div class="icon">✅</div><h3>Nenhuma ideia aprovada ainda</h3><p>Aprove ideias da aba "Ideias".</p></div>`;
    return;
  }
  container.innerHTML = `<div class="ideias-grid">${aprovadas.map(i => ideiaCardHTML(i, true)).join('')}</div>`;
}

// ── Tab: Roteiros ─────────────────────────────────────────────
function renderRoteiros() {
  const container = document.getElementById('roteiros-list');
  let html = '';
  if (IS_ADMIN) {
    html += `<div style="margin-bottom:16px">
      <button class="btn btn-primary" onclick="openNovoRoteiro()">＋ Novo roteiro</button>
    </div>`;
  }
  if (!PAGE_ROTEIROS.length) {
    html += `<div class="empty-state"><div class="icon">📝</div><h3>Nenhum roteiro ainda</h3></div>`;
  } else {
    html += PAGE_ROTEIROS.map(r => roteiroHTML(r)).join('');
  }
  container.innerHTML = html;
}

function roteiroHTML(r) {
  return `
    <div class="roteiro-item">
      <div class="top">
        <div>
          <div class="title">${r.titulo}</div>
          <div style="margin-top:4px;display:flex;gap:6px;align-items:center">
            ${badgeFormato(r.formato)}
            ${r.data_prevista ? `<span class="data-tag">📅 ${fmtDate(r.data_prevista)}</span>` : ''}
          </div>
        </div>
        ${IS_ADMIN ? `<button class="btn btn-ghost btn-sm" onclick="deletarRoteiro('${r.id}')" title="Excluir">🗑</button>` : ''}
      </div>
      <div class="roteiro-checks">
        <button class="check-btn script-btn" onclick="openScript('${r.id}')">
          📄 ${r.roteirizado ? 'Ver roteiro' : 'Adicionar roteiro'}
        </button>
        <button class="check-btn ${r.roteirizado ? 'checked' : ''}" onclick="${IS_ADMIN ? `toggleCheck('${r.id}','roteirizado')` : ''}">
          ${r.roteirizado ? '✓' : '○'} Roteirizado
        </button>
        <button class="check-btn ${r.gravado ? 'checked' : ''}" onclick="${IS_ADMIN ? `toggleCheck('${r.id}','gravado')` : ''}">
          ${r.gravado ? '✓' : '○'} Gravado
        </button>
        <button class="check-btn ${r.publicado ? 'checked' : ''}" onclick="${IS_ADMIN ? `toggleCheck('${r.id}','publicado')` : ''}">
          ${r.publicado ? '✓' : '○'} Publicado
        </button>
      </div>
    </div>
  `;
}

async function toggleCheck(roteiroId, campo) {
  const r = PAGE_ROTEIROS.find(x => x.id === roteiroId);
  if (!r) return;
  const novo = !r[campo];
  try {
    await dbUpdateRoteiro(roteiroId, { [campo]: novo });
    r[campo] = novo;
    renderRoteiros();
  } catch (err) { showToast(err.message, 'error'); }
}

async function deletarRoteiro(id) {
  if (!confirm('Excluir este roteiro?')) return;
  try {
    await dbDeleteRoteiro(id);
    PAGE_ROTEIROS = PAGE_ROTEIROS.filter(r => r.id !== id);
    renderRoteiros();
  } catch (err) { showToast(err.message, 'error'); }
}

// ── Calendário ────────────────────────────────────────────────
function renderCalendario() {
  const container = document.getElementById('calendario-container');
  if (!container) return;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const monthName = now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Mapear eventos por dia
  const eventosByDay = {};
  PAGE_EVENTOS.forEach(ev => {
    if (!eventosByDay[ev.dia]) eventosByDay[ev.dia] = [];
    eventosByDay[ev.dia].push(ev);
  });

  let html = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <h3 style="font-size:15px;font-weight:700;text-transform:capitalize">${monthName}</h3>
      ${IS_ADMIN ? `<button class="btn btn-primary btn-sm" onclick="openNovoEvento()">＋ Evento</button>` : ''}
    </div>
    <div class="calendar-grid">
      ${weekDays.map(d => `<div class="cal-day-label">${d}</div>`).join('')}
  `;

  // Dias vazios antes do início
  for (let i = 0; i < firstDayOfWeek; i++) {
    html += `<div class="cal-day" style="background:var(--bg3);opacity:.4"></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = d === now.getDate();
    const events = eventosByDay[d] || [];
    html += `<div class="cal-day ${isToday ? 'today' : ''}">
      <div class="day-num">${d}</div>
      ${events.map(ev => `
        <div class="cal-event badge-${ev.tipo}" title="${ev.titulo}">${ev.titulo}</div>
      `).join('')}
    </div>`;
  }

  html += '</div>';
  container.innerHTML = html;
}

// ── Modais: Ideia ─────────────────────────────────────────────
function openIdeia(ideiaId) {
  _focusIdeia = PAGE_IDEIAS.find(i => i.id === ideiaId);
  if (!_focusIdeia) return;
  const i = _focusIdeia;

  document.getElementById('modal-ideia-titulo').textContent = i.titulo;
  document.getElementById('modal-ideia-formato').innerHTML = badgeFormato(i.formato);
  document.getElementById('modal-ideia-desc').textContent = i.descricao || '—';
  document.getElementById('modal-ideia-conceito').textContent = i.conceito || '—';
  document.getElementById('modal-ideia-links').innerHTML = i.links
    ? i.links.split('\n').map(l => l.trim() ? `<a href="${l}" target="_blank" rel="noopener" style="color:var(--blue);display:block">${l}</a>` : '').join('')
    : '—';
  document.getElementById('modal-ideia-obs').textContent = i.obs || '—';

  const dateField = document.getElementById('modal-ideia-date');
  if (dateField) dateField.value = i.data_prevista || '';

  // Footer: aprovação + adicionar roteiro
  const footer = document.getElementById('modal-ideia-footer');
  if (IS_ADMIN) {
    if (i.aprovada) {
      footer.innerHTML = `
        <span class="badge badge-green">✓ Aprovada</span>
        <button class="btn btn-primary" onclick="adicionarRoteiro('${i.id}')">📝 Adicionar roteiro</button>
      `;
    } else {
      footer.innerHTML = `
        <button class="btn btn-secondary" onclick="closeModal('modal-ideia')">Fechar</button>
        <button class="btn btn-primary" onclick="salvarDataPrevista('${i.id}')">💾 Salvar data</button>
        <button class="btn btn-green" onclick="aprovarIdeia('${i.id}')">✓ Aprovar ideia</button>
      `;
    }
  } else {
    if (i.aprovada) {
      footer.innerHTML = `<span class="badge badge-green">✓ Aprovada</span>`;
    } else {
      footer.innerHTML = `
        <button class="btn btn-secondary" onclick="closeModal('modal-ideia')">Fechar</button>
        <button class="btn btn-green" onclick="aprovarIdeia('${i.id}')">✓ Aprovar esta ideia</button>
      `;
    }
  }

  openModal('modal-ideia');
}

async function aprovarIdeia(ideiaId) {
  try {
    await dbAprovarIdeia(ideiaId);
    const i = PAGE_IDEIAS.find(x => x.id === ideiaId);
    if (i) i.aprovada = true;
    closeModal('modal-ideia');
    showToast('Ideia aprovada! ✓', 'success');
    renderIdeias();
    renderAprovadas();
  } catch (err) { showToast(err.message, 'error'); }
}

async function salvarDataPrevista(ideiaId) {
  const data = document.getElementById('modal-ideia-date').value;
  try {
    await dbUpdateIdeia(ideiaId, { data_prevista: data || null });
    const i = PAGE_IDEIAS.find(x => x.id === ideiaId);
    if (i) i.data_prevista = data || null;
    showToast('Data salva!', 'success');
    renderIdeias();
    renderAprovadas();
  } catch (err) { showToast(err.message, 'error'); }
}

// ── Roteiro a partir de ideia aprovada ───────────────────────
async function adicionarRoteiro(ideiaId) {
  const ideia = PAGE_IDEIAS.find(i => i.id === ideiaId);
  if (!ideia) return;

  // Verifica se já existe roteiro para esta ideia
  const existe = PAGE_ROTEIROS.find(r => r.ideia_id === ideiaId);
  if (existe) {
    closeModal('modal-ideia');
    switchTab('roteiros');
    showToast('Roteiro já existe para esta ideia.', 'default');
    return;
  }

  try {
    const roteiro = await dbCreateRoteiro({
      cliente_id:    PAGE_CLIENTE.id,
      ideia_id:      ideiaId,
      titulo:        ideia.titulo,
      formato:       ideia.formato,
      data_prevista: ideia.data_prevista || null,
      script:        '',
      roteirizado:   false,
      gravado:       false,
      publicado:     false,
    });
    PAGE_ROTEIROS.unshift(roteiro);
    closeModal('modal-ideia');
    switchTab('roteiros');
    showToast('Roteiro criado!', 'success');
  } catch (err) { showToast(err.message, 'error'); }
}

// ── Modal: Nova ideia ─────────────────────────────────────────
function openNovaIdeia() {
  ['ni-titulo','ni-desc','ni-conceito','ni-links','ni-obs','ni-data'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('ni-formato').value = 'reel';
  openModal('modal-nova-ideia');
}

async function salvarNovaIdeia() {
  const titulo = document.getElementById('ni-titulo').value.trim();
  if (!titulo) { showToast('Digite o título da ideia.', 'error'); return; }

  const btn = document.getElementById('btn-salvar-ideia');
  btn.disabled = true; btn.textContent = 'Salvando…';
  try {
    const ideia = await dbCreateIdeia({
      cliente_id:    PAGE_CLIENTE.id,
      titulo,
      formato:       document.getElementById('ni-formato').value,
      data_prevista: document.getElementById('ni-data').value || null,
      descricao:     document.getElementById('ni-desc').value,
      conceito:      document.getElementById('ni-conceito').value,
      links:         document.getElementById('ni-links').value,
      obs:           document.getElementById('ni-obs').value,
      aprovada:      false,
    });
    PAGE_IDEIAS.unshift(ideia);
    closeModal('modal-nova-ideia');
    showToast('Ideia adicionada!', 'success');
    renderIdeias();
  } catch (err) { showToast(err.message, 'error'); }
  finally { btn.disabled = false; btn.textContent = 'Adicionar ideia'; }
}

// ── Modal: Novo roteiro (manual) ──────────────────────────────
function openNovoRoteiro() {
  ['nr-titulo','nr-data','nr-script'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('nr-formato').value = 'reel';
  openModal('modal-novo-roteiro');
}

async function salvarNovoRoteiro() {
  const titulo = document.getElementById('nr-titulo').value.trim();
  if (!titulo) { showToast('Digite o título do roteiro.', 'error'); return; }
  const btn = document.getElementById('btn-salvar-roteiro');
  btn.disabled = true; btn.textContent = 'Salvando…';
  try {
    const r = await dbCreateRoteiro({
      cliente_id:    PAGE_CLIENTE.id,
      ideia_id:      null,
      titulo,
      formato:       document.getElementById('nr-formato').value,
      data_prevista: document.getElementById('nr-data').value || null,
      script:        document.getElementById('nr-script').value,
      roteirizado:   !!document.getElementById('nr-script').value.trim(),
      gravado:       false,
      publicado:     false,
    });
    PAGE_ROTEIROS.unshift(r);
    closeModal('modal-novo-roteiro');
    showToast('Roteiro criado!', 'success');
    renderRoteiros();
  } catch (err) { showToast(err.message, 'error'); }
  finally { btn.disabled = false; btn.textContent = 'Criar roteiro'; }
}

// ── Modal: Script do roteiro ──────────────────────────────────
function openScript(roteiroId) {
  _focusRoteiro = PAGE_ROTEIROS.find(r => r.id === roteiroId);
  if (!_focusRoteiro) return;
  document.getElementById('script-titulo').textContent = _focusRoteiro.titulo;
  const area = document.getElementById('script-texto');
  area.value = _focusRoteiro.script || '';
  area.readOnly = !IS_ADMIN;
  document.getElementById('btn-salvar-script').style.display = IS_ADMIN ? 'inline-flex' : 'none';
  openModal('modal-script');
}

async function salvarScript() {
  if (!_focusRoteiro) return;
  const script = document.getElementById('script-texto').value;
  try {
    await dbUpdateRoteiro(_focusRoteiro.id, {
      script,
      roteirizado: script.trim().length > 0,
    });
    _focusRoteiro.script      = script;
    _focusRoteiro.roteirizado = script.trim().length > 0;
    closeModal('modal-script');
    showToast('Roteiro salvo!', 'success');
    renderRoteiros();
  } catch (err) { showToast(err.message, 'error'); }
}

// ── Modal: Novo evento do calendário ─────────────────────────
function openNovoEvento() {
  document.getElementById('ev-dia').value = '';
  document.getElementById('ev-titulo').value = '';
  document.getElementById('ev-tipo').value = 'reel';
  openModal('modal-novo-evento');
}

async function salvarEvento() {
  const dia    = parseInt(document.getElementById('ev-dia').value);
  const titulo = document.getElementById('ev-titulo').value.trim();
  if (!dia || !titulo) { showToast('Preencha o dia e o título.', 'error'); return; }
  try {
    const ev = await dbCreateEvento({
      cliente_id: PAGE_CLIENTE.id,
      dia, titulo,
      tipo: document.getElementById('ev-tipo').value,
    });
    PAGE_EVENTOS.push(ev);
    closeModal('modal-novo-evento');
    showToast('Evento adicionado!', 'success');
    renderCalendario();
  } catch (err) { showToast(err.message, 'error'); }
}

// ── Modal: Atualizar seguidores ───────────────────────────────
function openEditFollowers() {
  document.getElementById('edit-seg-valor').value = '';
  openModal('modal-edit-followers');
}

async function salvarSeguidores() {
  const valor = document.getElementById('edit-seg-valor').value.trim();
  if (!valor) { showToast('Digite o valor dos seguidores.', 'error'); return; }
  try {
    const hoje = todayISO();
    await dbUpdateCliente(PAGE_CLIENTE.id, {
      seguidores_atual: valor,
      seguidores_atualizado_em: hoje,
    });
    PAGE_CLIENTE.seguidores_atual = valor;
    PAGE_CLIENTE.seguidores_atualizado_em = hoje;
    closeModal('modal-edit-followers');
    showToast('Seguidores atualizados!', 'success');
    renderMeta();
  } catch (err) { showToast(err.message, 'error'); }
}

// ── Modal: Gerenciar responsáveis ─────────────────────────────
function openRespManager() {
  renderRespModal();
  openModal('modal-resp');
}

function renderRespModal() {
  const lista = document.getElementById('resp-lista-modal');
  lista.innerHTML = PAGE_RESP.map((r, idx) => `
    <div class="resp-chip" style="flex:1;min-width:200px">
      <div class="av">${r.iniciais}</div>
      <div class="info">
        <div class="name">${r.nome} ${r.is_admin ? '<span class="badge badge-admin" style="font-size:9px">Admin</span>' : ''}</div>
        <div class="role">${r.cargo}${r.contato ? ' · ' + r.contato : ''}</div>
      </div>
      ${!r.is_admin ? `<button class="btn-remove" onclick="removerResp('${r.id}')">×</button>` : '<span title="Admin fixo">🔒</span>'}
    </div>
  `).join('');
}

async function removerResp(id) {
  try {
    await dbRemoveResponsavel(id);
    PAGE_RESP = PAGE_RESP.filter(r => r.id !== id);
    renderRespModal();
    renderMeta();
  } catch (err) { showToast(err.message, 'error'); }
}

async function adicionarResp() {
  const nome    = document.getElementById('add-resp-nome').value.trim();
  const cargo   = document.getElementById('add-resp-cargo').value.trim();
  const contato = document.getElementById('add-resp-contato').value.trim();
  if (!nome) { showToast('Digite o nome.', 'error'); return; }

  try {
    const r = await dbAddResponsavel({
      cliente_id: PAGE_CLIENTE.id,
      nome,
      iniciais:   gerarIniciais(nome),
      cargo,
      contato,
      ordem:      PAGE_RESP.length,
      is_admin:   false,
    });
    PAGE_RESP.push(r);
    document.getElementById('add-resp-nome').value    = '';
    document.getElementById('add-resp-cargo').value   = '';
    document.getElementById('add-resp-contato').value = '';
    renderRespModal();
    renderMeta();
    showToast(`${nome} adicionado(a)!`, 'success');
  } catch (err) { showToast(err.message, 'error'); }
}

// ── Error state ───────────────────────────────────────────────
function showError(msg) {
  document.getElementById('page-root').innerHTML = `
    <div class="empty-state" style="margin-top:80px">
      <div class="icon">⚠️</div>
      <h3>Página não encontrada</h3>
      <p>${msg}</p>
    </div>
  `;
}
