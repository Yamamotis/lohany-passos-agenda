// Dados iniciais (seed) usados na primeira vez que o app roda no navegador.
// Servem só pra demonstração local — cada coleção só é populada se estiver
// vazia (ver storage.seedIfEmpty), então dados já criados não são sobrescritos.
import { storage } from './storage'

// Expediente padrão do salão: seg-sex com almoço, sábado meio período, domingo fechado.
const WEEKDAY_HOURS = { start: '09:00', end: '18:00', breakStart: '12:00', breakEnd: '13:00' }
const TATTOO_HOURS = { start: '10:00', end: '19:00', breakStart: '13:00', breakEnd: '14:00' }

const DEFAULT_HOURS = {
  mon: WEEKDAY_HOURS,
  tue: WEEKDAY_HOURS,
  wed: WEEKDAY_HOURS,
  thu: WEEKDAY_HOURS,
  fri: WEEKDAY_HOURS,
  sat: { start: '09:00', end: '13:00' },
  sun: null,
}

// A tatuadora não atende às segundas e tem um horário próprio.
const TATTOO_WORKING_HOURS = {
  mon: null,
  tue: TATTOO_HOURS,
  wed: TATTOO_HOURS,
  thu: TATTOO_HOURS,
  fri: TATTOO_HOURS,
  sat: TATTOO_HOURS,
  sun: null,
}

const services = [
  { id: 'svc-corte-fem', name: 'Corte Feminino', durationMinutes: 60, price: 80, active: true },
  { id: 'svc-corte-masc', name: 'Corte Masculino', durationMinutes: 30, price: 40, active: true },
  { id: 'svc-escova', name: 'Escova', durationMinutes: 45, price: 60, active: true },
  { id: 'svc-coloracao', name: 'Coloração', durationMinutes: 120, price: 150, active: true },
  { id: 'svc-manicure', name: 'Manicure', durationMinutes: 45, price: 35, active: true },
  { id: 'svc-barba', name: 'Barba', durationMinutes: 30, price: 25, active: true },
  { id: 'svc-tatuagem', name: 'Tatuagem (sessão)', durationMinutes: 90, price: 250, active: true },
]

// Um usuário de login para cada papel de teste (admin + 3 profissionais).
const users = [
  {
    id: 'user-admin',
    name: 'Administradora',
    email: 'admin@salao.com',
    phone: '',
    password: 'admin123',
    role: 'admin',
  },
  {
    id: 'user-prof-ana',
    name: 'Ana Paula',
    email: 'ana@salao.com',
    phone: '',
    password: '123456',
    role: 'professional',
  },
  {
    id: 'user-prof-bruno',
    name: 'Bruno Silva',
    email: 'bruno@salao.com',
    phone: '',
    password: '123456',
    role: 'professional',
  },
  {
    id: 'user-prof-camila',
    name: 'Camila Rocha',
    email: 'camila@salao.com',
    phone: '',
    password: '123456',
    role: 'professional',
  },
]

// Cada profissional aponta para o seu usuário de login (userId) e para os
// serviços que realiza (serviceIds), além do próprio expediente e folgas.
const professionals = [
  {
    id: 'prof-ana',
    userId: 'user-prof-ana',
    name: 'Ana Paula',
    bio: 'Especialista em coloração e cortes femininos.',
    serviceIds: ['svc-corte-fem', 'svc-escova', 'svc-coloracao', 'svc-manicure'],
    workingHours: DEFAULT_HOURS,
    timeOff: [],
  },
  {
    id: 'prof-bruno',
    userId: 'user-prof-bruno',
    name: 'Bruno Silva',
    bio: 'Cortes masculinos e barba.',
    serviceIds: ['svc-corte-masc', 'svc-barba'],
    workingHours: DEFAULT_HOURS,
    timeOff: [],
  },
  {
    id: 'prof-camila',
    userId: 'user-prof-camila',
    name: 'Camila Rocha',
    bio: 'Tatuadora, especialista em traço fino.',
    serviceIds: ['svc-tatuagem'],
    workingHours: TATTOO_WORKING_HOURS,
    timeOff: [],
  },
]

// Popula todas as coleções usadas pelo app. Chamada uma vez, ao iniciar o App.
export function seedDatabase() {
  storage.seedIfEmpty('services', services)
  storage.seedIfEmpty('users', users)
  storage.seedIfEmpty('professionals', professionals)
  storage.seedIfEmpty('appointments', [])
  storage.seedIfEmpty('settings', [{ id: 'salon', phone: '5511999999999' }])
}
