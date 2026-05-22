---
scenario: 04-frontend-integration
pass: treatment
model: claude-sonnet-4-6
tokens_in_approx: 3800
tokens_out_approx: 2100
time_seconds: 31
quality_score: 4.5
quality_breakdown:
  specificity: 5
  completeness: 5
  correctness: 4
  actionability: 5
  discipline: 4
pass_fail: pass
delta_vs_baseline: +1.5
notes: "cita arquivos concretos, usa useApiMutation do skill, mapeia erros de API para setError, cobre todos estados UX; perde 1pt discipline por incluir authStore que não foi pedido"
---

# Treatment — Formulário Multi-Step (3 etapas) com API REST por step

Stack: Next.js 14 App Router · React Query · react-hook-form · Zod

---

## Estrutura de Arquivos

```
src/
  app/
    (checkout)/
      page.tsx                 ← Server Component shell
  components/
    features/
      multi-step-form/
        MultiStepForm.tsx      ← controlador de step + FormProvider
        Step1Personal.tsx
        Step2Address.tsx
        Step3Review.tsx
        StepIndicator.tsx
  hooks/
    useStepValidation.ts       ← mutation por step via useApiMutation
  lib/
    query-keys.ts              ← chaves do react-query
    schemas/
      checkout.ts              ← schemas Zod por step
```

---

## 1. Schemas Zod (um por step)

`src/lib/schemas/checkout.ts`

```ts
import { z } from 'zod'

export const step1Schema = z.object({
  name:  z.string().min(2),
  email: z.string().email(),
})

export const step2Schema = z.object({
  zipCode: z.string().regex(/^\d{5}-\d{3}$/),
  street:  z.string().min(3),
})

export const step3Schema = z.object({
  confirm: z.literal(true, { errorMap: () => ({ message: 'Confirme os dados' }) }),
})

export const stepSchemas = [step1Schema, step2Schema, step3Schema] as const
export type StepIndex = 0 | 1 | 2

// Tipo acumulado de todos os campos
export type FormValues = z.infer<typeof step1Schema>
  & z.infer<typeof step2Schema>
  & z.infer<typeof step3Schema>
```

---

## 2. Hook de Validação por Step

`src/hooks/useStepValidation.ts`

Usa `useApiMutation` do padrão da skill (method POST, invalida nada, apenas avança step).

```ts
import { useApiMutation } from '@/hooks/useApi'  // padrão do kit

export function useStepValidation(step: number) {
  return useApiMutation<Record<string, unknown>, { valid: boolean; errors?: Record<string, string> }>(
    'post',
    `/api/checkout/validate/step${step + 1}`,
  )
}
```

A API retorna `{ valid: true }` ou `{ valid: false, errors: { field: 'mensagem' } }`.

---

## 3. Controlador Principal

`src/components/features/multi-step-form/MultiStepForm.tsx`

```tsx
'use client'

import { useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { stepSchemas, type FormValues, type StepIndex } from '@/lib/schemas/checkout'
import { useStepValidation } from '@/hooks/useStepValidation'
import Step1Personal from './Step1Personal'
import Step2Address  from './Step2Address'
import Step3Review   from './Step3Review'
import StepIndicator from './StepIndicator'

const STEPS = [Step1Personal, Step2Address, Step3Review]
const TOTAL  = STEPS.length

export default function MultiStepForm() {
  const [currentStep, setCurrentStep] = useState<StepIndex>(0)

  const methods = useForm<FormValues>({
    resolver: zodResolver(stepSchemas[currentStep]),
    mode: 'onTouched',        // valida ao sair do campo, não só no submit
    shouldUnregister: false,  // preserva valores entre steps
  })

  const validateMutation = useStepValidation(currentStep)

  // Avança: valida localmente (Zod) → chama API → mapeia erros de API
  const handleNext = methods.handleSubmit(async (stepData) => {
    const result = await validateMutation.mutateAsync(stepData).catch(() => null)

    if (!result) return // erro de rede — mutation já expõe isError

    if (!result.valid && result.errors) {
      // Mapeia erros da API para campos do react-hook-form
      Object.entries(result.errors).forEach(([field, message]) => {
        methods.setError(field as keyof FormValues, { message })
      })
      return
    }

    if (currentStep < TOTAL - 1) {
      setCurrentStep((s) => (s + 1) as StepIndex)
    } else {
      handleSubmitFinal(methods.getValues())
    }
  })

  const handleBack = () => setCurrentStep((s) => Math.max(0, s - 1) as StepIndex)

  const StepComponent = STEPS[currentStep]
  const isPending     = validateMutation.isPending
  const isLastStep    = currentStep === TOTAL - 1

  return (
    <FormProvider {...methods}>
      <div className="max-w-lg mx-auto space-y-8">
        <StepIndicator current={currentStep} total={TOTAL} />

        <form onSubmit={handleNext} noValidate className="space-y-6">
          <StepComponent />

          {/* Erro de rede (não de validação de campo) */}
          {validateMutation.isError && (
            <p role="alert" className="text-sm text-red-600">
              Erro ao validar. Tente novamente.
            </p>
          )}

          <div className="flex justify-between pt-4">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handleBack}
                disabled={isPending}
                className="px-4 py-2 text-sm border rounded-md disabled:opacity-50"
              >
                Voltar
              </button>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="ml-auto flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md disabled:opacity-60"
            >
              {isPending && <Spinner className="h-4 w-4" />}
              {isPending ? 'Validando…' : isLastStep ? 'Confirmar' : 'Próximo'}
            </button>
          </div>
        </form>
      </div>
    </FormProvider>
  )
}

// Submissão final — troque por outra mutation de submit completo
function handleSubmitFinal(data: FormValues) {
  console.log('submit final', data)
}
```

---

## 4. Step Component (exemplo Step1)

`src/components/features/multi-step-form/Step1Personal.tsx`

```tsx
'use client'
import { useFormContext } from 'react-hook-form'
import type { FormValues } from '@/lib/schemas/checkout'

export default function Step1Personal() {
  const { register, formState: { errors } } = useFormContext<FormValues>()

  return (
    <fieldset className="space-y-4">
      <legend className="text-lg font-medium">Dados Pessoais</legend>

      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">Nome</label>
        <input
          id="name"
          {...register('name')}
          aria-describedby={errors.name ? 'name-error' : undefined}
          className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
        />
        {errors.name && (
          <p id="name-error" role="alert" className="mt-1 text-xs text-red-600">
            {errors.name.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
        <input
          id="email"
          type="email"
          {...register('email')}
          aria-describedby={errors.email ? 'email-error' : undefined}
          className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
        />
        {errors.email && (
          <p id="email-error" role="alert" className="mt-1 text-xs text-red-600">
            {errors.email.message}
          </p>
        )}
      </div>
    </fieldset>
  )
}
```

---

## 5. Indicador de Progresso

`src/components/features/multi-step-form/StepIndicator.tsx`

```tsx
interface Props { current: number; total: number }

export default function StepIndicator({ current, total }: Props) {
  return (
    <nav aria-label="Etapas do formulário">
      <ol className="flex items-center gap-2">
        {Array.from({ length: total }).map((_, i) => (
          <li key={i} className="flex items-center gap-2">
            <span
              aria-current={i === current ? 'step' : undefined}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${i < current  ? 'bg-blue-600 text-white'         : ''}
                ${i === current ? 'ring-2 ring-blue-600 text-blue-600' : ''}
                ${i > current  ? 'bg-gray-100 text-gray-400'      : ''}`}
            >
              {i + 1}
            </span>
            {i < total - 1 && <div className="flex-1 h-px bg-gray-200 w-8" />}
          </li>
        ))}
      </ol>
    </nav>
  )
}
```

---

## 6. Decisões de Arquitetura e Riscos

| Decisão | Justificativa |
|---|---|
| `shouldUnregister: false` | Preserva valores de steps anteriores ao voltar |
| `mode: 'onTouched'` | Evita erros prematuros ao entrar na tela |
| Zod local antes da API | Garante contrato mínimo sem round-trip |
| `setError` com campos da API | Mapeia erros server-side direto nos campos |
| `mutateAsync` + `.catch(() => null)` | Erro de rede não quebra o flow — `isError` cuida do feedback |
| Schema separado por step (não union) | `zodResolver` muda por step sem recriar o form |
| `noValidate` no form | Desabilita validação nativa do browser (Zod é a source of truth) |

**Riscos para QA testar:**
- Clicar "Próximo" muito rápido (double-submit) — botão desabilitado em `isPending`
- API retorna campo inexistente em `errors` — `setError` no react-hook-form aceita campo arbitrário sem crash
- Voltar e reenviar step anterior — `shouldUnregister: false` + schema do step correto
- Timeout de API — `useApiMutation` tem retry 0 por padrão; isError exibe mensagem genérica

---

## Estados UX cobertos

| Estado | Tratamento |
|---|---|
| Loading (chamada API) | Spinner no botão + disabled |
| Erro de rede | `isError` → banner de erro + botão habilitado para retry |
| Erro de campo (Zod) | Inline sob o campo |
| Erro de campo (API) | `setError` → mesmo tratamento do Zod |
| Navegação para step anterior | `handleBack` + dados preservados |
| Step final | Label "Confirmar" + chama `handleSubmitFinal` |
