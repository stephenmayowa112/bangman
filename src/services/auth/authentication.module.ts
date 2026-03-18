import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthenticationService } from './authentication.service';
import { User } from '../../entities/user.entity';
import { OTP } from '../../entities/otp.entity';
import { Wallet } from '../../entities/wallet.entity';
import { WalletBalance } from '../../entities/wallet-balance.entity';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, OTP, Wallet, WalletBalance]),
    EmailModule,
  ],
  providers: [AuthenticationService],
  exports: [AuthenticationService],
})
export class AuthenticationModule {}