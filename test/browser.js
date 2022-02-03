import 'core-js/stable'

require('./common')

mocha.setup('bdd')

require('./yayson/store')
require('./yayson/presenter')
require('./yayson/adapter')
require('./yayson/adapters/sequelize')

mocha.checkLeaks()
mocha.run()
