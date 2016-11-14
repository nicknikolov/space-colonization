const regl = require('regl')({ pixelRatio: 1 })
const mat4 = require('pex-math/Mat4')
const vec3 = require('pex-math/Vec3')
const rnd = require('pex-random')
const sphere = require('primitive-sphere')()

// generate hormones
let hormones = []
for (let i = 0; i < 200; i++) {
  var pos = vec3.add(rnd.vec3(1), [0, 0, 0])
  if (vec3.length(vec3.sub(pos, [0, 0, 0])) > 5) {
    i--
    continue
  }
  hormones.push(pos)
}

const iterate = require('./index')({
  buds: [[0, -1, 0]],
  hormones: hormones,
  deadZone: 0.1,
  growthStep: 0.03,
  splitChance: 0.4,
  viewAngle: 30,
  branchAngle: 30,
  viewDistance: 0.5
})

const camera = require('regl-camera')(regl, {
  center: [0, 0, 0],
  theta: Math.PI / 2,
  distance: 4
})

const drawSphere = regl({
  vert: `
  precision mediump float;
  attribute vec3 position;
  uniform mat4 projection, view, model;
  void main() {
    gl_Position = projection * view * model * vec4(position, 1);
  }`,
  frag: `
  precision mediump float;
  uniform vec3 color;
  void main() {
    gl_FragColor = vec4(color, 1.0);
  }`,
  attributes: {
    position: sphere.positions
  },
  elements: sphere.cells,
  uniforms: {
    color: regl.prop('color'),
    model: regl.prop('model')
  }
})

// const drawLine = regl({
//   frag: `
//   precision mediump float;
//   uniform vec4 color;
//   void main () {
//     gl_FragColor = color;
//   }`,
//   vert: `
//   precision mediump float;
//   uniform mat4 projection, view;
//   attribute vec3 position;
//   void main () {
//     gl_Position = projection * view * vec4(position, 1);
//   }`,
//   attributes: {
//     position: regl.prop('pos')
//   },
//   uniforms: {
//     color: [1, 0, 0, 1]
//   },
//   primitive: 'lines',
//   count: 2
// })

regl.frame(() => {
  regl.clear({
    color: [1, 1, 1, 1],
    depth: 1
  })

  camera(() => {
    let iterObject = iterate()
    let hormones = iterObject.hormones
    let buds = iterObject.buds

    let minArea = 0.0005
    for (let i = 0; i < buds.length; i++) {
      buds[i].area = minArea
    }

    buds.forEach((bud) => {
      if (bud.parentIndex !== -1) {
        buds[bud.parentIndex].hasChildren = true
      }
    })

    buds.forEach(function (bud) {
      let parent = buds[bud.parentIndex]
      if (bud.hasChildren) return
      while (parent) {
        parent.area = (parent.area || 0) + minArea
        parent = buds[parent.parentIndex]
      }
    })

    for (let i = 0; i < hormones.length; i++) {
      var hormone = hormones[i]
      if (hormone.state === 0) {
        // alive hormone
        let model = mat4.createFromTranslation(hormone.position)
        mat4.scale(model, [0.05, 0.05, 0.05])
        drawSphere({ color: [0, 0, 1], view: mat4.create(), model: model })
      } else if (hormone.state === 1) {
        // dead hormone
      }
    };

    for (let i = 0; i < buds.length; i++) {
      var bud = buds[i]
      if (bud.state === 0) {
        // alive
        let model = mat4.createFromTranslation(bud.position)
        mat4.scale(model, [0.05, 0.05, 0.05])
        drawSphere({ color: [0, 1, 0], view: mat4.create(), model: model })
      }

      if (bud.state === 1) {
        // dead
        let model = mat4.createFromTranslation(bud.position)
        let radius = Math.sqrt(bud.area) / 10
        mat4.scale(model, [radius, radius, radius])
        drawSphere({ color: [0.4, 0.4, 0.4], view: mat4.create(), model: model })
      }
    }
  })
})

