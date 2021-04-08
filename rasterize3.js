/** CONSTANTS */
var defaultEye = vec3.fromValues(0.5,0.5,-0.5); // default eye position in world space
var defaultCenter = vec3.fromValues(0.5,0.5,0.5); // default view direction in world space
var defaultUp = vec3.fromValues(0,1,0); // default view up vector

var lightAmbient = vec3.fromValues(1,1,1); // default light ambient emission
var lightDiffuse = vec3.fromValues(1,1,1); // default light diffuse emission
var lightSpecular = vec3.fromValues(1,1,1); // default light specular emission
var lightPosition = vec3.fromValues(0.5,30,0.5); // default light position
var lightPositionULoc;
var rotateTheta = Math.PI/50; // how much to rotate models by with each key press

var gl = null; // the all powerful gl object. It's all here folks!

/* Interaction variables */
var Eye = vec3.clone(defaultEye); // eye position in world space
var Center = vec3.clone(defaultCenter); // view direction in world space
var Up = vec3.clone(defaultUp); // view up vector in world space
var viewDelta = 0.1; // how much to displace view with each key press

/* Other Variables */
var mMatrixULoc; // where to put model matrix for vertex shader
var pvmMatrixULoc; // where to put project model view matrix for vertex shader

var vPosAttribLoc; // where to put position for vertex shader
var vNormAttribLoc; // where to put normal for vertex shader
var vUVAttribLoc; // where to put UV for vertex shader

var ambientULoc; // where to put ambient reflecivity for fragment shader
var diffuseULoc; // where to put diffuse reflecivity for fragment shader
var specularULoc; // where to put specular reflecivity for fragment shader
var shininessULoc; // where to put specular exponent for fragment shaderinputTriangles
var textureULoc; // where to put texture for fragment shader
var usingTextureULoc; // where to put using texture boolean for fragment shader

var positionBuffer = [];
var verticesBuffer = [];
var normalsBuffer = [];
var uvBuffer = [];
var textures = [];
var mountains = 100;
var triangles = 136 * mountains;

function handleKeyDown(event) {
    
    
    // set up needed view params
    var lookAt = vec3.create(), viewRight = vec3.create(), temp = vec3.create(); // lookat, right & temp vectors
    lookAt = vec3.normalize(lookAt,vec3.subtract(temp,Center,Eye)); // get lookat vector
    viewRight = vec3.normalize(viewRight,vec3.cross(temp,lookAt,Up)); // get view right vector
    
    event.preventDefault();
    
    switch (event.code) {
        
            
        // view change
        case "ArrowLeft": // translate view left, rotate left with shift
            Center = vec3.add(Center,Center,vec3.scale(temp,viewRight,viewDelta));
            if (!event.getModifierState("Shift"))
                Eye = vec3.add(Eye,Eye,vec3.scale(temp,viewRight,viewDelta));
            break;
        case "ArrowRight": // translate view right, rotate right with shift
            Center = vec3.add(Center,Center,vec3.scale(temp,viewRight,-viewDelta));
            if (!event.getModifierState("Shift"))
                Eye = vec3.add(Eye,Eye,vec3.scale(temp,viewRight,-viewDelta)); 
            break;
        case "ArrowDown": // translate view backward, rotate up with shift
            if (event.getModifierState("Shift")) {
                Eye = vec3.add(Eye,Eye,vec3.scale(temp,lookAt,-viewDelta));
                Center = vec3.add(Center,Center,vec3.scale(temp,lookAt,-viewDelta));
            } else {
                Eye = vec3.add(Eye,Eye,vec3.scale(temp,lookAt,-viewDelta));
                Center = vec3.add(Center,Center,vec3.scale(temp,lookAt,-viewDelta));
            } // end if shift not pressed
            break;
        case "ArrowUp": // translate view forward, rotate down with shift
            if (event.getModifierState("Shift")) {
                Eye = vec3.add(Eye,Eye,vec3.scale(temp,lookAt,viewDelta));
                Center = vec3.add(Center,Center,vec3.scale(temp,lookAt,viewDelta));
            } else {
                Eye = vec3.add(Eye,Eye,vec3.scale(temp,lookAt,viewDelta));
                Center = vec3.add(Center,Center,vec3.scale(temp,lookAt,viewDelta));
            } // end if shift not pressed
            break;
        case "Escape": // reset view to default
            Eye = vec3.copy(Eye,defaultEye);
            Center = vec3.copy(Center,defaultCenter);
            Up = vec3.copy(Up,defaultUp);
            break;   
    } // end switch
} // end handleKeyDown


// set up the webGL environment
function setupWebGL() {

    document.onkeydown = handleKeyDown;

    // create a webgl canvas and set it up
    var webGLCanvas = document.getElementById("myWebGLCanvas"); // create a webgl canvas
    gl = webGLCanvas.getContext("webgl"); // get a webgl object from it
    try {
      if (gl == null) {
        throw "unable to create gl context -- is your browser gl ready?";
      } else {
        gl.clearColor(1.0, 1.0, 0.92, 1.0); // use black when we clear the frame buffer
        gl.clearDepth(1.0); // use max when we clear the depth buffer
        gl.enable(gl.DEPTH_TEST); // use hidden surface removal (with zbuffering)
      }
    } // end try
    catch(e) {
      console.log(e);
    } // end catch
 
} // end setupWebGL

function loadTexture(whichModel,textureFile,textures) {
        
    // load a 1x1 gray image into texture for use when no texture, and until texture loads
    textures[whichModel] = gl.createTexture(); // new texture struct for model
    var currTexture = textures[whichModel]; // shorthand
    gl.bindTexture(gl.TEXTURE_2D, currTexture); // activate model's texture
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); // invert vertical texcoord v, load gray 1x1
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,new Uint8Array([64, 64, 64, 255]));        
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); // invert vertical texcoord v
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); // use linear filter for magnification
    //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); // use mipmap for minification

    //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.generateMipmap(gl.TEXTURE_2D); // construct mipmap pyramid
    gl.bindTexture(gl.TEXTURE_2D, null); // deactivate model's texture
        
    // if there is a texture to load, asynchronously load it
    if (textureFile != false) {
        currTexture.image = new Image(); // new image struct for texture
        currTexture.image.onload = function () { // when texture image loaded...
        gl.bindTexture(gl.TEXTURE_2D, currTexture); // activate model's new texture
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, currTexture.image); // norm 2D texture
        gl.generateMipmap(gl.TEXTURE_2D); // rebuild mipmap pyramid
        gl.bindTexture(gl.TEXTURE_2D, null); // deactivate model's new texture
    } // end when texture image loaded
        currTexture.image.onerror = function () { // when texture image load fails...
            console.log("Unable to load texture " + textureFile);
        } // end when texture image load fails
        currTexture.image.crossOrigin = "Anonymous"; // allow cross origin load, please
        currTexture.image.src = textureFile; // set image location
    } // end if material has a texture
} // end load texture


function loadModels() {

	var disX = -12;
	var disZ = -5;
	for (var i = 0; i < 10; i++) {
		for (var j = 0; j < 10; j++) { 
			loadMountain((i * 10 + j) * 136, disX + i + j + 0.5 * i + 0.7 * j, disZ + i + 0.7 * i + 0.7 * j);
		}
	}
}

function loadMountain(indexStart, disX, disZ) {

  // Pyramid Front
  var x1 = 0.4;
  var x2 = 0.5;
  var x3 = 0.6;

  var y1 = 0.05;
  var y2 = 0.25;
  var y3 = 0.05;

  var z1 = 0.75;
  var z2 = 0.85;
  var z3 = 0.75;

  var positions = [];
  var normals = [];

  for (var i = 0; i < 136; i++) {

  	x1 += disX;
  	x2 += disX;
  	x3 += disX;

  	z1 += disZ;
  	z2 += disZ;
  	z3 += disZ;

    positions[i] = [
      x1,  y1,  z1,
      x2,  y2,  z2,
      x3,  y3,  z3,
    ]

    var Ux = x2 - x1;
    var Uy = y2 - y1;
    var Uz = z2 - z1;

    var Vx = x3 - x1;
    var Vy = y3 - y1;
    var Vz = z3 - z1;

    var Nx = Math.abs((Uy * Vz) - (Uz * Vy));
    var Ny = Math.abs((Uz * Vx) - (Ux * Vz));
    var Nz = Math.abs((Ux * Vy) - (Uy * Vx));

    normals[i] = [
      Nx, Ny, Nz,
      Nx, Ny, Nz,
      Nx, Ny, Nz,
    ];

    // Pyramid Left
    if (i == 0) {
      x1 = 0.4;
      x2 = 0.5;
      x3 = 0.4;

      y1 = 0.05;
      y2 = 0.25;
      y3 = 0.05;

      z1 = 0.75;
      z2 = 0.85;
      z3 = 0.95;
    }

    // Pyramid Right
    if (i == 1) {
      x1 = 0.6;
      x2 = 0.5;
      x3 = 0.6;

      y1 = 0.05;
      y2 = 0.25;
      y3 = 0.05;

      z1 = 0.75;
      z2 = 0.85;
      z3 = 0.95;
    }

    // Pyramid Back
    if (i == 2) {
      x1 = 0.4;
      x2 = 0.5;
      x3 = 0.6;

      y1 = 0.05;
      y2 = 0.25;
      y3 = 0.05;

      z1 = 0.95;
      z2 = 0.85;
      z3 = 0.95;
    }

    // Front Platform 1A
    if (i == 3) {
      x1 = 0.4;
      x2 = 0.4;
      x3 = 0.6;

      y1 = 0.05;
      y2 = -0.15;
      y3 = 0.05;

      z1 = 0.75;
      z2 = 0.65;
      z3 = 0.75;
    }

    // Front Platform 1B
    if (i == 4) {
      x1 = 0.4;
      x2 = 0.6;
      x3 = 0.6;

      y1 = -0.15;
      y2 = 0.05;
      y3 = -0.15;

      z1 = 0.65;
      z2 = 0.75;
      z3 = 0.65;
    }

    // Left Platform 1A
    if (i == 5) {
      x1 = 0.4;
      x2 = 0.3;
      x3 = 0.4;

      y1 = 0.05;
      y2 = -0.15;
      y3 = 0.05;

      z1 = 0.95;
      z2 = 0.95;
      z3 = 0.75;
    }

    // Left Platform 1B
    if (i == 6) {
      x1 = 0.3;
      x2 = 0.3;
      x3 = 0.4;

      y1 = -0.15;
      y2 = -0.15;
      y3 = 0.05;

      z1 = 0.95;
      z2 = 0.75;
      z3 = 0.75;
    }

    // Right Platform 1A
    if (i == 7) {
      x1 = 0.6;
      x2 = 0.6;
      x3 = 0.7;

      y1 = 0.05;
      y2 = 0.05;
      y3 = -0.15;

      z1 = 0.95;
      z2 = 0.75;
      z3 = 0.95;
    }

    // Right Platform 1B 
    if (i == 8) {
      x1 = 0.7;
      x2 = 0.7;
      x3 = 0.6;

      y1 = -0.15;
      y2 = -0.15;
      y3 = 0.05;

      z1 = 0.95;
      z2 = 0.75;
      z3 = 0.75;
    }

    // Back Platform 1A
    if (i == 9) {
      x1 = 0.4;
      x2 = 0.6;
      x3 = 0.4;

      y1 = 0.05;
      y2 = 0.05;
      y3 = -0.15;

      z1 = 0.95;
      z2 = 0.95;
      z3 = 1.05;
    }

    // BackPlatform 1B
    if (i == 10) {
      x1 = 0.4;
      x2 = 0.6;
      x3 = 0.6;

      y1 = -0.15;
      y2 = -0.15;
      y3 = 0.05;

      z1 = 1.05;
      z2 = 1.05;
      z3 = 0.95;
    }

    // Intermediate (Between Front 1 & Right 1)
    if (i == 11) {
      x1 = 0.7;
      x2 = 0.6;
      x3 = 0.6;

      y1 = -0.15;
      y2 = -0.15;
      y3 = 0.05;

      z1 = 0.75;
      z2 = 0.65;
      z3 = 0.75;
    }

    // Intermediate (Between Front 1 & Left 1)
    if (i == 12) {
      x1 = 0.3;
      x2 = 0.4;
      x3 = 0.4;

      y1 = -0.15;
      y2 = -0.15;
      y3 = 0.05;

      z1 = 0.75;
      z2 = 0.65;
      z3 = 0.75;
    }

    // Intermediate (Between Back 1 & Left 1)    
    if (i == 13) {
      x1 = 0.4;
      x2 = 0.4;
      x3 = 0.3;

      y1 = -0.15;
      y2 = 0.05;
      y3 = -0.15;

      z1 = 1.05;
      z2 = 0.95;
      z3 = 0.95;
    }

    // Intermediate (Between Back 1 & Right 1)
    if (i == 14) {
      x1 = 0.6;
      x2 = 0.6;
      x3 = 0.7;

      y1 = -0.15;
      y2 = 0.05;
      y3 = -0.15;

      z1 = 1.05;
      z2 = 0.95;
      z3 = 0.95;
    }

    // Left Platform 2A
    if (i == 15) {
      x1 = 0.2;
      x2 = 0.3;
      x3 = 0.3;

      y1 = -0.30;
      y2 = -0.15;
      y3 = -0.15;

      z1 = 1.00;
      z2 = 0.95;
      z3 = 0.75;
    }

    // Left Platform 2B
    if (i == 16) {
      x1 = 0.2;
      x2 = 0.2;
      x3 = 0.3;

      y1 = -0.30;
      y2 = -0.30;
      y3 = -0.15;

      z1 = 1.00;
      z2 = 0.70;
      z3 = 0.75;
    }

    // Right Platform 2A
    if (i == 17) {
      x1 = 0.7;
      x2 = 0.8;
      x3 = 0.8;

      y1 = -0.15;
      y2 = -0.30;
      y3 = -0.30;      

      z1 = 0.95;
      z2 = 1.00;
      z3 = 0.70;
    }

    // Right Platform 2B
    if (i == 18) {
      x1 = 0.8;
      x2 = 0.7;
      x3 = 0.7;

      y1 = -0.30;
      y2 = -0.15;
      y3 = -0.15;

      z1 = 0.70;
      z2 = 0.75;
      z3 = 0.95;
    }

    // Front Platform 2A
    if (i == 19) {
      x1 = 0.4;
      x2 = 0.35;
      x3 = 0.65;

      y1 = -0.15;
      y2 = -0.30;
      y3 = -0.30;

      z1 = 0.65;
      z2 = 0.55;
      z3 = 0.55;
    }

    // Front Platform 2B
    if (i == 20) {
      x1 = 0.65;
      x2 = 0.6;
      x3 = 0.4;

      y1 = -0.30;
      y2 = -0.15;
      y3 = -0.15;

      z1 = 0.55;
      z2 = 0.65;
      z3 = 0.65;
    }

    // Back Platform 2A
    if (i == 21) {
      x1 = 0.4;
      x2 = 0.35;
      x3 = 0.65;

      y1 = -0.15;
      y2 = -0.30;
      y3 = -0.30;

      z1 = 1.05;
      z2 = 1.15;
      z3 = 1.15;
    }

    // Back Platform 2B
    if (i == 22) {
      x1 = 0.65;
      x2 = 0.6;
      x3 = 0.4;

      y1 = -0.30;
      y2 = -0.15;
      y3 = -0.15;

      z1 = 1.15;
      z2 = 1.05;
      z3 = 1.05;
    }

    // Front-Left Platform 2A
    if (i == 23) {
      x1 = 0.2;
      x2 = 0.35;
      x3 = 0.4;

      y1 = -0.30;
      y2 = -0.30;
      y3 = -0.15;

      z1 = 0.70;
      z2 = 0.55;
      z3 = 0.65;
    }

    // Front-Left Platform 2B
    if (i == 24) {
      x1 = 0.4;
      x2 = 0.3;
      x3 = 0.2;

      y1 = -0.15;
      y2 = -0.15;
      y3 = -0.30;

      z1 = 0.65;
      z2 = 0.75;
      z3 = 0.70;
    }

    // Front-Right Platform 2A
    if (i == 25) {
      x1 = 0.65;
      x2 = 0.80;
      x3 = 0.70;

      y1 = -0.30;
      y2 = -0.30;
      y3 = -0.15;

      z1 = 0.55;
      z2 = 0.70;
      z3 = 0.75;
    }

    // Front-Right Platform 2B
    if (i == 26) {
      x1 = 0.70;
      x2 = 0.60;
      x3 = 0.65;

      y1 = -0.15;
      y2 = -0.15;
      y3 = -0.30;

      z1 = 0.75;
      z2 = 0.65;
      z3 = 0.55;
    }

    // Back-Left Platform 2A
    if (i == 27) {
      x1 = 0.35;
      x2 = 0.20;
      x3 = 0.30;

      y1 = -0.30;
      y2 = -0.30;
      y3 = -0.15;

      z1 = 1.15;
      z2 = 1.00;
      z3 = 0.95;
    }

    // Back-Left Platform 2B
    if (i == 28) {
      x1 = 0.30;
      x2 = 0.40;
      x3 = 0.35;

      y1 = -0.15;
      y2 = -0.15;
      y3 = -0.30;

      z1 = 0.95;
      z2 = 1.05;
      z3 = 1.15;
    }

    // Back-Right Platform 2A
    if (i == 29) {
      x1 = 0.70;
      x2 = 0.80;
      x3 = 0.60;

      y1 = -0.15;
      y2 = -0.30;
      y3 = -0.15;

      z1 = 0.95;
      z2 = 1.00;
      z3 = 1.05;
    }

    // Back-Right Platform 2B
    if (i == 30) {
      x1 = 0.60;
      x2 = 0.65;
      x3 = 0.80;

      y1 = -0.15;
      y2 = -0.30;
      y3 = -0.30;

      z1 = 1.05;
      z2 = 1.15;
      z3 = 1.00;
    }

    // Front Platform 3A
    if (i == 31) {
      x1 = 0.65;
      x2 = 0.35;
      x3 = 0.35;

      y1 = -0.50;
      y2 = -0.50;
      y3 = -0.30;

      z1 = 0.35;
      z2 = 0.35;
      z3 = 0.55;
    }

    // Front Platform 3B
    if (i == 32) {
      x1 = 0.35;
      x2 = 0.65;
      x3 = 0.65;

      y1 = -0.30;
      y2 = -0.30;
      y3 = -0.50;

      z1 = 0.55;
      z2 = 0.55;
      z3 = 0.35;
    }

    // Right Platform 3A
    if (i == 33) {
      x1 = 1.00;
      x2 = 1.00;
      x3 = 0.80;

      y1 = -0.50;
      y2 = -0.50;
      y3 = -0.30;

      z1 = 1.00;
      z2 = 0.70;
      z3 = 0.70;
    }

    // Right Platform 3B
    if (i == 34) {
      x1 = 0.80;
      x2 = 0.80;
      x3 = 1.00;

      y1 = -0.30;
      y2 = -0.30;
      y3 = -0.50;

      z1 = 0.70;
      z2 = 1.00;
      z3 = 1.00;
    }

    // Left Platform 3A
    if (i == 35) {
      x1 = 0.00;
      x2 = 0.00;
      x3 = 0.20;

      y1 = -0.50;
      y2 = -0.50;
      y3 = -0.30;

      z1 = 1.00;
      z2 = 0.70;
      z3 = 0.70;
    }

    // Left Platform 3B
    if (i == 36) {
      x1 = 0.20;
      x2 = 0.20;
      x3 = 0.00;

      y1 = -0.30;
      y2 = -0.30;
      y3 = -0.50;

      z1 = 0.70;
      z2 = 1.00;
      z3 = 1.00;
    }

    // Back Platform 3A
    if (i == 37) {
      x1 = 0.65;
      x2 = 0.35;
      x3 = 0.35;

      y1 = -0.50;
      y2 = -0.50;
      y3 = -0.30;

      z1 = 1.35;
      z2 = 1.35;
      z3 = 1.15;
    }

    // Back Platform 3B
    if (i == 38) {
      x1 = 0.35;
      x2 = 0.65;
      x3 = 0.65;

      y1 = -0.30;
      y2 = -0.30;
      y3 = -0.50;

      z1 = 1.15;
      z2 = 1.15;
      z3 = 1.35;
    }

    // Front-Left Platform 3A
    if (i == 39) {
      x1 = 0.11;
      x2 = 0.24;
      x3 = 0.35;

      y1 = -0.50;
      y2 = -0.50;
      y3 = -0.30;

      z1 = 0.59;
      z2 = 0.46;
      z3 = 0.55;
    }

    // Front-Left Platform 3B
    if (i == 40) {
      x1 = 0.35;
      x2 = 0.20;
      x3 = 0.11;

      y1 = -0.30;
      y2 = -0.30;
      y3 = -0.50;

      z1 = 0.55;
      z2 = 0.70;
      z3 = 0.59;
    }

    // Front-Right Platform 3A
    if (i == 41) {
      x1 = 0.89;
      x2 = 0.76;
      x3 = 0.65;

      y1 = -0.50;
      y2 = -0.50;
      y3 = -0.30;

      z1 = 0.59;
      z2 = 0.46;
      z3 = 0.55;
    }

    // Front-Right Platform 3B
    if (i == 42) {
      x1 = 0.65;
      x2 = 0.80;
      x3 = 0.89;

      y1 = -0.30;
      y2 = -0.30;
      y3 = -0.50;

      z1 = 0.55;
      z2 = 0.70;
      z3 = 0.59;
    }

    // Back-Left Platform 3A
    if (i == 43) {
      x1 = 0.24;
      x2 = 0.11;
      x3 = 0.20;

      y1 = -0.50;
      y2 = -0.50;
      y3 = -0.30;

      z1 = 1.24;
      z2 = 1.11;
      z3 = 1.00;
    }

    // Back-Left Platform 3B
    if (i == 44) {
      x1 = 0.20;
      x2 = 0.35;
      x3 = 0.24;

      y1 = -0.30;
      y2 = -0.30;
      y3 = -0.50;

      z1 = 1.00;
      z2 = 1.15;
      z3 = 1.24;
    }

    // Back-Right Platform 3A
    if (i == 45) {
      x1 = 0.76;
      x2 = 0.89;
      x3 = 0.80;

      y1 = -0.50;
      y2 = -0.50;
      y3 = -0.30;

      z1 = 1.24;
      z2 = 1.11;
      z3 = 1.00;
    }

    // Back-Right Platform 3B
    if (i == 46) {
      x1 = 0.80;
      x2 = 0.65;
      x3 = 0.76;

      y1 = -0.30;
      y2 = -0.30;
      y3 = -0.50;

      z1 = 1.00;
      z2 = 1.15;
      z3 = 1.24;
    }

    // Intermediate (Between Right 3 & Front Right 3)
    if (i == 47) {
      x1 = 0.89;
      x2 = 0.80;
      x3 = 1.00;

      y1 = -0.50;
      y2 = -0.30;
      y3 = -0.50;

      z1 = 0.59;
      z2 = 0.70;
      z3 = 0.70;
    }

    // Intermediate (Between Front 3 & Front Right 3)
    if (i == 48) {
      x1 = 0.65;
      x2 = 0.65;
      x3 = 0.76;

      y1 = -0.50;
      y2 = -0.30;
      y3 = -0.50;

      z1 = 0.35;
      z2 = 0.55;
      z3 = 0.46;
    }

    // Intermediate (Between Front 3 & Front Left 3)
    if (i == 49) {
      x1 = 0.24;
      x2 = 0.35;
      x3 = 0.35;

      y1 = -0.50;
      y2 = -0.30;
      y3 = -0.50;

      z1 = 0.46;
      z2 = 0.55;
      z3 = 0.35;
    }

    // Intermediate (Between Left 3 & Front Left 3)
    if (i == 50) {
      x1 = 0.00;
      x2 = 0.20;
      x3 = 0.11;

      y1 = -0.50;
      y2 = -0.30;
      y3 = -0.50;

      z1 = 0.70;
      z2 = 0.70;
      z3 = 0.59;
    }

    // Intermediate (Between Right 3 & Back Right 3)
    if (i == 51) {
      x1 = 1.00;
      x2 = 0.80;
      x3 = 0.89;

      y1 = -0.50;
      y2 = -0.30;
      y3 = -0.50;

      z1 = 1.00;
      z2 = 1.00;
      z3 = 1.11;
    }

    // Intermediate (Between Back 3 & Back Right 3)
    if (i == 52) {
      x1 = 0.76;
      x2 = 0.65;
      x3 = 0.65;

      y1 = -0.50;
      y2 = -0.30;
      y3 = -0.50;

      z1 = 1.24;
      z2 = 1.15;
      z3 = 1.35;
    }

    // Intermediate (Between Back 3 & Back Left 3)
    if (i == 53) {
      x1 = 0.35;
      x2 = 0.35;
      x3 = 0.24;

      y1 = -0.50;
      y2 = -0.30;
      y3 = -0.50;

      z1 = 1.35;
      z2 = 1.15;
      z3 = 1.24;
    }

    // Intermediate (Between Left 3 & Back Left 3)
    if (i == 54) {
      x1 = 0.11;
      x2 = 0.20;
      x3 = 0.00;

      y1 = -0.50;
      y2 = -0.30;
      y3 = -0.50;

      z1 = 1.11;
      z2 = 1.00;
      z3 = 1.00;
    }

    // Front Platform 4A
    if (i == 55) {
      x1 = 0.70;
      x2 = 0.30;
      x3 = 0.35;

      y1 = -0.70;
      y2 = -0.70;
      y3 = -0.50;

      z1 = 0.25;
      z2 = 0.25;
      z3 = 0.35;
    }

    // Front Platform 4B
    if (i == 56) {
      x1 = 0.35;
      x2 = 0.65;
      x3 = 0.70;

      y1 = -0.50;
      y2 = -0.50;
      y3 = -0.70;

      z1 = 0.35;
      z2 = 0.35;
      z3 = 0.25;
    }

    // Right Platform 4A
    if (i == 57) {
      x1 = 1.10;
      x2 = 1.10;
      x3 = 1.00;

      y1 = -0.70;
      y2 = -0.70;
      y3 = -0.50;

      z1 = 1.05;
      z2 = 0.65;
      z3 = 0.70;
    }

    // Right Platform 4B
    if (i == 58) {
      x1 = 1.00;
      x2 = 1.00;
      x3 = 1.10;

      y1 = -0.50;
      y2 = -0.50;
      y3 = -0.70;

      z1 = 0.70;
      z2 = 1.00;
      z3 = 1.05;
    }

    // Left Platform  4A
    if (i == 59) {
      x1 = -0.1;
      x2 = -0.1;
      x3 = 0.00;

      y1 = -0.70;
      y2 = -0.70;
      y3 = -0.50;

      z1 = 1.05;
      z2 = 0.65;
      z3 = 0.70;
    }

    // Left Platform  4B
    if (i == 60) {
      x1 = 0.00;
      x2 = 0.00;
      x3 = -0.1;

      y1 = -0.50;
      y2 = -0.50;
      y3 = -0.70;

      z1 = 0.70;
      z2 = 1.00;
      z3 = 1.05;
    }

    // Back Platform  4A
    if (i == 61) {
      x1 = 0.70;
      x2 = 0.30;
      x3 = 0.35;

      y1 = -0.70;
      y2 = -0.70;
      y3 = -0.50;

      z1 = 1.45;
      z2 = 1.45;
      z3 = 1.35;
    }

    // Back Platform  4B
    if (i == 62) {
      x1 = 0.35;
      x2 = 0.65;
      x3 = 0.70;

      y1 = -0.50;
      y2 = -0.50;
      y3 = -0.70;

      z1 = 1.35;
      z2 = 1.35;
      z3 = 1.45;
    }

    // Front-Left Platform 4A
    if (i == 63) {
      x1 = 0.03;
      x2 = 0.17;
      x3 = 0.24;

      y1 = -0.70;
      y2 = -0.70;
      y3 = -0.50;

      z1 = 0.54;
      z2 = 0.41;
      z3 = 0.46;
    }

    // Front-Left Platform 4B
    if (i == 64) {
      x1 = 0.24;
      x2 = 0.11;
      x3 = 0.03;

      y1 = -0.50;
      y2 = -0.50;
      y3 = -0.70;

      z1 = 0.46;
      z2 = 0.59;
      z3 = 0.54;
    }

    // Front-Right Platform 4A
    if (i == 65) {
      x1 = 0.98;
      x2 = 0.83;
      x3 = 0.76;

      y1 = -0.70;
      y2 = -0.70;
      y3 = -0.50;

      z1 = 0.54;
      z2 = 0.41;
      z3 = 0.46;
    }

    // Front-Right Platform 4B
    if (i == 66) {
      x1 = 0.76;
      x2 = 0.89;
      x3 = 0.98;

      y1 = -0.50;
      y2 = -0.50;
      y3 = -0.70;

      z1 = 0.46;
      z2 = 0.59;
      z3 = 0.54;
    }

    // Back-Left Platform  4A
    if (i == 67) {
      x1 = 0.17;
      x2 = 0.03;
      x3 = 0.11;

      y1 = -0.70;
      y2 = -0.70;
      y3 = -0.50;

      z1 = 1.29;
      z2 = 1.16;
      z3 = 1.11;
    }

    // Back-Left Platform  4B
    if (i == 68) {
      x1 = 0.11;
      x2 = 0.24;
      x3 = 0.17;

      y1 = -0.50;
      y2 = -0.50;
      y3 = -0.70;

      z1 = 1.11;
      z2 = 1.24;
      z3 = 1.29;
    }

    // Back-Right Platform  4A
    if (i == 69) {
      x1 = 0.83;
      x2 = 0.98;
      x3 = 0.89;

      y1 = -0.70;
      y2 = -0.70;
      y3 = -0.50;

      z1 = 1.29;
      z2 = 1.16;
      z3 = 1.11;
    }

    // Back-Right Platform  4B
    if (i == 70) {
      x1 = 0.89;
      x2 = 0.76;
      x3 = 0.83;

      y1 = -0.50;
      y2 = -0.50;
      y3 = -0.70;

      z1 = 1.11;
      z2 = 1.24;
      z3 = 1.29;
    }

    // Front-LL Platform 4A
    if (i == 71) {
      x1 = -0.10;
      x2 = 0.03;
      x3 = 0.11;

      y1 = -0.70;
      y2 = -0.70;
      y3 = -0.50;

      z1 = 0.65;
      z2 = 0.54;
      z3 = 0.59;
    }

    // Front-LL Platform 4B
    if (i == 72) {
      x1 = 0.11;
      x2 = 0.00;
      x3 = -0.10;

      y1 = -0.50;
      y2 = -0.50;
      y3 = -0.70;

      z1 = 0.59;
      z2 = 0.70;
      z3 = 0.65;
    }

    // Front-LR Platform 4A
    if (i == 73) {
      x1 = 0.17;
      x2 = 0.30;
      x3 = 0.35;

      y1 = -0.70;
      y2 = -0.70;
      y3 = -0.50;

      z1 = 0.41;
      z2 = 0.25;
      z3 = 0.35;
    }

    // Front-LR Platform 4B
    if (i == 74) {
      x1 = 0.35;
      x2 = 0.24;
      x3 = 0.17;

      y1 = -0.50;
      y2 = -0.50;
      y3 = -0.70;

      z1 = 0.35;
      z2 = 0.46;
      z3 = 0.41;
    }

    // Front-RL Platform  4A
    if (i == 75) {
      x1 = 0.83;
      x2 = 0.70;
      x3 = 0.65;

      y1 = -0.70;
      y2 = -0.70;
      y3 = -0.50;

      z1 = 0.41;
      z2 = 0.25;
      z3 = 0.35;
    }

    // Front-RL Platform  4B
    if (i == 76) {
      x1 = 0.65;
      x2 = 0.76;
      x3 = 0.83;

      y1 = -0.50;
      y2 = -0.50;
      y3 = -0.70;

      z1 = 0.35;
      z2 = 0.46;
      z3 = 0.41;
    }

    // Front-RR Platform  4A
    if (i == 77) {
      x1 = 1.10;
      x2 = 0.98;
      x3 = 0.89;

      y1 = -0.70;
      y2 = -0.70;
      y3 = -0.50;

      z1 = 0.65;
      z2 = 0.54;
      z3 = 0.59;
    }

    // Front-RR  Platform  4B
    if (i == 78) {
      x1 = 0.89;
      x2 = 1.00;
      x3 = 1.10;

      y1 = -0.50;
      y2 = -0.50;
      y3 = -0.70;

      z1 = 0.59;
      z2 = 0.70;
      z3 = 0.65;
    }

    // Back-LL Platform 4A
    if (i == 79) {
      x1 = 0.03;
      x2 = -0.1;
      x3 = 0.11;

      y1 = -0.70;
      y2 = -0.70;
      y3 = -0.50;

      z1 = 1.16;
      z2 = 1.05;
      z3 = 1.11;
    }

    // Back-LL Platform 4B
    if (i == 80) {
      x1 = 0.11;
      x2 = 0.00;
      x3 = -0.1;

      y1 = -0.50;
      y2 = -0.50;
      y3 = -0.70;

      z1 = 1.11;
      z2 = 1.00;
      z3 = 1.05;
    }

    // Back-LR Platform 4A
    if (i == 81) {
      x1 = 0.30;
      x2 = 0.17;
      x3 = 0.24;

      y1 = -0.70;
      y2 = -0.70;
      y3 = -0.50;

      z1 = 1.45;
      z2 = 1.29;
      z3 = 1.24;
    }

    // Back-LR Platform 4B
    if (i == 82) {
      x1 = 0.24;
      x2 = 0.35;
      x3 = 0.30;

      y1 = -0.50;
      y2 = -0.50;
      y3 = -0.70;

      z1 = 1.24;
      z2 = 1.35;
      z3 = 1.45;
    }

    // Back-RL Platform  4A
    if (i == 83) {
      x1 = 0.70;
      x2 = 0.83;
      x3 = 0.76;

      y1 = -0.70;
      y2 = -0.70;
      y3 = -0.50;

      z1 = 1.45;
      z2 = 1.29;
      z3 = 1.24;
    }

    // Back-RL Platform  4B
    if (i == 84) {
      x1 = 0.76;
      x2 = 0.65;
      x3 = 0.70;

      y1 = -0.50;
      y2 = -0.50;
      y3 = -0.70;

      z1 = 1.24;
      z2 = 1.35;
      z3 = 1.45;
    }

    // Back-RR Platform  4A
    if (i == 85) {
      x1 = 0.98;
      x2 = 1.10;
      x3 = 1.00;

      y1 = -0.70;
      y2 = -0.70;
      y3 = -0.50;

      z1 = 1.16;
      z2 = 1.05;
      z3 = 1.00;
    }

    // Back-RR  Platform  4B
    if (i == 86) {
      x1 = 1.00;
      x2 = 0.89;
      x3 = 0.98;

      y1 = -0.50;
      y2 = -0.50;
      y3 = -0.70;

      z1 = 1.00;
      z2 = 1.11;
      z3 = 1.16;
    }

    // Front Plarform 5A
    if (i == 87) {
      x1 = 0.70;
      x2 = 0.30;
      x3 = 0.30;

      y1 = -0.80;
      y2 = -0.80;
      y3 = -0.70;

      z1 = 0.05;
      z2 = 0.05;
      z3 = 0.25;
    }

    // Front Platform 5B
    if (i == 88) {
      x1 = 0.30;
      x2 = 0.70;
      x3 = 0.70;

      y1 = -0.70;
      y2 = -0.70;
      y3 = -0.80;

      z1 = 0.25;
      z2 = 0.25;
      z3 = 0.05;
    }

    // Left Platform 5A
    if (i == 89) {
      x1 = -0.30;
      x2 = -0.30;
      x3 = -0.10;

      y1 = -0.80;
      y2 = -0.80;
      y3 = -0.70;

      z1 = 1.05;
      z2 = 0.65;
      z3 = 0.65;
    }

    // Left Platform 5B
    if (i == 90) {
      x1 = -0.10;
      x2 = -0.10;
      x3 = -0.30;

      y1 = -0.70;
      y2 = -0.70;
      y3 = -0.80;

      z1 = 0.65;
      z2 = 1.05;
      z3 = 1.05;
    }

    // Right Platform 5A
    if (i == 91) {
      x1 = 1.30;
      x2 = 1.30;
      x3 = 1.10;

      y1 = -0.80;
      y2 = -0.80;
      y3 = -0.70;

      z1 = 1.05;
      z2 = 0.65;
      z3 = 0.65;
    }

    // Right Platform 5B
    if (i == 92) {
      x1 = 1.10;
      x2 = 1.10;
      x3 = 1.30;

      y1 = -0.70;
      y2 = -0.70;
      y3 = -0.80;

      z1 = 0.65;
      z2 = 1.05;
      z3 = 1.05;
    }

    // Back Platform 5A
    if (i == 93) {
      x1 = 0.30;
      x2 = 0.70;
      x3 = 0.70;

      y1 = -0.80;
      y2 = -0.80;
      y3 = -0.70;

      z1 = 1.65;
      z2 = 1.65;
      z3 = 1.45;
    }

    // Back Platform 5B
    if (i == 94) {
      x1 = 0.70;
      x2 = 0.30;
      x3 = 0.30;

      y1 = -0.70;
      y2 = -0.70;
      y3 = -0.80;

      z1 = 1.45;
      z2 = 1.45;
      z3 = 1.65;
    }

    // Front-Right Platform 5A
    if (i == 95) {
      x1 = 1.06;
      x2 = 0.94;
      x3 = 0.83;

      y1 = -0.80;
      y2 = -0.80;
      y3 = -0.70;

      z1 = 0.41;
      z2 = 0.29;
      z3 = 0.41;
    }

    // Front-Right Platform 5B
    if (i == 96) {
      x1 = 0.83;
      x2 = 0.98;
      x3 = 1.06;

      y1 = -0.70;
      y2 = -0.70;
      y3 = -0.80;

      z1 = 0.41;
      z2 = 0.54;
      z3 = 0.41;
    }

    // Front-Left Platform 5A
    if (i == 97) {
      x1 = -0.06;
      x2 = 0.06;
      x3 = 0.17;

      y1 = -0.80;
      y2 = -0.80;
      y3 = -0.70;

      z1 = 0.41;
      z2 = 0.29;
      z3 = 0.41;
    }

    // Front-Left Platform 5B
    if (i == 98) {
      x1 =  0.17;
      x2 =  0.03;
      x3 = -0.06;

      y1 = -0.70;
      y2 = -0.70;
      y3 = -0.80;

      z1 = 0.41;
      z2 = 0.54;
      z3 = 0.41;
    }

    // Back-Right Platform 5A
    if (i == 99) {
      x1 = 1.06;
      x2 = 0.94;
      x3 = 0.83;

      y1 = -0.80;
      y2 = -0.80;
      y3 = -0.70;

      z1 = 1.29;
      z2 = 1.41;
      z3 = 1.29;
    }

    // Back-Right Platform 5B
    if (i == 100) {
      x1 = 0.83;
      x2 = 0.98;
      x3 = 1.06;

      y1 = -0.70;
      y2 = -0.70;
      y3 = -0.80;

      z1 = 1.29;
      z2 = 1.16;
      z3 = 1.29;
    }

    // Back-Left Platform 5A
    if (i == 101) {
      x1 = -0.06;
      x2 = 0.06;
      x3 = 0.17;

      y1 = -0.80;
      y2 = -0.80;
      y3 = -0.70;

      z1 = 1.29;
      z2 = 1.41;
      z3 = 1.29;
    }

    // Back-Left Platform 5B
    if (i == 102) {
      x1 =  0.17;
      x2 =  0.03;
      x3 = -0.06;

      y1 = -0.70;
      y2 = -0.70;
      y3 = -0.80;

      z1 = 1.29;
      z2 = 1.16;
      z3 = 1.29;
    }

    // Front Plarform LL 5A
    if (i == 103) {
      x1 = -0.22;
      x2 = -0.14;
      x3 = 0.03;

      y1 = -0.80;
      y2 = -0.80;
      y3 = -0.70;

      z1 = 0.57;
      z2 = 0.49;
      z3 = 0.54;
    }

    // Front Platform LL 5B
    if (i == 104) {
      x1 = 0.03;
      x2 = -0.10;
      x3 = -0.22;

      y1 = -0.70;
      y2 = -0.70;
      y3 = -0.80;

      z1 = 0.54;
      z2 = 0.65;
      z3 = 0.57;
    }

    // Front Plarform LR 5A
    if (i == 105) {
      x1 = 0.14;
      x2 = 0.22;
      x3 = 0.30;

      y1 = -0.80;
      y2 = -0.80;
      y3 = -0.70;

      z1 = 0.21;
      z2 = 0.13;
      z3 = 0.25;
    }

    // Front Plarform LR 5B
    if (i == 106) {
      x1 = 0.30;
      x2 = 0.17;
      x3 = 0.14;

      y1 = -0.70;
      y2 = -0.70;
      y3 = -0.80;

      z1 = 0.25;
      z2 = 0.41;
      z3 = 0.21;
    }

    // Front Plarform RL 5A
    if (i == 107) {
      x1 = 0.86;
      x2 = 0.78;
      x3 = 0.70;

      y1 = -0.80;
      y2 = -0.80;
      y3 = -0.70;

      z1 = 0.21;
      z2 = 0.13;
      z3 = 0.25;
    }

    // Front Plarform RL 5B
    if (i == 108) {
      x1 = 0.70;
      x2 = 0.83;
      x3 = 0.86;

      y1 = -0.70;
      y2 = -0.70;
      y3 = -0.80;

      z1 = 0.25;
      z2 = 0.41;
      z3 = 0.21;
    }

    // Front Platform RR 5A
    if (i == 109) {
      x1 = 1.22;
      x2 = 1.14;
      x3 = 0.98;

      y1 = -0.80;
      y2 = -0.80;
      y3 = -0.70;

      z1 = 0.57;
      z2 = 0.49;
      z3 = 0.54;
    }

    // Front Platform RR 5B
    if (i == 110) {
      x1 = 0.98;
      x2 = 1.10;
      x3 = 1.22;

      y1 = -0.70;
      y2 = -0.70;
      y3 = -0.80;

      z1 = 0.54;
      z2 = 0.65;
      z3 = 0.57;
    }

    // Back Platform LL 5A
    if (i == 111) {
      x1 = -0.22;
      x2 = -0.14;
      x3 = 0.03;

      y1 = -0.80;
      y2 = -0.80;
      y3 = -0.70;

      z1 = 1.13;
      z2 = 1.21;
      z3 = 1.16;
    }

    // Back Platform LL 5B
    if (i == 112) {
      x1 = 0.03;
      x2 = -0.10;
      x3 = -0.22;

      y1 = -0.70;
      y2 = -0.70;
      y3 = -0.80;

      z1 = 1.16;
      z2 = 1.05;
      z3 = 1.13;
    }

    // Back Platform LR 5A
    if (i == 113) {
      x1 = 0.22;
      x2 = 0.14;
      x3 = 0.17;

      y1 = -0.80;
      y2 = -0.80;
      y3 = -0.70;

      z1 = 1.57;
      z2 = 1.49;
      z3 = 1.29;
    }

    // Back Platform LR 5B
    if (i == 114) {
      x1 =  0.17;
      x2 =  0.30;
      x3 =  0.22;

      y1 = -0.70;
      y2 = -0.70;
      y3 = -0.80;
      
      z1 = 1.29;
      z2 = 1.45;
      z3 = 1.57;
    }

    // Back Platform RL 5A
    if (i == 115) {
      x1 = 0.78;
      x2 = 0.86;
      x3 = 0.83;

      y1 = -0.80;
      y2 = -0.80;
      y3 = -0.70;

      z1 = 1.57;
      z2 = 1.49;
      z3 = 1.29;
    }

    // Back Platform RL 5B
    if (i == 116) {
      x1 = 0.83;
      x2 = 0.70;
      x3 = 0.78;

      y1 = -0.70;
      y2 = -0.70;
      y3 = -0.80;

      z1 = 1.29;
      z2 = 1.45;
      z3 = 1.57;
    }

    // Back Platform RR 5A
    if (i == 117) {
      x1 = 1.22;
      x2 = 1.14;
      x3 = 0.98;

      y1 = -0.80;
      y2 = -0.80;
      y3 = -0.70;

      z1 = 1.13;
      z2 = 1.21;
      z3 = 1.16;
    }

    // Back Platform RR 5B
    if (i == 118) {
      x1 =  0.98;
      x2 =  1.10;
      x3 =  1.22;

      y1 = -0.70;
      y2 = -0.70;
      y3 = -0.80;

      z1 = 1.16;
      z2 = 1.05;
      z3 = 1.13;
    }

    // Intermediate Front LL0
    if (i == 119) {
      x1 =  -0.30;
      x2 =  -0.10;
      x3 =  -0.22;

      y1 = -0.80;
      y2 = -0.70;
      y3 = -0.80;

      z1 = 0.65;
      z2 = 0.65;
      z3 = 0.57;
    }

    // Intermediate Front LL1
    if (i == 120) {
      x1 =  -0.14;
      x2 =  0.03;
      x3 =  -0.06;

      y1 = -0.80;
      y2 = -0.70;
      y3 = -0.80;

      z1 = 0.49;
      z2 = 0.54;
      z3 = 0.41;
    }

    // Intermediate Front LR0
    if (i == 121) {
      x1 =  0.06;
      x2 =  0.17;
      x3 =  0.14;

      y1 = -0.80;
      y2 = -0.70;
      y3 = -0.80;

      z1 = 0.29;
      z2 = 0.41;
      z3 = 0.21;
    }

    // Intermediate Front LR0
    if (i == 122) {
      x1 =  0.22;
      x2 =  0.30;
      x3 =  0.30;

      y1 = -0.80;
      y2 = -0.70;
      y3 = -0.80;

      z1 = 0.13;
      z2 = 0.25;
      z3 = 0.05;
    }

    // Intermediate Front RL0
    if (i == 123) {
      x1 =  0.78;
      x2 =  0.70;
      x3 =  0.70;

      y1 = -0.80;
      y2 = -0.70;
      y3 = -0.80;

      z1 = 0.13;
      z2 = 0.25;
      z3 = 0.05;
    }

    // Intermediate Front RL1
    if (i == 124) {
      x1 =  0.86;
      x2 =  0.83;
      x3 =  0.94;

      y1 = -0.80;
      y2 = -0.70;
      y3 = -0.80;

      z1 = 0.21;
      z2 = 0.41;
      z3 = 0.29;
    }

    // Intermediate Front RR0
    if (i == 125) {
      x1 =  1.06;
      x2 =  0.98;
      x3 =  1.14;

      y1 = -0.80;
      y2 = -0.70;
      y3 = -0.80;

      z1 = 0.41;
      z2 = 0.54;
      z3 = 0.49;
    }

    // Intermediate Front RR1
    if (i == 126) {
      x1 =  1.22;
      x2 =  1.10;
      x3 =  1.30;

      y1 = -0.80;
      y2 = -0.70;
      y3 = -0.80;

      z1 = 0.57;
      z2 = 0.65;
      z3 = 0.65;
    }
    
    // Intermediate Back LL0
    if (i == 127) {
      x1 =  -0.30;
      x2 =  -0.10;
      x3 =  -0.22;

      y1 = -0.80;
      y2 = -0.70;
      y3 = -0.80;

      z1 = 1.05;
      z2 = 1.05;
      z3 = 1.13;
    }

    // Intermediate Back LL1
    if (i == 128) {
      x1 =  -0.14;
      x2 =  0.03;
      x3 =  -0.06;

      y1 = -0.80;
      y2 = -0.70;
      y3 = -0.80;

      z1 = 1.21;
      z2 = 1.16;
      z3 = 1.29;
    }

    // Intermediate Back LR0
    if (i == 129) {
      x1 =  0.06;
      x2 =  0.17;
      x3 =  0.14;

      y1 = -0.80;
      y2 = -0.70;
      y3 = -0.80;

      z1 = 1.41;
      z2 = 1.29;
      z3 = 1.49;
    }

    // Intermediate Back LR0
    if (i == 130) {
      x1 =  0.22;
      x2 =  0.30;
      x3 =  0.30;

      y1 = -0.80;
      y2 = -0.70;
      y3 = -0.80;

      z1 = 1.57;
      z2 = 1.45;
      z3 = 1.65;
    }

    // Intermediate Back RL0
    if (i == 131) {
      x1 =  0.78;
      x2 =  0.70;
      x3 =  0.70;

      y1 = -0.80;
      y2 = -0.70;
      y3 = -0.80;

      z1 = 1.57;
      z2 = 1.45;
      z3 = 1.65;
    }

    // Intermediate Back RL1
    if (i == 132) {
      x1 =  0.86;
      x2 =  0.83;
      x3 =  0.94;

      y1 = -0.80;
      y2 = -0.70;
      y3 = -0.80;

      z1 = 1.49;
      z2 = 1.29;
      z3 = 1.41;
    }

    // Intermediate Back RR0
    if (i == 133) {
      x1 =  1.06;
      x2 =  0.98;
      x3 =  1.14;

      y1 = -0.80;
      y2 = -0.70;
      y3 = -0.80;

      z1 = 1.29;
      z2 = 1.16;
      z3 = 1.21;
    }

    // Intermediate Back RR1
    if (i == 134) {
      x1 =  1.22;
      x2 =  1.10;
      x3 =  1.30;

      y1 = -0.80;
      y2 = -0.70;
      y3 = -0.80;

      z1 = 1.13;
      z2 = 1.05;
      z3 = 1.05;
    }
  }

  const indices = [ 0,  1,  2 ];

  const uvs = [
     0,0,  
     0.5,1,
     1,0,
  ];

  for (var i = 0; i < 136; i++) {

    loadTexture(i,false,textures);

    positionBuffer[indexStart + i] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer[indexStart + i]);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions[i]), gl.STATIC_DRAW);

    normalsBuffer[indexStart + i] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalsBuffer[indexStart + i]);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals[i]), gl.STATIC_DRAW);

    verticesBuffer[indexStart + i] = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, verticesBuffer[indexStart + i]);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    uvBuffer[indexStart + i] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer[indexStart + i]);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);
  }
  
}

function setupShaders() {
// define vertex shader in essl using es6 template strings
    // define vertex shader in essl using es6 template strings
    var vShaderCode = `
        attribute vec3 aVertexPosition; // vertex position
        attribute vec3 aVertexNormal; // vertex normal
        attribute vec2 aVertexUV; // vertex texture uv
        
        uniform mat4 umMatrix; // the model matrix
        uniform mat4 upvmMatrix; // the project view model matrix
        
        varying vec3 vWorldPos; // interpolated world position of vertex
        varying vec3 vVertexNormal; // interpolated normal for frag shader
        varying vec2 vVertexUV; // interpolated uv for frag shader

        void main(void) {
            
            // vertex position
            vec4 vWorldPos4 = umMatrix * vec4(aVertexPosition, 1.0);
            vWorldPos = vec3(vWorldPos4.x,vWorldPos4.y,vWorldPos4.z);
            gl_Position = upvmMatrix * vec4(aVertexPosition, 1.0);

            // vertex normal (assume no non-uniform scale)
            vec4 vWorldNormal4 = umMatrix * vec4(aVertexNormal, 0.0);
            vVertexNormal = normalize(vec3(vWorldNormal4.x,vWorldNormal4.y,vWorldNormal4.z));
            
            // vertex uv
            vVertexUV = aVertexUV;
        }
    `;
    
    // define fragment shader in essl using es6 template strings
    var fShaderCode = `
        precision mediump float; // set float to medium precision

        // eye location
        uniform vec3 uEyePosition; // the eye's position in world
        
        // light properties
        uniform vec3 uLightAmbient; // the light's ambient color
        uniform vec3 uLightDiffuse; // the light's diffuse color
        uniform vec3 uLightSpecular; // the light's specular color
        uniform vec3 uLightPosition; // the light's position
        
        // material properties
        uniform vec3 uAmbient; // the ambient reflectivity
        uniform vec3 uDiffuse; // the diffuse reflectivity
        uniform vec3 uSpecular; // the specular reflectivity
        uniform float uShininess; // the specular exponent
        
        // texture properties
        uniform bool uUsingTexture; // if we are using a texture
        uniform sampler2D uTexture; // the texture for the fragment
        varying vec2 vVertexUV; // texture uv of fragment
            
        // geometry properties
        varying vec3 vWorldPos; // world xyz of fragment
        varying vec3 vVertexNormal; // normal of fragment
        
        void main(void) {
        
            // ambient term
            vec3 ambient = uAmbient*uLightAmbient;
            
            // diffuse term
            vec3 normal = normalize(vVertexNormal);
            vec3 light = normalize(uLightPosition - vWorldPos);
            float lambert = max(0.0,dot(normal,light));
            vec3 diffuse = uDiffuse*uLightDiffuse*lambert; // diffuse term
            
            // specular term
            vec3 eye = normalize(uEyePosition - vWorldPos);
            vec3 halfVec = normalize(light+eye);
            float highlight = pow(max(0.0,dot(normal,halfVec)),uShininess);
            vec3 specular = uSpecular*uLightSpecular*highlight; // specular term
            
            // combine to find lit color
            vec3 litColor = ambient + diffuse + specular;
            
            if (!uUsingTexture) {
                gl_FragColor = vec4(litColor, 1.0);
            } else {
                vec4 texColor = texture2D(uTexture, vec2(vVertexUV.s, vVertexUV.t));
            
                // gl_FragColor = vec4(texColor.rgb * litColor, texColor.a);
                gl_FragColor = vec4(texColor.rgb * litColor, 1.0);
            } // end if using texture
        } // end main
    `;

    try {
        var fShader = gl.createShader(gl.FRAGMENT_SHADER); // create frag shader
        gl.shaderSource(fShader,fShaderCode); // attach code to shader
        gl.compileShader(fShader); // compile the code for gpu execution

        var vShader = gl.createShader(gl.VERTEX_SHADER); // create vertex shader
        gl.shaderSource(vShader,vShaderCode); // attach code to shader
        gl.compileShader(vShader); // compile the code for gpu execution
            
        if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) { // bad frag shader compile
            throw "error during fragment shader compile: " + gl.getShaderInfoLog(fShader);
            gl.deleteShader(fShader);
        } else if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) { // bad vertex shader compile
            throw "error during vertex shader compile: " + gl.getShaderInfoLog(vShader);
            gl.deleteShader(vShader);
        } else { // no compile errors
            var shaderProgram = gl.createProgram(); // create the single shader program
            gl.attachShader(shaderProgram, fShader); // put frag shader in program
            gl.attachShader(shaderProgram, vShader); // put vertex shader in program
            gl.linkProgram(shaderProgram); // link program into gl context

            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) { // bad program link
                throw "error during shader program linking: " + gl.getProgramInfoLog(shaderProgram);
            } else { // no shader program link errors
                gl.useProgram(shaderProgram); // activate shader program (frag and vert)
                
                // locate and enable vertex attributes
                vPosAttribLoc = gl.getAttribLocation(shaderProgram, "aVertexPosition"); // ptr to vertex pos attrib
                gl.enableVertexAttribArray(vPosAttribLoc); // connect attrib to array
                vNormAttribLoc = gl.getAttribLocation(shaderProgram, "aVertexNormal"); // ptr to vertex normal attrib
                gl.enableVertexAttribArray(vNormAttribLoc); // connect attrib to array
                vUVAttribLoc = gl.getAttribLocation(shaderProgram, "aVertexUV"); // ptr to vertex UV attrib
                gl.enableVertexAttribArray(vUVAttribLoc); // connect attrib to array
                
                // locate vertex uniforms
                mMatrixULoc = gl.getUniformLocation(shaderProgram, "umMatrix"); // ptr to mmat
                pvmMatrixULoc = gl.getUniformLocation(shaderProgram, "upvmMatrix"); // ptr to pvmmat
                
                // locate fragment uniforms
                var eyePositionULoc = gl.getUniformLocation(shaderProgram, "uEyePosition"); // ptr to eye position
                var lightAmbientULoc = gl.getUniformLocation(shaderProgram, "uLightAmbient"); // ptr to light ambient
                var lightDiffuseULoc = gl.getUniformLocation(shaderProgram, "uLightDiffuse"); // ptr to light diffuse
                var lightSpecularULoc = gl.getUniformLocation(shaderProgram, "uLightSpecular"); // ptr to light specular
                lightPositionULoc = gl.getUniformLocation(shaderProgram, "uLightPosition"); // ptr to light position
                ambientULoc = gl.getUniformLocation(shaderProgram, "uAmbient"); // ptr to ambient
                diffuseULoc = gl.getUniformLocation(shaderProgram, "uDiffuse"); // ptr to diffuse
                specularULoc = gl.getUniformLocation(shaderProgram, "uSpecular"); // ptr to specular
                shininessULoc = gl.getUniformLocation(shaderProgram, "uShininess"); // ptr to shininess
                usingTextureULoc = gl.getUniformLocation(shaderProgram, "uUsingTexture"); // ptr to using texture
                textureULoc = gl.getUniformLocation(shaderProgram, "uTexture"); // ptr to texture
                
                // pass global (not per model) constants into fragment uniforms
                gl.uniform3fv(eyePositionULoc,Eye); // pass in the eye's position
                gl.uniform3fv(lightAmbientULoc,lightAmbient); // pass in the light's ambient emission
                gl.uniform3fv(lightDiffuseULoc,lightDiffuse); // pass in the light's diffuse emission
                gl.uniform3fv(lightSpecularULoc,lightSpecular); // pass in the light's specular emission
                
                
            } // end if no shader program link errors
        } // end if no compile errors
    } // end try 
    
    catch(e) {
        console.log(e);
    } // end catch
}

function renderModels() {
  
    var hMatrix = mat4.create(); // handedness matrix
    var pMatrix = mat4.create(); // projection matrix
    var vMatrix = mat4.create(); // view matrix
    var mMatrix = mat4.create(); // model matrix
    var hpvMatrix = mat4.create(); // hand * proj * view matrices
    var hpvmMatrix = mat4.create(); // hand * proj * view * model matrices
    
    window.requestAnimationFrame(renderModels); // set up frame render callback

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers
    //gl.clearColor(1.0, 1.0, 1.0, 1.0);

    mat4.fromScaling(hMatrix,vec3.fromValues(-1,1,1)); // create handedness matrix
    mat4.perspective(pMatrix,0.5*Math.PI,1,0.1,10); // youcreate projection matrix
    mat4.lookAt(vMatrix,Eye,Center,Up); // create view matrix
    mat4.multiply(hpvMatrix,hMatrix,pMatrix); // handedness * projection
    mat4.multiply(hpvMatrix,hpvMatrix,vMatrix); // handedness * projection * view

    // Put Stuff Here ...

    for (var i = 0; i < triangles; i++) {


      //var i = 0;


      gl.uniform3fv(lightPositionULoc,lightPosition); // pass in the light's position
        
      mat4.multiply(hpvmMatrix,hpvMatrix,mMatrix); // handedness * project * view * model
      gl.uniformMatrix4fv(mMatrixULoc, false, mMatrix); // pass in the m matrix
      gl.uniformMatrix4fv(pvmMatrixULoc, false, hpvmMatrix); // pass in the hpvm matrix
      gl.uniform3fv(lightPositionULoc,lightPosition); // pass in the light's position


      var ambient = [0.3,0.3,0.3];
      var diffuse = [0.54,0.27,0.07];
      var specular = [0.3,0.3,0.3];
      var n = 1;

      if (i%136 < 12) {
      	diffuse = [1.0,1.0,1.0];
      } 

      if (i%136 > 47) {
      	diffuse = [0.0,0.79,0.34];
      }
 
      gl.uniform3fv(ambientULoc, ambient); // pass in the ambient reflectivity
      gl.uniform3fv(diffuseULoc, diffuse); // pass in the diffuse reflectivity
      gl.uniform3fv(specularULoc, specular); // pass in the specular reflectivity
      gl.uniform1f(shininessULoc, n); // pass in the specular exponent
      gl.uniform1i(usingTextureULoc,false); // whether the set uses texture
      gl.activeTexture(gl.TEXTURE0); // bind to active texture 0 (the first)
      gl.bindTexture(gl.TEXTURE_2D, textures[i]); // bind the set's texture
      gl.uniform1i(textureULoc, 0); // pass in the texture and active texture 0
        
      // position, normal and uv buffers: activate and feed into vertex shader
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer[i]); // activate position
      gl.vertexAttribPointer(vPosAttribLoc,3,gl.FLOAT,false,0,0); // feed
      gl.bindBuffer(gl.ARRAY_BUFFER,normalsBuffer[i]); // activate normal
      gl.vertexAttribPointer(vNormAttribLoc,3,gl.FLOAT,false,0,0); // feed
      gl.bindBuffer(gl.ARRAY_BUFFER,uvBuffer[i]); // activate uv
      gl.vertexAttribPointer(vUVAttribLoc,2,gl.FLOAT,false,0,0); // feed

      // triangle buffer: activate and render
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, verticesBuffer[i]); // activate
      gl.drawElements(gl.TRIANGLES,3,gl.UNSIGNED_SHORT,0); // render

    }
}

/* MAIN -- HERE is where execution begins after window load */

function main() {

  setupWebGL(); // set up the webGL environment
  loadModels(); // load in the models from tri file
  setupShaders(); 
  renderModels(); // draw the triangles using webGL
  
} // end main