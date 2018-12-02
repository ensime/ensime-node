import * as chokidar from 'chokidar'
import * as fs from 'fs'
import * as loglevel from 'loglevel'
import * as path from 'path'
import * as temp from 'temp'

loglevel.setDefaultLevel('trace')
loglevel.setLevel('trace')

// const log = loglevel.getLogger('ensime-cloent-startup-spec')

const testFile = (expectedFile: any) => {
  const spy = jasmine.createSpy('callback')

  const watcher = chokidar.watch(expectedFile, {
    persistent: true
  }).on('add', (path: any) => {
    spy()
    return watcher.close()
  })

  fs.writeFileSync(expectedFile, 'Hello Gaze, see me!')

  return waitsFor(() => spy.calls.count() > 0, "callback wasn't called in time", 5000)
}

xdescribe('chokidar', () => {
  it('should notice absolute paths, even from temp', () => {
    testFile(temp.track().path({ suffix: '.txt' }))
  })

  it('should notice absolute paths if relativized', () => {
    testFile(path.join(process.cwd(), 'foo'))
  })
})
