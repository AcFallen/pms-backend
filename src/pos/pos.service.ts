import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Folio } from '../folios/entities/folio.entity';
import { FolioCharge } from '../folio-charges/entities/folio-charge.entity';
import { Product } from '../products/entities/product.entity';
import { Payment } from '../payments/entities/payment.entity';
import { FolioStatus } from '../folios/enums/folio-status.enum';
import { CreateWalkInSaleDto } from './dto/create-walk-in-sale.dto';

@Injectable()
export class PosService {
  constructor(
    @InjectRepository(Folio)
    private readonly folioRepository: Repository<Folio>,
    @InjectRepository(FolioCharge)
    private readonly folioChargeRepository: Repository<FolioCharge>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create a walk-in sale (folio without reservation + charge + payment)
   * Used for POS sales that are not tied to a room/reservation
   * Immediately registers payment and closes the folio
   */
  async createWalkInSale(
    dto: CreateWalkInSaleDto,
    tenantId: number,
  ): Promise<{ folio: Folio; charge: FolioCharge; payment: Payment }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. If productPublicId is provided, find and validate the product
      let productId: number | null = null;
      let product: Product | null = null;

      if (dto.productPublicId) {
        product = await queryRunner.manager.findOne(Product, {
          where: { publicId: dto.productPublicId, tenantId },
        });

        if (!product) {
          throw new NotFoundException(
            `Product with ID ${dto.productPublicId} not found`,
          );
        }

        // Validate stock if inventory tracking is enabled
        if (product.trackInventory) {
          if (product.stock < dto.quantity) {
            throw new BadRequestException(
              `Insufficient stock for product "${product.name}". Available: ${product.stock}, Requested: ${dto.quantity}`,
            );
          }
        }

        productId = product.id;
      }

      // 2. Calculate total (quantity * unitPrice)
      const total = dto.quantity * dto.unitPrice;

      // Calculate subtotal and tax (IGV 18%)
      const subtotal = total / 1.18;
      const tax = total - subtotal;

      // 3. Generate unique folio number
      const folioNumber = await this.generateFolioNumber(tenantId);

      // 4. Create folio WITHOUT reservation (walk-in folio)
      const folio = queryRunner.manager.create(Folio, {
        tenantId,
        reservationId: null, // Walk-in folio (no reservation)
        folioNumber,
        status: FolioStatus.CLOSED, // Immediately closed since payment is made
        subtotal: parseFloat(subtotal.toFixed(2)),
        tax: parseFloat(tax.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        balance: 0, // Balance is 0 after payment
        notes: dto.notes || 'Walk-in POS sale',
      });

      const savedFolio = await queryRunner.manager.save(Folio, folio);

      // 5. Create folio charge
      const charge = queryRunner.manager.create(FolioCharge, {
        tenantId,
        folioId: savedFolio.id,
        chargeType: dto.chargeType,
        productId: productId, // Internal product ID (or null if no product)
        description: dto.description,
        quantity: dto.quantity,
        unitPrice: dto.unitPrice,
        total: parseFloat(total.toFixed(2)),
        includedInInvoice: true, // Default: included in invoice
        chargeDate: new Date(),
      });

      const savedCharge = await queryRunner.manager.save(FolioCharge, charge);

      // 6. Update product stock if applicable
      if (product && product.trackInventory) {
        product.stock -= dto.quantity;
        await queryRunner.manager.save(Product, product);
      }

      // 7. Generate reference number if not provided
      const referenceNumber = await this.generatePaymentReferenceNumber(
        queryRunner,
        tenantId,
      );

      // 8. Register payment
      const payment = queryRunner.manager.create(Payment, {
        tenantId,
        folioId: savedFolio.id,
        paymentMethod: dto.paymentMethod,
        amount: parseFloat(total.toFixed(2)),
        referenceNumber: referenceNumber,
        paymentDate: new Date(),
        notes: `Walk-in sale payment - ${dto.paymentMethod}`,
      });

      const savedPayment = await queryRunner.manager.save(Payment, payment);

      // 9. Commit transaction
      await queryRunner.commitTransaction();

      return {
        folio: savedFolio,
        charge: savedCharge,
        payment: savedPayment,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Generate unique folio number for walk-in sales
   * Format: WI-YYYYMMDD-XXXX (Walk-In)
   */
  private async generateFolioNumber(tenantId: number): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const datePrefix = `${year}${month}${day}`;

    // Find the last folio number for today
    const lastFolio = await this.folioRepository
      .createQueryBuilder('folio')
      .where('folio.tenantId = :tenantId', { tenantId })
      .andWhere('folio.folioNumber LIKE :pattern', {
        pattern: `WI-${datePrefix}-%`,
      })
      .orderBy('folio.folioNumber', 'DESC')
      .getOne();

    let sequence = 1;
    if (lastFolio) {
      const lastSequence = parseInt(lastFolio.folioNumber.split('-')[2]);
      sequence = lastSequence + 1;
    }

    return `WI-${datePrefix}-${String(sequence).padStart(4, '0')}`;
  }

  /**
   * Generate unique payment reference number
   * Format: PAY-YYYY-XXXXX
   */
  private async generatePaymentReferenceNumber(
    queryRunner: any,
    tenantId: number,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const paymentCount = await queryRunner.manager.count(Payment, {
      where: { tenantId },
    });
    const referenceNumber = `PAY-${year}-${String(paymentCount + 1).padStart(5, '0')}`;
    return referenceNumber;
  }
}
