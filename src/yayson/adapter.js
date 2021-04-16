class Adapter {
  static get(model, key) {
    if (key) {
      return model[key]
    }
    return model
  }

  static id(model) {
    const id = this.get(model, 'id')
    if (id === undefined) {
      return id
    }
    return `${id}`
  }
}

module.exports = Adapter
