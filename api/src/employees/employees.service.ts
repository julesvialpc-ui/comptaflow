import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  findAll(businessId: string, search?: string) {
    return this.prisma.employee.findMany({
      where: {
        businessId,
        ...(search && {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName:  { contains: search, mode: 'insensitive' } },
            { email:     { contains: search, mode: 'insensitive' } },
            { position:  { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [{ isActive: 'desc' }, { lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  async findOne(id: string, businessId: string) {
    const employee = await this.prisma.employee.findFirst({ where: { id, businessId } });
    if (!employee) throw new NotFoundException(`Employee ${id} not found`);
    return employee;
  }

  create(dto: CreateEmployeeDto, businessId: string) {
    const { startDate, endDate, ...rest } = dto;
    return this.prisma.employee.create({
      data: {
        ...rest,
        businessId,
        startDate: new Date(startDate),
        ...(endDate ? { endDate: new Date(endDate) } : {}),
      },
    });
  }

  async update(id: string, businessId: string, dto: UpdateEmployeeDto) {
    await this.findOne(id, businessId);
    const { startDate, endDate, ...rest } = dto;
    return this.prisma.employee.update({
      where: { id },
      data: {
        ...rest,
        ...(startDate ? { startDate: new Date(startDate) } : {}),
        ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : null } : {}),
      },
    });
  }

  async remove(id: string, businessId: string) {
    await this.findOne(id, businessId);
    return this.prisma.employee.delete({ where: { id } });
  }

  async getExpenses(id: string, businessId: string) {
    await this.findOne(id, businessId);
    return this.prisma.expense.findMany({
      where: { employeeId: id, businessId },
      include: { userCategory: { select: { name: true, color: true } } },
      orderBy: { date: 'desc' },
    });
  }

  async getStats(businessId: string) {
    const employees = await this.prisma.employee.findMany({
      where: { businessId },
      select: { grossSalary: true, isActive: true },
    });
    const active = employees.filter((e) => e.isActive);
    const totalGrossSalary = active.reduce((sum, e) => sum + e.grossSalary, 0);
    return {
      total: employees.length,
      active: active.length,
      inactive: employees.length - active.length,
      totalGrossSalary,
    };
  }
}
