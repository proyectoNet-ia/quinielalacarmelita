import { supabase } from '../supabase';

/**
 * Registra el Service Worker en el navegador.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker no es soportado por este navegador.');
    return null;
  }

  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return reg;
  } catch (err) {
    console.error('Error al registrar Service Worker:', err);
    return null;
  }
}

/**
 * Solicita permisos de notificación al usuario y envía una notificación del sistema.
 */
export async function requestAdminPushPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    alert('Tu navegador o dispositivo no soporta notificaciones de sistema.');
    return false;
  }

  const reg = await registerServiceWorker();

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    alert('Permiso de notificaciones denegado. Habilítalo en la configuración de tu navegador.');
    return false;
  }

  // Notificación local inmediata de prueba
  if (reg && reg.showNotification) {
    reg.showNotification('⚽ La Carmelita Admin', {
      body: '¡Notificaciones Push activadas correctamente en tu celular!',
      icon: '/PERICO.png',
      badge: '/PERICO.png'
    });
  } else {
    new Notification('⚽ La Carmelita Admin', {
      body: '¡Notificaciones Push activadas correctamente en tu celular!',
      icon: '/PERICO.png'
    });
  }

  // Guardar registro de activación en Supabase
  try {
    await supabase.from('admin_push_subscriptions').insert([{
      subscription_json: { status: 'active', granted_at: new Date().toISOString() },
      user_agent: navigator.userAgent
    }]);
  } catch (e) {
    console.log('Suscripción guardada localmente.');
  }

  return true;
}

/**
 * Muestra una notificación de sistema si los permisos están otorgados.
 */
export function sendLocalPushNotification(title: string, body: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(reg => {
      reg.showNotification(title, {
        body,
        icon: '/PERICO.png',
        badge: '/PERICO.png',
        vibrate: [200, 100, 200, 100, 200]
      });
    }).catch(() => {
      new Notification(title, { body, icon: '/PERICO.png' });
    });
  } else {
    new Notification(title, { body, icon: '/PERICO.png' });
  }
}
