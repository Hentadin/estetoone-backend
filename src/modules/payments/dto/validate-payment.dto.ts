import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class ValidatePaymentDto {
  @IsString()
  @IsNotEmpty()
  cardName!: string;

  @IsString()
  @Matches(/^\d{13,19}$/, { message: 'cardNumber must contain 13 to 19 digits' })
  cardNumber!: string;

  @IsString()
  @Matches(/^(0[1-9]|1[0-2])\/\d{2}$/, { message: 'cardExpiry must be in MM/YY format' })
  cardExpiry!: string;

  @IsString()
  @Matches(/^\d{3,4}$/, { message: 'cardCvv must contain 3 or 4 digits' })
  cardCvv!: string;
}
