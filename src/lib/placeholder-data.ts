export type Pet = {
  id: string;
  name: string;
  photoUrl?: string | null;
  photoPath?: string | null;
  species: 'Dog' | 'Cat';
  breed?: string;
  birthDate?: string;
  isBirthDateApproximate?: boolean;
  weight?: number;
  age?: number;
  microchip?: string;
  isSpayed: boolean;
  healthPlan?: string;
  isDeceased?: boolean;
  ownerUid?: string;
  medications: Medication[];
  consultations: Consultation[];
  vaccinations: Vaccination[];
  exams: Exam[];
  groomings: Grooming[];
  weightHistory: WeightEntry[];
  createdAt: any;
};

export type Medication = {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  consultationId?: string;
};

export type Consultation = {
  id: string;
  date: string;
  vetName: string;
  reason: string;
  notes?: string;
  diagnosis?: string;
  treatment?: string;
  location?: string;
  cost?: number;
  attachmentUrl?: string;
  attachmentPath?: string;
};

export type Vaccination = {
  id: string;
  date: string;
  vetName: string;
  crmv: string;
  vaccineName: string;
  nextApplicationDate?: string;
  cost?: number;
};

export type Exam = {
  id: string;
  date: string;
  type: string;
  resultUrl?: string;
  resultPath?: string; // Caminho do arquivo no Storage
  results?: string; // Mantido para anotações rápidas
  cost?: number;
  consultationId?: string;
};

export type Grooming = {
  id: string;
  petId: string;
  date: string;
  location: string;
  services: string;
  cost?: number;
  notes?: string;
  status: 'Agendado' | 'Concluído' | 'Cancelado';
};

export type WeightEntry = {
  date: string;
  weight: number;
};

export type Expense = {
  id: string;
  ownerUid: string;
  date: string;
  category: 'Alimentação' | 'Brinquedos' | 'Saúde' | 'Banho e Tosa' | 'Outros';
  description: string;
  amount: number;
  petId: string;
};

export type SavedLocation = {
  id: string;
  name: string;
  type: 'Grooming' | 'Vet' | 'Park' | 'Pet Shop';
  address: string;
  ownerUid: string;
};


const today = new Date();
const oneMonthAgo = new Date(new Date().setMonth(today.getMonth() - 1));
const twoMonthsAgo = new Date(new Date().setMonth(today.getMonth() - 2));

export const MOCK_PETS: Pet[] = [
  {
    id: '1',
    name: 'Buddy',
    photoUrl: 'https://placehold.co/300x300.png',
    species: 'Dog',
    breed: 'Golden Retriever',
    weight: 15,
    age: 5,
    microchip: '987654321098765',
    isSpayed: true,
    healthPlan: 'PetLove Essencial',
    medications: [
      { id: 'm1', name: 'Apoquel', dosage: '16mg', frequency: 'Uma vez ao dia', startDate: oneMonthAgo.toISOString().split('T')[0] },
      { id: 'm2', name: 'NexGard', dosage: '1 tablete', frequency: 'Uma vez por mês', startDate: oneMonthAgo.toISOString().split('T')[0] },
    ],
    consultations: [
      { id: 'c1', date: oneMonthAgo.toISOString().split('T')[0], vetName: 'Dr. Silva', reason: 'Check-up anual', notes: 'Tudo certo, cão saudável.' },
    ],
    vaccinations: [
      { id: 'v1', date: twoMonthsAgo.toISOString().split('T')[0], vetName: 'Dr. Silva', crmv: 'SP-12345', vaccineName: 'V10' },
    ],
    exams: [
      { id: 'e1', date: oneMonthAgo.toISOString().split('T')[0], type: 'Exame de Sangue', results: 'Hemácias: 6.5, Leucócitos: 7.2' },
    ],
    groomings: [],
    weightHistory: [
      { date: new Date(new Date().setMonth(today.getMonth() - 5)).toISOString().split('T')[0], weight: 14.2 },
      { date: new Date(new Date().setMonth(today.getMonth() - 4)).toISOString().split('T')[0], weight: 14.5 },
      { date: new Date(new Date().setMonth(today.getMonth() - 3)).toISOString().split('T')[0], weight: 14.8 },
      { date: new Date(new Date().setMonth(today.getMonth() - 2)).toISOString().split('T')[0], weight: 15.1 },
      { date: new Date(new Date().setMonth(today.getMonth() - 1)).toISOString().split('T')[0], weight: 15.0 },
      { date: today.toISOString().split('T')[0], weight: 15.0 },
    ],
    createdAt: new Date(),
  },
  {
    id: '2',
    name: 'Lucy',
    photoUrl: 'https://placehold.co/300x300.png',
    species: 'Cat',
    breed: 'Siamês',
    weight: 5,
    age: 3,
    microchip: '123456789012345',
    isSpayed: true,
    healthPlan: 'Nenhum',
    medications: [],
    consultations: [],
    vaccinations: [
      { id: 'v2', date: oneMonthAgo.toISOString().split('T')[0], vetName: 'Dr. Costa', crmv: 'RJ-54321', vaccineName: 'V4' },
    ],
    exams: [],
    groomings: [],
    weightHistory: [
      { date: new Date(new Date().setMonth(today.getMonth() - 5)).toISOString().split('T')[0], weight: 4.8 },
      { date: new Date(new Date().setMonth(today.getMonth() - 4)).toISOString().split('T')[0], weight: 4.9 },
      { date: new Date(new Date().setMonth(today.getMonth() - 3)).toISOString().split('T')[0], weight: 5.0 },
      { date: new Date(new Date().setMonth(today.getMonth() - 2)).toISOString().split('T')[0], weight: 5.1 },
      { date: new Date(new Date().setMonth(today.getMonth() - 1)).toISOString().split('T')[0], weight: 5.0 },
      { date: today.toISOString().split('T')[0], weight: 5.0 },
    ],
    createdAt: new Date(),
  },
];

export const MOCK_EXPENSES: Expense[] = [
  { id: 'ex1', ownerUid: 'mock-uid', date: today.toISOString().split('T')[0], category: 'Alimentação', description: 'Ração Premium para Cães', amount: 250.00, petId: '1' },
  { id: 'ex2', ownerUid: 'mock-uid', date: oneMonthAgo.toISOString().split('T')[0], category: 'Saúde', description: 'Consulta Veterinária', amount: 150.00, petId: '1' },
  { id: 'ex3', ownerUid: 'mock-uid', date: oneMonthAgo.toISOString().split('T')[0], category: 'Banho e Tosa', description: 'Serviço completo de tosa', amount: 120.00, petId: '1' },
  { id: 'ex4', ownerUid: 'mock-uid', date: twoMonthsAgo.toISOString().split('T')[0], category: 'Alimentação', description: 'Ração para Gatos', amount: 180.00, petId: '2' },
];

export const MOCK_LOCATIONS: SavedLocation[] = [
  { id: 'l1', name: 'Petz Morumbi', type: 'Pet Shop', address: 'Av. Giovanni Gronchi, 5819', ownerUid: 'mock-uid' },
  { id: 'l2', name: 'Hospital Veterinário Dr. Hato', type: 'Vet', address: 'Av. Ibirapuera, 2921', ownerUid: 'mock-uid' },
  { id: 'l3', name: 'Parque Ibirapuera', type: 'Park', address: 'Av. Pedro Álvares Cabral', ownerUid: 'mock-uid' },
];
