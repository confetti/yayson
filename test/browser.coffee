mocha.setup('bdd')

require('./yayson/store')
require('./yayson/presenter')
require('./yayson/utils')


mocha.checkLeaks()
mocha.run()
