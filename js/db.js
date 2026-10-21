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
