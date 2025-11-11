import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NubefactRequest,
  NubefactResponse,
  NubefactErrorResponse,
} from '../interfaces/nubefact.interface';

@Injectable()
export class NubefactService {
  private readonly logger = new Logger(NubefactService.name);
  private readonly apiUrl: string;
  private readonly apiToken: string;

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('SUNAT_URL_DEV', '');
    this.apiToken = this.configService.get<string>('SUNAT_TOKEN_DEV', '');

    if (!this.apiUrl || !this.apiToken) {
      this.logger.warn(
        'Nubefact credentials not configured. Set SUNAT_URL_DEV and SUNAT_TOKEN_DEV environment variables.',
      );
    }
  }

  /**
   * Send invoice to Nubefact/SUNAT
   */
  async sendInvoice(payload: NubefactRequest): Promise<NubefactResponse> {
    this.logger.log(
      `Sending invoice to Nubefact: ${payload.serie}-${String(payload.numero).padStart(8, '0')}`,
    );

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${this.apiToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorData = data as NubefactErrorResponse;
        this.logger.error('Nubefact API error:', errorData);

        let errorMessage = 'Error al generar comprobante en Nubefact';
        if (errorData.errors) {
          errorMessage = errorData.errors;
        }
        if (errorData.errors_detail) {
          const details = Object.entries(errorData.errors_detail)
            .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
            .join('; ');
          errorMessage += `. Detalles: ${details}`;
        }

        throw new BadRequestException(errorMessage);
      }

      const nubefactResponse = data as NubefactResponse;

      if (nubefactResponse.aceptada_por_sunat) {
        this.logger.log(
          `Invoice accepted by SUNAT: ${nubefactResponse.serie}-${nubefactResponse.numero}`,
        );
      } else {
        this.logger.warn(
          `Invoice rejected by SUNAT: ${nubefactResponse.sunat_description}`,
        );
      }

      return nubefactResponse;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error('Error communicating with Nubefact:', error);
      throw new BadRequestException(
        'Error de comunicación con Nubefact. Intente nuevamente.',
      );
    }
  }

  /**
   * Check invoice status in Nubefact/SUNAT
   */
  async checkInvoiceStatus(payload: {
    operacion: string;
    tipo_de_comprobante: number;
    serie: string;
    numero: number;
  }): Promise<any> {
    this.logger.log(
      `Checking invoice status in Nubefact: ${payload.serie}-${String(payload.numero).padStart(8, '0')}`,
    );

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${this.apiToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorData = data as NubefactErrorResponse;
        this.logger.error('Nubefact API error:', errorData);

        let errorMessage = 'Error al consultar comprobante en Nubefact';
        if (errorData.errors) {
          errorMessage = errorData.errors;
        }
        if (errorData.errors_detail) {
          const details = Object.entries(errorData.errors_detail)
            .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
            .join('; ');
          errorMessage += `. Detalles: ${details}`;
        }

        throw new BadRequestException(errorMessage);
      }

      this.logger.log(
        `Invoice status retrieved: ${data.serie}-${data.numero} - Accepted by SUNAT: ${data.aceptada_por_sunat}`,
      );

      return data;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error('Error communicating with Nubefact:', error);
      throw new BadRequestException(
        'Error de comunicación con Nubefact. Intente nuevamente.',
      );
    }
  }
}
