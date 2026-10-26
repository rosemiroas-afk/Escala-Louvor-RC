import fs from 'fs';
import path from 'path';
import {
  DatabaseSchema,
  Member,
  Culto,
  Availability,
  MonthlyScale,
  DEFAULT_ROLE_QUOTAS,
  MinisterialRole
} from '../types/index.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'louvor_database.json');

export const INITIAL_MEMBERS_NAMES = [
  'ADNELSON',
  'ALEXANDRE',
  'ALINE',
  'ANA',
  'CAIO',
  'DANI TERRA',
  'DANIEL',
  'DANIELLE',
  'DANIELLY',
  'DANILO',
  'ELIANE',
  'ENEAS',
  'ESTER',
  'GABRIEL',
  'GIOVANNI',
  'GUI CAVALCANTE',
  'GUI FREITAS',
  'GUSTAVO',
  'JAMES',
  'JHOW',
  'JOAO LUCA',
  'JOAO ROS',
  'LIZANONI',
  'LILIAN',
  'LUCAS',
  'LUCAS GABRIEL',
  'LUCENA',
  'LUCIANO',
  'LUZIA',
  'MARCELA',
  'MARCIO',
  'MARCUS',
  'MATEUS',
  'MICHELE',
  'MIQUEIAS',
  'MIRO',
  'PAULO',
  'PAULO DB',
  'PEDRO',
  'PRISCILA',
  'ROBERTA',
  'SAMUEL',
  'STEFFANI',
  'TATIANA',
  'THAUAN',
  'VALTER',
  'WELLINGTON',
  'WILEN',
  'WILL',
  'RAUL',
  'GUI AIUB'
];

function generateInitialCultos(): Culto[] {
  const currentYear = new Date().getFullYear();
  // Using current month and next month
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  
  return [
    {
      id: 'c1',
      name: 'Culto de Celebração (Manhã)',
      date: `${year}-${month}-01`,
      time: '09:30',
      status: 'aberto',
      notes: 'Ceia do Senhor pela manhã',
      createdAt: new Date().toISOString()
    },
    {
      id: 'c2',
      name: 'Culto da Família (Noite)',
      date: `${year}-${month}-01`,
      time: '19:00',
      status: 'aberto',
      notes: 'Culto da Família com louvor congregacional',
      createdAt: new Date().toISOString()
    },
    {
      id: 'c3',
      name: 'Quinta da Palavra e Oração',
      date: `${year}-${month}-05`,
      time: '20:00',
      status: 'aberto',
      notes: 'Culto no meio da semana',
      createdAt: new Date().toISOString()
    },
    {
      id: 'c4',
      name: 'Culto de Jovens (Sábado)',
      date: `${year}-${month}-07`,
      time: '19:30',
      status: 'aberto',
      notes: 'Banda jovem',
      createdAt: new Date().toISOString()
    },
    {
      id: 'c5',
      name: 'Culto Matutino',
      date: `${year}-${month}-08`,
      time: '09:30',
      status: 'aberto',
      notes: 'Doutrina e louvor',
      createdAt: new Date().toISOString()
    },
    {
      id: 'c6',
      name: 'Culto de Louvor e Adoração',
      date: `${year}-${month}-08`,
      time: '19:00',
      status: 'aberto',
      notes: 'Culto especial com ministrações',
      createdAt: new Date().toISOString()
    },
    {
      id: 'c7',
      name: 'Culto de Missões (Domingo)',
      date: `${year}-${month}-15`,
      time: '19:00',
      status: 'aberto',
      notes: 'Comunhão e louvor',
      createdAt: new Date().toISOString()
    },
    {
      id: 'c8',
      name: 'Culto de Ação de Graças',
      date: `${year}-${month}-22`,
      time: '19:00',
      status: 'aberto',
      notes: 'Testemunhos e louvor',
      createdAt: new Date().toISOString()
    }
  ];
}

function getInitialDatabase(): DatabaseSchema {
  const now = new Date().toISOString();
  const members: Member[] = INITIAL_MEMBERS_NAMES.map((name, index) => {
    // Lead administrator: Miro / Admin
    const isLeadership = name === 'MIRO';
    return {
      id: `m_${index + 1}`,
      name,
      primaryRole: null, // STRICT REQUIREMENT: No pre-assigned role, each member selects theirs
      secondaryRoles: [],
      active: true,
      contact: '',
      pin: null, // User sets on first login
      roleLevel: isLeadership ? 'admin' : 'integrante',
      createdAt: now,
      updatedAt: now
    };
  });

  return {
    members,
    cultos: generateInitialCultos(),
    availabilities: [],
    scales: [],
    roleQuotas: { ...DEFAULT_ROLE_QUOTAS },
    adminPin: '1234' // Default admin PIN
  };
}

class DatabaseService {
  private db: DatabaseSchema;

  constructor() {
    this.ensureDirectory();
    this.db = this.loadDatabase();
  }

  private ensureDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadDatabase(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        // Ensure all fields exist
        if (parsed.members && parsed.cultos && parsed.availabilities) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading database, resetting to initial state:', e);
    }

    const initial = getInitialDatabase();
    this.saveDatabase(initial);
    return initial;
  }

  public saveDatabase(data?: DatabaseSchema) {
    if (data) this.db = data;
    try {
      this.ensureDirectory();
      fs.writeFileSync(DB_FILE, JSON.stringify(this.db, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving database to disk:', e);
    }
  }

  public get(): DatabaseSchema {
    return this.db;
  }

  public resetToDefault(): DatabaseSchema {
    this.db = getInitialDatabase();
    this.saveDatabase();
    return this.db;
  }
}

export const dbService = new DatabaseService();
