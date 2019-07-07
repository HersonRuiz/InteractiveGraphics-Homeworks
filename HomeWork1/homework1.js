"use strict";

var canvas;
var gl;

var numVertices  = 36;
var texSize = 64;
var numChecks = 8;

var program;

var c;

var flag = true;

var pointsArray = [];
var normalsArray = [];
var texCoordsArray = [];
//var colorsArray = [];

var vertices = [
    vec4( -0.5, -0.5,  0.5, 1.0 ),
    vec4( -0.5,  0.5,  0.5, 1.0 ),
    vec4( 0.5,  0.5,  0.5, 1.0 ),
    vec4( 0.5, -0.5,  0.5, 1.0 ),
    vec4( -0.5, -0.5, -0.5, 1.0 ),
    vec4( -0.5,  0.5, -0.5, 1.0 ),
    vec4( 0.5,  0.5, -0.5, 1.0 ),
    vec4( 0.5, -0.5, -0.5, 1.0 )
];

//not used from point 5
/*var vertexColors = [
    vec4( 0.0, 0.0, 0.0, 1.0 ),  // black
    vec4( 1.0, 0.0, 0.0, 1.0 ),  // red
    vec4( 1.0, 1.0, 0.0, 1.0 ),  // yellow
    vec4( 0.0, 1.0, 0.0, 1.0 ),  // green
    vec4( 0.0, 0.0, 1.0, 1.0 ),  // blue
    vec4( 1.0, 0.0, 1.0, 1.0 ),  // magenta
    vec4( 0.0, 1.0, 1.0, 1.0 ),  // white
    vec4( 0.0, 1.0, 1.0, 1.0 )   // cyan
];*/

var image1 = new Array()
for (var i = 0; i < texSize; i++)  image1[i] = new Array();
for (var i = 0; i < texSize; i++)
    for (var j = 0; j < texSize; j++)
        image1[i][j] = new Float32Array(4);
for (var i = 0; i < texSize; i++) for (var j = 0; j < texSize; j++) {
    var c = (((i & 0x8) == 0) ^ ((j & 0x8) == 0));
    image1[i][j] = [c, c, c, 1];
}

var image2 = new Uint8Array(4 * texSize * texSize);

for (var i = 0; i < texSize; i++)
    for (var j = 0; j < texSize; j++)
        for (var k = 0; k < 4; k++)
            image2[4 * texSize * i + 4 * j + k] = 255 * image1[i][j][k];

var texCoord = [
    vec2(0, 0),
    vec2(0, 1),
    vec2(1, 1),
    vec2(1, 0)
];

function configureTexture(image) {
    var texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0,
        gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER,
        gl.NEAREST_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
}


var thetaLoc;

function quad(a, b, c, d) {
    var t1 = subtract(vertices[b], vertices[a]);
    var t2 = subtract(vertices[c], vertices[b]);
    var normal = cross(t1, t2);
    var normal = vec3(normal);

    pointsArray.push(vertices[a]);
    //colorsArray.push(vertexColors[a]);
    normalsArray.push(normal);
    texCoordsArray.push(texCoord[0]);

    pointsArray.push(vertices[b]);
    //colorsArray.push(vertexColors[a]);
    normalsArray.push(normal);
    texCoordsArray.push(texCoord[1]);

    pointsArray.push(vertices[c]);
    //colorsArray.push(vertexColors[a]);
    normalsArray.push(normal);
    texCoordsArray.push(texCoord[2]);

    pointsArray.push(vertices[a]);
    //colorsArray.push(vertexColors[a]);
    normalsArray.push(normal);
    texCoordsArray.push(texCoord[0]);

    pointsArray.push(vertices[c]);
    //colorsArray.push(vertexColors[a]);
    normalsArray.push(normal);
    texCoordsArray.push(texCoord[2]);

    pointsArray.push(vertices[d]);
    //colorsArray.push(vertexColors[a]);
    normalsArray.push(normal);
    texCoordsArray.push(texCoord[3]);
}

function colorCube()
{
    quad( 1, 0, 3, 2 );
    quad( 2, 3, 7, 6 );
    quad( 3, 0, 4, 7 );
    quad( 6, 5, 1, 2 );
    quad( 4, 5, 6, 7 );
    quad( 5, 4, 0, 1 );
}

var modelViewMatrix, modelViewMatrixLoc;
var perspectiveMatrix, perspectiveMatrixLoc;
var eye;
var radius = 3;
var theta = 0.0;
var phi = 0.0;
var fovy = 45.0;
var aspect = 0.5;
var persNear = 0.3;
var persFar = 12.0;
const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);

var scalingMatrix, scalingMatrixLoc;
var scalingFactor = 0.5;

var translationMatrix, translationMatrixLoc;
var translateX = 0.0;
var translateY = 0.5;
var translateZ = 0.0;

var orthogonalMatrix, orthogonalMatrixLoc;
var left = -0.5 ;
var right = 0.5;
var bottom = -1;
var ytop = 1;
var orthoNear = 0.3;
var orthoFar = 10.0;

//light parameters
var lightPosition = vec4(1.0, 2.0, 3.0, 1.0);
var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0);
var lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
var lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);

//material parameters "Polished Gold"
var materialAmbient = vec4(0.24725, 0.2245, 0.0645, 1.0);
var materialDiffuse = vec4(0.34615, 0.3143, 0.0903, 1.0);
var materialSpecular = vec4(0.797357, 0.723991, 0.208006, 1.0);
var materialShininess = 83.2;

//material parameters "Pewter"
/*var materialAmbient = vec4(0.105882, 0.058824, 0.113725, 1.0);
var materialDiffuse = vec4(0.427451, 0.470588, 0.541176, 1.0);
var materialSpecular = vec4(0.333333, 0.333333, 0.521569, 1.0);
var materialShininess = 9.84615;*/

//material parameters "Turquoise"
/*var materialAmbient = vec4(0.1, 0.18725, 0.1745, 0.8);
var materialDiffuse = vec4(0.396, 0.74151, 0.69102, 0.8);
var materialSpecular = vec4(0.297254, 0.30829, 0.306678, 0.8);
var materialShininess = 12.8;*/

//material parameters "Polished Copper"
/*var materialAmbient = vec4(0.2295, 0.08825, 0.0275, 1.0);
var materialDiffuse = vec4(0.5508, 0.2118, 0.066, 1.0);
var materialSpecular = vec4(0.580594, 0.223257, 0.0695701, 1.0);
var materialShininess = 51.2;*/

var ambientColor, duffeseColor, specularColor;
//change shading mode
var changeShading = true;

window.onload = function init() {

    canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    /*gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );*/

    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    colorCube();

    /*var cBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(colorsArray), gl.STATIC_DRAW );*/

    /*var vColor = gl.getAttribLocation( program, "vColor" );
    gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor );*/

    var nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);

    var vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    var vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW );

    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray(vPosition);

    var tBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW);

    var vTexCoord = gl.getAttribLocation(program, "vTexCoord");
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoord);

    configureTexture(image2);

    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    perspectiveMatrixLoc = gl.getUniformLocation(program, "perspectiveMatrix");
    scalingMatrixLoc = gl.getUniformLocation(program, "scalingMatrix");
    translationMatrixLoc = gl.getUniformLocation(program, "translationMatrix");
    orthogonalMatrixLoc = gl.getUniformLocation(program, "orthogonalMatrix");

    //sliders to manipulate parameters for viewer's position and volume
    document.getElementById("persNearSlider").onchange = function (event) {
        persNear = event.target.value;
    };
    document.getElementById("persFarSlider").onchange = function (event) {
        persFar = event.target.value;
    };

    document.getElementById("radiusSlider").onchange = function (event) {
        radius = event.target.value;
    };
    document.getElementById("thetaSlider").onchange = function (event) {
        theta = event.target.value * Math.PI / 180.0;
    };
    document.getElementById("phiSlider").onchange = function (event) {
        phi = event.target.value * Math.PI / 180.0;
    };
    document.getElementById("fovySlider").onchange = function (event) {
        fovy = event.target.value;
    };
    document.getElementById("aspectSlider").onchange = function (event) {
        aspect = event.target.value;
    };

    document.getElementById("reset").onclick = function () {
        radius = 3; theta = 0.0; phi = 0.0;
        document.getElementById("radiusSlider").value = 3;
        document.getElementById("thetaSlider").value = 0;
        document.getElementById("phiSlider").value = 0;
    };
    //slider to manipulate scaling factor
    document.getElementById("scalingSlider").onchange = function (event) {
        scalingFactor = event.target.value;

    };

    //slider to manipulate translation in X, Y, Z
    document.getElementById("translateXSlider").onchange = function (event) {
        translateX = event.target.value;
    };
    document.getElementById("translateYSlider").onchange = function (event) {
        translateY = event.target.value;
    };
    document.getElementById("translateZSlider").onchange = function (event) {
        translateZ = event.target.value;
    };

    //sliders to manipulate orthogonal orthoNear and orthoFar
    document.getElementById("orthoNearSlider").onchange = function (event) {
        orthoNear = event.target.value;
    };
    document.getElementById("orthoFarSlider").onchange = function (event) {
        orthoFar = event.target.value;
    };

    document.getElementById("orthoFarSlider").onchange = function (event) {
        orthoFar = event.target.value;
    };
    document.getElementById("ShadingButton").onclick = function () {
        if (this.value == "g") changeShading = true;
        if (this.value == "p") changeShading = false;
        console.log(this.value);
    };



    var ambientProduct = mult(lightAmbient, materialAmbient);
    var diffuseProduct = mult(lightDiffuse, materialDiffuse);
    var specularProduct = mult(lightSpecular, materialSpecular);

    gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"),
        flatten(ambientProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"),
        flatten(diffuseProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"),
        flatten(specularProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"),
        flatten(lightPosition));
    gl.uniform1f(gl.getUniformLocation(program, "shininess"), materialShininess);

    render();
}

var render = function() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //for point 6
    gl.uniform1f(gl.getUniformLocation(program, "changeShading"), changeShading);
    //viewer position
    eye = vec3(radius * Math.sin(theta) * Math.cos(phi),
               radius * Math.sin(theta) * Math.sin(phi),
        radius * Math.cos(theta));

    //compute model view matrix
    modelViewMatrix = lookAt(eye, at, up);
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));

    //scaling matrix, uniform scaling
    scalingMatrix = scalem(scalingFactor, scalingFactor, scalingFactor);
    gl.uniformMatrix4fv(scalingMatrixLoc, false, flatten(scalingMatrix));

    //translation matrix
    translationMatrix = translate(translateX, translateY, translateZ);
    gl.uniformMatrix4fv(translationMatrixLoc, false, flatten(translationMatrix));



    //first viewport for perspective (orthogonal set to identity)
    perspectiveMatrix = perspective(fovy, aspect, persNear, persFar);
    gl.uniformMatrix4fv(perspectiveMatrixLoc, false, flatten(perspectiveMatrix));
    orthogonalMatrix = mat4();
    gl.uniformMatrix4fv(orthogonalMatrixLoc, false, flatten(orthogonalMatrix));
    gl.viewport( 0, 0, canvas.width/2, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );
    gl.drawArrays(gl.TRIANGLES, 0, numVertices);

    //second viewport for orthogonal (perspective set to identity)
    orthogonalMatrix = ortho( left, right, bottom, ytop, orthoNear, orthoFar );
    gl.uniformMatrix4fv(orthogonalMatrixLoc, false, flatten(orthogonalMatrix));
    perspectiveMatrix = mat4();
    gl.uniformMatrix4fv(perspectiveMatrixLoc, false, flatten(perspectiveMatrix));
    gl.viewport( canvas.width/2, 0, canvas.width/2, canvas.height );
    gl.drawArrays(gl.TRIANGLES, 0, numVertices);


    requestAnimFrame(render);
}
