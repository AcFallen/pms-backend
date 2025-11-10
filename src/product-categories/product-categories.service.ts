import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { ProductCategory } from './entities/product-category.entity';

@Injectable()
export class ProductCategoriesService {
  constructor(
    @InjectRepository(ProductCategory)
    private readonly productCategoryRepository: Repository<ProductCategory>,
  ) {}

  async create(
    createProductCategoryDto: CreateProductCategoryDto,
    tenantId: number,
  ): Promise<ProductCategory> {
    const productCategory = this.productCategoryRepository.create({
      ...createProductCategoryDto,
      tenantId,
    });
    return await this.productCategoryRepository.save(productCategory);
  }

  async findAll(tenantId: number): Promise<ProductCategory[]> {
    return await this.productCategoryRepository.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number, tenantId: number): Promise<ProductCategory> {
    const productCategory = await this.productCategoryRepository.findOne({
      where: { id, tenantId },
    });
    if (!productCategory) {
      throw new NotFoundException(`Product category with ID ${id} not found`);
    }
    return productCategory;
  }

  async findByPublicId(
    publicId: string,
    tenantId: number,
  ): Promise<ProductCategory> {
    const productCategory = await this.productCategoryRepository.findOne({
      where: { publicId, tenantId },
    });
    if (!productCategory) {
      throw new NotFoundException(
        `Product category with public ID ${publicId} not found`,
      );
    }
    return productCategory;
  }

  async updateByPublicId(
    publicId: string,
    updateProductCategoryDto: UpdateProductCategoryDto,
    tenantId: number,
  ): Promise<ProductCategory> {
    const productCategory = await this.findByPublicId(publicId, tenantId);
    Object.assign(productCategory, updateProductCategoryDto);
    return await this.productCategoryRepository.save(productCategory);
  }

  async removeByPublicId(publicId: string, tenantId: number): Promise<void> {
    const productCategory = await this.findByPublicId(publicId, tenantId);
    await this.productCategoryRepository.softRemove(productCategory);
  }

  async restoreByPublicId(
    publicId: string,
    tenantId: number,
  ): Promise<ProductCategory> {
    const productCategory = await this.productCategoryRepository.findOne({
      where: { publicId, tenantId },
      withDeleted: true,
    });

    if (!productCategory) {
      throw new NotFoundException(
        `Product category with public ID ${publicId} not found`,
      );
    }

    if (!productCategory.deletedAt) {
      throw new ConflictException('Product category is not deleted');
    }

    await this.productCategoryRepository.restore({ publicId });
    return this.findByPublicId(publicId, tenantId);
  }
}
