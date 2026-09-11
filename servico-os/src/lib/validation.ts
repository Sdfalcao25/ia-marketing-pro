import { z } from 'zod';

const optionalText = z.string().trim().max(500).optional().or(z.literal(''));

export const customerSchema = z.object({
  name: z.string().trim().min(2).max(160),
  type: z.enum(['PERSON','COMPANY']).default('PERSON'),
  document: optionalText,
  email: z.string().trim().email().optional().or(z.literal('')),
  phone: optionalText
});

export const quoteSchema = z.object({
  customerId: z.string().uuid(),
  description: z.string().trim().min(2).max(500),
  quantity: z.coerce.number().positive().max(100000),
  unitPrice: z.coerce.number().nonnegative().max(100000000),
  validUntil: z.string().optional().or(z.literal('')),
  notes: optionalText
});

export const workOrderSchema = z.object({
  customerId: z.string().uuid(),
  title: z.string().trim().min(2).max(180),
  description: optionalText,
  priority: z.enum(['LOW','NORMAL','HIGH','URGENT']).default('NORMAL'),
  scheduledStart: z.string().optional().or(z.literal('')),
  amount: z.coerce.number().nonnegative().max(100000000)
});
