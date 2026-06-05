import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

const BCRYPT_COST = 12;

@Injectable()
export class HashingService {
  hash(plainText: string): Promise<string> {
    return bcrypt.hash(plainText, BCRYPT_COST);
  }

  compare(plainText: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainText, hash);
  }
}
