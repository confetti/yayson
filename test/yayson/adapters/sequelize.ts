import { expect } from 'chai'

const SequelizeAdapter = yayson({ adapter: 'sequelize' }).Presenter.adapter

interface SequelizeModelMock {
  [key: string]: unknown
  get: (...args: unknown[]) => unknown
  constructor: {
    primaryKeys?: Record<string, unknown>
  }
}

describe('SequelizeAdapter', function () {
  beforeEach(function (): void {})

  it('should get all object properties', function (): void {
    const model: SequelizeModelMock = {
      get(): { name: string } {
        return { name: 'Abraham' }
      },
      constructor: {
        primaryKeys: { id: {} },
      },
    }

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing return type
    const attributes = SequelizeAdapter.get(model) as { name: string }
    expect(attributes.name).to.eq('Abraham')

    delete model.constructor.primaryKeys
  })

  it('should get object property', function (): void {
    let args: IArguments | null = null
    const model: SequelizeModelMock = {
      get(...passedArgs: unknown[]): string {
        // eslint-disable-next-line prefer-rest-params -- Need arguments object to test that args are passed correctly
        args = arguments
        return 'Abraham'
      },
      constructor: {
        primaryKeys: { id: {} },
      },
    }

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing return type
    const name = SequelizeAdapter.get(model, 'name') as string

    expect(name).to.eq('Abraham')
    expect(args![0]).to.eq('name')

    delete model.constructor.primaryKeys
  })

  it('should get the id', function (): void {
    const model: SequelizeModelMock = {
      get(...args: unknown[]): number {
        expect(args[0]).to.eq('id')
        return 5
      },
      constructor: {
        primaryKeys: { id: {} },
      },
    }

    const id = SequelizeAdapter.id(model)
    expect(id).to.eq('5')

    delete model.constructor.primaryKeys
  })

  it('should get the id with custom pk', function (): void {
    const model: SequelizeModelMock = {
      get(...args: unknown[]): number {
        expect(args[0]).to.eq('myPk')
        return 5
      },
      constructor: {
        primaryKeys: { myPk: {} },
      },
    }

    const id = SequelizeAdapter.id(model)
    expect(id).to.eq('5')

    delete model.constructor.primaryKeys
  })

  it('should error with composite pk', function (): void {
    const model: SequelizeModelMock = {
      get(...args: unknown[]): void {
        // should never be called
        expect(false).to.eq(true)
      },
      constructor: {
        primaryKeys: { myPk: {}, myPk2: {} },
      },
    }

    expect(() => SequelizeAdapter.id(model)).to.throw()

    delete model.constructor.primaryKeys
  })
})
