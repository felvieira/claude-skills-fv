// ============================================================
// src/hooks/useForm.ts — Form handling com validação Zod
// ============================================================
import { useState, useCallback, useRef, type ChangeEvent, type FormEvent } from 'react';
import type { ZodSchema, ZodError } from 'zod';

interface UseFormOptions<T> {
  initialValues: T;
  schema?: ZodSchema<T>;
  onSubmit: (values: T) => void | Promise<void>;
}

interface FieldError {
  message: string;
}

interface UseFormReturn<T> {
  values: T;
  errors: Partial<Record<keyof T, FieldError>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
  handleChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleBlur: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  setFieldValue: (field: keyof T, value: any) => void;
  setFieldError: (field: keyof T, message: string) => void;
  handleSubmit: (e: FormEvent) => Promise<void>;
  reset: (values?: T) => void;
  getFieldProps: (name: keyof T) => {
    name: string;
    value: any;
    onChange: (e: ChangeEvent<any>) => void;
    onBlur: (e: ChangeEvent<any>) => void;
  };
}

export function useForm<T extends Record<string, any>>({
  initialValues,
  schema,
  onSubmit,
}: UseFormOptions<T>): UseFormReturn<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, FieldError>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initialRef = useRef(initialValues);

  const isDirty = JSON.stringify(values) !== JSON.stringify(initialRef.current);

  const validate = useCallback(
    (vals: T): boolean => {
      if (!schema) return true;
      try {
        schema.parse(vals);
        setErrors({});
        return true;
      } catch (err) {
        const zodError = err as ZodError;
        const newErrors: Partial<Record<keyof T, FieldError>> = {};
        zodError.errors.forEach((e) => {
          const field = e.path[0] as keyof T;
          if (!newErrors[field]) {
            newErrors[field] = { message: e.message };
          }
        });
        setErrors(newErrors);
        return false;
      }
    },
    [schema]
  );

  const validateField = useCallback(
    (field: keyof T, value: any) => {
      if (!schema) return;
      try {
        schema.parse({ ...values, [field]: value });
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      } catch (err) {
        const zodError = err as ZodError;
        const fieldError = zodError.errors.find((e) => e.path[0] === field);
        if (fieldError) {
          setErrors((prev) => ({ ...prev, [field]: { message: fieldError.message } }));
        }
      }
    },
    [schema, values]
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;
      const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
      setValues((prev) => ({ ...prev, [name]: newValue }));

      if (touched[name as keyof T]) {
        validateField(name as keyof T, newValue);
      }
    },
    [touched, validateField]
  );

  const handleBlur = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name } = e.target;
      setTouched((prev) => ({ ...prev, [name]: true }));
      validateField(name as keyof T, values[name as keyof T]);
    },
    [validateField, values]
  );

  const setFieldValue = useCallback(
    (field: keyof T, value: any) => {
      setValues((prev) => ({ ...prev, [field]: value }));
      if (touched[field]) validateField(field, value);
    },
    [touched, validateField]
  );

  const setFieldError = useCallback((field: keyof T, message: string) => {
    setErrors((prev) => ({ ...prev, [field]: { message } }));
  }, []);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      // Touch all fields
      const allTouched = Object.keys(values).reduce(
        (acc, key) => ({ ...acc, [key]: true }),
        {} as Record<keyof T, boolean>
      );
      setTouched(allTouched);

      if (!validate(values)) return;

      setIsSubmitting(true);
      try {
        await onSubmit(values);
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, validate, onSubmit]
  );

  const reset = useCallback(
    (newValues?: T) => {
      const resetTo = newValues || initialRef.current;
      setValues(resetTo);
      setErrors({});
      setTouched({});
      setIsSubmitting(false);
    },
    []
  );

  const getFieldProps = useCallback(
    (name: keyof T) => ({
      name: name as string,
      value: values[name] ?? '',
      onChange: handleChange,
      onBlur: handleBlur,
    }),
    [values, handleChange, handleBlur]
  );

  const isValid = Object.keys(errors).length === 0;

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    isDirty,
    handleChange,
    handleBlur,
    setFieldValue,
    setFieldError,
    handleSubmit,
    reset,
    getFieldProps,
  };
}
