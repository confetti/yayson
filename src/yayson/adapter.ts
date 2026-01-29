export type ModelLike = object

class Adapter {
  static get(model: ModelLike): Record<string, unknown>
  static get(model: ModelLike, key: string): unknown
  static get(model: ModelLike, key?: string): unknown {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- ModelLike is object for flexibility, cast for dynamic access
    const obj = model as Record<string, unknown>
    if (key) {
      return obj[key]
    }
    return obj
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
