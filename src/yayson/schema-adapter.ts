import type { ValidationResult } from './types.js'

interface ZodLikeSchema {
  parse: (data: unknown) => unknown
  safeParse: (data: unknown) => { success: true; data: unknown } | { success: false; error: unknown }
}

class SchemaAdapter {
  static validate(schema: unknown, data: unknown, strict: boolean): ValidationResult {
    const zodSchema = schema as ZodLikeSchema

    if (strict) {
      try {
        const validData = zodSchema.parse(data)
        return {
          valid: true,
          data: validData,
        }
      } catch (error) {
        throw error
      }
    } else {
      const result = zodSchema.safeParse(data)
      if (result.success) {
        return {
          valid: true,
          data: result.data,
        }
      } else {
        return {
          valid: false,
          data,
          error: result.error,
        }
      }
    }
  }

  validate(schema: unknown, data: unknown, strict: boolean): ValidationResult {
    return SchemaAdapter.validate(schema, data, strict)
  }
}

export default SchemaAdapter
