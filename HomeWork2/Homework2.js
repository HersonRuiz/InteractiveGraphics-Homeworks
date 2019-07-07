"use strict";

var canvas;
var gl;
var program;

var projectionMatrix;
var modelViewMatrix;

var texSize = 256;
var numChecks = 8;

var texture1, texture2;
var t1, t2;
var c;
var instanceMatrix;
var modelViewMatrixLoc;
var projectionMatrixLoc;

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

var x_horse = -15;
var y_horse = 5;

var torsoId = 0;
var head1Id  = 1;
var leftUpFrontId = 2;
var leftLowFrontId = 3;
var rightUpFrontId = 4;
var rightLowFrontId = 5;
var leftUpBackId = 6;
var leftLowBackId = 7;
var rightUpBackId = 8;
var rightLowBackId = 9;
var tail1Id = 10;
var head2Id = 11;
var tail2Id = 12;

var torsoHeight = 3.0;
var torsoWidth = 7.2;
var head1Height = 3.5;
var head1Width = 1.5;
var head2Height = 3;
var head2Width = 1.5;
var upLegHeight = 1.7;
var upLegWidth = 0.7;
var downLegHeight = 1.4;
var downLegWidth = 0.65;
var tail1Height = 2;
var tail1Width = 1;
var tail2Height = 3;
var tail2Width = 1;

var numNodesHorse = 13;
var numNodesObstacle = 4;

var horizontalPole1Id = 0;
var horizontalPole2Id = 1;
var rightPoleId = 3;
var leftPoleId = 2;

var verticalHeight = 4;
var verticalWidth = 0.8;
var horizontalHeight = 12;
var horizontalWidth = 0.5;
var initObstacle_x = -0.5;
var initObstacle_y = 6.1;

var obstacle = [];
var theta = [0, -25, -10 , 0 , 0, 30, 20, -20, 25, -30, 75, -90, 90];
var flag = [null, null, false, null , false, null, false, null, true, null, true, null, null];

var stack = [];
var horse = [];

var image1 = new Uint8Array(4 * texSize * texSize);

for (var i = 0; i < texSize; i++) {
    for (var j = 0; j < texSize; j++) {
        var patchx = Math.floor(i / (texSize / numChecks));
        var patchy = Math.floor(j / (texSize / numChecks));
        if (patchx % 2 ^ patchy % 2) c = 255;
        else c = 0;
        image1[4 * i * texSize + 4 * j] = c;
        image1[4 * i * texSize + 4 * j + 1] = c;
        image1[4 * i * texSize + 4 * j + 2] = c;
        image1[4 * i * texSize + 4 * j + 3] = 255;
    }
}

var image2 = new Uint8Array(4 * texSize * texSize);

for (var i = 0; i < texSize; i++) {
    for (var j = 0; j < texSize; j++) {
        image2[4 * i * texSize + 4 * j] = texSize + j;
        image2[4 * i * texSize + 4 * j + 1] = texSize + j;
        image2[4 * i * texSize + 4 * j + 2] = texSize + j;
        image2[4 * i * texSize + 4 * j + 3] = 255;
    }
}

for (var i = 0; i < numNodesHorse; i++) horse[i] = createNode(null, null, null, null);
for (var i = 0; i < numNodesObstacle; i++) obstacle[i] = createNode(null, null, null, null);

var vBuffer;
var modelViewLoc;

var pointsArray = [];
var texCoordsArray = [];

var texCoord = [
    vec2(0, 0),
    vec2(0, 1),
    vec2(1, 1),
    vec2(1, 0)
];

var applyTexture = true;
var vertical_pole = true;
var horse_part = true;

function configureTexture() {
    texture1 = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture1);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, image1);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER,
        gl.NEAREST_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    texture2 = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture2);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, image2);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER,
        gl.NEAREST_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
}
//-------------------------------------------

function scale4(a, b, c) {
   var result = mat4();
   result[0][0] = a;
   result[1][1] = b;
   result[2][2] = c;
   return result;
}

//--------------------------------------------


function createNode(transform, render, sibling, child){
    var node = {
    transform: transform,
    render: render,
    sibling: sibling,
    child: child,
    }
    return node;
}


function initNodesHorse(Id) {
    var m = mat4();

    switch(Id) {

    case torsoId:
    m = translate(x_horse, y_horse, 0);
    m = mult(m, rotate(theta[torsoId], 0, 0, 1));
    horse[torsoId] = createNode(m, torso, null, head1Id);
    break;

    case head1Id:
    m = translate(torsoWidth - 4.4 , torsoHeight , 0);
    m = mult(m, rotate(theta[head1Id], 0, 0, 1));
    horse[head1Id] = createNode(m, head1, leftUpFrontId, head2Id);
    break;

    case head2Id:
    m = translate(torsoWidth - 7.8, torsoHeight + 0.2, 0);
    m = mult(m, rotate(theta[head2Id], 0, 0, 1));
    horse[head2Id] = createNode(m, head2, null, null);
    break;

    case leftUpFrontId:
    m = translate(torsoWidth - 4.5, torsoHeight - 2.3, -torsoWidth + 5.4);
    m = mult(m, rotate(180, 1, 0, 0));
    m = mult(m, rotate(theta[leftUpFrontId], 0, 0, 1));
    horse[leftUpFrontId] = createNode(m, leftUpFront, rightUpFrontId, leftLowFrontId );
    break;

    case rightUpFrontId:
    m = translate(torsoWidth - 4.5, torsoHeight - 2.3, torsoWidth - 5.4);
    m = mult(m, rotate(180, 1, 0, 0));
	  m = mult(m, rotate(theta[rightUpFrontId], 0, 0, 1));
    horse[rightUpFrontId] = createNode( m, rightUpFront, leftUpBackId, rightLowFrontId );
    break;

    case leftUpBackId:
    m = translate(torsoWidth - 9.3, torsoHeight - 2.3, -torsoWidth + 5.4);
    m = mult(m, rotate(180, 1, 0, 0));
	  m = mult(m , rotate(theta[leftUpBackId], 0, 0, 1));
    horse[leftUpBackId] = createNode( m, leftUpBack, rightUpBackId, leftLowBackId );
    break;

    case rightUpBackId:
    m = translate(torsoWidth - 9.3, torsoHeight - 2.3, torsoWidth - 5.4);
    m = mult(m, rotate(180, 1, 0, 0));
    m = mult(m, rotate(theta[rightUpBackId], 0, 0, 1));
    horse[rightUpBackId] = createNode( m, rightUpBack, tail1Id, rightLowBackId );
    break;

    case leftLowFrontId:
    m = translate(0, 1.7, 0);
    m = mult(m, rotate(theta[leftLowFrontId], 0, 0, 1));
    horse[leftLowFrontId] = createNode( m, leftLowFront, null, null );
    break;

    case rightLowFrontId:
    m = translate(0, 1.7, 0);
    m = mult(m, rotate(theta[rightLowFrontId], 0, 0, 1));
    horse[rightLowFrontId] = createNode( m, rightLowFront, null, null );
    break;

    case leftLowBackId:
    m = translate(0, +1.8, 0);
    m = mult(m, rotate(theta[leftLowBackId], 0, 0, 1));
    horse[leftLowBackId] = createNode( m, leftLowBack, null, null );
    break;

    case rightLowBackId:
    m = translate(0, +1.8, 0);
    m = mult(m, rotate(theta[rightLowBackId], 0, 0, 1));
    horse[rightLowBackId] = createNode( m, rightLowBack, null, null );
    break;

    case tail1Id:
    m = translate(torsoWidth - 10.5, torsoHeight - 0.7, 0);
    m = mult(m, rotate(theta[tail1Id], 0, 0, 1));
    horse[tail1Id] = createNode(m, tail1, null, tail2Id);
    break;

    case tail2Id:
    m = translate(torsoWidth - 6.7, torsoHeight - 1.3, 0);
    m = mult(m, rotate(theta[tail2Id], 0, 0, 1));
    horse[tail2Id] = createNode(m, tail2, null, null);
    break;
    }
}

function initNodesObstacle(id) {
    var m = mat4();

    switch (id) {

        case rightPoleId:
            m = translate(initObstacle_x, initObstacle_y - 3.3, horizontalHeight/2);
            obstacle[rightPoleId] = createNode(m, rightPole, null, null);
            break;


        case leftPoleId:
            m = translate(initObstacle_x, initObstacle_y -3.3, -horizontalHeight / 2);
            obstacle[leftPoleId] = createNode(m, leftPole, rightPoleId, null );
            break;

        case horizontalPole1Id:
            m = translate(initObstacle_x, initObstacle_y, -6.0);
            m = mult(m, rotate(90, 1, 0, 0));
            obstacle[horizontalPole1Id] = createNode(m, horizontalPole1, horizontalPole2Id, null);
            break;

        case horizontalPole2Id:
            m = translate(initObstacle_x, initObstacle_y - 1.5, -6.0);
            m = mult(m, rotate(90, 1, 0, 0));
            obstacle[horizontalPole2Id] = createNode(m, horizontalPole2, leftPoleId, null);
            break;
    }
}

function traverse1(Id) {
   if(Id == null) return;
   stack.push(modelViewMatrix);
   modelViewMatrix = mult(modelViewMatrix, horse[Id].transform);
    horse[Id].render();
    if (horse[Id].child != null) traverse1(horse[Id].child);
    modelViewMatrix = stack.pop();
    if (horse[Id].sibling != null) traverse1(horse[Id].sibling);
}

function traverse2(Id) {
    if (Id == null) return;
    stack.push(modelViewMatrix);
    modelViewMatrix = mult(modelViewMatrix, obstacle[Id].transform);
    obstacle[Id].render();
    if (obstacle[Id].child != null) traverse2(obstacle[Id].child);
    modelViewMatrix = stack.pop();
    if (obstacle[Id].sibling != null) traverse2(obstacle[Id].sibling);

}

function torso() {
    horse_part = true;
    applyTexture = true;
    vertical_pole = false;
    gl.uniform1f(gl.getUniformLocation(program, "horse_part"), horse_part);
    gl.uniform1f(gl.getUniformLocation(program, "vertical_pole"), vertical_pole);
    gl.uniform1f(gl.getUniformLocation(program, "applyTexture"), applyTexture);
    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5*torsoHeight, 0.0) );
    instanceMatrix = mult(instanceMatrix, scale4( torsoWidth, torsoHeight, torsoWidth/2));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (var i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4);
}

function head1() {
    horse_part = true;
    applyTexture = false;
    vertical_pole = false;
    gl.uniform1f(gl.getUniformLocation(program, "horse_part"), horse_part);
    gl.uniform1f(gl.getUniformLocation(program, "vertical_pole"), vertical_pole);
    gl.uniform1f(gl.getUniformLocation(program, "applyTexture"), applyTexture);
    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * head1Height, 0.0 ));
	instanceMatrix = mult(instanceMatrix, scale4(head1Width, head1Height + 0.7, head1Width + 0.5) );
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for(var i =0; i<6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4*i, 4);
}

function head2() {
    horse_part = true;
    applyTexture = false;
    vertical_pole = false;
    gl.uniform1f(gl.getUniformLocation(program, "horse_part"), horse_part);
    gl.uniform1f(gl.getUniformLocation(program, "vertical_pole"), vertical_pole);
    gl.uniform1f(gl.getUniformLocation(program, "applyTexture"), applyTexture);
    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * head2Height, 0.0));
    instanceMatrix = mult(instanceMatrix, scale4(head2Width, head2Height, head2Width));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (var i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4);
}

function leftUpFront() {
    horse_part = true;
    applyTexture = false;
    vertical_pole = false;
    gl.uniform1f(gl.getUniformLocation(program, "horse_part"), horse_part);
    gl.uniform1f(gl.getUniformLocation(program, "vertical_pole"), vertical_pole);
    gl.uniform1f(gl.getUniformLocation(program, "applyTexture"), applyTexture);
    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * upLegHeight, 0.0) );
    instanceMatrix = mult(instanceMatrix, scale4(upLegWidth, upLegHeight, upLegWidth) );
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for(var i =0; i<6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4*i, 4);
}

function leftLowFront() {
    horse_part = true;
    applyTexture = false;
    vertical_pole = false;
    gl.uniform1f(gl.getUniformLocation(program, "horse_part"), horse_part);
    gl.uniform1f(gl.getUniformLocation(program, "vertical_pole"), vertical_pole);
    gl.uniform1f(gl.getUniformLocation(program, "applyTexture"), applyTexture);
    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * downLegHeight, 0.0) );
    instanceMatrix = mult(instanceMatrix, scale4(downLegWidth - 0.2, downLegHeight, downLegWidth) );
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for(var i =0; i<6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4*i, 4);
}

function rightUpFront() {
    horse_part = true;
    applyTexture = false;
    vertical_pole = false;
    gl.uniform1f(gl.getUniformLocation(program, "horse_part"), horse_part);
    gl.uniform1f(gl.getUniformLocation(program, "vertical_pole"), vertical_pole);
    gl.uniform1f(gl.getUniformLocation(program, "applyTexture"), applyTexture);
    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * upLegHeight, 0.0) );
    instanceMatrix = mult(instanceMatrix, scale4(upLegWidth , upLegHeight, upLegWidth) );
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for(var i =0; i<6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4*i, 4);
}

function rightLowFront() {
    horse_part = true;
    applyTexture = false;
    vertical_pole = false;
    gl.uniform1f(gl.getUniformLocation(program, "horse_part"), horse_part);
    gl.uniform1f(gl.getUniformLocation(program, "vertical_pole"), vertical_pole);
    gl.uniform1f(gl.getUniformLocation(program, "applyTexture"), applyTexture);
    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * downLegHeight, 0.0) );
    instanceMatrix = mult(instanceMatrix, scale4(downLegWidth - 0.2, downLegHeight, downLegWidth) );
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for(var i =0; i<6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4*i, 4);
}

function leftUpBack() {
    horse_part = true;
    applyTexture = false;
    vertical_pole = false;
    gl.uniform1f(gl.getUniformLocation(program, "horse_part"), horse_part);
    gl.uniform1f(gl.getUniformLocation(program, "vertical_pole"), vertical_pole);
    gl.uniform1f(gl.getUniformLocation(program, "applyTexture"), applyTexture);
    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * upLegHeight, 0.0) );
    instanceMatrix = mult(instanceMatrix, scale4(upLegWidth + 0.2, upLegHeight + 0.3, upLegWidth) );
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for(var i =0; i<6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4*i, 4);
}

function leftLowBack() {
    horse_part = true;
    applyTexture = false;
    vertical_pole = false;
    gl.uniform1f(gl.getUniformLocation(program, "horse_part"), horse_part);
    gl.uniform1f(gl.getUniformLocation(program, "vertical_pole"), vertical_pole);
    gl.uniform1f(gl.getUniformLocation(program, "applyTexture"), applyTexture);
    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * downLegHeight, 0.0) );
    instanceMatrix = mult(instanceMatrix, scale4(downLegWidth - 0.25, downLegHeight + 0.3, downLegWidth) );
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for(var i =0; i<6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4*i, 4);
}

function rightUpBack() {
    horse_part = true;
    applyTexture = false;
    vertical_pole = false;
    gl.uniform1f(gl.getUniformLocation(program, "horse_part"), horse_part);
    gl.uniform1f(gl.getUniformLocation(program, "vertical_pole"), vertical_pole);
    gl.uniform1f(gl.getUniformLocation(program, "applyTexture"), applyTexture);
    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * upLegHeight, 0.0) );
    instanceMatrix = mult(instanceMatrix, scale4(upLegWidth + 0.2, upLegHeight + 0.3, upLegWidth) );
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for(var i =0; i<6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4*i, 4);
}

function rightLowBack() {
    horse_part = true;
    applyTexture = false ;
    vertical_pole = false;
    gl.uniform1f(gl.getUniformLocation(program, "horse_part"), horse_part);
    gl.uniform1f(gl.getUniformLocation(program, "vertical_pole"), vertical_pole);
    gl.uniform1f(gl.getUniformLocation(program, "applyTexture"), applyTexture);
    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * downLegHeight, 0.0) );
    instanceMatrix = mult(instanceMatrix, scale4(downLegWidth - 0.25, downLegHeight + 0.3, downLegWidth) )
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for(var i =0; i<6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4*i, 4);
}

function tail1() {
    horse_part = true;
    applyTexture = false;
    vertical_pole = false;
    gl.uniform1f(gl.getUniformLocation(program, "horse_part"), horse_part);
    gl.uniform1f(gl.getUniformLocation(program, "vertical_pole"), vertical_pole);
    gl.uniform1f(gl.getUniformLocation(program, "applyTexture"), applyTexture);
    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * tail1Height, 0.0));
    instanceMatrix = mult(instanceMatrix, scale4(tail1Width, tail1Height, tail1Width/2));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (var i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4);
}

function tail2() {
    horse_part = true;
    applyTexture = false;
    vertical_pole = false;
    gl.uniform1f(gl.getUniformLocation(program, "horse_part"), horse_part);
    gl.uniform1f(gl.getUniformLocation(program, "vertical_pole"), vertical_pole);
    gl.uniform1f(gl.getUniformLocation(program, "applyTexture"), applyTexture);
    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * tail2Height, 0.0));
    instanceMatrix = mult(instanceMatrix, scale4(tail2Width, tail2Height, tail2Width/2));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (var i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4);
}

function rightPole() {
    horse_part = false;
    applyTexture = false;
    vertical_pole = true;
    gl.uniform1f(gl.getUniformLocation(program, "horse_part"), horse_part);
    gl.uniform1f(gl.getUniformLocation(program, "applyTexture"), applyTexture);
    gl.uniform1f(gl.getUniformLocation(program, "vertical_pole"), vertical_pole);
    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * verticalHeight, 0.0));
    instanceMatrix = mult(instanceMatrix, scale4(verticalWidth, verticalHeight, verticalWidth));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (var i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4);
}

function leftPole() {
    horse_part = false;
    applyTexture = false;
    vertical_pole = true;
    gl.uniform1f(gl.getUniformLocation(program, "horse_part"), horse_part);
    gl.uniform1f(gl.getUniformLocation(program, "applyTexture"), applyTexture);
    gl.uniform1f(gl.getUniformLocation(program, "vertical_pole"), vertical_pole);
    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * verticalHeight, 0.0));
    instanceMatrix = mult(instanceMatrix, scale4(verticalWidth, verticalHeight, verticalWidth));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (var i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4);
}

function horizontalPole1() {
    horse_part = false;
    applyTexture = false;
    vertical_pole = false;
    gl.uniform1f(gl.getUniformLocation(program, "horse_part"), horse_part);
    gl.uniform1f(gl.getUniformLocation(program, "vertical_pole"), vertical_pole);
    gl.uniform1f(gl.getUniformLocation(program, "applyTexture"), applyTexture);
    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * horizontalHeight, 0.0));
    instanceMatrix = mult(instanceMatrix, scale4(horizontalWidth, horizontalHeight, horizontalWidth));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (var i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4);
}

function horizontalPole2() {
    horse_part = false;
    applyTexture = false;
    vertical_pole = false;
    gl.uniform1f(gl.getUniformLocation(program, "horse_part"), horse_part);
    gl.uniform1f(gl.getUniformLocation(program, "applyTexture"), applyTexture);
    gl.uniform1f(gl.getUniformLocation(program, "vertical_pole"), vertical_pole);
    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * horizontalHeight, 0.0));
    instanceMatrix = mult(instanceMatrix, scale4(horizontalWidth, horizontalHeight, horizontalWidth));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for (var i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4);
}

function quad(a, b, c, d) {
    pointsArray.push(vertices[a]);
    texCoordsArray.push(texCoord[0]);
    pointsArray.push(vertices[b]);
    texCoordsArray.push(texCoord[1]);
    pointsArray.push(vertices[c]);
    texCoordsArray.push(texCoord[2]);
    pointsArray.push(vertices[d]);
    texCoordsArray.push(texCoord[3]);
}

function cube()
{
    quad( 1, 0, 3, 2 );
    quad( 2, 3, 7, 6 );
    quad( 3, 0, 4, 7 );
    quad( 6, 5, 1, 2 );
    quad( 4, 5, 6, 7 );
    quad( 5, 4, 0, 1 );
}


var thetac  = 60/180;
var phi = 70/180;
var radius = 1;
var eye;
const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);


window.onload = function init() {

    canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders( gl, "vertex-shader", "fragment-shader");

    gl.useProgram( program);

    instanceMatrix = mat4();
    cube();

    vBuffer = gl.createBuffer();

    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray(vPosition);

    var tBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW);

    var vTexCoord = gl.getAttribLocation(program, "vTexCoord");
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoord);

    configureTexture();

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture1);
    gl.uniform1i(gl.getUniformLocation(program, "Tex0"), 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texture2);
    gl.uniform1i(gl.getUniformLocation(program, "Tex1"), 1);
    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );
    for(i=0; i<numNodesHorse; i++) initNodesHorse(i);
    for (i = 0; i < numNodesObstacle; i++) initNodesObstacle(i);
    render();
}

document.getElementById("startBtn").onclick = function(){requestAnimFrame(start);}

/*document.getElementById("radiusSlider").onchange = function (event) {
    radius = event.target.value;
    console.log(radius);
};
document.getElementById("thetaSlider").onchange = function (event) {
    thetac = event.target.value * Math.PI / 180.0;
    console.log(thetaSlider.value);
};
document.getElementById("phiSlider").onchange = function (event) {
    phi = event.target.value * Math.PI / 180.0;
    console.log(phiSlider.value);
};*/

function rotate_leg(id){
    switch(id){
      case leftUpFrontId:
      case leftUpBackId:
          if(theta[id] <= -40){flag[id] = false;}
          if(theta[id] >= 40){flag[id] = true;}
          if(flag[id]){ theta[id]-= 8;}
          else theta[id] +=8;
      break;
      case rightUpFrontId:
      case rightUpBackId:
          if(theta[id] <= -40){flag[id] = false;}
          if(theta[id] >= 40){flag[id] = true;}
          if(flag[id]) theta[id]-= 8;
          else theta[id]+= 8;
        break;
    }
  }

function start() {
    x_horse += 0.15;
	  if(x_horse < -7.5){
		for(var i=leftUpFrontId; i<=rightLowBackId; i++) rotate_leg(i);
		//console.log(x_horse);
		traverse2(horizontalPole1Id);
    drawHorse();
    requestAnimFrame(start);}
    else{
    requestAnimFrame(jump_up);}
}


function jump_up() {
    if (x_horse < -2) {
        x_horse += 0.15;
        y_horse += 0.07;
        if (theta[torsoId] <= 15) { theta[torsoId] += 0.5; }
        theta[rightUpFrontId] = -90;
        theta[leftUpFrontId] = -90;
        theta[rightLowFrontId] = 120;
        theta[leftLowFrontId] = 120;
        theta[rightUpBackId] = 50;
        theta[leftUpBackId] = 50;
        theta[rightLowBackId] = -10;
        theta[leftLowBackId] = -10;
        requestAnimationFrame(jump_up);
        traverse2(horizontalPole1Id);
        drawHorse();
    }
    else requestAnimationFrame(jump_flat);
}

function jump_flat() {
    if (theta[torsoId] >= 0) { theta[torsoId] -= 0.5; }
    if (x_horse < 3) {
        x_horse += 0.15;
        if (y_horse < 8) { y_horse += 0.05; }
        //console.log(x_horse);
        traverse2(horizontalPole1Id);
        drawHorse();
        theta[rightUpFrontId] = -90;
        theta[leftUpFrontId] = -90;
        theta[rightLowFrontId] = 120;
        theta[leftLowFrontId] = 120;
        theta[rightUpBackId] = 60;
        theta[leftUpBackId] = 60;
        theta[rightLowBackId] = -25;
        theta[leftLowBackId] = -25;
        requestAnimFrame(jump_flat);
    }
    else {
        requestAnimFrame(jump_down);
    }
}

function jump_down() {
    if (x_horse < 7.5) {
        x_horse += 0.15;
        if (theta[torsoId] >= -30) { theta[torsoId] -= 0.5; }
        if (y_horse > 5) { y_horse -= 0.07; }
        traverse2(horizontalPole1Id);
        drawHorse();
        theta[rightUpFrontId] = -70;
        theta[leftUpFrontId] = -70;
        theta[rightLowFrontId] = 20;
        theta[leftLowFrontId] = 20;
        theta[rightUpBackId] = 60;
        theta[leftUpBackId] = 60;
        theta[rightLowBackId] = -25;
        theta[leftLowBackId] = -25;
        requestAnimationFrame(jump_down);
    }
    else {
        flag[rightUpFrontId] = false;
        flag[leftUpFrontId] = false;
        flag[rightUpBackId] = false;
        flag[leftUpBackId] = true;
        theta[leftUpFrontId] = -10;
        theta[rightUpFrontId] = 0;
        theta[leftUpBackId] = 20;
        theta[rightUpBackId] = 25;
        requestAnimFrame(end);
    }
}

function end() {
    if (theta[torsoId] <= 0) { theta[torsoId] += 0.5; }
    if (x_horse < 14) {
        x_horse += 0.15;
        if (y_horse > 5) { y_horse -= 0.1; }
        //console.log(x_horse);
        for (var i = leftUpFrontId; i <= rightLowBackId; i++) rotate_leg(i);
        traverse2(horizontalPole1Id);
        drawHorse();
        requestAnimFrame(end);
    }
}

function drawHorse(){
	for(var i=0; i<numNodesHorse; i++) initNodesHorse(i);
	traverse1(torsoId);
}

var render = function() {
        gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        eye = vec3(radius*Math.sin(phi), radius*Math.sin(thetac),
        radius*Math.cos(phi));
        modelViewMatrix = lookAt(eye, at , up);
        projectionMatrix = ortho(-20.0, 20.0, -20.0, 20.0, -20.0, 20.0);
        gl.uniformMatrix4fv(gl.getUniformLocation( program, "modelViewMatrix"), false, flatten(modelViewMatrix) );
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "projectionMatrix"), false, flatten(projectionMatrix));
        traverse1(torsoId);
        traverse2(horizontalPole1Id);
        requestAnimFrame(render);
}
