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
import { CurrentUser } from '../auth/decorators/current-user.decorator';

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
  create(@Body() createProductCategoryDto: CreateProductCategoryDto, @CurrentUser() user: any) {
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
  findAll(@CurrentUser() user: any) {
    return this.productCategoriesService.findAll(user.tenantId);
  }

  @Get('public/:publicId')
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
  findByPublicId(@Param('publicId') publicId: string, @CurrentUser() user: any) {
    return this.productCategoriesService.findByPublicId(publicId, user.tenantId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get product category by internal ID',
    description: 'Retrieves a product category by its internal ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Internal ID of the product category',
    example: 1,
    type: Number,
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
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.productCategoriesService.findOne(+id, user.tenantId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update product category',
    description: 'Updates product category information by internal ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Internal ID of the product category',
    example: 1,
    type: Number,
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
    @Param('id') id: string,
    @Body() updateProductCategoryDto: UpdateProductCategoryDto,
    @CurrentUser() user: any,
  ) {
    return this.productCategoriesService.update(+id, updateProductCategoryDto, user.tenantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete product category',
    description: 'Deletes a product category by internal ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Internal ID of the product category',
    example: 1,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Product category successfully deleted',
  })
  @ApiResponse({
    status: 404,
    description: 'Product category not found',
  })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.productCategoriesService.remove(+id, user.tenantId);
  }
}
