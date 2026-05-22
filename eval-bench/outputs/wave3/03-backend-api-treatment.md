---
scenario: 03-backend-api
pass: treatment
model: claude-sonnet-4-6
tokens_in_approx: 1850
tokens_out_approx: 1240
time_seconds: 26
quality_score: 4.75
quality_breakdown:
  specificity: 5
  completeness: 5
  correctness: 5
  actionability: 5
  discipline: 4
pass_fail: pass
delta_vs_baseline: +1.75
notes: "pass B — skill loaded. Decimal para moeda, Prisma error codes P2002/P2003/P2025, module wiring completo, PrismaExceptionFilter global, idempotency guard, JWT guard, formato {success,data}, handoff QA com 6 cenários, 3 riscos explícitos."
---

# POST /invoices — Treatment Answer (skill 03-backend-api)

## Arquivos a criar

```
src/invoices/
  invoices.module.ts
  invoices.controller.ts
  invoices.service.ts
  dto/
    create-invoice.dto.ts
  events/
    invoice-created.event.ts
src/webhook/
  webhook.service.ts        ← injetar via módulo global ou InvoicesModule
prisma/schema.prisma        ← adicionar models Invoice + InvoiceItem
```

## Contrato REST

**Request**
```http
POST /api/v1/invoices
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "customerId": "uuid",
  "currency":   "BRL",
  "dueDate":    "2026-06-30",
  "items": [
    { "description": "Serviço X", "quantity": 1, "unitPrice": 150.00 }
  ]
}
```

**Response 201**
```json
{
  "success": true,
  "data": { "id": "invoice-uuid" }
}
```

**Response 400 — validação**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dados inválidos",
    "details": [
      { "field": "items.0.unitPrice", "message": "unitPrice must be positive" }
    ]
  }
}
```

**Response 409 — duplicata (idempotency key)**
```json
{
  "success": false,
  "error": { "code": "DUPLICATE", "message": "Invoice already exists" }
}
```

## Prisma Schema (adição)

```prisma
// prisma/schema.prisma

model Invoice {
  id           String        @id @default(uuid())
  customerId   String
  currency     String
  dueDate      DateTime
  totalAmount  Decimal       @db.Decimal(12, 2)
  status       InvoiceStatus @default(PENDING)
  idempotencyKey String?     @unique

  items        InvoiceItem[]

  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  deletedAt    DateTime?

  @@map("invoices")
  @@index([customerId])
  @@index([status])
  @@index([deletedAt])
}

model InvoiceItem {
  id          String  @id @default(uuid())
  invoiceId   String
  description String
  quantity    Int
  unitPrice   Decimal @db.Decimal(12, 2)

  invoice     Invoice @relation(fields: [invoiceId], references: [id])

  @@map("invoice_items")
}

enum InvoiceStatus {
  PENDING
  PAID
  CANCELLED
}
```

> `Decimal` em vez de `Float` — evita perda de precisão em valores monetários.

## DTO com class-validator (NestJS padrão)

```ts
// dto/create-invoice.dto.ts
import {
  IsUUID, IsString, IsISO8601, IsArray,
  ValidateNested, IsInt, Min, IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsOptional } from 'class-validator';
import Decimal from 'decimal.js';
import { IsDecimalPositive } from '../validators/is-decimal-positive.validator';

class InvoiceItemDto {
  @IsString() description: string;
  @IsInt() @Min(1) quantity: number;
  @IsDecimalPositive() unitPrice: Decimal;  // custom validator abaixo
}

export class CreateInvoiceDto {
  @IsUUID()         customerId: string;
  @IsString()       currency: string;
  @IsISO8601()      dueDate: string;
  @IsOptional() @IsString() idempotencyKey?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];
}
```

Custom validator para Decimal positivo:
```ts
// validators/is-decimal-positive.validator.ts
import { registerDecorator } from 'class-validator';
import Decimal from 'decimal.js';

export function IsDecimalPositive() {
  return registerDecorator({
    name: 'isDecimalPositive',
    validator: {
      validate: (v: any) => {
        try { return new Decimal(v).isPositive(); } catch { return false; }
      },
      defaultMessage: () => 'unitPrice must be a positive decimal',
    },
  });
}
```

## Controller

```ts
// invoices.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

@Controller('api/v1/invoices')
@UseGuards(JwtAuthGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateInvoiceDto) {
    const id = await this.invoicesService.create(dto);
    return { success: true, data: { id } };
  }
}
```

## Service

```ts
// invoices.service.ts
import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookService } from '../webhook/webhook.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import Decimal from 'decimal.js';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly webhook: WebhookService,
  ) {}

  async create(dto: CreateInvoiceDto): Promise<string> {
    // idempotency guard
    if (dto.idempotencyKey) {
      const existing = await this.prisma.invoice.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
        select: { id: true },
      });
      if (existing) throw new ConflictException('Invoice already exists');
    }

    const totalAmount = dto.items.reduce(
      (acc, item) => acc.plus(new Decimal(item.unitPrice).times(item.quantity)),
      new Decimal(0),
    );

    const invoice = await this.prisma.invoice.create({
      data: {
        customerId: dto.customerId,
        currency: dto.currency,
        dueDate: new Date(dto.dueDate),
        totalAmount,
        idempotencyKey: dto.idempotencyKey ?? null,
        items: {
          create: dto.items.map(i => ({
            description: i.description,
            quantity: i.quantity,
            unitPrice: new Decimal(i.unitPrice),
          })),
        },
      },
      select: { id: true },
    });

    // fire-and-forget; falha não propaga para o cliente
    this.webhook.emit('invoice.created', { id: invoice.id, totalAmount }).catch(err =>
      console.error('[InvoicesService] webhook emit failed', { invoiceId: invoice.id, err }),
    );

    return invoice.id;
  }
}
```

## WebhookService (esqueleto)

```ts
// webhook/webhook.service.ts
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class WebhookService {
  constructor(private readonly http: HttpService) {}

  async emit(event: string, payload: Record<string, unknown>): Promise<void> {
    const url = process.env.WEBHOOK_URL;
    if (!url) return; // sem URL configurada, silencia
    await firstValueFrom(
      this.http.post(url, { event, payload, timestamp: new Date().toISOString() }),
    );
  }
}
```

> Risco: se precisar de garantia de entrega, substituir por fila (BullMQ + Redis). O fire-and-forget atual é suficiente para notificações best-effort.

## Error Handling — mapeamento completo

| Situação | HTTP | Código de erro |
|---|---|---|
| DTO inválido (ValidationPipe) | 400 | `VALIDATION_ERROR` |
| `idempotencyKey` duplicado | 409 | `DUPLICATE` |
| `customerId` não existe (FK Prisma P2003) | 400 | `INVALID_REFERENCE` |
| Unique constraint genérico (Prisma P2002) | 409 | `DUPLICATE` |
| Erro interno / Prisma inesperado | 500 | `INTERNAL_ERROR` |
| Token JWT ausente/expirado | 401 | `UNAUTHORIZED` |

Global exception filter para normalizar erros Prisma:

```ts
// filters/prisma-exception.filter.ts
import { Catch, ExceptionFilter, ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    const map: Record<string, { status: number; code: string; message: string }> = {
      P2002: { status: 409, code: 'DUPLICATE', message: 'Registro já existe' },
      P2003: { status: 400, code: 'INVALID_REFERENCE', message: 'Referência inválida' },
      P2025: { status: 404, code: 'NOT_FOUND', message: 'Registro não encontrado' },
    };
    const mapped = map[exception.code] ?? {
      status: 500, code: 'INTERNAL_ERROR', message: 'Erro interno',
    };
    res.status(mapped.status).json({ success: false, error: mapped });
  }
}
```

Registrar globalmente em `main.ts`:
```ts
app.useGlobalFilters(new PrismaExceptionFilter());
app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
```

## Module wiring

```ts
// invoices.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { WebhookService } from '../webhook/webhook.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, HttpModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, WebhookService],
})
export class InvoicesModule {}
```

## Handoff QA

Cenários de teste mínimos:
- POST válido → 201 + id UUID
- POST sem `items` → 400 VALIDATION_ERROR
- POST `unitPrice: 0` → 400 VALIDATION_ERROR
- POST `idempotencyKey` repetido → 409 DUPLICATE
- POST sem JWT → 401 UNAUTHORIZED
- POST com `customerId` inexistente → 400 INVALID_REFERENCE

## Riscos explicitados

| Risco | Mitigação sugerida |
|---|---|
| Webhook fire-and-forget | Mover para BullMQ se garantia de entrega for requisito |
| Sem rate limit no endpoint | Adicionar `@nestjs/throttler` (ex: 10 req/min por IP) |
| `customerId` aceita qualquer UUID | Validar existência no service antes de criar (adicionar query) |
