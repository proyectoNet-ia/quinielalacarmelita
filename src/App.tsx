import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { jsPDF } from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';
import imageCompression from 'browser-image-compression';
import Tesseract from 'tesseract.js';

// Registrar plugin de autotable en jsPDF para evitar errores de vinculación
applyPlugin(jsPDF);
import { 
  MoreVertical,
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
  ArrowLeft,
  Image as ImageIcon,
  TrendingUp,
  Menu,
  MessageCircle,
  Shield,
  Download,
  Edit2,
  Globe,
  Trash2,
  Play,
  Lock as LockIcon,
  Unlock,
  RotateCcw,
  CheckSquare,
  Clock,
  Copy,
  AlertTriangle,
  Landmark,
  Settings,
  Save
} from 'lucide-react';

// Declaración de tipo para jsPDF autoTable para evitar errores de compilación con TS
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

// Componente genérico de Modal
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};

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
  status: 'inactive' | 'active' | 'closed' | 'calculated';
  deadline: string;
  first_match_date?: string | null;
  price_per_entry: number;
  prize_percentage?: number;
  prize_type?: 'percentage' | 'fixed';
  fixed_prize_1st?: number;
  fixed_prize_2nd?: number;
}

interface Match {
  id: string;
  matchday_id: string;
  home_team: string;
  away_team: string;
  home_team_id?: string;
  away_team_id?: string;
  is_reserve?: boolean;
  result: 'L' | 'E' | 'V' | 'A' | null;
}

interface Team {
  id: string;
  name: string;
  code?: string;
  league_id?: string;
  leagues?: { name: string };
  logo_url?: string;
  created_at: string;
}

interface League {
  id: string;
  name: string;
  country?: string;
  logo_url?: string;
  created_at: string;
}

interface BankAccount {
  id: string;
  bank_name: string;
  account_holder: string;
  account_number: string;
  clabe: string;
  is_active: boolean;
  account_type?: 'transferencia' | 'deposito';
}

interface Pool {
  id: string;
  participant_id: string;
  matchday_id: string;
  payment_status: 'pending' | 'approved' | 'rejected';
  payment_receipt_url: string | null;
  reference_code?: string;
  validation_flags?: string[];
  cost: number;
  score: number;
  created_at: string;
  participant?: {
    name: string;
    alias: string;
    phone: string;
  };
}

const getBankLogo = (bankName: string) => {
  const lower = bankName.toLowerCase();
  if (lower.includes('bbva') || lower.includes('bancomer')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/BBVA_logo_2025.svg/3840px-BBVA_logo_2025.svg.png';
  if (lower.includes('santander')) return 'https://upload.wikimedia.org/wikipedia/commons/b/b8/Banco_Santander_Logotipo.svg';
  if (lower.includes('banamex') || lower.includes('citibanamex')) return 'https://upload.wikimedia.org/wikipedia/commons/1/12/Citibanamex_logo.svg';
  if (lower.includes('banorte')) return 'https://upload.wikimedia.org/wikipedia/commons/c/cd/Banorte_logo.svg';
  if (lower.includes('spin')) return 'https://spinpremia.com/wp-content/uploads/2023/08/SPIN-BY-OXXO.png';
  if (lower.includes('oxxo')) return 'https://upload.wikimedia.org/wikipedia/commons/3/36/Oxxo_Logo.svg';
  if (lower.includes('azteca')) return 'https://upload.wikimedia.org/wikipedia/commons/2/23/Banco_Azteca_logo.svg';
  if (lower.includes('hsbc')) return 'https://upload.wikimedia.org/wikipedia/commons/a/a9/HSBC_logo_%282018%29.svg';
  return null;
}


const SearchableSelect = ({ value, onChange, options, placeholder }: { value: string, onChange: (val: string) => void, options: { id: string, name: string }[], placeholder: string }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState(value);

  const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const filteredOptions = options.filter(o => normalize(o.name).includes(normalize(search)));

  React.useEffect(() => {
    setSearch(value);
  }, [value]);

  return (
    <div style={{ position: 'relative' }}>
      <input 
        type="text"
        className="form-control"
        placeholder={placeholder}
        value={search}
        onChange={e => {
          setSearch(e.target.value);
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        required
      />
      {isOpen && filteredOptions.length > 0 && (
        <ul style={{ 
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: 'var(--bg-card)', border: '1px solid var(--border-color)', 
          borderRadius: '4px', maxHeight: '200px', overflowY: 'auto', 
          listStyle: 'none', padding: 0, margin: 0 
        }}>
          {filteredOptions.map(o => (
            <li 
              key={o.id} 
              style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
              onMouseDown={() => {
                setSearch(o.name);
                onChange(o.name);
                setIsOpen(false);
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {o.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default function App() {
  // --- Estados de Sesión ---
  const [currentUser, setCurrentUser] = useState<Participant | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [adminEmail, setAdminEmail] = useState<string>('');

  // --- Navegación ---
  const [activeTab, setActiveTab] = useState<string>('predictions'); // coming-soon, predictions, my-pools, leaderboard, admin-payments, admin-matchdays, admin-participants, verify-payment
  const [adminPendingPage, setAdminPendingPage] = useState(1);
  const [adminHistoryPage, setAdminHistoryPage] = useState(1);
  const [authView, setAuthView] = useState<'user-login' | 'user-register' | 'admin-login'>('user-login');

  // --- Verificación Pública de Pagos ---
  const [verifyCode, setVerifyCode] = useState(() => localStorage.getItem('lastReferenceCode') || '');
  const [verifyResults, setVerifyResults] = useState<Pool[]>([]);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'transfer' | 'deposit'>('transfer');
  const [verifyReceiptFile, setVerifyReceiptFile] = useState<File | null>(null);
  const [verifyingPoolId, setVerifyingPoolId] = useState<string | null>(null);
  const [verifyAnalysisStatus, setVerifyAnalysisStatus] = useState<'idle' | 'analyzing' | 'warning' | 'success'>('idle');
  const [verifyAnalysisFlags, setVerifyAnalysisFlags] = useState<string[]>([]);
  const [verifyAnalysisMessage, setVerifyAnalysisMessage] = useState('');

  // --- Datos de la Base de Datos ---
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [activeMatchday, setActiveMatchday] = useState<Matchday | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [allMatchdays, setAllMatchdays] = useState<Matchday[]>([]);
  const [openMatchdayMenu, setOpenMatchdayMenu] = useState<string | null>(null);
  const [currentPageMatchdays, setCurrentPageMatchdays] = useState(1);
  const [searchParticipant, setSearchParticipant] = useState('');
  const [lastWinners, setLastWinners] = useState<any[]>([]);
  const [lastCalculatedMatchday, setLastCalculatedMatchday] = useState<Matchday | null>(null);
  const [selectedAdminMatchday, setSelectedAdminMatchday] = useState<Matchday | null>(null);
  const [adminDetailView, setAdminDetailView] = useState<'matches'|'ranking'>('matches');
  const [matchdayApprovedParticipants, setMatchdayApprovedParticipants] = useState<Record<string, number>>({});
  const [matchdayApprovedPools, setMatchdayApprovedPools] = useState<Record<string, number>>({});
  const [userPools, setUserPools] = useState<Pool[]>([]);
  const [allPoolsForMatchday, setAllPoolsForMatchday] = useState<Pool[]>([]);
  const [predictionsByPool, setPredictionsByPool] = useState<Record<string, Record<string, string>>>({}); // poolId -> matchId -> selection
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  // --- Estados de Dashboard Financiero ---
  const [financialPools, setFinancialPools] = useState<Pool[]>([]);
  const [financialMatchdays, setFinancialMatchdays] = useState<Matchday[]>([]);
  const [selectedFinMatchdayId, setSelectedFinMatchdayId] = useState<string>('all');
  const [prizePercentage, setPrizePercentage] = useState<number>(80);
  const [matchdayPrice, setMatchdayPrice] = useState<number>(25);
  const [matchdayPrizeType, setMatchdayPrizeType] = useState<'percentage' | 'fixed'>('percentage');
  const [matchdayFixedPrize1st, setMatchdayFixedPrize1st] = useState<number>(0);
  const [matchdayFixedPrize2nd, setMatchdayFixedPrize2nd] = useState<number>(0);
  const [finSearchQuery, setFinSearchQuery] = useState<string>('');
  const [expandedParticipantId, setExpandedParticipantId] = useState<string | null>(null);

  // --- Estados de Cuentas Bancarias ---
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [newBankName, setNewBankName] = useState('');
  const [newAccountHolder, setNewAccountHolder] = useState('');
  const [newAccountNumber, setNewAccountNumber] = useState('');
  const [newClabe, setNewClabe] = useState('');
  const [newAccountType, setNewAccountType] = useState<'transferencia' | 'deposito'>('transferencia');
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [editBankName, setEditBankName] = useState('');
  const [editAccountHolder, setEditAccountHolder] = useState('');
  const [editAccountNumber, setEditAccountNumber] = useState('');
  const [editClabe, setEditClabe] = useState('');
  const [editBankActive, setEditBankActive] = useState(true);
  const [editAccountType, setEditAccountType] = useState<'transferencia' | 'deposito'>('transferencia');

  // --- Estados de Equipos ---
  const [teams, setTeams] = useState<Team[]>([]);

  const getTeamName = (match: Match, isHome: boolean) => {
    const teamId = isHome ? match.home_team_id : match.away_team_id;
    const teamNameLegacy = isHome ? match.home_team : match.away_team;
    if (teamId) {
      const t = teams.find(t => t.id === teamId);
      if (t) return t.name;
    }
    const tByName = teams.find(t => t.name === teamNameLegacy);
    return tByName ? tByName.name : teamNameLegacy;
  };

  const getTeamCode = (match: Match, isHome: boolean) => {
    const teamId = isHome ? match.home_team_id : match.away_team_id;
    const teamNameLegacy = isHome ? match.home_team : match.away_team;
    if (teamId) {
      const t = teams.find(t => t.id === teamId);
      if (t && t.code) return t.code.toUpperCase();
    }
    const tByName = teams.find(t => t.name === teamNameLegacy);
    if (tByName && tByName.code) return tByName.code.toUpperCase();
    
    // Fallback: usar las primeras 3 letras del nombre
    const name = getTeamName(match, isHome);
    return name.substring(0, 3).toUpperCase();
  };
  
  const getTeamLogo = (match: Match, isHome: boolean) => {
    const teamId = isHome ? match.home_team_id : match.away_team_id;
    const teamNameLegacy = isHome ? match.home_team : match.away_team;
    if (teamId) {
      const t = teams.find(t => t.id === teamId);
      if (t) return t.logo_url;
    }
    const tByName = teams.find(t => t.name === teamNameLegacy);
    return tByName?.logo_url;
  };

  const getBase64ImageFromUrl = (imageUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      if (!imageUrl) {
        resolve('');
        return;
      }
      const img = new Image();
      img.setAttribute('crossOrigin', 'anonymous');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, 64, 64);
          try {
            const dataURL = canvas.toDataURL('image/png');
            resolve(dataURL);
          } catch (e) {
            resolve('');
          }
        } else {
          resolve('');
        }
      };
      img.onerror = () => {
        resolve('');
      };
      img.src = imageUrl.startsWith('http') ? imageUrl : `${window.location.origin}${imageUrl}`;
    });
  };
  const [newTeamName, setNewTeamName] = useState('');
  const [teamSearchTerm, setTeamSearchTerm] = useState('');
  const [teamLeagueFilter, setTeamLeagueFilter] = useState('');
  const [teamCurrentPage, setTeamCurrentPage] = useState(1);
  const [newTeamCode, setNewTeamCode] = useState('');
  const [newTeamLeagueId, setNewTeamLeagueId] = useState('');
  const [newTeamLogoUrl, setNewTeamLogoUrl] = useState('');
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamCode, setEditTeamCode] = useState('');
  const [editTeamLeagueId, setEditTeamLeagueId] = useState('');
  const [editTeamLogoUrl, setEditTeamLogoUrl] = useState('');

  // --- Estados de Ligas ---
  const [leagues, setLeagues] = useState<League[]>([]);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'league' | 'team', name: string } | null>(null);
  const [leagueSearchTerm, setLeagueSearchTerm] = useState('');
  const [leagueCurrentPage, setLeagueCurrentPage] = useState(1);
  const [newLeagueName, setNewLeagueName] = useState('');
  const [newLeagueCountry, setNewLeagueCountry] = useState('');
  const [newLeagueLogoUrl, setNewLeagueLogoUrl] = useState('');
  const [editingLeagueId, setEditingLeagueId] = useState<string | null>(null);
  const [editLeagueName, setEditLeagueName] = useState('');
  const [editLeagueCountry, setEditLeagueCountry] = useState('');
  const [editLeagueLogoUrl, setEditLeagueLogoUrl] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // --- Estados de Carrito y Registro Rápido ---
  const [cart, setCart] = useState<Record<string, string>[]>([]);
  const [cartParticipantName, setCartParticipantName] = useState('');
  const [nameExistsWarning, setNameExistsWarning] = useState(false);
  const [nameInvalidError, setNameInvalidError] = useState(false);
  const [cartParticipantAlias, setCartParticipantAlias] = useState('');
  const [cartParticipantPhone, setCartParticipantPhone] = useState('');
  const [cartCountryCode, setCartCountryCode] = useState('+52');
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [cartReferenceId, setCartReferenceId] = useState('');
  const [successName, setSuccessName] = useState('');
  const [successAlias, setSuccessAlias] = useState('');
  const [successMessageText, setSuccessMessageText] = useState('');
  const [whatsappConfig, setWhatsappConfig] = useState('');

  useEffect(() => {
    const checkName = async () => {
      if (cartParticipantName.trim().length < 3 || !activeMatchday) {
        setNameExistsWarning(false);
        return;
      }
      
      const { data: part } = await supabase
        .from('participants')
        .select('id')
        .ilike('alias', cartParticipantName.trim())
        .maybeSingle();
        
      if (part) {
        const { data: pools } = await supabase
          .from('pools')
          .select('id')
          .eq('participant_id', part.id)
          .eq('matchday_id', activeMatchday.id)
          .limit(1);
          
        if (pools && pools.length > 0) {
          setNameExistsWarning(true);
        } else {
          setNameExistsWarning(false);
        }
      } else {
        setNameExistsWarning(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      checkName();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [cartParticipantName, activeMatchday]);
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').substring(0, 10);
    let formatted = '';
    if (digits.length > 0) {
      formatted = '(' + digits.substring(0, 3);
      if (digits.length > 3) {
        formatted += ') ' + digits.substring(3, 6);
      }
      if (digits.length > 6) {
        formatted += '-' + digits.substring(6, 10);
      }
    }
    setCartParticipantPhone(formatted);
  };

  // --- Contador de Tiempo ---
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getRemainingTime = (deadline: string) => {
    const diff = new Date(deadline).getTime() - now.getTime();
    if (diff <= 0) return 'Cerrada';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    return `${hours}h ${minutes}m`;
  };

  // --- Selección actual de Quiniela (Pronósticos locales) ---
  const [currentSelections, setCurrentSelections] = useState<Record<string, string>>({}); // matchId -> selection ('L' | 'E' | 'V')

  // --- Estados de Formularios / Carga ---
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{ message: string; title?: string; onConfirm: () => void; onCancel?: () => void; confirmColor?: string; confirmText?: string } | null>(null);
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
  const [isReserveMatch, setIsReserveMatch] = useState(false);
  const [activationDate, setActivationDate] = useState('');
  const [firstMatchDate, setFirstMatchDate] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [showEditDeadline, setShowEditDeadline] = useState(false);

  // --- Formulario Suscripción (Próximamente) ---
  const [subName, setSubName] = useState('');

  const toCapitalCase = (str: string) => {
    return str
      .toLowerCase()
      .split(' ')
      .filter(word => word.length > 0)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!subName) {
      showAlert('error', 'Por favor ingresa tu nombre.');
      return;
    }

    const capitalizedName = toCapitalCase(subName);

    try {
      setLoading(true);
      // Guardar en la base de datos
      const { error } = await supabase
        .from('pre_registrations')
        .insert([{
          name: capitalizedName,
          phone: '' // Vacío ya que al unirse por WhatsApp el número queda expuesto en el chat
        }]);

      if (error) throw error;

      showAlert('success', '¡Registro exitoso! Redirigiendo a la comunidad de WhatsApp...');
      setSubName('');

      // Redirigir al enlace oficial de la Comunidad de WhatsApp de La Carmelita
      const communityUrl = 'https://chat.whatsapp.com/KT4bJ1hXCqSHdlDs5mnGzj';
      
      // Abrir en una pestaña nueva
      window.open(communityUrl, '_blank');
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

    // 3. Detectar acceso secreto de Login/Admin mediante parámetro de URL (?login=true)
    const params = new URLSearchParams(window.location.search);
    if (params.get('login') === 'true') {
      setActiveTab('login');
      setAuthView('user-login');
      // Limpiar el parámetro de la barra de direcciones para mantenerlo sigiloso
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('tab') === 'verify-payment') {
      setActiveTab('verify-payment');
      const ref = params.get('ref');
      if (ref) {
        setVerifyCode(ref);
        localStorage.setItem('lastReferenceCode', ref);
        // Execute the search automatically after a short delay to ensure state and components are ready
        setTimeout(() => {
          handleVerifySearch(undefined, ref);
        }, 100);
      }
      // Limpiamos la URL para no dejarla sucia si recargan
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    loadInitialData();

    return () => subscription.unsubscribe();
  }, []);

  // Cargar datos cuando cambia la quiniela o la pestaña activa
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
    if (isAdmin && (activeTab === 'admin-dashboard' || activeTab === 'admin-history')) {
      loadFinancialData();
    }
    if (isAdmin && (activeTab === 'admin-matchdays' || activeTab === 'admin-teams' || activeTab === 'admin-leagues')) {
      loadTeams();
      loadLeagues();
    }
  }, [activeTab, currentUser, activeMatchday, isAdmin]);

  // Cargar ganadores de la última quiniela finalizada
  useEffect(() => {
    if (activeTab === 'admin-participants' && isAdmin) {
      const fetchLastWinners = async () => {
        try {
          const { data: matchdays } = await supabase
            .from('matchdays')
            .select('*')
            .eq('status', 'calculated')
            .order('created_at', { ascending: false })
            .limit(1);

          if (matchdays && matchdays.length > 0) {
            const lastM = matchdays[0];
            setLastCalculatedMatchday(lastM);

            const { data: pools } = await supabase
              .from('pools')
              .select('id, score, payment_status, participants(name, alias)')
              .eq('matchday_id', lastM.id)
              .eq('payment_status', 'approved')
              .order('score', { ascending: false });

            if (pools) {
              const formatted = pools.map(p => ({
                id: p.id,
                score: p.score,
                name: p.participants ? (p.participants as any).name : 'Anónimo',
                alias: p.participants ? (p.participants as any).alias : 'anon'
              }));
              setLastWinners(formatted.slice(0, 3));
            }
          }
        } catch (err) {
          console.error('Error fetching last winners', err);
        }
      };
      fetchLastWinners();
    }
  }, [activeTab, isAdmin]);

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

      // 2. Obtener la quiniela activa de esta temporada
      const { data: matchdaysData, error: matchdayErr } = await supabase
        .from('matchdays')
        .select('*')
        .eq('season_id', season.id)
        .order('number', { ascending: false });

      if (matchdayErr) throw matchdayErr;
      
      setAllMatchdays(matchdaysData || []);
      
      const { data: allPoolsData, error: allPoolsErr } = await supabase
        .from('pools')
        .select('matchday_id, participant_id, payment_status');
      if (allPoolsErr) throw allPoolsErr;
      
      const approvedParts: Record<string, Set<string>> = {};
      const approvedPools: Record<string, number> = {};
      
      if (allPoolsData) {
        allPoolsData.forEach(p => {
          if (p.payment_status === 'approved') {
            // Contar quinielas aprobadas (vendidas)
            approvedPools[p.matchday_id] = (approvedPools[p.matchday_id] || 0) + 1;
            
            // Recolectar participantes únicos aprobados
            if (!approvedParts[p.matchday_id]) {
              approvedParts[p.matchday_id] = new Set();
            }
            approvedParts[p.matchday_id].add(p.participant_id);
          }
        });
      }
      
      const participantCounts: Record<string, number> = {};
      Object.keys(approvedParts).forEach(mId => {
        participantCounts[mId] = approvedParts[mId].size;
      });
      
      setMatchdayApprovedParticipants(participantCounts);
      setMatchdayApprovedPools(approvedPools);

      let currentMatchday = null;
      if (matchdaysData && matchdaysData.length > 0) {
        // Encontrar la primera quiniela activa o la última registrada
        currentMatchday = matchdaysData.find(m => m.status === 'active') || matchdaysData[0];
      } else {
        currentMatchday = null;
      }
      setActiveMatchday(currentMatchday);

      // 3. Obtener partidos de la quiniela activa
      if (currentMatchday) {
        await loadMatches(currentMatchday.id);
      }

      // 4. Obtener todos los equipos
      await loadTeams();

      // 5. Cargar Cuentas Bancarias
      await loadBankAccounts();
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
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error cargando partidos:', error);
    } else {
      console.log('[DEBUG] Partidos cargados:', data);
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

  const loadFinancialData = async () => {
    if (!activeSeason) return;
    try {
      setLoading(true);
      // 1. Cargar quinielas de la temporada
      const { data: mData, error: mErr } = await supabase
        .from('matchdays')
        .select('*')
        .eq('season_id', activeSeason.id)
        .order('number', { ascending: true });

      if (mErr) throw mErr;
      setFinancialMatchdays(mData || []);

      if (mData && mData.length > 0) {
        // 2. Cargar todas las quinielas de estas quinielas
        const matchdayIds = mData.map(m => m.id);
        const { data: pData, error: pErr } = await supabase
          .from('pools')
          .select(`
            *,
            participants (
              id,
              name,
              alias,
              phone
            )
          `)
          .in('matchday_id', matchdayIds)
          .order('created_at', { ascending: false });

        if (pErr) throw pErr;

        const formattedPools = (pData || []).map(p => ({
          ...p,
          participant: Array.isArray(p.participants) ? p.participants[0] : p.participants
        })) as Pool[];
        
        setFinancialPools(formattedPools);
      } else {
        setFinancialPools([]);
      }

      // 3. Cargar todos los participantes
      await loadParticipants();
    } catch (err) {
      console.error('Error cargando datos financieros:', err);
      showAlert('error', 'Error al cargar datos financieros.');
    } finally {
      setLoading(false);
    }
  };

  // --- CUENTAS BANCARIAS CRUD ---
  const loadBankAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      
      const whatsapp = data?.find(b => b.bank_name === 'WHATSAPP_CONFIG');
      if (whatsapp) {
        setWhatsappConfig(whatsapp.account_number || '');
        setBankAccounts(data.filter(b => b.bank_name !== 'WHATSAPP_CONFIG'));
      } else {
        setBankAccounts(data || []);
      }
    } catch (err) {
      console.error('Error cargando cuentas bancarias:', err);
    }
  };

  const handleAddBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankName.trim() || !newAccountHolder.trim()) {
      showAlert('error', 'El nombre del banco y el titular son obligatorios.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('bank_accounts').insert([{
        bank_name: newBankName.trim(),
        account_holder: newAccountHolder.trim(),
        account_number: newAccountNumber.trim() || null,
        clabe: newClabe.trim() || null,
        account_type: newAccountType
      }]);
      if (error) throw error;
      showAlert('success', `Cuenta agregada con éxito.`);
      setNewBankName('');
      setNewAccountHolder('');
      setNewAccountNumber('');
      setNewClabe('');
      setNewAccountType('transferencia');
      await loadBankAccounts();
    } catch (err: any) {
      showAlert('error', `Error al agregar cuenta: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBankAccount = async (bankId: string) => {
    if (!editBankName.trim() || !editAccountHolder.trim()) {
      showAlert('error', 'El nombre del banco y el titular son obligatorios.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('bank_accounts').update({
        bank_name: editBankName.trim(),
        account_holder: editAccountHolder.trim(),
        account_number: editAccountNumber.trim() || null,
        clabe: editClabe.trim() || null,
        is_active: editBankActive,
        account_type: editAccountType
      }).eq('id', bankId);
      if (error) throw error;
      showAlert('success', 'Cuenta actualizada.');
      setEditingBankId(null);
      await loadBankAccounts();
    } catch (err: any) {
      showAlert('error', `Error al actualizar cuenta: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBankAccount = (bankId: string) => {
    const bank = bankAccounts.find(b => b.id === bankId);
    if (bank) setItemToDelete({ id: bank.id, type: 'bank', name: bank.bank_name });
  };

  const handleSaveWhatsappConfig = async (number: string) => {
    try {
      setLoading(true);
      const { data } = await supabase.from('bank_accounts').select('*').eq('bank_name', 'WHATSAPP_CONFIG').maybeSingle();
      if (data) {
        await supabase.from('bank_accounts').update({ account_number: number }).eq('id', data.id);
      } else {
        await supabase.from('bank_accounts').insert([{ bank_name: 'WHATSAPP_CONFIG', account_holder: 'Config', account_number: number }]);
      }
      setWhatsappConfig(number);
      showAlert('success', 'Número de WhatsApp actualizado.');
    } catch (err) {
      showAlert('error', 'Error al guardar WhatsApp.');
    } finally {
      setLoading(false);
    }
  };

  // --- LIGAS CRUD ---
  const loadLeagues = async () => {
    try {
      const { data, error } = await supabase
        .from('leagues')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      setLeagues(data || []);
    } catch (err) {
      console.error('Error cargando ligas:', err);
    }
  };

  const handleAddLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeagueName.trim()) {
      showAlert('error', 'Ingresa el nombre de la liga.');
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase.from('leagues').insert([{
        name: newLeagueName.trim(),
        country: newLeagueCountry.trim() || null,
        logo_url: newLeagueLogoUrl.trim() || null
      }]);
      if (error) throw error;
      showAlert('success', `Liga "${newLeagueName}" registrada con éxito.`);
      setNewLeagueName('');
      setNewLeagueCountry('');
      setNewLeagueLogoUrl('');
      await loadLeagues();
    } catch (err: any) {
      if (err.code === '23505') showAlert('error', 'Esta liga ya está registrada.');
      else showAlert('error', 'Error al registrar liga.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLeague = async (leagueId: string) => {
    if (!editLeagueName.trim()) {
      showAlert('error', 'Ingresa el nombre de la liga.');
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase.from('leagues').update({
        name: editLeagueName.trim(),
        country: editLeagueCountry.trim() || null,
        logo_url: editLeagueLogoUrl.trim() || null
      }).eq('id', leagueId);
      if (error) throw error;
      showAlert('success', 'Liga actualizada.');
      setEditingLeagueId(null);
      await loadLeagues();
    } catch (err: any) {
      if (err.code === '23505') showAlert('error', 'Esta liga ya existe.');
      else showAlert('error', 'Error al actualizar liga.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLeague = (leagueId: string) => {
    const league = leagues.find(l => l.id === leagueId);
    if (league) setItemToDelete({ id: league.id, type: 'league', name: league.name });
  };

  // --- EQUIPOS CRUD ---
  const loadTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select(`
          *,
          leagues (
            name
          )
        `)
        .order('name', { ascending: true });

      if (error) throw error;
      setTeams(data || []);
    } catch (err) {
      console.error('Error cargando equipos:', err);
    }
  };

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) {
      showAlert('error', 'Ingresa el nombre del equipo.');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('teams')
        .insert([{
          name: newTeamName.trim(),
          code: newTeamCode.trim().toUpperCase() || null,
          league_id: newTeamLeagueId || null,
          logo_url: newTeamLogoUrl.trim() || null
        }]);

      if (error) throw error;

      showAlert('success', `Equipo "${newTeamName}" registrado con éxito.`);
      setNewTeamName('');
      setNewTeamCode('');
      setNewTeamLeagueId('');
      setNewTeamLogoUrl('');
      await loadTeams();
    } catch (err: any) {
      if (err.code === '23505') {
        showAlert('error', 'Ese equipo ya está registrado.');
      } else {
        console.error('Error al registrar equipo:', err);
        showAlert('error', 'Error al registrar equipo.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTeam = async (teamId: string) => {
    if (!editTeamName.trim()) {
      showAlert('error', 'Ingresa el nombre del equipo.');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('teams')
        .update({
          name: editTeamName.trim(),
          code: editTeamCode.trim().toUpperCase() || null,
          league_id: editTeamLeagueId || null,
          logo_url: editTeamLogoUrl.trim() || null
        })
        .eq('id', teamId);

      if (error) throw error;

      showAlert('success', 'Equipo actualizado con éxito.');
      setEditingTeamId(null);
      await loadTeams();
    } catch (err: any) {
      if (err.code === '23505') {
        showAlert('error', 'Ese nombre de equipo ya está registrado.');
      } else {
        console.error('Error al actualizar equipo:', err);
        showAlert('error', 'Error al actualizar equipo.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeam = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (team) setItemToDelete({ id: team.id, type: 'team', name: team.name });
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      setLoading(true);
      if (itemToDelete.type === 'league') {
        const { error } = await supabase.from('leagues').delete().eq('id', itemToDelete.id);
        if (error) throw error;
        showAlert('success', 'Liga eliminada con éxito.');
        await loadLeagues();
      } else if (itemToDelete.type === 'team') {
        const { error } = await supabase.from('teams').delete().eq('id', itemToDelete.id);
        if (error) throw error;
        showAlert('success', 'Equipo eliminado con éxito.');
        await loadTeams();
      }
      setItemToDelete(null);
    } catch (err: any) {
      console.error('Error al eliminar:', err);
      if (err.code === '23503') {
        showAlert('error', 'No se puede eliminar porque hay registros asociados a este elemento.');
      } else {
        showAlert('error', 'Error al eliminar el elemento.');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatInputWithCommas = (val: number | string) => {
    if (val === undefined || val === null || val === '') return '';
    const clean = String(val).replace(/[^0-9]/g, '');
    if (!clean) return '';
    return Number(clean).toLocaleString('en-US');
  };

  const formatMoney = (val: number | string | null | undefined) => {
    const num = Number(val || 0);
    return num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const calculatePayouts = (md: Matchday | null, lb: any[]) => {
    if (!md || lb.length === 0) return {};
    
    const approvedCount = lb.length;
    const pricePerEntry = md.price_per_entry || 25;
    const totalRecaudado = approvedCount * pricePerEntry;
    
    let prizePool = 0;
    if (md.prize_type === 'fixed') {
      prizePool = Number(md.fixed_prize_1st || 0);
    } else {
      const pct = md.prize_percentage !== undefined && md.prize_percentage !== null ? Number(md.prize_percentage) : 80;
      prizePool = totalRecaudado * (pct / 100);
    }
    
    const playersByScore: Record<number, any[]> = {};
    lb.forEach(p => {
      if (!playersByScore[p.score]) playersByScore[p.score] = [];
      playersByScore[p.score].push(p);
    });
    
    const sortedScores = Object.keys(playersByScore)
      .map(Number)
      .sort((a, b) => b - a);
      
    const payouts: Record<string, number> = {};
    
    if (sortedScores.length > 0) {
      const maxScore = sortedScores[0];
      const maxScorePlayers = playersByScore[maxScore];
      const N_1st = maxScorePlayers.length;
      
      let total1stPrize = 0;
      if (md.prize_type === 'fixed') {
        total1stPrize = Number(md.fixed_prize_1st || 0);
      } else {
        total1stPrize = prizePool;
      }
      
      const payout1st = total1stPrize / N_1st;
      maxScorePlayers.forEach(p => {
        payouts[p.id] = payout1st;
      });
    }
    
    return payouts;
  };

  const loadLeaderboard = async () => {
    if (!activeMatchday) return;
    try {
      // Obtener todas las quinielas aprobadas para la quiniela actual
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
      let loginEmail = adminEmail.trim();
      if (!loginEmail.includes('@')) {
        loginEmail = `${loginEmail}@lacarmelita.com`;
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
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
    // Si la quiniela ya cerró, no se pueden hacer cambios
    if (activeMatchday && new Date(activeMatchday.deadline) < new Date()) {
      showAlert('error', 'Esta quiniela ya está cerrada para nuevos registros.');
      return;
    }
    setCurrentSelections(prev => ({
      ...prev,
      [matchId]: prev[matchId] === value ? '' : value // Toggle
    }));
  };

  const handleRandomFill = () => {
    if (activeMatchday && new Date(activeMatchday.deadline) < new Date()) {
      showAlert('error', 'Esta quiniela ya está cerrada.');
      return;
    }
    const options = ['L', 'E', 'V'];
    const newSelections: Record<string, string> = {};
    matches.forEach(m => {
      const randomChoice = options[Math.floor(Math.random() * options.length)];
      newSelections[m.id] = randomChoice;
    });
    setCurrentSelections(newSelections);
    showAlert('success', 'Quiniela llenada al azar.');
  };

  const handleAddToCart = () => {
    if (!activeMatchday) return;
    if (new Date(activeMatchday.deadline) < new Date()) {
      showAlert('error', 'El límite para registrar quinielas ha expirado.');
      return;
    }
    const incomplete = matches.some(m => !currentSelections[m.id]);
    if (incomplete || matches.length === 0) {
      showAlert('error', 'Por favor selecciona el pronóstico para todos los partidos.');
      return;
    }
    setCart([...cart, { ...currentSelections }]);
    setCurrentSelections({});
    showAlert('success', 'Quiniela añadida al carrito.');
  };

  const handleRemoveFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const handleSubmitCart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length < 2) {
      showAlert('error', 'Debes registrar al menos 2 quinielas.');
      return;
    }
    if (!cartParticipantName.trim() || !cartParticipantPhone.trim()) {
      showAlert('error', 'Por favor llena todos los datos del participante.');
      return;
    }
    setLoading(true);
    try {
      const generateRandomCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return `REF-${result}`;
      };

      const refId = generateRandomCode();
      let participantId = '';

      const { data: existingPart } = await supabase.from('participants').select('id').eq('alias', cartParticipantName).maybeSingle();
      if (existingPart) {
        participantId = existingPart.id;
      } else {
        const dummyPin = Math.floor(1000 + Math.random() * 9000).toString();
        const { data: newPart, error: partErr } = await supabase.from('participants').insert([{
          name: cartParticipantName,
          alias: cartParticipantName,
          phone: cartCountryCode + cartParticipantPhone,
          pin: dummyPin
        }]).select('id').single();
        if (partErr) throw partErr;
        participantId = newPart.id;
      }

      const poolsToInsert = cart.map(() => ({
          participant_id: participantId,
          matchday_id: activeMatchday!.id,
          payment_status: 'pending',
          cost: activeMatchday!.price_per_entry,
          score: 0,
          reference_code: refId
      }));
      const { data: poolsData, error: poolsErr } = await supabase.from('pools').insert(poolsToInsert).select();
      if (poolsErr) throw poolsErr;

      const predictionsToInsert: any[] = [];
      cart.forEach((selections, idx) => {
         const poolId = poolsData[idx].id;
         Object.keys(selections).forEach(matchId => {
           predictionsToInsert.push({
             pool_id: poolId,
             match_id: matchId,
             selection: selections[matchId]
           });
         });
      });
      const { error: predErr } = await supabase.from('predictions').insert(predictionsToInsert);
      if (predErr) throw predErr;
      
      let msgText = `Hola, soy ${cartParticipantName}, me he registrado para participar en la quiniela Jornada ${activeMatchday?.number}.

Mis pronósticos son:
`;
      cart.forEach((selections, idx) => {
        let quinielaLine = `Quiniela ${idx + 1}: `;
        let selArray: string[] = [];
        matches.forEach(m => {
          if (selections[m.id]) {
            selArray.push(selections[m.id]);
          }
        });
        quinielaLine += selArray.join(',');
        msgText += quinielaLine + `\n`;
      });
      msgText += `\nCódigo de Referencia:\n*REF-${refId.replace('REF-', '')}*\n\n`;
      msgText += `El código debes incluirlo en la REFERENCIA de tu voucher, para identificar tu pago.\n\n`;
      const voucherUrl = `https://www.quinielalacarmelita.com/?tab=verify-payment&ref=${refId}`;
      msgText += `(Instrucción) Cuando realices el depósito o transferencia envía el comprobante a la siguiente URL:\n`;
      msgText += `${voucherUrl}\n\n`;
      msgText += `Nuestro agente te compartirá la información para realizar tu pago.`;

      
      setCartReferenceId(refId);
      localStorage.setItem('lastReferenceCode', refId);
      setSuccessName(cartParticipantName);
      setSuccessAlias(cartParticipantName);
      setSuccessMessageText(msgText);
      setShowSuccessScreen(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      const targetPhone = whatsappConfig ? whatsappConfig.replace(/\D/g, '') : '523122440708';
      const waUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(msgText)}`;
      window.open(waUrl, '_blank');

      setCart([]);
      setCartParticipantName('');
      setCartParticipantAlias('');
      setCartParticipantPhone('');
    } catch (err: any) {
      showAlert('error', `Error al registrar: ${err.message}`);
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

  // --- Verificación Pública ---
  const handleVerifySearch = async (e?: React.FormEvent, codeOverride?: string) => {
    if (e) e.preventDefault();
    const codeToSearch = codeOverride || verifyCode;

    if (!codeToSearch.trim()) {
      showAlert('error', 'Ingresa un código de referencia válido.');
      return;
    }
    
    let refCode = codeToSearch.trim().toUpperCase();
    
    // Add REF- prefix if user forgot it
    if (!refCode.startsWith('REF-')) {
      refCode = 'REF-' + refCode;
    }

    try {
      setVerifyLoading(true);
      const { data, error } = await supabase
        .from('pools')
        .select('*, participant:participants(name, alias)')
        .eq('reference_code', refCode)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVerifyResults(data || []);
      if (data?.length === 0) {
        showAlert('warning', 'No se encontraron quinielas con este código.');
      }
    } catch (err: any) {
      console.error(err);
      showAlert('error', 'Error al buscar quinielas.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleFileSelection = async (file: File, expectedRefCode: string) => {
    if (!file) return;
    
    setVerifyReceiptFile(null);
    setVerifyAnalysisStatus('analyzing');
    setVerifyAnalysisMessage('Optimizando y analizando imagen...');
    setVerifyAnalysisFlags([]);

    try {
      // 1. Comprimir imagen
      const options = {
        maxSizeMB: 0.5, // 500KB máximo
        maxWidthOrHeight: 1280,
        useWebWorker: true,
      };
      
      const compressedFile = await imageCompression(file, options);
      setVerifyReceiptFile(compressedFile);

      // 2. OCR Analysis
      const worker = await Tesseract.createWorker('spa'); // Usamos español para detectar SPEI, Transferencia, etc.
      const ret = await worker.recognize(compressedFile);
      const text = ret.data.text.toLowerCase();
      await worker.terminate();

      const flags: string[] = [];

      // A) Palabras clave bancarias
      const bankKeywords = ['spei', 'transferencia', 'bbva', 'banamex', 'santander', 'banorte', 'hsbc', 'scotiabank', 'inbursa', 'nu', 'stpmex', 'folio', 'autorizacion', 'clave de rastreo', 'importe', 'cuenta', 'clabe', 'pago exitoso', 'operacion exitosa', 'transfer', 'movimiento'];
      const hasBankKeyword = bankKeywords.some(kw => text.includes(kw));
      if (!hasBankKeyword) {
        flags.push("Posible imagen no bancaria (no se encontraron palabras clave).");
      }

      // B) Fecha actual
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const yyyy = today.getFullYear();
      const yy = String(yyyy).slice(-2);
      
      const dateRegex = /(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/;
      const match = text.match(dateRegex);
      if (match) {
         if (!text.includes(`${dd}/${mm}`) && !text.includes(`${dd}-${mm}`) && !text.includes(`${dd} `)) {
            flags.push("La fecha del comprobante podría no coincidir con hoy.");
         }
      } else {
         flags.push("No se detectó una fecha clara en el comprobante.");
      }

      // C) Código de referencia
      if (expectedRefCode && !text.includes(expectedRefCode.toLowerCase())) {
         flags.push(`No se encontró el código de referencia (${expectedRefCode}) en la imagen.`);
      }

      // D) Tipo de Pago
      const transferKeywords = ['spei', 'transferencia', 'clabe', 'traspaso'];
      const depositKeywords = ['depósito', 'deposito', 'practicaja', 'efectivo', 'sucursal', 'cajero', 'ventanilla'];
      
      const isTransfer = transferKeywords.some(kw => text.includes(kw));
      const isDeposit = depositKeywords.some(kw => text.includes(kw));
      
      if (isTransfer) {
        flags.push("[TYPE:TRANSFERENCIA]");
      } else if (isDeposit) {
        flags.push("[TYPE:DEPOSITO]");
      } else {
        flags.push("[TYPE:DESCONOCIDO]");
      }

      // E) Calidad de imagen
      if (ret.data.confidence < 40) {
        flags.push("La imagen parece estar muy borrosa o no contiene texto claro.");
      }

      setVerifyAnalysisFlags(flags);

      if (flags.length > 0) {
        setVerifyAnalysisStatus('warning');
        setVerifyAnalysisMessage(`Análisis completado con ${flags.length} observación(es) sospechosas.`);
      } else {
        setVerifyAnalysisStatus('success');
        setVerifyAnalysisMessage('Comprobante validado con éxito. Sin observaciones.');
      }
      
    } catch (err: any) {
      console.error("Error en análisis de imagen:", err);
      setVerifyReceiptFile(file);
      setVerifyAnalysisStatus('warning');
      setVerifyAnalysisMessage(`El análisis falló internamente: ${err.message || 'Intenta subir otra imagen'}`);
    }
  };

  const handleVerifyUpload = async (refCode: string) => {
    if (!verifyReceiptFile) {
      showAlert('error', 'Selecciona un archivo.');
      return;
    }

    const attemptsKey = `upload_attempts_${refCode}`;
    const currentAttempts = parseInt(localStorage.getItem(attemptsKey) || '0', 10);
    
    if (currentAttempts >= 2) {
      showAlert('error', 'Has alcanzado el límite de 2 intentos para subir comprobante. Si sigues teniendo problemas, contacta al administrador.');
      return;
    }

    try {
      setVerifyLoading(true);
      const fileExt = verifyReceiptFile.name.split('.').pop();
      const fileName = `${refCode}_verify_${Date.now()}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from('receipts')
        .upload(filePath, verifyReceiptFile, { 
          cacheControl: '3600', 
          upsert: true,
          contentType: verifyReceiptFile.type || 'image/jpeg'
        });

      if (uploadErr) {
        console.error("Storage upload error:", uploadErr);
        throw new Error(`Error de Supabase: ${uploadErr.message || 'El bucket debe tener permisos de escritura públicos.'}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath);

      const { error: updateErr } = await supabase
        .from('pools')
        .update({
          payment_receipt_url: publicUrl,
          payment_status: 'pending',
          validation_flags: verifyAnalysisFlags
        })
        .eq('reference_code', refCode);

      if (updateErr) throw updateErr;

      showAlert('success', 'Comprobante subido. Esperando validación.');
      setVerifyReceiptFile(null);
      setVerifyingPoolId(null);
      handleVerifySearch();
    } catch (err: any) {
      console.error(err);
      showAlert('error', err.message || 'Error al subir comprobante.');
    } finally {
      setVerifyLoading(false);
    }
  };

  // --- Acciones de Administrador ---

  // Aprobar / Rechazar Pagos
  const handleValidatePayment = async (poolIdOrIds: string | string[], status: 'approved' | 'rejected') => {
    try {
      setLoading(true);
      const ids = Array.isArray(poolIdOrIds) ? poolIdOrIds : [poolIdOrIds];
      const { error } = await supabase
        .from('pools')
        .update({ payment_status: status })
        .in('id', ids);

      if (error) throw error;
      
      showAlert('success', `Pago ${status === 'approved' ? 'APROBADO' : 'RECHAZADO'} correctamente.`);
      loadAllPoolsForMatchday();
      if (isAdmin && (activeTab === 'admin-dashboard' || activeTab === 'admin-history')) {
        loadFinancialData();
      }
    } catch (err) {
      showAlert('error', 'Error al validar el pago.');
    } finally {
      setLoading(false);
    }
  };

  const handleValidatePaymentBatch = (refCode: string, status: 'approved' | 'rejected') => {
    const isApproved = status === 'approved';
    setConfirmConfig({
      title: isApproved ? 'Aprobar Bloque' : 'Rechazar Bloque',
      message: `¿Estás seguro de que deseas ${isApproved ? 'APROBAR' : 'RECHAZAR'} este bloque de pagos?\n\nEsta acción afectará a todas las quinielas con este comprobante.`,
      confirmText: isApproved ? 'Sí, Aprobar' : 'Sí, Rechazar',
      confirmColor: isApproved ? 'var(--primary)' : 'var(--danger)',
      onConfirm: async () => {
        setConfirmConfig(null);
        try {
          setLoading(true);
          const { error } = await supabase
            .from('pools')
            .update({ payment_status: status })
            .eq('reference_code', refCode);

          if (error) throw error;
          
          showAlert('success', `Bloque de pagos ${status === 'approved' ? 'APROBADO' : 'RECHAZADO'} correctamente.`);
          loadAllPoolsForMatchday();
          if (isAdmin && (activeTab === 'admin-dashboard' || activeTab === 'admin-history')) {
            loadFinancialData();
          }
        } catch (err) {
          showAlert('error', 'Error al validar el bloque de pagos.');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleRevertPayment = (poolIdOrIds: string | string[]) => {
    const ids = Array.isArray(poolIdOrIds) ? poolIdOrIds : [poolIdOrIds];
    setConfirmConfig({
      title: 'Deshacer Acción',
      message: '¿Seguro que deseas regresar estas quinielas a estado PENDIENTE?\n\nVolverán a aparecer en tu lista de validación.',
      confirmText: 'Sí, Deshacer',
      confirmColor: 'var(--text-secondary)',
      onConfirm: async () => {
        setConfirmConfig(null);
        try {
          setLoading(true);
          const { error } = await supabase
            .from('pools')
            .update({ payment_status: 'pending' })
            .in('id', ids);

          if (error) throw error;
          
          showAlert('success', 'Quinielas regresadas a estado PENDIENTE exitosamente.');
          loadAllPoolsForMatchday();
          if (isAdmin && (activeTab === 'admin-dashboard' || activeTab === 'admin-history')) {
            loadFinancialData();
          }
        } catch (err) {
          showAlert('error', 'Error al revertir la quiniela.');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // Crear una nueva quiniela
  const handleCreateMatchday = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!activeSeason) return;

    try {
      setLoading(true);
      
      // Obtener el número de la última quiniela
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
          status: 'inactive',
          deadline: deadlineDate.toISOString(),
          price_per_entry: 25.00,
          prize_percentage: 80.00,
          prize_type: 'percentage',
          fixed_prize_1st: 0.00,
          fixed_prize_2nd: 0.00
        }])
        .select()
        .single();

      if (error) throw error;

      setActiveMatchday(newMatchday);
      setMatches([]);
      showAlert('success', `Quiniela ${nextNumber} creada con éxito.`);
    } catch (err) {
      showAlert('error', 'Error al crear la quiniela.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMatchdayConfig = async () => {
    if (!activeMatchday) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('matchdays')
        .update({
          price_per_entry: matchdayPrice,
          prize_percentage: prizePercentage,
          prize_type: matchdayPrizeType,
          fixed_prize_1st: matchdayFixedPrize1st,
          fixed_prize_2nd: 0
        })
        .eq('id', activeMatchday.id)
        .select()
        .single();

      if (error) throw error;

      setActiveMatchday(data);
      setAllMatchdays(prev => prev.map(m => m.id === data.id ? data : m));
      showAlert('success', 'Configuración de quiniela guardada.');
    } catch (err) {
      console.error(err);
      showAlert('error', 'Error al guardar la configuración.');
    } finally {
      setLoading(false);
    }
  };

  const handleActivateMatchday = async () => {
    if (!activeMatchday) return;

    // Criterio 1: Fechas requeridas
    if (!firstMatchDate) {
      showAlert('error', 'Criterio 1: Debes seleccionar la Fecha y Hora del Primer Partido.');
      return;
    }
    if (!activationDate) {
      showAlert('error', 'Criterio 1: Debes seleccionar una Fecha y Hora Límite para registrar quinielas.');
      return;
    }

    // Criterio 2: Mínimo 10 partidos regulares (sin contar el Extra)
    const regularMatches = matches.filter(m => !m.is_reserve);
    if (regularMatches.length < 10) {
      showAlert('error', `Criterio 2: Debes agregar al menos 10 partidos regulares. Llevas ${regularMatches.length} (sin contar el partido Extra).`);
      return;
    }

    // Criterio 3: Sin auto-partidos (local === visitante)
    const selfMatch = matches.find(m =>
      (m.home_team_id && m.home_team_id === m.away_team_id) ||
      m.home_team.toLowerCase() === m.away_team.toLowerCase()
    );
    if (selfMatch) {
      showAlert('error', `Criterio 3: El partido "${selfMatch.home_team} vs ${selfMatch.away_team}" tiene el mismo equipo como local y visitante.`);
      return;
    }

    // Criterio 4: Sin equipos repetidos en la quiniela
    const allTeamIds: string[] = [];
    const allTeamNames: string[] = [];
    for (const m of matches) {
      const homeKey = m.home_team_id || m.home_team.toLowerCase();
      const awayKey = m.away_team_id || m.away_team.toLowerCase();
      if (allTeamIds.includes(homeKey)) {
        showAlert('error', `Criterio 4: El equipo "${m.home_team}" aparece más de una vez en la quiniela.`);
        return;
      }
      if (allTeamIds.includes(awayKey)) {
        showAlert('error', `Criterio 4: El equipo "${m.away_team}" aparece más de una vez en la quiniela.`);
        return;
      }
      allTeamIds.push(homeKey, awayKey);
    }

    // Criterio 5: Exactamente 1 partido de reserva/desempate
    const reserveMatches = matches.filter(m => m.is_reserve);
    if (reserveMatches.length === 0) {
      showAlert('error', 'Criterio 5: Debes marcar exactamente 1 partido como Partido Extra de Reserva (Desempate) antes de activar.');
      return;
    }
    if (reserveMatches.length > 1) {
      showAlert('error', `Criterio 5: Solo puede haber 1 partido de reserva por quiniela. Tienes ${reserveMatches.length} marcados.`);
      return;
    }

    // Fecha límite no puede ser en el pasado
    const deadlineTime = new Date(activationDate).getTime();
    if (deadlineTime <= Date.now()) {
      showAlert('error', 'La fecha límite debe ser en el futuro.');
      return;
    }

    // Regla de cierre: La fecha límite debe ser al menos 5 horas antes del primer partido
    const firstMatchTime = new Date(firstMatchDate).getTime();
    const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;
    if (firstMatchTime - deadlineTime < FIVE_HOURS_MS) {
      showAlert('error', 'La fecha límite de cierre debe ser al menos 5 horas antes del primer juego.');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('matchdays')
        .update({ 
          status: 'active', 
          deadline: new Date(activationDate).toISOString(),
          first_match_date: new Date(firstMatchDate).toISOString()
        })
        .eq('id', activeMatchday.id);
      
      if (error) throw error;
      setActiveMatchday({ 
        ...activeMatchday, 
        status: 'active', 
        deadline: new Date(activationDate).toISOString(),
        first_match_date: new Date(firstMatchDate).toISOString()
      });
      showAlert('success', `¡Quiniela ${activeMatchday.number} activada! Ya es visible para los usuarios.`);
    } catch (err: any) {
      console.error(err);
      showAlert('error', 'Error al activar la quiniela.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMatchday = async () => {
    if (!activeMatchday || activeMatchday.status !== 'inactive') return;
    setConfirmConfig({
      title: 'Eliminar Quiniela',
      message: '¿Estás seguro de eliminar esta quiniela en creación? Se borrarán los partidos.',
      onConfirm: async () => {
        try {
          setLoading(true);
          const { error } = await supabase.from('matchdays').delete().eq('id', activeMatchday.id);
          if (error) throw error;
          setActiveMatchday(null);
          setMatches([]);
          showAlert('success', 'Quiniela eliminada correctamente.');
        } catch (err) {
          console.error(err);
          showAlert('error', 'Error al eliminar quiniela.');
        } finally {
          setLoading(false);
          setConfirmConfig(null);
        }
      }
    });
  };

  // Cerrar Quiniela (Previene más apuestas)
  const handleToggleMatchdayStatus = async (newStatus: 'inactive' | 'active' | 'closed' | 'calculated') => {
    if (!activeMatchday) return;

    if (newStatus === 'calculated') {
      const missingResults = matches.filter(m => !m.result);
      if (missingResults.length > 0) {
        showAlert('error', `No puedes finalizar la quiniela. Faltan ${missingResults.length} partido(s) por calificar.`);
        return;
      }
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('matchdays')
        .update({ status: newStatus })
        .eq('id', activeMatchday.id);

      if (error) throw error;

      setActiveMatchday(prev => prev ? { ...prev, status: newStatus } : null);
      showAlert('success', `Quiniela marcada como ${newStatus.toUpperCase()}.`);
    } catch (err) {
      showAlert('error', 'Error al cambiar estado de la quiniela.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDeadline = async () => {
    if (!activeMatchday || !editDeadline) return;
    const newDeadlineTime = new Date(editDeadline).getTime();
    if (newDeadlineTime <= Date.now()) {
      showAlert('error', 'La nueva fecha limite debe ser en el futuro.');
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase
        .from('matchdays')
        .update({ deadline: new Date(editDeadline).toISOString() })
        .eq('id', activeMatchday.id);
      if (error) throw error;
      setActiveMatchday(prev => prev ? { ...prev, deadline: new Date(editDeadline).toISOString() } : null);
      setAllMatchdays(prev => prev.map(m => m.id === activeMatchday.id ? { ...m, deadline: new Date(editDeadline).toISOString() } : m));
      setShowEditDeadline(false);
      setEditDeadline('');
      showAlert('success', 'Hora de cierre actualizada correctamente.');
    } catch (err) {
      showAlert('error', 'Error al actualizar la hora de cierre.');
    } finally {
      setLoading(false);
    }
  };

  // Agregar Partido a la Quiniela
  const handleAddMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMatchday || !newHomeTeam || !newAwayTeam) {
      showAlert('error', 'Error: Faltan campos por llenar (Local y Visitante).');
      return;
    }

    const homeTrimmed = newHomeTeam.trim();
    const awayTrimmed = newAwayTeam.trim();

    // Regla 2: No Auto-partidos
    if (homeTrimmed.toLowerCase() === awayTrimmed.toLowerCase()) {
      showAlert('error', 'Error: Un equipo no puede jugar contra sí mismo.');
      return;
    }

    // Regla 1: Cero Duplicados
    const duplicateMatch = matches.find(m => 
      m.home_team.toLowerCase() === homeTrimmed.toLowerCase() || 
      m.away_team.toLowerCase() === homeTrimmed.toLowerCase() ||
      m.home_team.toLowerCase() === awayTrimmed.toLowerCase() ||
      m.away_team.toLowerCase() === awayTrimmed.toLowerCase()
    );

    if (duplicateMatch) {
      const isHomeDup = duplicateMatch.home_team.toLowerCase() === homeTrimmed.toLowerCase() || duplicateMatch.away_team.toLowerCase() === homeTrimmed.toLowerCase();
      const duplicateTeamName = isHomeDup ? homeTrimmed : awayTrimmed;
      showAlert('error', `Error: El equipo ${duplicateTeamName} ya está programado en esta quiniela (Partido P${matches.indexOf(duplicateMatch) + 1}).`);
      return;
    }

    const hTeam = teams.find(t => t.name.toLowerCase() === homeTrimmed.toLowerCase());
    const aTeam = teams.find(t => t.name.toLowerCase() === awayTrimmed.toLowerCase());

    try {
      setLoading(true);
      const { error } = await supabase
        .from('matches')
        .insert([{
          matchday_id: activeMatchday.id,
          home_team: homeTrimmed,
          away_team: awayTrimmed,
          home_team_id: hTeam ? hTeam.id : null,
          away_team_id: aTeam ? aTeam.id : null,
          is_reserve: isReserveMatch
        }]);

      if (error) throw error;

      setNewHomeTeam('');
      setNewAwayTeam('');
      setIsReserveMatch(false);
      loadMatches(activeMatchday.id);
    } catch (err: any) {
      console.error('Error insertando partido:', err);
      showAlert('error', `Error al agregar partido: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    const isWarn = activeMatchday?.status !== 'inactive';
    setConfirmConfig({
      title: 'Eliminar Partido',
      message: isWarn ? 'CUIDADO: Estás a punto de eliminar un partido de una quiniela que ya fue activada. Si los usuarios ya llenaron sus quinielas, esto podría causar problemas con sus pronósticos. ¿Estás absolutamente seguro de eliminarlo?' : '¿Seguro que deseas eliminar este partido?',
      onConfirm: async () => {
        try {
          setLoading(true);
          const { error } = await supabase.from('matches').delete().eq('id', matchId);
          if (error) throw error;
          setMatches(matches.filter(m => m.id !== matchId));
          showAlert('success', 'Partido eliminado correctamente.');
        } catch (err: any) {
          console.error('Error eliminando partido:', err);
          showAlert('error', 'Error al eliminar el partido.');
        } finally {
          setLoading(false);
          setConfirmConfig(null);
        }
      }
    });
  };

  // Calificar Resultados y Calcular Puntajes
  const handleSetMatchResult = async (matchId: string, result: 'L' | 'E' | 'V' | 'A') => {
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

      // Cargar todas las quinielas y predicciones de esta quiniela
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

      // Marcar quiniela como calificada
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

  // --- Exportación a PDF de Reporte Financiero Global ---
  const handleExportGlobalFinancialPDF = () => {
    if (financialMatchdays.length === 0) {
      showAlert('error', 'No hay quinielas registradas para exportar.');
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Encabezado
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42); // Slate 900
    doc.text(`Estado de Cuenta General - Ventas La Carmelita`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Temporada: ${activeSeason?.name || 'Liga MX'} | Generado: ${new Date().toLocaleString()}`, 14, 21);

    // Métricas calculadas
    const approvedPools = financialPools.filter(p => p.payment_status === 'approved');
    const pendingPools = financialPools.filter(p => p.payment_status === 'pending');
    
    const grossApproved = approvedPools.reduce((acc, curr) => acc + Number(curr.cost), 0);
    const grossPending = pendingPools.reduce((acc, curr) => acc + Number(curr.cost), 0);
    
    let prizePool = 0;
    const poolsByMatchday: Record<string, typeof approvedPools> = {};
    approvedPools.forEach(p => {
      if (!poolsByMatchday[p.matchday_id]) {
        poolsByMatchday[p.matchday_id] = [];
      }
      poolsByMatchday[p.matchday_id].push(p);
    });

    financialMatchdays.forEach(md => {
      const mdPools = poolsByMatchday[md.id] || [];
      const mdGross = mdPools.reduce((acc, curr) => acc + Number(curr.cost), 0);
      
      let mdPrize = 0;
      if (md.prize_type === 'fixed') {
        mdPrize = Number(md.fixed_prize_1st || 0);
      } else {
        const percent = md.prize_percentage !== undefined && md.prize_percentage !== null ? Number(md.prize_percentage) : 80;
        mdPrize = mdGross * (percent / 100);
      }
      prizePool += mdPrize;
    });

    const netHouse = grossApproved - prizePool;

    // Agregar resumen de métricas
    doc.autoTable({
      startY: 26,
      head: [['Metrica', 'Valor']],
      body: [
        ['Total de Quinielas Vendidas (Aprobadas)', approvedPools.length.toString()],
        ['Total de Quinielas Vendidas (Pendientes)', pendingPools.length.toString()],
        ['Monto Total Aprobado', `$${grossApproved.toFixed(2)} MXN`],
        ['Monto Total Pendiente', `$${grossPending.toFixed(2)} MXN`],
        [`Bolsa de Premios (Dinamico)`, `$${prizePool.toFixed(2)} MXN`],
        [`Ganancia de la Casa (Dinamico)`, `$${netHouse.toFixed(2)} MXN`]
      ],
      theme: 'striped',
      headStyles: { fillColor: [30, 94, 58], textColor: [255, 255, 255] },
      styles: { fontSize: 9 }
    });

    // Desglose por quiniela
    const matchdaysTableData = financialMatchdays.map(md => {
      const mdPools = financialPools.filter(p => p.matchday_id === md.id);
      const appPools = mdPools.filter(p => p.payment_status === 'approved');
      const penPools = mdPools.filter(p => p.payment_status === 'pending');
      const totalApp = appPools.reduce((acc, curr) => acc + Number(curr.cost), 0);
      const totalPen = penPools.reduce((acc, curr) => acc + Number(curr.cost), 0);
      
      let prize = 0;
      if (md.prize_type === 'fixed') {
        prize = Number(md.fixed_prize_1st || 0);
      } else {
        const percent = md.prize_percentage !== undefined && md.prize_percentage !== null ? Number(md.prize_percentage) : 80;
        prize = totalApp * (percent / 100);
      }
      
      return [
        `Quiniela ${md.number}`,
        md.status.toUpperCase(),
        `${mdPools.length} (${appPools.length} Aprob. / ${penPools.length} Pend.)`,
        `$${totalApp.toFixed(2)} MXN`,
        `$${totalPen.toFixed(2)} MXN`,
        `$${prize.toFixed(2)} MXN`
      ];
    });

    doc.setFontSize(14);
    doc.text('Desglose Financiero por Quiniela', 14, (doc as any).lastAutoTable.finalY + 12);

    doc.autoTable({
      startY: (doc as any).lastAutoTable.finalY + 16,
      head: [['Quiniela', 'Estado', 'Quinielas Vendidas', 'Ingreso Aprobado', 'Monto Pendiente', 'Bolsa Premios']],
      body: matchdaysTableData,
      theme: 'grid',
      headStyles: { fillColor: [30, 94, 58], textColor: [255, 255, 255] },
      styles: { fontSize: 9 }
    });

    doc.save(`Estado_Cuenta_Ventas_LaCarmelita_${new Date().toISOString().split('T')[0]}.pdf`);
    showAlert('success', 'Estado de cuenta general exportado con éxito.');
  };

  // --- Exportación a PDF de Estado de Cuenta Individual ---
  const handleExportParticipantStatementPDF = (participant: Participant, participantPools: Pool[]) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Encabezado
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42); // Slate 900
    doc.text(`Estado de Cuenta - Quinielas La Carmelita`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Participante: ${participant.name} (@${participant.alias})`, 14, 21);
    doc.text(`Telefono: ${participant.phone} | Generado: ${new Date().toLocaleString()}`, 14, 26);

    // Agrupar métricas
    const approved = participantPools.filter(p => p.payment_status === 'approved');
    const pending = participantPools.filter(p => p.payment_status === 'pending');
    const totalSpent = approved.reduce((acc, curr) => acc + Number(curr.cost), 0);
    const totalPending = pending.reduce((acc, curr) => acc + Number(curr.cost), 0);

    // Resumen de Métricas
    doc.autoTable({
      startY: 32,
      head: [['Metrica de Participante', 'Valor']],
      body: [
        ['Total Quinielas Compradas', participantPools.length.toString()],
        ['Quinielas Aprobadas', approved.length.toString()],
        ['Quinielas Pendientes de Validacion', pending.length.toString()],
        ['Monto Total Aprobado e Invertido', `$${totalSpent.toFixed(2)} MXN`],
        ['Monto Pendiente de Validar', `$${totalPending.toFixed(2)} MXN`]
      ],
      theme: 'striped',
      headStyles: { fillColor: [30, 94, 58], textColor: [255, 255, 255] },
      styles: { fontSize: 9 }
    });

    // Listado de Transacciones / Quinielas
    const transactionRows = participantPools.map(p => {
      const matchdayNum = financialMatchdays.find(m => m.id === p.matchday_id)?.number || 'N/A';
      return [
        `Quiniela ${matchdayNum}`,
        `$${Number(p.cost).toFixed(2)} MXN`,
        p.payment_status.toUpperCase(),
        p.score.toString(),
        new Date(p.created_at).toLocaleDateString()
      ];
    });

    doc.setFontSize(14);
    doc.text('Detalle de Compras y Quinielas Jugadas', 14, (doc as any).lastAutoTable.finalY + 12);

    doc.autoTable({
      startY: (doc as any).lastAutoTable.finalY + 16,
      head: [['Quiniela', 'Costo', 'Estado Pago', 'Puntuacion', 'Fecha de Registro']],
      body: transactionRows,
      theme: 'grid',
      headStyles: { fillColor: [30, 94, 58], textColor: [255, 255, 255] },
      styles: { fontSize: 9 }
    });

    doc.save(`Estado_Cuenta_LaCarmelita_${participant.alias}.pdf`);
    showAlert('success', `Estado de cuenta de @${participant.alias} exportado.`);
  };

  // --- Exportación a PDF de Pronósticos por Quiniela ---
  const handleExportMatchdayPredictionsPDF = async (matchdayId: string) => {
    try {
      setLoading(true);
      // 1. Obtener la quiniela específica
      const matchday = financialMatchdays.find(m => m.id === matchdayId);
      if (!matchday) {
        showAlert('error', 'No se encontró la quiniela especificada.');
        return;
      }

      // 2. Obtener partidos de esa quiniela
      const { data: mData, error: mErr } = await supabase
        .from('matches')
        .select('*')
        .eq('matchday_id', matchdayId)
        .order('created_at', { ascending: true });

      if (mErr) throw mErr;
      if (!mData || mData.length === 0) {
        showAlert('error', 'No hay partidos configurados para esta quiniela.');
        return;
      }

      // 3. Obtener quinielas aprobadas de esa quiniela
      const { data: pData, error: pErr } = await supabase
        .from('pools')
        .select(`
          *,
          participants (
            name,
            alias
          )
        `)
        .eq('matchday_id', matchdayId)
        .eq('payment_status', 'approved')
        .order('created_at', { ascending: true });

      if (pErr) throw pErr;

      const formattedPools = (pData || []).map(p => ({
        ...p,
        participant: Array.isArray(p.participants) ? p.participants[0] : p.participants
      })) as Pool[];

      // 4. Obtener predicciones asociadas
      let predictionsMap: Record<string, Record<string, string>> = {};
      if (formattedPools.length > 0) {
        const poolIds = formattedPools.map(p => p.id);
        const { data: predData, error: predErr } = await supabase
          .from('predictions')
          .select('*')
          .in('pool_id', poolIds);

        if (predErr) throw predErr;
        
        if (predData) {
          predData.forEach(p => {
            if (!predictionsMap[p.pool_id]) predictionsMap[p.pool_id] = {};
            predictionsMap[p.pool_id][p.match_id] = p.selection;
          });
        }
      }

      // Cargar logo de La Carmelita
      const logoBase64 = await getBase64ImageFromUrl('/LOGO LA CARMELITA.png');

      // Generar el PDF en vertical (portrait)
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Encabezado con Logo y texto en Negro
      if (logoBase64) {
        try {
          doc.addImage(logoBase64, 'PNG', 14, 10, 45, 18);
        } catch (e) {
          console.error("Error drawing logo:", e);
        }
      }

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(16); // Reducir un punto para que quepa bien al lado del logo
      doc.setTextColor(0, 0, 0); // Negro puro
      doc.text(`Lista de Participantes - Quinielas La Carmelita`, 63, 17);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60); // Gris muy oscuro
      doc.text(`Quiniela N°: ${matchday.number} | Fecha de Impresión: ${new Date().toLocaleString()}`, 63, 24);

      // Cabeceras de tabla: #, Participante, [vacío para partidos], Aciertos
      const headers = ['#', 'Participante', ...mData.map(() => '  '), 'Aciertos'];

      // Mapear filas
      const tableRows = formattedPools.map((p, pIdx) => {
        const name = p.participant?.name || 'Invitado';
        
        let aciertos = 0;
        const selections = mData.map(match => {
          const sel = predictionsMap[p.id]?.[match.id] || '-';
          if (match.result && sel === match.result) {
            aciertos++;
          }
          return sel;
        });

        return [pIdx + 1, name, ...selections, aciertos];
      });

      // Glosario de partidos al final
      const matchesLegend = mData.map((m, idx) => {
        return `P${idx + 1}: ${getTeamName(m, true)} vs ${getTeamName(m, false)}`;
      });

      doc.autoTable({
        startY: 34,
        head: [headers],
        body: tableRows,
        theme: 'grid',
        headStyles: {
          fillColor: [30, 94, 58], // Color verde de la marca
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          minCellHeight: 22 // Cabeceras de 22mm para acomodar texto vertical
        },
        alternateRowStyles: {
          fillColor: [240, 245, 242]
        },
        styles: {
          fontSize: 8,
          cellPadding: 2,
          halign: 'center'
        },
        columnStyles: {
          1: { halign: 'left', fontStyle: 'bold' } // Alinear nombre a la izquierda
        },
        didDrawCell: function(data) {
          if (data.section === 'head' && data.column.index >= 2 && data.column.index < 2 + mData.length) {
            const matchIdx = data.column.index - 2;
            const match = mData[matchIdx];
            const cell = data.cell;
            const centerX = cell.x + cell.width / 2;
            
            const homeCode = getTeamCode(match, true);
            const awayCode = getTeamCode(match, false);

            doc.setFontSize(7);
            doc.setTextColor(255, 255, 255);
            doc.setFont('Helvetica', 'bold');

            // Dibujar código Local vertical
            doc.text(homeCode, centerX, cell.y + 7, { angle: 270, align: 'center' });

            // Dibujar "vs"
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(6.5);
            doc.text('vs', centerX, cell.y + 12.5, { angle: 270, align: 'center' });

            // Dibujar código Visitante vertical
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(7);
            doc.text(awayCode, centerX, cell.y + 18, { angle: 270, align: 'center' });
          }
        },
        didParseCell: function(data) {
          if (data.section === 'body') {
            if (data.column.index >= 2 && data.column.index < 2 + mData.length) {
              const matchIdx = data.column.index - 2;
              const match = mData[matchIdx];
              const cellValue = data.cell.raw;
              if (match && match.result && cellValue === match.result) {
                data.cell.styles.fillColor = [253, 224, 71]; // Fondo amarillo
                data.cell.styles.textColor = [0, 0, 0];       // Texto negro
                data.cell.styles.fontStyle = 'bold';
              }
            }
            if (data.column.index === 2 + mData.length) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = [240, 245, 242]; // Fondo gris para columna Aciertos
            }
          }
        }
      });

      // Agregar leyenda de partidos al final
      let currentY = (doc as any).lastAutoTable.finalY + 10;
      // Verificar si cabe en la página actual, si no, agregar una nueva
      if (currentY > 180) {
        doc.addPage();
        currentY = 20;
      }
      doc.setFontSize(10);
      doc.setFont('Helvetica', 'bold');
      doc.text('Glosario de Partidos:', 14, currentY);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);

      currentY += 4;
      const mid = Math.ceil(matchesLegend.length / 2);
      for (let i = 0; i < matchesLegend.length; i++) {
        const xPos = i < mid ? 14 : 110;
        const yPos = currentY + (i % mid) * 4;
        doc.text(matchesLegend[i], xPos, yPos);
      }

      doc.save(`Quinielas_LaCarmelita_Quiniela_${matchday.number}_Participantes.pdf`);
      showAlert('success', `Matriz de pronósticos de la Quiniela ${matchday.number} descargada.`);
    } catch (err) {
      console.error('Error al exportar pronósticos de quiniela:', err);
      showAlert('error', 'Error al generar el PDF de pronósticos.');
    } finally {
      setLoading(false);
    }
  };

  // --- Exportación a PDF de Transparencia ---
  
  const handleExportMatchdayPDF = async (m: Matchday) => {
    setLoading(true);
    try {
      // Fetch matches
      const { data: matchesData } = await supabase.from('matches').select('*').eq('matchday_id', m.id).order('created_at', { ascending: true });
      const currentMatches = matchesData || [];
      if (currentMatches.length === 0) {
        showAlert('error', 'No hay partidos configurados para exportar.');
        return;
      }

      // Fetch pools and participants
      const { data: poolsData } = await supabase.from('pools').select('*, participants(name, alias, phone)').eq('matchday_id', m.id);
      let currentPools = (poolsData || []).map(p => ({
        ...p,
        participant: Array.isArray(p.participants) ? p.participants[0] : p.participants
      })) as Pool[];
      
      currentPools = currentPools.filter(p => p.payment_status === 'approved');

      // Fetch predictions
      const poolIds = currentPools.map(p => p.id);
      let currentPredictions: Record<string, Record<string, string>> = {};
      if (poolIds.length > 0) {
        const { data: predData } = await supabase.from('predictions').select('*').in('pool_id', poolIds);
        if (predData) {
          predData.forEach(p => {
            if (!currentPredictions[p.pool_id]) currentPredictions[p.pool_id] = {};
            currentPredictions[p.pool_id][p.match_id] = p.selection;
          });
        }
      }

      // Glosario de partidos al final
      const matchesLegend = currentMatches.map((m, idx) => {
        return `P${idx + 1}: ${getTeamName(m, true)} vs ${getTeamName(m, false)}`;
      });

      // Cargar logo de La Carmelita
      const logoBase64 = await getBase64ImageFromUrl('/LOGO LA CARMELITA.png');

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // Encabezado con Logo y texto en Negro
      if (logoBase64) {
        try {
          doc.addImage(logoBase64, 'PNG', 14, 10, 45, 18);
        } catch (e) {
          console.error("Error drawing logo:", e);
        }
      }

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(16); // Reducir un punto para que quepa bien al lado del logo
      doc.setTextColor(0, 0, 0); // Negro puro
      doc.text(`Lista de Participantes - Quinielas La Carmelita`, 63, 17);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60); // Gris muy oscuro
      doc.text(`Quiniela N°: ${m.number} | Fecha de Impresión: ${new Date().toLocaleString()}`, 63, 24);

      const headers = ['#', 'Participante', ...currentMatches.map(() => '  '), 'Aciertos'];
      const tableData = currentPools.map((pool, pIdx) => {
        const name = pool.participant?.name || 'Desconocido';
        const preds = currentPredictions[pool.id] || {};
        
        let aciertos = 0;
        const selections = currentMatches.map(match => {
          const sel = preds[match.id] || '-';
          if (match.result && sel === match.result) {
            aciertos++;
          }
          return sel;
        });

        return [pIdx + 1, name, ...selections, aciertos];
      });

      (doc as any).autoTable({
        startY: 34,
        head: [headers],
        body: tableData,
        theme: 'grid',
        headStyles: { 
          fillColor: [30, 94, 58], // Color verde de la marca
          textColor: [255, 255, 255], 
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          minCellHeight: 22 // Cabeceras de 22mm para acomodar texto vertical
        },
        styles: { 
          fontSize: 8, 
          cellPadding: 2,
          halign: 'center'
        },
        alternateRowStyles: { 
          fillColor: [240, 245, 242] 
        },
        columnStyles: { 
          1: { halign: 'left', fontStyle: 'bold' } 
        },
        didDrawCell: function(data) {
          if (data.section === 'head' && data.column.index >= 2 && data.column.index < 2 + currentMatches.length) {
            const matchIdx = data.column.index - 2;
            const match = currentMatches[matchIdx];
            const cell = data.cell;
            const centerX = cell.x + cell.width / 2;
            
            const homeCode = getTeamCode(match, true);
            const awayCode = getTeamCode(match, false);

            doc.setFontSize(7);
            doc.setTextColor(255, 255, 255);
            doc.setFont('Helvetica', 'bold');

            // Dibujar código Local vertical
            doc.text(homeCode, centerX, cell.y + 7, { angle: 270, align: 'center' });

            // Dibujar "vs"
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(6.5);
            doc.text('vs', centerX, cell.y + 12.5, { angle: 270, align: 'center' });

            // Dibujar código Visitante vertical
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(7);
            doc.text(awayCode, centerX, cell.y + 18, { angle: 270, align: 'center' });
          }
        },
        didParseCell: function(data) {
          if (data.section === 'body') {
            if (data.column.index >= 2 && data.column.index < 2 + currentMatches.length) {
              const matchIdx = data.column.index - 2;
              const match = currentMatches[matchIdx];
              const cellValue = data.cell.raw;
              if (match && match.result && cellValue === match.result) {
                data.cell.styles.fillColor = [253, 224, 71]; // Fondo amarillo
                data.cell.styles.textColor = [0, 0, 0];       // Texto negro
                data.cell.styles.fontStyle = 'bold';
              }
            }
            if (data.column.index === 2 + currentMatches.length) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = [240, 245, 242]; // Fondo gris para columna Aciertos
            }
          }
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
        const xPos = i < mid ? 14 : 110;
        const yPos = currentY + (i % mid) * 4;
        doc.text(matchesLegend[i], xPos, yPos);
      }

      doc.save(`Quinielas_LaCarmelita_Quiniela_${m.number}_Participantes.pdf`);
      showAlert('success', 'PDF generado correctamente.');
    } catch (err) {
      console.error(err);
      showAlert('error', 'Error al exportar PDF.');
    } finally {
      setLoading(false);
    }
  };


  const handleExportPDF = async () => {
    if (!activeMatchday || matches.length === 0) {
      showAlert('error', 'No hay partidos configurados para exportar.');
      return;
    }

    setLoading(true);
    try {
      // Cargar logo de La Carmelita
      const logoBase64 = await getBase64ImageFromUrl('/LOGO LA CARMELITA.png');

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Encabezado con Logo y texto en Negro
      if (logoBase64) {
        try {
          doc.addImage(logoBase64, 'PNG', 14, 10, 45, 18);
        } catch (e) {
          console.error("Error drawing logo:", e);
        }
      }

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(16); // Reducir un punto para que quepa bien al lado del logo
      doc.setTextColor(0, 0, 0); // Negro puro
      doc.text(`Lista de Participantes - Quinielas La Carmelita`, 63, 17);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60); // Gris muy oscuro
      doc.text(`Quiniela N°: ${activeMatchday.number} | Fecha de Impresión: ${new Date().toLocaleString()}`, 63, 24);

      // Configurar columnas de la matriz
      const headers = ['#', 'Participante', ...matches.map(() => '  '), 'Aciertos'];

      // Mapear filas de datos
      const tableData = allPoolsForMatchday
        .filter(p => p.payment_status === 'approved') // Solo quinielas validadas
        .map((p, pIdx) => {
          const participantName = p.participant?.name || 'Invitado';
          
          let aciertos = 0;
          const gameSelections = matches.map(match => {
            const sel = predictionsByPool[p.id]?.[match.id] || '-';
            if (match.result && sel === match.result) {
              aciertos++;
            }
            return sel;
          });

          return [
            pIdx + 1,
            participantName,
            ...gameSelections,
            aciertos
          ];
        });

      // Agregar leyenda de partidos al pie de página o inicio del PDF para claridad
      const matchesLegend = matches.map((m, idx) => {
        return `P${idx + 1}: ${getTeamName(m, true)} vs ${getTeamName(m, false)}`;
      });

      // Renderizar tabla con autoTable
      doc.autoTable({
        startY: 34,
        head: [headers],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [30, 94, 58], // Color verde de la marca
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          minCellHeight: 22 // Cabeceras de 22mm para acomodar texto vertical
        },
        alternateRowStyles: {
          fillColor: [240, 245, 242] // light grey
        },
        styles: {
          fontSize: 8,
          cellPadding: 2,
          halign: 'center'
        },
        columnStyles: {
          1: { halign: 'left', fontStyle: 'bold' } 
        },
        didDrawCell: function(data) {
          if (data.section === 'head' && data.column.index >= 2 && data.column.index < 2 + matches.length) {
            const matchIdx = data.column.index - 2;
            const match = matches[matchIdx];
            const cell = data.cell;
            const centerX = cell.x + cell.width / 2;
            
            const homeCode = getTeamCode(match, true);
            const awayCode = getTeamCode(match, false);

            doc.setFontSize(7);
            doc.setTextColor(255, 255, 255);
            doc.setFont('Helvetica', 'bold');

            // Dibujar código Local vertical
            doc.text(homeCode, centerX, cell.y + 7, { angle: 270, align: 'center' });

            // Dibujar "vs"
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(6.5);
            doc.text('vs', centerX, cell.y + 12.5, { angle: 270, align: 'center' });

            // Dibujar código Visitante vertical
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(7);
            doc.text(awayCode, centerX, cell.y + 18, { angle: 270, align: 'center' });
          }
        },
        didParseCell: function(data) {
          if (data.section === 'body') {
            if (data.column.index >= 2 && data.column.index < 2 + matches.length) {
              const matchIdx = data.column.index - 2;
              const match = matches[matchIdx];
              const cellValue = data.cell.raw;
              if (match && match.result && cellValue === match.result) {
                data.cell.styles.fillColor = [253, 224, 71]; // Fondo amarillo
                data.cell.styles.textColor = [0, 0, 0];       // Texto negro
                data.cell.styles.fontStyle = 'bold';
              }
            }
            if (data.column.index === 2 + matches.length) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = [240, 245, 242]; // Fondo gris para columna Aciertos
            }
          }
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
        const xPos = i < mid ? 14 : 110;
        const yPos = currentY + (i % mid) * 4;
        doc.text(matchesLegend[i], xPos, yPos);
      }

      doc.save(`Quinielas_LaCarmelita_Quiniela_${activeMatchday.number}_Participantes.pdf`);
      showAlert('success', 'PDF de transparencia descargado con éxito.');
    } catch (err) {
      console.error('Error al exportar PDF:', err);
      showAlert('error', 'Error al exportar PDF.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSocialFlyer = async (matchday: Matchday) => {
    setLoading(true);
    try {
      // 1. Obtener partidos de la quiniela
      const { data: matchesData, error: mErr } = await supabase
        .from('matches')
        .select('*')
        .eq('matchday_id', matchday.id)
        .order('created_at', { ascending: true });

      if (mErr) throw mErr;
      const currentMatches = matchesData || [];
      if (currentMatches.length === 0) {
        showAlert('error', 'No hay partidos cargados para generar el flyer.');
        return;
      }

      // 2. Pre-cargar imágenes asíncronas para el Canvas
      const getTeamLogoUrl = (match: Match, isHome: boolean) => {
        const teamId = isHome ? match.home_team_id : match.away_team_id;
        const teamNameLegacy = isHome ? match.home_team : match.away_team;
        if (teamId) {
          const t = teams.find(t => t.id === teamId);
          if (t) return t.logo_url;
        }
        const tByName = teams.find(t => t.name === teamNameLegacy);
        return tByName?.logo_url;
      };

      const loadImage = (url: string): Promise<HTMLImageElement | null> => {
        return new Promise((resolve) => {
          if (!url) {
            resolve(null);
            return;
          }
          const img = new Image();
          img.setAttribute('crossOrigin', 'anonymous');
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = url.startsWith('http') ? url : `${window.location.origin}${url}`;
        });
      };

      // Cargar banner o elementos
      const mascotImg = await loadImage('/PERICO.png');
      const mainLogoImg = await loadImage('/LOGO LA CARMELITA.png');

      // Cargar todos los logos de los partidos
      const matchLogos: Record<string, { home: HTMLImageElement | null, away: HTMLImageElement | null }> = {};
      await Promise.all(currentMatches.map(async (match) => {
        const homeUrl = getTeamLogoUrl(match, true);
        const awayUrl = getTeamLogoUrl(match, false);
        const [homeImg, awayImg] = await Promise.all([
          homeUrl ? loadImage(homeUrl) : Promise.resolve(null),
          awayUrl ? loadImage(awayUrl) : Promise.resolve(null)
        ]);
        matchLogos[match.id] = { home: homeImg, away: awayImg };
      }));

      // 3. Crear canvas off-screen
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1350;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No se pudo inicializar el Canvas.');

      // Fondo blanco
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 1080, 1350);

      // Cabecera Verde
      const gradient = ctx.createLinearGradient(0, 0, 1080, 200);
      gradient.addColorStop(0, '#1e5e3a');
      gradient.addColorStop(1, '#15803d');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1080, 200);

      // Dibujar mascota (Perico)
      if (mascotImg) {
        const aspect = mascotImg.width / mascotImg.height;
        const h = 150;
        const w = h * aspect;
        ctx.drawImage(mascotImg, 50, 25, w, h);
      }

      // Dibujar Logo La Carmelita centrado
      if (mainLogoImg) {
        const aspect = mainLogoImg.width / mainLogoImg.height;
        const h = 120;
        const w = h * aspect;
        const xPos = 540 - w / 2;
        ctx.drawImage(mainLogoImg, xPos, 40, w, h);
      }

      // Texto de Cierre en Rojo
      ctx.fillStyle = '#dc2626'; // Rojo
      ctx.textAlign = 'center';
      ctx.font = 'bold 44px Helvetica';
      
      const formatDeadlineSpanish = (dateStr: string) => {
        const d = new Date(dateStr);
        const days = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
        const dayName = days[d.getDay()];
        let hours = d.getHours();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        const minutes = d.getMinutes().toString().padStart(2, '0');
        return `SE CIERRA EL ${dayName} A LAS ${hours}:${minutes} ${ampm}`;
      };

      const deadlineText = formatDeadlineSpanish(matchday.deadline);
      ctx.fillText(deadlineText, 540, 260);

      // Dibujar Partidos
      const numMatches = currentMatches.length;
      const startY = 320;
      const endY = 1040;
      const totalHeight = endY - startY;
      const rowHeight = numMatches > 10 ? totalHeight / numMatches : 72;
      const fontSizeName = numMatches > 10 ? 25 : 30;
      const logoSize = numMatches > 10 ? 34 : 42;

      currentMatches.forEach((match, idx) => {
        const yPos = startY + idx * rowHeight;
        
        // Centrar verticalmente en la fila
        const textY = yPos + rowHeight / 2 + 8;
        const logoY = yPos + rowHeight / 2 - logoSize / 2;

        const homeName = getTeamName(match, true);
        const awayName = getTeamName(match, false);
        const homeLogo = matchLogos[match.id]?.home;
        const awayLogo = matchLogos[match.id]?.away;

        // 1. Nombre Local (Alineado derecha, a x=410)
        ctx.textAlign = 'right';
        ctx.fillStyle = '#1e293b';
        ctx.font = `bold ${fontSizeName}px Helvetica`;
        ctx.fillText(homeName, 410, textY);

        // 2. Logo Local (x=430)
        if (homeLogo) {
          ctx.drawImage(homeLogo, 430, logoY, logoSize, logoSize);
        } else {
          // Fallback círculo
          ctx.fillStyle = '#3b82f6';
          ctx.beginPath();
          ctx.arc(430 + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, 2 * Math.PI);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.font = `bold ${fontSizeName * 0.6}px Helvetica`;
          ctx.fillText(homeName.substring(0, 1).toUpperCase(), 430 + logoSize / 2, logoY + logoSize / 2 + 6);
        }

        // 3. VS (x=540)
        ctx.textAlign = 'center';
        ctx.fillStyle = '#dc2626';
        ctx.font = `bold ${fontSizeName * 0.9}px Helvetica`;
        ctx.fillText('VS', 540, textY);

        // 4. Logo Visitante (x=610)
        if (awayLogo) {
          ctx.drawImage(awayLogo, 610, logoY, logoSize, logoSize);
        } else {
          // Fallback círculo
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(610 + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, 2 * Math.PI);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.font = `bold ${fontSizeName * 0.6}px Helvetica`;
          ctx.fillText(awayName.substring(0, 1).toUpperCase(), 610 + logoSize / 2, logoY + logoSize / 2 + 6);
        }

        // 5. Nombre Visitante (Alineado izquierda, a x=670)
        ctx.textAlign = 'left';
        ctx.fillStyle = '#1e293b';
        ctx.font = `bold ${fontSizeName}px Helvetica`;
        ctx.fillText(awayName, 670, textY);
      });

      // Sección WhatsApp
      ctx.fillStyle = '#dc2626';
      ctx.textAlign = 'center';
      ctx.font = 'bold 28px Helvetica';
      ctx.fillText('ENVÍA TUS QUINIELAS Y PAGO AL:', 540, 1110);

      // Icono WhatsApp y Número
      const rawPhone = whatsappConfig || '3122440708';
      const phoneText = rawPhone.length === 10 
        ? rawPhone.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3') 
        : rawPhone;
      
      // Dibujar círculo de WhatsApp
      ctx.fillStyle = '#25D366';
      ctx.beginPath();
      ctx.arc(280, 1170, 32, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '32px Helvetica';
      ctx.textAlign = 'center';
      ctx.fillText('📞', 280, 1181);

      // Escribir número
      ctx.fillStyle = '#111827';
      ctx.textAlign = 'left';
      ctx.font = 'bold 64px Helvetica';
      ctx.fillText(phoneText, 330, 1190);

      // Caja de Costo y Nombre (Margen inferior)
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 3;
      ctx.strokeRect(50, 1225, 980, 95);

      // Línea divisoria de la caja
      ctx.beginPath();
      ctx.moveTo(400, 1225);
      ctx.lineTo(400, 1320);
      ctx.stroke();

      // Texto de Costo (Izquierda)
      ctx.fillStyle = '#dc2626';
      ctx.textAlign = 'left';
      ctx.font = 'bold 32px Helvetica';
      ctx.fillText(`COSTO: $${matchday.price_per_entry || 25}`, 70, 1265);
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 18px Helvetica';
      ctx.fillText('MÍNIMO 2 QUINIELAS', 70, 1298);

      // Texto de Nombre (Derecha)
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 28px Helvetica';
      ctx.fillText('NOMBRE:', 420, 1282);

      // Caja blanca para escribir nombre
      ctx.strokeStyle = '#cbd5e1';
      ctx.strokeRect(570, 1245, 430, 55);

      // Descargar Imagen
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Flyer_LaCarmelita_Quiniela_${matchday.number}.png`;
      link.href = dataUrl;
      link.click();

      showAlert('success', 'Imagen para redes sociales generada y descargada.');
    } catch (e) {
      console.error(e);
      showAlert('error', 'Error al generar la imagen para redes sociales.');
    } finally {
      setLoading(false);
    }
  };

  // Equipos disponibles para agregar a la quiniela
  const unusedTeams = teams.filter(t => !matches.some(m => m.home_team_id === t.id || m.away_team_id === t.id || m.home_team === t.name || m.away_team === t.name));
  const availableHomeTeams = unusedTeams.filter(t => t.name !== newAwayTeam);
  const availableAwayTeams = unusedTeams.filter(t => t.name !== newHomeTeam);

  // Matches ordenados: orden de captura (como vienen de la DB), EXTRA siempre al final
  const matchesWithIndex = matches.map((m, i) => ({ ...m, _originalIndex: i }));
  const sortedMatches = matchesWithIndex.sort((a, b) => {
    // El EXTRA siempre al final
    if (a.is_reserve && !b.is_reserve) return 1;
    if (!a.is_reserve && b.is_reserve) return -1;
    return a._originalIndex - b._originalIndex;
  });

  return (
    <div className="app-container">
      {/* Alerta Global (Toast) */}
      <div className="toast-container">
        {message && (
          <div className={`toast toast-${message.type}`} onClick={() => setMessage(null)}>
            {message.type === 'success' ? (
              <CheckCircle size={20} color="var(--success)" style={{ flexShrink: 0 }} />
            ) : (
              <AlertCircle size={20} color="var(--danger)" style={{ flexShrink: 0 }} />
            )}
            <span style={{ fontSize: '0.9rem', fontWeight: '500', flex: 1 }}>{message.text}</span>
            <X size={16} style={{ cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }} onClick={(e) => { e.stopPropagation(); setMessage(null); }} />
          </div>
        )}
      </div>

      {/* Confirmación Global */}
      <Modal 
        isOpen={!!confirmConfig} 
        onClose={() => {
          confirmConfig?.onCancel?.();
          setConfirmConfig(null);
        }} 
        title={confirmConfig?.title || 'Confirmar'}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '20px' }}>
          <AlertCircle size={24} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <span style={{ whiteSpace: 'pre-line' }}>{confirmConfig?.message}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={() => {
            confirmConfig?.onCancel?.();
            setConfirmConfig(null);
          }}>
            Cancelar
          </button>
          <button 
            className="btn btn-primary" 
            style={confirmConfig?.confirmColor ? { backgroundColor: confirmConfig.confirmColor, borderColor: confirmConfig.confirmColor, color: '#ffffff' } : {}}
            onClick={() => confirmConfig?.onConfirm()}
          >
            {confirmConfig?.confirmText || 'Confirmar'}
          </button>
        </div>
      </Modal>

      {/* Backdrop de Sidebar (Móvil) */}
      {currentUser && activeTab !== 'coming-soon' && isSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      {/* Sidebar Lateral */}
      {currentUser && activeTab !== 'coming-soon' && (
        <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <img 
              src="/LOGO LA CARMELITA.png" 
              alt="Logo La Carmelita" 
              style={{ height: '36px', objectFit: 'contain', borderRadius: '4px' }} 
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <button className="sidebar-close-btn" onClick={() => setIsSidebarOpen(false)}>
              <X size={20} />
            </button>
          </div>

          <div className="sidebar-user">
            <div className="sidebar-user-badge">
              <User size={14} />
              <span>{currentUser.alias}</span>
            </div>
            {currentUser.role === 'admin' && <span className="admin-badge">Admin</span>}
          </div>

          <nav className="sidebar-menu">
            {isAdmin ? (
              <>
                <button 
                  className={`sidebar-menu-item ${activeTab === 'admin-payments' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('admin-payments'); setIsSidebarOpen(false); }}
                >
                  <DollarSign size={18} />
                  <span>Validar Pagos</span>
                </button>
                <button 
                  className={`sidebar-menu-item ${activeTab === 'admin-history' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('admin-history'); setIsSidebarOpen(false); }}
                >
                  <Clock size={18} />
                  <span>Historial de Pagos</span>
                </button>
                <button 
                  className={`sidebar-menu-item ${activeTab === 'admin-matchdays' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('admin-matchdays'); setIsSidebarOpen(false); }}
                >
                  <Calendar size={18} />
                  <span>Quinielas</span>
                </button>
                <button 
                  className={`sidebar-menu-item ${activeTab === 'admin-leagues' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('admin-leagues'); setIsSidebarOpen(false); }}
                >
                  <Globe size={18} />
                  <span>Ligas</span>
                </button>
                <button 
                  className={`sidebar-menu-item ${activeTab === 'admin-teams' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('admin-teams'); setIsSidebarOpen(false); }}
                >
                  <Shield size={18} />
                  <span>Equipos</span>
                </button>
                <button 
                  className={`sidebar-menu-item ${activeTab === 'admin-bank' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('admin-bank'); setIsSidebarOpen(false); }}
                >
                  <DollarSign size={18} />
                  <span>Cuentas Bancarias</span>
                </button>
                <button 
                  className={`sidebar-menu-item ${activeTab === 'admin-participants' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('admin-participants'); setIsSidebarOpen(false); }}
                >
                  <Users size={18} />
                  <span>Participantes</span>
                </button>
                <button 
                  className={`sidebar-menu-item ${activeTab === 'admin-dashboard' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('admin-dashboard'); setIsSidebarOpen(false); }}
                >
                  <TrendingUp size={18} />
                  <span>Ventas</span>
                </button>
              </>
            ) : (
              <>
                <button 
                  className={`sidebar-menu-item ${activeTab === 'predictions' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('predictions'); setIsSidebarOpen(false); }}
                >
                  <Trophy size={18} />
                  <span>Quiniela</span>
                </button>
                <button 
                  className={`sidebar-menu-item ${activeTab === 'my-pools' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('my-pools'); setIsSidebarOpen(false); }}
                >
                  <User size={18} />
                  <span>Mis Apuestas</span>
                </button>
                <button 
                  className={`sidebar-menu-item ${activeTab === 'leaderboard' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('leaderboard'); setIsSidebarOpen(false); }}
                >
                  <Trophy size={18} style={{ color: 'var(--accent)' }} />
                  <span>Posiciones</span>
                </button>
              </>
            )}
          </nav>

          <div className="sidebar-footer">
            <button className="sidebar-logout-btn" onClick={handleLogout}>
              <LogOut size={18} />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </aside>
      )}

      {/* Contenedor del Contenido Principal */}
      <div className="app-content-wrapper">
        {/* Cabecera Móvil */}
        {currentUser && activeTab !== 'coming-soon' && (
          <header className="mobile-header">
            <button className="hamburger-btn" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <img 
              src="/LOGO LA CARMELITA.png" 
              alt="Logo La Carmelita" 
              style={{ height: '30px', objectFit: 'contain', borderRadius: '4px' }} 
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div style={{ width: '24px' }}></div>
          </header>
        )}

        {/* Cabecera Clásica para Login y Prelanzamiento */}
        {(!currentUser || activeTab === 'coming-soon') && (
          <header className="app-header">
            <div 
              className="logo-container" 
              style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
            >
              <img 
                src="/LOGO LA CARMELITA.png" 
                alt="Logo La Carmelita" 
                style={{ height: '36px', objectFit: 'contain', borderRadius: '4px' }} 
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            <button 
              className="btn btn-primary animate-pulse-scale"
              onClick={() => {
                const lastRef = localStorage.getItem('lastReferenceCode');
                setActiveTab('verify-payment');
                if (lastRef) {
                  setVerifyCode(lastRef);
                  setTimeout(() => handleVerifySearch(undefined, lastRef), 100);
                } else {
                  setVerifyCode('');
                  setVerifyResults([]);
                }
              }}
              style={{ 
                background: '#128C7E', 
                color: 'white', 
                display: 'none', // Oculto temporalmente a petición
                alignItems: 'center', 
                gap: '8px', 
                padding: '8px 16px',
                fontSize: '0.9rem',
                border: 'none',
                cursor: 'pointer',
                borderRadius: 'var(--radius-sm)',
                width: 'max-content'
              }}
            >
              <FileText size={18} />
              {localStorage.getItem('lastReferenceCode') ? `Subir Comprobante (${localStorage.getItem('lastReferenceCode')})` : 'Enviar Recibos de Pago'}
            </button>
          </header>
        )}

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
      <main style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 80px)' }}>

        {/* 1. REGISTRO Y LOGIN (Pestaña "login") */}
        {activeTab === 'login' && !currentUser && (
          <div className="card" style={{ maxWidth: '400px', margin: '0 auto', width: '100%' }}>
            {/* Formulario Login Admin */}
              <form onSubmit={handleAdminLogin}>
                <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Shield size={20} color="var(--primary)" /> Acceso del Administrador
                </h3>
                <div className="form-group">
                  <label>Usuario</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Ej. admin" 
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
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                  <button 
                    type="button" 
                    onClick={() => setActiveTab('predictions')}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.9rem' }}
                  >
                    ← Regresar al sitio
                  </button>
                </div>
              </form>
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
              {/* Badge Elegante con Animación de Pulso */}
              <div 
                className="animate-pulse-glow"
                style={{
                  display: 'inline-block',
                  padding: '6px 16px',
                  borderRadius: 'var(--radius-full)',
                  background: 'rgba(224, 184, 40, 0.1)',
                  border: '1px solid var(--primary)',
                  color: 'var(--primary)',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  marginBottom: '24px'
                }}
              >
                Próximamente
              </div>

              {/* Logo Principal Vertical con Animación de Flotado */}
              <img 
                src="/LOGO LA CARMELITA VERTICAL.png" 
                alt="Logo La Carmelita Vertical" 
                className="animate-float"
                style={{ 
                  width: '160px', 
                  height: 'auto', 
                  maxHeight: '160px',
                  objectFit: 'contain',
                  margin: '0 auto 24px',
                  display: 'block'
                }} 
              />
              
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '480px', margin: '0 auto 30px', lineHeight: '1.6', textAlign: 'center' }}>
                ¡Demuestra tus conocimientos y <strong style={{ color: 'var(--primary)' }}>gana espectaculares premios en efectivo</strong> en cada quiniela! ¡Estamos preparando la cancha para brindarte la mejor experiencia de juego! Regístrate para <strong style={{ color: 'var(--primary)' }}>asegurar tu lugar en nuestra comunidad</strong> y no pierdas la oportunidad de participar.
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
                <button type="submit" className="btn btn-primary" style={{ marginTop: '15px' }}>
                  Unirme a la Comunidad
                </button>
              </form>
            </div>
          </div>
        )}

        {/* 2. LLENADO DE QUINIELAS (Pestaña "predictions") */}
        {activeTab === 'predictions' && (
          <div>
            {activeMatchday && activeMatchday.status !== 'inactive' ? (
              <div>
                {!showSuccessScreen && (
                  <div className="card" style={{ background: 'linear-gradient(135deg, var(--bg-card), rgba(16, 185, 129, 0.05))' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: '700' }}>Temporada Activa</span>
                      <h2>Quiniela N° {activeMatchday.number}</h2>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Costo de entrada</span>
                      <span style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--accent)' }}>${activeMatchday.price_per_entry} MXN</span>
                    </div>
                  </div>
                  
                  <div style={{ marginTop: '14px' }}>
                    {new Date(activeMatchday.deadline) < now ? (
                      <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: 'var(--danger)', fontSize: '0.9rem', fontWeight: 'bold' }}>
                          ⚠️ Quiniela cerrada para registro de apuestas.
                        </span>
                      </div>
                    ) : (
                      <div style={{ 
                        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', 
                        background: 'rgba(0,0,0,0.4)', padding: '16px', borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                        borderLeft: `6px solid ${
                          (new Date(activeMatchday.deadline).getTime() - now.getTime()) / (1000 * 60 * 60) <= 24 ? 'var(--danger)' :
                          (new Date(activeMatchday.deadline).getTime() - now.getTime()) / (1000 * 60 * 60) <= 72 ? 'var(--accent)' : 'var(--primary)'
                        }`
                      }}>
                        <Clock size={28} color={
                          (new Date(activeMatchday.deadline).getTime() - now.getTime()) / (1000 * 60 * 60) <= 24 ? 'var(--danger)' :
                          (new Date(activeMatchday.deadline).getTime() - now.getTime()) / (1000 * 60 * 60) <= 72 ? 'var(--accent)' : 'var(--primary)'
                        } />
                        <span style={{ 
                          fontSize: '1.25rem', fontWeight: '800', letterSpacing: '1px',
                          color: (new Date(activeMatchday.deadline).getTime() - now.getTime()) / (1000 * 60 * 60) <= 24 ? 'var(--danger)' :
                                 (new Date(activeMatchday.deadline).getTime() - now.getTime()) / (1000 * 60 * 60) <= 72 ? 'var(--accent)' : 'var(--primary)'
                        }}>
                          Cierra en: {(() => {
                            const diff = new Date(activeMatchday.deadline).getTime() - now.getTime();
                            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                            const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
                            const mins = Math.floor((diff / 1000 / 60) % 60);
                            if (days > 0) return `${days}d ${hours}h ${mins}m`;
                            if (hours > 0) return `${hours}h ${mins}m`;
                            return `${mins}m`;
                          })()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                )}


                
                {showSuccessScreen ? (
                  <div className="card" style={{ textAlign: 'center', padding: '15px' }}>
                    <CheckSquare size={48} color="var(--primary)" style={{ margin: '0 auto 16px' }} />
                    <h3>¡Enhorabuena!</h3>
                    
                    <div style={{ margin: '24px auto', padding: '16px 24px', background: 'rgba(0, 0, 0, 0.4)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255, 255, 255, 0.1)', width: '100%', maxWidth: '100%' }}>
                      <p style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)' }}>Tu Código de Referencia:</p>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                        <h2 style={{ margin: 0, color: 'var(--primary)', letterSpacing: '2px', fontSize: '2rem', whiteSpace: 'nowrap' }}>{cartReferenceId}</h2>
                        
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(cartReferenceId);
                            showAlert('success', 'Código copiado al portapapeles');
                          }}
                          className="btn"
                          style={{ padding: '8px 16px', fontSize: '0.9rem', background: 'rgba(234, 179, 8, 0.1)', color: 'var(--primary)', border: '1px solid var(--primary)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                        >
                          <Copy size={16} />
                          Copiar Código
                        </button>
                        <p style={{ fontSize: '0.85rem', color: 'var(--accent)', marginTop: '0', marginBottom: 0, fontWeight: 'bold' }}>* Agrega este código en el concepto de tu transferencia</p>
                      </div>
                    </div>

                    <p style={{ color: 'var(--text-secondary)', marginBottom: '5px', marginTop: '10px' }}>
                      A continuación, realiza tu depósito o transferencia.
                    </p>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                      Solicita la información para realizar tu pago al siguiente número:
                    </p>

                    <button 
                      onClick={() => {
                        const targetPhone = whatsappConfig ? whatsappConfig.replace(/\D/g, '') : '523122440708';
                        const waUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(successMessageText)}`;
                        window.open(waUrl, '_blank');
                      }}
                      className="btn"
                      style={{ padding: '12px 24px', fontSize: '1rem', background: '#25D366', color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: '0 auto 20px auto', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-md)', width: '100%', maxWidth: '400px', fontWeight: 'bold' }}
                    >
                      <MessageCircle size={20} />
                      Enviar mis datos a WhatsApp
                    </button>

                    <button 
                      onClick={() => {
                        setVerifyCode(cartReferenceId);
                        localStorage.setItem('lastReferenceCode', cartReferenceId);
                        setShowSuccessScreen(false);
                        setActiveTab('verify-payment');
                        setTimeout(() => handleVerifySearch(undefined, cartReferenceId), 100);
                      }}
                      className="btn"
                      style={{ padding: '12px 24px', fontSize: '1rem', background: '#128C7E', color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: '0 auto 20px auto', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-md)', width: '100%', maxWidth: '400px', fontWeight: 'bold' }}
                    >
                      <FileText size={20} />
                      Adjuntar Comprobante
                    </button>
                    <div style={{ marginTop: '50px' }}>
                      <button className="btn btn-primary" onClick={() => { setShowSuccessScreen(false); setActiveTab('predictions'); }} style={{ width: '100%', maxWidth: '400px', margin: '0 auto', display: 'block', padding: '12px' }}>NUEVA QUINIELA</button>
                    </div>
                  </div>
                ) : matches.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
                    No hay partidos cargados para esta quiniela.
                  </p>
                ) : (
                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    {/* Sección Principal de Partidos (70%) */}
                    <div style={{ flex: '1 1 600px' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                        <button 
                          className="btn btn-secondary" 
                          onClick={handleRandomFill}
                          style={{ 
                            background: 'var(--accent)', 
                            color: '#000', 
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M8 8h.01"></path><path d="M16 8h.01"></path><path d="M8 16h.01"></path><path d="M16 16h.01"></path><path d="M12 12h.01"></path></svg>
                          Llenado al AZAR
                        </button>
                      </div>
                      {/* Generar Partidos Agrupados por Liga */}
                      {(() => {
                        const getLeagueName = (leagueId?: string) => {
                          if (!leagueId) return 'Otras Ligas';
                          return leagues.find(l => l.id === leagueId)?.name || 'Otras Ligas';
                        };

                        const mainMatches = matches.filter(m => !m.is_reserve);
                        const reserveMatches = matches.filter(m => m.is_reserve);

                        let globalIdx = 0;
                        
                        return (
                          <>
                            <div style={{ marginBottom: '20px' }}>
                              {mainMatches.map(match => {
                                globalIdx++;
                                const idx = globalIdx - 1;
                                return (
                                    <div className="match-card" key={match.id}>
                                      {/* Indicador de partido */}
                                      <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '4px', alignItems: 'center', zIndex: 10 }}>
                                        <span style={{ background: 'var(--border-color)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.65rem', fontWeight: '800' }}>
                                          P{idx + 1}
                                        </span>
                                      </div>
              
                                      {/* Local */}
                                      {/* Local L */}
                                      <div className="lev-group">
                                        <button className={`lev-btn ${currentSelections[match.id] === 'L' ? 'selected-l' : ''}`} onClick={() => handleSelectPrediction(match.id, 'L')}>L</button>
                                      </div>
                                      
                                      {/* Local Info */}
                                      <div className="team-info" style={{ width: '100%' }}>
                                        {getTeamLogo(match, true) ? (
                                          <img src={getTeamLogo(match, true)} alt="Home" style={{ width: 32, height: 32, objectFit: 'contain' }} />
                                        ) : (
                                          <div className="team-logo-fallback">{getTeamName(match, true).substring(0, 2).toUpperCase()}</div>
                                        )}
                                        <span className="team-name">{getTeamName(match, true)}</span>
                                      </div>
              
                                      {/* Controles de Apuesta E */}
                                      <div className="lev-group">
                                        <button className={`lev-btn ${currentSelections[match.id] === 'E' ? 'selected-e' : ''}`} onClick={() => handleSelectPrediction(match.id, 'E')}>E</button>
                                      </div>
              
                                      {/* Visitante Info */}
                                      <div className="team-info" style={{ width: '100%' }}>
                                        {getTeamLogo(match, false) ? (
                                          <img src={getTeamLogo(match, false)} alt="Away" style={{ width: 32, height: 32, objectFit: 'contain' }} />
                                        ) : (
                                          <div className="team-logo-fallback">{getTeamName(match, false).substring(0, 2).toUpperCase()}</div>
                                        )}
                                        <span className="team-name">{getTeamName(match, false)}</span>
                                      </div>

                                      {/* Visitante V */}
                                      <div className="lev-group">
                                        <button className={`lev-btn ${currentSelections[match.id] === 'V' ? 'selected-v' : ''}`} onClick={() => handleSelectPrediction(match.id, 'V')}>V</button>
                                      </div>
                                    </div>
                                  )
                                })}
                            </div>

                            {reserveMatches.length > 0 && (
                              <div style={{ marginTop: '30px' }}>
                                <div style={{ background: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid var(--danger)', padding: '12px 16px', borderRadius: '4px', marginBottom: '16px' }}>
                                  <p style={{ margin: 0, color: '#fca5a5', fontSize: '0.9rem', fontWeight: '500' }}>
                                    <span style={{ fontWeight: 'bold', color: 'var(--danger)' }}>Partido suplente:</span> Solo se tomará en cuenta si alguno de los {mainMatches.length} partidos principales se suspende. Recuerda marcarlo.
                                  </p>
                                </div>
                                {reserveMatches.map(match => {
                                  globalIdx++;
                                  const idx = globalIdx - 1;
                                  return (
                                    <div className="match-card" key={match.id}>
                                      <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '4px', alignItems: 'center', zIndex: 10 }}>
                                        <span style={{ background: 'var(--border-color)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.65rem', fontWeight: '800' }}>
                                          P{idx + 1}
                                        </span>
                                        <span style={{ background: 'var(--primary)', color: 'black', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.65rem', fontWeight: '800', boxShadow: '0 0 10px rgba(255,193,7,0.3)' }} title="Aplica solo como desempate si se anula algún partido">
                                          EXTRA
                                        </span>
                                      </div>
                                      <div className="lev-group">
                                        <button className={`lev-btn ${currentSelections[match.id] === 'L' ? 'selected-l' : ''}`} onClick={() => handleSelectPrediction(match.id, 'L')}>L</button>
                                      </div>
                                      <div className="team-info" style={{ width: '100%' }}>
                                        {getTeamLogo(match, true) ? (
                                          <img src={getTeamLogo(match, true)} alt="Home" style={{ width: 32, height: 32, objectFit: 'contain' }} />
                                        ) : (
                                          <div className="team-logo-fallback">{getTeamName(match, true).substring(0, 2).toUpperCase()}</div>
                                        )}
                                        <span className="team-name">{getTeamName(match, true)}</span>
                                      </div>
                                      <div className="lev-group">
                                        <button className={`lev-btn ${currentSelections[match.id] === 'E' ? 'selected-e' : ''}`} onClick={() => handleSelectPrediction(match.id, 'E')}>E</button>
                                      </div>
                                      <div className="team-info" style={{ width: '100%' }}>
                                        {getTeamLogo(match, false) ? (
                                          <img src={getTeamLogo(match, false)} alt="Away" style={{ width: 32, height: 32, objectFit: 'contain' }} />
                                        ) : (
                                          <div className="team-logo-fallback">{getTeamName(match, false).substring(0, 2).toUpperCase()}</div>
                                        )}
                                        <span className="team-name">{getTeamName(match, false)}</span>
                                      </div>
                                      <div className="lev-group">
                                        <button className={`lev-btn ${currentSelections[match.id] === 'V' ? 'selected-v' : ''}`} onClick={() => handleSelectPrediction(match.id, 'V')}>V</button>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </>
                        );
                      })()}
                      
                    </div>

                    {/* Sección del Carrito (30%) */}
                    <div style={{ flex: '1 1 300px', background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', position: 'sticky', top: '100px', alignSelf: 'flex-start' }}>
                      <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckSquare size={20} color="var(--primary)" /> 
                        Tus Quinielas
                      </h3>
                      
                      <div style={{ marginBottom: '24px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '24px' }}>
                        <button 
                          className="btn btn-primary"
                          onClick={handleAddToCart}
                          disabled={new Date(activeMatchday.deadline) < new Date()}
                          style={{ width: '100%', padding: '16px', fontSize: '1.1rem' }}
                        >
                          <PlusCircle size={20} /> Añadir Quiniela <span style={{ fontSize: '0.85rem', fontWeight: 'normal', opacity: 0.9 }}>(costo ${activeMatchday.price_per_entry}.00)</span>
                        </button>
                      </div>
                      {cart.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '20px 0' }}>No has añadido ninguna quiniela aún.</p>
                      ) : (
                        <div>
                          {cart.map((c, i) => (
                            <div key={i} style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <h5 style={{ margin: '0 0 4px 0', color: 'var(--text-main)' }}>Quiniela #{i + 1}</h5>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  {Object.values(c).join(', ')}
                                </p>
                              </div>
                              <button style={{ background: 'var(--danger)', border: 'none', color: 'white', cursor: 'pointer', padding: '6px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                                onClick={() => setConfirmConfig({
                                  title: 'Eliminar Quiniela',
                                  message: `¿Estás seguro de eliminar la Quiniela #${i + 1} del carrito?`,
                                  onConfirm: () => { handleRemoveFromCart(i); setConfirmConfig(null); }
                                })}>
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                          <div style={{ borderTop: '1px solid var(--border-color)', margin: '16px 0', paddingTop: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Total Quinielas:</span>
                              <span style={{ fontWeight: 'bold' }}>{cart.length}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>A Pagar:</span>
                              <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--accent)' }}>${cart.length * activeMatchday.price_per_entry} MXN</span>
                            </div>

                            <form onSubmit={handleSubmitCart}>
                              <div className="form-group" style={{ marginBottom: '12px' }}>
                                <input 
                                  type="text" 
                                  placeholder="Nombre" 
                                  required 
                                  value={cartParticipantName} 
                                  onChange={e => {
                                    const val = e.target.value;
                                    setCartParticipantName(val);
                                    // Solo permite letras (incluyendo acentos y ñ), espacios, guiones, apóstrofes y puntos
                                    const validName = /^[a-zA-Zà-ÿÀ-ÿñÑ\s\-\.'´]*$/.test(val);
                                    setNameInvalidError(!validName && val.length > 0);
                                  }} 
                                  className="form-control" 
                                  style={{ background: 'var(--bg-main)', borderColor: nameInvalidError ? 'var(--danger)' : undefined }} 
                                />
                                {nameInvalidError && (
                                  <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '6px', marginBottom: '0', display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                                    <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                                    <span>El nombre solo puede contener letras, espacios, guiones ( - ) y puntos ( . ). No se permiten símbolos especiales.</span>
                                  </p>
                                )}
                                {nameExistsWarning && !nameInvalidError && (
                                  <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '6px', marginBottom: '0', display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                                    <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                                    <span>Ya has registrado quinielas en esta jornada. Por favor, usa otro nombre.</span>
                                  </p>
                                )}
                              </div>

                              <div className="form-group" style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
                                <select 
                                  value={cartCountryCode} 
                                  onChange={e => setCartCountryCode(e.target.value)}
                                  className="form-control"
                                  style={{ background: 'var(--bg-main)', width: '100px', flexShrink: 0, paddingRight: '4px' }}
                                >
                                  <option value="+52">+52 (MX)</option>
                                  <option value="+1">+1 (US)</option>
                                </select>
                                <input type="tel" placeholder="(XXX) XXX-XXXX" required value={cartParticipantPhone} onChange={handlePhoneChange} className="form-control" style={{ background: 'var(--bg-main)', flexGrow: 1 }} />
                              </div>
                              {cart.length < 2 && (
                                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '4px', marginBottom: '16px', borderLeft: '3px solid var(--danger)' }}>
                                  <p style={{ fontSize: '0.85rem', color: 'var(--danger)', margin: 0, fontWeight: '500' }}>* Debes añadir mínimo 2 quinielas para participar.</p>
                                </div>
                              )}
                              <button type="submit" className="btn btn-primary" style={{ width: '100%', background: 'var(--accent)', color: 'var(--bg-main)' }} disabled={cart.length < 2 || loading || nameExistsWarning || nameInvalidError}>
                                {loading ? 'Enviando...' : 'Enviar Mis Quinielas'}
                              </button>
                            </form>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                <Trophy size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
                <h3>No hay quinielas activas en este momento</h3>
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
                <p style={{ color: 'var(--text-secondary)' }}>No tienes quinielas registradas en esta quiniela.</p>
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
                      padding: '8px 12px', 
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: pool.payment_status === 'approved' ? 'rgba(16, 185, 129, 0.15)' : pool.payment_status === 'rejected' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: pool.payment_status === 'approved' ? 'var(--primary)' : pool.payment_status === 'rejected' ? 'var(--danger)' : 'var(--accent)'
                    }}>
                      {pool.payment_status === 'approved' ? 'PAGO APROBADO' : pool.payment_status === 'rejected' ? 'PAGO RECHAZADO' : (pool.payment_receipt_url ? 'PAGO EN REVISIÓN' : 'ESPERANDO VALIDACIÓN')}
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
                          title={`${getTeamName(m, true)} vs ${getTeamName(m, false)}`}
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
                          onClick={() => {
                            const attempts = JSON.parse(localStorage.getItem(`upload_attempts_${pool.id}`) || '0');
                            if (attempts >= 2) {
                                alert("Has alcanzado el límite de 2 intentos de carga para esta quiniela.");
                            } else {
                                setSelectedPoolForPayment(pool.id);
                            }
                          }}
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
                    Quiniela {activeMatchday.number}
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
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', fontWeight: '600' }}>{getTeamName(m, true)}</span>
                      <span style={{ color: 'var(--primary)', fontWeight: '800', fontSize: '0.9rem' }}>
                        {m.result ? m.result : 'VS'}
                      </span>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', fontWeight: '600' }}>{getTeamName(m, false)}</span>
                    </div>
                  ))}
                </div>
              )}

              <hr style={{ borderColor: 'var(--border-color)', margin: '14px 0' }} />

              <h3>Tabla de Posiciones</h3>
              {leaderboard.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', marginTop: '10px' }}>
                  Aún no hay quinielas pagadas y calculadas en esta quiniela.
                </p>
              ) : (() => {
                const payouts = calculatePayouts(activeMatchday, leaderboard);
                return (
                  <table className="leaderboard-table">
                    <thead>
                      <tr>
                        <th style={{ width: '60px' }}>Pos</th>
                        <th>Participante</th>
                        <th style={{ textAlign: 'right' }}>Aciertos</th>
                        <th style={{ textAlign: 'right' }}>Premio Estimado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((player, index) => {
                        const pos = index + 1;
                        let rankClass = 'rank-other';
                        if (pos === 1) rankClass = 'rank-1';
                        else if (pos === 2) rankClass = 'rank-2';
                        else if (pos === 3) rankClass = 'rank-3';

                        const prizeMoney = payouts[player.id] || 0;

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
                            <td style={{ textAlign: 'right', fontWeight: '800', color: prizeMoney > 0 ? '#25D366' : 'var(--text-muted)' }}>
                              {prizeMoney > 0 ? `$${formatMoney(prizeMoney)}` : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          </div>
        )}

        {/* 5. ADMIN: VALIDACIÓN DE PAGOS (Pestaña "admin-payments") */}
        {activeTab === 'admin-payments' && isAdmin && (
          <div>
            <h2 style={{ marginBottom: '16px' }}>Validar Comprobantes de Pago (Quiniela N° {activeMatchday?.number})</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.9rem' }}>
              Revisa los comprobantes de transferencia bancaria subidos por los participantes. La aprobación habilita la quiniela para la tabla y exportación PDF.
            </p>

            {allPoolsForMatchday.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
                No hay quinielas registradas en la quiniela actual.
              </p>
            ) : (
              <>
                {(() => {
                  const pendingBatches = allPoolsForMatchday
                    .filter(p => p.payment_status === 'pending')
                    .reduce((acc, pool) => {
                      const code = pool.reference_code && pool.reference_code.trim() !== '' 
                        ? pool.reference_code 
                        : `INDIVIDUAL_${pool.id}`;
                      if (!acc[code]) {
                        acc[code] = [];
                      }
                      acc[code].push(pool);
                      return acc;
                    }, {} as Record<string, Pool[]>);

                  const ITEMS_PER_PAGE = 20;

                  const getRiskScore = (rawFlags?: string[]) => {
                    if (!rawFlags) return 0;
                    return rawFlags.filter(f => !f.startsWith('[TYPE:')).length;
                  };

                  const pendingCodes = Object.keys(pendingBatches).sort((a, b) => {
                    const flagsA = getRiskScore(pendingBatches[a][0].validation_flags);
                    const flagsB = getRiskScore(pendingBatches[b][0].validation_flags);
                    return flagsB - flagsA; // Descending: most flags (highest risk) first
                  });
                  
                  if (pendingCodes.length === 0) return null;

                  const totalPages = Math.ceil(pendingCodes.length / ITEMS_PER_PAGE);
                  const currentCodes = pendingCodes.slice((adminPendingPage - 1) * ITEMS_PER_PAGE, adminPendingPage * ITEMS_PER_PAGE);

                  return (
                    <div style={{ marginBottom: '40px' }}>
                      <h3 style={{ marginBottom: '16px', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertTriangle size={20} /> Pendientes de Revisión ({pendingCodes.length} {pendingCodes.length === 1 ? 'Bloque' : 'Bloques'})
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {currentCodes.map(code => {
                          const batch = pendingBatches[code];
                          const totalCost = batch.reduce((sum, p) => sum + p.cost, 0);
                          const receiptUrl = batch[0].payment_receipt_url;
                          const primaryParticipant = batch[0].participant;
                          
                          const rawFlags = batch[0].validation_flags || [];
                          let paymentType = null;
                          const flags = [...rawFlags].filter(f => {
                            if (f.startsWith('[TYPE:TRANSFERENCIA]')) {
                              paymentType = 'TRANSFERENCIA';
                              return false;
                            }
                            if (f.startsWith('[TYPE:DEPOSITO]')) {
                              paymentType = 'DEPÓSITO';
                              return false;
                            }
                            if (f.startsWith('[TYPE:DESCONOCIDO]')) {
                              return false;
                            }
                            return true;
                          });

                          const riskLevel = flags.length === 0 ? 'safe' : flags.length === 1 ? 'warning' : 'danger';
                          const riskColor = riskLevel === 'safe' ? 'var(--success)' : riskLevel === 'warning' ? 'var(--warning)' : 'var(--danger)';
                          const riskText = riskLevel === 'safe' ? 'Seguro 🟢' : riskLevel === 'warning' ? 'Precaución 🟡' : 'Alto Riesgo 🔴';
                          
                          return (
                            <div key={`pending-${code}`} style={{ display: 'flex', alignItems: 'center', gap: '16px', border: `1px solid ${riskColor}`, background: `rgba(${riskLevel === 'safe' ? '34, 197, 94' : riskLevel === 'warning' ? '234, 179, 8' : '239, 68, 68'}, 0.05)`, padding: '16px', borderRadius: 'var(--radius-md)', flexWrap: 'wrap' }}>
                              
                              {/* Miniatura */}
                              {receiptUrl && (
                                <div style={{ width: '80px', height: '80px', flexShrink: 0, cursor: 'pointer', borderRadius: '8px', overflow: 'hidden', border: `2px solid ${riskColor}` }} onClick={() => setViewReceiptUrl(receiptUrl)}>
                                  <img src={receiptUrl} alt="Comprobante" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                              )}

                              {/* Información principal */}
                              <div style={{ flex: '1 1 300px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px', flexWrap: 'wrap' }}>
                                  <h4 style={{ color: 'white', fontSize: '1.1rem', margin: 0 }}>
                                    {code.startsWith('INDIVIDUAL_') ? 'Pago Directo (Sin Folio)' : `REF: ${code}`}
                                  </h4>
                                  <div style={{ fontSize: '0.75rem', fontWeight: '800', padding: '2px 8px', borderRadius: '12px', border: `1px solid ${riskColor}`, color: riskColor }}>
                                    {riskText}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', fontWeight: '800', padding: '2px 8px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.1)', color: 'white' }}>
                                    Quiniela N° {activeMatchday?.number}
                                  </div>
                                  {paymentType && (
                                    <div style={{ fontSize: '0.75rem', fontWeight: '800', padding: '2px 8px', borderRadius: '12px', background: 'var(--primary-glow)', color: 'var(--primary)', border: '1px solid var(--primary)' }}>
                                      {paymentType === 'TRANSFERENCIA' ? '🏦 TRANSFERENCIA' : '💵 DEPÓSITO'}
                                    </div>
                                  )}
                                </div>
                                
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                  Enviado por: <strong>{primaryParticipant?.name || 'Usuario'}</strong> (@{primaryParticipant?.alias})<br/>
                                  <span style={{ color: 'var(--text-muted)' }}>{batch.length} {batch.length === 1 ? 'Quiniela' : 'Quinielas'} • Total: ${totalCost}</span>
                                </div>

                                {/* Observaciones OCR */}
                                {flags.length > 0 && (
                                  <div style={{ background: `rgba(${riskLevel === 'warning' ? '234, 179, 8' : '239, 68, 68'}, 0.1)`, padding: '8px 12px', borderRadius: '6px', borderLeft: `3px solid ${riskColor}` }}>
                                    <h5 style={{ color: riskColor, fontSize: '0.75rem', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <AlertTriangle size={12} /> Observaciones del OCR:
                                    </h5>
                                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                      {flags.map((flag: string, fIdx: number) => (
                                        <li key={fIdx}>{flag}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>

                              {/* Botones de Acción */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '140px' }}>
                                <button 
                                  className="btn btn-primary" 
                                  style={{ padding: '8px', fontSize: '0.85rem' }}
                                  onClick={() => {
                                    if (code.startsWith('INDIVIDUAL_')) {
                                      const poolId = code.replace('INDIVIDUAL_', '');
                                      handleValidatePayment(poolId, 'approved');
                                    } else {
                                      handleValidatePaymentBatch(code, 'approved');
                                    }
                                  }}
                                >
                                  <Check size={14} /> Aprobar {batch.length}
                                </button>
                                <button 
                                  className="btn btn-danger" 
                                  style={{ padding: '8px', fontSize: '0.85rem', border: 'none' }}
                                  onClick={() => {
                                    if (code.startsWith('INDIVIDUAL_')) {
                                      const poolId = code.replace('INDIVIDUAL_', '');
                                      handleValidatePayment(poolId, 'rejected');
                                    } else {
                                      handleValidatePaymentBatch(code, 'rejected');
                                    }
                                  }}
                                >
                                  <X size={14} /> Rechazar {batch.length}
                                </button>
                                {primaryParticipant?.phone && (
                                  <a 
                                    href={`https://wa.me/${primaryParticipant.phone.replace(/\D/g, '')}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="btn btn-secondary"
                                    style={{ padding: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', background: '#25D366', color: 'white', border: 'none' }}
                                    title="Contactar por WhatsApp"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                    Contactar
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '24px' }}>
                          <button 
                            className="btn btn-secondary" 
                            disabled={adminPendingPage === 1}
                            onClick={() => setAdminPendingPage(p => Math.max(1, p - 1))}
                            style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                          >
                            Anterior
                          </button>
                          <span style={{ color: 'var(--text-secondary)' }}>
                            Página {adminPendingPage} de {totalPages}
                          </span>
                          <button 
                            className="btn btn-secondary" 
                            disabled={adminPendingPage === totalPages}
                            onClick={() => setAdminPendingPage(p => Math.min(totalPages, p + 1))}
                            style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                          >
                            Siguiente
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}

              </>
            )}
          </div>
        )}

        {/* ADMIN: HISTORIAL DE PAGOS */}
        {activeTab === 'admin-history' && isAdmin && (
          <div>
            <h2 style={{ marginBottom: '16px' }}>Historial General de Pagos</h2>
            {!financialPools || financialPools.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
                No hay quinielas registradas en el historial.
              </p>
            ) : (
              (() => {
                const ITEMS_PER_PAGE = 20;
                const historyPools = financialPools.filter(p => p.payment_status !== 'pending' || p.matchday_id !== activeMatchday?.id);

                // Agrupar quinielas del historial por usuario y jornada
                const groupedPoolsMap: Record<string, {
                  participantId: string;
                  participant: any;
                  matchdayId: string;
                  matchdayNum: string | number;
                  paymentStatus: string;
                  paymentReceiptUrl?: string;
                  validationFlags?: string[];
                  pools: Pool[];
                }> = {};

                historyPools.forEach(pool => {
                  const key = `${pool.participant_id || 'INV'}_${pool.matchday_id}`;
                  if (!groupedPoolsMap[key]) {
                    const matchdayNum = financialMatchdays.find(m => m.id === pool.matchday_id)?.number || 'N/A';
                    groupedPoolsMap[key] = {
                      participantId: pool.participant_id,
                      participant: pool.participant,
                      matchdayId: pool.matchday_id,
                      matchdayNum,
                      paymentStatus: pool.payment_status,
                      paymentReceiptUrl: pool.payment_receipt_url,
                      validationFlags: pool.validation_flags || [],
                      pools: []
                    };
                  }
                  groupedPoolsMap[key].pools.push(pool);
                  
                  if (pool.payment_receipt_url && !groupedPoolsMap[key].paymentReceiptUrl) {
                    groupedPoolsMap[key].paymentReceiptUrl = pool.payment_receipt_url;
                  }
                });

                const groupedHistoryList = Object.values(groupedPoolsMap);
                const totalPages = Math.ceil(groupedHistoryList.length / ITEMS_PER_PAGE);
                const currentGroups = groupedHistoryList.slice((adminHistoryPage - 1) * ITEMS_PER_PAGE, adminHistoryPage * ITEMS_PER_PAGE);

                return (
                  <div>
                    <div className="payment-grid">
                      {currentGroups.map((group) => {
                        const name = group.participant?.name || 'Usuario';
                        const alias = group.participant?.alias || 'alias';
                        const phone = group.participant?.phone || 'Sin número';
                        const matchdayNum = group.matchdayNum;
                        const poolIds = group.pools.map(p => p.id);

                        // Parse payment type from flags
                        let paymentType = null;
                        group.pools.forEach(pool => {
                          const rawFlags = pool.validation_flags || [];
                          rawFlags.forEach(f => {
                            if (f.startsWith('[TYPE:TRANSFERENCIA]')) paymentType = 'TRANSFERENCIA';
                            if (f.startsWith('[TYPE:DEPOSITO]')) paymentType = 'DEPÓSITO';
                          });
                        });

                        return (
                          <div className="payment-card" key={`${group.participantId}_${group.matchdayId}`} style={{ border: '1px solid var(--border-color)', background: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <h4 style={{ color: 'white', margin: 0 }}>{name}</h4>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                  Alias: @{alias} | Tel: {phone}
                                </span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                <span style={{ 
                                  fontSize: '0.7rem', 
                                  fontWeight: '800', 
                                  padding: '2px 6px', 
                                  borderRadius: 'var(--radius-sm)',
                                  backgroundColor: group.paymentStatus === 'approved' ? 'var(--primary-glow)' : group.paymentStatus === 'rejected' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.1)',
                                  color: group.paymentStatus === 'approved' ? 'var(--primary)' : group.paymentStatus === 'rejected' ? 'var(--danger)' : 'var(--text-muted)'
                                }}>
                                  {group.paymentStatus.toUpperCase()}
                                </span>
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                  <span style={{ fontSize: '0.65rem', fontWeight: '800', padding: '2px 6px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.1)', color: 'white' }}>
                                    Quiniela N° {matchdayNum} ({group.pools.length} {group.pools.length === 1 ? 'part.' : 'parts.'})
                                  </span>
                                  {paymentType && (
                                    <span style={{ fontSize: '0.65rem', fontWeight: '800', padding: '2px 6px', borderRadius: '12px', background: 'var(--primary-glow)', color: 'var(--primary)', border: '1px solid var(--primary)' }}>
                                      {paymentType === 'TRANSFERENCIA' ? '🏦 TRANSFERENCIA' : '💵 DEPÓSITO'}
                                    </span>
                                  )}
                                </div>
                                <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                                  {group.paymentStatus === 'approved' && (
                                    <button
                                      className="btn btn-secondary"
                                      onClick={() => handleRevertPayment(poolIds)}
                                      style={{ padding: '4px 8px', fontSize: '0.7rem', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '4px' }}
                                      title="Regresar a estado Pendiente"
                                    >
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                                      Deshacer
                                    </button>
                                  )}
                                  {group.paymentStatus === 'pending' && (
                                    <>
                                      <button
                                        className="btn btn-primary"
                                        onClick={() => handleValidatePayment(poolIds, 'approved')}
                                        style={{ padding: '4px 8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--primary)', color: 'black', border: 'none' }}
                                      >
                                        <Check size={10} /> Aprobar
                                      </button>
                                      <button
                                        className="btn btn-danger"
                                        onClick={() => handleValidatePayment(poolIds, 'rejected')}
                                        style={{ padding: '4px 8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--danger)', color: 'white', border: 'none' }}
                                      >
                                        <X size={10} /> Rechazar
                                      </button>
                                    </>
                                  )}
                                  {group.paymentStatus === 'rejected' && (
                                    <button
                                      className="btn btn-primary"
                                      onClick={() => handleValidatePayment(poolIds, 'approved')}
                                      style={{ padding: '4px 8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--primary)', color: 'black', border: 'none' }}
                                    >
                                      <Check size={10} /> Aprobar
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Lista de predicciones de las quinielas del usuario */}
                            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {group.pools.map((p, pIdx) => (
                                <div key={p.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 'bold' }}>
                                    Quiniela #{pIdx + 1} {p.reference_code ? `(Ref: ${p.reference_code})` : '(Sin folio)'}
                                  </div>
                                  <div style={{ display: 'flex', gap: '4px' }}>
                                    {matches.map((m, mIdx) => (
                                      <div 
                                        key={m.id} 
                                        style={{ flex: 1, background: 'var(--bg-main)', border: '1px solid var(--border-color)', textAlign: 'center', fontSize: '0.6rem', padding: '2px 0', borderRadius: '4px' }}
                                        title={getTeamName(m, true) + ' vs ' + getTeamName(m, false)}
                                      >
                                        <span style={{ fontSize: '0.45rem', display: 'block', color: 'var(--text-muted)' }}>P{mIdx + 1}</span>
                                        {predictionsByPool[p.id]?.[m.id] || '-'}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {group.paymentReceiptUrl ? (
                              <div style={{ marginTop: '12px' }}>
                                <img 
                                  src={group.paymentReceiptUrl} 
                                  alt="Comprobante" 
                                  className="receipt-img"
                                  onClick={() => setViewReceiptUrl(group.paymentReceiptUrl!)}
                                />
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textAlign: 'center', marginTop: '4px' }}>
                                  🔎 Clic para ampliar
                                </span>
                              </div>
                            ) : (
                              <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-main)', marginTop: '12px' }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '600' }}>Sin comprobante</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {totalPages > 1 && (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '24px' }}>
                        <button 
                          className="btn btn-secondary" 
                          disabled={adminHistoryPage === 1}
                          onClick={() => setAdminHistoryPage(p => Math.max(1, p - 1))}
                          style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                        >
                          Anterior
                        </button>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          Página {adminHistoryPage} de {totalPages}
                        </span>
                        <button 
                          className="btn btn-secondary" 
                          disabled={adminHistoryPage === totalPages}
                          onClick={() => setAdminHistoryPage(p => Math.min(totalPages, p + 1))}
                          style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                        >
                          Siguiente
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()
            )}
          </div>
        )}

        
        {/* 6. ADMIN: GESTIÓN DE JORNADAS (Pestaña "admin-matchdays") */}
        {activeTab === 'admin-matchdays' && isAdmin && (
          <div>
            <h2 style={{ marginBottom: '16px' }}>Gestión de Quinielas y Partidos</h2>

            {selectedAdminMatchday === null ? (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                  <h3 style={{ margin: 0 }}>Listado de Quinielas</h3>
                  <button className="btn btn-primary" onClick={() => {
                    handleCreateMatchday();
                    setTimeout(loadInitialData, 1000); // refresh list
                  }}>
                    <PlusCircle size={16} /> Crear Nueva Quiniela
                  </button>
                </div>
                
                <div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {allMatchdays.length === 0 ? (
                        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>No hay quinielas creadas.</div>
                      ) : (
                        allMatchdays.slice((currentPageMatchdays - 1) * 10, currentPageMatchdays * 10).map((m, idx) => (
                          <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap', gap: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '1 1 200px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>Quiniela {m.number}</span>
                                <span style={{ 
                                  padding: '4px 10px', 
                                  borderRadius: '20px', 
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  background: m.status === 'active' ? 'rgba(37, 211, 102, 0.15)' : m.status === 'inactive' ? 'rgba(255, 193, 7, 0.15)' : 'rgba(255,255,255,0.1)',
                                  color: m.status === 'active' ? '#25D366' : m.status === 'inactive' ? 'var(--primary)' : 'var(--text-secondary)',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px'
                                }}>
                                  {m.status === 'active' ? 'Abierta' : m.status === 'closed' ? 'Cerrada' : m.status === 'calculated' ? 'Calificada' : 'Inactiva'}
                                </span>
                              </div>
                              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Calendar size={14} /> Cierre: {new Date(m.deadline).toLocaleString()}
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '30px', flexWrap: 'wrap' }}>
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Participantes</div>
                                <div style={{ fontWeight: 'bold', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><Users size={16} style={{ color: 'var(--primary)' }}/> {matchdayApprovedParticipants[m.id] || 0}</div>
                              </div>
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Vendidas</div>
                                <div style={{ fontWeight: 'bold', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><FileText size={16} style={{ color: 'var(--primary)' }}/> {matchdayApprovedPools[m.id] || 0}</div>
                              </div>
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Recaudado</div>
                                <div style={{ fontWeight: 'bold', color: '#25D366', fontSize: '1.2rem' }}>${((matchdayApprovedPools[m.id] || 0) * (m.price_per_entry || 0)).toFixed(2)}</div>
                              </div>
                              <div style={{ position: 'relative', zIndex: openMatchdayMenu === m.id ? 50 : 1 }}>
                                <div>
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: '8px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', minWidth: '100px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                  onClick={() => setOpenMatchdayMenu(openMatchdayMenu === m.id ? null : m.id)}
                                >
                                  Opciones <MoreVertical size={14} style={{ opacity: 0.7 }}/>
                                </button>
                              </div>
                              {openMatchdayMenu === m.id && (
                                <div style={{ 
                                  position: 'absolute', 
                                  right: '8px', 
                                  top: (idx >= allMatchdays.length - 2 && allMatchdays.length > 3) ? 'auto' : '56px',
                                  bottom: (idx >= allMatchdays.length - 2 && allMatchdays.length > 3) ? '40px' : 'auto',
                                  background: 'var(--bg-card)', 
                                  border: '1px solid var(--primary)', 
                                  borderRadius: '8px', 
                                  zIndex: 10, 
                                  display: 'flex', 
                                  flexDirection: 'column', 
                                  padding: '4px', 
                                  boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
                                  minWidth: '130px'
                                }}>
                                  <button 
                                    className="btn" 
                                    style={{ background: 'transparent', color: 'white', padding: '10px 12px', fontSize: '0.9rem', textAlign: 'left', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)', borderRadius: '4px 4px 0 0' }}
                                    onClick={() => {
                                      setOpenMatchdayMenu(null);
                                      setSelectedAdminMatchday(m);
                                      setAdminDetailView('ranking');
                                      setActiveMatchday(m);
                                      setPrizePercentage(m.prize_percentage !== undefined && m.prize_percentage !== null ? Number(m.prize_percentage) : 80);
                                      setMatchdayPrice(m.price_per_entry || 25);
                                      setMatchdayPrizeType(m.prize_type || 'percentage');
                                      setMatchdayFixedPrize1st(m.fixed_prize_1st || 0);
                                      setMatchdayFixedPrize2nd(m.fixed_prize_2nd || 0);
                                    }}
                                  >
                                    <Users size={16} style={{ marginRight: '8px', verticalAlign: 'middle', color: 'var(--primary)' }}/> Ranking
                                  </button>
                                  <button 
                                    className="btn" 
                                    style={{ background: 'transparent', color: 'white', padding: '10px 12px', fontSize: '0.9rem', textAlign: 'left', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                                    onClick={() => {
                                      setOpenMatchdayMenu(null);
                                      setSelectedAdminMatchday(m);
                                      setAdminDetailView('matches');
                                      setActiveMatchday(m);
                                      loadMatches(m.id);
                                      setPrizePercentage(m.prize_percentage !== undefined && m.prize_percentage !== null ? Number(m.prize_percentage) : 80);
                                      setMatchdayPrice(m.price_per_entry || 25);
                                      setMatchdayPrizeType(m.prize_type || 'percentage');
                                      setMatchdayFixedPrize1st(m.fixed_prize_1st || 0);
                                      setMatchdayFixedPrize2nd(m.fixed_prize_2nd || 0);
                                    }}
                                  >
                                    <Edit2 size={16} style={{ marginRight: '8px', verticalAlign: 'middle', color: 'var(--primary)' }}/> Partidos
                                  </button>
                                  <button 
                                    className="btn" 
                                    style={{ background: 'transparent', color: 'white', padding: '10px 12px', fontSize: '0.9rem', textAlign: 'left', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)', borderRadius: '0' }}
                                    onClick={() => {
                                      setOpenMatchdayMenu(null);
                                      handleExportMatchdayPDF(m);
                                    }}
                                  >
                                    <FileText size={16} style={{ marginRight: '8px', verticalAlign: 'middle', color: '#25D366' }}/> Exportar PDF
                                  </button>
                                  <button 
                                    className="btn" 
                                    style={{ background: 'transparent', color: 'white', padding: '10px 12px', fontSize: '0.9rem', textAlign: 'left', border: 'none', borderRadius: '0 0 4px 4px' }}
                                    onClick={() => {
                                      setOpenMatchdayMenu(null);
                                      handleGenerateSocialFlyer(m);
                                    }}
                                  >
                                    <ImageIcon size={16} style={{ marginRight: '8px', verticalAlign: 'middle', color: '#38bdf8' }}/> Imagen Redes
                                  </button>
                                </div>
                              )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                </div>
                {allMatchdays.length > 10 && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '16px', padding: '10px' }}>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '8px 16px' }}
                      disabled={currentPageMatchdays === 1}
                      onClick={() => setCurrentPageMatchdays(prev => Math.max(prev - 1, 1))}
                    >
                      Anterior
                    </button>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      Página {currentPageMatchdays} de {Math.ceil(allMatchdays.length / 10)}
                    </span>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '8px 16px' }}
                      disabled={currentPageMatchdays >= Math.ceil(allMatchdays.length / 10)}
                      onClick={() => setCurrentPageMatchdays(prev => Math.min(prev + 1, Math.ceil(allMatchdays.length / 10)))}
                    >
                      Siguiente
                    </button>
                  </div>
                )}
              </div>
            ) : adminDetailView === 'ranking' ? (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0 }}>Ranking - Quiniela N° {selectedAdminMatchday.number}</h3>
                  <button className="btn btn-secondary" onClick={() => { setSelectedAdminMatchday(null); loadInitialData(); }}>
                    <ArrowLeft size={16} /> Volver a la Lista
                  </button>
                </div>
                  {leaderboard.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)' }}>Aún no hay quinielas pagadas y calculadas en esta quiniela.</p>
                  ) : (() => {
                    const payouts = calculatePayouts(selectedAdminMatchday, leaderboard);
                    return (
                      <table className="leaderboard-table">
                        <thead>
                          <tr>
                            <th style={{ width: '60px' }}>Pos</th>
                            <th>Participante</th>
                            <th style={{ textAlign: 'right' }}>Aciertos</th>
                            <th style={{ textAlign: 'right' }}>Premio Estimado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leaderboard.map((player, index) => {
                            const pos = index + 1;
                            let rankClass = 'rank-other';
                            if (pos === 1) rankClass = 'rank-1';
                            else if (pos === 2) rankClass = 'rank-2';
                            else if (pos === 3) rankClass = 'rank-3';

                            const prizeMoney = payouts[player.id] || 0;

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
                                <td style={{ textAlign: 'right', fontWeight: '800', color: prizeMoney > 0 ? '#25D366' : 'var(--text-muted)' }}>
                                  {prizeMoney > 0 ? `$${formatMoney(prizeMoney)}` : '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    );
                  })()}
              </div>
            ) : (
              <div>
                <button className="btn btn-secondary" onClick={() => { setSelectedAdminMatchday(null); loadInitialData(); }} style={{ marginBottom: '16px' }}>
                  <ArrowLeft size={16} /> Volver a la Lista
                </button>

                {activeMatchday && (
                  <div className="card" style={{ marginBottom: '16px' }}>
                    <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Settings size={18} style={{ color: 'var(--primary)' }} /> Configuración de Costo y Premios
                    </h3>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
                      <div className="form-group" style={{ flex: '1 1 200px', marginBottom: 0 }}>
                        <label style={{ color: 'var(--text-secondary)', fontWeight: '600', display: 'block', marginBottom: '8px' }}>Costo por Entrada (MXN)</label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <span style={{ position: 'absolute', left: '12px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>$</span>
                          <input 
                            type="text" 
                            className="form-control" 
                            style={{ paddingLeft: '28px' }}
                            value={matchdayPrice === 0 ? '' : formatInputWithCommas(matchdayPrice)}
                            onChange={e => {
                              const clean = e.target.value.replace(/[^0-9]/g, '');
                              setMatchdayPrice(clean ? Number(clean) : 0);
                            }}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      
                      <div className="form-group" style={{ flex: '1 1 200px', marginBottom: 0 }}>
                        <label style={{ color: 'var(--text-secondary)', fontWeight: '600', display: 'block', marginBottom: '8px' }}>Tipo de Premio</label>
                        <select 
                          className="form-control"
                          value={matchdayPrizeType}
                          onChange={e => setMatchdayPrizeType(e.target.value as 'percentage' | 'fixed')}
                          style={{ background: 'var(--bg-main)' }}
                        >
                          <option value="percentage">Porcentaje de Recaudación</option>
                          <option value="fixed">Monto Fijo (Ganador)</option>
                        </select>
                      </div>

                      {matchdayPrizeType === 'percentage' ? (
                        <div className="form-group" style={{ flex: '1 1 200px', marginBottom: 0 }}>
                          <label style={{ color: 'var(--text-secondary)', fontWeight: '600', display: 'block', marginBottom: '8px' }}>Bolsa para el Ganador (%)</label>
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <input 
                              type="number" 
                              className="form-control" 
                              style={{ paddingRight: '28px' }}
                              min={0}
                              max={100}
                              value={prizePercentage === 0 ? '' : prizePercentage}
                              onChange={e => setPrizePercentage(Math.min(100, Math.max(0, Number(e.target.value))))}
                              placeholder="0"
                            />
                            <span style={{ position: 'absolute', right: '12px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>%</span>
                          </div>
                        </div>
                      ) : (
                        <div className="form-group" style={{ flex: '1 1 200px', marginBottom: 0 }}>
                          <label style={{ color: 'var(--text-secondary)', fontWeight: '600', display: 'block', marginBottom: '8px' }}>Monto Fijo Ganador (MXN)</label>
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <span style={{ position: 'absolute', left: '12px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>$</span>
                            <input 
                              type="text" 
                              className="form-control" 
                              style={{ paddingLeft: '28px' }}
                              value={matchdayFixedPrize1st === 0 ? '' : formatInputWithCommas(matchdayFixedPrize1st)}
                              onChange={e => {
                                const clean = e.target.value.replace(/[^0-9]/g, '');
                                setMatchdayFixedPrize1st(clean ? Number(clean) : 0);
                              }}
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <button className="btn btn-primary" onClick={handleSaveMatchdayConfig} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Save size={16} /> Guardar Configuración
                    </button>
                  </div>
                )}

        
          
            

            {/* Selector de estado de Quiniela */}
            {activeMatchday && (
              <div className="card">
                <h3>Estado de la Quiniela N° {activeMatchday.number}</h3>
                {activeMatchday.status === 'active' && (
                  <div style={{ padding: '12px 16px', background: 'rgba(255, 193, 7, 0.1)', color: 'var(--primary)', borderRadius: '8px', marginTop: '16px', borderLeft: '4px solid var(--primary)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                    <Clock size={18} /> Cierre programado en: {getRemainingTime(activeMatchday.deadline)}
                  </div>
                )}
                {activeMatchday.status === 'inactive' ? (
                  <div style={{ marginTop: '12px', background: 'rgba(255, 193, 7, 0.05)', border: '1px solid var(--primary)', padding: '16px', borderRadius: '8px' }}>
                    <p style={{ margin: '0 0 8px 0', color: 'var(--primary)', fontWeight: 'bold' }}>Quiniela en Creación (Inactiva)</p>
                    <p style={{ fontSize: '0.9rem', marginBottom: '16px' }}>Los usuarios no pueden ver esta quiniela. Agrega los partidos y define la fecha límite para publicarla.</p>
                    <div style={{ marginBottom: '16px', padding: '12px', borderLeft: '4px solid var(--primary)', background: 'rgba(0, 0, 0, 0.4)', borderRadius: '4px' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontWeight: 'bold' }}>
                          <Calendar size={16} /> Fecha y Hora del Primer Partido
                        </label>
                        <input 
                          type="datetime-local" 
                          className="form-control" 
                          value={firstMatchDate}
                          onChange={e => setFirstMatchDate(e.target.value)}
                          onFocus={e => {
                            try { e.target.showPicker(); } catch(err) {}
                          }}
                          style={{ marginTop: '8px' }}
                        />
                      </div>
                    </div>
                    <div style={{ marginBottom: '16px', padding: '12px', borderLeft: '4px solid #dc3545', background: 'rgba(0, 0, 0, 0.4)', borderRadius: '4px' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#dc3545', fontWeight: 'bold' }}>
                          <AlertCircle size={16} /> Fecha y Hora Límite de Cierre
                        </label>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 8px 0' }}>Debe ser al menos 5 horas antes del primer partido.</p>
                        <input 
                          type="datetime-local" 
                          className="form-control" 
                          value={activationDate}
                          onChange={e => setActivationDate(e.target.value)}
                          onFocus={e => {
                            try { e.target.showPicker(); } catch(err) {}
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                      <button className="btn btn-primary" onClick={handleActivateMatchday} style={{ width: '100%' }}>
                        <Play size={15} /> Validar y Activar Quiniela
                      </button>
                      <button onClick={handleDeleteMatchday} className="btn btn-danger" style={{ fontWeight: '600' }}>
                        <Trash2 size={15} /> Eliminar quiniela en creación
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                    <button 
                      className={`btn ${activeMatchday.status === 'active' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, padding: '10px 4px', fontSize: '0.8rem' }}
                      onClick={() => handleToggleMatchdayStatus('active')}
                    >
                      <Unlock size={14} /> Abierta
                    </button>
                    <button 
                      className={`btn ${activeMatchday.status === 'closed' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, padding: '10px 4px', fontSize: '0.8rem' }}
                      onClick={() => handleToggleMatchdayStatus('closed')}
                    >
                      <Lock size={14} /> Cerrada
                    </button>
                    <button 
                      className={`btn ${activeMatchday.status === 'calculated' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, padding: '10px 4px', fontSize: '0.8rem', opacity: (matches.length === 0 || !matches.every(m => m.result)) && activeMatchday.status !== 'calculated' ? 0.5 : 1 }}
                      onClick={() => handleToggleMatchdayStatus('calculated')}
                      disabled={(matches.length === 0 || !matches.every(m => m.result)) && activeMatchday.status !== 'calculated'}
                      title={(matches.length === 0 || !matches.every(m => m.result)) ? 'Faltan partidos por calificar' : ''}
                    >
                      <CheckSquare size={14} /> Calificada
                    </button>
                    <button 
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: '10px 4px', fontSize: '0.8rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', opacity: 0.5, cursor: 'not-allowed' }}
                      disabled={true}
                      title="No se puede volver a inactiva una vez abierta"
                      onClick={() => {
                        setConfirmConfig({
                          title: 'Volver a Inactiva',
                          message: '¿Seguro que deseas revertir esta quiniela a Inactiva? Desaparecerá de la vista de los usuarios.',
                          onConfirm: () => {
                            handleToggleMatchdayStatus('inactive');
                            setConfirmConfig(null);
                          }
                        });
                      }}
                    >
                      <RotateCcw size={14} /> Inactiva
                    </button>
                  </div>
                  {/* Editar hora de cierre para quiniela ya activa */}
                  <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(255,193,7,0.06)', border: '1px solid rgba(255,193,7,0.2)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginBottom: showEditDeadline ? '10px' : 0 }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', flex: '1 1 auto', whiteSpace: 'nowrap' }}>
                        <Clock size={14} /> Cierre actual: <strong style={{ color: 'var(--primary)' }}>{new Date(activeMatchday.deadline).toLocaleString('es-MX', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</strong>
                      </span>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '0.75rem', flexShrink: 0, whiteSpace: 'nowrap' }}
                        onClick={() => {
                          setShowEditDeadline(v => !v);
                          setEditDeadline('');
                        }}
                      >
                        <Edit2 size={12} /> {showEditDeadline ? 'Cancelar' : 'Ajustar cierre'}
                      </button>
                    </div>
                    {showEditDeadline && (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <input
                          type="datetime-local"
                          className="form-control"
                          style={{ flex: 1, minWidth: '200px' }}
                          value={editDeadline}
                          onChange={e => setEditDeadline(e.target.value)}
                          onFocus={e => { try { e.target.showPicker(); } catch(err) {} }}
                        />
                        <button
                          className="btn btn-primary"
                          style={{ padding: '8px 14px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
                          onClick={handleUpdateDeadline}
                          disabled={loading || !editDeadline}
                        >
                          <Save size={14} /> Guardar
                        </button>
                      </div>
                    )}
                  </div>
                  </>
                )}
              </div>
            )}

            {/* Crear Nueva Quiniela (Solo visible si no hay activa/inactiva) */}
            {(!activeMatchday || activeMatchday.status === 'calculated') && (
              <div className="card">
              <h3>Crear Siguiente Quiniela</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '12px' }}>
                Creará de forma secuencial la siguiente quiniela del torneo activo con costo estándar.
              </p>
              <button className="btn btn-primary" onClick={handleCreateMatchday}>
                <PlusCircle size={16} /> Inicializar Siguiente Quiniela
              </button>
              </div>
            )}

            {/* Agregar Partido — solo visible cuando la quiniela está inactiva */}
            {activeMatchday && activeMatchday.status === 'inactive' && (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0 }}>Agregar Partido a la Quiniela N° {activeMatchday.number}</h3>
                  <div style={{ fontSize: '0.85rem', color: (matches.length * 2 === teams.length && teams.length > 0) ? 'var(--primary)' : 'var(--text-secondary)' }}>
                    Equipos asignados: <strong style={{ color: (matches.length * 2 === teams.length && teams.length > 0) ? 'var(--primary)' : 'var(--text-primary)' }}>{matches.length * 2} / {teams.length}</strong>
                  </div>
                </div>
                <form onSubmit={handleAddMatch} style={{ marginTop: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Equipo Local</label>
                      <SearchableSelect
                        value={newHomeTeam}
                        onChange={setNewHomeTeam}
                        options={availableHomeTeams}
                        placeholder="Ej. América"
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Equipo Visitante</label>
                      <SearchableSelect
                        value={newAwayTeam}
                        onChange={setNewAwayTeam}
                        options={availableAwayTeams}
                        placeholder="Ej. Chivas"
                      />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="checkbox" 
                      id="reserveMatch"
                      checked={isReserveMatch} 
                      onChange={e => setIsReserveMatch(e.target.checked)} 
                    />
                    <label htmlFor="reserveMatch" style={{ margin: 0, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                      Marcar como Partido Extra de Reserva (Desempate)
                    </label>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ marginTop: '16px' }}>
                    Agregar Partido
                  </button>
                </form>
              </div>
            )}

            {/* Resultados y Calificación */}
            {activeMatchday && matches.length > 0 && (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3>{activeMatchday.status === 'inactive' ? 'Partidos de la Quiniela' : 'Calificar Partidos'}</h3>
                  {(activeMatchday.status === 'closed' || activeMatchday.status === 'calculated') && (
                    <button 
                      className="btn btn-primary" 
                      onClick={handleCalculatePoints}
                    >
                      <CheckCircle size={15} /> Calcular Aciertos e Histórico
                    </button>
                  )}
                </div>

                {sortedMatches.map((match, idx) => (
                  <div key={match.id} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                    {/* Número y badge */}
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: '36px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>P{idx + 1}</span>
                      {match.is_reserve && <span style={{ fontSize: '0.55rem', color: 'var(--primary)', fontWeight: 'bold' }}>EXTRA</span>}
                    </div>

                    {/* Nombres de equipos */}
                    <div style={{ flex: 1, minWidth: '220px', fontSize: '0.82rem', display: 'grid', gridTemplateColumns: '160px 24px 1fr', alignItems: 'center', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                        {getTeamLogo(match, true) ? <img src={getTeamLogo(match, true)} alt="Home" style={{ width: 16, height: 16, objectFit: 'contain', flexShrink: 0 }} /> : null}
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getTeamName(match, true)}</span>
                      </div>
                      
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center' }}>vs</span>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                        {getTeamLogo(match, false) ? <img src={getTeamLogo(match, false)} alt="Away" style={{ width: 16, height: 16, objectFit: 'contain', flexShrink: 0 }} /> : null}
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getTeamName(match, false)}</span>
                      </div>
                    </div>

                    {/* Botones: solo eliminar si inactiva, calificar si cerrada/calculada */}
                    {activeMatchday?.status === 'inactive' && (
                      <button
                        className="lev-btn"
                        style={{ background: 'var(--danger)', color: 'white', border: 'none' }}
                        onClick={() => handleDeleteMatch(match.id)}
                        title="Eliminar Partido"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    {(activeMatchday?.status === 'closed' || activeMatchday?.status === 'calculated') && (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        <button className={`lev-btn ${match.result === 'L' ? 'selected-l' : ''}`} onClick={() => handleSetMatchResult(match.id, 'L')}>L</button>
                        <button className={`lev-btn ${match.result === 'E' ? 'selected-e' : ''}`} onClick={() => handleSetMatchResult(match.id, 'E')}>E</button>
                        <button className={`lev-btn ${match.result === 'V' ? 'selected-v' : ''}`} onClick={() => handleSetMatchResult(match.id, 'V')}>V</button>
                        <button
                          className="lev-btn"
                          style={{ background: match.result === 'A' ? 'var(--danger)' : 'var(--bg-main)', color: match.result === 'A' ? 'white' : 'var(--danger)', borderColor: 'var(--danger)' }}
                          onClick={() => setConfirmConfig({ title: 'Anular Partido', message: '¿Anular partido? Solo aplica el partido extra como desempate.', onConfirm: () => { handleSetMatchResult(match.id, 'A'); setConfirmConfig(null); } })}
                          title="Anular"
                        >A</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
              </div>
            )}
          </div>
        )}
{/* 8.4 ADMIN: GESTIÓN DE CUENTAS BANCARIAS (Pestaña "admin-bank") */}
        {activeTab === 'admin-bank' && isAdmin && (
          <div>
            <h2 style={{ marginBottom: '16px' }}>Cuentas Bancarias y Contacto</h2>
            
            <div className="card" style={{ marginBottom: '20px', borderLeft: '4px solid #25D366' }}>
              <h4 style={{ marginBottom: '12px', color: '#25D366' }}>Configuración de WhatsApp</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Este número se mostrará a los participantes al finalizar su registro para que envíen su comprobante de pago.
              </p>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Número de WhatsApp (ej. 5512345678)" 
                  value={whatsappConfig} 
                  onChange={(e) => setWhatsappConfig(e.target.value)} 
                  style={{ maxWidth: '300px' }} 
                />
                <button className="btn btn-primary" onClick={() => handleSaveWhatsappConfig(whatsappConfig)} disabled={loading} style={{ background: '#25D366', color: '#fff' }}>
                  Guardar Número
                </button>
              </div>
            </div>

            <div className="card">
              <form onSubmit={handleAddBankAccount} style={{ marginBottom: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '6px' }}>Nombre del Banco</label>
                    <input type="text" placeholder="ej. BBVA, Bancomer..." value={newBankName} onChange={e => setNewBankName(e.target.value)} required className="form-control" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '6px' }}>Titular de la Cuenta</label>
                    <input type="text" placeholder="Nombre completo del titular" value={newAccountHolder} onChange={e => setNewAccountHolder(e.target.value)} required className="form-control" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '6px' }}>No. Tarjeta / Cuenta</label>
                    <input type="text" placeholder="16 dígitos de tarjeta o No. cuenta" value={newAccountNumber} onChange={e => setNewAccountNumber(e.target.value)} className="form-control" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '6px' }}>CLABE Interbancaria</label>
                    <input type="text" placeholder="18 dígitos" value={newClabe} onChange={e => setNewClabe(e.target.value)} className="form-control" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '6px' }}>Tipo de Operación</label>
                    <select
                      value={newAccountType}
                      onChange={e => setNewAccountType(e.target.value as 'transferencia' | 'deposito')}
                      className="form-control"
                      style={{ background: 'var(--bg-main)' }}
                    >
                      <option value="transferencia">Transferencia</option>
                      <option value="deposito">Depósito</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
                  <PlusCircle size={15} /> Añadir Cuenta
                </button>
              </form>



              {bankAccounts.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No hay cuentas bancarias registradas.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                  {bankAccounts.map(bank => (
                    <div key={bank.id} style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '8px', border: `1px solid ${bank.is_active ? 'var(--primary)' : 'var(--border-color)'}` }}>
                      {editingBankId === bank.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <input type="text" value={editBankName} onChange={e => setEditBankName(e.target.value)} className="form-control" placeholder="Banco" />
                          <input type="text" value={editAccountHolder} onChange={e => setEditAccountHolder(e.target.value)} className="form-control" placeholder="Titular" />
                          <input type="text" value={editAccountNumber} onChange={e => setEditAccountNumber(e.target.value)} className="form-control" placeholder="No. Cuenta" />
                          <input type="text" value={editClabe} onChange={e => setEditClabe(e.target.value)} className="form-control" placeholder="CLABE" />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Tipo de operacion</label>
                            <select
                              value={editAccountType}
                              onChange={e => setEditAccountType(e.target.value as 'transferencia' | 'deposito')}
                              className="form-control"
                              style={{ background: 'var(--bg-main)' }}
                            >
                              <option value="transferencia">Transferencia</option>
                              <option value="deposito">Deposito</option>
                            </select>
                          </div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                            <input type="checkbox" checked={editBankActive} onChange={e => setEditBankActive(e.target.checked)} />
                            Cuenta Activa
                          </label>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                            <button className="btn btn-primary" onClick={() => handleUpdateBankAccount(bank.id)} style={{ flex: 1 }}>Guardar</button>
                            <button className="btn btn-secondary" onClick={() => setEditingBankId(null)} style={{ flex: 1 }}>Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <h3 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.1rem' }}>{bank.bank_name}</h3>
                            {!bank.is_active && <span style={{ fontSize: '0.7rem', background: 'var(--border-color)', padding: '2px 6px', borderRadius: '4px' }}>Inactiva</span>}
                          </div>
                          <p style={{ margin: '4px 0', fontSize: '0.9rem' }}><strong>Titular:</strong> {bank.account_holder}</p>
                          {bank.account_type && (
                            <p style={{ margin: '4px 0', fontSize: '0.85rem' }}>
                              <span style={{
                                display: 'inline-block',
                                background: bank.account_type === 'transferencia' ? 'rgba(99,102,241,0.15)' : 'rgba(234,179,8,0.15)',
                                color: bank.account_type === 'transferencia' ? '#818cf8' : '#facc15',
                                padding: '2px 10px', borderRadius: '20px', fontWeight: '700',
                                fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em'
                              }}>
                                {bank.account_type === 'transferencia' ? 'Transferencia' : 'Deposito'}
                              </span>
                            </p>
                          )}
                          {bank.account_number && <p style={{ margin: '4px 0', fontSize: '0.9rem' }}><strong>Cuenta/Tarjeta:</strong> {bank.account_number}</p>}
                          {bank.clabe && <p style={{ margin: '4px 0', fontSize: '0.9rem' }}><strong>CLABE:</strong> {bank.clabe}</p>}
                          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'flex-end' }}>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                              onClick={() => {
                                setEditingBankId(bank.id);
                                setEditBankName(bank.bank_name);
                                setEditAccountHolder(bank.account_holder);
                                setEditAccountNumber(bank.account_number || '');
                                setEditClabe(bank.clabe || '');
                                setEditBankActive(bank.is_active);
                                setEditAccountType(bank.account_type || 'transferencia');
                              }}
                            >
                              <Edit2 size={14} /> Editar
                            </button>
                            <button 
                              className="btn btn-danger" 
                              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                              onClick={() => handleDeleteBankAccount(bank.id)}
                            >
                              <Trash2 size={14} /> Eliminar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {/* 8.5 ADMIN: GESTIÓN DE LIGAS (Pestaña "admin-leagues") */}
        {activeTab === 'admin-leagues' && isAdmin && (
          <div>
            <h2 style={{ marginBottom: '16px' }}>Gestión de Ligas</h2>
            
            <div className="card">
              <form onSubmit={handleAddLeague} style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div className="form-group" style={{ flex: '1 1 200px', margin: 0 }}>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Nombre de la Liga (ej. Premier League)" 
                      value={newLeagueName}
                      onChange={e => setNewLeagueName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ flex: '1 1 150px', margin: 0 }}>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="País (Opcional)" 
                      value={newLeagueCountry}
                      onChange={e => setNewLeagueCountry(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ flex: '2 1 200px', margin: 0 }}>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="URL de Logo Opcional" 
                      value={newLeagueLogoUrl}
                      onChange={e => setNewLeagueLogoUrl(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ flex: '1 1 auto', width: 'auto', whiteSpace: 'nowrap' }}>
                    <PlusCircle size={16} /> Agregar Liga
                  </button>
                </div>
              </form>

              <div style={{ marginBottom: '16px', display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Buscar liga por nombre o país..." 
                  value={leagueSearchTerm}
                  onChange={e => { setLeagueSearchTerm(e.target.value); setLeagueCurrentPage(1); }}
                  style={{ flex: '1 1 100%' }}
                />
              </div>

              {leagues.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No hay ligas registradas aún.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="leaderboard-table" style={{ width: '100%', minWidth: '500px' }}>
                    <thead>
                      <tr>
                        <th>Liga</th>
                        <th>País</th>
                        <th style={{ textAlign: 'right' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const normalizeText = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                        const searchNormalized = normalizeText(leagueSearchTerm);
                        const filtered = leagues.filter(l => {
                          const nameNormalized = normalizeText(l.name);
                          const countryNormalized = l.country ? normalizeText(l.country) : '';
                          return nameNormalized.includes(searchNormalized) || countryNormalized.includes(searchNormalized);
                        });
                        
                        const itemsPerPage = 10;
                        const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
                        const paginated = filtered.slice((leagueCurrentPage - 1) * itemsPerPage, leagueCurrentPage * itemsPerPage);

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan={3} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                                No se encontraron ligas que coincidan con la búsqueda.
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <>
                            {paginated.map(l => {
                              const isEditing = editingLeagueId === l.id;
                              
                              if (isEditing) {
                                return (
                                  <tr key={l.id} style={{ background: 'rgba(255, 255, 255, 0.05)', verticalAlign: 'top' }}>
                                    <td>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <input 
                                          type="text" 
                                          className="form-control" 
                                          value={editLeagueName} 
                                          onChange={e => setEditLeagueName(e.target.value)} 
                                          placeholder="Nombre"
                                          style={{ padding: '8px 12px', height: 'auto', fontSize: '0.85rem' }}
                                        />
                                        <input 
                                          type="text" 
                                          className="form-control" 
                                          value={editLeagueLogoUrl} 
                                          onChange={e => setEditLeagueLogoUrl(e.target.value)} 
                                          placeholder="URL Logo"
                                          style={{ padding: '8px 12px', height: 'auto', fontSize: '0.75rem' }}
                                        />
                                      </div>
                                    </td>
                                    <td>
                                      <input 
                                        type="text" 
                                        className="form-control" 
                                        value={editLeagueCountry} 
                                        onChange={e => setEditLeagueCountry(e.target.value)} 
                                        placeholder="País"
                                        style={{ padding: '8px 12px', height: 'auto', fontSize: '0.85rem' }}
                                      />
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                        <button 
                                          type="button" 
                                          onClick={() => handleUpdateLeague(l.id)}
                                          style={{ background: 'rgba(43, 196, 138, 0.2)', border: 'none', color: '#2bc48a', cursor: 'pointer', padding: '6px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                          title="Guardar"
                                        >
                                          <Check size={16} />
                                        </button>
                                        <button 
                                          type="button" 
                                          onClick={() => setEditingLeagueId(null)}
                                          style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                          title="Cancelar"
                                        >
                                          <X size={16} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              }

                              return (
                                <tr 
                                  key={l.id} 
                                  onDoubleClick={() => {
                                    setEditingLeagueId(l.id);
                                    setEditLeagueName(l.name);
                                    setEditLeagueCountry(l.country || '');
                                    setEditLeagueLogoUrl(l.logo_url || '');
                                  }}
                                  style={{ cursor: 'pointer' }}
                                  title="Doble clic para editar"
                                >
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      {l.logo_url && (
                                        <img 
                                          src={l.logo_url} 
                                          alt="" 
                                          style={{ width: '24px', height: '24px', objectFit: 'contain' }}
                                          onError={(e) => e.currentTarget.style.display = 'none'}
                                        />
                                      )}
                                      <span style={{ fontWeight: '600', color: 'white' }}>{l.name}</span>
                                    </div>
                                  </td>
                                  <td>
                                    {l.country ? <span style={{ color: 'var(--text-secondary)' }}>{l.country}</span> : '-'}
                                  </td>
                                  <td style={{ textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                      <button 
                                        type="button" 
                                        onClick={() => {
                                          setEditingLeagueId(l.id);
                                          setEditLeagueName(l.name);
                                          setEditLeagueCountry(l.country || '');
                                          setEditLeagueLogoUrl(l.logo_url || '');
                                        }}
                                        style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', padding: '6px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        title="Editar Liga"
                                      >
                                        <Edit2 size={16} />
                                      </button>
                                      <button 
                                        type="button" 
                                        onClick={() => handleDeleteLeague(l.id)}
                                        style={{ background: 'var(--danger)', border: 'none', color: 'white', cursor: 'pointer', padding: '6px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        title="Eliminar Liga"
                                      >
                                        <X size={16} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                            {totalPages > 1 && (
                              <tr>
                                <td colSpan={3} style={{ padding: '16px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px' }}>
                                    <button 
                                      className="btn btn-secondary" 
                                      disabled={leagueCurrentPage === 1}
                                      onClick={() => setLeagueCurrentPage(prev => Math.max(1, prev - 1))}
                                      style={{ padding: '4px 12px' }}
                                    >Anterior</button>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                      Página {leagueCurrentPage} de {totalPages}
                                    </span>
                                    <button 
                                      className="btn btn-secondary" 
                                      disabled={leagueCurrentPage === totalPages}
                                      onClick={() => setLeagueCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                      style={{ padding: '4px 12px' }}
                                    >Siguiente</button>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 9. ADMIN: GESTIÓN DE EQUIPOS (Pestaña "admin-teams") */}
        {activeTab === 'admin-teams' && isAdmin && (
          <div>
            <h2 style={{ marginBottom: '16px' }}>Gestión de Equipos</h2>
            
            {/* Gestión de Equipos */}
            <div className="card">
              <h3>Administrar Equipos ({teams.length})</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '12px' }}>
                Registra los equipos que participarán en el torneo para poder seleccionarlos al crear partidos.
              </p>
              
              <form onSubmit={handleAddTeam} style={{ marginTop: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Nombre del Equipo (ej. América)" 
                      value={newTeamName}
                      onChange={e => setNewTeamName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Código (ej. AME)" 
                      value={newTeamCode}
                      onChange={e => setNewTeamCode(e.target.value.toUpperCase())}
                      maxLength={3}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <select 
                      className="form-control" 
                      value={newTeamLeagueId}
                      onChange={e => setNewTeamLeagueId(e.target.value)}
                    >
                      <option value="">Selecciona una Liga...</option>
                      {leagues.map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="URL de Logo Opcional (https://...)" 
                      value={newTeamLogoUrl}
                      onChange={e => setNewTeamLogoUrl(e.target.value)}
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
                  <PlusCircle size={16} /> Agregar Equipo
                </button>
              </form>

              {/* Filtros de Búsqueda */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Buscar por nombre o código..." 
                  value={teamSearchTerm}
                  onChange={e => { setTeamSearchTerm(e.target.value); setTeamCurrentPage(1); }}
                  style={{ flex: '2 1 200px' }}
                />
                <select 
                  className="form-control" 
                  value={teamLeagueFilter}
                  onChange={e => { setTeamLeagueFilter(e.target.value); setTeamCurrentPage(1); }}
                  style={{ flex: '1 1 150px' }}
                >
                  <option value="">Todas las ligas</option>
                  <option value="none">Sin liga</option>
                  {leagues.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              {teams.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No hay equipos registrados aún.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="leaderboard-table" style={{ width: '100%', minWidth: '500px' }}>
                    <thead>
                      <tr>
                        <th>Equipo</th>
                        <th>Código</th>
                        <th>Liga</th>
                        <th style={{ textAlign: 'right' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const normalizeText = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                        const searchNormalized = normalizeText(teamSearchTerm);
                        const filtered = teams.filter(t => {
                          const nameNormalized = normalizeText(t.name);
                          const codeNormalized = t.code ? normalizeText(t.code) : '';
                          const matchSearch = nameNormalized.includes(searchNormalized) || codeNormalized.includes(searchNormalized);
                          const matchLeague = teamLeagueFilter === '' ? true : (teamLeagueFilter === 'none' ? !t.league_id : t.league_id === teamLeagueFilter);
                          return matchSearch && matchLeague;
                        });
                        
                        const itemsPerPage = 10;
                        const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
                        const paginated = filtered.slice((teamCurrentPage - 1) * itemsPerPage, teamCurrentPage * itemsPerPage);

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                                No se encontraron equipos que coincidan con la búsqueda.
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <>
                            {paginated.map(t => {
                              const isEditing = editingTeamId === t.id;
                              
                              if (isEditing) {
                                return (
                                  <tr key={t.id} style={{ background: 'rgba(255, 255, 255, 0.05)', verticalAlign: 'top' }}>
                                    <td>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <input 
                                          type="text" 
                                          className="form-control" 
                                          value={editTeamName} 
                                          onChange={e => setEditTeamName(e.target.value)} 
                                          placeholder="Nombre"
                                          style={{ padding: '8px 12px', height: 'auto', fontSize: '0.85rem' }}
                                        />
                                        <input 
                                          type="text" 
                                          className="form-control" 
                                          value={editTeamLogoUrl} 
                                          onChange={e => setEditTeamLogoUrl(e.target.value)} 
                                          placeholder="URL Logo"
                                          style={{ padding: '8px 12px', height: 'auto', fontSize: '0.75rem' }}
                                        />
                                      </div>
                                    </td>
                                    <td>
                                      <input 
                                        type="text" 
                                        className="form-control" 
                                        value={editTeamCode} 
                                        onChange={e => setEditTeamCode(e.target.value.toUpperCase())} 
                                        maxLength={3}
                                        style={{ width: '60px', padding: '8px 12px', height: 'auto', fontSize: '0.85rem', textAlign: 'center' }}
                                      />
                                    </td>
                                    <td>
                                      <select 
                                        className="form-control" 
                                        value={editTeamLeagueId} 
                                        onChange={e => setEditTeamLeagueId(e.target.value)}
                                        style={{ padding: '8px 12px', height: 'auto', fontSize: '0.85rem' }}
                                      >
                                        <option value="">Sin liga</option>
                                        {leagues.map(l => (
                                          <option key={l.id} value={l.id}>{l.name}</option>
                                        ))}
                                      </select>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                        <button 
                                          type="button" 
                                          onClick={() => handleUpdateTeam(t.id)}
                                          style={{ background: 'rgba(43, 196, 138, 0.2)', border: 'none', color: '#2bc48a', cursor: 'pointer', padding: '6px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                          title="Guardar"
                                        >
                                          <Check size={16} />
                                        </button>
                                        <button 
                                          type="button" 
                                          onClick={() => setEditingTeamId(null)}
                                          style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                          title="Cancelar"
                                        >
                                          <X size={16} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              }

                              return (
                                <tr 
                                  key={t.id} 
                                  onDoubleClick={() => {
                                    setEditingTeamId(t.id);
                                    setEditTeamName(t.name);
                                    setEditTeamCode(t.code || '');
                                    setEditTeamLeagueId(t.league_id || '');
                                    setEditTeamLogoUrl(t.logo_url || '');
                                  }}
                                  style={{ cursor: 'pointer' }}
                                  title="Doble clic para editar"
                                >
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      {t.logo_url && (
                                        <img 
                                          src={t.logo_url} 
                                          alt="" 
                                          style={{ width: '24px', height: '24px', objectFit: 'contain' }}
                                          onError={(e) => e.currentTarget.style.display = 'none'}
                                        />
                                      )}
                                      <span style={{ fontWeight: '600', color: 'white' }}>{t.name}</span>
                                    </div>
                                  </td>
                                  <td>
                                    {t.code ? <span style={{ color: 'var(--text-secondary)' }}>{t.code}</span> : '-'}
                                  </td>
                                  <td>
                                    {t.leagues?.name ? (
                                      <span style={{ fontSize: '0.8rem', color: 'white', backgroundColor: '#2b5c3a', padding: '8px 12px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                                        {t.leagues.name}
                                      </span>
                                    ) : (
                                      <span style={{ color: 'var(--text-muted)' }}>-</span>
                                    )}
                                  </td>
                                  <td style={{ textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                      <button 
                                        type="button" 
                                        onClick={() => {
                                          setEditingTeamId(t.id);
                                          setEditTeamName(t.name);
                                          setEditTeamCode(t.code || '');
                                          setEditTeamLeagueId(t.league_id || '');
                                          setEditTeamLogoUrl(t.logo_url || '');
                                        }}
                                        style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', padding: '6px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        title="Editar Equipo"
                                      >
                                        <Edit2 size={16} />
                                      </button>
                                      <button 
                                        type="button" 
                                        onClick={() => handleDeleteTeam(t.id)}
                                        style={{ background: 'var(--danger)', border: 'none', color: 'white', cursor: 'pointer', padding: '6px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        title="Eliminar Equipo"
                                      >
                                        <X size={16} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                            {totalPages > 1 && (
                              <tr>
                                <td colSpan={4} style={{ padding: '16px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px' }}>
                                    <button 
                                      className="btn btn-secondary" 
                                      disabled={teamCurrentPage === 1}
                                      onClick={() => setTeamCurrentPage(prev => Math.max(1, prev - 1))}
                                      style={{ padding: '4px 12px' }}
                                    >Anterior</button>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                      Página {teamCurrentPage} de {totalPages}
                                    </span>
                                    <button 
                                      className="btn btn-secondary" 
                                      disabled={teamCurrentPage === totalPages}
                                      onClick={() => setTeamCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                      style={{ padding: '4px 12px' }}
                                    >Siguiente</button>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

                {/* 7. ADMIN: PARTICIPANTES Y COMUNICACIÓN (Pestaña "admin-participants") */}
        {activeTab === 'admin-participants' && isAdmin && (() => {
          const filteredParticipants = participants.filter(p => 
            p.name.toLowerCase().includes(searchParticipant.toLowerCase()) || 
            p.alias.toLowerCase().includes(searchParticipant.toLowerCase()) ||
            p.phone.includes(searchParticipant)
          );

          return (
          <div>
            <h2 style={{ marginBottom: '16px' }}>Directorio de Participantes</h2>

            {lastCalculatedMatchday && lastWinners.length > 0 && (
              <div className="card" style={{ marginBottom: '20px', borderTop: '4px solid #F59E0B' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#F59E0B' }}>
                  <Trophy size={18} /> Podio de la Última Quiniela (N° {lastCalculatedMatchday.number})
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '16px' }}>
                  {lastWinners.map((winner, idx) => (
                    <div key={winner.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
                      <div style={{ 
                        width: '32px', height: '32px', borderRadius: '50%', 
                        background: idx === 0 ? '#F59E0B' : idx === 1 ? '#94A3B8' : '#B45309',
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                      }}>
                        {idx + 1}
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', color: 'white' }}>{winner.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>@{winner.alias} • {winner.score} aciertos</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <h3>Participantes Registrados ({participants.length})</h3>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Buscar por nombre, alias o teléfono..." 
                  value={searchParticipant}
                  onChange={e => {
                    setSearchParticipant(e.target.value);
                    setCurrentPageParticipants(1);
                  }}
                  style={{ maxWidth: '300px' }}
                />
              </div>
              
              <div style={{ overflowX: 'auto' }}>
                <table className="leaderboard-table" style={{ marginTop: '10px', minWidth: '600px' }}>
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Alias</th>
                      <th>WhatsApp</th>
                      <th style={{ textAlign: 'center' }}>Contacto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParticipants.length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No se encontraron participantes.</td></tr>
                    ) : (
                      filteredParticipants.map(p => (
                        <tr key={p.id}>
                          <td style={{ color: 'white', fontWeight: '600' }}>{p.name}</td>
                          <td>@{p.alias}</td>
                          <td>{p.phone}</td>
                          <td style={{ textAlign: 'center' }}>
                            <a 
                              href={`https://wa.me/${p.phone.replace(/[^0-9]/g, '')}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="btn"
                              style={{ 
                                background: 'rgba(37, 211, 102, 0.1)', 
                                color: '#25D366', 
                                border: '1px solid #25D366', 
                                padding: '6px 12px', 
                                fontSize: '0.8rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                textDecoration: 'none'
                              }}
                            >
                              <MessageCircle size={14} /> Mensaje
                            </a>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                </div>
                {filteredParticipants.length > 10 && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '16px', padding: '10px' }}>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '8px 16px' }}
                      disabled={currentPageParticipants === 1}
                      onClick={() => setCurrentPageParticipants(prev => Math.max(prev - 1, 1))}
                    >
                      Anterior
                    </button>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      Página {currentPageParticipants} de {totalPagesParticipants}
                    </span>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '8px 16px' }}
                      disabled={currentPageParticipants >= totalPagesParticipants}
                      onClick={() => setCurrentPageParticipants(prev => Math.min(prev + 1, totalPagesParticipants))}
                    >
                      Siguiente
                    </button>
                  </div>
                )}
              </div>
          </div>
          );
        })()}

        {/* 8. ADMIN: DASHBOARD FINANCIERO Y VENTAS (Pestaña "admin-dashboard") */}
        {activeTab === 'admin-dashboard' && isAdmin && (() => {
          // Filtrar apuestas según la quiniela seleccionada
          const poolsToUse = selectedFinMatchdayId === 'all'
            ? financialPools
            : financialPools.filter(p => p.matchday_id === selectedFinMatchdayId);

          const approvedPools = poolsToUse.filter(p => p.payment_status === 'approved');
          const pendingPools = poolsToUse.filter(p => p.payment_status === 'pending');
          const rejectedPools = poolsToUse.filter(p => p.payment_status === 'rejected');

          const totalApprovedAmount = approvedPools.reduce((acc, curr) => acc + Number(curr.cost), 0);
          const totalPendingAmount = pendingPools.reduce((acc, curr) => acc + Number(curr.cost), 0);
          
          let prizePoolAmount = 0;
          let houseProfitAmount = 0;

          if (selectedFinMatchdayId === 'all') {
            const poolsByMatchday: Record<string, typeof approvedPools> = {};
            approvedPools.forEach(p => {
              if (!poolsByMatchday[p.matchday_id]) {
                poolsByMatchday[p.matchday_id] = [];
              }
              poolsByMatchday[p.matchday_id].push(p);
            });

            financialMatchdays.forEach(m => {
              const mPools = poolsByMatchday[m.id] || [];
              const mGross = mPools.reduce((acc, curr) => acc + Number(curr.cost), 0);
              
              let mPrize = 0;
              if (m.prize_type === 'fixed') {
                mPrize = Number(m.fixed_prize_1st || 0);
              } else {
                const percent = m.prize_percentage !== undefined && m.prize_percentage !== null ? Number(m.prize_percentage) : 80;
                mPrize = mGross * (percent / 100);
              }
              prizePoolAmount += mPrize;
              houseProfitAmount += (mGross - mPrize);
            });
          } else {
            const m = financialMatchdays.find(md => md.id === selectedFinMatchdayId);
            if (m) {
              if (m.prize_type === 'fixed') {
                prizePoolAmount = Number(m.fixed_prize_1st || 0);
                houseProfitAmount = totalApprovedAmount - prizePoolAmount;
              } else {
                const percent = m.prize_percentage !== undefined && m.prize_percentage !== null ? Number(m.prize_percentage) : 80;
                prizePoolAmount = totalApprovedAmount * (percent / 100);
                houseProfitAmount = totalApprovedAmount - prizePoolAmount;
              }
            } else {
              prizePoolAmount = totalApprovedAmount * (prizePercentage / 100);
              houseProfitAmount = totalApprovedAmount - prizePoolAmount;
            }
          }

          // Calcular datos de rentabilidad / punto de equilibrio
          const currentFinMatchday = selectedFinMatchdayId === 'all'
            ? null
            : financialMatchdays.find(md => md.id === selectedFinMatchdayId);
            
          const isFixed = selectedFinMatchdayId === 'all'
            ? financialMatchdays.some(m => m.prize_type === 'fixed')
            : (currentFinMatchday ? currentFinMatchday.prize_type === 'fixed' : false);
            
          const pricePerEntry = currentFinMatchday 
            ? Number(currentFinMatchday.price_per_entry || 25) 
            : (financialMatchdays[0] ? Number(financialMatchdays[0].price_per_entry || 25) : 25);
            
          const targetPrize = prizePoolAmount; // Bolsa de premios
          const breakEvenCount = pricePerEntry > 0 ? Math.ceil(targetPrize / pricePerEntry) : 0;
          const approvedCount = approvedPools.length;
          const percentOfBreakEven = breakEvenCount > 0 ? Math.min(100, Math.round((approvedCount / breakEvenCount) * 100)) : 100;
          const netProfit = totalApprovedAmount - targetPrize;

          // Filtrar participantes según búsqueda
          const filteredParticipants = participants.filter(p => {
            const query = finSearchQuery.toLowerCase();
            return p.name.toLowerCase().includes(query) || p.alias.toLowerCase().includes(query);
          });

          return (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <h2>Ventas y Análisis Financiero</h2>
                <button 
                  className="btn btn-primary" 
                  style={{ width: 'auto', gap: '8px' }} 
                  onClick={handleExportGlobalFinancialPDF}
                >
                  <FileText size={18} /> Exportar Reporte Global PDF
                </button>
              </div>

              {/* Filtros */}
              <div className="card" style={{ padding: '16px', display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                <div style={{ flex: '1 1 200px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Filtrar por Quiniela
                  </label>
                  <select 
                    className="form-control" 
                    value={selectedFinMatchdayId} 
                    onChange={e => setSelectedFinMatchdayId(e.target.value)}
                  >
                    <option value="all">Todas las Quinielas</option>
                    {financialMatchdays.map(m => (
                      <option key={m.id} value={m.id}>Quiniela {m.number} ({m.status.toUpperCase()})</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: '1 1 200px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Porcentaje para Premios ({prizePercentage}%)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={prizePercentage} 
                      onChange={e => setPrizePercentage(Number(e.target.value))}
                      style={{ flex: 1, accentColor: 'var(--primary)' }}
                    />
                    <input 
                      type="number" 
                      min="0" 
                      max="100" 
                      className="form-control" 
                      style={{ width: '70px', padding: '8px 12px' }}
                      value={prizePercentage} 
                      onChange={e => setPrizePercentage(Math.min(100, Math.max(0, Number(e.target.value))))}
                    />
                  </div>
                </div>
              </div>

              {/* Grid de Métricas */}
              <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div className="card metric-card" style={{ margin: 0, padding: '16px', background: 'rgba(30, 94, 58, 0.4)', borderColor: 'rgba(224, 184, 40, 0.4)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Ingreso Aprobado</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--primary)', marginTop: '4px' }}>
                    ${formatMoney(totalApprovedAmount)} MXN
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>
                    {approvedPools.length} quinielas aprobadas
                  </span>
                </div>

                <div className="card metric-card" style={{ margin: 0, padding: '16px', background: 'rgba(30, 94, 58, 0.2)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Monto en Revisión</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#ffb300', marginTop: '4px' }}>
                    ${formatMoney(totalPendingAmount)} MXN
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>
                    {pendingPools.length} transacciones pendientes
                  </span>
                </div>

                <div className="card metric-card" style={{ margin: 0, padding: '16px', background: 'rgba(30, 94, 58, 0.2)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Bolsa de Premios</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--primary)', marginTop: '4px' }}>
                    ${formatMoney(prizePoolAmount)} MXN
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>
                    Destinado a ganadores
                  </span>
                </div>

                <div className="card metric-card" style={{ margin: 0, padding: '16px', background: 'rgba(30, 94, 58, 0.2)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Utilidad Estimada</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#10b981', marginTop: '4px' }}>
                    ${formatMoney(houseProfitAmount)} MXN
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>
                    Ganancia de la casa
                  </span>
                </div>
              </div>

              {/* Barra de progreso de ventas */}
              <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: '600', marginBottom: '6px' }}>
                  <span>Progreso de Recaudación (Aprobado vs Pendiente)</span>
                  <span>{((totalApprovedAmount / (totalApprovedAmount + totalPendingAmount || 1)) * 100).toFixed(0)}% Aprobado</span>
                </div>
                <div className="progress-bar-container" style={{ width: '100%', height: '10px', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '5px', overflow: 'hidden', display: 'flex' }}>
                  <div className="progress-bar" style={{ width: `${(totalApprovedAmount / (totalApprovedAmount + totalPendingAmount || 1)) * 100}%`, height: '100%', background: 'var(--primary)' }}></div>
                  <div className="progress-bar-pending" style={{ width: `${(totalPendingAmount / (totalApprovedAmount + totalPendingAmount || 1)) * 100}%`, height: '100%', background: '#ffb300' }}></div>
                </div>
                <div style={{ display: 'flex', gap: '15px', marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ display: 'inline-block', width: '8px', height: '8px', background: 'var(--primary)', borderRadius: '50%' }}></span>
                    Aprobado: ${formatMoney(totalApprovedAmount)} MXN
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#ffb300', borderRadius: '50%' }}></span>
                    Pendiente: ${totalPendingAmount.toFixed(2)} MXN
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ display: 'inline-block', width: '8px', height: '8px', background: 'var(--danger)', borderRadius: '50%' }}></span>
                    Rechazado: {rejectedPools.length} quinielas
                  </span>
                </div>
              </div>

              {/* Barra de Rentabilidad / Punto de Equilibrio */}
              {isFixed && targetPrize > 0 && (
                <div className="card" style={{ padding: '16px', marginBottom: '16px', background: 'rgba(30, 94, 58, 0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: '700', marginBottom: '8px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <TrendingUp size={16} style={{ color: netProfit >= 0 ? '#10b981' : '#ef4444' }} />
                      Rentabilidad de la Quiniela (Meta: {breakEvenCount} Quinielas para cubrir la Bolsa)
                    </span>
                    <span style={{ color: netProfit >= 0 ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                      {netProfit >= 0 ? `Ganancia: +$${formatMoney(netProfit)} MXN` : `Faltan: $${formatMoney(Math.abs(netProfit))} MXN`}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    <span>Vendidas: {approvedCount} / {breakEvenCount}</span>
                    <span>{percentOfBreakEven}% cubierto</span>
                  </div>

                  <div className="progress-bar-container" style={{ width: '100%', height: '12px', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '6px', overflow: 'hidden' }}>
                    <div 
                      className="progress-bar" 
                      style={{ 
                        width: `${percentOfBreakEven}%`, 
                        height: '100%', 
                        background: netProfit >= 0 
                          ? 'linear-gradient(90deg, #10b981, #25D366)' 
                          : 'linear-gradient(90deg, #ef4444, #ffb300)',
                        transition: 'width 0.3s ease'
                      }}
                    ></div>
                  </div>
                  
                  {netProfit >= 0 ? (
                    <p style={{ margin: '8px 0 0 0', fontSize: '0.75rem', color: '#10b981', fontWeight: '600' }}>
                      🎉 ¡Punto de equilibrio superado! La quiniela es rentable.
                    </p>
                  ) : (
                    <p style={{ margin: '8px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Se necesitan vender {breakEvenCount - approvedCount} quinielas más para cubrir la bolsa de premios de ${formatMoney(targetPrize)} MXN.
                    </p>
                  )}
                </div>
              )}

              {/* Desglose de Ventas por Quiniela */}
              {selectedFinMatchdayId === 'all' && (
                <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
                  <h3>Desglose de Ventas por Quiniela</h3>
                  <div style={{ overflowX: 'auto', marginTop: '12px' }}>
                    <table className="leaderboard-table" style={{ minWidth: '500px' }}>
                      <thead>
                        <tr>
                          <th>Quiniela</th>
                          <th>Estado</th>
                          <th>Aprobadas</th>
                          <th>Pendientes</th>
                          <th>Ingreso Aprobado</th>
                          <th>Bolsa de Premios</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {financialMatchdays.map(md => {
                          const mdPools = financialPools.filter(p => p.matchday_id === md.id);
                          const appCount = mdPools.filter(p => p.payment_status === 'approved').length;
                          const penCount = mdPools.filter(p => p.payment_status === 'pending').length;
                          const appAmount = mdPools.filter(p => p.payment_status === 'approved').reduce((acc, curr) => acc + Number(curr.cost), 0);
                          const prizeAmount = appAmount * (prizePercentage / 100);

                          return (
                            <tr key={md.id}>
                              <td style={{ color: 'white', fontWeight: '700' }}>Quiniela {md.number}</td>
                              <td>
                                <span style={{ 
                                  fontSize: '0.75rem', 
                                  padding: '2px 6px', 
                                  borderRadius: '4px',
                                  background: md.status === 'active' ? 'rgba(224, 184, 40, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                  color: md.status === 'active' ? 'var(--primary)' : 'var(--text-muted)'
                                }}>
                                  {md.status.toUpperCase()}
                                </span>
                              </td>
                              <td>{appCount}</td>
                              <td>{penCount}</td>
                              <td style={{ color: 'var(--primary)', fontWeight: '600' }}>${appAmount.toFixed(2)}</td>
                              <td>${prizeAmount.toFixed(2)}</td>
                              <td>
                                <button 
                                  className="btn btn-primary" 
                                  style={{ width: 'auto', padding: '8px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                  onClick={() => handleExportMatchdayPredictionsPDF(md.id)}
                                >
                                  <FileText size={12} /> Pronósticos
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Listado de Clientes y Estados de Cuenta */}
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                  <h3>Detalle por Participante</h3>
                  <input 
                    type="text" 
                    placeholder="Buscar participante..." 
                    className="form-control" 
                    style={{ width: '220px', padding: '6px 12px', fontSize: '0.85rem' }}
                    value={finSearchQuery}
                    onChange={e => setFinSearchQuery(e.target.value)}
                  />
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table className="leaderboard-table" style={{ minWidth: '600px' }}>
                    <thead>
                      <tr>
                        <th>Participante</th>
                        <th>Alias</th>
                        <th>Quinielas (A/P)</th>
                        <th>Total Aprobado</th>
                        <th>Total Pendiente</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredParticipants.map(p => {
                        const userPools = selectedFinMatchdayId === 'all'
                          ? financialPools.filter(pool => pool.participant_id === p.id)
                          : financialPools.filter(pool => pool.participant_id === p.id && pool.matchday_id === selectedFinMatchdayId);
                        
                        const userApp = userPools.filter(pool => pool.payment_status === 'approved');
                        const userPen = userPools.filter(pool => pool.payment_status === 'pending');
                        const totalSpent = userApp.reduce((acc, curr) => acc + Number(curr.cost), 0);
                        const totalPending = userPen.reduce((acc, curr) => acc + Number(curr.cost), 0);
                        const isExpanded = expandedParticipantId === p.id;

                        return (
                          <React.Fragment key={p.id}>
                            <tr>
                              <td style={{ color: 'white', fontWeight: '600' }}>{p.name}</td>
                              <td>@{p.alias}</td>
                              <td>{userApp.length} / {userPen.length}</td>
                              <td style={{ color: 'var(--primary)', fontWeight: '600' }}>${totalSpent.toFixed(2)}</td>
                              <td style={{ color: '#ffb300' }}>${totalPending.toFixed(2)}</td>
                              <td>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button 
                                    className="btn btn-primary" 
                                    style={{ width: 'auto', padding: '8px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                    onClick={() => handleExportParticipantStatementPDF(p, userPools)}
                                  >
                                    <FileText size={12} /> PDF
                                  </button>
                                  <button 
                                    className="btn" 
                                    style={{ 
                                      width: 'auto', 
                                      padding: '8px 12px', 
                                      fontSize: '0.75rem', 
                                      background: 'rgba(255,255,255,0.08)', 
                                      color: 'white', 
                                      border: '1px solid var(--border-color)',
                                      cursor: 'pointer'
                                    }}
                                    onClick={() => setExpandedParticipantId(isExpanded ? null : p.id)}
                                  >
                                    {isExpanded ? 'Ocultar' : 'Ver Detalle'}
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Fila desplegable con detalle de apuestas */}
                            {isExpanded && (
                              <tr>
                                <td colSpan={6} style={{ padding: '0px', background: 'rgba(0,0,0,0.15)' }}>
                                  <div style={{ padding: '12px 16px', borderLeft: '3px solid var(--primary)' }}>
                                    <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '8px', color: 'var(--primary)' }}>
                                      Historial de Compras de {p.name}
                                    </h4>
                                    {userPools.length === 0 ? (
                                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No registra apuestas en esta selección.</p>
                                    ) : (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {userPools.map((pool, index) => {
                                          const matchdayNum = financialMatchdays.find(m => m.id === pool.matchday_id)?.number || 'N/A';
                                          return (
                                            <div 
                                              key={pool.id} 
                                              style={{ 
                                                display: 'flex', 
                                                justifyContent: 'space-between', 
                                                alignItems: 'center', 
                                                padding: '6px 12px', 
                                                background: 'rgba(255,255,255,0.03)', 
                                                border: '1px solid rgba(255,255,255,0.05)',
                                                borderRadius: '4px',
                                                fontSize: '0.75rem' 
                                              }}
                                            >
                                              <span><strong>Apuesta #{index + 1}</strong> (Quiniela {matchdayNum})</span>
                                              <span>Registrada: {new Date(pool.created_at).toLocaleDateString()}</span>
                                              <span>Monto: ${Number(pool.cost).toFixed(2)} MXN</span>
                                              <span>Puntos: {pool.score} pts</span>
                                              <span style={{ 
                                                fontWeight: '700', 
                                                color: pool.payment_status === 'approved' ? 'var(--primary)' : pool.payment_status === 'pending' ? '#ffb300' : 'var(--danger)'
                                              }}>
                                                {pool.payment_status === 'approved' ? 'APROBADO' : pool.payment_status === 'pending' ? (pool.payment_receipt_url ? 'EN REVISIÓN' : 'PENDIENTE') : 'RECHAZADO'}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}

        {/* VERIFICACIÓN PÚBLICA DE PAGOS (Pestaña "verify-payment") */}
        {activeTab === 'verify-payment' && (
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ marginBottom: '16px' }}>
              <button 
                className="btn" 
                onClick={() => {
                  setActiveTab('predictions');
                  setShowSuccessScreen(false);
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"></path><polyline points="12 19 5 12 12 5"></polyline></svg>
                Volver
              </button>
            </div>
            
            <div className="card" style={{ padding: '30px' }}>
              <h2 style={{ color: 'var(--primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Shield size={24} /> Verificar Quinielas
              </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Ingresa tu código de referencia para verificar el estatus de tus quinielas y subir tu comprobante de pago.
            </p>

            <form onSubmit={handleVerifySearch} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '30px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Ej. REF-ABC123"
                value={verifyCode}
                onChange={e => {
                  const val = e.target.value.toUpperCase();
                  setVerifyCode(val);
                  localStorage.setItem('lastReferenceCode', val);
                }}
                style={{ width: '100%', fontSize: '1.1rem', padding: '12px', textAlign: 'center', letterSpacing: '1px' }}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '12px' }} disabled={verifyLoading}>
                {verifyLoading ? 'Buscando...' : 'Buscar'}
              </button>
            </form>

            {verifyResults.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Resultados para {verifyCode}</h3>
                
                {verifyResults.map((pool, idx) => (
                  <div key={pool.id} style={{ 
                    background: 'rgba(255,255,255,0.03)', 
                    border: '1px solid rgba(255,255,255,0.05)', 
                    borderRadius: 'var(--radius-md)', 
                    padding: '16px' 
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>Quiniela {idx + 1} de {pool.participant?.name || 'Usuario'}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Costo: ${pool.cost}</div>
                      </div>
                      <span className={`status-badge ${pool.payment_status}`}>
                        {pool.payment_status === 'approved' ? 'Aprobado' : pool.payment_status === 'pending' ? (pool.payment_receipt_url ? 'En Revisión' : 'Pendiente') : 'Rechazado'}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Bloque único para subir comprobante si hay pendientes o rechazados */}
                {verifyResults.some(p => p.payment_status !== 'approved') && (() => {
                  const currentAttempts = parseInt(localStorage.getItem(`upload_attempts_${verifyResults[0].reference_code || verifyCode}`) || '0', 10);
                  
                  if (currentAttempts >= 2 && verifyResults.some(p => p.payment_receipt_url)) {
                    return (
                      <div style={{ marginTop: '20px', background: 'rgba(234, 179, 8, 0.1)', padding: '24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--warning)', textAlign: 'center' }}>
                        <AlertTriangle size={24} style={{ color: 'var(--warning)', marginBottom: '12px' }} />
                        <h4 style={{ color: 'var(--warning)', marginBottom: '8px' }}>Límite de intentos alcanzado</h4>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Ya has subido un comprobante 2 veces. Si tu comprobante sigue siendo rechazado, por favor contacta al administrador directamente.</p>
                      </div>
                    );
                  }

                  return (
                    <div style={{ marginTop: '20px', background: 'rgba(0,0,0,0.2)', padding: '24px', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)' }}>
                      <h4 style={{ marginBottom: '16px', fontSize: '1.05rem', textAlign: 'center' }}>Sube 1 comprobante para todo este bloque</h4>
                      
                      {verifyingPoolId === 'uploading' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div className="file-upload-wrapper">
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="file-upload-input"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleFileSelection(e.target.files[0], verifyResults[0].reference_code || verifyCode);
                              }
                            }}
                          />
                          <div className="file-upload-display" style={{ padding: verifyReceiptFile ? '8px 16px' : '16px' }}>
                            {verifyAnalysisStatus === 'analyzing' ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', justifyContent: 'center' }}>
                                <RefreshCw size={20} className="spin" style={{ color: 'var(--primary)' }} />
                                <span>{verifyAnalysisMessage}</span>
                              </div>
                            ) : verifyReceiptFile ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%' }}>
                                <img 
                                  src={URL.createObjectURL(verifyReceiptFile)} 
                                  alt="Preview" 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setViewReceiptUrl(URL.createObjectURL(verifyReceiptFile));
                                  }}
                                  style={{ 
                                    width: '50px', 
                                    height: '50px', 
                                    objectFit: 'cover', 
                                    borderRadius: 'var(--radius-sm)', 
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    position: 'relative',
                                    zIndex: 3,
                                    cursor: 'zoom-in'
                                  }} 
                                />
                                <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  <div style={{ fontWeight: '600' }}>{verifyReceiptFile.name}</div>
                                  <div style={{ fontSize: '0.8rem', color: 'var(--accent)', marginTop: '2px' }}>Toca aquí para cambiar</div>
                                </div>
                              </div>
                            ) : (
                              <>
                                <ImageIcon size={20} style={{ color: 'var(--text-secondary)' }} />
                                <span>Seleccionar imagen o captura</span>
                              </>
                            )}
                          </div>
                        </div>

                        {verifyAnalysisStatus === 'warning' && (
                          <div style={{ padding: '12px', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid var(--warning)', borderRadius: 'var(--radius-sm)', color: 'var(--warning)', fontSize: '0.9rem', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                            <div>{verifyAnalysisMessage}</div>
                          </div>
                        )}
                        {verifyAnalysisStatus === 'success' && (
                          <div style={{ padding: '12px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid var(--success)', borderRadius: 'var(--radius-sm)', color: 'var(--success)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <CheckCircle size={18} style={{ flexShrink: 0 }} />
                            <div>{verifyAnalysisMessage}</div>
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button 
                            className="btn" 
                            style={{ flex: 1 }}
                            onClick={() => { setVerifyingPoolId(null); setVerifyReceiptFile(null); setVerifyAnalysisStatus('idle'); }}
                            disabled={verifyLoading || verifyAnalysisStatus === 'analyzing'}
                          >
                            Cancelar
                          </button>
                          <button 
                            className="btn btn-primary" 
                            style={{ flex: 1 }}
                            onClick={() => handleVerifyUpload(verifyResults[0].reference_code || verifyCode)}
                            disabled={verifyLoading || !verifyReceiptFile || verifyAnalysisStatus === 'analyzing'}
                          >
                            {verifyLoading ? 'Subiendo...' : 'Confirmar y Subir'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        className="btn btn-primary" 
                        style={{ width: '100%', padding: '12px' }}
                        onClick={() => setVerifyingPoolId('uploading')}
                      >
                        <Upload size={18} style={{ marginRight: '8px' }} /> Adjuntar Voucher del Banco
                      </button>
                    )}
                    {verifyResults.some(p => p.payment_receipt_url) && verifyingPoolId !== 'uploading' && (
                      <div style={{ marginTop: '16px', fontSize: '0.85rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <CheckCircle size={16} /> Ya enviaste un comprobante. Puedes reemplazarlo si fue rechazado.
                      </div>
                    )}
                  </div>
                );
                })()}
              </div>
            )}
          </div>
          </div>
        )}
        {/* Footer */}
        <footer style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <span>© {new Date().getFullYear()} La Carmelita. Todos los derechos reservados.</span>
          <div style={{ cursor: 'pointer', padding: '10px', opacity: 0.15 }} onClick={async () => { 
            if (currentUser) { 
              await handleLogout(); 
            } 
            setActiveTab('login'); 
            setAuthView('admin-login'); 
          }} title="Admin">
            <LockIcon size={14} />
          </div>
        </footer>
      </main>
      {/* Lightbox Modal de Comprobantes de Pago */}
      {viewReceiptUrl && (
        <div className="lightbox-modal">
          <button className="lightbox-close" onClick={() => setViewReceiptUrl(null)}>×</button>
          <img src={viewReceiptUrl} alt="Comprobante Completo" className="lightbox-content" />
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      <Modal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        title="Confirmar Eliminación"
      >
        <div style={{ padding: '10px 0' }}>
          <p style={{ marginBottom: '20px', fontSize: '1.05rem' }}>
            ¿Estás seguro que deseas eliminar {itemToDelete?.type === 'league' ? 'la liga' : 'el equipo'} <strong style={{ color: 'var(--primary)' }}>{itemToDelete?.name}</strong>?
          </p>
          <p style={{ color: '#ff6b6b', fontSize: '0.85rem', marginBottom: '24px' }}>
            <AlertCircle size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
            Esta acción eliminará el registro de la base de datos de forma permanente y no se puede deshacer.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button className="btn" onClick={() => setItemToDelete(null)}>Cancelar</button>
            <button className="btn btn-primary" style={{ backgroundColor: 'var(--danger)', borderColor: 'var(--danger)', color: '#ffffff' }} onClick={confirmDelete}>
              Sí, eliminar
            </button>
          </div>
        </div>
      </Modal>

      </div>
    </div>
  );
}
