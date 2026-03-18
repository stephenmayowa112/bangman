import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AuthenticationService } from './authentication.service';
import { User } from '../../entities/user.entity';
import { OTP } from '../../entities/otp.entity';
import { Wallet } from '../../entities/wallet.entity';
import { WalletBalance } from '../../entities/wallet-balance.entity';
import { EmailService } from '../email/email.service';
import { RegisterDto, VerifyEmailDto } from '../../common/dto/auth.dto';
import { ConflictException, BadRequestException } from '@nestjs/common';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthenticationService', () => {
  let service: AuthenticationService;
  let userRepository: Repository<User>;
  let otpRepository: Repository<OTP>;
  let walletRepository: Repository<Wallet>;
  let walletBalanceRepository: Repository<WalletBalance>;
  let emailService: EmailService;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    manager: {
      connection: {
        createQueryRunner: jest.fn(),
      },
    },
  };

  const mockOtpRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockWalletRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockWalletBalanceRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockEmailService = {
    sendOTP: jest.fn(),
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      save: jest.fn(),
      findOne: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthenticationService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(OTP),
          useValue: mockOtpRepository,
        },
        {
          provide: getRepositoryToken(Wallet),
          useValue: mockWalletRepository,
        },
        {
          provide: getRepositoryToken(WalletBalance),
          useValue: mockWalletBalanceRepository,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<AuthenticationService>(AuthenticationService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    otpRepository = module.get<Repository<OTP>>(getRepositoryToken(OTP));
    walletRepository = module.get<Repository<Wallet>>(getRepositoryToken(Wallet));
    walletBalanceRepository = module.get<Repository<WalletBalance>>(getRepositoryToken(WalletBalance));
    emailService = module.get<EmailService>(EmailService);

    // Setup mock query runner
    mockUserRepository.manager.connection.createQueryRunner.mockReturnValue(mockQueryRunner);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'test@example.com',
      password: 'Password123',
    };

    const mockUser = {
      id: 'user-uuid',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      isVerified: false,
    };

    const mockWallet = {
      id: 'wallet-uuid',
      userId: 'user-uuid',
    };

    beforeEach(() => {
      // Mock bcrypt.hash to return a hash
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-value');
      
      // Mock email service
      mockEmailService.sendOTP.mockResolvedValue(undefined);
    });

    it('should register a new user successfully', async () => {
      // Mock no existing user
      mockUserRepository.findOne.mockResolvedValue(null);
      
      // Mock user creation
      mockUserRepository.create.mockReturnValue(mockUser);
      mockQueryRunner.manager.save.mockResolvedValue(mockUser);
      
      // Mock wallet creation
      mockWalletRepository.create.mockReturnValue(mockWallet);
      mockQueryRunner.manager.save.mockResolvedValueOnce(mockUser); // user
      mockQueryRunner.manager.save.mockResolvedValueOnce({ id: 'otp-uuid' }); // otp
      mockQueryRunner.manager.save.mockResolvedValueOnce(mockWallet); // wallet
      mockQueryRunner.manager.save.mockResolvedValueOnce({ id: 'balance-uuid' }); // balance

      const result = await service.register(registerDto);

      expect(result).toEqual({
        userId: 'user-uuid',
        message: 'Registration successful. Please check your email for OTP verification.',
      });

      // Verify password was hashed with cost factor 10
      expect(bcrypt.hash).toHaveBeenCalledWith('Password123', 10);
      
      // Verify OTP was generated and hashed
      expect(bcrypt.hash).toHaveBeenCalledWith(expect.stringMatching(/^\d{6}$/), 10);
      
      // Verify email was sent
      expect(mockEmailService.sendOTP).toHaveBeenCalledWith(
        'test@example.com',
        expect.stringMatching(/^\d{6}$/)
      );
      
      // Verify transaction was committed
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should throw ConflictException for duplicate email', async () => {
      // Mock existing user
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      await expect(service.register(registerDto)).rejects.toThrow('Email already registered');
      
      // Verify transaction was not started
      expect(mockQueryRunner.startTransaction).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid email format', async () => {
      const invalidEmailDto: RegisterDto = {
        email: 'invalid-email',
        password: 'Password123',
      };

      await expect(service.register(invalidEmailDto)).rejects.toThrow(BadRequestException);
      await expect(service.register(invalidEmailDto)).rejects.toThrow('Invalid email format');
    });

    it('should throw BadRequestException for short password', async () => {
      const shortPasswordDto: RegisterDto = {
        email: 'test@example.com',
        password: 'short',
      };

      await expect(service.register(shortPasswordDto)).rejects.toThrow(BadRequestException);
      await expect(service.register(shortPasswordDto)).rejects.toThrow('Password must be at least 8 characters');
    });

    it('should handle email sending failure gracefully', async () => {
      // Mock no existing user
      mockUserRepository.findOne.mockResolvedValue(null);
      
      // Mock user creation
      mockUserRepository.create.mockReturnValue(mockUser);
      mockQueryRunner.manager.save.mockResolvedValue(mockUser);
      
      // Mock wallet creation
      mockWalletRepository.create.mockReturnValue(mockWallet);
      mockQueryRunner.manager.save.mockResolvedValueOnce(mockUser); // user
      mockQueryRunner.manager.save.mockResolvedValueOnce({ id: 'otp-uuid' }); // otp
      mockQueryRunner.manager.save.mockResolvedValueOnce(mockWallet); // wallet
      mockQueryRunner.manager.save.mockResolvedValueOnce({ id: 'balance-uuid' }); // balance
      
      // Mock email service to fail
      mockEmailService.sendOTP.mockRejectedValue(new Error('SMTP Error'));

      const result = await service.register(registerDto);

      // Should still return success even if email fails
      expect(result).toEqual({
        userId: 'user-uuid',
        message: 'Registration successful. Please check your email for OTP verification.',
      });
      
      // Verify transaction was committed despite email failure
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      // Mock no existing user
      mockUserRepository.findOne.mockResolvedValue(null);
      
      // Mock user creation to fail
      mockUserRepository.create.mockReturnValue(mockUser);
      mockQueryRunner.manager.save.mockRejectedValue(new Error('Database error'));

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
      await expect(service.register(registerDto)).rejects.toThrow('Registration failed. Please try again.');
      
      // Verify transaction was rolled back
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('verifyEmail', () => {
    const verifyEmailDto: VerifyEmailDto = {
      userId: 'user-uuid',
      otp: '123456',
    };

    const mockUser = {
      id: 'user-uuid',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      isVerified: false,
      updatedAt: new Date(),
    };

    const mockOtpRecord = {
      id: 'otp-uuid',
      userId: 'user-uuid',
      otpHash: 'hashed-otp',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes in future
      isUsed: false,
      createdAt: new Date(),
    };

    const mockExpiredOtpRecord = {
      id: 'otp-uuid',
      userId: 'user-uuid',
      otpHash: 'hashed-otp',
      expiresAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes in past
      isUsed: false,
      createdAt: new Date(),
    };

    const mockUsedOtpRecord = {
      id: 'otp-uuid',
      userId: 'user-uuid',
      otpHash: 'hashed-otp',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      isUsed: true,
      createdAt: new Date(),
    };

    beforeEach(() => {
      // Setup mock query runner for verifyEmail
      mockUserRepository.manager.connection.createQueryRunner.mockReturnValue(mockQueryRunner);
    });

    it('should verify email successfully with valid OTP', async () => {
      // Mock OTP record
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(mockOtpRecord) // OTP
        .mockResolvedValueOnce(mockUser); // User

      // Mock bcrypt.compare to return true
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      // Mock save operations
      mockQueryRunner.manager.save
        .mockResolvedValueOnce({ ...mockUser, isVerified: true }) // User
        .mockResolvedValueOnce({ ...mockOtpRecord, isUsed: true }); // OTP

      const result = await service.verifyEmail(verifyEmailDto);

      expect(result).toEqual({
        success: true,
        message: 'Email verified successfully',
      });

      // Verify OTP was found
      expect(mockQueryRunner.manager.findOne).toHaveBeenCalledWith(OTP, {
        where: { userId: 'user-uuid', isUsed: false },
        order: { createdAt: 'DESC' },
      });

      // Verify OTP was compared
      expect(bcrypt.compare).toHaveBeenCalledWith('123456', 'hashed-otp');

      // Verify user was found
      expect(mockQueryRunner.manager.findOne).toHaveBeenCalledWith(User, {
        where: { id: 'user-uuid' },
      });

      // Verify user was marked as verified
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith({
        ...mockUser,
        isVerified: true,
        updatedAt: expect.any(Date),
      });

      // Verify OTP was marked as used
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith({
        ...mockOtpRecord,
        isUsed: true,
      });

      // Verify transaction was committed
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException when no valid OTP found', async () => {
      // Mock no OTP record
      mockQueryRunner.manager.findOne.mockResolvedValueOnce(null);

      await expect(service.verifyEmail(verifyEmailDto)).rejects.toThrow(BadRequestException);
      await expect(service.verifyEmail(verifyEmailDto)).rejects.toThrow('No valid OTP found for this user');

      // Verify transaction was rolled back
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException when OTP is expired', async () => {
      // Mock expired OTP record
      mockQueryRunner.manager.findOne.mockResolvedValueOnce(mockExpiredOtpRecord);

      await expect(service.verifyEmail(verifyEmailDto)).rejects.toThrow(BadRequestException);
      await expect(service.verifyEmail(verifyEmailDto)).rejects.toThrow('OTP has expired');

      // Verify transaction was rolled back
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException when OTP is invalid', async () => {
      // Mock OTP record
      mockQueryRunner.manager.findOne.mockResolvedValueOnce(mockOtpRecord);

      // Mock bcrypt.compare to return false
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(service.verifyEmail(verifyEmailDto)).rejects.toThrow(BadRequestException);
      await expect(service.verifyEmail(verifyEmailDto)).rejects.toThrow('Invalid OTP');

      // Verify transaction was rolled back
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException when user not found', async () => {
      // Mock OTP record
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(mockOtpRecord) // OTP
        .mockResolvedValueOnce(null); // User (not found)

      // Mock bcrypt.compare to return true
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      await expect(service.verifyEmail(verifyEmailDto)).rejects.toThrow(BadRequestException);
      await expect(service.verifyEmail(verifyEmailDto)).rejects.toThrow('User not found');

      // Verify transaction was rolled back
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      // Mock OTP record
      mockQueryRunner.manager.findOne.mockRejectedValue(new Error('Database error'));

      await expect(service.verifyEmail(verifyEmailDto)).rejects.toThrow(BadRequestException);
      await expect(service.verifyEmail(verifyEmailDto)).rejects.toThrow('Email verification failed. Please try again.');

      // Verify transaction was rolled back
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });
});