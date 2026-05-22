---
scenario: 03-backend-api
pass: baseline
model: claude-sonnet-4-6
tokens_in_approx: 210
tokens_out_approx: 820
time_seconds: 18
quality_score: 3.0
quality_breakdown:
  specificity: 4
  completeness: 3
  correctness: 3
  actionability: 3
  discipline: 4
pass_fail: baseline
delta_vs_baseline: null
notes: "pass A — no skill, cold answer. Float para valor monetário é risco que o próprio output aponta mas não corrige. Falta module wiring, PrismaExceptionFilter, idempotency, JWT guard, formato padronizado de resposta."
---

# POST /invoices — Baseline Answer (no skill)

## Arquivos sugeridos

```
src/
  invoices/
    invoices.module.ts
    invoices.controller.ts
    invoices.service.ts
    dto/
      create-invoice.dto.ts
    entities/
      invoice.entity.ts       ← (opcional se só usar Prisma types)
```

## Contrato REST

**Request**
```
POST /invoices
Content-Type: application/json

{
  "customerId": "uuid",
  "amount": 150.00,
  "currency": "BRL",
  "dueDate": "2024-03-31",
  "items": [
    { "description": "Serviço X", "quantity": 1, "unitPrice": 150.00 }
  ]
}
```

**Response 201**
```json
{ "id": "uuid-gerado" }
```

## DTO com validação

```ts
// create-invoice.dto.ts
import { IsString, IsNumber, IsDateString, IsArray, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

class InvoiceItemDto {
  @IsString() description: string;
  @IsNumber() quantity: number;
  @IsNumber() unitPrice: number;
}

export class CreateInvoiceDto {
  @IsUUID() customerId: string;
  @IsNumber() amount: number;
  @IsString() currency: string;
  @IsDateString() dueDate: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];
}
```

## Controller

```ts
// invoices.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateInvoiceDto) {
    const id = await this.invoicesService.create(dto);
    return { id };
  }
}
```

## Service com Prisma + webhook

```ts
// invoices.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookService } from '../webhook/webhook.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly webhook: WebhookService,
  ) {}

  async create(dto: CreateInvoiceDto): Promise<string> {
    // validações de negócio adicionais
    if (dto.amount <= 0) throw new BadRequestException('amount must be positive');

    const invoice = await this.prisma.invoice.create({
      data: {
        customerId: dto.customerId,
        amount: dto.amount,
        currency: dto.currency,
        dueDate: new Date(dto.dueDate),
        items: { create: dto.items },
      },
    });

    // emitir evento pra webhook de forma assíncrona
    this.webhook.emit('invoice.created', { id: invoice.id }).catch(err =>
      console.error('webhook emit failed', err)
    );

    return invoice.id;
  }
}
```

## Error handling

| Situação | HTTP | Corpo |
|---|---|---|
| Validation pipe falha | 400 | `{ statusCode: 400, message: [...errors], error: "Bad Request" }` |
| `customerId` não existe no DB | 400 | `BadRequestException('customer not found')` |
| Erro interno Prisma | 500 | handler global |

Habilitar o `ValidationPipe` globalmente em `main.ts`:

```ts
app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
```

## Prisma schema (adição mínima)

```prisma
model Invoice {
  id         String   @id @default(uuid())
  customerId String
  amount     Float
  currency   String
  dueDate    DateTime
  items      InvoiceItem[]
  createdAt  DateTime @default(now())
}

model InvoiceItem {
  id          String  @id @default(uuid())
  invoiceId   String
  invoice     Invoice @relation(fields: [invoiceId], references: [id])
  description String
  quantity    Int
  unitPrice   Float
}
```

## Riscos / observações

- Webhook emit é fire-and-forget; se precisar de garantia, usar fila (BullMQ).
- `amount` como `Float` perde precisão — preferir `Decimal` em Prisma e `Decimal.js` em código.
- Sem idempotency key → retry do cliente cria duplicatas.
