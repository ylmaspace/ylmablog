/**
 * ============================================================
 * YLMA Space OS — Capa de Integración Supabase (v2.0 - Debug)
 * Archivo: ylma-backend.js
 * ============================================================
 */

let activeUserSession = null;
let _chatSubscription = null;

/* ═══════════════════════════════════════════════════════════════════════════
   A. UTILIDADES DE INTERFAZ Y SINCRONIZACIÓN
   ═══════════════════════════════════════════════════════════════════════════ */

function _syncSessionFromProfile(data) {
  if (!data) return;
  totalXP = data.total_xp || 0;
  
  // Sincronizar niveles de tu Hangar de Exoplanetas
  systemPlanets[0].level = data.p1_level || 0;
  systemPlanets[1].level = data.p2_level || 0;
  systemPlanets[2].level = data.p3_level || 0;
  
  // Reglas lógicas de desbloqueo secuencial de tu HTML
  if (systemPlanets[0].level > 0) systemPlanets[1].status = "Inexplorado";
  if (systemPlanets[1].level > 0) systemPlanets[2].status = "Inexplorado";

  // Actualizar marcadores del DOM
  const xpDisplay = document.getElementById('global-xp-display');
  if (xpDisplay) xpDisplay.innerText = `${totalXP} XP`;
}

function unlockOSLayout() {
  const authGate = document.getElementById('auth-gate');
  if (authGate) authGate.style.display = 'none';
}

/* ═══════════════════════════════════════════════════════════════════════════
   B. CONTROL DE ACCESO INTERCEPTADO (CON ALERTAS DE DIAGNÓSTICO)
   ═══════════════════════════════════════════════════════════════════════════ */

async function handleLogin() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-pass').value.trim();
  
  if (!email || !password) return alert('Por favor, introduce tus credenciales de operador.');

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) return alert('Fallo de autenticación espacial: ' + error.message);
  
  activeUserSession = data.user;
}

async function finalizeRegistration() {
  const emailInput = document.getElementById('auth-email');
  const passInput = document.getElementById('auth-pass');
  const userInput = document.getElementById('auth-username');

  if (!emailInput || !passInput) {
    return alert('Error crítico: No se encuentran los inputs de texto en el HTML (revisa los IDs).');
  }

  const email = emailInput.value.trim();
  const password = passInput.value.trim();
  const username = userInput ? userInput.value.trim() : 'Operador_YLMA';

  // 🚨 ALERTA DE CONTROL 1: Verifica si el botón realmente responde al click
  alert('🚀 [Control] El botón responde. Intentando registrar en Supabase a: ' + email);

  if (!email || !password) {
    return alert('⚠️ Error: Se requiere Email y Contraseña obligatoriamente.');
  }

  if (password.length < 6) {
    return alert('⚠️ Error de seguridad: La contraseña debe tener al menos 6 caracteres.');
  }

  // 1. Crear el usuario en el sistema de Auth seguro de Supabase
  const { data, error } = await supabaseClient.auth.signUp({ email, password });
  
  if (error) {
    // 🚨 ALERTA DE CONTROL 2: Supabase frena el registro (ej. Correo duplicado)
    return alert('❌ Supabase ha denegado el registro: ' + error.message);
  }

  // 2. Insertar fila inicial en la tabla pública de operadores
  if (data && data.user) {
    const { error: dbError } = await supabaseClient.from('operators').insert([{
      id: data.user.id,
      email: email,
      username: username,
      total_xp: 0
    }]);

    if (dbError) {
      return alert('❌ Error al inicializar tu perfil en la tabla de la Base de Datos: ' + dbError.message);
    }
    
    // 🚨 ALERTA DE CONTROL 3: Éxito rotundo
    alert('🎉 ¡Misión cumplida! Registrado con éxito en la nube de Supabase.');
    activeUserSession = data.user;
    unlockOSLayout();
  } else {
    alert('⚠️ Supabase no devolvió datos de usuario válidos. Verifica la confirmación por email en tu panel.');
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   C. ACCIONES SEGURAS DEL MOTOR (RPC SUPABASE)
   ═══════════════════════════════════════════════════════════════════════════ */

async function addXPAction(amount, reason) {
  if (!activeUserSession) return;

  let actionType = 'other';
  if (reason.toLowerCase().includes('chat')) actionType = 'chat';
  if (reason.toLowerCase().includes('foro') || reason.toLowerCase().includes('post')) actionType = 'forum';
  if (reason.toLowerCase().includes('like')) actionType = 'like';

  const { data, error } = await supabaseClient.rpc('add_xp_secure', { 
    action_type: actionType, 
    xp_reward: amount 
  });

  if (data && data.success) {
    if (typeof playSFX === 'function') playSFX('xp-audio');
    
    const toastZone = document.getElementById('xp-toast-zone');
    if (toastZone) {
      const toast = document.createElement('div');
      toast.className = 'xp-toast';
      toast.innerHTML = `+${data.final_xp} XP <span style="font-weight:400; font-size:11px; margin-left:5px; color:#a0aec0;">(${reason})</span>`;
      toastZone.appendChild(toast);
      setTimeout(() => { toast.remove(); }, 2500);
    }
  }
}

async function upgradePlanet(index) {
  if (!activeUserSession) return;
  
  const planetMap = ['p1', 'p2', 'p3'];
  const planetId = planetMap[index];

  const { data, error } = await supabaseClient.rpc('upgrade_planet_secure', { 
    operator_id: activeUserSession.id, 
    planet_id: planetId 
  });

  if (data && data.success) {
    if (typeof playSFX === 'function') playSFX('upgrade-audio');
    const { data: profile } = await supabaseClient.from('operators').select('*').eq('id', activeUserSession.id).single();
    _syncSessionFromProfile(profile);
    if (typeof renderPlanets === 'function') renderPlanets();
  } else {
    alert(data ? data.message : 'Error al procesar la mejora del planeta.');
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   D. TRANSMISIÓN EN TIEMPO REAL (CHATS Y FOROS)
   ═══════════════════════════════════════════════════════════════════════════ */

function _startRealtimeSync(uid) {
  if (_chatSubscription) _chatSubscription.unsubscribe();

  _chatSubscription = supabaseClient.channel('live-chats')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, payload => {
      if (typeof appendChatMessageToUI === 'function') {
         appendChatMessageToUI(payload.new.username, payload.new.text);
      }
    }).subscribe();
}

async function handleLogout() {
  if (_chatSubscription) _chatSubscription.unsubscribe();
  await supabaseClient.auth.signOut();
  window.location.reload();
}

/* ═══════════════════════════════════════════════════════════════════════════
   E. OBSERVADOR PERMANENTE DE SESIÓN Y ENLACES DE RESPALDO (ALIAS)
   ═══════════════════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (session) {
      activeUserSession = session.user;
      try {
        const { data: profile } = await supabaseClient.from('operators').select('*').eq('id', session.user.id).single();
        if (profile) {
          _syncSessionFromProfile(profile);
          unlockOSLayout();
          _startRealtimeSync(session.user.id);
          if (typeof renderPlanets === 'function') renderPlanets();
        }
      } catch (err) {
        console.warn('[YLMA-Supabase] Fallo al restaurar sesión:', err);
      }
    }
  });
});

// Mapeo total de compatibilidad con los botones de tu index.html (App1.html)
async function handleRegister() { return await finalizeRegistration(); }
async function signUp() { return await finalizeRegistration(); }
async function registerUser() { return await finalizeRegistration(); }
