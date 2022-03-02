const fs = require('fs')
const path = require('path')
const rollup = require('rollup')



let builds = require('./config').getAllBuilds()

build(builds)

function build (builds) {
  let built = 0
  const total = builds.length
  const next = () => {
    buildEntry(builds[built]).then(() => {
      built++
      if (built < total) {
        next()
      }
    }).catch()
  }

  next()
}

function buildEntry (config) {
  const output = config.output
  const { file, } = output
  return rollup.rollup(config)
  .then(bundle => bundle.generate(output))
  .then(({ output: [{ code }] }) => {
    return write(file, code, true)
  })
}

function write (dest, code, zip) {
  return new Promise((resolve, reject) => {
    function report () {
      resolve()
    }
    fs.writeFile(dest, code, err => {
      if (err) return reject(err)
      report()
    })
  })
}