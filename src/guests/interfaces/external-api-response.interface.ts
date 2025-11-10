// DNI API Response
export interface DniApiResponse {
  success: boolean;
  data: {
    numero?: string;
    nombre_completo?: string;
    nombres?: string;
    apellido_paterno?: string;
    apellido_materno?: string;
    direccion?: string;
    direccion_completa?: string;
    departamento?: string;
    provincia?: string;
    distrito?: string;
    ubigeo_reniec?: string;
    ubigeo_inei?: string;
  };
}

// RUC API Response
export interface RucApiResponse {
  success: boolean;
  data: {
    ruc?: string;
    nombre_o_razon_social?: string;
    direccion?: string;
    estado?: string;
    condicion?: string;
    departamento?: string;
    provincia?: string;
    distrito?: string;
    ubigeo?: string[];
  };
}

// Guest Search Response
export interface GuestSearchResponse {
  publicId: string | null; // UUID if found in database, null if from API or not found
  firstName: string | null;
  lastName: string | null;
  documentType: string;
  documentNumber: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  birthDate: string | null;
  notes: string | null;
  source: 'database' | 'external_api' | 'not_found';
  message: string;
}
