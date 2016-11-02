const vec3 = require('pex-math/Vec3')
const assert = require('assert')

// space colonization
// give me positions of buds and hormones and i'll make a tree for you
module.exports = function (opts) {
  opts = opts || {}

  // supplied data
  assert.ok(Array.isArray(opts.buds), 'space-colonization: you need to supply bud positions as an array of vec3s')
  assert.ok(Array.isArray(opts.hormones), 'space-colonization: you need to supply hormone positions as an array of vec3s')
  let budPosArray = opts.buds
  let hormPosArray = opts.hormones

  // algorithm params
  let deadZone = opts.deadZone || 0.1
  let growthStep = opts.growthStep || 0.02
  let splitChance = opts.splitChance || 0.4
  let viewAngle = opts.viewAngle || 50
  let growType = opts.growType || 'split'
  let branchAngle = opts.branchAngle || 30
  let viewDistance = opts.viewDistance || 0.3
  let growthDirection = opts.growthDirection || [0, 1, 0]
  let growthBias = opts.growthBias || 0

  let buds = budPosArray.map((budPos) => { return { state: 0, position: budPos, parentPos: null } })
  let hormones = hormPosArray.map((hormonePos) => { return { state: 0, position: hormonePos } })

  // iterate function
  return function (opts) {
    opts = opts || {}
    deadZone = opts.deadZone || deadZone
    growthStep = opts.growthStep || growthStep
    splitChance = opts.splitChance || splitChance
    viewAngle = opts.viewAngle || viewAngle
    growType = opts.growType || growthStep
    branchAngle = opts.branchAngle || branchAngle
    viewDistance = opts.viewDistance || viewDistance

    if (opts.buds) {
      opts.buds.forEach((budPos) => {
        buds.push({ state: 0, position: budPos, parentPos: null })
      })
    }

    if (opts.hormones) {
      opts.hormones.forEach((hormonePos) => {
        hormones.push({ state: 0, position: hormonePos })
      })
    }

    // find attractors
    let attractors = []
    for (let k = 0, length = buds.length; k < length; k++) {
      attractors.push([])
    }

    for (let i = 0; i < hormones.length; i++) {
      let hormone = hormones[i]
      if (hormone.state !== 0) continue

      let minDist = viewDistance
      let minDistIndex = -1

      for (let j = 0; j < buds.length; j++) {
        let bud = buds[j]
        if (bud.state > 0) continue
        let dist = vec3.distance(hormone.position, bud.position)
        if (bud.position.direction) {
          let budPosDirNorm = vec3.normalize(vec3.copy(bud.position.direction))
          let hormPosNorm = vec3.normalize(vec3.sub(vec3.copy(hormone.position), bud.position))
          let dot = vec3.dot(budPosDirNorm, hormPosNorm)
          let radians = Math.acos(dot)
          let degrees = radians * (180 / Math.PI)
          if (degrees > viewAngle * 2) {
            continue
          }
        }
        if (dist < minDist) {
          minDist = dist
          minDistIndex = j
        }
      }

      if (minDistIndex === -1) continue

      attractors[minDistIndex].push(i)
      if (minDist < deadZone && minDistIndex !== -1) {
        hormone.state++
      }
    }

    // iterate over buds and grow/kill them
    for (let i = 0, length = buds.length; i < length; i++) {
      let bud = buds[i]
      if (bud.state === 1) continue

      if (attractors[i].length === 0) {
        if (bud.hormones) bud.hormones.length = 0
        bud.state++
        continue
      }

      let budPos = vec3.copy(bud.position)

      // calculate the average vector of all attractors for bud
      let avgPos = vec3.create()
      for (let l = 0; l < attractors[i].length; l++) {
        let hormone = hormones[attractors[i][l]]
        vec3.add(avgPos, hormone.position)
      }
      const avgVec = vec3.scale(avgPos, 1 / attractors[i].length)

      // split at random
      let didSplit = false
      if (Math.random() > (1.0 - splitChance)) {
        // make new branch
        let dir = vec3.sub(vec3.copy(avgVec), budPos)
        vec3.scale(vec3.normalize(dir), growthStep)
        let sinBranchAngle = Math.sin((-branchAngle / 2) * (Math.PI / 180))
        let cosBranchAngle = Math.cos((-branchAngle / 2) * (Math.PI / 180))
        dir[0] = dir[0] * cosBranchAngle + dir[1] * sinBranchAngle
        dir[1] = -(dir[0] * sinBranchAngle) + dir[1] * cosBranchAngle
        let nextPos = vec3.add(vec3.copy(budPos), dir)
        nextPos.direction = dir

        buds.push({
          state: 0,
          position: nextPos,
          parent: bud,
          split: true
        })
        didSplit = true
      }

      // find next position for bud
      let dir = vec3.sub(vec3.copy(avgVec), budPos)

      // global bias
      vec3.lerp(vec3.normalize(dir), vec3.normalize(growthDirection), growthBias)

      vec3.scale(vec3.normalize(dir), growthStep)
      if (didSplit && growType === 'split') {
        // if it split and grow type is 'split' we need to rotate
        let sinBranchAngle = Math.sin(branchAngle * (Math.PI / 180))
        let cosBranchAngle = Math.cos(branchAngle * (Math.PI / 180))
        dir[0] = dir[0] * cosBranchAngle + dir[1] * sinBranchAngle
        dir[1] = -(dir[1] * sinBranchAngle) + dir[1] * cosBranchAngle
      }
      let nextPos = vec3.add(vec3.copy(budPos), dir)
      nextPos.direction = dir

      bud.state++
      buds.push({
        state: 0,
        position: nextPos,
        parent: bud
      })

      bud.hormones = attractors[i].map(function (index) { return hormones[index] })
    }

    return {
      buds: buds,
      hormones: hormones
    }
  }
}
