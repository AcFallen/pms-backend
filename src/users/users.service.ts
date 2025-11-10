import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto, tenantId: number): Promise<User> {
    // Check if user already exists
    const existingUser = await this.findByEmail(createUserDto.email, tenantId);
    if (existingUser) {
      throw new ConflictException(
        'User with this email already exists for this tenant',
      );
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(createUserDto.password, saltRounds);

    // Create user without password field
    const { password, ...userData } = createUserDto;
    const user = this.userRepository.create({
      ...userData,
      tenantId,
      passwordHash,
    });

    return await this.userRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return await this.userRepository.find();
  }

  async findAllByTenant(tenantId: number): Promise<User[]> {
    return await this.userRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByPublicId(publicId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { publicId } });
    if (!user) {
      throw new NotFoundException(`User with public ID ${publicId} not found`);
    }
    return user;
  }

  async findByEmail(email: string, tenantId: number): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { email, tenantId },
    });
  }

  async updateByPublicId(
    publicId: string,
    updateUserDto: UpdateUserDto,
  ): Promise<User> {
    const user = await this.findByPublicId(publicId);

    // If updating password, hash it
    if (updateUserDto.password) {
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(
        updateUserDto.password,
        saltRounds,
      );
      const { password, ...userData } = updateUserDto;
      Object.assign(user, { ...userData, passwordHash });
    } else {
      Object.assign(user, updateUserDto);
    }

    return await this.userRepository.save(user);
  }

  async removeByPublicId(publicId: string): Promise<void> {
    const user = await this.findByPublicId(publicId);
    await this.userRepository.softRemove(user);
  }

  async restoreByPublicId(publicId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { publicId },
      withDeleted: true,
    });

    if (!user) {
      throw new NotFoundException(`User with public ID ${publicId} not found`);
    }

    if (!user.deletedAt) {
      throw new ConflictException('User is not deleted');
    }

    await this.userRepository.restore({ publicId });
    return this.findByPublicId(publicId);
  }
}
