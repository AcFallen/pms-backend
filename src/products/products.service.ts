import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async create(createProductDto: CreateProductDto, tenantId: number): Promise<Product> {
    // Check SKU uniqueness if SKU is provided
    if (createProductDto.sku) {
      const existingProduct = await this.productRepository.findOne({
        where: { sku: createProductDto.sku, tenantId },
      });
      if (existingProduct) {
        throw new ConflictException(`Product with SKU '${createProductDto.sku}' already exists for this tenant`);
      }
    }

    const product = this.productRepository.create({
      ...createProductDto,
      tenantId,
    });
    return await this.productRepository.save(product);
  }

  async findAll(tenantId: number): Promise<Product[]> {
    return await this.productRepository.find({
      where: { tenantId },
      relations: ['category'],
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number, tenantId: number): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id, tenantId },
      relations: ['category'],
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  async findByPublicId(publicId: string, tenantId: number): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { publicId, tenantId },
      relations: ['category'],
    });
    if (!product) {
      throw new NotFoundException(`Product with public ID ${publicId} not found`);
    }
    return product;
  }

  async update(
    id: number,
    updateProductDto: UpdateProductDto,
    tenantId: number,
  ): Promise<Product> {
    const product = await this.findOne(id, tenantId);

    // Check SKU uniqueness if SKU is being changed
    if (updateProductDto.sku && updateProductDto.sku !== product.sku) {
      const existingProduct = await this.productRepository.findOne({
        where: { sku: updateProductDto.sku, tenantId },
      });
      if (existingProduct) {
        throw new ConflictException(`Product with SKU '${updateProductDto.sku}' already exists for this tenant`);
      }
    }

    Object.assign(product, updateProductDto);
    return await this.productRepository.save(product);
  }

  async remove(id: number, tenantId: number): Promise<void> {
    const product = await this.findOne(id, tenantId);
    await this.productRepository.remove(product);
  }
}
