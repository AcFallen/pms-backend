import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { LoginResponseDto } from './dto/login-response.dto';
import { RefreshResponseDto } from './dto/refresh-response.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  private readonly REFRESH_TOKEN_EXPIRY_DAYS = 30;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Valida las credenciales del usuario
   * Busca por email globalmente (no requiere tenantId)
   */
  async validateUser(email: string, password: string): Promise<User | null> {
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
   * Genera el JWT token y refresh token, retorna la respuesta de login
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
    const refresh_token = await this.generateRefreshToken(user.id);

    // Actualizar lastLoginAt
    await this.userRepository.update(user.id, {
      lastLoginAt: new Date(),
    });

    return {
      access_token,
      refresh_token,
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

  /**
   * Genera un nuevo refresh token y lo guarda en la base de datos
   */
  private async generateRefreshToken(userId: number): Promise<string> {
    const token = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.REFRESH_TOKEN_EXPIRY_DAYS);

    await this.refreshTokenRepository.save({
      token,
      userId,
      expiresAt,
      revoked: false,
    });

    return token;
  }

  /**
   * Refresca el access token usando el refresh token
   * Implementa rotation: revoca el refresh token anterior y genera uno nuevo
   */
  async refresh(refreshToken: string): Promise<RefreshResponseDto> {
    // Buscar el refresh token en la base de datos
    const tokenRecord = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken, revoked: false },
      relations: ['user'],
    });

    // Validar que el token existe y no está revocado
    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Validar que el token no ha expirado
    if (tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Validar que el usuario está activo
    if (!tokenRecord.user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    // ROTATION: Revocar el refresh token actual
    await this.refreshTokenRepository.update(
      { id: tokenRecord.id },
      { revoked: true, lastUsedAt: new Date() },
    );

    // Generar nuevo access token
    const payload: JwtPayload = {
      sub: tokenRecord.user.id,
      publicId: tokenRecord.user.publicId,
      email: tokenRecord.user.email,
      tenantId: tokenRecord.user.tenantId,
      role: tokenRecord.user.role,
    };
    const access_token = this.jwtService.sign(payload);

    // Generar nuevo refresh token
    const new_refresh_token = await this.generateRefreshToken(
      tokenRecord.user.id,
    );

    return {
      access_token,
      refresh_token: new_refresh_token,
    };
  }

  /**
   * Revoca un refresh token (logout)
   */
  async logout(refreshToken: string): Promise<void> {
    const tokenRecord = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken },
    });

    if (tokenRecord) {
      await this.refreshTokenRepository.update(
        { id: tokenRecord.id },
        { revoked: true },
      );
    }
  }

  /**
   * Limpia tokens expirados y revocados (se ejecuta en cron job)
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.refreshTokenRepository
      .createQueryBuilder()
      .delete()
      .from(RefreshToken)
      .where('expiresAt < :now OR revoked = :revoked', {
        now: new Date(),
        revoked: true,
      })
      .execute();

    return result.affected || 0;
  }
}
