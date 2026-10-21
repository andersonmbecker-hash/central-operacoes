// ============================================================
// Central de Operações — UI Compartilhada
// ============================================================

// ── Tema ─────────────────────────────────────────────────────
(function initTheme() {
  const saved = localStorage.getItem('bz-theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
})();

function toggleTheme() {
  const root = document.documentElement;
  const current = root.getAttribute('data-theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const next = current === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  localStorage.setItem('bz-theme', next);
  const btn = document.getElementById('btn-theme');
  if (btn) btn.textContent = next === 'dark' ? '☀️' : '🌙';
}

function updateThemeBtn() {
  const btn = document.getElementById('btn-theme');
  if (!btn) return;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark' ||
    (!document.documentElement.getAttribute('data-theme') &&
     window.matchMedia('(prefers-color-scheme: dark)').matches);
  btn.textContent = isDark ? '☀️' : '🌙';
}

// ── Toast ─────────────────────────────────────────────────────
function showToast(msg, type = 'default', ms = 3000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => t.remove(), ms);
}

// ── Modais ────────────────────────────────────────────────────
function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = 'flex';
  el.classList.add('modal-overlay');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = 'none';
  document.body.style.overflow = '';
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(m => {
    m.style.display = 'none';
  });
  document.body.style.overflow = '';
}

// Fechar modal ao clicar no overlay
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    closeAllModals();
  }
});

// ── Helpers ───────────────────────────────────────────────────

// Formato: 'reel' → 'Reel'
function fmtFormato(f) {
  return { reel: 'Reel', carrossel: 'Carrossel', stories: 'Stories', feed: 'Feed' }[f] || f;
}

// Data ISO → DD/MM/AAAA
function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// Hoje em ISO
function todayISO() {
  return new Date().toISOString().split('T')[0];
}

// Mês atual (nome)
function mesAtual() {
  return new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
}

// Parse seguidores: '12,4 mil' | '12400' | '12.400' → número
function parseFollowers(s) {
  if (!s) return 0;
  s = String(s).trim().toLowerCase();
  if (s.includes('mil')) {
    const n = parseFloat(s.replace(',', '.').replace(/[^\d.]/g, ''));
    return Math.round(n * 1000);
  }
  return parseInt(s.replace(/[^\d]/g, ''), 10) || 0;
}

// Formatar delta de seguidores
function fmtDeltaFollowers(n) {
  if (n <= 0) return '';
  if (n >= 1000) return `+${(n / 1000).toFixed(1).replace('.', ',')} mil`;
  return `+${n.toLocaleString('pt-BR')}`;
}

// Gerar iniciais do nome
function gerarIniciais(nome) {
  return nome.trim().split(/\s+/).slice(0, 2).map(p => p[0].toUpperCase()).join('');
}

// Badge de formato
function badgeFormato(f) {
  return `<span class="badge badge-${f}">${fmtFormato(f)}</span>`;
}

// ── Feedback Button ───────────────────────────────────────────
function injectFeedbackButton(origem = 'desconhecida') {
  // Adiciona botão flutuante de feedback
  const btn = document.createElement('button');
  btn.className = 'fab-feedback';
  btn.innerHTML = '💬 Feedback';
  btn.onclick = () => openFeedbackModal(origem);
  document.body.appendChild(btn);

  // Injeta modal de feedback se não existir
  if (!document.getElementById('modal-feedback')) {
    const modal = document.createElement('div');
    modal.id = 'modal-feedback';
    modal.style.display = 'none';
    modal.innerHTML = `
      <div class="modal-box" style="max-width:460px">
        <div class="modal-header">
          <h3>💬 Feedback da Central</h3>
          <button class="modal-close" onclick="closeModal('modal-feedback')">×</button>
        </div>
        <div class="modal-body">
          <p style="font-size:13px;color:var(--fg3);margin-bottom:16px">
            Ajude a melhorar a Central de Operações com sugestões, críticas ou ideias.
          </p>
          <div class="form-group">
            <label>Tipo</label>
            <select id="fb-tipo">
              <option value="sugestão">💡 Sugestão</option>
              <option value="crítica">⚠️ Crítica</option>
              <option value="melhoria">🚀 Melhoria</option>
            </select>
          </div>
          <div class="form-group">
            <label>Mensagem *</label>
            <textarea id="fb-mensagem" placeholder="Descreva sua sugestão, crítica ou melhoria..." rows="4"></textarea>
          </div>
          <div class="form-group">
            <label>Seu nome (opcional)</label>
            <input type="text" id="fb-nome" placeholder="Ex: João da Silva">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeModal('modal-feedback')">Cancelar</button>
          <button class="btn btn-primary" id="btn-enviar-feedback" onclick="enviarFeedback()">Enviar Feedback</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  // Guarda origem no modal
  document.getElementById('modal-feedback')._origem = origem;
}

function openFeedbackModal(origem) {
  const modal = document.getElementById('modal-feedback');
  if (modal) modal._origem = origem;
  // Limpa campos
  const msg = document.getElementById('fb-mensagem');
  const nome = document.getElementById('fb-nome');
  if (msg) msg.value = '';
  if (nome) nome.value = '';
  openModal('modal-feedback');
}

async function enviarFeedback() {
  const tipo     = document.getElementById('fb-tipo').value;
  const mensagem = document.getElementById('fb-mensagem').value.trim();
  const nome     = document.getElementById('fb-nome').value.trim();
  const modal    = document.getElementById('modal-feedback');
  const origem   = modal?._origem || 'desconhecida';

  if (!mensagem) {
    showToast('Escreva sua mensagem antes de enviar.', 'error');
    return;
  }

  const btn = document.getElementById('btn-enviar-feedback');
  btn.disabled = true;
  btn.textContent = 'Enviando…';

  try {
    await dbEnviarFeedback({ tipo, mensagem, nome: nome || null, origem });
    closeModal('modal-feedback');
    showToast('Feedback enviado! Obrigado 🙏', 'success');
  } catch (err) {
    console.error(err);
    showToast('Erro ao enviar feedback. Tente novamente.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Enviar Feedback';
  }
}

// ── Mobile sidebar ────────────────────────────────────────────
function toggleSidebar() {
  document.querySelector('.sidebar')?.classList.toggle('open');
}
