import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { 
  Trophy, 
  User, 
  Lock, 
  CheckCircle, 
  AlertCircle, 
  Upload, 
  FileText, 
  LogOut, 
  PlusCircle, 
  Check, 
  X, 
  DollarSign, 
  Users, 
  Calendar, 
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';

// Declaración de tipo para jsPDF autoTable para evitar errores de compilación con TS
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

// Interfaces de Datos
interface Participant {
  id: string;
  name: string;
  alias: string;
  phone: string;
  role: 'user' | 'admin';
}

interface Season {
  id: string;
  name: string;
  is_active: boolean;
}

interface Matchday {
  id: string;
  season_id: string;
  number: number;
  status: 'active' | 'closed' | 'calculated';
  deadline: string;
  price_per_entry: number;
}

interface Match {
  id: string;
  matchday_id: string;
  home_team: string;
  away_team: string;
  match_date: string;
  result: 'L' | 'E' | 'V' | null;
}

interface Pool {
  id: string;
  participant_id: string;
  matchday_id: string;
  payment_status: 'pending' | 'approved' | 'rejected';
  payment_receipt_url: string | null;
  cost: number;
  score: number;
  created_at: string;
  participant?: {
    name: string;
    alias: string;
    phone: string;
  };
}



export default function App() {
  // --- Estados de Sesión ---
  const [currentUser, setCurrentUser] = useState<Participant | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [adminEmail, setAdminEmail] = useState<string>('');

  // --- Navegación ---
  const [activeTab, setActiveTab] = useState<string>('coming-soon'); // coming-soon, predictions, my-pools, leaderboard, admin-payments, admin-matchdays, admin-participants
  const [authView, setAuthView] = useState<'user-login' | 'user-register' | 'admin-login'>('user-login');

  // --- Datos de la Base de Datos ---
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [activeMatchday, setActiveMatchday] = useState<Matchday | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [userPools, setUserPools] = useState<Pool[]>([]);
  const [allPoolsForMatchday, setAllPoolsForMatchday] = useState<Pool[]>([]);
  const [predictionsByPool, setPredictionsByPool] = useState<Record<string, Record<string, string>>>({}); // poolId -> matchId -> selection
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  // --- Selección actual de Quiniela (Pronósticos locales) ---
  const [currentSelections, setCurrentSelections] = useState<Record<string, string>>({}); // matchId -> selection ('L' | 'E' | 'V')

  // --- Estados de Formularios / Carga ---
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [selectedPoolForPayment, setSelectedPoolForPayment] = useState<string | null>(null);
  const [viewReceiptUrl, setViewReceiptUrl] = useState<string | null>(null); // Para modal lightbox

  // --- Formulario Registro de Participante ---
  const [regName, setRegName] = useState('');
  const [regAlias, setRegAlias] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPin, setRegPin] = useState('');

  // --- Formulario Login de Participante ---
  const [loginAlias, setLoginAlias] = useState('');
  const [loginPin, setLoginPin] = useState('');

  // --- Formulario Login Administrador ---
  const [adminPassword, setAdminPassword] = useState('');

  // --- Formulario Creación de Partidos (Admin) ---
  const [newHomeTeam, setNewHomeTeam] = useState('');
  const [newAwayTeam, setNewAwayTeam] = useState('');
  const [newMatchDate, setNewMatchDate] = useState('');

  // --- Formulario Suscripción (Próximamente) ---
  const [subName, setSubName] = useState('');
  const [subCountryCode, setSubCountryCode] = useState('+52');
  const [subPhone, setSubPhone] = useState('');

  const toCapitalCase = (str: string) => {
    return str
      .toLowerCase()
      .split(' ')
      .filter(word => word.length > 0)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) {
      return digits;
    } else if (digits.length <= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName || !subPhone) {
      showAlert('error', 'Por favor llena todos los campos.');
      return;
    }

    const capitalizedName = toCapitalCase(subName);
    const fullPhone = `${subCountryCode} ${subPhone}`;

    try {
      setLoading(true);
      // Guardar en la base de datos
      const { error } = await supabase
        .from('pre_registrations')
        .insert([{
          name: capitalizedName,
          phone: fullPhone
        }]);

      if (error) throw error;

      showAlert('success', '¡Registro exitoso! Redirigiendo a WhatsApp...');
      setSubName('');
      setSubPhone('');

      // Enviar mensaje al número de WhatsApp del administrador (312 244 0708)
      // Código de país de México: 52
      const adminWhatsAppNumber = '523122440708';
      const textMessage = `Hola, estoy interesado en participar en las Quinielas La Carmelita. Mi nombre es ${capitalizedName} y mi teléfono es ${fullPhone}.`;
      const waUrl = `https://wa.me/${adminWhatsAppNumber}?text=${encodeURIComponent(textMessage)}`;
      
      // Abrir en una pestaña nueva
      window.open(waUrl, '_blank');
    } catch (err: any) {
      showAlert('error', 'Error al registrar suscripción. Intenta de nuevo.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- Inicialización y Carga de Sesión ---
  useEffect(() => {
    // 1. Cargar sesión de participante desde LocalStorage
    const storedUser = localStorage.getItem('la_carmelita_user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setCurrentUser(parsed);
      if (parsed.role === 'admin') {
        setIsAdmin(true);
        setActiveTab('admin-payments');
      }
    }

    // 2. Cargar sesión de Supabase Auth (para ver si es Admin oficial)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsAdmin(true);
        setAdminEmail(session.user.email || '');
        setActiveTab('admin-payments');
        // También simular un objeto de usuario local si es admin
        setCurrentUser({
          id: session.user.id,
          name: 'Administrador',
          alias: 'admin',
          phone: '0000000000',
          role: 'admin'
        });
      }
    });

    // Escuchar cambios de Auth de Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsAdmin(true);
        setAdminEmail(session.user.email || '');
        setCurrentUser({
          id: session.user.id,
          name: 'Administrador',
          alias: 'admin',
          phone: '0000000000',
          role: 'admin'
        });
      } else {
        // Solo quitar admin si no hay sesión activa ni usuario guardado local
        const local = localStorage.getItem('la_carmelita_user');
        if (!local) {
          setIsAdmin(false);
          setAdminEmail('');
        }
      }
    });

    loadInitialData();

    return () => subscription.unsubscribe();
  }, []);

  // Cargar datos cuando cambia la jornada o la pestaña activa
  useEffect(() => {
    if (currentUser) {
      loadUserPools();
    }
    if (activeMatchday) {
      loadLeaderboard();
      if (isAdmin) {
        loadAllPoolsForMatchday();
        loadParticipants();
      }
    }
  }, [activeTab, currentUser, activeMatchday, isAdmin]);

  // Mostrar alertas temporales
  const showAlert = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // --- Carga de Datos desde Supabase ---
  const loadInitialData = async () => {
    try {
      setLoading(true);
      // 1. Obtener temporada activa
      const { data: seasonsData, error: seasonErr } = await supabase
        .from('seasons')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (seasonErr) throw seasonErr;
      
      let season = seasonsData;
      // Si no existe temporada activa, crear una por defecto para demostración
      if (!season) {
        const { data: newSeason, error: createSeasonErr } = await supabase
          .from('seasons')
          .insert([{ name: 'Temporada Liga MX 2026', is_active: true }])
          .select()
          .single();
        if (createSeasonErr) throw createSeasonErr;
        season = newSeason;
      }
      setActiveSeason(season);

      // 2. Obtener la jornada activa de esta temporada
      const { data: matchdaysData, error: matchdayErr } = await supabase
        .from('matchdays')
        .select('*')
        .eq('season_id', season.id)
        .order('number', { ascending: false });

      if (matchdayErr) throw matchdayErr;

      let currentMatchday = null;
      if (matchdaysData && matchdaysData.length > 0) {
        // Encontrar la primera jornada activa o la última registrada
        currentMatchday = matchdaysData.find(m => m.status === 'active') || matchdaysData[0];
      } else {
        // Crear Jornada 1 por defecto para demo
        const deadlineDate = new Date();
        deadlineDate.setDate(deadlineDate.getDate() + 7); // Plazo de 1 semana
        const { data: newMatchday, error: createMatchdayErr } = await supabase
          .from('matchdays')
          .insert([{ 
            season_id: season.id, 
            number: 1, 
            status: 'active',
            deadline: deadlineDate.toISOString(),
            price_per_entry: 25.00
          }])
          .select()
          .single();
        if (createMatchdayErr) throw createMatchdayErr;
        currentMatchday = newMatchday;
      }
      setActiveMatchday(currentMatchday);

      // 3. Obtener partidos de la jornada activa
      if (currentMatchday) {
        await loadMatches(currentMatchday.id);
      }
    } catch (err: any) {
      console.error('Error cargando datos iniciales:', err);
      showAlert('error', 'Error de conexión: Verifica que configuraste la base de datos Supabase.');
    } finally {
      setLoading(false);
    }
  };

  const loadMatches = async (matchdayId: string) => {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('matchday_id', matchdayId)
      .order('match_date', { ascending: true });
    
    if (error) {
      console.error('Error cargando partidos:', error);
    } else {
      setMatches(data || []);
    }
  };

  const loadUserPools = async () => {
    if (!currentUser || !activeMatchday) return;
    const { data, error } = await supabase
      .from('pools')
      .select('*')
      .eq('participant_id', currentUser.id)
      .eq('matchday_id', activeMatchday.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al cargar quinielas de usuario:', error);
    } else {
      setUserPools(data || []);
      // Cargar pronósticos de estas quinielas
      if (data && data.length > 0) {
        const poolIds = data.map(p => p.id);
        const { data: predData, error: predErr } = await supabase
          .from('predictions')
          .select('*')
          .in('pool_id', poolIds);
        
        if (!predErr && predData) {
          const map: Record<string, Record<string, string>> = {};
          predData.forEach(p => {
            if (!map[p.pool_id]) map[p.pool_id] = {};
            map[p.pool_id][p.match_id] = p.selection;
          });
          setPredictionsByPool(prev => ({ ...prev, ...map }));
        }
      }
    }
  };

  const loadAllPoolsForMatchday = async () => {
    if (!activeMatchday) return;
    const { data, error } = await supabase
      .from('pools')
      .select(`
        *,
        participants (
          name,
          alias,
          phone
        )
      `)
      .eq('matchday_id', activeMatchday.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error cargando todas las quinielas:', error);
    } else {
      // Mapear el resultado para adaptarlo al formato
      const formattedPools = (data || []).map(p => ({
        ...p,
        participant: Array.isArray(p.participants) ? p.participants[0] : p.participants
      })) as Pool[];

      setAllPoolsForMatchday(formattedPools);

      // Cargar predicciones asociadas
      if (formattedPools.length > 0) {
        const poolIds = formattedPools.map(p => p.id);
        const { data: predData, error: predErr } = await supabase
          .from('predictions')
          .select('*')
          .in('pool_id', poolIds);
        
        if (!predErr && predData) {
          const map: Record<string, Record<string, string>> = {};
          predData.forEach(p => {
            if (!map[p.pool_id]) map[p.pool_id] = {};
            map[p.pool_id][p.match_id] = p.selection;
          });
          setPredictionsByPool(prev => ({ ...prev, ...map }));
        }
      }
    }
  };

  const loadParticipants = async () => {
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error cargando participantes:', error);
    } else {
      setParticipants(data || []);
    }
  };

  const loadLeaderboard = async () => {
    if (!activeMatchday) return;
    try {
      // Obtener todas las quinielas aprobadas para la jornada actual
      const { data, error } = await supabase
        .from('pools')
        .select(`
          id,
          score,
          participants (
            name,
            alias
          )
        `)
        .eq('matchday_id', activeMatchday.id)
        .eq('payment_status', 'approved')
        .order('score', { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map(p => ({
        id: p.id,
        score: p.score,
        name: p.participants ? (p.participants as any).name : 'Anónimo',
        alias: p.participants ? (p.participants as any).alias : 'anon'
      }));

      setLeaderboard(formatted);
    } catch (err) {
      console.error('Error cargando leaderboard:', err);
    }
  };

  // --- Acciones de Registro e Inicio de Sesión ---
  const handleUserRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regAlias || !regPhone || !regPin) {
      showAlert('error', 'Por favor llena todos los campos.');
      return;
    }

    try {
      setLoading(true);
      const cleanAlias = regAlias.trim().toLowerCase().replace(/\s+/g, '');
      const { data, error } = await supabase
        .from('participants')
        .insert([{
          name: regName.trim(),
          alias: cleanAlias,
          phone: regPhone.trim(),
          pin: regPin.trim(),
          role: 'user'
        }])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('El alias ya está registrado por otro usuario.');
        }
        throw error;
      }

      localStorage.setItem('la_carmelita_user', JSON.stringify(data));
      setCurrentUser(data);
      showAlert('success', `¡Registro exitoso! Bienvenido, ${data.name}.`);
      setActiveTab('predictions');
    } catch (err: any) {
      showAlert('error', err.message || 'Error al registrar usuario.');
    } finally {
      setLoading(false);
    }
  };

  const handleUserLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginAlias || !loginPin) {
      showAlert('error', 'Completa el alias y PIN.');
      return;
    }

    try {
      setLoading(true);
      const cleanAlias = loginAlias.trim().toLowerCase();
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .eq('alias', cleanAlias)
        .eq('pin', loginPin.trim())
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        showAlert('error', 'Alias o PIN incorrecto. Intenta de nuevo.');
        return;
      }

      localStorage.setItem('la_carmelita_user', JSON.stringify(data));
      setCurrentUser(data);
      if (data.role === 'admin') {
        setIsAdmin(true);
        setActiveTab('admin-payments');
      } else {
        setActiveTab('predictions');
      }
      showAlert('success', `¡Hola de nuevo, ${data.name}!`);
    } catch (err: any) {
      showAlert('error', 'Error al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail || !adminPassword) {
      showAlert('error', 'Ingresa tu correo y contraseña.');
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: adminEmail.trim(),
        password: adminPassword
      });

      if (error) throw error;

      if (data.user) {
        setIsAdmin(true);
        const adminParticipant: Participant = {
          id: data.user.id,
          name: 'Administrador',
          alias: 'admin',
          phone: '0000000000',
          role: 'admin'
        };
        localStorage.setItem('la_carmelita_user', JSON.stringify(adminParticipant));
        setCurrentUser(adminParticipant);
        setActiveTab('admin-payments');
        showAlert('success', 'Acceso de Administrador Autorizado.');
      }
    } catch (err: any) {
      showAlert('error', 'Credenciales de administrador incorrectas.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('la_carmelita_user');
    setCurrentUser(null);
    setIsAdmin(false);
    setActiveTab('predictions');
    showAlert('success', 'Sesión cerrada correctamente.');
  };

  // --- Llenado e Envío de Quinielas ---
  const handleSelectPrediction = (matchId: string, value: 'L' | 'E' | 'V') => {
    // Si la jornada ya cerró, no se pueden hacer cambios
    if (activeMatchday && new Date(activeMatchday.deadline) < new Date()) {
      showAlert('error', 'Esta jornada ya está cerrada para nuevos registros.');
      return;
    }
    setCurrentSelections(prev => ({
      ...prev,
      [matchId]: prev[matchId] === value ? '' : value // Toggle
    }));
  };

  const handleSubmitPool = async () => {
    if (!currentUser) {
      showAlert('error', 'Inicia sesión o regístrate para guardar tu quiniela.');
      setAuthView('user-login');
      setActiveTab('login');
      return;
    }

    if (!activeMatchday) return;

    // Verificar deadline
    if (new Date(activeMatchday.deadline) < new Date()) {
      showAlert('error', 'El límite para registrar quinielas ha expirado.');
      return;
    }

    // Verificar que se hayan completado todos los partidos
    const incomplete = matches.some(m => !currentSelections[m.id]);
    if (incomplete || matches.length === 0) {
      showAlert('error', 'Por favor selecciona el pronóstico para todos los partidos.');
      return;
    }

    try {
      setLoading(true);

      // 1. Crear registro de Quiniela (Pool)
      const { data: poolData, error: poolErr } = await supabase
        .from('pools')
        .insert([{
          participant_id: currentUser.id,
          matchday_id: activeMatchday.id,
          payment_status: 'pending',
          cost: activeMatchday.price_per_entry,
          score: 0
        }])
        .select()
        .single();

      if (poolErr) throw poolErr;

      // 2. Insertar Predicciones (Predictions)
      const predictionsToInsert = matches.map(m => ({
        pool_id: poolData.id,
        match_id: m.id,
        selection: currentSelections[m.id]
      }));

      const { error: predErr } = await supabase
        .from('predictions')
        .insert(predictionsToInsert);

      if (predErr) throw predErr;

      showAlert('success', '¡Quiniela guardada con éxito! Ahora sube tu comprobante de pago.');
      setCurrentSelections({});
      loadUserPools();
      setActiveTab('my-pools');
    } catch (err: any) {
      showAlert('error', 'Error al guardar la quiniela.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- Subida de Comprobante de Pago ---
  const handleUploadPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPoolForPayment || !receiptFile) {
      showAlert('error', 'Selecciona una quiniela y sube un archivo.');
      return;
    }

    try {
      setLoading(true);
      const fileExt = receiptFile.name.split('.').pop();
      const fileName = `${selectedPoolForPayment}_${Date.now()}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      // Subir archivo a Supabase Storage (Bucket: 'receipts')
      const { error: uploadErr } = await supabase.storage
        .from('receipts')
        .upload(filePath, receiptFile, { cacheControl: '3600', upsert: true });

      if (uploadErr) {
        // Si hay error porque el bucket no existe o faltan permisos, podemos intentar almacenar como base64 o lanzar error.
        // Asumiremos que el usuario crea el bucket 'receipts' en su panel de Supabase.
        throw new Error('Error al subir imagen. Asegúrate de tener creado el bucket "receipts" público en Supabase.');
      }

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath);

      // Actualizar quiniela
      const { error: updateErr } = await supabase
        .from('pools')
        .update({
          payment_receipt_url: publicUrl,
          payment_status: 'pending' // Regresa a pendiente para revisión
        })
        .eq('id', selectedPoolForPayment);

      if (updateErr) throw updateErr;

      showAlert('success', 'Comprobante subido. Esperando validación del Administrador.');
      setReceiptFile(null);
      setSelectedPoolForPayment(null);
      loadUserPools();
    } catch (err: any) {
      showAlert('error', err.message || 'Error al subir comprobante.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- Acciones de Administrador ---

  // Aprobar / Rechazar Pagos
  const handleValidatePayment = async (poolId: string, status: 'approved' | 'rejected') => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('pools')
        .update({ payment_status: status })
        .eq('id', poolId);

      if (error) throw error;
      
      showAlert('success', `Pago ${status === 'approved' ? 'APROBADO' : 'RECHAZADO'} correctamente.`);
      loadAllPoolsForMatchday();
    } catch (err) {
      showAlert('error', 'Error al validar el pago.');
    } finally {
      setLoading(false);
    }
  };

  // Crear una nueva jornada
  const handleCreateMatchday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSeason) return;

    try {
      setLoading(true);
      
      // Obtener el número de la última jornada
      const { data: lastMatchday } = await supabase
        .from('matchdays')
        .select('number')
        .eq('season_id', activeSeason.id)
        .order('number', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextNumber = lastMatchday ? lastMatchday.number + 1 : 1;
      const deadlineDate = new Date();
      deadlineDate.setDate(deadlineDate.getDate() + 7);

      const { data: newMatchday, error } = await supabase
        .from('matchdays')
        .insert([{
          season_id: activeSeason.id,
          number: nextNumber,
          status: 'active',
          deadline: deadlineDate.toISOString(),
          price_per_entry: 25.00
        }])
        .select()
        .single();

      if (error) throw error;

      setActiveMatchday(newMatchday);
      setMatches([]);
      showAlert('success', `Jornada ${nextNumber} creada con éxito.`);
    } catch (err) {
      showAlert('error', 'Error al crear la jornada.');
    } finally {
      setLoading(false);
    }
  };

  // Cerrar Jornada (Previene más apuestas)
  const handleToggleMatchdayStatus = async (newStatus: 'active' | 'closed' | 'calculated') => {
    if (!activeMatchday) return;
    try {
      setLoading(true);
      const { error } = await supabase
        .from('matchdays')
        .update({ status: newStatus })
        .eq('id', activeMatchday.id);

      if (error) throw error;

      setActiveMatchday(prev => prev ? { ...prev, status: newStatus } : null);
      showAlert('success', `Jornada marcada como ${newStatus.toUpperCase()}.`);
    } catch (err) {
      showAlert('error', 'Error al cambiar estado de la jornada.');
    } finally {
      setLoading(false);
    }
  };

  // Agregar Partido a la Jornada
  const handleAddMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMatchday || !newHomeTeam || !newAwayTeam || !newMatchDate) {
      showAlert('error', 'Llena todos los campos del partido.');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('matches')
        .insert([{
          matchday_id: activeMatchday.id,
          home_team: newHomeTeam.trim(),
          away_team: newAwayTeam.trim(),
          match_date: new Date(newMatchDate).toISOString()
        }]);

      if (error) throw error;

      setNewHomeTeam('');
      setNewAwayTeam('');
      setNewMatchDate('');
      loadMatches(activeMatchday.id);
      showAlert('success', 'Partido agregado.');
    } catch (err) {
      showAlert('error', 'Error al agregar partido.');
    } finally {
      setLoading(false);
    }
  };

  // Calificar Resultados y Calcular Puntajes
  const handleSetMatchResult = async (matchId: string, result: 'L' | 'E' | 'V') => {
    try {
      const { error } = await supabase
        .from('matches')
        .update({ result })
        .eq('id', matchId);

      if (error) throw error;

      setMatches(prev => prev.map(m => m.id === matchId ? { ...m, result } : m));
      showAlert('success', 'Resultado del partido guardado.');
    } catch (err) {
      showAlert('error', 'Error al guardar resultado del partido.');
    }
  };

  const handleCalculatePoints = async () => {
    if (!activeMatchday) return;
    
    // Verificar que todos los partidos tengan resultado
    const incomplete = matches.some(m => !m.result);
    if (incomplete || matches.length === 0) {
      showAlert('error', 'Debes ingresar el resultado de todos los partidos antes de calcular.');
      return;
    }

    try {
      setLoading(true);

      // Cargar todas las quinielas y predicciones de esta jornada
      const { data: poolsData, error: poolsErr } = await supabase
        .from('pools')
        .select('*')
        .eq('matchday_id', activeMatchday.id)
        .eq('payment_status', 'approved');

      if (poolsErr) throw poolsErr;

      const { data: predsData, error: predsErr } = await supabase
        .from('predictions')
        .select('*')
        .in('pool_id', poolsData.map(p => p.id));

      if (predsErr) throw predsErr;

      // Calcular puntos para cada quiniela
      for (const pool of poolsData) {
        let score = 0;
        const poolPreds = predsData.filter(pr => pr.pool_id === pool.id);

        poolPreds.forEach(pred => {
          const match = matches.find(m => m.id === pred.match_id);
          if (match && match.result && pred.selection.includes(match.result)) {
            score += 1; // 1 punto por acierto
          }
        });

        // Actualizar en base de datos
        await supabase
          .from('pools')
          .update({ score })
          .eq('id', pool.id);
      }

      // Marcar jornada como calificada
      await supabase
        .from('matchdays')
        .update({ status: 'calculated' })
        .eq('id', activeMatchday.id);

      setActiveMatchday(prev => prev ? { ...prev, status: 'calculated' } : null);
      showAlert('success', '¡Puntajes calculados y actualizados con éxito!');
      loadLeaderboard();
    } catch (err) {
      console.error(err);
      showAlert('error', 'Error durante el cálculo de puntajes.');
    } finally {
      setLoading(false);
    }
  };

  // --- Exportación a PDF de Transparencia ---
  const handleExportPDF = () => {
    if (!activeMatchday || matches.length === 0) {
      showAlert('error', 'No hay partidos configurados para exportar.');
      return;
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Encabezado
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42); // Slate 900
    doc.text(`Lista de Participantes - Quinielas La Carmelita`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Jornada N°: ${activeMatchday.number} | Fecha de Impresión: ${new Date().toLocaleString()}`, 14, 21);

    // Configurar columnas de la matriz
    const headers = ['Participante', 'Alias', 'Puntos', ...matches.map((_, idx) => `P${idx + 1}`), 'Estado Pago'];

    // Mapear filas de datos
    const tableData = allPoolsForMatchday
      .filter(p => p.payment_status === 'approved') // Solo quinielas validadas
      .map(p => {
        const participantName = p.participant?.name || 'Invitado';
        const participantAlias = p.participant?.alias || 'anon';
        const totalPoints = p.score;

        // Pronósticos en orden de partidos
        const gameSelections = matches.map(match => {
          const sel = predictionsByPool[p.id]?.[match.id] || '-';
          return sel;
        });

        return [
          participantName,
          participantAlias,
          totalPoints.toString(),
          ...gameSelections,
          p.payment_status.toUpperCase()
        ];
      });

    // Agregar leyenda de partidos al pie de página o inicio del PDF para claridad
    const matchesLegend = matches.map((m, idx) => {
      const matchTime = m.match_date ? new Date(m.match_date).toLocaleDateString() : '';
      return `P${idx + 1}: ${m.home_team} vs ${m.away_team} (${matchTime})`;
    });

    // Renderizar tabla con autoTable
    doc.autoTable({
      startY: 26,
      head: [headers],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [16, 185, 129], // Emerald green
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252] // light grey
      },
      styles: {
        fontSize: 8,
        cellPadding: 2
      }
    });

    // Agregar leyenda de partidos al final de la página
    let currentY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setFont('Helvetica', 'bold');
    doc.text('Glosario de Partidos:', 14, currentY);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);

    currentY += 4;
    // Imprimir en dos columnas para ahorrar espacio
    const mid = Math.ceil(matchesLegend.length / 2);
    for (let i = 0; i < matchesLegend.length; i++) {
      const xPos = i < mid ? 14 : 150;
      const yPos = currentY + (i % mid) * 4;
      doc.text(matchesLegend[i], xPos, yPos);
    }

    doc.save(`Quinielas_LaCarmelita_Jornada_${activeMatchday.number}.pdf`);
    showAlert('success', 'PDF de transparencia descargado con éxito.');
  };

  return (
    <div className="app-container">
      {/* Alerta Global */}
      {message && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
          color: 'white',
          padding: '12px 24px',
          borderRadius: 'var(--radius-full)',
          boxShadow: 'var(--shadow-md)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: '600'
        }}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Cabecera */}
      <header className="app-header">
        <div className="logo-container" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img 
            src="/LOGO LA CARMELITA.png" 
            alt="Logo La Carmelita" 
            style={{ height: '36px', objectFit: 'contain', borderRadius: '4px' }} 
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
        
        {currentUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="user-badge">
              <User size={14} />
              <span>{currentUser.alias}</span>
            </div>
            <button 
              onClick={handleLogout} 
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Cerrar Sesión"
            >
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <button 
            style={{ 
              background: 'transparent', 
              border: 'none', 
              cursor: 'pointer', 
              padding: '8px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'var(--text-muted)',
              opacity: 0.4,
              transition: 'opacity 0.2s'
            }}
            onClick={() => { setActiveTab('login'); setAuthView('user-login'); }}
            title="Ingresar"
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.4'}
          >
            <i className="fa-solid fa-lock" style={{ fontSize: '1.1rem' }}></i>
          </button>
        )}
      </header>

      {/* Vista de Carga */}
      {loading && (
        <div style={{
          padding: '40px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          color: 'var(--primary)'
        }}>
          <RefreshCw className="animate-spin" size={24} style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ marginLeft: '10px', fontWeight: '600' }}>Cargando datos...</span>
        </div>
      )}

      {/* --- Contenido Principal por Pestaña --- */}
      <main style={{ padding: '20px', flex: 1 }}>

        {/* 1. REGISTRO Y LOGIN (Pestaña "login") */}
        {activeTab === 'login' && !currentUser && (
          <div className="card">
            {/* Cabeceras del Auth selector */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '20px', paddingBottom: '10px' }}>
              <button 
                style={{ flex: 1, background: 'transparent', border: 'none', color: authView === 'user-login' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: '700', cursor: 'pointer' }}
                onClick={() => setAuthView('user-login')}
              >
                Ingreso
              </button>
              <button 
                style={{ flex: 1, background: 'transparent', border: 'none', color: authView === 'user-register' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: '700', cursor: 'pointer' }}
                onClick={() => setAuthView('user-register')}
              >
                Registro
              </button>
              <button 
                style={{ flex: 1, background: 'transparent', border: 'none', color: authView === 'admin-login' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: '700', cursor: 'pointer' }}
                onClick={() => setAuthView('admin-login')}
              >
                Admin
              </button>
            </div>

            {/* Formulario Login Participante */}
            {authView === 'user-login' && (
              <form onSubmit={handleUserLogin}>
                <h3 style={{ marginBottom: '16px' }}>Ingresar como Participante</h3>
                <div className="form-group">
                  <label>Tu Alias único</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Ej. juanito10" 
                    value={loginAlias} 
                    onChange={e => setLoginAlias(e.target.value)} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>PIN de Acceso (4 o más dígitos)</label>
                  <input 
                    type="password" 
                    className="form-control" 
                    placeholder="****" 
                    value={loginPin} 
                    onChange={e => setLoginPin(e.target.value)} 
                    required 
                  />
                </div>
                <button type="submit" className="btn btn-primary">Entrar a la Plataforma</button>
              </form>
            )}

            {/* Formulario Registro Participante */}
            {authView === 'user-register' && (
              <form onSubmit={handleUserRegister}>
                <h3 style={{ marginBottom: '16px' }}>Registrar Nueva Cuenta</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
                  El registro es instantáneo y no requiere verificación de correo. Solo recuerda tu Alias y PIN.
                </p>
                <div className="form-group">
                  <label>Nombre Completo</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Ej. Juan Pérez" 
                    value={regName} 
                    onChange={e => setRegName(e.target.value)} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Alias Corto (Único, sin espacios)</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Ej. juanperez" 
                    value={regAlias} 
                    onChange={e => setRegAlias(e.target.value)} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Teléfono Celular (WhatsApp)</label>
                  <input 
                    type="tel" 
                    className="form-control" 
                    placeholder="Ej. 3312345678" 
                    value={regPhone} 
                    onChange={e => setRegPhone(e.target.value)} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>PIN o Contraseña corta de Acceso</label>
                  <input 
                    type="password" 
                    className="form-control" 
                    placeholder="Ej. 1234" 
                    value={regPin} 
                    onChange={e => setRegPin(e.target.value)} 
                    required 
                  />
                </div>
                <button type="submit" className="btn btn-primary">Crear Cuenta y Continuar</button>
              </form>
            )}

            {/* Formulario Login Admin */}
            {authView === 'admin-login' && (
              <form onSubmit={handleAdminLogin}>
                <h3 style={{ marginBottom: '16px' }}>Acceso del Administrador</h3>
                <div className="form-group">
                  <label>Correo Electrónico Administrador</label>
                  <input 
                    type="email" 
                    className="form-control" 
                    placeholder="admin@lacarmelita.com" 
                    value={adminEmail} 
                    onChange={e => setAdminEmail(e.target.value)} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Contraseña</label>
                  <input 
                    type="password" 
                    className="form-control" 
                    placeholder="••••••••" 
                    value={adminPassword} 
                    onChange={e => setAdminPassword(e.target.value)} 
                    required 
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ background: 'var(--accent)', color: 'black' }}>
                  <Lock size={16} /> Validar Credenciales
                </button>
              </form>
            )}
          </div>
        )}

        {/* 1.5. VISTA PRÓXIMAMENTE (Pestaña "coming-soon") */}
        {activeTab === 'coming-soon' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{
              background: 'linear-gradient(135deg, var(--bg-card), rgba(20, 184, 166, 0.05))',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '40px 20px',
              boxShadow: 'var(--shadow-lg)'
            }}>
              {/* Balón o Icono Principal */}
              <div style={{ 
                width: '80px', 
                height: '80px', 
                borderRadius: 'var(--radius-full)', 
                background: 'var(--primary-glow)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                margin: '0 auto 24px',
                border: '2px solid var(--primary)',
                boxShadow: 'var(--shadow-glow)'
              }}>
                <Trophy size={40} color="var(--primary)" />
              </div>

              <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '12px' }}>¡Gran Lanzamiento!</h2>
              <h3 style={{ color: 'var(--primary)', marginBottom: '16px', fontSize: '1.2rem' }}>Quinielas La Carmelita</h3>
              
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '480px', margin: '0 auto 30px', lineHeight: '1.6' }}>
                Estamos preparando la mejor plataforma interactiva para gestionar y jugar quinielas deportivas de tus torneos favoritos. 
                Suscríbete ahora para recibir una alerta instantánea por WhatsApp cuando iniciemos.
              </p>

              {/* Formulario de Suscripción */}
              <form onSubmit={handleSubscribe} style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'left' }}>
                <div className="form-group">
                  <label>Nombre Completo</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Ej. Carlos Mendoza" 
                    value={subName} 
                    onChange={e => setSubName(e.target.value)}
                    onBlur={() => setSubName(toCapitalCase(subName))}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Número de WhatsApp</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select
                      className="form-control"
                      style={{ width: '95px', padding: '12px 6px', textAlign: 'center', fontSize: '0.9rem' }}
                      value={subCountryCode}
                      onChange={e => setSubCountryCode(e.target.value)}
                    >
                      <option value="+52">🇲🇽 +52</option>
                      <option value="+1">🇺🇸 +1</option>
                    </select>
                    <input 
                      type="tel" 
                      className="form-control" 
                      placeholder="(312) 244-0708" 
                      value={subPhone} 
                      onChange={e => setSubPhone(formatPhoneNumber(e.target.value))} 
                      required 
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }}>
                  Avisarme en el Lanzamiento
                </button>
              </form>
            </div>
          </div>
        )}

        {/* 2. LLENADO DE QUINIELAS (Pestaña "predictions") */}
        {activeTab === 'predictions' && (
          <div>
            {activeMatchday ? (
              <div>
                <div className="card" style={{ background: 'linear-gradient(135deg, var(--bg-card), rgba(16, 185, 129, 0.05))' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: '700' }}>Temporada Activa</span>
                      <h2>Jornada N° {activeMatchday.number}</h2>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Costo de entrada</span>
                      <span style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--accent)' }}>${activeMatchday.price_per_entry} MXN</span>
                    </div>
                  </div>
                  
                  <div style={{ marginTop: '14px', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>Fecha límite de registro:</span>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {new Date(activeMatchday.deadline).toLocaleString()}
                    </strong>
                    {new Date(activeMatchday.deadline) < new Date() && (
                      <span style={{ display: 'block', color: 'var(--danger)', fontSize: '0.8rem', marginTop: '4px', fontWeight: '600' }}>
                        ⚠️ Jornada cerrada para registro de apuestas.
                      </span>
                    )}
                  </div>
                </div>

                <h3 style={{ marginBottom: '12px' }}>Pronósticos de la Jornada</h3>
                
                {matches.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
                    No hay partidos cargados para esta jornada.
                  </p>
                ) : (
                  <div>
                    {matches.map((match, idx) => (
                      <div className="match-card" key={match.id}>
                        {/* Indicador de partido */}
                        <div style={{ position: 'absolute', transform: 'translate(-8px, -24px)', background: 'var(--border-color)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.65rem', fontWeight: '800' }}>
                          P{idx + 1}
                        </div>

                        {/* Local */}
                        <div className="team-info">
                          <div className="team-logo-fallback">{match.home_team.substring(0, 2).toUpperCase()}</div>
                          <span className="team-name">{match.home_team}</span>
                        </div>

                        {/* Controles de Apuesta L-E-V */}
                        <div className="lev-group">
                          <button 
                            className={`lev-btn ${currentSelections[match.id] === 'L' ? 'selected-l' : ''}`}
                            onClick={() => handleSelectPrediction(match.id, 'L')}
                          >
                            L
                          </button>
                          <button 
                            className={`lev-btn ${currentSelections[match.id] === 'E' ? 'selected-e' : ''}`}
                            onClick={() => handleSelectPrediction(match.id, 'E')}
                          >
                            E
                          </button>
                          <button 
                            className={`lev-btn ${currentSelections[match.id] === 'V' ? 'selected-v' : ''}`}
                            onClick={() => handleSelectPrediction(match.id, 'V')}
                          >
                            V
                          </button>
                        </div>

                        {/* Visitante */}
                        <div className="team-info">
                          <div className="team-logo-fallback">{match.away_team.substring(0, 2).toUpperCase()}</div>
                          <span className="team-name">{match.away_team}</span>
                        </div>
                      </div>
                    ))}

                    <div style={{ marginTop: '20px' }}>
                      <button 
                        className="btn btn-primary"
                        onClick={handleSubmitPool}
                        disabled={new Date(activeMatchday.deadline) < new Date()}
                      >
                        Enviar Quiniela y Proceder al Pago
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                <Trophy size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
                <h3>No hay jornadas activas en este momento</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Vuelve más tarde o contacta al administrador.</p>
              </div>
            )}
          </div>
        )}

        {/* 3. MIS QUINIELAS Y PAGO (Pestaña "my-pools") */}
        {activeTab === 'my-pools' && currentUser && (
          <div>
            <h2 style={{ marginBottom: '16px' }}>Mis Quinielas Guardadas</h2>
            {userPools.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '30px' }}>
                <p style={{ color: 'var(--text-secondary)' }}>No tienes quinielas registradas en esta jornada.</p>
                <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => setActiveTab('predictions')}>
                  Llenar mi primera quiniela
                </button>
              </div>
            ) : (
              userPools.map((pool, idx) => (
                <div className="card" key={pool.id} style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h4 style={{ color: 'var(--primary)' }}>Quiniela #{userPools.length - idx}</h4>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: '700', 
                      padding: '4px 8px', 
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: pool.payment_status === 'approved' ? 'rgba(16, 185, 129, 0.15)' : pool.payment_status === 'rejected' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: pool.payment_status === 'approved' ? 'var(--primary)' : pool.payment_status === 'rejected' ? 'var(--danger)' : 'var(--accent)'
                    }}>
                      {pool.payment_status === 'approved' ? 'PAGO APROBADO' : pool.payment_status === 'rejected' ? 'PAGO RECHAZADO' : 'ESPERANDO VALIDACIÓN'}
                    </span>
                  </div>

                  {/* Mostrar Puntos si ya fue calculada */}
                  {activeMatchday?.status === 'calculated' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', background: 'rgba(245, 158, 11, 0.1)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent)' }}>
                      <Trophy size={16} color="var(--accent)" />
                      <span>Puntaje Obtenido: <strong>{pool.score} aciertos</strong></span>
                    </div>
                  )}

                  {/* Vista resumida de pronósticos */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(11, 1fr)', gap: '4px', marginBottom: '16px' }}>
                    {matches.map((m, mIdx) => {
                      const sel = predictionsByPool[pool.id]?.[m.id] || '-';
                      const isCorrect = activeMatchday?.status === 'calculated' && m.result && sel.includes(m.result);
                      return (
                        <div 
                          key={m.id} 
                          style={{ 
                            background: isCorrect ? 'var(--success)' : 'var(--bg-main)', 
                            color: isCorrect ? '#000' : 'white',
                            textAlign: 'center', 
                            padding: '6px 2px', 
                            borderRadius: 'var(--radius-sm)', 
                            fontSize: '0.75rem', 
                            fontWeight: '800',
                            border: '1px solid var(--border-color)'
                          }}
                          title={`${m.home_team} vs ${m.away_team}`}
                        >
                          <span style={{ fontSize: '0.55rem', display: 'block', color: isCorrect ? '#052e16' : 'var(--text-muted)' }}>P{mIdx + 1}</span>
                          {sel}
                        </div>
                      );
                    })}
                  </div>

                  {/* Botón de carga de Comprobante si está pendiente */}
                  {pool.payment_status !== 'approved' && (
                    <div>
                      {selectedPoolForPayment === pool.id ? (
                        <form onSubmit={handleUploadPayment} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px', marginTop: '10px' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                            Sube la captura de pantalla de tu transferencia:
                          </label>
                          <div className="form-group">
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="form-control" 
                              onChange={e => setReceiptFile(e.target.files?.[0] || null)}
                              required 
                            />
                          </div>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}>
                              <Upload size={14} /> Subir Comprobante
                            </button>
                            <button type="button" className="btn btn-secondary" style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }} onClick={() => setSelectedPoolForPayment(null)}>
                              Cancelar
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button 
                          className="btn btn-secondary" 
                          style={{ fontSize: '0.85rem', padding: '8px 12px' }}
                          onClick={() => setSelectedPoolForPayment(pool.id)}
                        >
                          <ImageIcon size={14} /> {pool.payment_receipt_url ? 'Cambiar Comprobante de Pago' : 'Cargar Comprobante de Pago'}
                        </button>
                      )}
                    </div>
                  )}

                  {pool.payment_receipt_url && (
                    <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      ✓ Comprobante adjunto. Puedes ver el archivo{' '}
                      <a href={pool.payment_receipt_url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>
                        aquí
                      </a>.
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* 4. TABLA GENERAL / POSICIONES (Pestaña "leaderboard") */}
        {activeTab === 'leaderboard' && (
          <div>
            <h2 style={{ marginBottom: '16px' }}>Tabla de Clasificación</h2>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3>Resultados Oficiales</h3>
                {activeMatchday && (
                  <span style={{ fontSize: '0.8rem', background: 'var(--bg-main)', padding: '4px 10px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-color)' }}>
                    Jornada {activeMatchday.number}
                  </span>
                )}
              </div>

              {matches.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>No hay partidos cargados para mostrar resultados.</p>
              ) : (
                <div style={{ display: 'flex', overflowX: 'auto', gap: '10px', paddingBottom: '10px', marginBottom: '20px' }}>
                  {matches.map((m, idx) => (
                    <div 
                      key={m.id} 
                      style={{ 
                        flex: '0 0 110px', 
                        background: 'var(--bg-main)', 
                        border: '1px solid var(--border-color)', 
                        padding: '8px', 
                        borderRadius: 'var(--radius-md)', 
                        textAlign: 'center',
                        fontSize: '0.75rem' 
                      }}
                    >
                      <span style={{ color: 'var(--text-muted)', fontWeight: '700', display: 'block' }}>P{idx + 1}</span>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', fontWeight: '600' }}>{m.home_team}</span>
                      <span style={{ color: 'var(--primary)', fontWeight: '800', fontSize: '0.9rem' }}>
                        {m.result ? m.result : 'VS'}
                      </span>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', fontWeight: '600' }}>{m.away_team}</span>
                    </div>
                  ))}
                </div>
              )}

              <hr style={{ borderColor: 'var(--border-color)', margin: '14px 0' }} />

              <h3>Tabla de Posiciones</h3>
              {leaderboard.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', marginTop: '10px' }}>
                  Aún no hay quinielas pagadas y calculadas en esta jornada.
                </p>
              ) : (
                <table className="leaderboard-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>Pos</th>
                      <th>Participante</th>
                      <th style={{ textAlign: 'right' }}>Aciertos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((player, index) => {
                      const pos = index + 1;
                      let rankClass = 'rank-other';
                      if (pos === 1) rankClass = 'rank-1';
                      else if (pos === 2) rankClass = 'rank-2';
                      else if (pos === 3) rankClass = 'rank-3';

                      return (
                        <tr key={player.id}>
                          <td>
                            <span className={`rank-badge ${rankClass}`}>{pos}</span>
                          </td>
                          <td>
                            <strong style={{ color: 'white' }}>{player.name}</strong>
                            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>@{player.alias}</span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: '800', color: 'var(--primary)', fontSize: '1.1rem' }}>
                            {player.score}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* 5. ADMIN: VALIDACIÓN DE PAGOS (Pestaña "admin-payments") */}
        {activeTab === 'admin-payments' && isAdmin && (
          <div>
            <h2 style={{ marginBottom: '16px' }}>Validar Comprobantes de Pago</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.9rem' }}>
              Revisa los comprobantes de transferencia bancaria subidos por los participantes. La aprobación habilita la quiniela para la tabla y exportación PDF.
            </p>

            {allPoolsForMatchday.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
                No hay quinielas registradas en la jornada actual.
              </p>
            ) : (
              <div className="payment-grid">
                {allPoolsForMatchday.map((pool) => {
                  const name = pool.participant?.name || 'Usuario';
                  const alias = pool.participant?.alias || 'alias';
                  const phone = pool.participant?.phone || 'Sin número';

                  return (
                    <div className="payment-card" key={pool.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h4 style={{ color: 'white' }}>{name}</h4>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Alias: @{alias} | Tel: {phone}
                          </span>
                        </div>
                        <span style={{ 
                          fontSize: '0.7rem', 
                          fontWeight: '800', 
                          padding: '2px 6px', 
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: pool.payment_status === 'approved' ? 'var(--primary-glow)' : 'rgba(239, 68, 68, 0.1)',
                          color: pool.payment_status === 'approved' ? 'var(--primary)' : pool.payment_status === 'pending' ? 'var(--accent)' : 'var(--danger)'
                        }}>
                          {pool.payment_status.toUpperCase()}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '4px' }}>
                        {matches.map((m, mIdx) => (
                          <div 
                            key={m.id} 
                            style={{ flex: 1, background: 'var(--bg-main)', border: '1px solid var(--border-color)', textAlign: 'center', fontSize: '0.6rem', padding: '2px 0', borderRadius: '4px' }}
                            title={m.home_team + ' vs ' + m.away_team}
                          >
                            <span style={{ fontSize: '0.45rem', display: 'block', color: 'var(--text-muted)' }}>P{mIdx + 1}</span>
                            {predictionsByPool[pool.id]?.[m.id] || '-'}
                          </div>
                        ))}
                      </div>

                      {/* Imagen de Comprobante */}
                      {pool.payment_receipt_url ? (
                        <div>
                          <img 
                            src={pool.payment_receipt_url} 
                            alt="Comprobante" 
                            className="receipt-img"
                            onClick={() => setViewReceiptUrl(pool.payment_receipt_url)}
                          />
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textAlign: 'center', marginTop: '4px' }}>
                            🔎 Haz clic en la imagen para ampliar
                          </span>
                        </div>
                      ) : (
                        <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-main)' }}>
                          <span style={{ color: 'var(--danger)', fontSize: '0.8rem', fontWeight: '600' }}>Sin comprobante cargado</span>
                        </div>
                      )}

                      {/* Acciones de Validación */}
                      <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                        <button 
                          className="btn btn-primary" 
                          style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}
                          onClick={() => handleValidatePayment(pool.id, 'approved')}
                          disabled={pool.payment_status === 'approved'}
                        >
                          <Check size={14} /> Aprobar Pago
                        </button>
                        <button 
                          className="btn btn-danger" 
                          style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem', border: 'none' }}
                          onClick={() => handleValidatePayment(pool.id, 'rejected')}
                          disabled={pool.payment_status === 'rejected'}
                        >
                          <X size={14} /> Rechazar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 6. ADMIN: GESTIÓN DE JORNADAS (Pestaña "admin-matchdays") */}
        {activeTab === 'admin-matchdays' && isAdmin && (
          <div>
            <h2 style={{ marginBottom: '16px' }}>Gestión de Jornadas y Partidos</h2>

            {/* Selector de estado de Jornada */}
            {activeMatchday && (
              <div className="card">
                <h3>Estado de la Jornada N° {activeMatchday.number}</h3>
                <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                  <button 
                    className={`btn ${activeMatchday.status === 'active' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '10px 4px', fontSize: '0.8rem' }}
                    onClick={() => handleToggleMatchdayStatus('active')}
                  >
                    Activa (Registros Abiertos)
                  </button>
                  <button 
                    className={`btn ${activeMatchday.status === 'closed' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '10px 4px', fontSize: '0.8rem' }}
                    onClick={() => handleToggleMatchdayStatus('closed')}
                  >
                    Cerrada (Bloqueo de apuestas)
                  </button>
                  <button 
                    className={`btn ${activeMatchday.status === 'calculated' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '10px 4px', fontSize: '0.8rem' }}
                    onClick={() => handleToggleMatchdayStatus('calculated')}
                  >
                    Calificada (Finalizada)
                  </button>
                </div>
              </div>
            )}

            {/* Crear Nueva Jornada */}
            <div className="card">
              <h3>Crear Siguiente Jornada</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '12px' }}>
                Creará de forma secuencial la siguiente jornada del torneo activo con costo estándar.
              </p>
              <button className="btn btn-primary" onClick={handleCreateMatchday}>
                <PlusCircle size={16} /> Inicializar Siguiente Jornada
              </button>
            </div>

            {/* Agregar Partido */}
            {activeMatchday && (
              <div className="card">
                <h3>Agregar Partido a la Jornada N° {activeMatchday.number}</h3>
                <form onSubmit={handleAddMatch} style={{ marginTop: '12px' }}>
                  <div className="form-group">
                    <label>Equipo Local</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Ej. América" 
                      value={newHomeTeam} 
                      onChange={e => setNewHomeTeam(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>Equipo Visitante</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Ej. Chivas" 
                      value={newAwayTeam} 
                      onChange={e => setNewAwayTeam(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>Fecha y Hora del Partido</label>
                    <input 
                      type="datetime-local" 
                      className="form-control" 
                      value={newMatchDate} 
                      onChange={e => setNewMatchDate(e.target.value)} 
                      required 
                    />
                  </div>
                  <button type="submit" className="btn btn-primary">
                    Agregar Partido
                  </button>
                </form>
              </div>
            )}

            {/* Resultados y Calificación */}
            {activeMatchday && matches.length > 0 && (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3>Calificar Partidos</h3>
                  <button 
                    className="btn btn-primary" 
                    style={{ width: 'auto', padding: '6px 12px', fontSize: '0.8rem', background: 'var(--accent)', color: 'black' }}
                    onClick={handleCalculatePoints}
                  >
                    Calcular Aciertos e Histórico
                  </button>
                </div>

                {matches.map((match, idx) => (
                  <div key={match.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', minWidth: '30px' }}>P{idx + 1}</span>
                    <span style={{ flex: 1, fontSize: '0.85rem' }}>{match.home_team} vs {match.away_team}</span>
                    
                    <div className="lev-group">
                      <button 
                        className={`lev-btn ${match.result === 'L' ? 'selected-l' : ''}`}
                        onClick={() => handleSetMatchResult(match.id, 'L')}
                      >
                        L
                      </button>
                      <button 
                        className={`lev-btn ${match.result === 'E' ? 'selected-e' : ''}`}
                        onClick={() => handleSetMatchResult(match.id, 'E')}
                      >
                        E
                      </button>
                      <button 
                        className={`lev-btn ${match.result === 'V' ? 'selected-v' : ''}`}
                        onClick={() => handleSetMatchResult(match.id, 'V')}
                      >
                        V
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 7. ADMIN: PARTICIPANTES Y PDF (Pestaña "admin-participants") */}
        {activeTab === 'admin-participants' && isAdmin && (
          <div>
            <h2 style={{ marginBottom: '16px' }}>Listado de Participantes y Transparencia</h2>
            
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3>Exportar Lista de Juego</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                  Genera una matriz de juego en formato PDF con los participantes y sus apuestas para compartir en el grupo de WhatsApp antes de iniciar la jornada.
                </p>
              </div>
              <button className="btn btn-primary" style={{ width: 'auto', gap: '8px' }} onClick={handleExportPDF}>
                <FileText size={18} /> Exportar PDF
              </button>
            </div>

            <div className="card">
              <h3>Participantes Registrados ({participants.length})</h3>
              <table className="leaderboard-table" style={{ marginTop: '10px' }}>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Alias</th>
                    <th>WhatsApp</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map(p => (
                    <tr key={p.id}>
                      <td style={{ color: 'white', fontWeight: '600' }}>{p.name}</td>
                      <td>@{p.alias}</td>
                      <td>{p.phone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* Lightbox Modal de Comprobantes de Pago */}
      {viewReceiptUrl && (
        <div className="lightbox-modal">
          <button className="lightbox-close" onClick={() => setViewReceiptUrl(null)}>×</button>
          <img src={viewReceiptUrl} alt="Comprobante Completo" className="lightbox-content" />
        </div>
      )}

      {/* Menú de Navegación Flotante (Bottom Navigation) */}
      {activeTab !== 'coming-soon' && activeTab !== 'login' && (
        <nav className="bottom-nav">
          {isAdmin ? (
          <>
            <button 
              className={`nav-item ${activeTab === 'admin-payments' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin-payments')}
            >
              <DollarSign />
              <span>Validar Pagos</span>
            </button>
            <button 
              className={`nav-item ${activeTab === 'admin-matchdays' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin-matchdays')}
            >
              <Calendar />
              <span>Jornadas</span>
            </button>
            <button 
              className={`nav-item ${activeTab === 'admin-participants' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin-participants')}
            >
              <Users />
              <span>Participantes</span>
            </button>
          </>
        ) : (
          <>
            <button 
              className={`nav-item ${activeTab === 'predictions' ? 'active' : ''}`}
              onClick={() => setActiveTab('predictions')}
            >
              <Trophy />
              <span>Quiniela</span>
            </button>
            <button 
              className={`nav-item ${activeTab === 'my-pools' ? 'active' : ''}`}
              onClick={() => setActiveTab('my-pools')}
            >
              <User />
              <span>Mis Apuestas</span>
            </button>
            <button 
              className={`nav-item ${activeTab === 'leaderboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('leaderboard')}
            >
              <Trophy style={{ color: 'var(--accent)' }} />
              <span>Posiciones</span>
            </button>
          </>
        )}
      </nav>
      )}
    </div>
  );
}
