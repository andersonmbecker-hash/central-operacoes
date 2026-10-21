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

  // Carrega clientes
  await loadClientes();
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
  return `
    <div class="client-card" onclick="window.location.href='cliente.html?slug=${c.slug}'">
      <div class="top">
        <div class="av" style="background:${avatarColor(c.iniciais)}">${c.iniciais}</div>
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
        <a href="cliente.html?slug=${c.slug}" class="btn btn-primary btn-sm" onclick="event.stopPropagation()">Ver painel</a>
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
   'nc-seg-inicial','nc-seg-atual','nc-media-views','nc-senha','nc-resp-cargo','nc-resp-contato'].forEach(id => {
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
  const senha    = document.getElementById('nc-senha').value.trim();

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
    if (senha) payload.senha = senha;
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

// ── Logout ────────────────────────────────────────────────────
async function logout() {
  await dbSignOut();
  window.location.href = 'login.html';
}
