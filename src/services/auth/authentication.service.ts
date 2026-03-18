import { Injectable, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../entities/user.entity';
import { OTP } from '../../entities/otp.entity';
import { Wallet } from '../../entities/wallet.entity';
import { WalletBalance } from '../../entities/wallet-balance.entity';
import { EmailService } from '../email/email.service';
import { RegisterDto } from '../../common/dto/auth.dto';

@Injectable()
export class AuthenticationService {
  private readonly logger = new Logger(AuthenticationService.name);
  private readonly OTP_EXPIRATION_MINUTES = 10;
  private readonly INITIAL_NGN_BALANCE = 1000.000000;
  private readonly BCRYPT_COST_FACTOR = 10;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(OTP)
    private otpRepository: Repository<OTP>,
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    @InjectRepository(WalletBalance)
    private walletBalanceRepository: Repository<WalletBalance>,
    private emailService: EmailService,
  ) {}

  /**
   * Register a new user
   */
  async register(registerDto: RegisterDto): Promise<{ userId: string; message: string }> {
    const { email, password } = registerDto;

    // Validate email format
    if (!this.isValidEmail(email)) {
      throw new BadRequestException('Invalid email format');
    }

    // Validate password length
    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    // Check for existing user
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Start transaction
    const queryRunner = this.userRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Hash password
      const passwordHash = await bcrypt.hash(password, this.BCRYPT_COST_FACTOR);
      
      // Create user
      const user = this.userRepository.create({
        email,
        passwordHash: passwordHash,
        isVerified: false,
      });
      
      const savedUser = await queryRunner.manager.save(user);

      // Generate OTP
      const otpCode = this.generateOTP();
      const otpHash = await bcrypt.hash(otpCode, this.BCRYPT_COST_FACTOR);
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + this.OTP_EXPIRATION_MINUTES);

      // Create OTP record
      const otp = this.otpRepository.create({
        userId: savedUser.id,
        otpHash,
        expiresAt,
        isUsed: false,
      });
      await queryRunner.manager.save(otp);

      // Create wallet
      const wallet = this.walletRepository.create({
        userId: savedUser.id,
      });
      const savedWallet = await queryRunner.manager.save(wallet);

      // Create initial NGN balance
      const walletBalance = this.walletBalanceRepository.create({
        walletId: savedWallet.id,
        currency: 'NGN',
        balance: this.INITIAL_NGN_BALANCE,
      });
      await queryRunner.manager.save(walletBalance);

      // Commit transaction
      await queryRunner.commitTransaction();

      // Send OTP email (outside transaction)
      try {
        await this.emailService.sendOTP(email, otpCode);
        this.logger.log(`OTP email sent to ${email}`);
      } catch (emailError) {
        this.logger.error(`Failed to send OTP email to ${email}:`, emailError);
        // Continue even if email fails
      }

      return {
        userId: savedUser.id,
        message: 'Registration successful. Please check your email for OTP verification.',
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Registration failed:', error);
      throw new BadRequestException('Registration failed. Please try again.');
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Generate a 6-digit OTP
   */
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email);
  }
}