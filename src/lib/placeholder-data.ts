
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
  ownerUids: string[];
  shareId?: string; 
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
