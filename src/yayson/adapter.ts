export type ModelLike = Record<string, unknown>

class Adapter {
  static get<T = unknown>(model: ModelLike, key?: string): T {
    if (key) {
      return model[key] as T
    }
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
