---
scenario: 04-frontend-integration
pass: baseline
model: claude-sonnet-4-6
tokens_in_approx: 280
tokens_out_approx: 1420
time_seconds: 18
quality_score: 3.0
quality_breakdown:
  specificity: 3
  completeness: 3
  correctness: 4
  actionability: 3
  discipline: 3
pass_fail: n/a
delta_vs_baseline: n/a
notes: "correct but generic — no file structure, no concrete hook composition, skips skeleton/optimistic UX"
---

# Baseline — Formulário Multi-Step com Next.js 14 + React Query + react-hook-form + Zod

## Organização de State

Use um estado central para controlar a etapa atual e os dados acumulados de cada step:

```tsx
const [currentStep, setCurrentStep] = useState(0)
const [formData, setFormData] = useState({})
```

Ou use um context/Zustand para compartilhar entre componentes filhos.

## Validação por Step com Zod

Defina schemas separados por etapa:

```ts
const step1Schema = z.object({ name: z.string().min(1), email: z.string().email() })
const step2Schema = z.object({ phone: z.string().min(10) })
const step3Schema = z.object({ address: z.string().min(5) })

const schemas = [step1Schema, step2Schema, step3Schema]
```

No `useForm`, use o schema da etapa atual via `zodResolver(schemas[currentStep])`.

## Validação com API (por step)

Use React Query mutations para validar no servidor antes de avançar:

```ts
const validateMutation = useMutation({
  mutationFn: (data) => fetch(`/api/validate/step${currentStep}`, { method: 'POST', body: JSON.stringify(data) }),
  onSuccess: () => setCurrentStep(prev => prev + 1),
  onError: (err) => { /* exibir erro */ }
})

const handleNext = handleSubmit(async (data) => {
  validateMutation.mutate(data)
})
```

## UX de Loading e Erro

- Desabilitar o botão "Próximo" enquanto `validateMutation.isPending`
- Mostrar spinner no botão
- Exibir mensagem de erro da API abaixo do campo ou em toast

```tsx
<button disabled={validateMutation.isPending}>
  {validateMutation.isPending ? 'Validando...' : 'Próximo'}
</button>
{validateMutation.isError && <p className="text-red-500">{validateMutation.error.message}</p>}
```

## Estrutura Geral

```tsx
export function MultiStepForm() {
  const [step, setStep] = useState(0)
  const methods = useForm({ resolver: zodResolver(schemas[step]) })

  return (
    <FormProvider {...methods}>
      {step === 0 && <Step1 />}
      {step === 1 && <Step2 />}
      {step === 2 && <Step3 />}
    </FormProvider>
  )
}
```

## Boas Práticas

- Manter dados dos steps anteriores no state ou em `localStorage` para recuperação
- Mostrar indicador de progresso (stepper visual)
- Validar campos localmente (Zod) antes de chamar a API
- Tratar erros de campo específicos retornados pela API (mapear para `setError` do react-hook-form)
