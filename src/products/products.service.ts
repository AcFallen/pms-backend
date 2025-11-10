import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { ProductCategory } from '../product-categories/entities/product-category.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductCategory)
    private readonly productCategoryRepository: Repository<ProductCategory>,
  ) {}

  async create(
    createProductDto: CreateProductDto,
    tenantId: number,
  ): Promise<Product> {
    // Find product category by public ID
    const category = await this.productCategoryRepository.findOne({
      where: { publicId: createProductDto.categoryPublicId, tenantId },
    });
    if (!category) {
      throw new NotFoundException('Product category not found');
    }

    // Check SKU uniqueness if SKU is provided
    if (createProductDto.sku) {
      const existingProduct = await this.productRepository.findOne({
        where: { sku: createProductDto.sku, tenantId },
      });
      if (existingProduct) {
        throw new ConflictException(
          `Product with SKU '${createProductDto.sku}' already exists for this tenant`,
        );
      }
    }

    // Create product with internal categoryId
    const { categoryPublicId, ...productData } = createProductDto;
    const product = this.productRepository.create({
      ...productData,
      categoryId: category.id,
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
      throw new NotFoundException(
        `Product with public ID ${publicId} not found`,
      );
    }
    return product;
  }

  async updateByPublicId(
    publicId: string,
    updateProductDto: UpdateProductDto,
    tenantId: number,
  ): Promise<Product> {
    const product = await this.findByPublicId(publicId, tenantId);

    // If category is being updated, find it by public ID
    if (updateProductDto.categoryPublicId) {
      const category = await this.productCategoryRepository.findOne({
        where: { publicId: updateProductDto.categoryPublicId, tenantId },
      });
      if (!category) {
        throw new NotFoundException('Product category not found');
      }
      product.categoryId = category.id;
    }

    // Check SKU uniqueness if SKU is being changed
    if (updateProductDto.sku && updateProductDto.sku !== product.sku) {
      const existingProduct = await this.productRepository.findOne({
        where: { sku: updateProductDto.sku, tenantId },
      });
      if (existingProduct) {
        throw new ConflictException(
          `Product with SKU '${updateProductDto.sku}' already exists for this tenant`,
        );
      }
    }

    // Update other fields (excluding categoryPublicId as we already handled it)
    const { categoryPublicId, ...updateData } = updateProductDto;
    Object.assign(product, updateData);
    return await this.productRepository.save(product);
  }

  async removeByPublicId(publicId: string, tenantId: number): Promise<void> {
    const product = await this.findByPublicId(publicId, tenantId);
    await this.productRepository.softRemove(product);
  }

  async restoreByPublicId(
    publicId: string,
    tenantId: number,
  ): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { publicId, tenantId },
      withDeleted: true,
    });

    if (!product) {
      throw new NotFoundException(
        `Product with public ID ${publicId} not found`,
      );
    }

    if (!product.deletedAt) {
      throw new ConflictException('Product is not deleted');
    }

    await this.productRepository.restore({ publicId });
    return this.findByPublicId(publicId, tenantId);
  }
}
