import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import {
  CurrentUser,
  CurrentUserData,
} from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';

@ApiTags('products')
@ApiBearerAuth('JWT-auth')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new product' })
  @ApiBody({ type: CreateProductDto })
  @ApiResponse({
    status: 201,
    description: 'Product created successfully',
    type: Product,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 409,
    description: 'Product with this SKU already exists',
  })
  create(
    @Body() createProductDto: CreateProductDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<Product> {
    return this.productsService.create(createProductDto, user.tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all products' })
  @ApiResponse({
    status: 200,
    description: 'List of products retrieved successfully',
    type: [Product],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@CurrentUser() user: CurrentUserData): Promise<Product[]> {
    return this.productsService.findAll(user.tenantId);
  }

  @Get(':publicId')
  @ApiOperation({ summary: 'Get a product by public ID' })
  @ApiParam({
    name: 'publicId',
    type: String,
    description: 'Product public UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Product retrieved successfully',
    type: Product,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  findOne(
    @Param('publicId') publicId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<Product> {
    return this.productsService.findByPublicId(publicId, user.tenantId);
  }

  @Patch(':publicId')
  @ApiOperation({ summary: 'Update a product by public ID' })
  @ApiParam({
    name: 'publicId',
    type: String,
    description: 'Product public UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({ type: UpdateProductDto })
  @ApiResponse({
    status: 200,
    description: 'Product updated successfully',
    type: Product,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({
    status: 409,
    description: 'Product with this SKU already exists',
  })
  update(
    @Param('publicId') publicId: string,
    @Body() updateProductDto: UpdateProductDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<Product> {
    return this.productsService.updateByPublicId(
      publicId,
      updateProductDto,
      user.tenantId,
    );
  }

  @Delete(':publicId')
  @ApiOperation({ summary: 'Delete a product (soft delete)' })
  @ApiParam({
    name: 'publicId',
    type: String,
    description: 'Product public UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({ status: 200, description: 'Product deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  remove(
    @Param('publicId') publicId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<void> {
    return this.productsService.removeByPublicId(publicId, user.tenantId);
  }

  @Patch(':publicId/restore')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Restore deleted product (Admin only)',
    description:
      'Restores a soft-deleted product by public UUID. Only accessible by ADMIN role.',
  })
  @ApiParam({
    name: 'publicId',
    type: String,
    description: 'Product public UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Product successfully restored',
    type: Product,
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 409, description: 'Product is not deleted' })
  restore(
    @Param('publicId') publicId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<Product> {
    return this.productsService.restoreByPublicId(publicId, user.tenantId);
  }
}
