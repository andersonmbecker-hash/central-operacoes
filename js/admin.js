// ============================================================
// Central de Operações — Painel Admin
// ============================================================

let currentUser  = null;
let clientes     = [];

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Verifica autenticação
  currentUser = await dbGetUser();
  if (!currentUser) {
    window.location.href = 'login.html';
    return;
  }

  // Tema e feedback
  updateThemeBtn();
  injectFeedbackButton('admin');

  // Carrega clientes e badge de pendentes
  await loadClientes();
  await atualizarBadgePendentes();
});

// ── Carregar clientes ─────────────────────────────────────────
async function loadClientes() {
  const container = document.getElementById('clientes-container');
  container.innerHTML = `<div class="loading-spinner"><div class="spinner"></div> Carregando clientes…</div>`;

  try {
    clientes = await dbListClientes();
    renderClienteCards();
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><h3>Erro ao carregar</h3><p>${err.message}</p></div>`;
  }
}

function renderClienteCards() {
  const container = document.getElementById('clientes-container');
  const q = (document.getElementById('search-input')?.value || '').toLowerCase();
  const list = q ? clientes.filter(c => c.nome.toLowerCase().includes(q) || c.instagram.toLowerCase().includes(q)) : clientes;

  if (!list.length) {
    container.innerHTML = `<div class="empty-state"><div class="icon">🏢</div><h3>Nenhum cliente ainda</h3><p>Clique em "Novo cliente" para começar.</p></div>`;
    return;
  }

  container.innerHTML = `<div class="card-grid">${list.map(clienteCardHTML).join('')}</div>`;
}

function clienteCardHTML(c) {
  const delta = parseFollowers(c.seguidores_atual) - parseFollowers(c.seguidores_inicial);
  const deltaStr = fmtDeltaFollowers(delta);
  const avInner = c.logo_url
    ? `<img src="${c.logo_url}" alt="${c.nome}" style="background:#fff">`
    : c.iniciais;
  return `
    <div class="client-card" onclick="window.location.href='/${c.slug}'">
      <div class="top">
        <div class="av-wrap">
          <div class="av" style="background:${c.logo_url ? 'var(--bg3)' : avatarColor(c.iniciais)}">${avInner}</div>
          <button class="av-upload-btn" title="Trocar logo" onclick="event.stopPropagation();triggerLogoUpload('${c.id}')">📷</button>
          <input type="file" id="logo-input-${c.id}" accept="image/*" onchange="uploadLogo('${c.id}', this)">
        </div>
        <div>
          <div class="name">${c.nome}</div>
          <div class="plan">${c.plano} · ${c.instagram}</div>
        </div>
      </div>
      <div class="stats">
        <div class="stat">
          <div class="label">Seguidores</div>
          <div class="val">${c.seguidores_atual}</div>
        </div>
        ${deltaStr ? `<div class="stat"><div class="label">Crescimento</div><div class="val" style="color:var(--green)">${deltaStr}</div></div>` : ''}
        <div class="stat">
          <div class="label">Início</div>
          <div class="val">${c.inicio}</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:4px">
        <a href="/${c.slug}" class="btn btn-primary btn-sm" onclick="event.stopPropagation()">Ver painel</a>
        <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();copiarLink('${c.slug}')">📋 Copiar link</button>
        <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();confirmarExcluir('${c.id}','${c.nome}')">🗑</button>
      </div>
    </div>
  `;
}

function avatarColor(iniciais) {
  const colors = ['#e84d2e','#2563eb','#2e9e6b','#d4a01a','#7c3aed','#db2777'];
  let hash = 0;
  for (const ch of iniciais) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff;
  return colors[hash % colors.length];
}

// ── Busca ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const search = document.getElementById('search-input');
  if (search) search.addEventListener('input', renderClienteCards);
});

// ── Copiar link do cliente ────────────────────────────────────
function copiarLink(slug) {
  const url = `${window.location.origin}/${slug}`;
  navigator.clipboard.writeText(url).then(
    () => showToast('Link copiado!', 'success'),
    () => showToast(url)
  );
}

// ── Excluir cliente ───────────────────────────────────────────
let _excluirId = null;
function confirmarExcluir(id, nome) {
  _excluirId = id;
  document.getElementById('excluir-nome').textContent = nome;
  openModal('modal-excluir');
}

async function excluirCliente() {
  if (!_excluirId) return;
  try {
    await dbDeleteCliente(_excluirId);
    closeModal('modal-excluir');
    showToast('Cliente removido.', 'success');
    await loadClientes();
  } catch (err) {
    showToast('Erro ao remover: ' + err.message, 'error');
  }
}

// ── Criar novo cliente ────────────────────────────────────────
function abrirNovoCliente() {
  // Limpa form
  ['nc-nome','nc-slug','nc-plano','nc-inicio','nc-instagram','nc-duracao',
   'nc-seg-inicial','nc-seg-atual','nc-media-views'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  openModal('modal-novo-cliente');
}

// Auto-slug ao digitar nome
document.addEventListener('DOMContentLoaded', () => {
  const nomeEl = document.getElementById('nc-nome');
  if (nomeEl) {
    nomeEl.addEventListener('input', () => {
      const slugEl = document.getElementById('nc-slug');
      if (slugEl && !slugEl._manual) {
        slugEl.value = nomeEl.value.toLowerCase()
          .normalize('NFD').replace(/[̀-ͯ]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
      }
    });
  }
  const slugEl = document.getElementById('nc-slug');
  if (slugEl) slugEl.addEventListener('input', () => { slugEl._manual = true; });
});

async function salvarNovoCliente() {
  const nome     = document.getElementById('nc-nome').value.trim();
  const slug     = document.getElementById('nc-slug').value.trim();
  const plano    = document.getElementById('nc-plano').value.trim();
  const inicio   = document.getElementById('nc-inicio').value.trim();
  const instagram= document.getElementById('nc-instagram').value.trim();
  const duracao  = document.getElementById('nc-duracao').value.trim();
  const segIni   = document.getElementById('nc-seg-inicial').value.trim();
  const segAtual = document.getElementById('nc-seg-atual').value.trim() || segIni;
  const mediaViews = document.getElementById('nc-media-views').value.trim();

  if (!nome || !slug) {
    showToast('Nome e slug são obrigatórios.', 'error');
    return;
  }

  const btn = document.getElementById('btn-salvar-cliente');
  btn.disabled = true;
  btn.textContent = 'Salvando…';

  try {
    // 1. Cria cliente
    const iniciais = gerarIniciais(nome);
    const payload = {
      slug, nome, iniciais, plano, inicio, instagram, duracao,
      seguidores_inicial: segIni,
      seguidores_atual: segAtual,
      media_views_inicial: mediaViews,
    };
    const cliente = await dbCreateCliente(payload);

    // 2. Adiciona Anderson como admin (ordem 0)
    await dbAddResponsavel({
      cliente_id: cliente.id,
      ...ADMIN_RESP
    });

    closeModal('modal-novo-cliente');
    showToast(`Cliente "${nome}" criado!`, 'success');
    await loadClientes();
  } catch (err) {
    showToast('Erro: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Criar cliente';
  }
}

// ── Logo do cliente ───────────────────────────────────────────
function triggerLogoUpload(clienteId) {
  document.getElementById(`logo-input-${clienteId}`)?.click();
}

async function uploadLogo(clienteId, input) {
  const file = input.files[0];
  if (!file) return;
  const maxMb = 2;
  if (file.size > maxMb * 1024 * 1024) {
    showToast(`A imagem deve ter menos de ${maxMb}MB.`, 'error');
    return;
  }
  showToast('Enviando logo…');
  try {
    const url = await dbUploadLogo(clienteId, file);
    await dbUpdateCliente(clienteId, { logo_url: url });
    // Atualiza localmente sem recarregar tudo
    const idx = clientes.findIndex(c => c.id === clienteId);
    if (idx >= 0) clientes[idx].logo_url = url;
    renderClienteCards();
    showToast('Logo atualizada!', 'success');
  } catch (err) {
    showToast('Erro no upload: ' + err.message, 'error');
  }
}

// ── Solicitações de acesso ────────────────────────────────────
async function atualizarBadgePendentes() {
  try {
    const pendentes = await dbListAcessosPendentes();
    const badge = document.getElementById('badge-pendentes');
    if (!badge) return;
    if (pendentes.length > 0) {
      badge.textContent = pendentes.length;
      badge.style.display = 'inline';
    } else {
      badge.style.display = 'none';
    }
  } catch (e) { /* silencioso */ }
}

async function abrirSolicitacoes() {
  openModal('modal-solicitacoes');
  const lista = document.getElementById('solicitacoes-lista');
  lista.innerHTML = '<div class="loading-spinner"><div class="spinner"></div> Carregando…</div>';

  try {
    const pendentes = await dbListAcessosPendentes();
    if (!pendentes.length) {
      lista.innerHTML = '<div class="empty-state"><div class="icon">✅</div><h3>Nenhuma solicitação pendente</h3></div>';
      return;
    }

    // Para cada solicitação, busca responsáveis do cliente correspondente
    const clienteIds = [...new Set(pendentes.map(p => p.cliente_id))];
    const respMap = {};
    await Promise.all(clienteIds.map(async (cid) => {
      try {
        const resps = await dbListResponsaveis(cid);
        respMap[cid] = resps;
      } catch(e) { respMap[cid] = []; }
    }));

    lista.innerHTML = pendentes.map(s => {
      const resps = respMap[s.cliente_id] || [];
      const respOptions = resps.map(r => `<option value="${r.id}">${r.nome} (${r.cargo || 'sem cargo'})</option>`).join('');
      return `
        <div id="sol-${s.id}" style="border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px 16px;margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap">
            <div>
              <div style="font-weight:600;font-size:14px">${s.nome}</div>
              <div style="font-size:12px;color:var(--fg3);margin-top:2px">${s.email}</div>
              <div style="font-size:12px;color:var(--fg3);margin-top:2px">
                Painel: <strong>${s.clientes?.nome || s.cliente_id}</strong> ·
                ${new Date(s.criado_em).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}
              </div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              ${resps.length ? `
                <select id="resp-${s.id}" style="font-size:12px;padding:4px 8px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--bg);color:var(--fg)">
                  <option value="">Vincular responsável…</option>
                  ${respOptions}
                </select>
              ` : ''}
              <button class="btn btn-primary btn-sm" onclick="aprovarAcesso('${s.id}','${s.cliente_id}')">✓ Aprovar</button>
              <button class="btn btn-danger btn-sm" onclick="rejeitarAcesso('${s.id}')">✕ Rejeitar</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    lista.innerHTML = `<p style="color:var(--fg3)">${err.message}</p>`;
  }
}

async function aprovarAcesso(id, clienteId) {
  const respSelect = document.getElementById(`resp-${id}`);
  const responsavelId = respSelect?.value || null;

  try {
    await dbAprovarAcesso(id, responsavelId);
    document.getElementById(`sol-${id}`)?.remove();
    showToast('Acesso aprovado!', 'success');
    await atualizarBadgePendentes();

    const lista = document.getElementById('solicitacoes-lista');
    if (!lista.querySelector('[id^="sol-"]')) {
      lista.innerHTML = '<div class="empty-state"><div class="icon">✅</div><h3>Nenhuma solicitação pendente</h3></div>';
    }
  } catch (err) {
    showToast('Erro ao aprovar: ' + err.message, 'error');
  }
}

async function rejeitarAcesso(id) {
  try {
    await dbRejeitarAcesso(id);
    document.getElementById(`sol-${id}`)?.remove();
    showToast('Acesso rejeitado.', 'success');
    await atualizarBadgePendentes();

    const lista = document.getElementById('solicitacoes-lista');
    if (!lista.querySelector('[id^="sol-"]')) {
      lista.innerHTML = '<div class="empty-state"><div class="icon">✅</div><h3>Nenhuma solicitação pendente</h3></div>';
    }
  } catch (err) {
    showToast('Erro ao rejeitar: ' + err.message, 'error');
  }
}

// ── Logout ────────────────────────────────────────────────────
async function logout() {
  await dbSignOut();
  window.location.href = 'login.html';
}
