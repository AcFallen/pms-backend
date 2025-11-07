import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProductCategoriesService } from './product-categories.service';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { ProductCategory } from './entities/product-category.entity';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';

@ApiTags('product-categories')
@ApiBearerAuth('JWT-auth')
@Controller('product-categories')
export class ProductCategoriesController {
  constructor(private readonly productCategoriesService: ProductCategoriesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new product category',
    description: 'Creates a new product category for the authenticated tenant',
  })
  @ApiBody({ type: CreateProductCategoryDto })
  @ApiResponse({
    status: 201,
    description: 'Product category successfully created',
    type: ProductCategory,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  create(@Body() createProductCategoryDto: CreateProductCategoryDto, @CurrentUser() user: CurrentUserData) {
    return this.productCategoriesService.create(createProductCategoryDto, user.tenantId);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all product categories',
    description: 'Retrieves all product categories for the authenticated tenant, ordered by name',
  })
  @ApiResponse({
    status: 200,
    description: 'List of product categories retrieved successfully',
    type: [ProductCategory],
  })
  findAll(@CurrentUser() user: CurrentUserData) {
    return this.productCategoriesService.findAll(user.tenantId);
  }

  @Get(':publicId')
  @ApiOperation({
    summary: 'Get product category by public ID',
    description: 'Retrieves a product category by its public UUID',
  })
  @ApiParam({
    name: 'publicId',
    description: 'Public UUID of the product category',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Product category found',
    type: ProductCategory,
  })
  @ApiResponse({
    status: 404,
    description: 'Product category not found',
  })
  findOne(@Param('publicId') publicId: string, @CurrentUser() user: CurrentUserData) {
    return this.productCategoriesService.findByPublicId(publicId, user.tenantId);
  }

  @Patch(':publicId')
  @ApiOperation({
    summary: 'Update product category by public ID',
    description: 'Updates product category information by public UUID',
  })
  @ApiParam({
    name: 'publicId',
    description: 'Public UUID of the product category',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: String,
  })
  @ApiBody({ type: UpdateProductCategoryDto })
  @ApiResponse({
    status: 200,
    description: 'Product category successfully updated',
    type: ProductCategory,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  @ApiResponse({
    status: 404,
    description: 'Product category not found',
  })
  update(
    @Param('publicId') publicId: string,
    @Body() updateProductCategoryDto: UpdateProductCategoryDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.productCategoriesService.updateByPublicId(publicId, updateProductCategoryDto, user.tenantId);
  }

  @Delete(':publicId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete product category (soft delete)',
    description: 'Soft deletes a product category by public UUID',
  })
  @ApiParam({
    name: 'publicId',
    description: 'Public UUID of the product category',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Product category successfully deleted',
  })
  @ApiResponse({
    status: 404,
    description: 'Product category not found',
  })
  remove(@Param('publicId') publicId: string, @CurrentUser() user: CurrentUserData) {
    return this.productCategoriesService.removeByPublicId(publicId, user.tenantId);
  }

  @Patch(':publicId/restore')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Restore deleted product category (Admin only)',
    description: 'Restores a soft-deleted product category by public UUID. Only accessible by ADMIN role.',
  })
  @ApiParam({
    name: 'publicId',
    description: 'Public UUID of the product category',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Product category successfully restored',
    type: ProductCategory,
  })
  @ApiResponse({
    status: 404,
    description: 'Product category not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Product category is not deleted',
  })
  restore(@Param('publicId') publicId: string, @CurrentUser() user: CurrentUserData) {
    return this.productCategoriesService.restoreByPublicId(publicId, user.tenantId);
  }
}
