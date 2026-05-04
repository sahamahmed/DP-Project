import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';

@Controller('cart')
export class CartController {
  @Get()
  getCart(
    @Query('session') session: string,
    @Query('phone') phone: string,
    @Res() res: Response,
  ) {
    return res.sendFile(join(__dirname, '..', '..', 'public', 'cart.html'));
  }
}
