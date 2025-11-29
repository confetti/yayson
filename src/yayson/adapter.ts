export type ModelLike = Record<string, unknown>

class Adapter {
  static get<T = unknown>(model: ModelLike, key?: string): T {
    if (key) {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Adapter pattern requires type casting from unknown
      return model[key] as T
    }
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Adapter pattern requires type casting from unknown
    return model as T
  }

  static id(model: ModelLike): string | undefined {
    const id = this.get(model, 'id')
    if (id === undefined) {
      return id
    }
    return `${id}`
  }
}

export default Adapter
