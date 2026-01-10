export type ModelLike = Record<string, unknown>

class Adapter {
  static get(model: ModelLike): Record<string, unknown>
  static get(model: ModelLike, key: string): unknown
  static get(model: ModelLike, key?: string): unknown {
    if (key) {
      return model[key]
    }
    return model
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
