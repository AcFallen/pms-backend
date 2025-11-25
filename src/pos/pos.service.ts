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
import { Reservation } from '../reservations/entities/reservation.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { FolioStatus } from '../folios/enums/folio-status.enum';
import { ReservationStatus } from '../reservations/enums/reservation-status.enum';
import { CreateWalkInSaleDto } from './dto/create-walk-in-sale.dto';
import { AddChargeToRoomDto } from './dto/add-charge-to-room.dto';
import { ActiveRoomResponseDto } from './dto/active-room-response.dto';

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
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Helper method to extract tax from total amount (price includes tax)
   * @param total Total amount WITH tax included
   * @param taxRate Tax rate percentage (e.g., 18.00 for 18%)
   * @returns Object with subtotal, tax, and total
   */
  private calculateTaxFromTotal(
    total: number,
    taxRate: number,
  ): { subtotal: number; tax: number; total: number } {
    if (taxRate === 0) {
      return {
        subtotal: total,
        tax: 0,
        total,
      };
    }

    const divisor = 1 + taxRate / 100;
    const subtotal = total / divisor;
    const tax = total - subtotal;

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      total,
    };
  }

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

      // 2. Get tenant configuration for tax calculation
      const tenant = await queryRunner.manager.findOne(Tenant, {
        where: { id: tenantId },
        select: ['id', 'taxRate'],
      });
      if (!tenant) {
        throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
      }

      // 3. Calculate total (quantity * unitPrice - price includes tax)
      const total = dto.quantity * dto.unitPrice;

      // Extract subtotal and tax from total
      const { subtotal, tax } = this.calculateTaxFromTotal(total, tenant.taxRate);

      // 4. Generate unique folio number
      const folioNumber = await this.generateFolioNumber(tenantId);

      // 5. Create folio WITHOUT reservation (walk-in folio)
      const folio = queryRunner.manager.create(Folio, {
        tenantId,
        reservationId: null, // Walk-in folio (no reservation)
        folioNumber,
        status: FolioStatus.CLOSED, // Immediately closed since payment is made
        subtotal,
        tax,
        total,
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
        total,
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
   * Add a charge to a room (reservation folio)
   * Used for charging items/services to a guest's room during their stay
   * Validates that the reservation is checked-in and folio is open
   */
  async addChargeToRoom(
    dto: AddChargeToRoomDto,
    tenantId: number,
  ): Promise<FolioCharge> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Find and validate reservation
      const reservation = await queryRunner.manager.findOne(Reservation, {
        where: { publicId: dto.reservationPublicId, tenantId },
      });

      if (!reservation) {
        throw new NotFoundException(
          `Reservation with ID ${dto.reservationPublicId} not found`,
        );
      }

      // 2. Validate reservation is checked-in
      if (reservation.status !== ReservationStatus.CHECKED_IN) {
        throw new BadRequestException(
          `Cannot add charges to reservation. Guest must be checked-in. Current status: ${reservation.status}`,
        );
      }

      // 3. Find folio for this reservation
      const folio = await queryRunner.manager.findOne(Folio, {
        where: { reservationId: reservation.id, tenantId },
      });

      if (!folio) {
        throw new NotFoundException(
          `No folio found for reservation ${reservation.reservationCode}`,
        );
      }

      // 4. Validate folio is open
      if (folio.status !== FolioStatus.OPEN) {
        throw new BadRequestException(
          `Cannot add charges to folio ${folio.folioNumber}. Folio is ${folio.status}. Only OPEN folios can receive charges.`,
        );
      }

      // 5. If productPublicId is provided, find and validate the product
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

        // Validate product is active
        if (!product.isActive) {
          throw new BadRequestException(
            `Product "${product.name}" is not active and cannot be charged`,
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

      // 6. Get tenant configuration for tax calculation
      const tenant = await queryRunner.manager.findOne(Tenant, {
        where: { id: tenantId },
        select: ['id', 'taxRate'],
      });
      if (!tenant) {
        throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
      }

      // 7. Calculate total (price includes tax)
      const total = dto.quantity * dto.unitPrice;

      // Extract subtotal and tax from total
      const { subtotal: chargeSubtotal, tax: chargeTax } =
        this.calculateTaxFromTotal(total, tenant.taxRate);

      // 8. Create folio charge
      const charge = queryRunner.manager.create(FolioCharge, {
        tenantId,
        folioId: folio.id,
        chargeType: dto.chargeType,
        productId: productId,
        description: dto.description,
        quantity: dto.quantity,
        unitPrice: dto.unitPrice,
        total: parseFloat(total.toFixed(2)),
        includedInInvoice: true,
        chargeDate: new Date(),
      });

      const savedCharge = await queryRunner.manager.save(FolioCharge, charge);

      // 9. Update product stock if applicable
      if (product && product.trackInventory) {
        product.stock -= dto.quantity;
        await queryRunner.manager.save(Product, product);
      }

      // 10. Update folio totals
      folio.subtotal = parseFloat(
        (parseFloat(folio.subtotal.toString()) + chargeSubtotal).toFixed(2),
      );
      folio.tax = parseFloat(
        (parseFloat(folio.tax.toString()) + chargeTax).toFixed(2),
      );
      folio.total = parseFloat(
        (parseFloat(folio.total.toString()) + total).toFixed(2),
      );
      folio.balance = parseFloat(
        (parseFloat(folio.balance.toString()) + total).toFixed(2),
      );

      await queryRunner.manager.save(Folio, folio);

      // 11. Update reservation totalAmount
      reservation.totalAmount = (
        parseFloat(reservation.totalAmount.toString()) + total
      ).toFixed(2);

      await queryRunner.manager.save(Reservation, reservation);

      // 11. Commit transaction
      await queryRunner.commitTransaction();

      return savedCharge;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get all active rooms (with checked-in guests)
   * Returns room information along with active reservation and folio details
   * Used by POS to show available rooms for charging
   */
  async getActiveRooms(tenantId: number): Promise<ActiveRoomResponseDto[]> {
    // Find all reservations with status CHECKED_IN
    const activeReservations = await this.dataSource
      .getRepository(Reservation)
      .createQueryBuilder('reservation')
      .leftJoinAndSelect('reservation.room', 'room')
      .leftJoinAndSelect('reservation.roomType', 'roomType')
      .leftJoinAndSelect('reservation.guest', 'guest')
      .where('reservation.tenantId = :tenantId', { tenantId })
      .andWhere('reservation.status = :status', {
        status: ReservationStatus.CHECKED_IN,
      })
      .orderBy('room.roomNumber', 'ASC')
      .getMany();

    // For each reservation, get its folio
    const activeRooms: ActiveRoomResponseDto[] = [];

    for (const reservation of activeReservations) {
      const folio = await this.folioRepository.findOne({
        where: {
          reservationId: reservation.id,
          tenantId,
          status: FolioStatus.OPEN,
        },
      });

      if (folio && reservation.room && reservation.guest) {
        activeRooms.push({
          roomNumber: reservation.room.roomNumber,
          roomType: reservation.roomType?.name || 'N/A',
          reservationPublicId: reservation.publicId,
          reservationCode: reservation.reservationCode,
          guestName: `${reservation.guest.firstName} ${reservation.guest.lastName}`,
          checkInDate: reservation.checkInDate,
          checkOutDate: reservation.checkOutDate,
          folioPublicId: folio.publicId,
          folioNumber: folio.folioNumber,
          folioBalance: parseFloat(folio.balance.toString()),
        });
      }
    }

    return activeRooms;
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
