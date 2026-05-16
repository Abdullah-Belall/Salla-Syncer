import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { CreateClientDto } from './dto/create-client.dto';

@Controller('admin')
@UseGuards(AdminAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('clients')
  @HttpCode(HttpStatus.CREATED)
  createClient(@Body() dto: CreateClientDto) {
    return this.adminService.createClient(dto);
  }

  @Get('clients')
  listClients() {
    return this.adminService.listClients();
  }

  @Get('clients/:id')
  getClient(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getClientById(id);
  }

  @Delete('clients/:id')
  @HttpCode(HttpStatus.OK)
  deleteClient(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteClient(id);
  }
}
