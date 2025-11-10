/**
 * Nubefact API Request/Response interfaces
 */

export interface NubefactItem {
  unidad_de_medida: string; // 'ZZ' for services
  codigo: string;
  descripcion: string;
  cantidad: number;
  valor_unitario: number; // Price without IGV
  precio_unitario: number; // Price with IGV
  subtotal: number;
  tipo_de_igv: number; // 1 = Gravado
  igv: number;
  total: number;
  anticipo_regularizacion: boolean;
}

export interface NubefactRequest {
  operacion: 'generar_comprobante';
  tipo_de_comprobante: number; // 1=Factura, 2=Boleta
  serie: string;
  numero: number;
  sunat_transaction: number; // 1 = venta interna
  cliente_tipo_de_documento: number; // 1=DNI, 6=RUC, etc
  cliente_numero_de_documento: string;
  cliente_denominacion: string;
  cliente_direccion: string;
  cliente_email?: string;
  fecha_de_emision: string; // DD-MM-YYYY
  moneda: number; // 1 = PEN
  porcentaje_de_igv: number; // 18.00
  total_gravada: number;
  total_igv: number;
  total: number;
  items: NubefactItem[];
}

export interface NubefactResponse {
  tipo_de_comprobante: number;
  serie: string;
  numero: number;
  enlace: string;
  enlace_del_pdf: string;
  enlace_del_xml: string;
  enlace_del_cdr: string;
  aceptada_por_sunat: boolean;
  sunat_description: string;
  sunat_note: string | null;
  sunat_responsecode: string;
  sunat_soap_error: string;
  cadena_para_codigo_qr: string;
  codigo_hash: string;
}

export interface NubefactErrorResponse {
  errors: string;
  errors_detail?: Record<string, string[]>;
}
