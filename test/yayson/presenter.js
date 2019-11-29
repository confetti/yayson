// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const sinon = require('sinon');
const {
  expect
} = require('chai');
const {
  assert
} = require('chai');

const presenterFactory = require('../../src/yayson.coffee');
const {Presenter} = presenterFactory();

describe('Presenter', function() {
  it('handles null', function() {
    const json = Presenter.toJSON(null);
    return expect(json).to.deep.equal({
      data: null});
  });

  it('create json structure of an object', function() {
    const obj = {id: 5, foo: 'bar'};
    const json = Presenter.toJSON(obj);
    return expect(json).to.deep.equal({
      data: {
        type: 'objects',
        id: '5',
        attributes: {
          foo: 'bar'
        }
      }
    });
  });

  it('create json structure of an array of objects', function() {
    const obj = [{id: 1, foo: 'bar'}, {id: 2, foo: 'baz'}];
    const json = Presenter.toJSON(obj);
    return expect(json).to.deep.equal({
      data: [{
        type: 'objects',
        id: '1',
        attributes: {
          foo: 'bar'
        }
      },{
        type: 'objects',
        id: '2',
        attributes: {
          foo: 'baz'
        }
      }]});
});

  it('should not include id if not specified', function() {
    const obj = {foo: 'bar'};
    const json = Presenter.toJSON(obj);
    return expect(json).to.deep.equal({
      data: {
        type: 'objects',
        attributes: {
          foo: 'bar'
        }
      }
    });
  });

  it('should not dup object', function() {
    const obj = [{id: 1}, {id: 1}];
    const json = Presenter.toJSON(obj);
    return expect(json).to.deep.equal({
      data: [{
        type: 'objects',
        id: '1',
        attributes: {}
      }
      ]});
});

  it('should serialize relations', function() {
    class MotorPresenter extends Presenter {
      static initClass() {
        this.prototype.type = 'motors';
      }
      relationships() {
        return {car: CarPresenter};
      }
    }
    MotorPresenter.initClass();

    class CarPresenter extends Presenter {
      static initClass() {
        this.prototype.type = 'cars';
      }
      relationships() {
        return {motor: MotorPresenter};
      }
    }
    CarPresenter.initClass();

    const motor = {
      id: 2,
      car: null
    };

    const car = {
      id: 1,
      motor
    };

    motor.car = car;

    const json = CarPresenter.toJSON(car);
    return expect(json).to.deep.equal({
      data: {
        type: 'cars',
        id: '1',
        attributes: {},
        relationships: {
          motor: {
            data: {
              type: 'motors',
              id: '2'
            }
          }
        }
      },
      included: [{
        type: 'motors',
        id: '2',
        attributes: {},
        relationships: {
          car: {
            data: {
              type: 'cars',
              id: '1'
            }
          }
        }
      }
      ]});
});

  it('should serialize relations array', function() {
    class WheelPresenter extends Presenter {
      static initClass() {
        this.prototype.type = 'wheels';
      }
      relationships() {
        return {bike: BikePresenter};
      }
    }
    WheelPresenter.initClass();

    class BikePresenter extends Presenter {
      static initClass() {
        this.prototype.type = 'bikes';
      }
      relationships() {
        return {wheels: WheelPresenter};
      }
    }
    BikePresenter.initClass();

    const wheels =[
      // Intentionally adding a relation that uses the same ID as the base data
      // to prevent a regression where data of different types but of the same id
      // would not get included
      {
        id: 1,
        bike: null
      },
      {
        id: 2,
        bike: null
      },
      {
        id: 3,
        bike: null
      }
    ];

    const bike = {
      id: 1,
      wheels
    };

    for (let w of Array.from(wheels)) {
      w.bike = bike;
    }

    const json = BikePresenter.toJSON(bike);
    return expect(json).to.deep.equal({
      data: {
        type: 'bikes',
        id: '1',
        attributes: {},
        relationships: {
          wheels: {
            data:[
              {
                type: 'wheels',
                id: '1'
              },
              {
                type: 'wheels',
                id: '2'
              },
              {
                type: 'wheels',
                id: '3'
              }
            ]
          }
        }
      },
      included: [
        {
          type: 'wheels',
          id: '1',
          attributes: {},
          relationships: {
            bike: {
              data: {
                type: 'bikes',
                id: '1'
              }
            }
          }
        },
        {
          type: 'wheels',
          id: '2',
          attributes: {},
          relationships: {
            bike: {
              data: {
                type: 'bikes',
                id: '1'
              }
            }
          }
        },
        {
          type: 'wheels',
          id: '3',
          attributes: {},
          relationships: {
            bike: {
              data: {
                type: 'bikes',
                id: '1'
              }
            }
          }
        }
      ]});
});

  it('should include self link', function() {
    class CarPresenter extends Presenter {
      static initClass() {
        this.prototype.type = 'cars';
      }
      selfLinks(instance) {
        return '/cars/' + this.id(instance);
      }
    }
    CarPresenter.initClass();

    const json = CarPresenter.render({id: 3});
    return expect(json.data.links.self).to.eq('/cars/3');
  });

  it('should include self and related link', function() {
    class CarPresenter extends Presenter {
      static initClass() {
        this.prototype.type = 'cars';
      }
      selfLinks(instance) {
        return {
          self: '/cars/linkage/' + this.id(instance),
          related: '/cars/' + this.id(instance)
        };
      }
    }
    CarPresenter.initClass();

    const json = CarPresenter.render({id: 3});
    expect(json.data.links.self).to.eq('/cars/linkage/3');
    return expect(json.data.links.related).to.eq('/cars/3');
  });

  it('should handle links in relationships', function() {
    class CarPresenter extends Presenter {
      static initClass() {
        this.prototype.type = 'cars';
      }

      relationships() {
        return {car: CarPresenter};
      }

      selfLinks(instance) {
        return '/cars/' + this.id(instance);
      }

      links(instance) {
        return {
          car: {
            self: this.selfLinks(instance) + '/linkage/car',
            related: this.selfLinks(instance) + '/car'
          }
        };
      }
    }
    CarPresenter.initClass();

    const json = CarPresenter.render({id: 3, car: {id: 5}});
    expect(json.data.links.self).to.eq('/cars/3');
    expect(json.data.relationships.car.links.self).to.eq('/cars/3/linkage/car');
    return expect(json.data.relationships.car.links.related).to.eq('/cars/3/car');
  });

  it('should handle links in relationships array', function() {

    class CarPresenter extends Presenter {
      static initClass() {
        this.prototype.type = 'cars';
      }

      relationships() {
        return {cars: CarPresenter};
      }

      selfLinks(instance) {
        return '/cars/' + this.id(instance);
      }

      links(instance) {
        return {
          cars: {
            self: this.selfLinks(instance) + '/linkage/cars',
            related: this.selfLinks(instance) + '/cars'
          }
        };
      }
    }
    CarPresenter.initClass();



    const cars =[
      {
        id: 2,
        car: null
      },
      {
        id: 3,
        car: null
      }
    ];

    const car = {
      id: 1,
      cars
    };

    for (let c of Array.from(cars)) {
      c.car = car;
    }

    const json = CarPresenter.render(car);
    expect(json.data.links.self).to.eq('/cars/1');
    expect(json.data.relationships.cars.links).to.not.eq(undefined);
    expect(json.data.relationships.cars.links.self).to.eq('/cars/1/linkage/cars');
    expect(json.data.relationships.cars.links.related).to.eq('/cars/1/cars');
    return expect(json.data.relationships.cars.data).to.be.an('array');
  });

  it('should handle links in relationships without data', function() {
    class CarPresenter extends Presenter {
      static initClass() {
        this.prototype.type = 'cars';
      }

      relationships() {
        return {car: CarPresenter};
      }

      selfLinks(instance) {
        return '/cars/' + this.id(instance);
      }

      links(instance) {
        return {
          car: {
            self: this.selfLinks(instance) + '/linkage/car',
            related: this.selfLinks(instance) + '/car'
          }
        };
      }
    }
    CarPresenter.initClass();

    const json = CarPresenter.render({id: 3});
    expect(json.data.links.self).to.eq('/cars/3');
    expect(json.data.relationships.car.links.self).to.eq('/cars/3/linkage/car');
    expect(json.data.relationships.car.links.related).to.eq('/cars/3/car');
    return expect(json.data.relationships.car.data).to.eq(undefined);
  });

  it('should render data: null for unspecified relationships', function() {
    class CarPresenter extends Presenter {
      static initClass() {
        this.prototype.type = 'cars';
      }

      relationships() {
        return {car: CarPresenter};
      }
    }
    CarPresenter.initClass();

    const json = CarPresenter.render({id: 3});
    return expect(json.data.relationships).to.deep.equal({
      car: {
        data: null
      }
    });
  });

  it('should serialize in pure JS', function() {
    
    class EventPresenter extends Presenter {
      attributes () {
        super.attributes(...arguments);
        return {hej: 'test'};
      }
    }
    EventPresenter.prototype.type = 'events';
    const presenter = new EventPresenter();
    const json = presenter.toJSON({id: 1});
    return expect(json.data.attributes.hej).to.eq('test');
  });


  it('should use the sequelize adapter', function() {
    const PresenterSequalize = require('../../src/yayson.coffee')({adapter: 'sequelize'}).Presenter;
    const obj = { get(attr) {
      const attrs = {id: 5, foo: 'bar'};
      if (attr != null) {
        return attrs[attr];
      } else {
        return attrs;
      }
    }
  };

    const json = PresenterSequalize.toJSON(obj);
    return expect(json).to.deep.equal({
      data: {
        type: 'objects',
        id: '5',
        attributes: {
          foo: 'bar'
        }
      }
    });
  });

  it('should add meta', function() {
    const obj = {id: 1};
    const json = Presenter.render(obj, {meta: {count: 1}});

    return expect(json.meta.count).to.eq(1);
  });

  it('should exclude id and type from attributes', function() {
    const obj = {id: 5, foo: 'bar', type: 'some'};
    const json = Presenter.toJSON(obj);
    return expect(json).to.deep.equal({
      data: {
        type: 'objects',
        id: '5',
        attributes: {
          foo: 'bar'
        }
      }
    });
  });

  return it('can use custom adapters', function() {
    const obj = {id: 5, foo: 'bar'};
    const adapter = {
      id: sinon.spy(() => 1),
      get: sinon.spy(() => 'bar')
    };
    const PresenterWithMockAdapter = presenterFactory({adapter}).Presenter;
    const json = PresenterWithMockAdapter.toJSON(obj);
    expect(adapter.id).to.have.been.calledOnce;
    return expect(adapter.get).to.have.been.calledOnce;
  });
});
