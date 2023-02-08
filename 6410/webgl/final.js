//Author: Boyang Sun
//Date: 5/6/2022
//Description: This project is to produce a 3D model with animated textures that can be selected using dat.gui.

var vertexShaderSource = `#version 300 es

    uniform mat4 u_normalMatrix;
    uniform mat4 u_mvMatrix;
    uniform mat4 u_projMatrix;

    in vec2 a_texCoord;
    in vec3 a_vNormal;
    in vec4 a_vPosition;

    out vec2 vTexCoord;
    out vec3 vLighting;

    void main(void) {
      vTexCoord = a_texCoord;
      gl_Position = u_projMatrix * u_mvMatrix * a_vPosition;
      vec4 tNormal = u_normalMatrix * vec4(a_vNormal, 1.0);
      float directional = max(dot(tNormal.xyz, normalize(vec3(0.85, 0.8, 0.75))), 0.0);
      vLighting = vec3(0.5, 0.5, 0.5) + (vec3(1, 1, 1) * directional);
    }
  `;

// Fragment shader program
var fragmentShaderSource = `#version 300 es
    precision highp float;

    uniform sampler2D uSampler;

    in vec2 vTexCoord;
    in vec3 vLighting;


    out vec4 outColor;
    void main(void) {
      vec4 texelColor = texture(uSampler, vTexCoord);
      outColor = vec4(texelColor.rgb * vLighting, texelColor.a);
    }
  `;


function loadShader(ctx, shaderSource, shaderType) {

  const shader = ctx.createShader(shaderType);

  ctx.shaderSource(shader, shaderSource);

  ctx.compileShader(shader);


  var compiled = ctx.getShaderParameter(shader, ctx.COMPILE_STATUS);
  if (!compiled) {
    // get error
    var error = ctx.getShaderInfoLog(shader);
    alert(error);
    ctx.deleteShader(shader);
    return null;
  }
  return shader;
}


function createProgram(gl, vshaders, fshaders, attribs) {
  if (typeof (vshaders) == "string")
    vshaders = [vshaders];
  if (typeof (fshaders) == "string")
    fshaders = [fshaders];

  var shaders = [];
  var i;

  for (i = 0; i < vshaders.length; ++i) {
    var shader = loadShader(gl, vshaders[i], gl.VERTEX_SHADER);
    if (!shader)
      return null;
    shaders.push(shader);
  }

  for (i = 0; i < fshaders.length; ++i) {
    var shader = loadShader(gl, fshaders[i], gl.FRAGMENT_SHADER);
    if (!shader)
      return null;
    shaders.push(shader);
  }

  var prog = gl.createProgram();
  for (i = 0; i < shaders.length; ++i) {
    gl.attachShader(prog, shaders[i]);
  }

  if (attribs) {
    for (var i in attribs) {
      gl.bindAttribLocation(prog, parseInt(i), attribs[i]);
    }
  }

  gl.linkProgram(prog);

  var linked = gl.getProgramParameter(prog, gl.LINK_STATUS);
  if (!linked) {
    var error = gl.getProgramInfoLog(prog);
    webglTestLog("Error in program linking:" + error);

    gl.deleteProgram(prog);
    for (i = 0; i < shaders.length; ++i)
      gl.deleteShader(shaders[i]);
    return null;
  }

  return prog;
}



function setupVideo(url) {
  const video = document.createElement('video');
  video.crossOrigin = ""
  video.src = url;
  video.muted = true;
  video.loop = true;
  video.play();
  return video;
}


var ROTATION = 0.0;
var DRAWVIDEO = true;
var video;

function main() {
  const canvas = document.querySelector('#glcanvas');
  const gl = canvas.getContext('webgl2');
  if (!gl) {
    alert('Unable to initialize WebGL. Your browser or machine may not support it.');
    return;
  }
  const gui = new dat.GUI();
  
  var comBox = gui.add({color5:'xxxx', speed:40, types:'two'}, 'types', ['Video one','Video two','Video three']) 
  comBox.onChange(val => {
    if(val=="Video one") {
      video = setupVideo("https://ak.picdn.net/shutterstock/videos/1044454993/preview/stock-footage-female-hands-of-business-woman-professional-user-worker-using-typing-on-laptop-notebook-keyboard.webm")
    } else if (val == "Video two") {
      video = setupVideo("https://storage.coverr.co/videos/kg9qxfl2st9hkpHUEjO3JaZBW9zx025Ku?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcHBJZCI6Ijg3NjdFMzIzRjlGQzEzN0E4QTAyIiwiaWF0IjoxNjUxNzgyNDMwfQ.urFZqKRdahUjcnnnqq7IbLvpRPIu2iJQ7JzCc7THYXg")
    } else if (val == "Video three") {
      video = setupVideo("https://ak.picdn.net/shutterstock/videos/1046992573/preview/stock-footage-flying-of-lemon-and-slices-in-yellow-background.webm")
    }
  });

  const prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);


  var a_vPosition = gl.getAttribLocation(prog, 'a_vPosition');
  var a_vNormal =  gl.getAttribLocation(prog, 'a_vNormal');
  var a_texCoord = gl.getAttribLocation(prog, 'a_texCoord');

  var u_projMatrix = gl.getUniformLocation(prog, 'u_projMatrix');
  var u_mvMatrix =  gl.getUniformLocation(prog, 'u_mvMatrix');
  var u_normalMatrix =  gl.getUniformLocation(prog, 'u_normalMatrix');
  var uSampler =  gl.getUniformLocation(prog, 'uSampler');


  const buffers = initBuffers(gl);
  const texture = initTexture(gl);

  video = setupVideo("https://ak.picdn.net/shutterstock/videos/1046992573/preview/stock-footage-flying-of-lemon-and-slices-in-yellow-background.webm");
  var then = 0;

  function render(now) {
    // convert to seconds
    now *= 0.0007;
    const deltaTime = now - then;
    then = now;
    if (DRAWVIDEO) {
      updateTexture(gl, texture, video);
    }
    const [projectionMatrix, mvMatrix, normalMatrix] = drawScene(gl, buffers, texture, deltaTime);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(a_vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_vPosition);


    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.texCoord);
    gl.vertexAttribPointer(a_texCoord,2,gl.FLOAT,false,0,0);
    gl.enableVertexAttribArray(a_texCoord);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
    gl.vertexAttribPointer(a_vNormal,3, gl.FLOAT,false,0,0);
    gl.enableVertexAttribArray(a_vNormal);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
    gl.useProgram(prog);
    gl.uniformMatrix4fv(u_projMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv( u_mvMatrix, false, mvMatrix);
    gl.uniformMatrix4fv(u_normalMatrix, false, normalMatrix);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(uSampler, 0);

    gl.drawElements(gl.TRIANGLES, 36,  gl.UNSIGNED_SHORT, 0);

    ROTATION += deltaTime;
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);

}

function initBuffers(gl) {
     // vertex coords array
     var vertices = new Float32Array(
      [  1, 1, 1,  -1, 1, 1,  -1,-1, 1,   1,-1, 1,    // v0-v1-v2-v3 front
         1, 1, 1,   1,-1, 1,   1,-1,-1,   1, 1,-1,    // v0-v3-v4-v5 right
         1, 1, 1,   1, 1,-1,  -1, 1,-1,  -1, 1, 1,    // v0-v5-v6-v1 top
        -1, 1, 1,  -1, 1,-1,  -1,-1,-1,  -1,-1, 1,    // v1-v6-v7-v2 left
        -1,-1,-1,   1,-1,-1,   1,-1, 1,  -1,-1, 1,    // v7-v4-v3-v2 bottom
         1,-1,-1,  -1,-1,-1,  -1, 1,-1,   1, 1,-1 ]   // v4-v7-v6-v5 back
  );

  // normal array
  var normals = new Float32Array(
      [  0, 0, 1,   0, 0, 1,   0, 0, 1,   0, 0, 1,     // v0-v1-v2-v3 front
         1, 0, 0,   1, 0, 0,   1, 0, 0,   1, 0, 0,     // v0-v3-v4-v5 right
         0, 1, 0,   0, 1, 0,   0, 1, 0,   0, 1, 0,     // v0-v5-v6-v1 top
        -1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0,     // v1-v6-v7-v2 left
         0,-1, 0,   0,-1, 0,   0,-1, 0,   0,-1, 0,     // v7-v4-v3-v2 bottom
         0, 0,-1,   0, 0,-1,   0, 0,-1,   0, 0,-1 ]    // v4-v7-v6-v5 back
     );


  // texCoord array
  var texCoords = new Float32Array(
      [  1, 1,   0, 1,   0, 0,   1, 0,    // v0-v1-v2-v3 front
         0, 1,   0, 0,   1, 0,   1, 1,    // v0-v3-v4-v5 right
         1, 0,   1, 1,   0, 1,   0, 0,    // v0-v5-v6-v1 top
         1, 1,   0, 1,   0, 0,   1, 0,    // v1-v6-v7-v2 left
         0, 0,   1, 0,   1, 1,   0, 1,    // v7-v4-v3-v2 bottom
         0, 0,   1, 0,   1, 1,   0, 1 ]   // v4-v7-v6-v5 back
     );

  // index array
  var indices = new Uint8Array(
      [  0, 1, 2,   0, 2, 3,    // front
         4, 5, 6,   4, 6, 7,    // right
         8, 9,10,   8,10,11,    // top
        12,13,14,  12,14,15,    // left
        16,17,18,  16,18,19,    // bottom
        20,21,22,  20,22,23 ]   // back
    );


  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  
  const normalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

  
  const textureCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
  
  
  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

  return {
    position: positionBuffer,
    normal: normalBuffer,
    texCoord: textureCoordBuffer,
    indices: indexBuffer,
  };
}


function initTexture(gl, url) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  return texture;
}

function updateTexture(gl, texture, video) {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,  gl.UNSIGNED_BYTE, video);
}

function drawScene(gl, buffers, texture, deltaTime) {
  gl.clearDepth(1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


  const FOV = 60 * Math.PI / 180;
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  const zNear = 0.1;
  const zFar = 100.0;
  const projectionMatrix = mat4.create();
  mat4.perspective(projectionMatrix, FOV, aspect, zNear, zFar);
  
  
  const mvMatrix = mat4.create();
  mat4.translate(mvMatrix, mvMatrix, [-0.0, 0.0, -6.0]);
  mat4.rotate(mvMatrix, mvMatrix, ROTATION, [0, 0, 1]);
  mat4.rotate(mvMatrix, mvMatrix, ROTATION * .7, [0, 1, 0]);

  const normalMatrix = mat4.create();
  mat4.invert(normalMatrix, mvMatrix);
  mat4.transpose(normalMatrix, normalMatrix);

  return [projectionMatrix, mvMatrix, normalMatrix]

}


main();