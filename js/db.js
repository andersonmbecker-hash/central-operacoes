// ============================================================
// Central de Operações — Operações de banco (Supabase)
// ============================================================

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── Auth ──────────────────────────────────────────────────────
async function dbSignIn(email, password) {
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}
async function dbSignOut() {
  await db.auth.signOut();
}
async function dbGetUser() {
  const { data: { user } } = await db.auth.getUser();
  return user;
}
function dbOnAuthChange(cb) {
  return db.auth.onAuthStateChange((_event, session) => cb(session?.user ?? null));
}

// ── Clientes ──────────────────────────────────────────────────
async function dbListClientes() {
  const { data, error } = await db
    .from('clientes')
    .select('*')
    .eq('ativo', true)
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data;
}

async function dbGetCliente(slug) {
  const { data, error } = await db
    .from('clientes')
    .select('*')
    .eq('slug', slug)
    .eq('ativo', true)
    .single();
  if (error) throw error;
  return data;
}

async function dbCreateCliente(payload) {
  const { data, error } = await db
    .from('clientes')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function dbUpdateCliente(id, payload) {
  const { error } = await db
    .from('clientes')
    .update(payload)
    .eq('id', id);
  if (error) throw error;
}

async function dbDeleteCliente(id) {
  const { error } = await db
    .from('clientes')
    .update({ ativo: false })
    .eq('id', id);
  if (error) throw error;
}

// ── Responsáveis ─────────────────────────────────────────────
async function dbListResponsaveis(clienteId) {
  const { data, error } = await db
    .from('responsaveis')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('ordem');
  if (error) throw error;
  return data;
}

async function dbAddResponsavel(payload) {
  const { data, error } = await db
    .from('responsaveis')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function dbRemoveResponsavel(id) {
  const { error } = await db
    .from('responsaveis')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ── Conquistas ────────────────────────────────────────────────
async function dbListConquistas(clienteId) {
  const { data, error } = await db
    .from('conquistas')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('criado_em');
  if (error) throw error;
  return data;
}

async function dbAddConquista(clienteId, texto, data_conquista) {
  const payload = { cliente_id: clienteId, texto };
  if (data_conquista) payload.data = data_conquista;
  const { data, error } = await db
    .from('conquistas')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function dbRemoveConquista(id) {
  const { error } = await db
    .from('conquistas')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ── Ideias ────────────────────────────────────────────────────
async function dbListIdeias(clienteId) {
  const { data, error } = await db
    .from('ideias')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data;
}

async function dbGetIdeia(id) {
  const { data, error } = await db
    .from('ideias')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

async function dbCreateIdeia(payload) {
  const { data, error } = await db
    .from('ideias')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function dbUpdateIdeia(id, payload) {
  const { error } = await db
    .from('ideias')
    .update(payload)
    .eq('id', id);
  if (error) throw error;
}

async function dbDeleteIdeia(id) {
  const { error } = await db
    .from('ideias')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

async function dbAprovarIdeia(id) {
  return dbUpdateIdeia(id, { aprovada: true });
}

// ── Roteiros ──────────────────────────────────────────────────
async function dbListRoteiros(clienteId) {
  const { data, error } = await db
    .from('roteiros')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data;
}

async function dbCreateRoteiro(payload) {
  const { data, error } = await db
    .from('roteiros')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function dbUpdateRoteiro(id, payload) {
  const { error } = await db
    .from('roteiros')
    .update(payload)
    .eq('id', id);
  if (error) throw error;
}

async function dbDeleteRoteiro(id) {
  const { error } = await db
    .from('roteiros')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ── Campanhas ─────────────────────────────────────────────────
async function dbListCampanhas(clienteId) {
  const { data, error } = await db
    .from('campanhas')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data;
}

async function dbCreateCampanha(payload) {
  const { data, error } = await db
    .from('campanhas')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function dbUpdateCampanha(id, payload) {
  const { error } = await db
    .from('campanhas')
    .update(payload)
    .eq('id', id);
  if (error) throw error;
}

async function dbDeleteCampanha(id) {
  const { error } = await db
    .from('campanhas')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ── Comentários de Ideias ─────────────────────────────────────
async function dbListComentariosIdeia(ideiaId) {
  const { data, error } = await db
    .from('ideia_comentarios')
    .select('*')
    .eq('ideia_id', ideiaId)
    .order('criado_em', { ascending: true });
  if (error) throw error;
  return data;
}

async function dbCreateComentario({ ideia_id, texto, nome }) {
  const user = await dbGetUser();
  const { data, error } = await db
    .from('ideia_comentarios')
    .insert({ ideia_id, texto, nome, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function dbDeleteComentario(id) {
  const { error } = await db
    .from('ideia_comentarios')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ── Eventos do Calendário ─────────────────────────────────────
async function dbListEventos(clienteId) {
  const { data, error } = await db
    .from('eventos_calendario')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('dia');
  if (error) throw error;
  return data;
}

async function dbCreateEvento(payload) {
  const { data, error } = await db
    .from('eventos_calendario')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function dbDeleteEvento(id) {
  const { error } = await db
    .from('eventos_calendario')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ── Acessos ───────────────────────────────────────────────────
async function dbSolicitarAcesso(payload) {
  // payload: { cliente_id, user_id, nome, email }
  const { data, error } = await db
    .from('acessos')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function dbGetMeuAcesso(clienteId) {
  const user = await dbGetUser();
  if (!user) return null;
  const { data, error } = await db
    .from('acessos')
    .select('*')
    .eq('cliente_id', clienteId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function dbListAcessosPendentes() {
  const { data, error } = await db
    .from('acessos')
    .select('*, clientes(nome, slug)')
    .eq('status', 'pendente')
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data;
}

async function dbAprovarAcesso(id, responsavelId) {
  const { error } = await db
    .from('acessos')
    .update({ status: 'aprovado', responsavel_id: responsavelId || null })
    .eq('id', id);
  if (error) throw error;
}

async function dbRejeitarAcesso(id) {
  const { error } = await db
    .from('acessos')
    .update({ status: 'rejeitado' })
    .eq('id', id);
  if (error) throw error;
}

// ── Storage — Logos ───────────────────────────────────────────
async function dbUploadLogo(clienteId, file) {
  const ext  = file.name.split('.').pop().toLowerCase();
  const path = `${clienteId}.${ext}`;
  const { error } = await db.storage
    .from('logos')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data } = db.storage.from('logos').getPublicUrl(path);
  // Adiciona cache-busting para forçar reload após update
  return data.publicUrl + '?t=' + Date.now();
}

// ── Feedback ──────────────────────────────────────────────────
async function dbEnviarFeedback(payload) {
  const { error } = await db
    .from('feedback')
    .insert(payload);
  if (error) throw error;
}

async function dbListFeedback() {
  const { data, error } = await db
    .from('feedback')
    .select('*')
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data;
}
