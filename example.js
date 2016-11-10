const regl = require('regl')({
  pixelRatio: 1,
  extensions: ['EXT_shader_texture_lod', 'angle_instanced_arrays']
})
const glsl = require('glslify')
const mat4 = require('pex-math/Mat4')
const vec3 = require('pex-math/Vec3')
const quat = require('pex-math/Quat')
const sphere = require('primitive-sphere')()
const cube = require('primitive-cube')()
const GUI = require('./local_modules/pex-gui')
const sc = require('./index')
const numPoints = 100
// test
const revolve = require('geom-revolve')
const path = [
  [0.0, 1.0, 0.0],
  [0.2, 1.0, 0.0],
  [0.3, 0.8, 0.0],
  [0.5, 0.7, 0.0],
  [0.4, 0.5, 0.0],
  [0.08, 0.2, 0.0],
  [0.05, 0.0, 0.0],
  [0.0, 0.0, 0.0],
  [0.0, -0.2, 0.0],
  [0.0, -0.4, 0.0],
  [0.0, -0.6, 0.0],
  [0.0, -0.8, 0.0],
  [0.0, -1.0, 0.0]
]

const torus = revolve(path, 16)
const randomVolumePoints = require('random-volume-points')
let volumePoints = randomVolumePoints(torus.positions, torus.cells, numPoints)

// algorithm params
let State = {}
State.deadZone = 0.1
State.growthStep = 0.03
State.splitChance = 0.4
State.viewAngle = 30
State.branchAngle = 30
State.viewDistance = 0.5
State.growthDirection = [0, 1, 0]
State.growthBias = 0.5
State.drawHormones = true
State.drawLeaves = true

const gui = new GUI(regl, window.innerWidth, window.innerHeight)
window.addEventListener('mousedown', (e) => {
  gui.onMouseDown(e)
})
gui.addHeader('params')
gui.addParam('growth step', State, 'growthStep', { min: 0.01, max: 0.1 })
gui.addParam('split chance', State, 'splitChance', { min: 0, max: 1 })
gui.addParam('view angle', State, 'viewAngle', { min: 0, max: 180 })
gui.addParam('branch angle', State, 'branchAngle', { min: 0, max: 180 })
gui.addParam('view distance', State, 'viewDistance', { min: 0, max: 1 })
gui.addParam('growth dir', State, 'growthDirection', { min: -1, max: 1 })
gui.addParam('growth bias', State, 'growthBias', { min: 0, max: 1 })
gui.addParam('draw hormones', State, 'drawHormones')
gui.addParam('draw leaves', State, 'drawLeaves')

gui.addSeparator()
gui.addButton('restart', () => {
  volumePoints = randomVolumePoints(torus.positions, torus.cells, numPoints)
  iterate = sc({ buds: [[0, 0, 0]], hormones: volumePoints })
})
let jsonData = []
gui.addButton('save', () => {
  console.log(JSON.stringify(jsonData))
})

let iterate = sc({ buds: [[0, 0, 0]], hormones: volumePoints })

const camera = require('regl-camera')(regl, {
  center: [0, 0, 0],
  theta: Math.PI / 2,
  distance: 4
})

const drawCube = regl({
  vert: glsl`
  #pragma glslify: quatToMat4 = require(./quat-to-mat4.glsl)
  precision mediump float;
  attribute vec3 position, offset, scale;
  attribute vec4 rotation;
  uniform mat4 projection, view, model;
  void main() {
    mat4 rotationMatrix = quatToMat4(rotation);
    vec4 pos = vec4(position, 1);
    pos.xyz *= scale;
    pos.z *= 5.0;
    // pos.xyz *= vec3(0.02, 0.02, 0.06);
    pos = rotationMatrix * pos;
    pos.xyz += offset;
    gl_Position = projection * view * model * pos;
  }`,
  frag: `
  precision mediump float;
  uniform vec3 color;
  void main() {
    gl_FragColor = vec4(color, 1.0);
  }`,
  attributes: {
    position: cube.positions,
    offset: {
      buffer: regl.prop('offset'),
      divisor: 1
    },
    scale: {
      buffer: regl.prop('scale'),
      divisor: 1
    },
    rotation: {
      buffer: regl.prop('rotation'),
      divisor: 1
    }
  },
  elements: cube.cells,
  instances: regl.prop('instances'),
  uniforms: {
    color: regl.prop('color'),
    model: regl.prop('model')
  }
})

const drawSphere = regl({
  vert: `
  precision mediump float;
  attribute vec3 position, offset;
  uniform mat4 projection, view;
  void main() {
    vec4 pos = vec4(position, 1);
    pos.xyz *= vec3(0.02, 0.02, 0.02);
    pos.xyz += offset;
    gl_Position = projection * view * pos;
  }`,
  frag: `
  precision mediump float;
  uniform vec3 color;
  void main() {
    gl_FragColor = vec4(color, 1.0);
  }`,
  attributes: {
    position: sphere.positions,
    offset: {
      buffer: regl.prop('offset'),
      divisor: 1
    },
  },
  elements: sphere.cells,
  instances: regl.prop('instances'),
  uniforms: {
    color: [1, 0, 0],
  }
})

const drawTriangle = regl({
  vert: glsl`
  #pragma glslify: quatToMat4 = require(./quat-to-mat4.glsl)
  precision mediump float;
  uniform mat4 projection, view;
  attribute vec3 position, offset, normal;
  attribute vec4 rotation;
  varying vec3 vNormal;
  void main () {
    mat4 rotationMatrix = quatToMat4(rotation);
    vNormal = vec3(rotationMatrix * vec4(normal, 1));
    vec4 pos = vec4(position, 1);
    pos.z += 1.0;
    pos.xyz *= vec3(0.05, 0.05, 0.10);
    pos = rotationMatrix * pos;
    pos.xyz += offset;
    gl_Position = projection * view * pos;
  }`,
  frag: `
  precision mediump float;
  uniform vec4 color;
  varying vec3 vNormal;
  void main () {
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(vec3(0.0, 1.0, 0.0));
    float diffuse = max(0.0, dot(lightDir, normal));
    gl_FragColor.rgb = color.rgb * diffuse;
    //gl_FragColor.rgb = normal;
    gl_FragColor.a = 1.0;
  }`,
  attributes: {
    position: [
      [-1, 0, 1],
      [1, 0, 1],
      [1, 0, -1],
      [-1, 0, -1]
    ],
    normal: [
      [0, 1, 0],
      [0, 1, 0],
      [0, 1, 0],
      [0, 1, 0]
    ],
    offset: {
      buffer: regl.prop('offset'),
      divisor: 1
    },
    rotation: {
      buffer: regl.prop('rotation'),
      divisor: 1
    }
  },
  elements: [[0, 1, 2], [2, 3, 0]],
  instances: regl.prop('instances'),
  uniforms: {
    color: [0, 1, 0, 1]
  },
  count: 6
})

const drawLine = regl({
  frag: `
  precision mediump float;
  uniform vec4 color;
  void main () {
    gl_FragColor = color;
  }`,
  vert: `
  precision mediump float;
  uniform mat4 projection, view;
  attribute vec3 position;
  void main () {
    gl_Position = projection * view * vec4(position, 1);
  }`,
  attributes: {
    position: regl.prop('pos')
  },
  uniforms: {
    color: [1, 0, 0, 1]
  },
  primitive: 'lines',
  count: 2
})

let offsetsBuff = regl.buffer({
  type: 'float',
  usage: 'dynamic'
})

let scalesBuff = regl.buffer({
  type: 'float',
  usage: 'dynamic'
})

let rotationsBuff = regl.buffer({
  type: 'float',
  usage: 'dynamic'
})

let leafOffsetsBuff = regl.buffer({
  type: 'float',
  usage: 'dynamic'
})

let leafRotationsBuff = regl.buffer({
  type: 'float',
  usage: 'dynamic'
})

let hormoneOffsetBuff = regl.buffer({
  type: 'float',
  usage: 'dynamic'
})

let prevAlive = 0

regl.frame(() => {
  regl.clear({
    color: [1, 1, 1, 1],
    depth: 1
  })

  camera(() => {
    let iterObject = iterate({
      deadZone: 0.1,
      growthStep: State.growthStep,
      splitChance: State.splitChance,
      viewAngle: State.viewAngle,
      branchAngle: State.branchAngle,
      viewDistance: State.viewDistance,
      growthDirection: State.growthDirection,
      growthBias: State.growthBias
    })
    let hormones = iterObject.hormones
    let buds = iterObject.buds

    const budOffsets = []
    const budScales = []
    const budRotations = []
    const leafOffsets = []
    const leafRotations = []
    const hormoneOffsets = []
    jsonData.length = 0

    let minArea = 0.0005
    for (let i = 0; i < buds.length; i++) {
      buds[i].area = minArea
    }

    buds.forEach((bud) => {
      if (bud.parent) bud.parent.hasChildren = true
    })

    buds.forEach((bud) => {
      if (!bud.hasChildren && bud.parent) {
        const rot = quat.fromDirection(quat.create(), vec3.sub(vec3.copy(bud.position), bud.parent.position))
        leafRotations.push(rot)
        leafOffsets.push(bud.position)
      }
    })

    buds.forEach(function (bud) {
      var parent = bud.parent
      if (bud.hasChildren) return
      while (parent) {
        parent.area = (parent.area || 0) + minArea
        parent = parent.parent
      }
    })

    for (let i = 0; i < hormones.length; i++) {
      var hormone = hormones[i]
      if (hormone.state === 0) {
        // alive hormone
        // let model = mat4.createFromTranslation(hormone.position)
        // mat4.scale(model, [0.05, 0.05, 0.05])
        // drawCube({ color: [0, 0, 1], view: mat4.create(), model: model })
        hormoneOffsets.push(hormone.position)
      } else if (hormone.state === 1) {
        // dead hormone
      }
    };

    let alive = 0

    for (let i = 0; i < buds.length; i++) {
      var bud = buds[i]
      if (bud.parent) {
        // drawLine({ pos: [bud.parent.position, bud.position] })
      }

      if (bud.state === 0) {
        alive++

        // alive
        // let model = mat4.createFromTranslation(bud.position)
        // mat4.scale(model, [0.05, 0.05, 0.05])
        // drawCube({ color: [0, 1, 0], view: mat4.create(), model: model })
      }

      if (bud.state === 1) {
        // dead
        let radius = Math.sqrt(bud.area) / 10
        budOffsets.push(bud.position)
        budScales.push([radius, radius, radius])
        if (bud.parent) {
          const rot = quat.fromDirection(quat.create(), vec3.normalize(vec3.sub(vec3.copy(bud.position), bud.parent.position)))
          budRotations.push(rot)
        } else {
          const rot = quat.fromDirection(quat.create(), vec3.normalize(vec3.sub(vec3.copy(bud.position), buds[i + 1].position)))
          budRotations.push(rot)
        }

        if (bud.parent) jsonData.push([bud.position, buds.indexOf(bud.parent)])
        else jsonData.push([bud.position, -1])
      }
    }

    if (alive > 0 || alive !== prevAlive) {
      prevAlive = alive
      offsetsBuff(budOffsets)
      scalesBuff(budScales)
      rotationsBuff(budRotations)
      hormoneOffsetBuff(hormoneOffsets)
    } else {
      leafOffsetsBuff(leafOffsets)
      leafRotationsBuff(leafRotations)
      if (State.drawLeaves) {
        drawTriangle({
          color: [0.4, 0.4, 0.4],
          view: mat4.create(),
          instances: leafOffsets.length,
          offset: leafOffsetsBuff,
          rotation: leafRotationsBuff
        })
      }
    }

    drawCube({
      color: [0.4, 0.4, 0.4],
      view: mat4.create(),
      model: mat4.create(),
      instances: budOffsets.length,
      offset: offsetsBuff,
      scale: scalesBuff,
      rotation: rotationsBuff
    })

    if (State.drawHormones) {
      drawSphere({
        view: mat4.create(),
        instances: hormoneOffsets.length,
        offset: hormoneOffsetBuff,
      })
    }

    gui.draw()
  })
})

