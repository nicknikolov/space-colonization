#pragma glslify: transpose = require(glsl-transpose)

mat4 quatToMat4(vec4 q) {
  float xs = q.x + q.x;
  float ys = q.y + q.y;
  float zs = q.z + q.z;
  float wx = q.w * xs;
  float wy = q.w * ys;
  float wz = q.w * zs;
  float xx = q.x * xs;
  float xy = q.x * ys;
  float xz = q.x * zs;
  float yy = q.y * ys;
  float yz = q.y * zs;
  float zz = q.z * zs;
  return transpose(
    mat4(
      1.0 - (yy + zz), xy - wz, xz + wy, 0.0,
      xy + wz, 1.0 - (xx + zz), yz - wx, 0.0,
      xz - wy, yz + wx, 1.0 - (xx + yy), 0.0,
      0.0, 0.0, 0.0, 1.0
    )
  );
}

#pragma glslify: export(quatToMat4)

