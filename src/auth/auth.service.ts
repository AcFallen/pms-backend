import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { LoginResponseDto } from './dto/login-response.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Valida las credenciales del usuario
   * Busca por email globalmente (no requiere tenantId)
   */
  async validateUser(
    email: string,
    password: string,
  ): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      return null;
    }

    // Verificar si el usuario está activo
    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    // Comparar password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  /**
   * Genera el JWT token y retorna la respuesta de login
   */
  async login(user: User): Promise<LoginResponseDto> {
    const payload: JwtPayload = {
      sub: user.id,
      publicId: user.publicId,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    };

    const access_token = this.jwtService.sign(payload);

    // Actualizar lastLoginAt
    await this.userRepository.update(user.id, {
      lastLoginAt: new Date(),
    });

    return {
      access_token,
      user: {
        publicId: user.publicId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId,
      },
    };
  }
}
