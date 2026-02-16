/**
 * Interface for Zod-like schema objects.
 * Any schema library that implements `parse` and `safeParse` methods will work.
 */
export interface ZodLikeSchema {
  parse: (data: unknown) => unknown
  safeParse: (data: unknown) => { success: true; data: unknown } | { success: false; error: unknown }
}

export function isZodLikeSchema(schema: unknown): schema is ZodLikeSchema {
  return (
    schema != null &&
    typeof schema === 'object' &&
    'parse' in schema &&
    typeof schema.parse === 'function' &&
    'safeParse' in schema &&
    typeof schema.safeParse === 'function'
  )
}

export interface ValidationResult {
  valid: boolean
  data: unknown
  error?: unknown
}

export function validate(schema: unknown, data: unknown, strict: boolean): ValidationResult {
  if (!isZodLikeSchema(schema)) {
    throw new Error('Invalid schema: must have parse and safeParse methods')
  }

  if (strict) {
    const validData = schema.parse(data)
    return { valid: true, data: validData }
  } else {
    const result = schema.safeParse(data)
    if (result.success) {
      return { valid: true, data: result.data }
    } else {
      return { valid: false, data, error: result.error }
    }
  }
}
